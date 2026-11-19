import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!ObjectId.isValid(id)) {
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

    const reviewId = new ObjectId(id)

    // Only the author can delete; a review that exists but belongs to someone
    // else is reported as not found so its existence isn't revealed.
    const review = await db.collection('reviews').findOneAndDelete({
      _id: reviewId,
      userId: user._id,
    })

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Remove what hangs off the review: the landlord's response and any reports
    // against either of them.
    const responses = await db.collection('responses').find({ reviewId }).toArray()
    const responseIds = responses.map(r => r._id)

    await db.collection('reports').deleteMany({
      $or: [
        { targetType: 'review', targetId: reviewId },
        { targetType: 'response', targetId: { $in: responseIds } },
      ],
    })
    await db.collection('responses').deleteMany({ reviewId })

    // Recalculate the listing's rating from the approved reviews that remain.
    const remaining = await db
      .collection('reviews')
      .find({ listingId: review.listingId, status: 'approved' })
      .toArray()

    const averageRating =
      remaining.length > 0
        ? Math.round((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length) * 10) / 10
        : 0

    await db.collection('listings').updateOne(
      { _id: review.listingId },
      {
        $set: {
          averageRating,
          reviewsCount: remaining.length,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({ success: true, message: 'Review deleted' })
  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
