import mongoose from 'mongoose';

const symptomsSchema = new mongoose.Schema(
  {
    fever: {
      type: Boolean,
      default: false,
    },
    increasingPain: {
      type: Boolean,
      default: false,
    },
    purulentDischarge: {
      type: Boolean,
      default: false,
    },
    spreadingRedness: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const mlOutputSchema = new mongoose.Schema(
  {
    concernScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    predictedClass: {
      type: String,
      trim: true,
      default: null,
    },
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
  },
  { _id: false }
);

const checkInSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    photoUrl: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    symptoms: {
      type: symptomsSchema,
      default: () => ({}),
    },
    mlOutput: {
      type: mlOutputSchema,
      default: () => ({}),
    },
    reviewStatus: {
      type: String,
      enum: {
        values: ['pending', 'reviewed', 'escalated', 'manual_review_required', 'retake_requested'],
        message: '{VALUE} is not a valid review status',
      },
      default: 'pending',
      index: true,
    },
    clinicianNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast chronological queries for patient timeline
checkInSchema.index({ patientId: 1, capturedAt: 1 });

const CheckIn = mongoose.model('CheckIn', checkInSchema);

export default CheckIn;
