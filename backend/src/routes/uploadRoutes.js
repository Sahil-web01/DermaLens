import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import { uploadPhoto } from '../controllers/uploadController.js';

const router = express.Router();

// Upload photo endpoint (field name: 'photo')
router.post('/', upload.single('photo'), uploadPhoto);

export default router;
