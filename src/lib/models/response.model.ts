import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IResponse {
  reviewId: Types.ObjectId
  listingId: Types.ObjectId
  userId: Types.ObjectId
  content: string
  wasCurrentClaimant: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IResponseDocument extends IResponse, Document {}

const responseSchema = new Schema<IResponseDocument>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
      unique: true,
    },
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
      minlength: 10,
      maxlength: 2000,
    },
    wasCurrentClaimant: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const Response: Model<IResponseDocument> =
  mongoose.models.Response || mongoose.model<IResponseDocument>('Response', responseSchema)
