/**
 * Upload controller for handling file uploads
 */
export const uploadPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
      message: 'Please provide an image file under the "photo" field.',
    });
  }

  // Construct persistent relative path and absolute URL
  const filePath = `/uploads/${req.file.filename}`;
  const host = req.get('host');
  const protocol = req.protocol;
  const fullUrl = host ? `${protocol}://${host}${filePath}` : filePath;

  return res.status(201).json({
    success: true,
    message: 'Photo uploaded successfully',
    data: {
      filePath,
      url: fullUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
  });
};

export default {
  uploadPhoto,
};
