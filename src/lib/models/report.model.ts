import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type ReportTargetType = 'review' | 'response'
export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'

export interface IReport {
  targetType: ReportTargetType
  targetId: Types.ObjectId
  reportedBy: Types.ObjectId
  reason: string
  status: ReportStatus
  createdAt: Date
  updatedAt: Date
}

export interface IReportDocument extends IReport, Document {}

const reportSchema = new Schema<IReportDocument>(
  {
    targetType: {
      type: String,
      enum: ['review', 'response'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

reportSchema.index({ targetType: 1, targetId: 1 })
reportSchema.index({ status: 1 })
reportSchema.index({ reportedBy: 1 })

export const Report: Model<IReportDocument> =
  mongoose.models.Report || mongoose.model<IReportDocument>('Report', reportSchema)
