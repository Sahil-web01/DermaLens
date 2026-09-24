import CheckIn from '../models/CheckIn.js';
import { resolveActingClinician, loadPatientIfAccessible, accessDenied } from '../utils/clinicianPatientAccess.js';

/**
 * POST /api/reviews/:checkInId
 * Record clinician review on a check-in
 */
export const submitReview = async (req, res) => {
  try {
    const { checkInId } = req.params;
    const { reviewStatus, clinicianNotes, followUpAdvice } = req.body;

    const checkIn = await CheckIn.findById(checkInId).populate(
      'patientId',
      'name mrn surgeryType'
    );

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found.',
      });
    }

    const clinician = await resolveActingClinician(req);
    if (clinician) {
      const allowed = await loadPatientIfAccessible(checkIn.patientId, clinician);
      if (!allowed) {
        return accessDenied(res);
      }
    }

    if (reviewStatus) {
      checkIn.reviewStatus = reviewStatus;
    }

    const noteToAdd = clinicianNotes || followUpAdvice;
    if (noteToAdd && noteToAdd.trim()) {
      checkIn.clinicianNotes = checkIn.clinicianNotes
        ? `${checkIn.clinicianNotes} | Follow-up: ${noteToAdd.trim()}`
        : noteToAdd.trim();
    }

    await checkIn.save();

    return res.status(200).json({
      success: true,
      message: 'Review saved successfully.',
      data: checkIn,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit review.',
    });
  }
};

/**
 * GET /api/reviews/:checkInId
 * Fetch review information for a check-in
 */
export const getReviewHistory = async (req, res) => {
  try {
    const { checkInId } = req.params;
    const checkIn = await CheckIn.findById(checkInId).select(
      'reviewStatus clinicianNotes capturedAt mlOutput'
    );

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Check-in not found.',
      });
    }

    const clinician = await resolveActingClinician(req);
    if (clinician) {
      const full = await CheckIn.findById(checkInId).populate('patientId');
      const allowed = await loadPatientIfAccessible(full?.patientId, clinician);
      if (!allowed) {
        return accessDenied(res);
      }
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
  submitReview,
  getReviewHistory,
};
