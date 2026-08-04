const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { Op } = require('sequelize');

// @desc    Create a new meeting room
// @route   POST /api/meetings
// @access  Private
const createMeeting = async (req, res) => {
  try {
    const { name, description, scheduledAt } = req.body;
    const workspaceId = req.user.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is required' });
    }
    
    // Generate a 10-digit Zoom-style numeric ID
    const roomId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    const meeting = await Meeting.create({
      name,
      description,
      workspaceId,
      createdById: req.user._id,
      roomId,
      scheduledAt: scheduledAt || new Date(),
      status: scheduledAt ? 'Scheduled' : 'Active'
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error('[CREATE_MEETING_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get active meetings for a workspace
// @route   GET /api/meetings/:workspaceId
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }

    if (req.params.workspaceId && req.params.workspaceId.toString() !== activeWorkspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: Workspace mismatch.' });
    }

    const meetings = await Meeting.findAll({ 
      where: {
        workspaceId: activeWorkspaceId,
        status: { [Op.in]: ['Active', 'Scheduled'] } 
      },
      include: [
        { model: User, as: 'createdBy', attributes: ['_id', 'name', 'profileImage'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(meetings);
  } catch (error) {
    console.error('[GET_MEETINGS_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    
    const workspaceId = req.user.workspaceId;
    if (!workspaceId || meeting.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: Meeting does not belong to your active workspace.' });
    }

    // Only creator or Admin can delete
    if (meeting.createdById !== req.user._id && req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await meeting.destroy();
    res.json({ message: 'Meeting deleted' });
  } catch (error) {
    console.error('[DELETE_MEETING_ERR]', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createMeeting, getMeetings, deleteMeeting };
