'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './success.module.css'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [listingId, setListingId] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setListingId(data.listingId)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Verifying payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>✓</div>
        <h1 className={styles.title}>Payment Successful!</h1>
        <p className={styles.message}>
          Your property has been upgraded. You can now respond to reviews.
        </p>
        {listingId ? (
          <Link href={`/listing/${listingId}`} className={styles.button}>
            Go to Property
          </Link>
        ) : (
          <Link href="/profile/properties" className={styles.button}>
            View My Properties
          </Link>
        )}
      </div>
    </div>
  )
}
