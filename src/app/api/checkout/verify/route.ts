import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getStripe } from '@/lib/stripe'
import clientPromise from '@/lib/mongoClient'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID required' },
      { status: 400 }
    )
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      const listingId = session.metadata?.listingId
      const userId = session.metadata?.userId

      if (listingId && ObjectId.isValid(listingId)) {
        const client = await clientPromise
        const db = client.db()

        // Update listing to enable paid features
        await db.collection('listings').updateOne(
          { _id: new ObjectId(listingId) },
          {
            $set: {
              hasPaidFeatures: true,
              paidFeaturesEnabledAt: new Date(),
              stripeSessionId: sessionId,
              updatedAt: new Date(),
            },
          }
        )

        // Record the payment
        await db.collection('payments').insertOne({
          listingId: new ObjectId(listingId),
          userId: userId ? new ObjectId(userId) : null,
          stripeSessionId: sessionId,
          amount: session.amount_total,
          currency: session.currency,
          status: 'completed',
          createdAt: new Date(),
        })

        console.log('[Payment] Verified and enabled paid features for listing:', listingId)
      }

      return NextResponse.json({
        success: true,
        listingId: listingId,
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Payment not completed',
    })
  } catch (error) {
    console.error('Verify session error:', error)
    return NextResponse.json(
      { success: false, message: 'Invalid session' },
      { status: 400 }
    )
  }
}
