import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Megaphone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../hooks/useAuth';
import { JoinWorkspaceCard } from '../../components/JoinWorkspaceCard';

const MemberWorkspaces = () => {
  const { user, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.data.filter((w) => w.type === 'client' || !w.type));
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const openWorkspace = (ws) => {
    setActiveWorkspace(ws._id, ws.name);
    toast.success(`Active: ${ws.name}`);
    navigate('/channels');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Workspaces</h1>
        <p className="text-crm-textMuted mt-1">Join client workspaces with an invite code from your admin.</p>
      </div>

      <JoinWorkspaceCard onJoined={() => fetchWorkspaces()} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-panel p-8 text-center text-crm-textMuted">
          <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
          <p>No workspaces yet. Use the invite code above to join a client workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div key={ws._id} className="glass-card p-5 border border-crm-border hover:border-crm-primary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={18} className="text-crm-primary" />
                <h3 className="font-bold text-white">{ws.name}</h3>
              </div>
              <p className="text-xs text-crm-textMuted mb-4 line-clamp-2">{ws.description || 'Client workspace'}</p>
              <p className="text-[10px] font-mono text-crm-textMuted mb-4">Invite: {ws.inviteCode}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => openWorkspace(ws)} className="flex-1 glass-button text-xs py-2 flex items-center justify-center gap-1">
                  <MessageSquare size={14} /> Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(ws._id, ws.name);
                    navigate('/meta-ads');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-crm-border text-xs text-crm-textMuted hover:text-white flex items-center justify-center gap-1"
                >
                  <Megaphone size={14} /> Meta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberWorkspaces;
