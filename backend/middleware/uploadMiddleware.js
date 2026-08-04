const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists using absolute path
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Strict blocklist for dangerous executable/script extensions
  const blocklist = ['.exe', '.js', '.php', '.sh', '.bat', '.cmd', '.msi', '.vbs', '.scr', '.html', '.htm'];
  if (blocklist.includes(ext)) {
    return cb(new Error('Security Block: Uploading executable or script files is prohibited.'));
  }

  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/octet-stream',
    // Audio (Voice notes)
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-ms-wmv'
  ];

  if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(zip|rar|7z|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|mp3|wav|m4a|webm|mp4|mov|avi|wmv|mkv|m4v)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported formats: images, videos, pdf, office docs, zip archives, and audio voice notes.'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  }
});

module.exports = upload;
