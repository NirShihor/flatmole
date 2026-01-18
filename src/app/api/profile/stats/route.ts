import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
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

    const reviewsCount = await db.collection('reviews').countDocuments({ userId: user._id })
    const propertiesCount = await db.collection('listings').countDocuments({ currentClaimant: user._id })

    return NextResponse.json({
      success: true,
      stats: {
        reviewsCount,
        propertiesCount,
      },
    })
  } catch (error) {
    console.error('Get profile stats error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
