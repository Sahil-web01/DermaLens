import express from 'express';
import { getReviewQueue, getClinicianStats } from '../controllers/clinicianController.js';
import { reviewCheckIn, getCheckInById } from '../controllers/checkinController.js';
import { getPatients } from '../controllers/patientController.js';

const router = express.Router();

// Clinician review queue (both /queue and /review-queue for frontend compatibility)
router.get('/queue', getReviewQueue);
router.get('/review-queue', getReviewQueue);

// Aggregated triage statistics
router.get('/stats', getClinicianStats);

// Review check-in (supporting both POST and PATCH)
router.get('/checkins/:id', getCheckInById);
router.post('/checkins/:id/review', reviewCheckIn);
router.patch('/checkins/:id/review', reviewCheckIn);

// Patient list for clinicians
router.get('/patients', getPatients);

export default router;
