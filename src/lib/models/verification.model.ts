import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export interface IVerification {
  userId: Types.ObjectId
  listingId: Types.ObjectId
  documentData: string
  documentType: string
  documentName: string
  status: VerificationStatus
  extractedAddress?: string
  extractedName?: string
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

export interface IVerificationDocument extends IVerification, Document {}

const verificationSchema = new Schema<IVerificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    documentData: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    extractedAddress: {
      type: String,
    },
    extractedName: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

verificationSchema.index({ userId: 1, listingId: 1 })

export const Verification: Model<IVerificationDocument> =
  mongoose.models.Verification || mongoose.model<IVerificationDocument>('Verification', verificationSchema)
