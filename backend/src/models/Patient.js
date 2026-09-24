import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      index: true,
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
      default: 'General Post-Op Surveillance',
    },
    surgeryDate: {
      type: Date,
      required: [true, 'Surgery date is required'],
      default: Date.now,
    },
    /** Clinician (User) who may view this patient's symptoms, photos, and check-ins (active mutual consent) */
    assignedClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    /** Clinician (User) for whom assignment consent is currently pending */
    pendingClinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    /** Mutual consent status:
     * - 'unassigned': No doctor assigned or requested
     * - 'pending_patient_consent': Doctor offered/claimed patient; awaiting patient's acceptance or decline
     * - 'pending_doctor_consent': Patient requested this doctor; awaiting doctor's consent
     * - 'assigned': Mutual consent established; active attending care
     */
    assignmentStatus: {
      type: String,
      enum: ['unassigned', 'pending_patient_consent', 'pending_doctor_consent', 'assigned'],
      default: 'unassigned',
      index: true,
    },
    consentRequestedAt: {
      type: Date,
      default: null,
    },
    consentNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
