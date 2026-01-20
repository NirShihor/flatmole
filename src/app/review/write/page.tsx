'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './write.module.css'
import VerificationUpload from './VerificationUpload'

function WriteReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listingId')
  const { data: session, status } = useSession()

  const [listing, setListing] = useState<{ address: { formatted: string } } | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [submittedReviewId, setSubmittedReviewId] = useState<string | null>(null)

  useEffect(() => {
    if (!listingId) return

    fetch(`/api/listings/${listingId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setListing(data.listing)
        }
      })
      .catch(console.error)
  }, [listingId])

  if (status === 'loading') {
    return <p>Loading...</p>
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in required</h1>
        <p className={styles.message}>You need to be signed in to write a review.</p>
        <Link href={`/login?callbackUrl=/review/write?listingId=${listingId}`} className={styles.primaryButton}>
          Sign in
        </Link>
      </div>
    )
  }

  const isEmailVerified = (session?.user as unknown as { isEmailVerified?: boolean })?.isEmailVerified

  if (!isEmailVerified) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Email verification required</h1>
        <p className={styles.message}>
          Please verify your email address before writing a review.
          Check your inbox for the verification link.
        </p>
        <Link href={`/listing/${listingId}`} className={styles.secondaryButton}>
          Back to listing
        </Link>
      </div>
    )
  }

  if (!listingId) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>No property selected</h1>
        <p className={styles.message}>Please search for a property first.</p>
        <Link href="/" className={styles.primaryButton}>
          Go to search
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (content.length < 50) {
      setError('Review must be at least 50 characters')
      return
    }

    if (!anonymous && !displayName.trim()) {
      setError('Please enter a display name or choose anonymous')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          rating,
          content,
          anonymous,
          displayName: anonymous ? null : displayName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to submit review')
        return
      }

      // Review submitted - now show verification
      setSubmittedReviewId(data.reviewId)
      setReviewSubmitted(true)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // After review is submitted, show verification upload
  if (reviewSubmitted && listing) {
    return (
      <div className={styles.card}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Review saved!</h2>
          <p className={styles.successText}>
            To publish your review, please verify you lived at this address.
          </p>
        </div>
        <VerificationUpload
          listingId={listingId!}
          address={listing.address.formatted}
          reviewId={submittedReviewId}
          onVerified={() => router.push(`/listing/${listingId}`)}
        />
        <button
          className={styles.skipLink}
          onClick={() => router.push(`/listing/${listingId}`)}
        >
          Skip for now (review won&apos;t be visible)
        </button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <Link href={`/listing/${listingId}`} className={styles.backLink}>
        ← Back to listing
      </Link>

      <h1 className={styles.title}>Write a Review</h1>
      {listing && (
        <p className={styles.address}>{listing.address.formatted}</p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label}>Rating</label>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.star} ${(hoverRating || rating) >= star ? styles.starActive : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="content" className={styles.label}>Your Review</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience with this property and landlord (minimum 50 characters)"
            className={styles.textarea}
            rows={6}
          />
          <span className={styles.charCount}>{content.length} characters</span>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className={styles.checkbox}
            />
            Post anonymously
          </label>
        </div>

        {!anonymous && (
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Name shown with your review"
              className={styles.input}
            />
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}

export default function WriteReviewPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<p>Loading...</p>}>
        <WriteReviewContent />
      </Suspense>
    </div>
  )
}
