import CheckIn from '../models/CheckIn.js';
import Notification from '../models/Notification.js';
import { resolveActingClinician, loadPatientIfAccessible, accessDenied } from '../utils/clinicianPatientAccess.js';

const ALLOWED_STATUSES = [
  'pending',
  'reviewed',
  'escalated',
  'manual_review_required',
  'retake_requested',
];

/**
 * PATCH /api/checkins/:id/review
 * Allows clinician to update reviewStatus and append follow-up advice/notes
 */
export const reviewCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewStatus, clinicianNotes, followUpAdvice } = req.body;

    const checkIn = await CheckIn.findById(id).populate('patientId', 'name mrn surgeryType assignedClinicianId');
    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found',
      });
    }

    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician authentication required.',
      });
    }
    const allowed = await loadPatientIfAccessible(checkIn.patientId, clinician);
    if (!allowed) {
      return accessDenied(res);
    }

    // Validate reviewStatus if provided
    if (reviewStatus) {
      if (!ALLOWED_STATUSES.includes(reviewStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid reviewStatus. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        });
      }
      checkIn.reviewStatus = reviewStatus;
    }

    // Append clinician notes / follow-up advice
    const newNotes = clinicianNotes || followUpAdvice;
    if (newNotes && newNotes.trim()) {
      if (checkIn.clinicianNotes && checkIn.clinicianNotes.trim()) {
        checkIn.clinicianNotes = `${checkIn.clinicianNotes} | Follow-up: ${newNotes.trim()}`;
      } else {
        checkIn.clinicianNotes = newNotes.trim();
      }
    }

    await checkIn.save();

    // Notify the patient about the clinician update
    try {
      await Notification.create({
        recipientRole: 'PATIENT',
        patientId: checkIn.patientId?._id || checkIn.patientId,
        title: `Clinical Review: Case ${checkIn.reviewStatus.toUpperCase()}`,
        message: newNotes
          ? `Your surgical care team reviewed your wound check-in: "${newNotes.trim()}"`
          : `Your check-in status was updated to "${checkIn.reviewStatus}".`,
        type: 'CLINICAL_REVIEW',
      });
    } catch (notifErr) {
      console.warn('Failed to record patient notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Check-in review updated successfully',
      data: checkIn,
    });
  } catch (error) {
    console.error('Error reviewing check-in:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update check-in review',
    });
  }
};

/**
 * GET /api/checkins/:id
 * Fetch a single check-in with patient details
 */
export const getCheckInById = async (req, res) => {
  try {
    const { id } = req.params;
    const checkIn = await CheckIn.findById(id).populate(
      'patientId',
      'name mrn surgeryType surgeryDate assignedClinicianId'
    );

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found',
      });
    }

    const clinician = await resolveActingClinician(req);
    if (!clinician) {
      return res.status(401).json({
        success: false,
        message: 'Clinician authentication required.',
      });
    }
    const allowed = await loadPatientIfAccessible(checkIn.patientId, clinician);
    if (!allowed) {
      return accessDenied(res);
    }

    return res.status(200).json({
      success: true,
      data: checkIn,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  reviewCheckIn,
  getCheckInById,
};
