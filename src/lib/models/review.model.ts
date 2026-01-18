import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type ReviewStatus = 'pending' | 'approved' | 'flagged' | 'removed'

export interface IReview {
  listingId: Types.ObjectId
  userId: Types.ObjectId
  content: string
  rating: number
  anonymous: boolean
  displayName?: string
  status: ReviewStatus
  createdAt: Date
  updatedAt: Date
}

export interface IReviewDocument extends IReview, Document {}

const reviewSchema = new Schema<IReviewDocument>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 5000,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    anonymous: {
      type: Boolean,
      default: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'flagged', 'removed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

reviewSchema.index({ listingId: 1, createdAt: -1 })
reviewSchema.index({ status: 1 })

export const Review: Model<IReviewDocument> =
  mongoose.models.Review || mongoose.model<IReviewDocument>('Review', reviewSchema)
