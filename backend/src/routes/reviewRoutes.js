import express from 'express';
import {
  submitReview,
  getReviewHistory,
} from '../controllers/reviewController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(optionalProtect);

router.post('/:checkInId', submitReview);
router.patch('/:checkInId', submitReview);
router.get('/:checkInId', getReviewHistory);

export default router;
