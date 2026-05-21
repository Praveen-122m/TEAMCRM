import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../hooks/useAuth';

export const JoinWorkspaceCard = ({ onJoined }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const res = await workspaceService.joinWorkspace(inviteCode.trim().toUpperCase());
      const ws = res.data;
      await refreshUser();
      setActiveWorkspace(ws._id, ws.name);
      toast.success(res.data.message || `Joined workspace: ${ws.name}`);
      setInviteCode('');
      onJoined?.(ws);
      navigate('/channels', { state: { workspaceId: ws._id } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 border border-crm-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-crm-primary/20 text-crm-primary">
          <Layers size={20} />
        </div>
        <div>
          <h3 className="font-bold text-white">Join a Workspace</h3>
          <p className="text-xs text-crm-textMuted">
            Enter the invite code your admin gave you to access client workspaces.
          </p>
        </div>
      </div>
      <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" size={18} />
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="INVITE CODE"
            className="w-full bg-crm-darker/60 border border-crm-border rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono tracking-widest uppercase focus:border-crm-primary focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="glass-button px-6 py-3 whitespace-nowrap disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Workspace'}
        </button>
      </form>
    </div>
  );
};
