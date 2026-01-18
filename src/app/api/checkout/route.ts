import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'
import { stripe, PRICE_AMOUNT, PRICE_CURRENCY } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { listingId } = body

    if (!listingId || !ObjectId.isValid(listingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid listing ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const user = await db.collection('users').findOne({ email: session.user.email })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const listing = await db.collection('listings').findOne({ _id: new ObjectId(listingId) })

    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      )
    }

    if (!listing.currentClaimant || listing.currentClaimant.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'You must claim this property before upgrading' },
        { status: 403 }
      )
    }

    if (listing.hasPaidFeatures) {
      return NextResponse.json(
        { success: false, message: 'This property already has paid features enabled' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: PRICE_CURRENCY,
            product_data: {
              name: 'Flatmole Pro - Property Upgrade',
              description: `Unlock the ability to respond to reviews for ${listing.address.formatted}`,
            },
            unit_amount: PRICE_AMOUNT,
          },
          quantity: 1,
        },
      ],
      metadata: {
        listingId: listingId,
        userId: user._id.toString(),
      },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/listing/${listingId}`,
    })

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
