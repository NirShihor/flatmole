import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

const VALID_REASONS = [
  'Inappropriate content',
  'Spam or fake review',
  'Personal information shared',
  'Harassment or abuse',
  'Other',
]

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
    const { targetType, targetId, reason } = body

    if (!targetType || !['review', 'response'].includes(targetType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid target type' },
        { status: 400 }
      )
    }

    if (!targetId || !ObjectId.isValid(targetId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid target ID' },
        { status: 400 }
      )
    }

    if (!reason || reason.length < 10 || reason.length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Reason must be between 10 and 1000 characters' },
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

    const collection = targetType === 'review' ? 'reviews' : 'responses'
    const target = await db.collection(collection).findOne({ _id: new ObjectId(targetId) })

    if (!target) {
      return NextResponse.json(
        { success: false, message: `${targetType} not found` },
        { status: 404 }
      )
    }

    if (target.userId.toString() === user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'You cannot report your own content' },
        { status: 403 }
      )
    }

    const existingReport = await db.collection('reports').findOne({
      targetType,
      targetId: new ObjectId(targetId),
      reportedBy: user._id,
    })

    if (existingReport) {
      return NextResponse.json(
        { success: false, message: 'You have already reported this content' },
        { status: 409 }
      )
    }

    const report = {
      targetType,
      targetId: new ObjectId(targetId),
      reportedBy: user._id,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection('reports').insertOne(report)

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
    })
  } catch (error) {
    console.error('Create report error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
