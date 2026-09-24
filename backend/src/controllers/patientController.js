import fs from 'fs';
import Patient from '../models/Patient.js';
import CheckIn from '../models/CheckIn.js';
import Notification from '../models/Notification.js';
import { predictWoundConcern } from '../services/mlClient.js';

// Parse boolean symptom flags from multipart form or JSON
const parseBool = (value) => value === true || value === 'true' || value === 1 || value === '1';

/**
 * POST /api/patients/:id/checkins
 * 1. Receives photo and symptom flags via multer
 * 2. Forwards image buffer to FastAPI using axios and form-data
 * 3. Merges ML output with symptoms and saves to MongoDB
 * 4. Fallback: flags check-in as 'manual_review_required' if ML service is down
 */
export const createCheckIn = async (req, res) => {
  try {
    let targetPatientId = req.params.id || req.body.patientId || req.body.episodeId;

    // Resolve patient by ObjectId, MRN, or fallback to the first active patient
    let patient = null;
    if (targetPatientId && targetPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(targetPatientId);
    }
    if (!patient && targetPatientId) {
      patient = await Patient.findOne({ mrn: targetPatientId });
    }
    if (!patient) {
      patient = await Patient.findOne();
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'No patient record found in database. Run seeder first.',
      });
    }

    const patientId = patient._id;

    // 2. Validate uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a wound photo under the "photo" field',
      });
    }

    // Parse symptom flags
    const symptoms = {
      fever: parseBool(req.body.fever),
      increasingPain: parseBool(req.body.increasingPain),
      purulentDischarge: parseBool(req.body.purulentDischarge),
      spreadingRedness: parseBool(req.body.spreadingRedness),
    };

    const photoUrl = `/uploads/${req.file.filename}`;
    let mlOutput = null;
    let reviewStatus = 'pending';
    let clinicianNotes = req.body.clinicianNotes || '';

    // 3. Forward image buffer to FastAPI server
    try {
      const imageBuffer = fs.readFileSync(req.file.path);
      const prediction = await predictWoundConcern(imageBuffer, req.file.originalname);

      mlOutput = {
        concernScore: prediction.concernScore,
        predictedClass: prediction.predictedClass,
        modelVersion: prediction.modelVersion,
      };

      // If concern is elevated or severe symptoms reported, flag status
      if (prediction.predictedClass === 'Elevated Concern' || symptoms.fever || symptoms.purulentDischarge) {
        reviewStatus = 'escalated';
      }
    } catch (mlError) {
      // 4. Fallback error handling: if ML service is down, flag as manual_review_required
      console.warn(`[ML Service Warning] ${mlError.message}. Falling back to manual_review_required.`);
      reviewStatus = 'manual_review_required';
      mlOutput = {
        concernScore: null,
        predictedClass: 'Service Unavailable',
        modelVersion: 'offline',
      };
      clinicianNotes = clinicianNotes
        ? `${clinicianNotes} | Automated triage offline: flagged for manual clinician review.`
        : 'Automated triage offline: flagged for manual clinician review.';
    }

    // Persist check-in to MongoDB
    const checkIn = await CheckIn.create({
      patientId,
      photoUrl,
      capturedAt: req.body.capturedAt || Date.now(),
      symptoms,
      mlOutput,
      reviewStatus,
      clinicianNotes,
    });

    // Generate clinician notification badge if case is high-risk or pending
    try {
      if (reviewStatus === 'escalated' || (mlOutput && mlOutput.concernScore >= 0.5) || symptoms.fever) {
        await Notification.create({
          recipientRole: 'CLINICIAN',
          patientId: patient._id,
          title: `High-Risk Triage Alert: ${patient.name}`,
          message: `${patient.name} (${patient.mrn}) reported critical symptoms with ${
            mlOutput?.concernScore ? Math.round(mlOutput.concernScore * 100) + '%' : 'elevated'
          } AI concern score.`,
          type: 'HIGH_RISK_CHECKIN',
        });
      }
    } catch (notifErr) {
      console.warn('Failed to record notification:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message:
        reviewStatus === 'manual_review_required'
          ? 'Check-in saved with manual review required (ML service unavailable)'
          : 'Check-in recorded and analyzed successfully',
      data: checkIn,
    });
  } catch (error) {
    console.error('Error creating check-in:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /api/patients/:id/timeline
 * Returns all check-ins sorted chronologically by capturedAt ascending
 */
export const getTimeline = async (req, res) => {
  try {
    const targetId = req.params.id;

    let patient = null;
    if (targetId && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(targetId);
    }
    if (!patient && targetId) {
      patient = await Patient.findOne({ mrn: targetId });
    }
    if (!patient) {
      patient = await Patient.findOne();
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const patientId = patient._id;
    // Fetch check-ins sorted chronologically (ascending)
    const checkIns = await CheckIn.find({ patientId }).sort({ capturedAt: 1 });

    return res.status(200).json({
      success: true,
      count: checkIns.length,
      patient: {
        id: patient._id,
        name: patient.name,
        mrn: patient.mrn,
        surgeryType: patient.surgeryType,
        surgeryDate: patient.surgeryDate,
      },
      timeline: checkIns,
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// Create a new patient profile
export const createPatient = async (req, res) => {
  try {
    const { name, mrn, surgeryType, surgeryDate } = req.body;
    if (!name || !mrn || !surgeryType || !surgeryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, mrn, surgeryType, and surgeryDate',
      });
    }

    const patient = await Patient.create({
      name,
      mrn,
      surgeryType,
      surgeryDate,
    });

    return res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this MRN already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get list of all patients
export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single patient by ID
export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    let patient = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(id);
    }
    if (!patient && id) {
      patient = await Patient.findOne({ mrn: id });
    }
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  createCheckIn,
  getTimeline,
  createPatient,
  getPatients,
  getPatientById,
};

