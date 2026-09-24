// Handle single image upload and return the saved file path
export const uploadPhoto = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an image file',
    });
  }

  // Path accessible from the browser
  const filePath = `/uploads/${req.file.filename}`;

  return res.status(201).json({
    success: true,
    message: 'Photo uploaded successfully',
    data: {
      filePath,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    },
  });
};

export default { uploadPhoto };
