import express from 'express';
import { reviewCheckIn, getCheckInById } from '../controllers/checkinController.js';

const router = express.Router();

// PATCH /api/checkins/:id/review - Update reviewStatus and append notes
router.patch('/:id/review', reviewCheckIn);

// GET /api/checkins/:id - Fetch single check-in details
router.get('/:id', getCheckInById);

export default router;
