import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser {
  cognitoId: string
  email: string
  givenName?: string
  familyName?: string
  createdAt: Date
  updatedAt: Date
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    cognitoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    givenName: {
      type: String,
      trim: true,
    },
    familyName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema)
