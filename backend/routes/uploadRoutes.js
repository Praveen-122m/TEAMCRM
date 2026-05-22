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
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) format = 'image';
    else if (['.mp4', '.mov', '.avi', '.wmv', '.webm', '.mkv', '.m4v'].includes(ext)) format = 'video';
    else if (['.pdf'].includes(ext)) format = 'document';
    else if (['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) format = 'document';
    else if (['.xls', '.xlsx', '.csv'].includes(ext)) format = 'spreadsheet';
    else if (['.ppt', '.pptx'].includes(ext)) format = 'document';
    else if (['.zip', '.rar', '.7z'].includes(ext)) format = 'archive';

    // Construct local URL - Use a relative URL for better flexibility
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('Generated File URL:', fileUrl);

    res.json({
      url: fileUrl,
      format: format,
      mimetype: req.file.mimetype,
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('CRITICAL Upload Route Error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

module.exports = router;
