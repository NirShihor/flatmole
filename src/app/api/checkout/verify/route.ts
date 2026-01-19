import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

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
      return NextResponse.json({
        success: true,
        listingId: session.metadata?.listingId,
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
