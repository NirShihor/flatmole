'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './profile.module.css'

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const pathname = usePathname()

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Sign in required</h1>
          <p>You need to be signed in to view your profile.</p>
          <Link href="/login?callbackUrl=/profile" className={styles.primaryButton}>
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          <Link
            href="/profile"
            className={`${styles.navLink} ${pathname === '/profile' ? styles.navLinkActive : ''}`}
          >
            Overview
          </Link>
          <Link
            href="/profile/reviews"
            className={`${styles.navLink} ${pathname === '/profile/reviews' ? styles.navLinkActive : ''}`}
          >
            My Reviews
          </Link>
          <Link
            href="/profile/properties"
            className={`${styles.navLink} ${pathname === '/profile/properties' ? styles.navLinkActive : ''}`}
          >
            My Properties
          </Link>
        </nav>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
