'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './reviews.module.css'

interface Review {
  _id: string
  listingId: string
  rating: number
  content: string
  anonymous: boolean
  displayName: string | null
  createdAt: string
  listing?: {
    address: {
      formatted: string
    }
  }
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/profile/reviews')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviews(data.reviews)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
      const data = await res.json()

      if (!data.success) {
        setDeleteError({ id: reviewId, message: data.message || 'Failed to delete review' })
        return
      }

      setReviews(prev => prev.filter(review => review._id !== reviewId))
      setConfirmingId(null)
    } catch {
      setDeleteError({ id: reviewId, message: 'Failed to delete review' })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <div>
      <h1 className={styles.title}>My Reviews</h1>

      {reviews.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven&apos;t written any reviews yet.</p>
          <Link href="/" className={styles.primaryButton}>
            Find a property to review
          </Link>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {reviews.map((review) => (
            <div key={review._id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <Link href={`/listing/${review.listingId}`} className={styles.address}>
                  {review.listing?.address.formatted || 'Unknown address'}
                </Link>
                <span className={styles.date}>
                  {new Date(review.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className={styles.rating}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p className={styles.content}>{review.content}</p>
              <div className={styles.footer}>
                <div className={styles.meta}>
                  Posted as: {review.anonymous ? 'Anonymous' : review.displayName}
                </div>
                {confirmingId === review._id ? (
                  <div className={styles.confirm}>
                    <span className={styles.confirmText}>Delete this review permanently?</span>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => handleDelete(review._id)}
                      disabled={deletingId === review._id}
                    >
                      {deletingId === review._id ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => {
                        setConfirmingId(null)
                        setDeleteError(null)
                      }}
                      disabled={deletingId === review._id}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.deleteLink}
                    onClick={() => {
                      setConfirmingId(review._id)
                      setDeleteError(null)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              {deleteError?.id === review._id && (
                <p className={styles.error}>{deleteError.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
