import { Resend } from 'resend'
import crypto from 'crypto'

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flatmole.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email - FlatMole',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; font-size: 24px;">Welcome to FlatMole!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thanks for signing up. Please verify your email address by clicking the button below:
          </p>
          <a href="${verificationUrl}"
             style="display: inline-block; background-color: #333; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin: 20px 0; font-size: 16px;">
            Verify Email
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #0070f3;">${verificationUrl}</a>
          </p>
          <p style="color: #999; font-size: 14px;">
            This link will expire in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't create an account on FlatMole, you can safely ignore this email.
          </p>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { success: false, error }
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
