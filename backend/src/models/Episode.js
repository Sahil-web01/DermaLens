import mongoose from 'mongoose';

const episodeSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    procedureLabel: {
      type: String,
      required: true,
      trim: true,
    },
    surgeryDate: {
      type: Date,
      required: true,
    },
    woundSite: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Episode', episodeSchema);
