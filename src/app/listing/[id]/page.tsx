import { ObjectId } from 'mongodb'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import clientPromise from '@/lib/mongoClient'
import { auth } from '@/lib/auth'
import styles from './listing.module.css'
import ReviewsList from './ReviewsList'
import UpgradeButton from './UpgradeButton'

interface ListingPageProps {
  params: Promise<{ id: string }>
}

async function getListing(id: string) {
  if (!ObjectId.isValid(id)) {
    return null
  }

  const client = await clientPromise
  const db = client.db()

  const listing = await db.collection('listings').findOne({ _id: new ObjectId(id) })

  if (!listing) {
    return null
  }

  const reviews = await db
    .collection('reviews')
    .find({ listingId: new ObjectId(id), status: 'approved' })
    .sort({ createdAt: -1 })
    .toArray()

  const reviewIds = reviews.map(r => r._id)
  const responses = await db
    .collection('responses')
    .find({ reviewId: { $in: reviewIds } })
    .toArray()

  const responsesMap = new Map(
    responses.map(resp => [resp.reviewId.toString(), resp])
  )

  return {
    listing: {
      _id: listing._id.toString(),
      address: listing.address,
      description: listing.description || null,
      currentClaimant: listing.currentClaimant?.toString() || null,
      hasPaidFeatures: listing.hasPaidFeatures || false,
      averageRating: listing.averageRating || 0,
      reviewsCount: listing.reviewsCount || 0,
    },
    reviews: reviews.map(r => ({
      _id: r._id.toString(),
      listingId: r.listingId.toString(),
      userId: r.userId.toString(),
      rating: r.rating,
      content: r.content,
      anonymous: r.anonymous,
      displayName: r.displayName,
      createdAt: r.createdAt.toISOString(),
      response: responsesMap.has(r._id.toString())
        ? {
            _id: responsesMap.get(r._id.toString())!._id.toString(),
            content: responsesMap.get(r._id.toString())!.content,
            createdAt: responsesMap.get(r._id.toString())!.createdAt.toISOString(),
          }
        : null,
    })),
  }
}

async function getCurrentUserId() {
  const session = await auth()
  if (!session?.user?.email) return null

  const client = await clientPromise
  const db = client.db()
  const user = await db.collection('users').findOne({ email: session.user.email })
  return user?._id.toString() || null
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params
  const [data, currentUserId] = await Promise.all([
    getListing(id),
    getCurrentUserId(),
  ])

  if (!data) {
    notFound()
  }

  const { listing, reviews } = data
  const isClaimed = !!listing.currentClaimant
  const isOwner = currentUserId && listing.currentClaimant === currentUserId
  const canRespond = isOwner && listing.hasPaidFeatures

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Back to search</Link>
      </header>

      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h1 className={styles.address}>{listing.address.formatted}</h1>
          {isClaimed ? (
            <span className={styles.claimedBadge}>Claimed</span>
          ) : (
            <span className={styles.unclaimedBadge}>Unclaimed</span>
          )}
        </div>

        {listing.description && (
          <p className={styles.description}>{listing.description}</p>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {listing.averageRating > 0 ? listing.averageRating.toFixed(1) : '-'}
            </span>
            <span className={styles.statLabel}>Rating</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{listing.reviewsCount}</span>
            <span className={styles.statLabel}>Reviews</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href={`/review/write?listingId=${id}`} className={styles.primaryButton}>
            Write a Review
          </Link>
          <Link href={`/claim/${id}`} className={styles.secondaryButton}>
            {isClaimed ? 'Claim this Property' : 'Claim this Property'}
          </Link>
        </div>

        {isOwner && !listing.hasPaidFeatures && (
          <UpgradeButton listingId={id} />
        )}

        <section className={styles.reviewsSection}>
          <h2 className={styles.reviewsTitle}>Reviews</h2>

          {reviews.length === 0 ? (
            <p className={styles.noReviews}>
              No reviews yet. Be the first to write one!
            </p>
          ) : (
            <ReviewsList reviews={reviews} canRespond={canRespond} isLoggedIn={!!currentUserId} />
          )}
        </section>
      </main>
    </div>
  )
}
