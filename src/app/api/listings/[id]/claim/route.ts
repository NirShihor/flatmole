import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to claim a property' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid listing ID' },
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

    const listing = await db.collection('listings').findOne({ _id: new ObjectId(id) })

    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'Listing not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const updateData: Record<string, unknown> = {
      currentClaimant: user._id,
      updatedAt: now,
    }

    if (listing.currentClaimant) {
      await db.collection('listings').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData,
          $push: {
            claimHistory: {
              userId: listing.currentClaimant,
              claimedAt: listing.claimHistory?.length > 0
                ? listing.claimHistory[listing.claimHistory.length - 1]?.claimedAt || listing.createdAt
                : listing.createdAt,
              releasedAt: now,
            },
          },
        } as any
      )
    } else {
      await db.collection('listings').updateOne(
        { _id: new ObjectId(id) },
        {
          $set: updateData,
          $push: {
            claimHistory: {
              userId: user._id,
              claimedAt: now,
            },
          },
        } as any
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Property claimed successfully',
    })
  } catch (error) {
    console.error('Claim property error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
