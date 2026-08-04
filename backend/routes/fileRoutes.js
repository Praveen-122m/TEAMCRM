const express = require('express');
const router = express.Router();
const { uploadFile, getFiles, deleteFile } = require('../controllers/fileController');
const { verifyToken, checkWorkspaceAccess } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', verifyToken, upload.single('file'), uploadFile);
router.get('/', verifyToken, checkWorkspaceAccess, getFiles);
router.delete('/:id', verifyToken, deleteFile);

module.exports = router;
