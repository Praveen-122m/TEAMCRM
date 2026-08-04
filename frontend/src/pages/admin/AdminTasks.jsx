import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';
import { workspaceService } from '../../services/workspaceService';
import { memberService } from '../../services/memberService';
import { clientService } from '../../services/clientService';
import { Modal } from '../../components/Modal';
import { DataTable } from '../../components/DataTable';
import { DatePicker } from '../../components/ui/DatePicker';
import { Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, Play, Calendar, User, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const AdminTasks = () => {
  const { user, activeWorkspace } = useAuth();
  const { confirm } = useConfirm();
  
  // Data State
  const [tasks, setTasks] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterWorkspace, setFilterWorkspace] = useState('all');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    workspaceId: activeWorkspace || '',
    assignedTo: '',
    clientId: '',
    dueDate: ''
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    workspaceId: '',
    assignedTo: '',
    clientId: '',
    dueDate: '',
    status: 'Pending'
  });

  // Bulk Assignment States
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');

  useEffect(() => {
    fetchWorkspaces();
    fetchTasks();
    fetchClients();
    fetchAllMembers();
  }, [activeWorkspace]);

  const fetchAllMembers = async () => {
    try {
      const res = await memberService.getMembers();
      setAllMembers(res.data || []);
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await clientService.getClients();
      setClients(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Deprecated: used to fetch workspace members based on form.
  // Now using allMembers globally for easier assignment.

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskService.getAdminTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to load tasks', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await workspaceService.getWorkspaces();
      const list = res.data || [];
      setWorkspaces(list);
      
      // Auto-set first workspace in createForm if not set
      if (!createForm.workspaceId && list.length > 0) {
        setCreateForm(prev => ({ ...prev, workspaceId: list[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load workspaces', err);
    }
  };



  // Actions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.title) {
      return toast.error('Task Name is required');
    }
    if (!createForm.workspaceId) {
      return toast.error('Workspace selection is required');
    }
    
    try {
      await taskService.createTask(createForm);
      toast.success('Task created successfully');
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        priority: 'Medium',
        workspaceId: activeWorkspace || workspaces[0]?._id || '',
        assignedTo: '',
        clientId: '',
        dueDate: ''
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    if (!editForm.title) {
      return toast.error('Task Name is required');
    }
    
    try {
      await taskService.updateTask(selectedTask._id, editForm);
      toast.success('Task updated successfully');
      setIsEditOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (id) => {
    const confirmed = await confirm({
      title: 'Delete this task?',
      message: 'This action cannot be undone. All related data will be permanently removed.'
    });
    if (!confirmed) return;
    try {
      await taskService.deleteTask(id);
      toast.success('Task deleted successfully');
      fetchTasks();
      setSelectedTaskIds(prev => prev.filter(tid => tid !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete task');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedTaskIds.length === 0) {
      return toast.error('Select tasks to assign');
    }
    if (!bulkAssigneeId) {
      return toast.error('Select a member to assign tasks to');
    }

    try {
      const promises = selectedTaskIds.map(id => 
        taskService.updateTask(id, { assignedTo: bulkAssigneeId })
      );
      await Promise.all(promises);
      toast.success(`Successfully assigned ${selectedTaskIds.length} tasks`);
      setSelectedTaskIds([]);
      setBulkAssigneeId('');
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed in bulk assignment');
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      workspaceId: task.workspaceId,
      assignedTo: task.assignedTo || '',
      clientId: task.clientId || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status || 'Pending'
    });
    setIsEditOpen(true);
  };

  const openDetailsModal = (task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  // Selection handler
  const handleSelectRow = (id) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked, filteredList) => {
    if (checked) {
      const ids = filteredList.map(t => t._id);
      setSelectedTaskIds(ids);
    } else {
      setSelectedTaskIds([]);
    }
  };

  // Filtering Logic
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      // Workspace filter
      if (filterWorkspace !== 'all' && task.workspaceId !== filterWorkspace) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'All' && task.status !== filterStatus) {
        return false;
      }
      // Priority filter
      if (filterPriority !== 'All' && task.priority !== filterPriority) {
        return false;
      }
      return true;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Columns for DataTable
  const columns = [
    {
      id: 'select',
      header: (
        <input 
          type="checkbox"
          checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
          onChange={(e) => handleSelectAll(e.target.checked, filteredTasks)}
          className="rounded border-crm-border text-crm-primary bg-crm-darker focus:ring-crm-primary w-4 h-4 cursor-pointer"
        />
      ),
      sortable: false,
      cell: (row) => (
        <input 
          type="checkbox"
          checked={selectedTaskIds.includes(row._id)}
          onChange={() => handleSelectRow(row._id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-crm-border text-crm-primary bg-crm-darker focus:ring-crm-primary w-4 h-4 cursor-pointer"
        />
      )
    },
    {
      header: 'Task Name',
      accessor: 'title',
      searchable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-crm-text max-w-[200px] truncate">{row.title}</p>
          {row.description && <p className="text-xs text-crm-textMuted max-w-[200px] truncate">{row.description}</p>}
        </div>
      )
    },
    {
      header: 'Workspace',
      accessor: (row) => workspaces.find(w => w._id === row.workspaceId)?.name || 'Office',
      cell: (row) => {
        const wsName = workspaces.find(w => w._id === row.workspaceId)?.name || 'Office';
        return <span className="text-xs text-crm-textMuted font-medium">{wsName}</span>;
      }
    },
    {
      header: 'Assigned By',
      accessor: (row) => row.creator?.name || 'System',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.creator ? (
            <span className="text-xs text-crm-text">{row.creator.name}</span>
          ) : (
            <span className="text-xs text-crm-textMuted italic">System</span>
          )}
        </div>
      )
    },
    {
      header: 'Assigned To',
      accessor: (row) => row.assignee?.name || 'Unassigned',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.assignee ? (
            <>
              {row.assignee.profileImage ? (
                <img src={row.assignee.profileImage} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary text-[10px] font-bold">
                  {row.assignee.name.charAt(0)}
                </div>
              )}
              <span className="text-xs text-crm-text">{row.assignee.name}</span>
            </>
          ) : (
            <span className="text-xs text-crm-textMuted italic">Unassigned</span>
          )}
        </div>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => {
        const colors = {
          High: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          Low: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[row.priority] || colors.Medium}`}>
            {row.priority}
          </span>
        );
      }
    },
    {
      header: 'Due Date',
      accessor: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No limit',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-crm-textMuted">
          <Calendar size={13} />
          <span>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No limit'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const styles = {
          Pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          Overdue: 'bg-rose-500/10 text-rose-400 border-rose-500/20 text-glow-rose'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[row.status] || styles.Pending}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetailsModal(row)}
            className="p-1.5 rounded-lg border border-crm-border hover:bg-crm-border/30 text-crm-textMuted hover:text-crm-text transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg border border-crm-border hover:bg-crm-border/30 text-crm-textMuted hover:text-crm-text transition-colors"
            title="Edit Task"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDeleteTask(row._id)}
            className="p-1.5 rounded-lg border border-crm-border hover:bg-rose-500/20 text-crm-textMuted hover:text-rose-400 transition-colors"
            title="Delete Task"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  const calculateDuration = (task) => {
    if (!task.startedAt) return '-';
    const start = new Date(task.startedAt).getTime();
    const pause = task.pausedAt ? new Date(task.pausedAt).getTime() : null;
    const resume = task.resumedAt ? new Date(task.resumedAt).getTime() : null;
    const stop = task.completedAt ? new Date(task.completedAt).getTime() : new Date().getTime();
    
    let total = stop - start;
    if (pause) {
      if (resume) total -= (resume - pause);
      else total = pause - start;
    }
    if (total < 0) return '0m';
    const hours = Math.floor(total / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight mb-1">Task Management</h1>
          <p className="text-crm-textMuted">Assign, update, and track projects/tasks within workspaces.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="glass-button py-2.5 px-4 text-sm font-semibold flex items-center gap-2 bg-crm-primary text-crm-primary-text hover:bg-crm-primary/80 shadow-glow"
        >
          <Plus size={16} /> Add New Task
        </button>
      </div>

      {/* Bulk assignment toolbar (if selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="glass-panel p-4 border border-crm-primary/30 bg-crm-primary/5 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-xl animate-fadeIn">
          <p className="text-sm font-medium text-crm-primary">
            Selected <span className="text-crm-text font-bold">{selectedTaskIds.length}</span> tasks for bulk action
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={bulkAssigneeId}
              onChange={(e) => setBulkAssigneeId(e.target.value)}
              className="glass-input text-xs py-1.5 px-2 bg-crm-darker cursor-pointer text-crm-text min-w-[180px]"
            >
              <option value="">Select Assignee...</option>
              {allMembers.filter(m => !['Client', 'client'].includes(m.role)).map(m => (
                <option key={m.userId || m._id} value={m.userId || m._id}>{m.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text transition-colors"
            >
              Assign Selected
            </button>
            <button
              onClick={() => setSelectedTaskIds([])}
              className="text-xs text-crm-textMuted hover:text-crm-text underline transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="glass-panel p-4 border border-crm-border flex flex-wrap items-center justify-between gap-4 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Workspace Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-crm-textMuted">Workspace:</span>
            <select
              value={filterWorkspace}
              onChange={(e) => {
                setFilterWorkspace(e.target.value);
                setSelectedTaskIds([]);
                // Load members for bulk assignment matching current filter
                if (e.target.value !== 'all') {
                  fetchWorkspaceMembers(e.target.value);
                }
              }}
              className="glass-input text-xs py-1 px-2.5 bg-crm-darker border border-crm-border text-crm-text cursor-pointer"
            >
              <option value="all">All Workspaces</option>
              {workspaces.map(w => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-crm-textMuted">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="glass-input text-xs py-1 px-2.5 bg-crm-darker border border-crm-border text-crm-text cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex bg-crm-darker/60 p-0.5 rounded-lg border border-crm-border">
          {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setSelectedTaskIds([]);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterStatus === status 
                  ? 'bg-crm-primary text-crm-primary-text shadow-glow' 
                  : 'text-crm-textMuted hover:text-crm-text'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="min-h-[600px]">
        <DataTable
          columns={columns}
          data={filteredTasks}
          searchable={true}
          itemsPerPage={30}
          searchPlaceholder="Search task name/description..."
          onRowClick={openDetailsModal}
        />
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task" maxWidth="max-w-lg">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Task Name *</label>
            <input
              type="text"
              placeholder="e.g. Write lead reports"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              className="glass-input w-full text-sm py-2"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              placeholder="Provide context or instructions..."
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              className="glass-input w-full text-sm py-2 min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Workspace *</label>
              <select
                value={createForm.workspaceId}
                onChange={(e) => setCreateForm(prev => ({ ...prev, workspaceId: e.target.value, assignedTo: '' }))}
                className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                required
              >
                <option value="" disabled>Select workspace</option>
                {workspaces.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Assign To</label>
              <select
                value={createForm.assignedTo}
                onChange={(e) => setCreateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
              >
                <option value="">Unassigned</option>
                {allMembers.filter(m => {
                  const mRole = m.role ? m.role.toLowerCase().replace(/[\s_]+/g, '') : '';
                  const mRoleNameMatch = m.name ? m.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin') : false;
                  const isMSuperAdmin = mRole === 'superadmin' || mRoleNameMatch;
                  
                  const isEffectiveSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(
                    user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : ''
                  ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
                  
                  if (mRole === 'client') return false;
                  
                  // No one can assign to a Super Admin
                  if (isMSuperAdmin) return false;
                  
                  if (isEffectiveSuperAdmin) {
                    return true; // Super admins can assign to anyone else (Admins, Employees, etc)
                  }
                  
                  // Regular Admins cannot assign to other Admins
                  return mRole !== 'admin';
                }).map(m => (
                  <option key={m.userId || m._id} value={m.userId || m._id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Client</label>
              <select
                value={createForm.clientId}
                onChange={(e) => setCreateForm(prev => ({ ...prev, clientId: e.target.value }))}
                className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
              >
                <option value="">No Client Linked</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.companyName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
                className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Due Date</label>
              <DatePicker
                value={createForm.dueDate}
                onChange={(val) => setCreateForm(prev => ({ ...prev, dueDate: val }))}
                placeholder="Select due date"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-crm-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-lg border border-crm-border text-crm-textMuted hover:text-crm-text transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text font-semibold transition-colors text-sm"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task Details" maxWidth="max-w-lg">
        {selectedTask && (
          <form onSubmit={handleEditTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Task Name *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="glass-input w-full text-sm py-2"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="glass-input w-full text-sm py-2 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Workspace *</label>
                <select
                  value={editForm.workspaceId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, workspaceId: e.target.value, assignedTo: '' }))}
                  className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                  required
                  disabled
                >
                  {workspaces.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Assign To</label>
                <select
                  value={editForm.assignedTo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                >
                  <option value="">Unassigned</option>
                  {allMembers.filter(m => {
                    const mRole = m.role ? m.role.toLowerCase().replace(/[\s_]+/g, '') : '';
                    const mRoleNameMatch = m.name ? m.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin') : false;
                    const isMSuperAdmin = mRole === 'superadmin' || mRoleNameMatch;

                    const uRoleNameMatch = user?.name ? user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin') : false;
                    const uRole = user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : '';
                    const isEffectiveSuperAdmin = uRole === 'superadmin' || uRoleNameMatch;
                    
                    if (mRole === 'client') return false;
                    
                    // No one can assign to a Super Admin
                    if (isMSuperAdmin) return false;

                    if (isEffectiveSuperAdmin) {
                      return true; // Super admins can assign to anyone else
                    }
                    
                    // Regular Admins cannot assign to other Admins
                    return mRole !== 'admin';
                  }).map(m => (
                    <option key={m.userId || m._id} value={m.userId || m._id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Client</label>
                <select
                  value={editForm.clientId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, clientId: e.target.value }))}
                  className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                >
                  <option value="">No Client Linked</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name || c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Due Date</label>
                <DatePicker
                  value={editForm.dueDate}
                  onChange={(val) => setEditForm(prev => ({ ...prev, dueDate: val }))}
                  placeholder="Select due date"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="glass-input w-full text-sm bg-crm-darker cursor-pointer py-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-crm-border">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
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
        )}
      </Modal>

      {/* Task Details / Log Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Task Activity Logs" maxWidth="max-w-lg">
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-bold text-crm-text mb-1">{selectedTask.title}</h4>
              <p className="text-xs text-crm-textMuted">{selectedTask.description || 'No description provided.'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs border-y border-crm-border py-3">
              <div>
                <span className="text-crm-textMuted block mb-0.5">Status</span>
                <span className="font-semibold text-crm-text">{selectedTask.status}</span>
              </div>
              <div>
                <span className="text-crm-textMuted block mb-0.5">Priority</span>
                <span className="font-semibold text-crm-text">{selectedTask.priority}</span>
              </div>
              <div>
                <span className="text-crm-textMuted block mb-0.5">Assigned To</span>
                <span className="font-semibold text-crm-text">{selectedTask.assignee?.name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-crm-textMuted block mb-0.5">Due Date</span>
                <span className="font-semibold text-crm-text">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No Limit'}
                </span>
              </div>
            </div>

            {selectedTask.isPersonalTask && (selectedTask.startedAt || selectedTask.completedAt) && (
              <div className="bg-crm-darker/50 p-3 rounded-lg border border-crm-border mb-4 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-[11px] font-bold text-crm-text uppercase tracking-wider">Time Tracking Timeline</h5>
                  <span className="text-[10px] font-bold text-crm-primary bg-crm-primary/10 px-2 py-0.5 rounded">
                    Duration: {calculateDuration(selectedTask)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-crm-textMuted block text-[10px]">Start</span>
                    <span className="font-medium text-crm-text">{selectedTask.startedAt ? new Date(selectedTask.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-crm-textMuted block text-[10px]">Pause</span>
                    <span className="font-medium text-crm-text">{selectedTask.pausedAt ? new Date(selectedTask.pausedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-crm-textMuted block text-[10px]">Resume</span>
                    <span className="font-medium text-crm-text">{selectedTask.resumedAt ? new Date(selectedTask.resumedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-crm-textMuted block text-[10px]">Complete</span>
                    <span className="font-medium text-crm-text">{selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h5 className="text-xs font-bold text-crm-text uppercase tracking-wider mb-3">Logs & Transitions</h5>
              <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                {selectedTask.activityLogs && selectedTask.activityLogs.length > 0 ? (
                  selectedTask.activityLogs.map((log) => (
                    <div key={log._id} className="text-xs flex gap-2 border-l border-crm-border pl-3 pb-1 relative">
                      <div className="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full bg-crm-primary" />
                      <div className="flex-1">
                        <p className="text-crm-text font-medium">
                          {log.action} <span className="text-crm-textMuted font-normal text-[10px] ml-1.5">by {log.user?.name || 'System'}</span>
                        </p>
                        <p className="text-crm-textMuted text-[10px]">{log.details}</p>
                        <span className="text-[9px] text-crm-textMuted opacity-60 block mt-0.5">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-crm-textMuted italic">No activity logs recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminTasks;
