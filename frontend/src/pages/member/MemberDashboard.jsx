import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { JoinWorkspaceCard } from '../../components/JoinWorkspaceCard';
import { workspaceService } from '../../services/workspaceService';
import { taskService } from '../../services/taskService';
import { 
  Briefcase, 
  Building2, 
  MessageSquare, 
  Megaphone, 
  Loader2, 
  Clock, 
  CheckSquare, 
  AlertCircle, 
  Zap, 
  Play, 
  CheckCircle,
  Calendar,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DatePicker } from '../../components/ui/DatePicker';

const MemberDashboard = () => {
  const { user, setActiveWorkspace, activeWorkspace } = useAuth();
  const navigate = useNavigate();

  // Workspaces & Loading
  const [workspaces, setWorkspaces] = useState([]);
  const [wsLoading, setWsLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);

  // Tasks & Filtering
  const [tasks, setTasks] = useState([]);
  const [filterRange, setFilterRange] = useState('today'); // 'today', '7days', '30days', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Fetch Workspaces
  const fetchWorkspaces = useCallback(async () => {
    setWsLoading(true);
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.data || []);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setWsLoading(false);
    }
  }, []);

  // Fetch Filtered Tasks (Backend query level)
  const fetchTasks = useCallback(async (range = filterRange, start = fromDate, end = toDate) => {
    if (!activeWorkspace) return;
    setTaskLoading(true);
    try {
      const res = await taskService.getFilterTasks(range, start, end);
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      toast.error('Failed to load tasks');
    } finally {
      setTaskLoading(false);
    }
  }, [activeWorkspace, filterRange, fromDate, toDate]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [activeWorkspace, fetchTasks]);

  const openWorkspace = (ws) => {
    setActiveWorkspace(ws._id, ws.name);
    toast.success(`Active workspace: ${ws.name}`);
    navigate('/channels', { state: { workspaceId: ws._id } });
  };

  // Task Actions
  const handleStartTask = async (id) => {
    try {
      await taskService.startTask(id);
      toast.success('Task started! Focus timer is active.');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to start task');
    }
  };

  const handleCompleteTask = async (id) => {
    try {
      await taskService.completeTask(id);
      toast.success('Task completed! Great job.');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to complete task');
    }
  };

  const handleSaveStatus = async () => {
    if (!editingTask) return;
    try {
      await taskService.updateTask(editingTask._id, { status: newStatus });
      toast.success('Task status updated successfully!');
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // Stats Calculations
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const overdueCount = tasks.filter(t => t.status === 'Overdue').length;
  const productivityPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Focus Time calculation
  const getFocusTime = () => {
    let ms = 0;
    tasks.forEach(t => {
      if (t.status === 'Completed' && t.startedAt && t.completedAt) {
        ms += new Date(t.completedAt) - new Date(t.startedAt);
      }
    });
    const minutes = Math.floor(ms / (1000 * 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const focusTimeStr = getFocusTime();

  // Filter Apply
  const handleApplyFilter = (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      return toast.error('Please specify both from and to dates');
    }
    fetchTasks('custom', fromDate, toDate);
  };

  // Tab switch wrapper
  const handleRangeChange = (range) => {
    setFilterRange(range);
    if (range !== 'custom') {
      fetchTasks(range, '', '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight mb-1">Good Morning, {user?.name}! 👋</h1>
          <p className="text-crm-textMuted">"Plan your work and work your plan."</p>
        </div>
      </div>

      {/* Top Cards Row: Join Workspace & Workspace List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Workspace Card */}
        <div className="lg:col-span-1">
          <JoinWorkspaceCard onJoined={fetchWorkspaces} />
        </div>

        {/* Your Workspaces list */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-crm-border flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-crm-text uppercase tracking-wider">Your Workspaces</h3>
            <button
              onClick={() => navigate('/member/workspaces')}
              className="text-xs text-crm-primary hover:underline flex items-center gap-1 font-semibold"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          {wsLoading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="animate-spin h-6 w-6 text-crm-primary" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-xs text-crm-textMuted italic py-4">You have not joined any workspaces yet.</p>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[120px] custom-scrollbar pr-1">
              {workspaces.slice(0, 3).map((ws) => {
                const isActive = activeWorkspace?.toString() === ws._id?.toString();
                return (
                  <div 
                    key={ws._id} 
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-crm-primary/10 border-crm-primary/30' 
                        : 'bg-crm-darker/40 border-crm-border hover:border-crm-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {ws.type === 'client' ? (
                        <Briefcase size={14} className="text-crm-primary" />
                      ) : (
                        <Building2 size={14} className="text-crm-accent" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-crm-text leading-none mb-1">{ws.name}</p>
                        <span className="text-[10px] text-crm-textMuted">{ws.members?.length || 0} Members</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openWorkspace(ws)}
                      className="px-3 py-1 rounded text-[10px] font-bold bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text transition-colors"
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Workspace warning if none selected */}
      {!activeWorkspace && (
        <div className="glass-panel p-6 text-center text-crm-textMuted border border-crm-border rounded-2xl">
          <Briefcase size={36} className="mx-auto mb-2 opacity-40 text-crm-primary" />
          <p className="text-sm font-medium">Please open a workspace to view your assigned tasks.</p>
        </div>
      )}

      {activeWorkspace && (
        <>
          {/* Stats Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-panel p-4 rounded-xl border border-crm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-crm-primary/15 flex items-center justify-center text-crm-primary">
                <CheckSquare size={20} />
              </div>
              <div>
                <p className="text-xs text-crm-textMuted">Total Tasks</p>
                <h4 className="text-xl font-bold text-crm-text mt-0.5">{totalCount}</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-crm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs text-crm-textMuted">Completed</p>
                <h4 className="text-xl font-bold text-crm-text mt-0.5">{completedCount}</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-crm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-crm-textMuted">Focus Time</p>
                <h4 className="text-xl font-bold text-crm-text mt-0.5">{focusTimeStr}</h4>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-crm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-xs text-crm-textMuted">Productivity</p>
                <h4 className="text-xl font-bold text-crm-text mt-0.5">{productivityPct}%</h4>
              </div>
            </div>
          </div>

          {/* Date Filter Bar */}
          <div className="glass-panel p-4 border border-crm-border rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-crm-darker p-0.5 rounded-lg border border-crm-border">
              {[
                { label: 'Today', key: 'today' },
                { label: 'Last 7 Days', key: '7days' },
                { label: 'Last 30 Days', key: '30days' },
                { label: 'Custom Date', key: 'custom' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleRangeChange(item.key)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    filterRange === item.key 
                      ? 'bg-crm-primary text-crm-primary-text shadow-glow' 
                      : 'text-crm-textMuted hover:text-crm-text'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {filterRange === 'custom' && (
              <form onSubmit={handleApplyFilter} className="flex items-center gap-2 flex-wrap w-full md:w-auto animate-fadeIn">
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="Start date"
                  className="min-w-[140px]"
                />
                <span className="text-crm-textMuted text-xs">to</span>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="End date"
                  className="min-w-[140px]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1 text-xs font-semibold rounded bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text transition-colors"
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          {/* Today's Tasks Section & Today's Schedule Timeline Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Tasks (List View) */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold text-crm-text">Tasks List</h3>
                <span className="text-xs text-crm-textMuted">{tasks.length} Tasks active</span>
              </div>
              {taskLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin h-8 w-8 text-crm-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-crm-textMuted border border-dashed border-crm-border rounded-xl">
                  <CheckSquare size={32} className="mx-auto mb-2 opacity-30 text-crm-primary" />
                  <p className="text-xs">No tasks found for the selected period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const statusColors = {
                      Pending: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
                      'In Progress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      Completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      Overdue: 'text-rose-400 bg-rose-500/10 border-rose-500/20 text-glow-rose font-bold'
                    };
                    const priorityColors = {
                      High: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                      Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      Low: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                    };
                    return (
                      <div 
                        key={task._id} 
                        className="p-4 rounded-xl border border-crm-border bg-crm-darker/20 hover:border-crm-border/60 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-crm-text text-sm">{task.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${statusColors[task.status]}`}>
                              {task.status}
                            </span>
                          </div>
                          {task.description && <p className="text-xs text-crm-textMuted">{task.description}</p>}
                          <div className="flex items-center gap-1.5 text-[10px] text-crm-textMuted pt-1">
                            <Calendar size={12} />
                            <span>Due Date: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Flexible'}</span>
                          </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap">
                          {task.status !== 'Completed' && task.status === 'Pending' && (
                            <button
                              onClick={() => handleStartTask(task._id)}
                              className="flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded bg-crm-primary hover:bg-crm-primary/85 text-crm-primary-text flex items-center justify-center gap-1.5 transition-colors shadow-glow"
                            >
                              <Play size={11} fill="white" /> Start
                            </button>
                          )}
                          {task.status !== 'Completed' && (task.status === 'Pending' || task.status === 'In Progress' || task.status === 'Overdue') && (
                            <button
                              onClick={() => handleCompleteTask(task._id)}
                              className="flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 transition-colors shadow-glow"
                            >
                              <CheckCircle size={11} /> Complete
                            </button>
                          )}
                          {!task.isEditedByMember && (
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setNewStatus(task.status);
                              }}
                              className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold rounded bg-crm-darker/60 border border-crm-border hover:bg-crm-border/30 hover:border-crm-primary/40 text-crm-text flex items-center justify-center gap-1 transition-colors"
                            >
                              Edit Status
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Schedule (Timeline View) */}
            <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
              <h3 className="text-base font-bold text-crm-text mb-1">Today's Schedule</h3>
              <div className="relative border-l border-crm-border/60 pl-4 ml-2 space-y-5 py-2">
                {tasks.length > 0 ? (
                  tasks.map((task) => {
                    const startStr = task.startedAt 
                      ? new Date(task.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '09:00 AM';
                    const endStr = task.completedAt
                      ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : task.dueDate 
                        ? new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Flexible';

                    const dotColors = {
                      Pending: 'bg-slate-400',
                      'In Progress': 'bg-blue-400 animate-pulse',
                      Completed: 'bg-emerald-500',
                      Overdue: 'bg-rose-500'
                    };

                    const textColors = {
                      Pending: 'text-slate-400',
                      'In Progress': 'text-blue-400',
                      Completed: 'text-emerald-400',
                      Overdue: 'text-rose-400 font-bold'
                    };

                    return (
                      <div key={task._id} className="relative text-xs">
                        <div className={`absolute left-[-20.5px] top-1.5 w-2 h-2 rounded-full ${dotColors[task.status]}`} />
                        <div className="space-y-1">
                          <p className="text-[10px] text-crm-textMuted">
                            {startStr} - {task.status === 'In Progress' ? 'Active' : endStr}
                          </p>
                          <p className="text-crm-text font-bold">{task.title}</p>
                          <span className={`text-[10px] font-semibold ${textColors[task.status]}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-crm-textMuted italic">No schedule today.</p>
                )}
              </div>
            </div>
          </div>

          {/* Today's Summary Section */}
          <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
            <h3 className="text-base font-bold text-crm-text mb-1">Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-3 bg-crm-darker/40 rounded-xl border border-crm-border">
                <span className="text-xs text-crm-textMuted block mb-0.5">Total Tasks</span>
                <span className="text-lg font-bold text-crm-text">{totalCount}</span>
              </div>
              <div className="p-3 bg-crm-darker/40 rounded-xl border border-crm-border">
                <span className="text-xs text-crm-textMuted block mb-0.5">Completed</span>
                <span className="text-lg font-bold text-emerald-400">{completedCount}</span>
              </div>
              <div className="p-3 bg-crm-darker/40 rounded-xl border border-crm-border">
                <span className="text-xs text-crm-textMuted block mb-0.5">Pending</span>
                <span className="text-lg font-bold text-amber-400">{pendingCount}</span>
              </div>
              <div className="p-3 bg-crm-darker/40 rounded-xl border border-crm-border">
                <span className="text-xs text-crm-textMuted block mb-0.5">Overdue Tasks</span>
                <span className="text-lg font-bold text-rose-400">{overdueCount}</span>
              </div>
              <div className="p-3 bg-crm-darker/40 rounded-xl border border-crm-border col-span-2 md:col-span-1">
                <span className="text-xs text-crm-textMuted block mb-0.5">Productivity</span>
                <span className="text-lg font-bold text-crm-primary">{productivityPct}%</span>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Edit Status Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="dark-modal bg-[#0B0F19] w-full max-w-sm border border-crm-primary/40 shadow-glow p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-crm-text mb-2">Edit Task Status</h3>
            <p className="text-xs text-crm-textMuted mb-4">
              Update the status for task: <span className="text-crm-text font-semibold">"{editingTask.title}"</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider block mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-[#0B0F19] text-crm-text text-sm border-2 border-crm-primary/60 focus:border-crm-primary focus:ring-0 rounded-xl px-4 py-3 appearance-none cursor-pointer focus:outline-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1.25rem',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    <option value="Pending" className="bg-[#0B0F19]">Pending</option>
                    <option value="In Progress" className="bg-[#0B0F19]">In Progress</option>
                    <option value="Completed" className="bg-[#0B0F19]">Completed</option>
                    <option value="Overdue" className="bg-[#0B0F19]">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-crm-border bg-transparent text-sm text-crm-text hover:bg-crm-border/30 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-crm-primary hover:bg-crm-primary/85 text-sm text-crm-primary-text font-bold transition-colors shadow-glow"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
