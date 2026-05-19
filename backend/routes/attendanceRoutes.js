const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Get attendance for a user/workspace
router.get('/:workspaceId', protect, async (req, res) => {
  try {
    const where = { workspaceId: req.params.workspaceId };
    
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
router.post('/clock-in', protect, async (req, res) => {
  try {
    const { workspaceId, workSummary } = req.body;
    
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
router.post('/report', protect, async (req, res) => {
  try {
    const { workspaceId, workSummary } = req.body;
    
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
    
    log.clockOut = new Date();
    await log.save();
    
    res.json(log);
  } catch (error) {
    console.error('[CLOCK_OUT_ERR]', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
