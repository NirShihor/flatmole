'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './properties.module.css'

interface Property {
  _id: string
  address: {
    formatted: string
  }
  averageRating: number
  reviewsCount: number
  hasPaidFeatures: boolean
}

export default function MyPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile/properties')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProperties(data.properties)
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
      <h1 className={styles.title}>My Properties</h1>

      {properties.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven&apos;t claimed any properties yet.</p>
          <Link href="/" className={styles.primaryButton}>
            Find a property to claim
          </Link>
        </div>
      ) : (
        <div className={styles.propertiesList}>
          {properties.map((property) => (
            <Link
              key={property._id}
              href={`/listing/${property._id}`}
              className={styles.propertyCard}
            >
              <div className={styles.propertyInfo}>
                <h2 className={styles.address}>{property.address.formatted}</h2>
                <div className={styles.stats}>
                  <span className={styles.stat}>
                    ★ {property.averageRating > 0 ? property.averageRating.toFixed(1) : '-'}
                  </span>
                  <span className={styles.stat}>
                    {property.reviewsCount} review{property.reviewsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className={styles.badges}>
                {property.hasPaidFeatures ? (
                  <span className={styles.paidBadge}>Premium</span>
                ) : (
                  <span className={styles.freeBadge}>Free</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
