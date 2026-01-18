import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IAddress {
  formatted: string
  line1: string
  line2?: string
  city: string
  postcode: string
  country: string
  placeId: string
}

export interface IClaimHistory {
  userId: Types.ObjectId
  claimedAt: Date
  releasedAt?: Date
}

export interface IListing {
  address: IAddress
  currentClaimant?: Types.ObjectId
  claimHistory: IClaimHistory[]
  description?: string
  photos?: string[]
  hasPaidFeatures: boolean
  averageRating: number
  reviewsCount: number
  createdAt: Date
  updatedAt: Date
}

export interface IListingDocument extends IListing, Document {}

const addressSchema = new Schema<IAddress>(
  {
    formatted: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    postcode: { type: String, required: true },
    country: { type: String, required: true, default: 'UK' },
    placeId: { type: String, required: true },
  },
  { _id: false }
)

const claimHistorySchema = new Schema<IClaimHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    claimedAt: { type: Date, required: true, default: Date.now },
    releasedAt: { type: Date },
  },
  { _id: false }
)

const listingSchema = new Schema<IListingDocument>(
  {
    address: {
      type: addressSchema,
      required: true,
    },
    currentClaimant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    claimHistory: {
      type: [claimHistorySchema],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    hasPaidFeatures: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

listingSchema.index({ 'address.placeId': 1 }, { unique: true })
listingSchema.index({ 'address.postcode': 1 })
listingSchema.index({ 'address.city': 1 })
listingSchema.index({ currentClaimant: 1 })

export const Listing: Model<IListingDocument> =
  mongoose.models.Listing || mongoose.model<IListingDocument>('Listing', listingSchema)
