const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect, admin } = require('../middleware/authMiddleware');

// Get attendance for a user/workspace
router.get('/:workspaceId', protect, async (req, res) => {
  try {
    const query = req.user.role === 'Admin' 
      ? { workspace: req.params.workspaceId }
      : { workspace: req.params.workspaceId, user: req.user._id };
      
    const logs = await Attendance.find(query).populate('user', 'name email').sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Clock In
router.post('/clock-in', protect, async (req, res) => {
  try {
    const { workspaceId, workSummary } = req.body;
    
    // Check if already clocked in
    const activeLog = await Attendance.findOne({ user: req.user._id, workspace: workspaceId, clockOut: null });
    if (activeLog) {
      return res.status(400).json({ message: 'Already clocked in' });
    }

    const log = await Attendance.create({
      user: req.user._id,
      workspace: workspaceId,
      clockIn: new Date(),
      workSummary
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Submit Work Report (always creates a new task log)
router.post('/report', protect, async (req, res) => {
  try {
    const { workspaceId, workSummary } = req.body;
    
    const log = await Attendance.create({
      user: req.user._id,
      workspace: workspaceId,
      date: new Date(),
      workSummary,
      status: 'Present' // Mark as present since they are working on a task
    });
    
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Clock Out
router.put('/clock-out/:id', protect, async (req, res) => {
  try {
    const log = await Attendance.findByIdAndUpdate(
      req.params.id, 
      { clockOut: new Date() }, 
      { new: true }
    );
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
