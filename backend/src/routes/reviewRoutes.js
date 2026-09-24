import express from 'express';
import {
  submitReview,
  getReviewHistory,
} from '../controllers/reviewController.js';

const router = express.Router();

router.post('/:checkInId', submitReview);
router.patch('/:checkInId', submitReview);
router.get('/:checkInId', getReviewHistory);

export default router;
