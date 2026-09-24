import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Folder where uploaded images will be stored
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

// Make sure the uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure how files are saved to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanName}-${uniqueId}${ext}`);
  },
});

// Accept only valid image files
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// Limit uploads to 10MB
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware that accepts 'photo', 'image', or 'file' form field
export const uploadSingleImage = (req, res, next) => {
  const handler = upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]);

  handler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files.photo?.[0] || req.files.image?.[0] || req.files.file?.[0];
    }
    next();
  });
};

export default upload;
