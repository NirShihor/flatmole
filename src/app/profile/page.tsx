'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './overview.module.css'

interface Stats {
  reviewsCount: number
  propertiesCount: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats)
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.name}>{session?.user?.name || 'User'}</h1>
          <p className={styles.email}>{session?.user?.email}</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Link href="/profile/reviews" className={styles.statCard}>
          <span className={styles.statValue}>{stats?.reviewsCount ?? '-'}</span>
          <span className={styles.statLabel}>Reviews Written</span>
        </Link>
        <Link href="/profile/properties" className={styles.statCard}>
          <span className={styles.statValue}>{stats?.propertiesCount ?? '-'}</span>
          <span className={styles.statLabel}>Properties Claimed</span>
        </Link>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <Link href="/" className={styles.actionButton}>
            Search for a property
          </Link>
        </div>
      </div>
    </div>
  )
}
