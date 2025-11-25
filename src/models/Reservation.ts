import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReservation extends Document {
  user: Types.ObjectId;
  business: Types.ObjectId;
  specialist: Types.ObjectId;
  service: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  cancellationReason?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true,
    },
    specialist: {
      type: Schema.Types.ObjectId,
      ref: 'Specialist',
      required: [true, 'Specialist reference is required'],
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        message: 'Status must be one of: pending, confirmed, cancelled, completed, no-show',
      },
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
reservationSchema.index({ startDate: 1, status: 1 });
reservationSchema.index({ specialist: 1, startDate: 1 });
reservationSchema.index({ user: 1, status: 1 });

// Prevent double booking - compound unique index
reservationSchema.index(
  { specialist: 1, startDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed'] },
    },
  }
);

export const Reservation =
  mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', reservationSchema);
