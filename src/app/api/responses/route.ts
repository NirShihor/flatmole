import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

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
    const { reviewId, content } = body

    if (!reviewId || !content) {
      return NextResponse.json(
        { success: false, message: 'Review ID and content are required' },
        { status: 400 }
      )
    }

    if (content.length < 10 || content.length > 2000) {
      return NextResponse.json(
        { success: false, message: 'Response must be between 10 and 2000 characters' },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(reviewId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid review ID' },
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

    const review = await db.collection('reviews').findOne({ _id: new ObjectId(reviewId) })

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    const listing = await db.collection('listings').findOne({ _id: review.listingId })

    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      )
    }

    if (!listing.currentClaimant || listing.currentClaimant.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'You must be the property owner to respond' },
        { status: 403 }
      )
    }

    if (!listing.hasPaidFeatures) {
      return NextResponse.json(
        { success: false, message: 'Paid features required to respond to reviews' },
        { status: 403 }
      )
    }

    const existingResponse = await db.collection('responses').findOne({ reviewId: new ObjectId(reviewId) })

    if (existingResponse) {
      return NextResponse.json(
        { success: false, message: 'A response already exists for this review' },
        { status: 409 }
      )
    }

    const response = {
      reviewId: new ObjectId(reviewId),
      listingId: review.listingId,
      userId: user._id,
      content: content.trim(),
      wasCurrentClaimant: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('responses').insertOne(response)

    return NextResponse.json({
      success: true,
      response: {
        _id: result.insertedId.toString(),
        content: response.content,
        createdAt: response.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Create response error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
