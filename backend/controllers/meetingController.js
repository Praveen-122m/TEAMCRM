const Meeting = require('../models/Meeting');

// @desc    Create a new meeting room
// @route   POST /api/meetings
// @access  Private
const createMeeting = async (req, res) => {
  try {
    const { name, description, workspaceId, scheduledAt } = req.body;
    
    // Generate a 10-digit Zoom-style numeric ID
    const roomId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    const meeting = await Meeting.create({
      name,
      description,
      workspace: workspaceId,
      createdBy: req.user._id,
      roomId,
      scheduledAt: scheduledAt || new Date(),
      status: scheduledAt ? 'Scheduled' : 'Active'
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get active meetings for a workspace
// @route   GET /api/meetings/:workspaceId
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ 
      workspace: req.params.workspaceId,
      status: { $in: ['Active', 'Scheduled'] } 
    }).populate('createdBy', 'name profileImage').sort({ createdAt: -1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { createMeeting, getMeetings };
