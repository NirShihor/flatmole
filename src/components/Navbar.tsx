'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Flatmole
        </Link>

        <div className={styles.links}>
          {status === 'loading' ? (
            <span className={styles.loading}>...</span>
          ) : session ? (
            <>
              <Link href="/" className={styles.link}>
                Home
              </Link>
              <Link href="/profile" className={styles.link}>
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className={styles.logoutButton}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/" className={styles.link}>
                Home
              </Link>
              <Link href="/login" className={styles.link}>
                Log in
              </Link>
              <Link href="/signup" className={styles.signupButton}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
