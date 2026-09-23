import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    mrn: {
      type: String,
      required: [true, 'Medical Record Number (MRN) is required'],
      unique: true,
      trim: true,
      index: true,
    },
    surgeryType: {
      type: String,
      required: [true, 'Surgery type is required'],
      trim: true,
    },
    surgeryDate: {
      type: Date,
      required: [true, 'Surgery date is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
