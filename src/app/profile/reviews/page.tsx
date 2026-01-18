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
              <div className={styles.meta}>
                Posted as: {review.anonymous ? 'Anonymous' : review.displayName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
