import User from '../models/User.js';
import Patient from '../models/Patient.js';

/**
 * Resolve the clinician making the request (JWT user or X-Clinician-Email header).
 */
export async function resolveActingClinician(req) {
  if (req.user?.role === 'CLINICIAN') {
    return req.user;
  }

  const headerEmail = (req.headers['x-clinician-email'] || req.headers['x-user-email'] || '')
    .toString()
    .trim()
    .toLowerCase();
  if (headerEmail) {
    let byEmail = await User.findOne({ email: headerEmail, role: 'CLINICIAN' });
    if (byEmail) return byEmail;

    // If clinician was registered in NextAuth frontend, ensure synchronized into MongoDB
    const headerName = (req.headers['x-clinician-name'] || req.headers['x-user-name'] || headerEmail.split('@')[0])
      .toString()
      .trim();
    try {
      byEmail = await User.findOneAndUpdate(
        { email: headerEmail },
        {
          $setOnInsert: {
            name: headerName,
            email: headerEmail,
            role: 'CLINICIAN',
            password: 'synced_nextauth_clinician',
          },
        },
        { upsert: true, new: true }
      );
      return byEmail;
    } catch {
      return await User.findOne({ email: headerEmail });
    }
  }

  return null;
}

export function patientAssignedToClinician(patient, clinician) {
  if (!patient || !clinician) return false;
  if (!patient.assignedClinicianId) return false;
  // If assignment status is specified, it must be 'assigned' (mutual consent established)
  if (patient.assignmentStatus && patient.assignmentStatus !== 'assigned') return false;
  return String(patient.assignedClinicianId) === String(clinician._id);
}

export async function loadPatientIfAccessible(patientRef, clinician) {
  if (!patientRef) return null;

  let patient = null;
  const id = typeof patientRef === 'object' && patientRef._id ? patientRef._id : patientRef;

  if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
    patient = await Patient.findById(id);
  }
  if (!patient && patientRef) {
    patient = await Patient.findOne({ mrn: String(patientRef) });
  }

  if (!patient) return null;
  if (!clinician) return null;
  if (!patientAssignedToClinician(patient, clinician)) return null;
  return patient;
}

export async function getAssignedPatientIds(clinician) {
  if (!clinician?._id) return [];
  const patients = await Patient.find({
    assignedClinicianId: clinician._id,
    $or: [{ assignmentStatus: 'assigned' }, { assignmentStatus: { $exists: false } }, { assignmentStatus: null }],
  }).select('_id');
  return patients.map((p) => p._id);
}

export function accessDenied(res, message = 'You are not authorized to access this patient record.') {
  return res.status(403).json({
    success: false,
    message,
  });
}
