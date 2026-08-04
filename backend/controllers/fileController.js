const File = require('../models/File');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

/**
 * Upload a file
 * POST /api/files/upload
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { clientId, category, description } = req.body;
    const workspaceId = req.user.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is required' });
    }

    // Determine category from extension if not provided
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileCategory = category || 'other';
    if (!category) {
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) fileCategory = 'image';
      else if (['.pdf'].includes(ext)) fileCategory = 'document';
      else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].includes(ext)) fileCategory = 'document';
      else if (['.zip', '.rar', '.7z'].includes(ext)) fileCategory = 'archive';
      else if (['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'].includes(ext)) fileCategory = 'audio';
      else if (['.mp4', '.mov', '.avi', '.wmv', '.webm', '.mkv', '.m4v'].includes(ext)) fileCategory = 'video';
    }

    const file = await File.create({
      name: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedById: req.user._id,
      clientId: clientId || null,
      workspaceId,
      category: fileCategory,
      description: description || ''
    });

    const { logSecurityEvent } = require('../utils/logger');
    await logSecurityEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'FILE_UPLOAD',
      workspaceId,
      details: { filename: req.file.filename, originalName: req.file.originalname, size: req.file.size },
      req
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(workspaceId.toString()).emit('file_uploaded', file);
    }

    res.status(201).json(file);
  } catch (error) {
    console.error('[UPLOAD_FILE_ERR]', error);
    res.status(500).json({ message: 'File upload failed: ' + error.message });
  }
};

const getFiles = async (req, res) => {
  try {
    const { clientId, category } = req.query;
    const workspaceId = req.user.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is required' });
    }

    const where = {};
    where.workspaceId = workspaceId;
    if (clientId) where.clientId = clientId;
    if (category) where.category = category;

    // For clients, only show their own files
    if (req.user.role === 'Client') {
      const Client = require('../models/Client');
      const clientProfile = await Client.findOne({ where: { userId: req.user._id } });
      if (clientProfile) {
        where.clientId = clientProfile._id;
      }
    }

    const files = await File.findAll({
      where,
      include: [{ model: User, as: 'uploadedBy', attributes: ['_id', 'name', 'profileImage'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(files);
  } catch (error) {
    console.error('[GET_FILES_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Delete a file
 * DELETE /api/files/:id
 */
const deleteFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const workspaceId = req.user.workspaceId;
    if (!workspaceId || file.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: File does not belong to your active workspace.' });
    }

    // Only uploader or admin can delete
    if (file.uploadedById.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const { logSecurityEvent } = require('../utils/logger');
    await logSecurityEvent({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'FILE_DELETE',
      workspaceId: file.workspaceId,
      details: { filename: file.name, originalName: file.originalName },
      req
    });

    await file.destroy();
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('[DELETE_FILE_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { uploadFile, getFiles, deleteFile };
