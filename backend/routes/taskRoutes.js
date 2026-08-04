const express = require('express');
const router = express.Router();
const {
  createTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  getMemberTasks,
  getWorkspaceTasks,
  getAdminTasks,
  getFilterTasks,
  createPersonalTask,
  getPersonalTasks,
  updatePersonalTask,
  deletePersonalTask
} = require('../controllers/taskController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/create', protect, isAdmin, createTask);
router.put('/update/:id', protect, updateTask);
router.delete('/delete/:id', protect, isAdmin, deleteTask);
router.get('/member', protect, getMemberTasks);
router.get('/workspace', protect, getWorkspaceTasks);
router.get('/admin', protect, isAdmin, getAdminTasks);
router.post('/start/:id', protect, startTask);
router.post('/complete/:id', protect, completeTask);
router.get('/filter', protect, getFilterTasks);

// Personal Tasks
router.post('/personal/create', protect, createPersonalTask);
router.get('/personal', protect, getPersonalTasks);
router.put('/personal/update/:id', protect, updatePersonalTask);
router.delete('/personal/delete/:id', protect, deletePersonalTask);

module.exports = router;
