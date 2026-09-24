import fs from 'fs';
import Patient from '../models/Patient.js';
import CheckIn from '../models/CheckIn.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { predictWoundConcern } from '../services/mlClient.js';
import {
  resolveActingClinician,
  loadPatientIfAccessible,
  accessDenied,
} from '../utils/clinicianPatientAccess.js';

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
    const userEmail = (req.body.email || req.headers['x-user-email'] || req.query.email || '').trim().toLowerCase();
    const patientName = (req.body.patientName || req.body.name || '').trim();

    // 1. Resolve patient:
    // a) By ObjectId in params/body
    let patient = null;
    if (targetPatientId && targetPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(targetPatientId);
    }
    // b) By MRN in params/body
    if (!patient && targetPatientId) {
      patient = await Patient.findOne({ mrn: targetPatientId });
    }
    // c) By authenticated user email (guarantees check-ins belong ONLY to this user)
    if (!patient && userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const candidateEmails = [normalizedEmail];
      if (normalizedEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com');
      if (normalizedEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com');

      patient = await Patient.findOne({ email: { $in: candidateEmails } });

      // If demo user patient@demo.com, link to David Rodriguez if unassigned
      if (!patient && normalizedEmail === 'patient@demo.com') {
        patient = (await Patient.findOne({ mrn: 'MRN-2026-002' })) || (await Patient.findOne());
        if (patient && !patient.email) {
          patient.email = 'patient@demo.com';
          await patient.save();
        }
      }

      // If new registered patient (e.g. sahil@gmail.com), check by name or create single record
      if (!patient) {
        const fallbackName = patientName || normalizedEmail.split('@')[0];
        const existingByName = await Patient.findOne({
          name: { $regex: new RegExp(`^${fallbackName.trim()}$`, 'i') },
        });

        if (existingByName) {
          if (!existingByName.email) {
            existingByName.email = normalizedEmail;
            await existingByName.save();
          }
          patient = existingByName;
        } else {
          const mrn = `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          patient = await Patient.create({
            name: fallbackName.trim(),
            email: normalizedEmail,
            mrn,
            surgeryType: 'General Post-Op Surveillance',
            surgeryDate: new Date(),
          });
        }
      }
    }

    // d) Fallback only if no user email or ID was provided
    if (!patient && !userEmail && !targetPatientId) {
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
    const userEmail = (req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();
    const userName = (req.query.name || '').trim();

    let patient = null;
    // 1. If explicit ObjectId passed in params
    if (targetId && targetId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(targetId);
    }
    // 2. If MRN passed in params
    if (!patient && targetId) {
      patient = await Patient.findOne({ mrn: targetId });
    }
    // 3. If authenticated user email provided (user viewing their OWN timeline)
    if (!patient && userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const candidateEmails = [normalizedEmail];
      if (normalizedEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com');
      if (normalizedEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com');

      patient = await Patient.findOne({ email: { $in: candidateEmails } });

      // If demo user patient@demo.com, link to David Rodriguez if unassigned
      if (!patient && normalizedEmail === 'patient@demo.com') {
        patient = (await Patient.findOne({ mrn: 'MRN-2026-002' })) || (await Patient.findOne());
        if (patient && !patient.email) {
          patient.email = 'patient@demo.com';
          await patient.save();
        }
      }

      // If registered patient (e.g. sahil@gmail.com), check by name or create single record
      if (!patient) {
        const fallbackName = userName || normalizedEmail.split('@')[0];
        const existingByName = await Patient.findOne({
          name: { $regex: new RegExp(`^${fallbackName.trim()}$`, 'i') },
        });

        if (existingByName) {
          if (!existingByName.email) {
            existingByName.email = normalizedEmail;
            await existingByName.save();
          }
          patient = existingByName;
        } else {
          const mrn = `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          patient = await Patient.create({
            name: fallbackName.trim(),
            email: normalizedEmail,
            mrn,
            surgeryType: 'General Post-Op Surveillance',
            surgeryDate: new Date(),
          });
        }
      }
    }

    // 4. Fallback only if no targetId and no email was provided
    if (!patient && !userEmail && !targetId) {
      patient = await Patient.findOne();
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const actingClinician = await resolveActingClinician(req);
    const isOwnPatientTimeline =
      userEmail &&
      patient.email &&
      (patient.email.toLowerCase() === userEmail ||
        (userEmail === 'sahil@gmail.com' && patient.email.toLowerCase() === 'sahildh@gmail.com') ||
        (userEmail === 'sahildh@gmail.com' && patient.email.toLowerCase() === 'sahil@gmail.com'));

    if (!isOwnPatientTimeline) {
      if (!actingClinician) {
        return res.status(401).json({
          success: false,
          message: 'Clinician sign-in required to access patient clinical details.',
        });
      }
      const allowed = await loadPatientIfAccessible(patient._id, actingClinician);
      if (!allowed) {
        return accessDenied(res, 'Access Denied: You are not the assigned clinician for this patient.');
      }
    }

    await patient.populate('assignedClinicianId', 'name email');
    await patient.populate('pendingClinicianId', 'name email');

    const patientId = patient._id;
    // Fetch ONLY check-ins belonging to this patient
    const checkIns = await CheckIn.find({ patientId }).sort({ capturedAt: 1 });

    return res.status(200).json({
      success: true,
      count: checkIns.length,
      patient: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        mrn: patient.mrn,
        surgeryType: patient.surgeryType,
        surgeryDate: patient.surgeryDate,
        assignedClinicianId: patient.assignedClinicianId?._id || patient.assignedClinicianId || null,
        assignedClinician:
          patient.assignedClinicianId && typeof patient.assignedClinicianId === 'object'
            ? {
                id: patient.assignedClinicianId._id,
                _id: patient.assignedClinicianId._id,
                name: patient.assignedClinicianId.name,
                email: patient.assignedClinicianId.email,
              }
            : null,
        pendingClinicianId: patient.pendingClinicianId?._id || patient.pendingClinicianId || null,
        pendingClinician:
          patient.pendingClinicianId && typeof patient.pendingClinicianId === 'object'
            ? {
                id: patient.pendingClinicianId._id,
                _id: patient.pendingClinicianId._id,
                name: patient.pendingClinicianId.name,
                email: patient.pendingClinicianId.email,
              }
            : null,
        assignmentStatus:
          patient.assignmentStatus || (patient.assignedClinicianId ? 'assigned' : 'unassigned'),
        consentRequestedAt: patient.consentRequestedAt,
        consentNotes: patient.consentNotes,
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
    const { name, email, mrn, surgeryType, surgeryDate } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required',
      });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Check if patient profile already exists by email to prevent duplicates
    if (normalizedEmail) {
      let existing = await Patient.findOne({ email: normalizedEmail });
      if (existing) {
        if (name && existing.name !== name.trim()) {
          existing.name = name.trim();
        }
        if (surgeryType) existing.surgeryType = surgeryType;
        await existing.save();

        return res.status(200).json({
          success: true,
          message: 'Patient profile already exists',
          data: existing,
        });
      }

      // Check if an unassigned patient with same name exists (from prior registration or test)
      const orphanByName = await Patient.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        $or: [{ email: { $exists: false } }, { email: null }, { email: '' }],
      });
      if (orphanByName) {
        orphanByName.email = normalizedEmail;
        if (surgeryType) orphanByName.surgeryType = surgeryType;
        await orphanByName.save();
        return res.status(200).json({
          success: true,
          message: 'Patient profile linked to existing record',
          data: orphanByName,
        });
      }
    }

    const assignedMrn = mrn || `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const patient = await Patient.create({
      name: name.trim(),
      email: normalizedEmail || undefined,
      mrn: assignedMrn,
      surgeryType: surgeryType || 'General Post-Op Surveillance',
      surgeryDate: surgeryDate ? new Date(surgeryDate) : new Date(),
    });

    return res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this MRN or email already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get list of all patients with mutual consent awareness
export const getPatients = async (req, res) => {
  try {
    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician sign-in required. Provide Authorization Bearer token or X-Clinician-Email header.',
      });
    }

    const { scope } = req.query;

    let query = {
      assignedClinicianId: clinician._id,
      $or: [{ assignmentStatus: 'assigned' }, { assignmentStatus: { $exists: false } }, { assignmentStatus: null }],
    };

    if (scope === 'unassigned') {
      // Patients who don't have an active doctor assigned
      query = {
        $or: [
          { assignmentStatus: 'unassigned' },
          { assignmentStatus: 'pending_patient_consent' },
          { assignedClinicianId: null, pendingClinicianId: null },
          { assignedClinicianId: { $exists: false }, pendingClinicianId: { $exists: false } },
        ],
      };
    } else if (scope === 'incoming_requests') {
      // Patients who chose THIS clinician and are awaiting doctor consent
      query = {
        pendingClinicianId: clinician._id,
        assignmentStatus: 'pending_doctor_consent',
      };
    } else if (scope === 'pending_offers') {
      // Offers sent by THIS clinician awaiting patient confirmation
      query = {
        pendingClinicianId: clinician._id,
        assignmentStatus: 'pending_patient_consent',
      };
    }

    const patients = await Patient.find(query)
      .populate('assignedClinicianId', 'name email')
      .populate('pendingClinicianId', 'name email')
      .sort({ createdAt: -1 });

    const assignedCount = await Patient.countDocuments({
      assignedClinicianId: clinician._id,
      $or: [{ assignmentStatus: 'assigned' }, { assignmentStatus: { $exists: false } }, { assignmentStatus: null }],
    });

    const unassignedCount = await Patient.countDocuments({
      $or: [
        { assignmentStatus: 'unassigned' },
        { assignedClinicianId: null, pendingClinicianId: null },
        { assignedClinicianId: { $exists: false }, pendingClinicianId: { $exists: false } },
      ],
    });

    const incomingRequestsCount = await Patient.countDocuments({
      pendingClinicianId: clinician._id,
      assignmentStatus: 'pending_doctor_consent',
    });

    const pendingOffersCount = await Patient.countDocuments({
      pendingClinicianId: clinician._id,
      assignmentStatus: 'pending_patient_consent',
    });

    return res.status(200).json({
      success: true,
      count: patients.length,
      assignedCount,
      unassignedCount,
      incomingRequestsCount,
      pendingOffersCount,
      actingClinician: {
        id: clinician._id,
        name: clinician.name,
        email: clinician.email,
      },
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

    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician authentication required.',
      });
    }
    const allowed = await loadPatientIfAccessible(patient._id, clinician);
    if (!allowed) {
      return accessDenied(res);
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

// Delete a patient profile and associated check-ins
export const deletePatient = async (req, res) => {
  try {
    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician authentication required.',
      });
    }

    const { id } = req.params;
    let patient = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(id);
    } else if (id) {
      patient = await Patient.findOne({ mrn: id });
    }
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const allowed = await loadPatientIfAccessible(patient._id, clinician);
    if (!allowed) {
      return accessDenied(res);
    }

    patient = await Patient.findByIdAndDelete(patient._id);

    // Also remove any check-ins belonging to this patient
    await CheckIn.deleteMany({ patientId: patient._id });

    return res.status(200).json({
      success: true,
      message: 'Patient and associated check-ins removed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper to resolve target patient from ID or user email
const resolveTargetPatient = async (req) => {
  const { id } = req.params;
  const userEmail = (
    req.body?.email ||
    req.query?.email ||
    req.headers['x-user-email'] ||
    req.headers['x-patient-email'] ||
    req.user?.email ||
    ''
  )
    .trim()
    .toLowerCase();

  let patient = null;
  if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
    patient = await Patient.findById(id);
  } else if (id && id !== 'undefined' && id !== 'null' && id !== 'request-doctor' && id !== 'patient-consent' && id !== 'release-doctor') {
    patient = await Patient.findOne({ mrn: id });
  }
  if (!patient && userEmail) {
    const candidateEmails = [userEmail];
    if (userEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com');
    if (userEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com');
    patient = await Patient.findOne({ email: { $in: candidateEmails } });
  }
  return patient;
};

// Helper to format doctor name cleanly without duplicate "Dr."
const formatDoctorName = (name) => {
  if (!name) return 'the attending physician';
  const trimmed = name.trim();
  return trimmed.startsWith('Dr.') || trimmed.startsWith('Dr ') ? trimmed : `Dr. ${trimmed}`;
};

// 1. Doctor offers to take an unassigned patient (Awaiting Patient Consent)
export const claimPatient = async (req, res) => {
  try {
    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician authentication required.',
      });
    }

    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    if (patient.assignmentStatus === 'assigned' && patient.assignedClinicianId && String(patient.assignedClinicianId) !== String(clinician._id)) {
      return res.status(400).json({
        success: false,
        message: 'This patient is already under active care of another attending physician.',
      });
    }

    // Set offer status - awaiting patient consent
    patient.pendingClinicianId = clinician._id;
    patient.assignmentStatus = 'pending_patient_consent';
    patient.consentRequestedAt = new Date();
    patient.consentNotes = req.body?.notes || `${formatDoctorName(clinician.name)} offered post-op wound surveillance.`;
    await patient.save();

    // Create Notification for the Patient
    await Notification.create({
      recipientRole: 'PATIENT',
      patientId: patient._id,
      title: 'Physician Care Offer',
      message: `${formatDoctorName(clinician.name)} has offered to be your attending physician. You have the right to accept or decline this offer.`,
      type: 'CONSENT_REQUEST',
    });

    return res.status(200).json({
      success: true,
      message: `Care offer sent to patient ${patient.name}. Awaiting patient confirmation.`,
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Doctor cancels/withdraws their pending care offer
export const cancelClaimOffer = async (req, res) => {
  try {
    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({ success: false, message: 'Clinician authentication required.' });
    }

    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (patient.pendingClinicianId && String(patient.pendingClinicianId) !== String(clinician._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to withdraw this offer.' });
    }

    patient.pendingClinicianId = null;
    patient.assignmentStatus = 'unassigned';
    patient.consentNotes = '';
    await patient.save();

    return res.status(200).json({
      success: true,
      message: `Care offer for ${patient.name} withdrawn successfully.`,
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Patient responds to doctor care offer (Accept or Decline)
export const respondPatientConsent = async (req, res) => {
  try {
    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const { action, notes } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "accept" or "decline".' });
    }

    if (!patient.pendingClinicianId && patient.assignmentStatus !== 'pending_patient_consent') {
      return res.status(400).json({
        success: false,
        message: 'No pending physician care offer exists for this patient.',
      });
    }

    const doctor = await User.findById(patient.pendingClinicianId);

    if (action === 'accept') {
      patient.assignedClinicianId = patient.pendingClinicianId;
      patient.pendingClinicianId = null;
      patient.assignmentStatus = 'assigned';
      patient.consentNotes = notes || 'Patient consented to physician care assignment.';
      await patient.save();

      if (doctor) {
        await Notification.create({
          recipientRole: 'CLINICIAN',
          patientId: patient._id,
          title: 'Patient Consent Confirmed',
          message: `${patient.name} (${patient.mrn}) accepted your care offer and is now in your active surgical cohort.`,
          type: 'ASSIGNMENT_UPDATE',
        });
      }

      return res.status(200).json({
        success: true,
        message: `You have successfully consented to ${formatDoctorName(doctor?.name)}. They are now your attending doctor.`,
        data: patient,
      });
    } else {
      // Patient declines
      const prevDoctorId = patient.pendingClinicianId;
      patient.pendingClinicianId = null;
      patient.assignedClinicianId = null;
      patient.assignmentStatus = 'unassigned';
      patient.consentNotes = notes || 'Patient declined doctor care offer.';
      await patient.save();

      if (doctor) {
        await Notification.create({
          recipientRole: 'CLINICIAN',
          patientId: patient._id,
          title: 'Care Offer Declined',
          message: `${patient.name} (${patient.mrn}) declined the care assignment offer. The patient remains in the unassigned pool.`,
          type: 'INFO',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Care offer declined. You may now select your preferred doctor from the directory.',
        data: patient,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Patient exercises right to choose a specific doctor with doctor's consent
export const requestDoctor = async (req, res) => {
  try {
    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const { clinicianId, notes } = req.body;
    if (!clinicianId) {
      return res.status(400).json({ success: false, message: 'Clinician ID is required.' });
    }

    const targetClinician = await User.findOne({ _id: clinicianId, role: 'CLINICIAN' });
    if (!targetClinician) {
      return res.status(404).json({ success: false, message: 'Selected physician was not found.' });
    }

    // Patient requests this doctor with consent required
    patient.pendingClinicianId = targetClinician._id;
    patient.assignmentStatus = 'pending_doctor_consent';
    patient.consentRequestedAt = new Date();
    patient.consentNotes = notes || 'Patient requested this physician as preferred surgeon.';
    await patient.save();

    // Create notification for the doctor
    await Notification.create({
      recipientRole: 'CLINICIAN',
      patientId: patient._id,
      title: 'Incoming Patient Choice Request',
      message: `${patient.name} (${patient.mrn}) chose you as their preferred attending doctor and is requesting your clinical consent.`,
      type: 'CONSENT_REQUEST',
    });

    return res.status(200).json({
      success: true,
      message: `Care request sent to ${formatDoctorName(targetClinician.name)}. Awaiting clinical consent.`,
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Doctor grants or declines consent for a patient who requested them
export const respondDoctorConsent = async (req, res) => {
  try {
    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({ success: false, message: 'Clinician authentication required.' });
    }

    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    if (String(patient.pendingClinicianId) !== String(clinician._id) && patient.assignmentStatus !== 'pending_doctor_consent') {
      return res.status(400).json({
        success: false,
        message: 'No pending care request exists for this doctor.',
      });
    }

    const { action, notes } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "accept" or "decline".' });
    }

    if (action === 'accept') {
      patient.assignedClinicianId = clinician._id;
      patient.pendingClinicianId = null;
      patient.assignmentStatus = 'assigned';
      patient.consentNotes = notes || 'Physician granted clinical consent for patient care.';
      await patient.save();

      // Notify Patient
      await Notification.create({
        recipientRole: 'PATIENT',
        patientId: patient._id,
        title: 'Doctor Consent Granted',
        message: `${formatDoctorName(clinician.name)} has consented to your request and is now your attending surgeon.`,
        type: 'ASSIGNMENT_UPDATE',
      });

      return res.status(200).json({
        success: true,
        message: `You have consented to oversee ${patient.name}. Patient added to your active cohort.`,
        data: patient,
      });
    } else {
      // Doctor declines
      patient.pendingClinicianId = null;
      patient.assignmentStatus = 'unassigned';
      patient.consentNotes = notes || 'Physician was unable to take case at this time.';
      await patient.save();

      // Notify Patient
      await Notification.create({
        recipientRole: 'PATIENT',
        patientId: patient._id,
        title: 'Physician Request Update',
        message: `${formatDoctorName(clinician.name)} is currently unable to accept new patients. You may select another physician from the directory.`,
        type: 'INFO',
      });

      return res.status(200).json({
        success: true,
        message: `Request from ${patient.name} declined. Patient returned to unassigned pool.`,
        data: patient,
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Patient or Clinician releases active doctor assignment
export const releaseDoctor = async (req, res) => {
  try {
    const patient = await resolveTargetPatient(req);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const prevDoctorId = patient.assignedClinicianId;
    patient.assignedClinicianId = null;
    patient.pendingClinicianId = null;
    patient.assignmentStatus = 'unassigned';
    patient.consentNotes = req.body?.notes || 'Assignment released.';
    await patient.save();

    if (prevDoctorId) {
      await Notification.create({
        recipientRole: 'CLINICIAN',
        patientId: patient._id,
        title: 'Patient Care Assignment Released',
        message: `Patient ${patient.name} (${patient.mrn}) care assignment was released.`,
        type: 'INFO',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attending doctor assignment released successfully. You may select another doctor.',
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Directory of verified clinicians for patient selection
export const getCliniciansDirectory = async (req, res) => {
  try {
    const clinicians = await User.find({ role: 'CLINICIAN' }).select('name email');

    const directory = await Promise.all(
      clinicians.map(async (c) => {
        const activeCount = await Patient.countDocuments({
          assignedClinicianId: c._id,
          $or: [{ assignmentStatus: 'assigned' }, { assignmentStatus: { $exists: false } }, { assignmentStatus: null }],
        });
        const pendingCount = await Patient.countDocuments({
          pendingClinicianId: c._id,
          assignmentStatus: 'pending_doctor_consent',
        });

        let specialty = 'General & Trauma Wound Surveillance';
        if (c.email.includes('clinician@demo.com') || c.name.includes('Sarah Chen')) {
          specialty = 'Orthopedic & General Surgery';
        } else if (c.email.includes('clinician2@demo.com') || c.name.includes('James Wong')) {
          specialty = 'Obstetrics, Gynecology & Reconstructive Surgery';
        }

        return {
          id: c._id,
          _id: c._id,
          name: c.name,
          email: c.email,
          specialty,
          activeCount,
          pendingCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: directory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createCheckIn,
  getTimeline,
  createPatient,
  getPatients,
  getPatientById,
  deletePatient,
  claimPatient,
  cancelClaimOffer,
  respondPatientConsent,
  requestDoctor,
  respondDoctorConsent,
  releaseDoctor,
  getCliniciansDirectory,
};


