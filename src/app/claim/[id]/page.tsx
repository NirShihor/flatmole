'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './claim.module.css'

interface Listing {
  _id: string
  address: { formatted: string }
  currentClaimant: string | null
}

export default function ClaimPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: session, status } = useSession()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!id) return

    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setListing(data.listing)
        }
      })
      .catch(console.error)
  }, [id])

  if (status === 'loading' || !listing) {
    return <div className={styles.container}><p>Loading...</p></div>
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign in required</h1>
          <p className={styles.message}>You need to be signed in to claim a property.</p>
          <Link href={`/login?callbackUrl=/claim/${id}`} className={styles.primaryButton}>
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const isClaimed = !!listing.currentClaimant

  const handleClaim = async () => {
    if (!confirmed) {
      setError('Please confirm that you are the landlord or managing agent')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/listings/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to claim property')
        return
      }

      router.push(`/listing/${id}`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Link href={`/listing/${id}`} className={styles.backLink}>
          ← Back to listing
        </Link>

        <h1 className={styles.title}>Claim this Property</h1>
        <p className={styles.address}>{listing.address.formatted}</p>

        {isClaimed && (
          <div className={styles.warning}>
            <strong>Note:</strong> This property has already been claimed.
            If you are the new landlord or managing agent, you can submit a new claim
            and we will transfer ownership to you.
          </div>
        )}

        <div className={styles.benefits}>
          <h2 className={styles.benefitsTitle}>What you get (free):</h2>
          <ul className={styles.benefitsList}>
            <li>Get notified when new reviews are posted</li>
            <li>Show your property as "Claimed"</li>
            <li>Build trust with potential tenants</li>
          </ul>
        </div>

        <div className={styles.paidFeatures}>
          <h2 className={styles.benefitsTitle}>Paid features (coming soon):</h2>
          <ul className={styles.benefitsList}>
            <li>Respond to reviews</li>
            <li>Add property description</li>
            <li>Add photos</li>
          </ul>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className={styles.checkbox}
          />
          I confirm that I am the landlord or managing agent for this property
        </label>

        <button
          onClick={handleClaim}
          className={styles.claimButton}
          disabled={loading}
        >
          {loading ? 'Claiming...' : isClaimed ? 'Submit New Claim' : 'Claim Property'}
        </button>
      </div>
    </div>
  )
}
