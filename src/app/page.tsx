'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

declare global {
  interface Window {
    google: typeof google
  }
}

export default function HomePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

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
    if (!scriptLoaded || !inputRef.current || autocompleteRef.current) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'gb' },
    })

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect)
  }, [scriptLoaded])

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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Flatmole</h1>
        <p className={styles.subtitle}>Review your rental property and landlord</p>

        <div className={styles.searchContainer}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter a UK address..."
            className={styles.searchInput}
            disabled={loading}
          />
          {loading && <p className={styles.loading}>Loading...</p>}
        </div>

        <p className={styles.hint}>
          Search for an address to read or write reviews
        </p>
      </main>
    </div>
  )
}
