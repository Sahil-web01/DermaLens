import express from 'express';
import { uploadSingleImage } from '../middlewares/uploadMiddleware.js';
import {
  createCheckIn,
  getTimeline,
  createPatient,
  getPatients,
  getPatientById,
} from '../controllers/patientController.js';

const router = express.Router();

// Patient management - list and creation
router.post('/', createPatient);
router.get('/', getPatients);

// Check-in global / fallback endpoints (before :id)
router.post('/checkins', uploadSingleImage, createCheckIn);
router.post('/check-in', uploadSingleImage, createCheckIn);

// Timeline global / active patient endpoint (before :id)
router.get('/timeline', getTimeline);
router.get('/episodes/:id/timeline', getTimeline);

// Parameterized patient sub-routes
router.post('/:id/checkins', uploadSingleImage, createCheckIn);
router.get('/:id/timeline', getTimeline);
router.get('/:id', getPatientById);

export default router;
