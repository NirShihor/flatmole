import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongoClient'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

function parseAddressComponents(components: AddressComponent[]) {
  const get = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name || ''

  return {
    line1: [get('street_number'), get('route')].filter(Boolean).join(' '),
    line2: get('sublocality') || get('neighborhood') || '',
    city: get('postal_town') || get('locality') || '',
    postcode: get('postal_code') || '',
    country: get('country') || 'UK',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { placeId, formatted, addressComponents } = await request.json()

    if (!placeId || !formatted) {
      return NextResponse.json(
        { success: false, message: 'Place ID and formatted address are required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const listings = db.collection('listings')

    let listing = await listings.findOne({ 'address.placeId': placeId })

    if (!listing) {
      const parsed = parseAddressComponents(addressComponents || [])

      const result = await listings.insertOne({
        address: {
          formatted,
          placeId,
          ...parsed,
        },
        currentClaimant: null,
        claimHistory: [],
        description: null,
        photos: [],
        hasPaidFeatures: false,
        averageRating: 0,
        reviewsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      listing = { _id: result.insertedId }
    }

    return NextResponse.json({
      success: true,
      listingId: listing._id.toString(),
    })
  } catch (error) {
    console.error('Find or create listing error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
