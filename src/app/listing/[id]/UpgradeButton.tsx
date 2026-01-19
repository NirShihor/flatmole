'use client'

import { useState } from 'react'
import styles from './listing.module.css'

interface UpgradeButtonProps {
  listingId: string
}

export default function UpgradeButton({ listingId }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      const data = await res.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        setError(data.message || 'Failed to start checkout')
      }
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.upgradeSection}>
      <div className={styles.upgradeCard}>
        <h3 className={styles.upgradeTitle}>Upgrade to Pro</h3>
        <p className={styles.upgradeDesc}>
          Respond to reviews and show tenants you care about feedback.
        </p>
        <p className={styles.upgradePrice}>£29 one-time payment</p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={styles.upgradeButton}
        >
          {loading ? 'Loading...' : 'Upgrade Now'}
        </button>
      </div>
    </div>
  )
}
