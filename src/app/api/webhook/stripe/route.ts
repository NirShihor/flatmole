import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getStripe } from '@/lib/stripe'
import clientPromise from '@/lib/mongoClient'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const listingId = session.metadata?.listingId
    const userId = session.metadata?.userId

    if (!listingId || !userId) {
      console.error('Missing metadata in checkout session:', session.id)
      return NextResponse.json({ received: true })
    }

    try {
      const client = await clientPromise
      const db = client.db()

      await db.collection('listings').updateOne(
        { _id: new ObjectId(listingId) },
        {
          $set: {
            hasPaidFeatures: true,
            paidAt: new Date(),
            stripeSessionId: session.id,
            updatedAt: new Date(),
          },
        }
      )

      await db.collection('payments').insertOne({
        listingId: new ObjectId(listingId),
        userId: new ObjectId(userId),
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: 'completed',
        createdAt: new Date(),
      })

      console.log(`Payment successful for listing ${listingId}`)
    } catch (error) {
      console.error('Error processing payment:', error)
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
