const Announcement = require('../models/Announcement');
const Project = require('../models/Project');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const AnnouncementReply = require('../models/AnnouncementReply');
const { Op } = require('sequelize');

// Create new announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { project, title, message, priority, attachments } = req.body;
    let { workspace } = req.body;
    
    if (!workspace) {
      workspace = req.user.workspaces && req.user.workspaces[0];
    }
    
    if (!workspace) {
      return res.status(400).json({ message: 'Workspace ID is required to create an announcement.' });
    }

    const isBroadcasted = req.user.role?.toLowerCase() === 'admin';

    const announcement = await Announcement.create({
      workspaceId: workspace,
      projectId: project || null,
      senderId: req.user._id,
      senderRole: req.user.role || 'User',
      title,
      message,
      priority: priority || 'Medium',
      attachments: attachments || [],
      isBroadcasted
    });

    const populated = await Announcement.findByPk(announcement._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: Project, attributes: ['_id', 'name'] },
        { model: Workspace, attributes: ['_id', 'name'] }
      ]
    });

    // Format output
    const json = populated.toJSON();
    json.replies = []; // default empty replies

    // Broadcast to workspace (Socket)
    const io = req.app.get('socketio');
    if (io) {
      if (isBroadcasted) {
        io.to(workspace.toString()).emit('announcement_received', json);
      } else {
        io.to(`admin_${workspace.toString()}`).emit('announcement_received', json);
      }
    }

    res.status(201).json(json);
  } catch (error) {
    console.error('[CREATE_ANNOUNCEMENT_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Get announcements for workspace
exports.getAnnouncements = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
      return res.status(200).json([]);
    }

    const role = req.user.role?.toLowerCase();
    const query = { workspaceId };
    
    if (role === 'admin') {
      // Admins see everything
    } else if (role === 'client') {
      // Clients see their own posts + anything that is broadcasted
      query[Op.or] = [
        { senderId: req.user._id },
        { isBroadcasted: true }
      ];
    } else {
      // Members only see broadcasted announcements
      query.isBroadcasted = true;
    }

    const announcements = await Announcement.findAll({
      where: query,
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: Project, attributes: ['_id', 'name'] },
        { model: Workspace, attributes: ['_id', 'name'] },
        { model: User, as: 'broadcastedBy', attributes: ['_id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = announcements.map(ann => {
      const json = ann.toJSON();
      json.replies = []; // Frontend handles getting replies asynchronously or sets a fallback
      return json;
    });

    res.json(formatted);
  } catch (error) {
    console.error('[GET_ANNOUNCEMENTS_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Broadcast announcement to team (Admin Only)
exports.broadcastToTeam = async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Only admins can broadcast to team.' });
    }

    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    announcement.isBroadcasted = true;
    announcement.broadcastedById = req.user._id;
    await announcement.save();

    const populated = await Announcement.findByPk(announcement._id, {
      include: [
        { model: User, as: 'sender', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: Project, attributes: ['_id', 'name'] },
        { model: Workspace, attributes: ['_id', 'name'] },
        { model: User, as: 'broadcastedBy', attributes: ['_id', 'name'] }
      ]
    });

    const json = populated.toJSON();
    json.replies = [];

    // Broadcast via socket to everyone now
    const io = req.app.get('socketio');
    if (io) {
      io.to(announcement.workspaceId.toString()).emit('announcement_received', json);
    }

    res.json(json);
  } catch (error) {
    console.error('[BROADCAST_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Update announcement status/priority
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    
    await announcement.update(req.body);
    res.json(announcement);
  } catch (error) {
    console.error('[UPDATE_ANNOUNCEMENT_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Add reply to announcement
exports.addReply = async (req, res) => {
  try {
    const { message } = req.body;
    const announcement = await Announcement.findByPk(req.params.id);
    
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    await AnnouncementReply.create({
      announcementId: req.params.id,
      userId: req.user._id,
      message
    });
    
    const updated = await Announcement.findByPk(req.params.id, {
      include: [
        {
          model: AnnouncementReply,
          as: 'replies',
          include: [
            { model: User, as: 'user', attributes: ['_id', 'name', 'profileImage', 'role'] }
          ]
        }
      ]
    });

    const json = updated.toJSON();
    // Format replies to match Mongoose subdocuments format
    json.replies = (updated.replies || []).map(r => ({
      user: r.user,
      message: r.message,
      createdAt: r.createdAt
    }));

    res.json(json);
  } catch (error) {
    console.error('[ADD_REPLY_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Convert announcement to project task
exports.convertToTask = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    if (!announcement.projectId) return res.status(400).json({ message: 'No project linked to this announcement' });

    const project = await Project.findByPk(announcement.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Add to project pending work (Sequelize handles JSON array manipulation)
    const currentPending = project.pendingWork || [];
    const updatedPending = [...currentPending, `${announcement.title}: ${announcement.message}`];
    
    project.pendingWork = updatedPending;
    project.changed('pendingWork', true);
    await project.save();
    
    // Update announcement status
    announcement.status = 'In Progress';
    await announcement.save();

    res.json({ message: 'Converted to task successfully', project });
  } catch (error) {
    console.error('[CONVERT_TO_TASK_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark announcement as completed
exports.markAsCompleted = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    if (!announcement.projectId) return res.status(400).json({ message: 'No project linked to this announcement' });

    const project = await Project.findByPk(announcement.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const taskText = `${announcement.title}: ${announcement.message}`;
    
    // Remove from pending
    const currentPending = project.pendingWork || [];
    const updatedPending = currentPending.filter(t => t !== taskText);
    project.pendingWork = updatedPending;
    project.changed('pendingWork', true);
    
    // Add to completed
    const currentCompleted = project.completedWork || [];
    if (!currentCompleted.includes(taskText)) {
      const updatedCompleted = [...currentCompleted, taskText];
      project.completedWork = updatedCompleted;
      project.changed('completedWork', true);
    }

    await project.save(); // save works to persist JSON arrays

    // Reload to perform progress calculation
    const total = project.pendingWork.length + project.completedWork.length;
    project.progress = Math.round((project.completedWork.length / (total || 1)) * 100);
    await project.save();

    announcement.status = 'Closed';
    await announcement.save();

    res.json({ message: 'Marked as completed and project updated', project });
  } catch (error) {
    console.error('[MARK_COMPLETED_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    if (req.user.role?.toLowerCase() !== 'admin' && announcement.senderId !== req.user._id) {
      return res.status(403).json({ message: 'You are not authorized to delete this announcement.' });
    }

    await announcement.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE_ANNOUNCEMENT_ERR]', error);
    res.status(500).json({ message: error.message });
  }
};
