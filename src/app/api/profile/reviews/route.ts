import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
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

    const reviews = await db
      .collection('reviews')
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray()

    const listingIds = reviews.map(r => r.listingId)
    const listings = await db
      .collection('listings')
      .find({ _id: { $in: listingIds } })
      .toArray()

    const listingsMap = new Map(listings.map(l => [l._id.toString(), l]))

    const reviewsWithListings = reviews.map(review => ({
      _id: review._id.toString(),
      listingId: review.listingId.toString(),
      rating: review.rating,
      content: review.content,
      anonymous: review.anonymous,
      displayName: review.displayName,
      createdAt: review.createdAt.toISOString(),
      listing: listingsMap.get(review.listingId.toString())
        ? {
            address: listingsMap.get(review.listingId.toString())!.address,
          }
        : null,
    }))

    return NextResponse.json({
      success: true,
      reviews: reviewsWithListings,
    })
  } catch (error) {
    console.error('Get profile reviews error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
