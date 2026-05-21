import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Megaphone, MessageSquare, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../hooks/useAuth';
import { JoinWorkspaceCard } from '../../components/JoinWorkspaceCard';

const typeLabel = (type) => {
  if (type === 'client') return 'Client workspace';
  if (type === 'office') return 'Agency workspace';
  return 'Workspace';
};

const MemberWorkspaces = () => {
  const { user, setActiveWorkspace, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.data || []);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces, user?.workspaces?.length]);

  const handleJoined = (ws) => {
    setWorkspaces((prev) => {
      if (prev.some((w) => w._id === ws._id)) return prev;
      return [...prev, ws];
    });
    fetchWorkspaces();
  };

  const openWorkspace = (ws) => {
    setActiveWorkspace(ws._id, ws.name);
    toast.success(`Active: ${ws.name}`);
    navigate('/channels', { state: { workspaceId: ws._id } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">My Workspaces</h1>
        <p className="text-crm-textMuted mt-1">
          Join with an invite code, then open Team Chat for real-time messaging.
        </p>
      </div>

      <JoinWorkspaceCard onJoined={handleJoined} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-panel p-8 text-center text-crm-textMuted">
          <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
          <p>No workspaces yet. Use the invite code above to join a workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => {
            const isActive = activeWorkspace?.toString() === ws._id?.toString();
            return (
              <div
                key={ws._id}
                className={`glass-card p-5 border transition-colors ${
                  isActive ? 'border-crm-primary/60 ring-1 ring-crm-primary/30' : 'border-crm-border hover:border-crm-primary/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {ws.type === 'client' ? (
                    <Briefcase size={18} className="text-crm-primary" />
                  ) : (
                    <Building2 size={18} className="text-crm-accent" />
                  )}
                  <h3 className="font-bold text-white truncate">{ws.name}</h3>
                </div>
                <p className="text-xs text-crm-textMuted mb-1">{typeLabel(ws.type)}</p>
                <p className="text-xs text-crm-textMuted mb-4 line-clamp-2">
                  {ws.description || ws.owner?.name ? `Managed by ${ws.owner?.name}` : 'Team workspace'}
                </p>
                <p className="text-[10px] font-mono text-crm-textMuted mb-4">Invite: {ws.inviteCode}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openWorkspace(ws)}
                    className="flex-1 glass-button text-xs py-2 flex items-center justify-center gap-1"
                  >
                    <MessageSquare size={14} /> Chat
                  </button>
                  {ws.type === 'client' && (
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
                  )}
                </div>
                {isActive && (
                  <p className="text-[10px] text-crm-primary mt-3 font-medium">Active workspace</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberWorkspaces;
