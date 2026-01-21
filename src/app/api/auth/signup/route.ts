import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import clientPromise from '@/lib/mongoClient'
import { sendVerificationEmail, generateVerificationToken } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const verificationToken = generateVerificationToken()
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      name: name || null,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry: tokenExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('[Signup] User created successfully:', { email, userId: result.insertedId.toString() })

    // Send verification email
    console.log('[Signup] Initiating verification email send...')
    const emailResult = await sendVerificationEmail(email, verificationToken)

    if (emailResult.success) {
      console.log('[Signup] Verification email sent successfully to:', email)
    } else {
      console.error('[Signup] Failed to send verification email to:', email, emailResult.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      userId: result.insertedId.toString(),
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during signup' },
      { status: 500 }
    )
  }
}
