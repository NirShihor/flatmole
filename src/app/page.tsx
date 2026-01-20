'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'

declare global {
  interface Window {
    google: typeof google
  }
}

// UK postcode regex - matches formats like "SW1A 1AA", "M1 1AA", "EH3 9DR", "EH42EQ" etc.
const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i

// Format a UK postcode with proper spacing (e.g., "EH42EQ" -> "EH4 2EQ")
function formatPostcode(postcode: string): string {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  // UK postcodes always have the last 3 characters as: digit + 2 letters
  // So insert a space before the last 3 characters
  if (cleaned.length >= 5) {
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3)
  }
  return cleaned
}

const exampleReviews = [
  {
    stars: 4,
    title: 'Great flat, slow maintenance',
    content: 'Loved the location and layout. Took a while to fix a leak, but it got done in the end.',
    location: 'Edinburgh, EH3',
    year: '2025',
    landlordReplied: true,
  },
  {
    stars: 3.5,
    title: 'Damp issues all winter',
    content: 'Clothes and walls constantly damp. Heating was expensive and didn\'t solve it.',
    location: 'Glasgow, G12',
    year: '2024',
    landlordReplied: false,
  },
  {
    stars: 5,
    title: 'Best landlord I\'ve had',
    content: 'Clear communication, repairs sorted quickly, deposit returned with no drama.',
    location: 'Manchester, M1',
    year: '2025',
    landlordReplied: false,
  },
]

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 !== 0
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <span className={styles.stars}>
      {'★'.repeat(fullStars)}
      {hasHalf && '★'}
      {'☆'.repeat(emptyStars)}
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const houseNumberRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [postcodeMode, setPostcodeMode] = useState(false)
  const [postcode, setPostcode] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [flatNumber, setFlatNumber] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [propertyType, setPropertyType] = useState<'asking' | 'house' | 'flat' | null>(null)
  const [aiSuggestedType, setAiSuggestedType] = useState<'house' | 'flat' | null>(null)
  const [buildingAddress, setBuildingAddress] = useState<{
    placeId: string
    formatted: string
    addressComponents: google.maps.GeocoderAddressComponent[]
  } | null>(null)

  useEffect(() => {
    if (window.google?.maps?.places) {
      setScriptLoaded(true)
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || postcodeMode) return

    // Clean up previous autocomplete
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'gb' },
    })

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect)
  }, [scriptLoaded, postcodeMode])

  // Focus house number input when postcode mode is activated
  useEffect(() => {
    if (postcodeMode && houseNumberRef.current) {
      houseNumberRef.current.focus()
    }
  }, [postcodeMode])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)

    // Check if it's a postcode
    const trimmed = value.trim()
    if (UK_POSTCODE_REGEX.test(trimmed)) {
      setPostcode(formatPostcode(trimmed))
      setPostcodeMode(true)
    }
  }

  const handlePlaceSelect = async () => {
    const place = autocompleteRef.current?.getPlace()

    if (!place || !place.place_id) return

    setLoading(true)

    try {
      const res = await fetch('/api/listings/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.place_id,
          formatted: place.formatted_address,
          addressComponents: place.address_components,
        }),
      })

      const data = await res.json()

      if (data.success && data.listingId) {
        router.push(`/listing/${data.listingId}`)
      }
    } catch (error) {
      console.error('Error finding/creating listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostcodeSearch = async () => {
    if (!houseNumber.trim()) return

    setLoading(true)

    try {
      // Use Geocoder API for more accurate postcode-based lookups
      const geocoder = new google.maps.Geocoder()

      // Construct address with postcode emphasized
      const fullAddress = `${houseNumber.trim()}, ${postcode}, United Kingdom`

      geocoder.geocode(
        {
          address: fullAddress,
          componentRestrictions: { country: 'GB', postalCode: postcode.replace(/\s/g, '') },
        },
        async (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const result = results[0]

            // Build the building address with house number
            let formattedAddress = result.formatted_address

            // Add house number if not already included
            if (!formattedAddress.toLowerCase().startsWith(houseNumber.trim().toLowerCase())) {
              formattedAddress = `${houseNumber.trim()} ${formattedAddress}`
            }

            // Store building address
            setBuildingAddress({
              placeId: result.place_id,
              formatted: formattedAddress,
              addressComponents: result.address_components,
            })

            // Ask AI to determine property type
            try {
              const aiRes = await fetch('/api/property-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: formattedAddress }),
              })
              const aiData = await aiRes.json()
              if (aiData.propertyType) {
                setAiSuggestedType(aiData.propertyType)
              }
            } catch {
              // AI failed, will just ask user
            }

            setPropertyType('asking')
          } else {
            alert('Could not find this address. Please try entering the full address.')
            resetSearch()
          }
          setLoading(false)
        }
      )
    } catch (error) {
      console.error('Error searching:', error)
      setLoading(false)
      resetSearch()
    }
  }

  const resetSearch = () => {
    setPostcodeMode(false)
    setPostcode('')
    setHouseNumber('')
    setFlatNumber('')
    setSearchValue('')
    setBuildingAddress(null)
    setPropertyType(null)
    setAiSuggestedType(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleSelectHouse = () => {
    setPropertyType('house')
    submitAddress()
  }

  const handleSelectFlat = () => {
    setPropertyType('flat')
  }

  const handleFlatSubmit = () => {
    if (!flatNumber.trim()) return
    submitAddress()
  }

  const submitAddress = async () => {
    if (!buildingAddress) return

    setLoading(true)

    // Build final address with flat number if applicable
    const finalAddress = flatNumber.trim()
      ? `${flatNumber.trim()}, ${buildingAddress.formatted}`
      : buildingAddress.formatted

    try {
      const res = await fetch('/api/listings/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: buildingAddress.placeId,
          formatted: finalAddress,
          addressComponents: buildingAddress.addressComponents,
          flatNumber: flatNumber.trim() || null,
        }),
      })

      const data = await res.json()

      if (data.success && data.listingId) {
        router.push(`/listing/${data.listingId}`)
      } else {
        alert('Something went wrong. Please try again.')
        resetSearch()
      }
    } catch (error) {
      console.error('Error finding/creating listing:', error)
      resetSearch()
    } finally {
      setLoading(false)
    }
  }

  const handleRejectAddress = () => {
    setBuildingAddress(null)
    setPropertyType(null)
    setAiSuggestedType(null)
    setFlatNumber('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && postcodeMode && houseNumber.trim()) {
      e.preventDefault()
      handlePostcodeSearch()
    }
  }

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <Image
            src="/images/hero_heading.png"
            alt="Rent Smarter - Check Before You Rent"
            width={500}
            height={200}
            className={styles.heroHeading}
            priority
          />

          <p className={styles.subheadline}>
            Read honest reviews by tenants
            <br />
            and see landlord responses
          </p>

          {buildingAddress && propertyType === 'asking' ? (
            <div className={styles.confirmContainer}>
              <p className={styles.confirmLabel}>We found this address:</p>
              <p className={styles.confirmAddress}>{buildingAddress.formatted}</p>
              <p className={styles.propertyTypeQuestion}>
                {aiSuggestedType
                  ? `This looks like a ${aiSuggestedType}. Is that correct?`
                  : 'Is this a house or a flat?'}
              </p>
              <div className={styles.confirmButtons}>
                <button
                  className={`${styles.confirmYes} ${aiSuggestedType === 'house' ? styles.suggested : ''}`}
                  onClick={handleSelectHouse}
                  disabled={loading}
                >
                  {loading && aiSuggestedType === 'house' ? '...' : 'House'}
                </button>
                <button
                  className={`${styles.confirmYes} ${aiSuggestedType === 'flat' ? styles.suggested : ''}`}
                  onClick={handleSelectFlat}
                  disabled={loading}
                >
                  {loading && aiSuggestedType === 'flat' ? '...' : 'Flat'}
                </button>
              </div>
              <button
                className={styles.wrongAddressLink}
                onClick={handleRejectAddress}
                disabled={loading}
              >
                Wrong address? Try again
              </button>
            </div>
          ) : buildingAddress && propertyType === 'flat' ? (
            <div className={styles.confirmContainer}>
              <p className={styles.confirmLabel}>Building:</p>
              <p className={styles.confirmAddress}>{buildingAddress.formatted}</p>
              <div className={styles.flatInputContainer}>
                <input
                  type="text"
                  placeholder="Enter flat number (e.g. Flat 2, 1F1)"
                  className={styles.flatInputField}
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && flatNumber.trim()) {
                      handleFlatSubmit()
                    }
                  }}
                  autoFocus
                />
                <button
                  className={styles.searchButton}
                  onClick={handleFlatSubmit}
                  disabled={loading || !flatNumber.trim()}
                >
                  {loading ? '...' : 'Continue'}
                </button>
              </div>
              <button
                className={styles.wrongAddressLink}
                onClick={handleRejectAddress}
                disabled={loading}
              >
                Start over
              </button>
            </div>
          ) : !postcodeMode ? (
            <div className={styles.searchContainer}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter an address or postcode..."
                className={styles.searchInput}
                disabled={loading}
                onChange={handleInputChange}
                value={searchValue}
              />
              <button className={styles.searchButton} disabled={loading}>
                {loading ? '...' : 'Search'}
              </button>
            </div>
          ) : (
            <div className={styles.postcodeSearchContainer}>
              <div className={styles.postcodeDisplay}>
                <span className={styles.postcodeLabel}>Postcode:</span>
                <span className={styles.postcodeValue}>{postcode}</span>
                <button
                  type="button"
                  onClick={resetSearch}
                  className={styles.changeButton}
                >
                  Change
                </button>
              </div>
              <div className={styles.searchContainer}>
                <input
                  ref={houseNumberRef}
                  type="text"
                  placeholder="Building number (e.g. 166)"
                  className={styles.searchInput}
                  disabled={loading}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={styles.searchButton}
                  disabled={loading || !houseNumber.trim()}
                  onClick={handlePostcodeSearch}
                >
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          <p className={styles.features}>
            <span>Anonymous posting</span>
            <span className={styles.dot}>·</span>
            <span>Moderated reviews</span>
            <span className={styles.dot}>·</span>
            <span>Landlords can respond</span>
          </p>

          <Link href="/review/write" className={styles.writeReviewLink}>
            Write a review
          </Link>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/images/homepage_group_v2.png"
            alt="People reading reviews"
            width={500}
            height={400}
            priority
          />
        </div>
      </section>

      <section className={styles.howItWorks}>
        <div className={styles.howItWorksInner}>
          <div className={styles.reviewsColumn}>
            <h2 className={styles.sectionTitle}>How FlatMole works</h2>
            <div className={styles.reviewCards}>
              {exampleReviews.map((review, index) => (
                <div key={index} className={styles.reviewCard}>
                  <StarRating rating={review.stars} />
                  <h3 className={styles.reviewTitle}>{review.title}</h3>
                  <p className={styles.reviewContent}>{review.content}</p>
                  <div className={styles.reviewMeta}>
                    <span>{review.location} · {review.year}</span>
                    {review.landlordReplied && (
                      <span className={styles.landlordBadge}>Landlord replied</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.fairPlatform}>
            <h2 className={styles.fairTitle}>A fair platform for both sides</h2>
            <p className={styles.fairDesc}>
              Tenants can share their experience — and landlords can reply publicly to clarify, explain, or show what's improved.
            </p>
            <ul className={styles.fairList}>
              <li>Tenants get transparency</li>
              <li>Landlords get a chance to respond</li>
            </ul>
            <div className={styles.fairButtons}>
              <Link href="/review/write" className={styles.primaryButton}>
                Write a tenant review
              </Link>
              <Link href="/profile/properties" className={styles.secondaryButton}>
                Landlords: Claim your property
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Image
              src="/images/flatmole_logo_v4.png"
              alt="Flatmole"
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: 'auto', height: '40px' }}
            />
          </div>
          <nav className={styles.footerNav}>
            <Link href="/about">About</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/guidelines">Guidelines</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
