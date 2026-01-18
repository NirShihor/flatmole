import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'
import clientPromise from '@/lib/mongoClient'

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(flat|apartment|apt|unit)\b/gi, 'flat')
    .replace(/\b(street|st)\b/gi, 'street')
    .replace(/\b(road|rd)\b/gi, 'road')
    .replace(/\b(avenue|ave)\b/gi, 'avenue')
    .replace(/\b(lane|ln)\b/gi, 'lane')
    .replace(/\b(drive|dr)\b/gi, 'drive')
    .trim()
}

function addressesMatch(extracted: string, listing: string): boolean {
  const normalizedExtracted = normalizeAddress(extracted)
  const normalizedListing = normalizeAddress(listing)

  if (normalizedExtracted.includes(normalizedListing) || normalizedListing.includes(normalizedExtracted)) {
    return true
  }

  const extractedParts = normalizedExtracted.split(' ')
  const listingParts = normalizedListing.split(' ')

  let matchCount = 0
  for (const part of extractedParts) {
    if (part.length > 2 && listingParts.some(lp => lp.includes(part) || part.includes(lp))) {
      matchCount++
    }
  }

  return matchCount >= 3
}

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
    const { listingId, documentData, documentType, documentName } = body

    if (!listingId || !ObjectId.isValid(listingId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid listing ID' },
        { status: 400 }
      )
    }

    if (!documentData || !documentType || !documentName) {
      return NextResponse.json(
        { success: false, message: 'Document is required' },
        { status: 400 }
      )
    }

    const base64Data = documentData.replace(/^data:[^;]+;base64,/, '')
    const sizeInBytes = (base64Data.length * 3) / 4
    const maxSize = 10 * 1024 * 1024

    if (sizeInBytes > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Document must be under 10MB' },
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

    const existingVerification = await db.collection('verifications').findOne({
      userId: user._id,
      listingId: new ObjectId(listingId),
      status: 'verified',
    })

    if (existingVerification) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Already verified for this property',
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set')
      return NextResponse.json(
        { success: false, message: 'Verification service not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const mimeType = documentType.startsWith('image/') ? documentType : 'application/pdf'
    const imageUrl = `data:${mimeType};base64,${base64Data}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this document image and extract the following information:
1. The full postal address shown on the document
2. The name of the person/account holder shown on the document

This should be a utility bill, bank statement, or official letter that shows proof of residence.

Respond in JSON format only:
{
  "address": "the full address found on the document",
  "name": "the name found on the document",
  "documentType": "utility bill / bank statement / official letter / other",
  "isValid": true/false (false if you cannot find an address or the document is unclear)
}

If you cannot extract the information, set isValid to false and leave address/name empty.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const responseText = response.choices[0]?.message?.content || ''

    let extractedData
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Failed to process document. Please try a clearer image.' },
        { status: 422 }
      )
    }

    if (!extractedData.isValid || !extractedData.address) {
      const verification = {
        userId: user._id,
        listingId: new ObjectId(listingId),
        documentData,
        documentType,
        documentName,
        status: 'rejected',
        extractedAddress: extractedData.address || null,
        extractedName: extractedData.name || null,
        rejectionReason: 'Could not extract address from document',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.collection('verifications').insertOne(verification)

      return NextResponse.json({
        success: false,
        verified: false,
        message: 'Could not read the address from your document. Please upload a clearer image.',
      })
    }

    const isMatch = addressesMatch(extractedData.address, listing.address.formatted)

    const verification = {
      userId: user._id,
      listingId: new ObjectId(listingId),
      documentData,
      documentType,
      documentName,
      status: isMatch ? 'verified' : 'rejected',
      extractedAddress: extractedData.address,
      extractedName: extractedData.name,
      rejectionReason: isMatch ? null : 'Address does not match the property',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection('verifications').insertOne(verification)

    if (!isMatch) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: 'The address on your document does not match this property. Please upload a document showing this address, or contact support if you believe this is an error.',
        extractedAddress: extractedData.address,
      })
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Verification successful',
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')

    if (!listingId || !ObjectId.isValid(listingId)) {
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

    const verification = await db.collection('verifications').findOne({
      userId: user._id,
      listingId: new ObjectId(listingId),
      status: 'verified',
    })

    return NextResponse.json({
      success: true,
      verified: !!verification,
    })
  } catch (error) {
    console.error('Check verification error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
