import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
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

const ClientWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workspaces?type=client');
      setWorkspaces(res.data);
    } catch (error) {
      console.error('Error fetching client workspaces:', error);
      toast.error('Failed to load client workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/workspaces', { 
        name: name.trim(), 
        description: description.trim(), 
        type: 'client' 
      });
      toast.success('Client workspace created successfully!');
      setName('');
      setDescription('');
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
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Briefcase className="text-crm-primary" size={32} />
            Client Workspaces
          </h1>
          <p className="text-crm-textMuted mt-1">
            Dedicated secure collaboration rooms for your agency clients.
          </p>
        </div>
        <button 
          onClick={() => setCreateOpen(true)}
          className="glass-button flex items-center gap-2"
        >
          <Plus size={18} />
          Create Client Space
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Client Workspaces</p>
            <p className="text-2xl font-bold text-white">{workspaces.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <UsersIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Active Clients</p>
            <p className="text-2xl font-bold text-white">
              {workspaces.reduce((acc, curr) => acc + (curr.members?.length || 1), 0)}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Files & Deliverables</p>
            <p className="text-2xl font-bold text-white">
              {workspaces.length * 3 || 0}
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
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">No client workspaces yet</h3>
          <p className="text-crm-textMuted">
            Get started by creating a dedicated secure workspace for your client.
          </p>
          <button 
            onClick={() => setCreateOpen(true)}
            className="glass-button inline-flex items-center gap-2 mx-auto"
          >
            <Plus size={18} /> Create Client Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div key={ws._id} className="glass-card p-6 flex flex-col justify-between hover:border-crm-primary/50 transition-all group duration-300">
              <div className="space-y-4">
                {/* Card Top */}
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-crm-accent to-crm-primary flex items-center justify-center text-white font-bold text-xl uppercase shadow-md group-hover:scale-105 transition-transform">
                    {ws.name.substring(0, 2)}
                  </div>
                  <button 
                    onClick={() => navigate(`/admin/client-workspaces/${ws._id}`)}
                    className="p-2 bg-crm-darker/50 hover:bg-crm-primary hover:text-white rounded-lg text-crm-textMuted transition-colors"
                    title="Launch Workspace"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                {/* Name & Desc */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-crm-accent transition-colors truncate">
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
                      Client Invite Code
                    </p>
                    <p className="text-sm font-mono font-bold text-white tracking-wider">
                      {ws.inviteCode || 'N/A'}
                    </p>
                  </div>
                  {ws.inviteCode && (
                    <button
                      onClick={() => copyToClipboard(ws.inviteCode, ws._id)}
                      className="p-1.5 hover:bg-crm-border rounded text-crm-textMuted hover:text-white transition-colors"
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
                  onClick={() => navigate(`/admin/client-workspaces/${ws._id}`)}
                  className="text-crm-accent group-hover:text-white font-medium flex items-center gap-1 transition-colors"
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
              className="absolute top-4 right-4 text-crm-textMuted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-white">Create Client Workspace</h2>
              <p className="text-sm text-crm-textMuted mt-1">
                Create a secure space for your client where they can log in, chat with your team, and download reports.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
                  Client Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stark Industries, Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-crm-darker/60 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-white rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-crm-textMuted transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-crm-textMuted uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="e.g. Q3 Ad Campaign & Design deliverables"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-crm-darker/60 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-white rounded-xl px-4 py-3 text-sm focus:outline-none placeholder-crm-textMuted transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-crm-textMuted hover:text-white hover:bg-crm-border/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ClientWorkspaces;
