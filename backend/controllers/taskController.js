const { Op } = require('sequelize');
const Task = require('../models/Task');
const TaskActivityLog = require('../models/TaskActivityLog');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { createNotification } = require('../utils/notifyHelper');

/**
 * Automatically update overdue tasks
 */
const checkAndUpdateOverdueTasks = async (workspaceId, io) => {
  try {
    const overdueTasks = await Task.findAll({
      where: {
        workspaceId,
        dueDate: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.notIn]: ['Completed', 'Overdue']
        }
      }
    });

    for (const task of overdueTasks) {
      const oldStatus = task.status;
      task.status = 'Overdue';
      await task.save();

      // Log activity
      await TaskActivityLog.create({
        taskId: task._id,
        userId: task.assignedById,
        action: 'OVERDUE',
        details: `Task status auto-transitioned from ${oldStatus} to Overdue (due date: ${task.dueDate})`
      });

      // Send notification to assignee
      if (task.assignedTo) {
        await createNotification(io, {
          recipientId: task.assignedTo,
          senderId: task.assignedById,
          type: 'task_overdue',
          content: `Task is overdue: "${task.title}" (Due: ${new Date(task.dueDate).toLocaleDateString()})`,
          payload: {
            workspaceId: task.workspaceId,
            taskId: task._id
          }
        });
      }
    }
  } catch (error) {
    console.error('[OVERDUE_AUTO_UPDATE_ERR]', error);
  }
};

/**
 * @desc    Create a task
 * @route   POST /api/tasks/create
 * @access  Private (Admin Only)
 */
const createTask = async (req, res) => {
  try {
    const { title, description, priority, workspaceId, assignedTo, dueDate, clientId } = req.body;
    const io = req.app.get('socketio');

    if (!title || !workspaceId) {
      return res.status(400).json({ message: 'Title and Workspace ID are required' });
    }

    // Verify workspace existence and permission
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (assignedTo) {
      const assignee = await User.findByPk(assignedTo);
      if (!assignee) return res.status(404).json({ message: 'Assignee not found' });
      const r = assignee.role;
      if (r === 'Client' || r === 'client') {
        return res.status(403).json({ message: 'Tasks cannot be assigned to Clients.' });
      }
      if (['admin', 'Admin'].includes(req.user.role) && ['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(r)) {
        return res.status(403).json({ message: 'Admins can only assign tasks to Employees or Interns.' });
      }
    }

    const task = await Task.create({
      workspaceId,
      assignedTo: assignedTo || null,
      assignedById: req.user._id,
      clientId: clientId || null,
      title,
      description,
      priority: priority || 'Medium',
      status: 'Pending',
      dueDate: dueDate ? new Date(dueDate) : null
    });

    // Auto-add assignee to the workspace so they can access it and see the task
    if (assignedTo) {
      const isAlreadyMember = await workspace.hasMember(assignedTo);
      if (!isAlreadyMember) {
        await workspace.addMember(assignedTo);
        const Channel = require('../models/Channel');
        const channel = await Channel.findOne({ where: { workspaceId: workspace._id, name: 'general' } });
        if (channel) {
          await channel.addMember(assignedTo);
        }
      }
    }

    // Create activity log
    await TaskActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: 'CREATED',
      details: `Task "${title}" created by ${req.user.name}`
    });

    // Send notifications if assigned to someone
    if (assignedTo) {
      await createNotification(io, {
        recipientId: assignedTo,
        senderId: req.user._id,
        type: 'task_assigned',
        content: `New task assigned: "${title}" by ${req.user.name}`,
        payload: {
          workspaceId,
          taskId: task._id
        }
      });
    }

    // Broadcast WebSocket updates
    if (io) {
      io.to(workspaceId.toString()).emit('task_created', task);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('[CREATE_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error creating task', error: error.message });
  }
};

/**
 * @desc    Update a task
 * @route   PUT /api/tasks/update/:id
 * @access  Private (Admin Only)
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, assignedTo, dueDate, status, clientId } = req.body;
    const io = req.app.get('socketio');

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 24 Hour Lock Rule
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin') {
      const hoursSinceCreation = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ message: 'Task is locked: 24 hours have passed since creation. Only Super Admin can modify it.' });
      }
    }

    // Workspace boundary check
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
        return res.status(403).json({ message: 'Workspace mismatch: Access denied' });
      }
    }

    // Role-based permission check: Members can only update task status for tasks assigned to them.
    if (!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)) {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
      }
      if (title !== undefined || description !== undefined || priority !== undefined || assignedTo !== undefined || dueDate !== undefined) {
        return res.status(403).json({ message: 'Access denied: Members can only update task status' });
      }
      if (task.isEditedByMember) {
        return res.status(403).json({ message: 'Access denied: You can only edit the status of this task once' });
      }
      task.isEditedByMember = true;
    } else {
      // If admin updates the task, reset the one-time edit flag so the member can edit status once more if needed.
      task.isEditedByMember = false;
    }

    const originalAssignedTo = task.assignedTo;
    const originalStatus = task.status;

    // Update attributes
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (assignedTo !== undefined) {
      if (assignedTo && assignedTo !== task.assignedTo) {
        const assignee = await User.findByPk(assignedTo);
        if (assignee) {
          const r = assignee.role;
          if (r === 'Client' || r === 'client') {
            return res.status(403).json({ message: 'Tasks cannot be assigned to Clients.' });
          }
          if (['admin', 'Admin'].includes(req.user.role) && ['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(r)) {
            return res.status(403).json({ message: 'Admins can only assign tasks to Employees or Interns.' });
          }
          
          // Auto-add new assignee to the workspace
          const workspace = await Workspace.findByPk(task.workspaceId);
          if (workspace) {
            const isAlreadyMember = await workspace.hasMember(assignedTo);
            if (!isAlreadyMember) {
              await workspace.addMember(assignedTo);
              const Channel = require('../models/Channel');
              const channel = await Channel.findOne({ where: { workspaceId: workspace._id, name: 'general' } });
              if (channel) {
                await channel.addMember(assignedTo);
              }
            }
          }
        }
      }
      task.assignedTo = assignedTo || null;
    }
    if (clientId !== undefined) task.clientId = clientId || null;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) {
      task.status = status;
      if (status === 'Completed' && originalStatus !== 'Completed') {
        task.completedAt = new Date();
      } else if (status !== 'Completed') {
        task.completedAt = null;
      }
      if (status === 'In Progress' && originalStatus === 'Pending') {
        task.startedAt = new Date();
      }
    }

    await task.save();

    // Log update
    await TaskActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: 'UPDATED',
      details: `Task updated by ${req.user.name}`
    });

    // Notify assignee if status changed or new assignee set
    if (task.assignedTo) {
      const isNewAssignee = originalAssignedTo !== task.assignedTo;
      const isStatusChanged = originalStatus !== task.status;

      if (isNewAssignee) {
        await createNotification(io, {
          recipientId: task.assignedTo,
          senderId: req.user._id,
          type: 'task_assigned',
          content: `Task assigned to you: "${task.title}"`,
          payload: {
            workspaceId: task.workspaceId,
            taskId: task._id
          }
        });
      } else if (isStatusChanged || title !== undefined) {
        await createNotification(io, {
          recipientId: task.assignedTo,
          senderId: req.user._id,
          type: 'task_updated',
          content: `Task "${task.title}" has been updated`,
          payload: {
            workspaceId: task.workspaceId,
            taskId: task._id
          }
        });
      }
    }

    // Broadcast WebSocket updates
    if (io) {
      io.to(task.workspaceId.toString()).emit('task_updated', task);
    }

    res.json(task);
  } catch (error) {
    console.error('[UPDATE_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error updating task', error: error.message });
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/delete/:id
 * @access  Private (Admin Only)
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get('socketio');

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 24 Hour Lock Rule
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin') {
      const hoursSinceCreation = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ message: 'Task is locked: 24 hours have passed since creation. Only Super Admin can delete it.' });
      }
    }

    // Workspace boundary check
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
        return res.status(403).json({ message: 'Workspace mismatch: Access denied' });
      }
    }

    await TaskActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: 'DELETED',
      details: `Task "${task.title}" deleted by ${req.user.name}`
    });

    const workspaceId = task.workspaceId;
    await task.destroy();

    // Broadcast WebSocket updates
    if (io) {
      io.to(workspaceId.toString()).emit('task_deleted', { _id: id });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('[DELETE_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error deleting task', error: error.message });
  }
};

/**
 * @desc    Start a task
 * @route   POST /api/tasks/start/:id
 * @access  Private (Member & Admin)
 */
const startTask = async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get('socketio');

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 24 Hour Lock Rule
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin') {
      const hoursSinceCreation = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ message: 'Task is locked: 24 hours have passed since creation. Only Super Admin can modify it.' });
      }
    }

    // Workspace isolation check
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
        return res.status(403).json({ message: 'Access denied: Workspace boundary violation' });
      }
    }

    // Check ownership/assignee unless Admin
    if (!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role) && task.assignedTo !== req.user._id) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
    }

    task.status = 'In Progress';
    task.startedAt = new Date();
    await task.save();

    // Log activity
    await TaskActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: 'STARTED',
      details: `Task started by ${req.user.name}`
    });

    // Notify assignee (if started by admin) or creator/admin
    if (['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)) {
      if (task.assignedTo) {
        await createNotification(io, {
          recipientId: task.assignedTo,
          senderId: req.user._id,
          type: 'task_updated',
          content: `Admin started task: "${task.title}"`,
          payload: { workspaceId: task.workspaceId, taskId: task._id }
        });
      }
    }

    // Broadcast WebSocket updates
    if (io) {
      io.to(task.workspaceId.toString()).emit('task_updated', task);
    }

    res.json(task);
  } catch (error) {
    console.error('[START_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error starting task', error: error.message });
  }
};

/**
 * @desc    Complete a task
 * @route   POST /api/tasks/complete/:id
 * @access  Private (Member & Admin)
 */
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get('socketio');

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 24 Hour Lock Rule
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin') {
      const hoursSinceCreation = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return res.status(403).json({ message: 'Task is locked: 24 hours have passed since creation. Only Super Admin can modify it.' });
      }
    }

    // Workspace isolation check
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'super_admin' && req.user.role !== 'Admin' && req.user.role !== 'admin') {
      if (task.workspaceId.toString() !== req.user.workspaceId.toString()) {
        return res.status(403).json({ message: 'Access denied: Workspace boundary violation' });
      }
    }

    // Check ownership/assignee unless Admin
    if (!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role) && task.assignedTo !== req.user._id) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
    }

    task.status = 'Completed';
    task.completedAt = new Date();
    await task.save();

    // Log activity
    await TaskActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: 'COMPLETED',
      details: `Task completed by ${req.user.name}`
    });

    // Notify admin / creator when member completes task
    if (!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)) {
      await createNotification(io, {
        recipientId: task.assignedById,
        senderId: req.user._id,
        type: 'task_completed',
        content: `${req.user.name} completed task: "${task.title}"`,
        payload: {
          workspaceId: task.workspaceId,
          taskId: task._id
        }
      });
    }

    // Broadcast WebSocket updates
    if (io) {
      io.to(task.workspaceId.toString()).emit('task_updated', task);
    }

    res.json(task);
  } catch (error) {
    console.error('[COMPLETE_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error completing task', error: error.message });
  }
};

/**
 * @desc    Get member's assigned tasks
 * @route   GET /api/tasks/member
 * @access  Private
 */
const getMemberTasks = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is missing' });
    }

    const io = req.app.get('socketio');
    await checkAndUpdateOverdueTasks(workspaceId, io);

    const tasks = await Task.findAll({
      where: {
        workspaceId,
        assignedTo: req.user._id
      },
      include: [
        { model: User, as: 'assignee', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: User, as: 'creator', attributes: ['_id', 'name'] }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[GET_MEMBER_TASKS_ERR]', error);
    res.status(500).json({ message: 'Server error retrieving tasks', error: error.message });
  }
};

/**
 * @desc    Get workspace tasks (Admin View)
 * @route   GET /api/tasks/workspace
 * @access  Private
 */
const getWorkspaceTasks = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is missing' });
    }

    const io = req.app.get('socketio');
    await checkAndUpdateOverdueTasks(workspaceId, io);

    let whereClause = { workspaceId };
    if (req.user.role === 'admin') {
      const SaaSClient = require('../models/SaaSClient');
      const clients = await SaaSClient.findAll({ where: { assigned_admin_id: req.user._id, workspace_id: workspaceId } });
      const clientIds = clients.map(c => c.id);
      
      const Member = require('../models/Member');
      const assignedMembers = await Member.findAll({ where: { assigned_admin_id: req.user._id } });
      const memberUserIds = assignedMembers.map(m => m.userId);
      
      const orConditions = [
        { assignedById: req.user._id },
        { assignedTo: req.user._id }
      ];
      
      if (clientIds.length > 0) {
        orConditions.push({ clientId: { [Op.in]: clientIds } });
      }
      
      if (memberUserIds.length > 0) {
        orConditions.push({ assignedById: { [Op.in]: memberUserIds } });
        orConditions.push({ assignedTo: { [Op.in]: memberUserIds } });
      }
      
      whereClause[Op.or] = orConditions;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignee', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: User, as: 'creator', attributes: ['_id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[GET_WS_TASKS_ERR]', error);
    res.status(500).json({ message: 'Server error retrieving tasks', error: error.message });
  }
};

/**
 * @desc    Get all admin dashboard tasks
 * @route   GET /api/tasks/admin
 * @access  Private (Admin Only)
 */
const getAdminTasks = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is missing' });
    }

    const io = req.app.get('socketio');
    await checkAndUpdateOverdueTasks(workspaceId, io);

    let whereClause = {};

    if (['SuperAdmin', 'super_admin', 'admin', 'Admin'].includes(req.user.role)) {
      // Admins and SuperAdmins see tasks assigned to them, their clients, or their managed members
      
      const SaaSClient = require('../models/SaaSClient');
      const Member = require('../models/Member');
      
      let adminIdsToCheck = [req.user._id];
      if (['SuperAdmin', 'super_admin'].includes(req.user.role)) {
        const myCreatedAdmins = await Member.findAll({ where: { created_by: req.user._id }, attributes: ['userId'] });
        adminIdsToCheck = [req.user._id, ...myCreatedAdmins.map(m => m.userId)];
      }

      const clients = await SaaSClient.findAll({ where: { assigned_admin_id: { [Op.in]: adminIdsToCheck } } });
      const clientIds = clients.map(c => c.id);
      
      const assignedMembers = await Member.findAll({ where: { assigned_admin_id: { [Op.in]: adminIdsToCheck } } });
      const memberUserIds = assignedMembers.map(m => m.userId);
      
      const orConditions = [
        { assignedById: { [Op.in]: adminIdsToCheck } },
        { assignedTo: { [Op.in]: adminIdsToCheck } }
      ];
      
      if (clientIds.length > 0) {
        orConditions.push({ clientId: { [Op.in]: clientIds } });
      }
      
      if (memberUserIds.length > 0) {
        orConditions.push({ assignedById: { [Op.in]: memberUserIds } });
        orConditions.push({ assignedTo: { [Op.in]: memberUserIds } });
      }
      
      whereClause[Op.or] = orConditions;
    } else {
      whereClause.workspaceId = workspaceId;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignee', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: User, as: 'creator', attributes: ['_id', 'name'] },
        { model: TaskActivityLog, as: 'activityLogs', limit: 10, order: [['createdAt', 'DESC']], include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[GET_ADMIN_TASKS_ERR]', error);
    res.status(500).json({ message: 'Server error retrieving admin tasks', error: error.message });
  }
};

/**
 * @desc    Get filtered tasks (by Date range)
 * @route   GET /api/tasks/filter
 * @access  Private
 */
const getFilterTasks = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Active workspace ID is missing' });
    }

    const { range, fromDate, toDate } = req.query;
    const io = req.app.get('socketio');
    await checkAndUpdateOverdueTasks(workspaceId, io);

    let start = new Date();
    start.setHours(0, 0, 0, 0);
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    const where = {
      workspaceId
    };

    if (range === 'today') {
      where[Op.or] = [
        {
          status: { [Op.ne]: 'Completed' }
        },
        {
          status: 'Completed',
          completedAt: { [Op.between]: [start, end] }
        }
      ];
    } else if (range === '7days') {
      start.setDate(start.getDate() - 7);
      where.dueDate = { [Op.between]: [start, end] };
    } else if (range === '30days') {
      start.setDate(start.getDate() - 30);
      where.dueDate = { [Op.between]: [start, end] };
    } else if (range === 'custom') {
      if (fromDate) {
        start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
      }
      if (toDate) {
        end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
      }
      where.dueDate = { [Op.between]: [start, end] };
    }

    // For non-admin, filter by assignedTo
    if (!['Admin', 'admin', 'SuperAdmin', 'super_admin'].includes(req.user.role)) {
      where.assignedTo = req.user._id;
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['_id', 'name', 'profileImage', 'role'] },
        { model: User, as: 'creator', attributes: ['_id', 'name'] }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[FILTER_TASKS_ERR]', error);
    res.status(500).json({ message: 'Server error filtering tasks', error: error.message });
  }
};

// ==========================================
// PERSONAL TASKS MANAGEMENT
// ==========================================

const createPersonalTask = async (req, res) => {
  try {
    const { title, description, priority, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let workspaceId = req.user.activeWorkspace || req.user.workspaceId;
    if (!workspaceId) {
      const User = require('../models/User');
      const user = await User.findByPk(req.user._id);
      const workspaces = await user.getWorkspaces({ limit: 1 });
      if (workspaces && workspaces.length > 0) {
        workspaceId = workspaces[0]._id;
      } else {
        const Workspace = require('../models/Workspace');
        const anyWorkspace = await Workspace.findOne();
        if (anyWorkspace) {
          workspaceId = anyWorkspace._id;
        } else {
          return res.status(400).json({ message: 'No workspace exists in the system to attach personal task.' });
        }
      }
    }

    const task = await Task.create({
      workspaceId: workspaceId,
      assignedTo: req.user._id,
      assignedById: req.user._id,
      title,
      description: description || '',
      priority: priority || 'Medium',
      status: status || 'Pending',
      isPersonalTask: true
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('[CREATE_PERSONAL_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error creating personal task', error: error.message });
  }
};

const getPersonalTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        assignedTo: req.user._id,
        isPersonalTask: true
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(tasks);
  } catch (error) {
    console.error('[GET_PERSONAL_TASKS_ERR]', error);
    res.status(500).json({ message: 'Server error fetching personal tasks', error: error.message });
  }
};

const updatePersonalTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, startedAt, pausedAt, resumedAt, completedAt } = req.body;

    const task = await Task.findOne({ where: { _id: id, isPersonalTask: true } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check ownership (Super Admins can edit others' personal tasks in emergencies, but typically users edit their own)
    if (task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Not authorized to edit this personal task' });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    
    // Time tracking explicit updates
    if (startedAt !== undefined) task.startedAt = startedAt;
    if (pausedAt !== undefined) task.pausedAt = pausedAt;
    if (resumedAt !== undefined) task.resumedAt = resumedAt;
    if (completedAt !== undefined) task.completedAt = completedAt;

    if (status !== undefined) {
      const originalStatus = task.status;
      task.status = status;
      // Note: Only auto-set dates if they aren't provided explicitly in the request
      if (status === 'Completed' && originalStatus !== 'Completed' && completedAt === undefined) task.completedAt = new Date();
      else if (status !== 'Completed' && completedAt === undefined) task.completedAt = null;
      
      if (status === 'In Progress' && originalStatus === 'Pending' && startedAt === undefined) task.startedAt = new Date();
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error('[UPDATE_PERSONAL_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error updating personal task' });
  }
};

const deletePersonalTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ where: { _id: id, isPersonalTask: true } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.assignedTo.toString() !== req.user._id.toString() && req.user.role !== 'super_admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Not authorized to delete this personal task' });
    }

    await task.destroy();
    res.json({ message: 'Personal task deleted' });
  } catch (error) {
    console.error('[DELETE_PERSONAL_TASK_ERR]', error);
    res.status(500).json({ message: 'Server error deleting personal task' });
  }
};



module.exports = {
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
};
