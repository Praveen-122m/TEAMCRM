import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { DatePicker } from '../components/ui/DatePicker';
import { PlusCircle, Edit2, Trash2, Calendar, Play, Pause, Square, Clock } from 'lucide-react';

const MyTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'Medium', 
    status: 'Pending',
    startedAt: '',
    pausedAt: '',
    resumedAt: '',
    completedAt: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/tasks/personal');
      setTasks(data);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to fetch personal tasks' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Format date for datetime-local input
  const formatForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    // Adjust for local timezone offset
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setCurrentTask({
        ...task,
        startedAt: formatForInput(task.startedAt),
        pausedAt: formatForInput(task.pausedAt),
        resumedAt: formatForInput(task.resumedAt),
        completedAt: formatForInput(task.completedAt)
      });
      setIsEditing(true);
    } else {
      setCurrentTask({ 
        title: '', 
        description: '', 
        priority: 'Medium', 
        status: 'Pending',
        startedAt: '',
        pausedAt: '',
        resumedAt: '',
        completedAt: ''
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!currentTask.title) {
        setMsg({ type: 'error', text: 'Title is required' });
        return;
      }

      // Convert empty strings back to null, and local times to UTC ISO
      const payload = { ...currentTask };
      if (!payload.startedAt) payload.startedAt = null; else payload.startedAt = new Date(payload.startedAt).toISOString();
      if (!payload.pausedAt) payload.pausedAt = null; else payload.pausedAt = new Date(payload.pausedAt).toISOString();
      if (!payload.resumedAt) payload.resumedAt = null; else payload.resumedAt = new Date(payload.resumedAt).toISOString();
      
      if (payload.status !== 'Completed') {
        payload.completedAt = null;
      } else {
        if (!payload.completedAt) payload.completedAt = new Date().toISOString(); 
        else payload.completedAt = new Date(payload.completedAt).toISOString();
      }
      
      if (isEditing) {
        await api.put(`/tasks/personal/update/${currentTask._id}`, payload);
        setMsg({ type: 'success', text: 'Task updated successfully' });
      } else {
        await api.post('/tasks/personal/create', payload);
        setMsg({ type: 'success', text: 'Task created successfully' });
      }
      handleCloseModal();
      fetchTasks();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save task' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/personal/delete/${id}`);
      setMsg({ type: 'success', text: 'Task deleted successfully' });
      fetchTasks();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete task' });
    }
  };

  const handleQuickAction = async (id, action) => {
    try {
      const payload = {};
      const now = new Date();
      
      if (action === 'start') {
        payload.status = 'In Progress';
        payload.startedAt = now;
        payload.completedAt = null;
      } else if (action === 'pause') {
        payload.status = 'In Progress';
        payload.pausedAt = now;
        payload.completedAt = null;
      } else if (action === 'resume') {
        payload.status = 'In Progress';
        payload.resumedAt = now;
        payload.completedAt = null;
      } else if (action === 'stop') {
        payload.status = 'Completed';
        payload.completedAt = now;
      }

      await api.put(`/tasks/personal/update/${id}`, payload);
      fetchTasks();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Action failed' });
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (task) => {
    if (!task.startedAt) return '-';
    
    const start = new Date(task.startedAt).getTime();
    const pause = task.pausedAt ? new Date(task.pausedAt).getTime() : null;
    const resume = task.resumedAt ? new Date(task.resumedAt).getTime() : null;
    const stop = task.completedAt ? new Date(task.completedAt).getTime() : new Date().getTime();
    
    let total = stop - start;
    if (pause) {
      if (resume) {
        total -= (resume - pause);
      } else {
        total = pause - start;
      }
    }
    
    if (total < 0) return '0m';
    
    const hours = Math.floor(total / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.role === 'super_admin';

  const columns = [
    {
      header: 'Task',
      accessor: 'title',
      cell: (row) => (
        <div>
          <p className="font-bold text-crm-text max-w-[150px] truncate">{row.title}</p>
          {row.description && (
            <p className="text-[10px] text-crm-textMuted truncate max-w-[150px]">{row.description}</p>
          )}
        </div>
      )
    },
    {
      header: 'Date Created',
      accessor: 'createdAt',
      cell: (row) => <span className="text-xs text-crm-text font-medium">{new Date(row.createdAt).toLocaleDateString()}</span>
    },
    ...(isSuperAdmin ? [
      {
        header: 'Status',
        accessor: 'status',
        cell: (row) => <span className="text-xs text-crm-text font-medium">{row.status}</span>
      }
    ] : [
      {
        header: 'Start',
        accessor: 'startedAt',
        cell: (row) => <span className="text-xs text-crm-text font-medium">{formatTime(row.startedAt)}</span>
      },
      {
        header: 'Pause',
        accessor: 'pausedAt',
        cell: (row) => <span className="text-xs text-crm-text font-medium">{formatTime(row.pausedAt)}</span>
      },
      {
        header: 'Resume',
        accessor: 'resumedAt',
        cell: (row) => <span className="text-xs text-crm-text font-medium">{formatTime(row.resumedAt)}</span>
      },
      {
        header: 'Complete',
        accessor: 'completedAt',
        cell: (row) => <span className="text-xs text-crm-text font-medium">{formatTime(row.completedAt)}</span>
      },
      {
        header: 'Duration',
        accessor: 'duration',
        cell: (row) => (
          <span className="text-xs font-bold text-crm-primary bg-crm-primary/10 px-2 py-1 rounded-md">
            {calculateDuration(row)}
          </span>
        )
      }
    ]),
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => {
        const colors = {
          High: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          Low: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[row.priority] || colors.Medium}`}>
            {row.priority}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => {
        const isStarted = !!row.startedAt;
        const isPaused = !!row.pausedAt;
        const isResumed = !!row.resumedAt;
        const isCompleted = row.status === 'Completed';

        return (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {!isSuperAdmin && !isStarted && !isCompleted && (
              <button onClick={() => handleQuickAction(row._id, 'start')} className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Start Task">
                <Play size={14} />
              </button>
            )}
            {!isSuperAdmin && isStarted && !isPaused && !isCompleted && (
              <button onClick={() => handleQuickAction(row._id, 'pause')} className="p-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors" title="Pause Task">
                <Pause size={14} />
              </button>
            )}
            {!isSuperAdmin && isPaused && !isResumed && !isCompleted && (
              <button onClick={() => handleQuickAction(row._id, 'resume')} className="p-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Resume Task">
                <Play size={14} />
              </button>
            )}
            {!isSuperAdmin && !isCompleted && (
              <button onClick={() => handleQuickAction(row._id, 'stop')} className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" title="Complete Task">
                <Square size={14} />
              </button>
            )}
            
            {!isSuperAdmin && <div className="w-px h-4 bg-crm-border mx-1"></div>}

            <button
              onClick={() => handleOpenModal(row)}
              className="p-1 rounded bg-crm-card border border-crm-border hover:text-crm-primary transition-colors"
              title="Edit Task"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => handleDelete(row._id)}
              className="p-1 rounded bg-crm-card border border-crm-border hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight mb-1">My Tasks</h1>
          <p className="text-crm-textMuted">Time tracking and personal reminders</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-crm-primary hover:bg-crm-primary/90 text-crm-primary-text px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-glow hover:-translate-y-0.5"
        >
          <PlusCircle size={18} />
          Create Task
        </button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border ${msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Main Content */}
      <div className="glass-panel p-5 rounded-2xl border border-crm-border min-h-[600px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-crm-primary/30 border-t-crm-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            searchable={true}
            searchPlaceholder="Search tasks..."
            itemsPerPage={20}
          />
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditing ? 'Edit Personal Task' : 'Create Personal Task'} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Task Title *</label>
                <input
                  type="text"
                  value={currentTask.title}
                  onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
                  className="glass-input w-full text-sm py-2"
                  placeholder="E.g., Review weekly reports"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={currentTask.description}
                  onChange={(e) => setCurrentTask({ ...currentTask, description: e.target.value })}
                  className="glass-input w-full text-sm py-2 min-h-[80px]"
                  placeholder="Task details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={currentTask.priority}
                    onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value })}
                    className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                {(isEditing || isSuperAdmin) && (
                  <div>
                    <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Status</label>
                    <select
                      value={currentTask.status}
                      onChange={(e) => setCurrentTask({ ...currentTask, status: e.target.value })}
                      className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {!isSuperAdmin && (
            <div className="space-y-4 bg-crm-darker/50 p-4 rounded-xl border border-crm-border">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-crm-text">
                <Clock size={16} className="text-crm-primary" />
                Time Tracking (Optional)
              </h3>
              
              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Pause Time</label>
                <DatePicker
                  value={currentTask.pausedAt}
                  onChange={(val) => setCurrentTask({ ...currentTask, pausedAt: val })}
                  includeTime={true}
                  placeholder="Select pause time"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Resume Time</label>
                <DatePicker
                  value={currentTask.resumedAt}
                  onChange={(val) => setCurrentTask({ ...currentTask, resumedAt: val })}
                  includeTime={true}
                  placeholder="Select resume time"
                  className="w-full"
                />
              </div>
            </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-crm-border">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg border border-crm-border text-crm-textMuted hover:text-crm-text transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text font-semibold transition-colors text-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyTasks;
