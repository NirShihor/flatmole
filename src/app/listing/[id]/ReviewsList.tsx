'use client'

import { useState } from 'react'
import styles from './listing.module.css'

const REPORT_REASONS = [
  'Inappropriate content',
  'Spam or fake review',
  'Personal information shared',
  'Harassment or abuse',
  'Other',
]

interface Review {
  _id: string
  listingId: string
  userId: string
  rating: number
  content: string
  anonymous: boolean
  displayName: string
  createdAt: string
  response: {
    _id: string
    content: string
    createdAt: string
  } | null
}

interface ReviewsListProps {
  reviews: Review[]
  canRespond: boolean
  isLoggedIn: boolean
}

interface ReportTarget {
  type: 'review' | 'response'
  id: string
}

export default function ReviewsList({ reviews, canRespond, isLoggedIn }: ReviewsListProps) {
  const [reviewsState, setReviewsState] = useState(reviews)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseContent, setResponseContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportSuccess, setReportSuccess] = useState(false)

  const handleSubmitResponse = async (reviewId: string) => {
    if (responseContent.length < 10) {
      setError('Response must be at least 10 characters')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, content: responseContent }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message || 'Failed to submit response')
        return
      }

      setReviewsState(prev =>
        prev.map(review =>
          review._id === reviewId
            ? { ...review, response: data.response }
            : review
        )
      )
      setRespondingTo(null)
      setResponseContent('')
    } catch {
      setError('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!reportTarget) return

    const reason = reportReason === 'Other'
      ? reportDetails
      : `${reportReason}${reportDetails ? `: ${reportDetails}` : ''}`

    if (reason.length < 10) {
      setReportError('Please provide more details (at least 10 characters)')
      return
    }

    setIsReporting(true)
    setReportError('')

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: reportTarget.type,
          targetId: reportTarget.id,
          reason,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setReportError(data.message || 'Failed to submit report')
        return
      }

      setReportSuccess(true)
      setTimeout(() => {
        closeReportModal()
      }, 2000)
    } catch {
      setReportError('An error occurred')
    } finally {
      setIsReporting(false)
    }
  }

  const closeReportModal = () => {
    setReportTarget(null)
    setReportReason('')
    setReportDetails('')
    setReportError('')
    setReportSuccess(false)
  }

  return (
    <div className={styles.reviewsList}>
      {reviewsState.map((review) => (
        <div key={review._id} className={styles.reviewCard}>
          <div className={styles.reviewHeader}>
            <span className={styles.reviewRating}>★ {review.rating}</span>
            <span className={styles.reviewDate}>
              {new Date(review.createdAt).toLocaleDateString('en-GB')}
            </span>
          </div>
          <p className={styles.reviewContent}>{review.content}</p>
          <div className={styles.reviewFooter}>
            {review.anonymous ? (
              <span className={styles.reviewAuthor}>Anonymous</span>
            ) : (
              <span className={styles.reviewAuthor}>{review.displayName}</span>
            )}
            {isLoggedIn && (
              <button
                onClick={() => setReportTarget({ type: 'review', id: review._id })}
                className={styles.reportButton}
              >
                Report
              </button>
            )}
          </div>

          {review.response && (
            <div className={styles.responseCard}>
              <div className={styles.responseHeader}>
                <span className={styles.responseLabel}>Landlord Response</span>
                <span className={styles.responseDate}>
                  {new Date(review.response.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              <p className={styles.responseContent}>{review.response.content}</p>
              {isLoggedIn && (
                <button
                  onClick={() => setReportTarget({ type: 'response', id: review.response!._id })}
                  className={styles.reportButton}
                >
                  Report
                </button>
              )}
            </div>
          )}

          {canRespond && !review.response && (
            <>
              {respondingTo === review._id ? (
                <div className={styles.responseForm}>
                  <textarea
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Write your response..."
                    className={styles.responseTextarea}
                    rows={4}
                    maxLength={2000}
                  />
                  {error && <p className={styles.error}>{error}</p>}
                  <div className={styles.responseActions}>
                    <button
                      onClick={() => {
                        setRespondingTo(null)
                        setResponseContent('')
                        setError('')
                      }}
                      className={styles.cancelButton}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitResponse(review._id)}
                      className={styles.submitButton}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRespondingTo(review._id)}
                  className={styles.respondButton}
                >
                  Respond to this review
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {reportTarget && (
        <div className={styles.modalOverlay} onClick={closeReportModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              Report {reportTarget.type === 'review' ? 'Review' : 'Response'}
            </h3>

            {reportSuccess ? (
              <p className={styles.successMessage}>Report submitted successfully</p>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Reason</label>
                  <div className={styles.radioGroup}>
                    {REPORT_REASONS.map((reason) => (
                      <label key={reason} className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="reason"
                          value={reason}
                          checked={reportReason === reason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className={styles.radio}
                        />
                        {reason}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {reportReason === 'Other' ? 'Please explain' : 'Additional details (optional)'}
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide more context..."
                    className={styles.responseTextarea}
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {reportError && <p className={styles.error}>{reportError}</p>}

                <div className={styles.modalActions}>
                  <button
                    onClick={closeReportModal}
                    className={styles.cancelButton}
                    disabled={isReporting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    className={styles.submitButton}
                    disabled={isReporting || !reportReason}
                  >
                    {isReporting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
