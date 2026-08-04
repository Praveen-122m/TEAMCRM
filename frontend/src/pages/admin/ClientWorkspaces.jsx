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
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../hooks/useAuth';

const ClientWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [assignedAdminId, setAssignedAdminId] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const { user, refreshUser, setActiveWorkspace } = useAuth();
  
  const isEffectiveSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(
    user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : ''
  ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
  const navigate = useNavigate();

  const launchWorkspace = (ws) => {
    setActiveWorkspace(ws._id, ws.name);
    navigate(`/admin/client-workspaces/${ws._id}`);
  };

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

  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchWorkspaces();
    if (['super_admin', 'SuperAdmin'].includes(user?.role)) {
      api.get('/members').then(res => {
        setAdmins(res.data.filter(m => ['admin', 'Admin'].includes(m.role)));
      }).catch(err => console.error(err));
    }
  }, [user]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim() || !clientEmail.trim() || !clientPassword || !adAccountId.trim() || !accessToken.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const res = await workspaceService.createClientWorkspace({
        name: name.trim(),
        description: description.trim(),
        clientName: clientName.trim(),
        email: clientEmail.trim(),
        password: clientPassword,
        secretCode: secretCode.trim() || undefined,
        assigned_admin_id: assignedAdminId || undefined,
        companyName: name.trim(),
        adAccountId: adAccountId.trim(),
        accessToken: accessToken.trim()
      });
      setCredentials(res.data.clientCredentials);
      if (res.data.syncError) {
        toast.error('Workspace created, but initial Meta Ads sync failed: ' + res.data.syncError, { duration: 6000 });
      } else {
        toast.success('Client workspace created and Meta Ads integrated!');
      }
      setName('');
      setDescription('');
      setClientName('');
      setClientEmail('');
      setClientPassword('');
      setSecretCode('');
      setAssignedAdminId('');
      setAdAccountId('');
      setAccessToken('');
      setCreateOpen(false);
      await refreshUser();
      fetchWorkspaces();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Client Portal Login\nEmail: ${credentials.email}\nSecret Key: ${credentials.secretCode}\nPassword: ${credentials.password}\nClient ID: ${credentials.clientId}\nWorkspace ID: ${credentials.workspaceId}`;
    navigator.clipboard.writeText(text);
    toast.success('Login details copied for client!');
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
            <Briefcase className="text-crm-primary" size={32} />
            Client Workspaces
          </h1>
          <p className="text-crm-textMuted mt-1">
            Dedicated secure collaboration rooms for your agency clients.
          </p>
        </div>
        {isEffectiveSuperAdmin && (
          <button 
            onClick={() => setCreateOpen(true)}
            className="glass-button flex items-center gap-2"
          >
            <Plus size={18} />
            Create Client Space
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Client Workspaces</p>
            <p className="text-2xl font-bold text-crm-text">{workspaces.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-crm-primary/20 flex items-center justify-center text-crm-primary shrink-0">
            <UsersIcon size={24} />
          </div>
          <div>
            <p className="text-sm text-crm-textMuted">Active Clients</p>
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
            <p className="text-sm text-crm-textMuted">Files & Deliverables</p>
            <p className="text-2xl font-bold text-crm-text">
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
          <h3 className="text-xl font-bold text-crm-text">No client workspaces yet</h3>
          <p className="text-crm-textMuted">
            Get started by creating a dedicated secure workspace for your client.
          </p>
          {isEffectiveSuperAdmin && (
            <button 
              onClick={() => setCreateOpen(true)}
              className="glass-button inline-flex items-center gap-2 mx-auto"
            >
              <Plus size={18} /> Create Client Space
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-crm-accent to-crm-primary flex items-center justify-center text-crm-primary-text font-bold text-xl uppercase shadow-md group-hover:scale-105 transition-transform">
                    {ws.name.substring(0, 2)}
                  </div>
                  <button 
                    onClick={() => navigate(`/admin/client-workspaces/${ws._id}`)}
                    className="p-2 bg-crm-darker/50 hover:bg-crm-primary hover:text-crm-primary-text rounded-lg text-crm-textMuted transition-colors"
                    title="Launch Workspace"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                {/* Name & Desc */}
                <div>
                  <h3 className="text-lg font-bold text-crm-text group-hover:text-crm-accent transition-colors truncate">
                    {ws.name}
                  </h3>
                  <p className="text-sm text-crm-textMuted mt-1 line-clamp-2 min-h-[40px]">
                    {ws.description || 'No description provided.'}
                  </p>
                </div>

                {/* Codes Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-crm-darker/50 border border-crm-border rounded-xl flex items-center justify-between">
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-crm-textMuted uppercase tracking-wider font-semibold truncate">
                        Invite Code
                      </p>
                      <p className="text-sm font-mono font-bold text-crm-text tracking-wider truncate">
                        {ws.inviteCode || 'N/A'}
                      </p>
                    </div>
                    {ws.inviteCode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(ws.inviteCode, `inv_${ws._id}`); }}
                        className="p-1.5 hover:bg-crm-border rounded text-crm-textMuted hover:text-crm-text transition-colors shrink-0"
                        title="Copy Invite Code"
                      >
                        {copiedId === `inv_${ws._id}` ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-crm-darker/50 border border-crm-border rounded-xl flex items-center justify-between">
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-crm-textMuted uppercase tracking-wider font-semibold truncate">
                        Secret Key
                      </p>
                      <p className="text-sm font-mono font-bold text-emerald-400 tracking-wider truncate">
                        {ws.saasClient?.secret_key || ws.members?.find(m => m.role === 'Client')?.secretCode || 'N/A'}
                      </p>
                    </div>
                    {(ws.saasClient?.secret_key || ws.members?.find(m => m.role === 'Client')?.secretCode) && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          copyToClipboard(ws.saasClient?.secret_key || ws.members.find(m => m.role === 'Client').secretCode, `sec_${ws._id}`); 
                        }}
                        className="p-1.5 hover:bg-crm-border rounded text-crm-textMuted hover:text-crm-text transition-colors shrink-0"
                        title="Copy Secret Key"
                      >
                        {copiedId === `sec_${ws._id}` ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-crm-darker/50 border border-crm-border rounded-xl flex items-center justify-between col-span-2">
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-crm-textMuted uppercase tracking-wider font-semibold truncate">
                        Password (Client Login)
                      </p>
                      <p className="text-sm font-mono font-bold text-rose-400 tracking-wider truncate">
                        {ws.saasClient?.visible_password || 'Hidden'}
                      </p>
                    </div>
                    {ws.saasClient?.visible_password && (
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          copyToClipboard(ws.saasClient?.visible_password, `pass_${ws._id}`); 
                        }}
                        className="p-1.5 hover:bg-crm-border rounded text-crm-textMuted hover:text-crm-text transition-colors shrink-0"
                        title="Copy Password"
                      >
                        {copiedId === `pass_${ws._id}` ? <Check size={16} className="text-rose-400" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>
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
                  className="text-crm-accent group-hover:text-crm-text font-medium flex items-center gap-1 transition-colors"
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
          <div className="glass-panel w-full max-w-lg p-6 space-y-5 border border-crm-border relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-crm-textMuted hover:text-crm-text transition-colors"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-crm-text">Create Client Workspace</h2>
              <p className="text-xs text-crm-textMuted mt-1">
                Configure a client profile, link their Meta Ads account, and deploy a secure dashboard workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateWorkspace} className="space-y-4 max-h-[68vh] overflow-y-auto custom-scrollbar pr-1">
              
              {/* SECTION 1 - CLIENT DETAILS */}
              <div className="space-y-3 pb-3 border-b border-crm-border/40">
                <h3 className="text-xs font-bold text-crm-primary uppercase tracking-widest">Section 1 – Client Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Company Name</label>
                    <input type="text" placeholder="Stark Industries" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Client Contact Name</label>
                    <input type="text" placeholder="John Stark" value={clientName} onChange={(e) => setClientName(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Client Email</label>
                    <input type="email" placeholder="client@company.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Password</label>
                    <input type="text" placeholder="Min 8 chars password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-crm-textMuted">Description (Optional)</label>
                  <textarea placeholder="Describe the client workspace or project scope..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none resize-none" />
                </div>
              </div>

              {/* SECTION 2 - META ADS INTEGRATION */}
              <div className="space-y-3 pb-3 border-b border-crm-border/40">
                <h3 className="text-xs font-bold text-crm-primary uppercase tracking-widest">Section 2 – Meta Ads Integration</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Meta Ad Account ID</label>
                    <input type="text" placeholder="e.g. act_123456789" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm font-mono focus:border-crm-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-crm-textMuted">Meta Access Token</label>
                    <input type="text" placeholder="e.g. EAABCD123456TOKEN..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm font-mono focus:border-crm-primary focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1 py-1">
                <label className="text-xs font-semibold text-crm-textMuted">Secret Key (Optional — Auto-generated if blank)</label>
                <input type="text" placeholder="CL-XXXXXX" value={secretCode} onChange={(e) => setSecretCode(e.target.value.toUpperCase())} className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm font-mono focus:border-crm-primary focus:outline-none" />
              </div>

              {['super_admin', 'SuperAdmin'].includes(user?.role) && (
                <div className="space-y-1 py-1">
                  <label className="text-xs font-semibold text-crm-textMuted">Assigned Admin</label>
                  <select value={assignedAdminId} onChange={(e) => setAssignedAdminId(e.target.value)} className="w-full bg-crm-darker/60 border border-crm-border text-crm-text rounded-xl px-4 py-2.5 text-sm focus:border-crm-primary focus:outline-none">
                    <option value="">None (Unassigned)</option>
                    {admins.map(admin => (
                      <option key={admin.userId || admin._id} value={admin.userId || admin._id}>{admin.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm text-crm-textMuted hover:text-crm-text">Cancel</button>
                <button type="submit" disabled={creating} className="px-5 py-2.5 bg-crm-primary hover:bg-crm-primary text-crm-primary-text rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                  {creating ? 'Integrating & Syncing...' : 'Create Workspace & Integrations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal Popup */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 border border-emerald-500/30">
            <h2 className="text-xl font-bold text-crm-text">Workspace Configuration Complete</h2>
            <p className="text-sm text-crm-textMuted">
              Workspace & client details generated successfully. Copy details to client.
            </p>
            <div className="space-y-2 text-sm font-mono bg-crm-darker/60 p-4 rounded-xl border border-crm-border">
              <p><span className="text-crm-textMuted">Client ID:</span> <span className="text-crm-text select-all">{credentials.clientId}</span></p>
              <p><span className="text-crm-textMuted">Workspace ID:</span> <span className="text-crm-text select-all">{credentials.workspaceId}</span></p>
              <p><span className="text-crm-textMuted">Secret Key:</span> <span className="text-emerald-400 select-all">{credentials.secretCode}</span></p>
              <p><span className="text-crm-textMuted">Email:</span> <span className="text-crm-text">{credentials.email}</span></p>
              <p><span className="text-crm-textMuted">Password:</span> <span className="text-crm-text">{credentials.password}</span></p>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={copyCredentials} className="glass-button text-sm">Copy Details</button>
              <button type="button" onClick={() => setCredentials(null)} className="px-4 py-2 bg-crm-primary text-crm-primary-text rounded-lg text-sm font-semibold">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWorkspaces;
