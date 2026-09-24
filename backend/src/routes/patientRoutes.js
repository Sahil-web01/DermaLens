import express from 'express';
import { uploadSingleImage } from '../middlewares/uploadMiddleware.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';
import {
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
} from '../controllers/patientController.js';

const router = express.Router();

router.use(optionalProtect);

// Clinicians directory for patient doctor selection
router.get('/clinicians', getCliniciansDirectory);
router.get('/clinicians/directory', getCliniciansDirectory);

// Patient management - list, creation, deletion
router.post('/', createPatient);
router.get('/', getPatients);

// Patient self-actions via email/token headers
router.post('/request-doctor', requestDoctor);
router.post('/patient-consent', respondPatientConsent);
router.post('/release-doctor', releaseDoctor);

// Check-in global / fallback endpoints (before :id)
router.post('/checkins', uploadSingleImage, createCheckIn);
router.post('/check-in', uploadSingleImage, createCheckIn);

// Timeline global / active patient endpoint (before :id)
router.get('/timeline', getTimeline);
router.get('/episodes/:id/timeline', getTimeline);

// Parameterized mutual consent and patient routes
router.post('/:id/claim', claimPatient);
router.post('/:id/cancel-offer', cancelClaimOffer);
router.post('/:id/patient-consent', respondPatientConsent);
router.post('/:id/request-doctor', requestDoctor);
router.post('/:id/doctor-consent', respondDoctorConsent);
router.post('/:id/release-doctor', releaseDoctor);

router.delete('/:id', deletePatient);
router.post('/:id/checkins', uploadSingleImage, createCheckIn);
router.get('/:id/timeline', getTimeline);
router.get('/:id', getPatientById);

export default router;
