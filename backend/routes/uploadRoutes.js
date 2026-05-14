const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const path = require('path');

router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    console.log('Upload Request Received:', req.file ? 'File found' : 'No file');
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File Details:', {
      name: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let format = 'other';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) format = 'image';
    if (['.mp4', '.mov', '.avi', '.wmv', '.webm'].includes(ext)) format = 'video';

    // Construct local URL - Use a relative URL for better flexibility
    const fileUrl = `http://localhost:5005/uploads/${req.file.filename}`;
    console.log('Generated File URL:', fileUrl);

    res.json({
      url: fileUrl,
      format: format,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('CRITICAL Upload Route Error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

module.exports = router;
