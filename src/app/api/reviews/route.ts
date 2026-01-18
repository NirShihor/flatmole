import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to write a review' },
        { status: 401 }
      )
    }

    const { listingId, rating, content, anonymous, displayName } = await request.json()

    if (!listingId || !ObjectId.isValid(listingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid listing ID' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!content || content.length < 50) {
      return NextResponse.json(
        { success: false, message: 'Review must be at least 50 characters' },
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

    if (listing.currentClaimant && listing.currentClaimant.toString() === user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'You cannot review your own property' },
        { status: 403 }
      )
    }

    const review = {
      listingId: new ObjectId(listingId),
      userId: user._id,
      rating,
      content,
      anonymous: anonymous !== false,
      displayName: anonymous ? null : displayName || null,
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('reviews').insertOne(review)

    const reviews = await db.collection('reviews').find({
      listingId: new ObjectId(listingId),
      status: 'approved',
    }).toArray()

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = totalRating / reviews.length

    await db.collection('listings').updateOne(
      { _id: new ObjectId(listingId) },
      {
        $set: {
          averageRating: Math.round(averageRating * 10) / 10,
          reviewsCount: reviews.length,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: result.insertedId.toString(),
    })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
