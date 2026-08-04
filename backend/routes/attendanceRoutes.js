const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, checkWorkspaceAccess } = require('../middleware/authMiddleware');

// Get attendance for a user/workspace
router.get('/:workspaceId', protect, checkWorkspaceAccess, async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId || req.params.workspaceId !== activeWorkspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: Workspace mismatch.' });
    }

    const where = { workspaceId: activeWorkspaceId };
    
    if (req.user.role !== 'Admin') {
      where.userId = req.user._id;
    }
      
    const logs = await Attendance.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['_id', 'name', 'email']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    res.json(logs);
  } catch (error) {
    console.error('[ATTENDANCE_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Clock In
router.post('/clock-in', protect, checkWorkspaceAccess, async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }
    const { workSummary } = req.body;
    const workspaceId = activeWorkspaceId;
    
    // Check if already clocked in
    const activeLog = await Attendance.findOne({
      where: {
        userId: req.user._id,
        workspaceId,
        clockOut: null
      }
    });
    
    if (activeLog) {
      return res.status(400).json({ message: 'Already clocked in' });
    }

    const log = await Attendance.create({
      userId: req.user._id,
      workspaceId,
      clockIn: new Date(),
      date: new Date(),
      workSummary
    });
    
    res.status(201).json(log);
  } catch (error) {
    console.error('[CLOCK_IN_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Submit Work Report (always creates a new task log)
router.post('/report', protect, checkWorkspaceAccess, async (req, res) => {
  try {
    const activeWorkspaceId = req.user.workspaceId;
    if (!activeWorkspaceId) {
      return res.status(400).json({ message: 'No active workspace selected' });
    }
    const { workSummary } = req.body;
    const workspaceId = activeWorkspaceId;
    
    const log = await Attendance.create({
      userId: req.user._id,
      workspaceId,
      date: new Date(),
      workSummary,
      status: 'Present' // Mark as present since they are working on a task
    });
    
    res.status(201).json(log);
  } catch (error) {
    console.error('[REPORT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Clock Out
router.put('/clock-out/:id', protect, async (req, res) => {
  try {
    const log = await Attendance.findByPk(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Attendance log not found' });
    }

    // Verify workspace access
    const workspaceId = req.user.workspaceId;
    if (!workspaceId || log.workspaceId.toString() !== workspaceId.toString()) {
      return res.status(403).json({ message: 'Access denied: Attendance log does not belong to your active workspace.' });
    }
    
    log.clockOut = new Date();
    await log.save();
    
    res.json(log);
  } catch (error) {
    console.error('[CLOCK_OUT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
