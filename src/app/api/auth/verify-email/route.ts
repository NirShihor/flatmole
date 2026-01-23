import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import clientPromise from '@/lib/mongoClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Verification token is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const user = await db.collection('users').findOne({
      verificationToken: token,
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
        email: user.email,
      })
    }

    if (user.verificationTokenExpiry && new Date(user.verificationTokenExpiry) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Generate auto-login token (valid for 5 minutes)
    const autoLoginToken = crypto.randomBytes(32).toString('hex')
    const autoLoginExpiry = new Date(Date.now() + 5 * 60 * 1000)

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          autoLoginToken,
          autoLoginTokenExpiry: autoLoginExpiry,
          updatedAt: new Date(),
        },
        $unset: {
          verificationToken: '',
          verificationTokenExpiry: '',
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: user.email,
      autoLoginToken,
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}
