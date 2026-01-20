'use client'

import { useState, useRef } from 'react'
import styles from './write.module.css'

interface VerificationUploadProps {
  listingId: string
  address: string
  reviewId?: string | null
  onVerified: () => void
}

export default function VerificationUpload({ listingId, address, reviewId, onVerified }: VerificationUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP image or PDF')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }

    setSelectedFile(file)
    setError('')

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        const res = await fetch('/api/verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId,
            reviewId,
            documentData: base64,
            documentType: selectedFile.type,
            documentName: selectedFile.name,
          }),
        })

        const data = await res.json()

        if (data.verified) {
          onVerified()
        } else {
          setError(data.message || 'Verification failed')
          setSelectedFile(null)
          setPreview(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }

        setUploading(false)
      }

      reader.readAsDataURL(selectedFile)
    } catch {
      setError('An error occurred. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className={styles.verificationSection}>
      <h2 className={styles.verificationTitle}>Verify Your Tenancy</h2>
      <p className={styles.verificationDesc}>
        Upload a document proving you lived at:
      </p>
      <p className={styles.verificationAddress}>{address}</p>

      <div className={styles.acceptedDocs}>
        <p className={styles.acceptedDocsTitle}>Accepted documents:</p>
        <ul className={styles.acceptedDocsList}>
          <li>Utility bill (gas, electric, water)</li>
          <li>Bank statement</li>
          <li>Official letter (council tax, HMRC)</li>
        </ul>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.uploadArea}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="document-upload"
        />
        <label htmlFor="document-upload" className={styles.uploadLabel}>
          {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
        </label>
      </div>

      {preview && (
        <div className={styles.previewContainer}>
          <img src={preview} alt="Document preview" className={styles.preview} />
        </div>
      )}

      {selectedFile && !uploading && (
        <button onClick={handleUpload} className={styles.submitButton}>
          Verify Document
        </button>
      )}

      {uploading && (
        <div className={styles.uploadingState}>
          <p>Verifying your document...</p>
          <p className={styles.uploadingHint}>This may take a few seconds</p>
        </div>
      )}

      <p className={styles.privacyNote}>
        Your document is stored securely and only used to verify your tenancy.
        Need help? <a href="mailto:support@flatmole.com">Contact support</a>
      </p>
    </div>
  )
}
