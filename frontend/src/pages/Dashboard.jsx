import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { taskService } from '../services/taskService';
import { workspaceService } from '../services/workspaceService';
import { clientService } from '../services/clientService';
import { memberService } from '../services/memberService';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { DataTable } from '../components/DataTable';
import { DatePicker } from '../components/ui/DatePicker';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  Calendar, 
  User, 
  Building, 
  Briefcase, 
  PlusCircle, 
  UserPlus, 
  FileText, 
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  Users,
  UserSquare2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Sector 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';

const Dashboard = () => {
  const { user, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  // Data State
  const [tasks, setTasks] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin & SuperAdmin Specific Stats
  const [clientsCount, setClientsCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [internsCount, setInternsCount] = useState(0);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    workspaceId: activeWorkspace || '',
    assignedTo: '',
    dueDate: ''
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    workspaceId: '',
    assignedTo: '',
    dueDate: '',
    status: 'Pending'
  });

  // Table Tab State
  const [activeTab, setActiveTab] = useState('All');
  const [activePieIndex, setActivePieIndex] = useState(0);



  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await taskService.getAdminTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const [clientsRes, membersRes] = await Promise.all([
        clientService.getClients(),
        memberService.getMembers()
      ]);
      setClientsCount(clientsRes.data?.length || 0);
      const membersList = membersRes.data || [];
      setAdminsCount(membersList.filter(m => ['admin', 'Admin'].includes(m.role)).length);
      setEmployeesCount(membersList.filter(m => m.role === 'employee').length);
      setInternsCount(membersList.filter(m => m.role === 'intern').length);
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await workspaceService.getWorkspaces();
      const list = res.data || [];
      setWorkspaces(list);
      if (!createForm.workspaceId && list.length > 0) {
        setCreateForm(prev => ({ ...prev, workspaceId: activeWorkspace || list[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkspaceMembers = async (wsId) => {
    try {
      const res = await workspaceService.getMembers(wsId);
      setWorkspaceMembers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Data
  useEffect(() => {
    fetchWorkspaces();
    fetchTasks();
    if (['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(user?.role)) {
      fetchAdminStats();
    }
  }, [activeWorkspace, user?.role]);

  // Fetch members when workspace changes in Create task modal
  useEffect(() => {
    if (createForm.workspaceId) {
      fetchWorkspaceMembers(createForm.workspaceId);
    } else {
      setWorkspaceMembers([]);
    }
  }, [createForm.workspaceId]);

  // Fetch members when workspace changes in Edit task modal
  useEffect(() => {
    if (editForm.workspaceId) {
      fetchWorkspaceMembers(editForm.workspaceId);
    }
  }, [editForm.workspaceId]);

  // Actions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!createForm.title) return toast.error('Task Name is required');
    if (!createForm.workspaceId) return toast.error('Workspace selection is required');

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
        dueDate: ''
      });
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    if (!editForm.title) return toast.error('Task Name is required');

    try {
      await taskService.updateTask(selectedTask._id, editForm);
      toast.success('Task updated successfully');
      setIsEditOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
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
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      status: task.status || 'Pending'
    });
    setIsEditOpen(true);
  };

  // Metrics Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;

  const productivityPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Chart Data: Task Status Distribution (Pie Chart)
  const pieData = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'Pending', value: tasks.filter(t => t.status === 'Pending').length, color: '#f59e0b' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Overdue', value: overdueTasks, color: '#f43f5e' }
  ].filter(item => item.value > 0);

  // Fallback if no task data exists
  const displayPieData = pieData.length > 0 ? pieData : [
    { name: 'No Tasks', value: 1, color: '#475569' }
  ];

  // Chart Data: 7 Days Line Chart Performance
  const getLineChartData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      // count completed and total active on this date range
      const completed = tasks.filter(t => 
        t.status === 'Completed' && 
        new Date(t.completedAt || t.updatedAt) >= dayStart && 
        new Date(t.completedAt || t.updatedAt) <= dayEnd
      ).length;

      const total = tasks.filter(t => 
        new Date(t.createdAt) <= dayEnd
      ).length;

      const pending = tasks.filter(t => 
        t.status !== 'Completed' && 
        new Date(t.createdAt) <= dayEnd
      ).length;

      days.push({
        date: label,
        'Total Tasks': total,
        'Completed': completed,
        'Pending': pending
      });
    }
    return days;
  };

  const lineData = getLineChartData();

  // Extract Recent Activity from all task activity logs
  const activityFeed = tasks.flatMap(task => 
    (task.activityLogs || []).map(log => ({
      ...log,
      taskTitle: task.title,
      taskId: task._id
    }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
   .slice(0, 5);

  // Filter Tasks for Bottom Table
  const tableData = tasks.filter(t => {
    if (activeTab === 'All') return true;
    return t.status === activeTab;
  }).slice(0, 7); // display top 7 recent in dashboard

  const columns = [
    {
      header: 'Task Name',
      accessor: 'title',
      cell: (row) => (
        <div>
          <p className="font-bold text-crm-text max-w-[140px] truncate">{row.title}</p>
          <span className="text-[10px] text-crm-textMuted capitalize">
            {workspaces.find(w => w._id === row.workspaceId)?.name || 'Office'}
          </span>
        </div>
      )
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
              <div className="w-5 h-5 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary text-[9px] font-bold">
                {row.assignee.name.charAt(0)}
              </div>
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
          High: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          Low: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[row.priority]}`}>
            {row.priority}
          </span>
        );
      }
    },
    {
      header: 'Due Date',
      accessor: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No limit',
      cell: (row) => (
        <span className="text-xs text-crm-textMuted">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'No limit'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const styles = {
          Pending: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          'In Progress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          Completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          Overdue: 'text-rose-400 bg-rose-500/10 border-rose-500/20 text-glow-rose'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedTask(row);
              setIsDetailsOpen(true);
            }}
            className="p-1 rounded bg-crm-card border border-crm-border hover:text-crm-text transition-colors"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1 rounded bg-crm-card border border-crm-border hover:text-crm-text transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => handleDeleteTask(row._id)}
            className="p-1 rounded bg-crm-card border border-crm-border hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={12} />
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
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight mb-1">
            {['super_admin', 'SuperAdmin'].includes(user?.role) ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-crm-textMuted">Welcome back, {user?.name}. Here's what's happening today.</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className={['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(user?.role) ? "grid grid-cols-2 lg:grid-cols-6 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
        {['admin', 'Admin'].includes(user?.role) ? (
          <>
            <StatCard 
              title="My Clients" 
              value={clientsCount.toString()} 
              icon={Users} 
              color="primary"
            />
            <StatCard 
              title="My Employees" 
              value={employeesCount.toString()} 
              icon={Users} 
              color="blue"
            />
            <StatCard 
              title="My Interns" 
              value={internsCount.toString()} 
              icon={UserSquare2} 
              color="emerald"
            />
            <StatCard 
              title="My Tasks" 
              value={totalTasks.toString()} 
              icon={CheckSquare} 
              color="amber"
            />
            <StatCard 
              title="Pending Tasks" 
              value={pendingTasks.toString()} 
              icon={Clock} 
              color="amber"
            />
            <StatCard 
              title="Completed Tasks" 
              value={completedTasks.toString()} 
              icon={CheckCircle2} 
              color="emerald"
            />
          </>
        ) : ['super_admin', 'SuperAdmin'].includes(user?.role) ? (
          <>
            <StatCard 
              title="Total Clients" 
              value={clientsCount.toString()} 
              icon={Users} 
              color="primary"
            />
            <StatCard 
              title="Total Admins" 
              value={adminsCount.toString()} 
              icon={Users} 
              color="amber"
            />
            <StatCard 
              title="Total Employees" 
              value={employeesCount.toString()} 
              icon={Users} 
              color="blue"
            />
            <StatCard 
              title="Total Interns" 
              value={internsCount.toString()} 
              icon={UserSquare2} 
              color="emerald"
            />
            <StatCard 
              title="Total Tasks" 
              value={totalTasks.toString()} 
              icon={CheckSquare} 
              color="rose"
            />
            <StatCard 
              title="Completed Tasks" 
              value={completedTasks.toString()} 
              icon={CheckCircle2} 
              color="emerald"
            />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Tasks" 
              value={totalTasks.toString()} 
              icon={CheckSquare} 
              color="primary"
            />
            <StatCard 
              title="Completed Tasks" 
              value={completedTasks.toString()} 
              icon={CheckCircle2} 
              color="emerald"
            />
            <StatCard 
              title="Pending Tasks" 
              value={pendingTasks.toString()} 
              icon={Clock} 
              color="amber"
            />
            <StatCard 
              title="Overdue Tasks" 
              value={overdueTasks.toString()} 
              icon={AlertCircle} 
              color="rose"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Overview (Line Chart) */}
        <div className="glass-panel p-5 rounded-2xl border border-crm-border lg:col-span-2 flex flex-col justify-between h-96">
          <div>
            <h3 className="text-base font-bold text-crm-text">Task Overview</h3>
            <p className="text-xs text-crm-textMuted mb-4">Last 7 days performance</p>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem' }} 
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="Total Tasks" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Distribution (Donut Chart) */}
        <div className="glass-panel p-5 rounded-2xl border border-crm-border flex flex-col h-96 justify-between">
          <div>
            <h3 className="text-base font-bold text-crm-text">Task Status Distribution</h3>
            <p className="text-xs text-crm-textMuted mb-2">Overall task status</p>
          </div>
          <div className="w-full h-48 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  shape={(props) => {
                    const { index, outerRadius = 0, ...rest } = props;
                    return index === activePieIndex ? (
                      <Sector {...rest} outerRadius={outerRadius + 10} />
                    ) : (
                      <Sector {...rest} outerRadius={outerRadius} />
                    );
                  }}
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-crm-text">{totalTasks}</span>
              <span className="text-[10px] text-crm-textMuted uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-crm-border">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-crm-textMuted truncate">{item.name}</span>
                <span className="text-crm-text font-bold ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Bottom Section: Table vs Right Column Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Section: Recent Tasks Table */}
        <div className="xl:col-span-2">
          <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-base font-bold text-crm-text">Recent Tasks</h3>
              <div className="flex bg-crm-darker p-0.5 rounded-lg border border-crm-border">
                {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === tab 
                        ? 'bg-crm-primary text-crm-primary-text shadow-glow' 
                        : 'text-crm-textMuted hover:text-crm-text'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <DataTable
              columns={columns}
              data={tableData}
              searchable={false}
              onRowClick={(row) => {
                setSelectedTask(row);
                setIsDetailsOpen(true);
              }}
            />
          </div>
        </div>

        {/* Right Section: Tasks Summary, Recent Activity, Quick Actions */}
        <div className="space-y-6">
          {/* Tasks Summary */}
          <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
            <h3 className="text-base font-bold text-crm-text">Tasks Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-crm-border">
                <span className="text-crm-textMuted">Today's Tasks</span>
                <span className="font-semibold text-crm-text">
                  {tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-crm-border">
                <span className="text-crm-textMuted">This Week Tasks</span>
                <span className="font-semibold text-crm-text">
                  {tasks.filter(t => {
                    if (!t.dueDate) return false;
                    const diff = (new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 7;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-crm-border">
                <span className="text-crm-textMuted">This Month Tasks</span>
                <span className="font-semibold text-crm-text">
                  {tasks.filter(t => {
                    if (!t.dueDate) return false;
                    return new Date(t.dueDate).getMonth() === new Date().getMonth();
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-rose-400 pb-2 border-b border-crm-border font-semibold">
                <span>Overdue Tasks</span>
                <span>{overdueTasks}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/tasks')}
              className="w-full py-2.5 rounded-lg border border-crm-border text-xs text-crm-textMuted hover:text-crm-text flex items-center justify-center gap-2 hover:bg-crm-border/20 transition-all font-semibold"
            >
              View All Tasks <ArrowRight size={13} />
            </button>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-crm-text">Recent Activity</h3>
              <button 
                onClick={() => navigate('/admin/tasks')}
                className="text-xs text-crm-primary hover:underline font-semibold"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {activityFeed.length > 0 ? (
                activityFeed.map((activity, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-crm-primary/10 flex items-center justify-center text-crm-primary shrink-0">
                      <TrendingUp size={13} />
                    </div>
                    <div>
                      <p className="text-crm-text font-medium">
                        {activity.user?.name || 'System'}{' '}
                        <span className="text-crm-textMuted font-normal">
                          {activity.action === 'COMPLETED' ? 'completed task' :
                           activity.action === 'STARTED' ? 'started task' :
                           activity.action === 'CREATED' ? 'created task' : 'updated task'}{' '}
                          "{activity.taskTitle}"
                        </span>
                      </p>
                      <span className="text-[10px] text-crm-textMuted opacity-60">
                        {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-crm-textMuted italic">No recent activity.</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel p-5 rounded-2xl border border-crm-border space-y-4">
            <h3 className="text-base font-bold text-crm-text">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="p-3.5 rounded-xl border border-crm-border bg-crm-darker/40 hover:bg-crm-primary/10 hover:border-crm-primary/40 flex flex-col items-center justify-center text-center gap-1.5 transition-all group"
              >
                <PlusCircle size={18} className="text-crm-primary group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-crm-text">Create Task</span>
              </button>
              <button
                onClick={() => navigate('/admin/members')}
                className="p-3.5 rounded-xl border border-crm-border bg-crm-darker/40 hover:bg-crm-primary/10 hover:border-crm-primary/40 flex flex-col items-center justify-center text-center gap-1.5 transition-all group"
              >
                <UserPlus size={18} className="text-crm-accent group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-crm-text">Add Member</span>
              </button>
              <button
                onClick={() => navigate('/admin/office-workspaces')}
                className="p-3.5 rounded-xl border border-crm-border bg-crm-darker/40 hover:bg-crm-primary/10 hover:border-crm-primary/40 flex flex-col items-center justify-center text-center gap-1.5 transition-all group"
              >
                <Building size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-crm-text">Create Workspace</span>
              </button>
              <button
                onClick={() => navigate('/admin/tasks')}
                className="p-3.5 rounded-xl border border-crm-border bg-crm-darker/40 hover:bg-crm-primary/10 hover:border-crm-primary/40 flex flex-col items-center justify-center text-center gap-1.5 transition-all group"
              >
                <FileText size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold text-crm-text">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task" maxWidth="max-w-lg">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Task Name *</label>
            <input
              type="text"
              placeholder="e.g. Call client leads"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              className="glass-input w-full text-sm py-2"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-crm-textMuted uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              placeholder="Context or task parameters..."
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
                {workspaceMembers.filter(m => !['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(m.role)).map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
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
                includeTime={false}
                placeholder="Select due date"
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
                  {workspaceMembers.filter(m => !['admin', 'Admin', 'super_admin', 'SuperAdmin'].includes(m.role)).map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
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
                  includeTime={false}
                  placeholder="Select due date"
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

      {/* Details / Activity Logs Modal */}
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

export default Dashboard;
