import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Users as UsersIcon, 
  Calendar,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const OfficeWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // State for Admin selection
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');

  const { user, refreshUser, setActiveWorkspace } = useAuth();
  
  const isEffectiveSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(
    user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : ''
  ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
  const navigate = useNavigate();

  const launchWorkspace = (ws) => {
    setActiveWorkspace(ws._id, ws.name);
    navigate(`/admin/office-workspaces/${ws._id}`);
  };

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workspaces?type=office');
      setWorkspaces(res.data);
    } catch (error) {
      console.error('Error fetching office workspaces:', error);
      toast.error('Failed to load office workspaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!isEffectiveSuperAdmin) return;
    try {
      // Use the new filtered endpoint
      const res = await api.get('/users/admins/my-created');
      setAdmins(res.data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchAdmins();
  }, [isEffectiveSuperAdmin]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const payload = { 
        name: name.trim(), 
        description: description.trim(), 
        type: 'office' 
      };
      
      if (selectedAdminId) {
        payload.assignedAdmin = selectedAdminId;
      }
      
      const res = await api.post('/workspaces', payload);
      toast.success('Office workspace created successfully!');
      setName('');
      setDescription('');
      setSelectedAdminId('');
      setCreateOpen(false);
      await refreshUser(); // Sync admin status instantly
      fetchWorkspaces();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-crm-text tracking-tight flex items-center gap-3">
            <Building className="text-crm-primary" size={32} />
            Office Workspaces
          </h1>
          <p className="text-crm-textMuted mt-1">
            Create and manage internal hubs for collaboration with team members.
          </p>
        </div>
        {isEffectiveSuperAdmin && (
          <button 
            onClick={() => setCreateOpen(true)}
            className="glass-button flex items-center gap-2"
          >
            <Plus size={18} />
            Create Office
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
            <Building size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Total Hubs</p>
            <p className="text-2xl font-bold text-crm-text">{workspaces.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
            <UsersIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Internal Members</p>
            <p className="text-2xl font-bold text-crm-text">
              {workspaces.reduce((acc, curr) => acc + (curr.members?.length || 1), 0)}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Active Channels</p>
            <p className="text-2xl font-bold text-crm-text">
              {workspaces.length * 2 || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace List Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-crm-primary"></div>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto bg-crm-primary/10 rounded-full flex items-center justify-center text-crm-primary">
            <Building size={32} />
          </div>
          <h3 className="text-xl font-bold text-crm-text">No office workspaces yet</h3>
          <p className="text-crm-textMuted">
            Get started by creating your first internal office workspace to collaborate with your team.
          </p>
          {isEffectiveSuperAdmin && (
            <button 
              onClick={() => setCreateOpen(true)}
              className="glass-button inline-flex items-center gap-2 mx-auto"
            >
              <Plus size={18} /> Create Workspace
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div key={ws._id} className="glass-card p-6 flex flex-col justify-between hover:border-crm-primary/50 transition-all group duration-300">
              <div className="space-y-4">
                {/* Card Top */}
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold text-xl uppercase shadow-md group-hover:scale-105 transition-transform">
                    {ws.name.substring(0, 2)}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveWorkspace(ws._id, ws.name);
                      navigate(`/admin/office-workspaces/${ws._id}`);
                    }}
                    className="p-2 bg-crm-darker/50 hover:bg-crm-primary hover:text-crm-primary-text rounded-lg text-crm-textMuted transition-colors"
                    title="Launch Workspace"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                {/* Name & Desc */}
                <div>
                  <h3 className="text-lg font-bold text-crm-text group-hover:text-crm-primary transition-colors truncate">
                    {ws.name}
                  </h3>
                  <p className="text-sm text-crm-textMuted mt-1 line-clamp-2 min-h-[40px]">
                    {ws.description || 'No description provided.'}
                  </p>
                </div>

                {/* Invite Code Row */}
                <div className="p-3 bg-crm-darker/50 border border-crm-border rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-crm-textMuted uppercase tracking-wider font-semibold">
                      Invite Code
                    </p>
                    <p className="text-sm font-mono font-bold text-crm-text tracking-wider">
                      {ws.inviteCode || 'N/A'}
                    </p>
                  </div>
                  {ws.inviteCode && (
                    <button
                      onClick={() => copyToClipboard(ws.inviteCode, ws._id)}
                      className="p-1.5 hover:bg-crm-border rounded text-crm-textMuted hover:text-crm-text transition-colors"
                      title="Copy Invite Code"
                    >
                      {copiedId === ws._id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="mt-6 pt-4 border-t border-crm-border/50 flex items-center justify-between text-xs text-crm-textMuted">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(ws.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => launchWorkspace(ws)}
                  className="text-crm-primary group-hover:text-crm-text font-medium flex items-center gap-1 transition-colors"
                >
                  Launch Workspace
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal Dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all duration-300">
          <div className="glass-panel w-full max-w-md p-6 space-y-6 border border-crm-border relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-crm-textMuted hover:text-crm-text transition-colors"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-crm-text">Create Office Workspace</h2>
              <p className="text-sm text-crm-textMuted mt-1">
                Internal workspaces let you and your office team chat, share documents, and track actions.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Team, Marketing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-crm-darker/60 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-crm-text rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-crm-textMuted transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="What is this workspace for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-crm-darker/60 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-crm-text rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-crm-textMuted transition-all resize-none"
                />
              </div>

              {isEffectiveSuperAdmin && admins.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
                    Assign Admin (Optional)
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full bg-crm-darker/60 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-crm-text rounded-xl px-4 py-3 text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="">-- Select an Admin --</option>
                    {admins.map(admin => (
                      <option key={admin._id} value={admin._id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-crm-textMuted hover:text-crm-text hover:bg-crm-border/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-5 py-2 bg-crm-primary hover:bg-crm-primaryHover text-crm-primary-text rounded-lg text-sm font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeWorkspaces;
