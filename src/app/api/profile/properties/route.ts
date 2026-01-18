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

    const properties = await db
      .collection('listings')
      .find({ currentClaimant: user._id })
      .sort({ updatedAt: -1 })
      .toArray()

    const formattedProperties = properties.map(property => ({
      _id: property._id.toString(),
      address: property.address,
      averageRating: property.averageRating,
      reviewsCount: property.reviewsCount,
      hasPaidFeatures: property.hasPaidFeatures,
    }))

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
    })
  } catch (error) {
    console.error('Get profile properties error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
