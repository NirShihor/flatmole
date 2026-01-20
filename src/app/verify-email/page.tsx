'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './verify-email.module.css'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage(data.alreadyVerified ? 'Your email is already verified!' : 'Your email has been verified!')
        } else {
          setStatus('error')
          setMessage(data.message || 'Verification failed')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('An error occurred during verification')
      })
  }, [token])

  return (
    <div className={styles.card}>
      {status === 'loading' && (
        <>
          <div className={styles.spinner} />
          <h1 className={styles.title}>Verifying your email...</h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>{message}</h1>
          <p className={styles.message}>You can now write reviews and access all features.</p>
          <Link href="/login" className={styles.button}>
            Log in
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className={styles.errorIcon}>✕</div>
          <h1 className={styles.title}>Verification failed</h1>
          <p className={styles.message}>{message}</p>
          <Link href="/signup" className={styles.button}>
            Sign up again
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.card}><p>Loading...</p></div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
