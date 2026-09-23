import express from 'express';
import { upload } from '../middlewares/uploadMiddleware.js';
import { uploadPhoto } from '../controllers/uploadController.js';

const router = express.Router();

// Middleware to accept either 'photo' or 'image' field
const handleSingleImageUpload = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      return next(err);
    }
    // Normalize req.file from either 'photo' or 'image' field
    if (req.files) {
      if (req.files.photo && req.files.photo.length > 0) {
        req.file = req.files.photo[0];
      } else if (req.files.image && req.files.image.length > 0) {
        req.file = req.files.image[0];
      }
    }
    next();
  });
};

/**
 * @route   POST /api/upload
 * @desc    Upload wound image and get persistent file path
 * @access  Public / Protected
 */
router.post('/', handleSingleImageUpload, uploadPhoto);

export default router;
