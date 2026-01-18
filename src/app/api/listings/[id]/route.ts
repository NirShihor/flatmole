import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongoClient'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid listing ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const listing = await db.collection('listings').findOne({ _id: new ObjectId(id) })

    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      )
    }

    const reviews = await db
      .collection('reviews')
      .find({ listingId: new ObjectId(id), status: 'approved' })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      listing: {
        ...listing,
        _id: listing._id.toString(),
        currentClaimant: listing.currentClaimant?.toString() || null,
      },
      reviews: reviews.map(r => ({
        ...r,
        _id: r._id.toString(),
        listingId: r.listingId.toString(),
        userId: r.userId.toString(),
      })),
    })
  } catch (error) {
    console.error('Get listing error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
