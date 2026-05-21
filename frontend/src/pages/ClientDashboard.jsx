import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StatCard } from '../components/StatCard';
import MetaAdsDashboard from './MetaAdsDashboard';
import { workspaceService } from '../services/workspaceService';
import {
  Target,
  MessageSquare,
  Briefcase,
} from 'lucide-react';

const ClientDashboard = () => {
  const { user, activeWorkspace, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const workspaceId = user?.workspaces?.[0] || activeWorkspace;

  useEffect(() => {
    if (user?.role === 'Client' && user?.workspaces?.[0]) {
      const wsId = user.workspaces[0];
      setActiveWorkspace(wsId, user.workspacesMeta?.[0]?.name);
    }
  }, [user, setActiveWorkspace]);

  useEffect(() => {
    if (!workspaceId) return;
    workspaceService.getWorkspaceClient(workspaceId).then((res) => {
      setWorkspaceInfo(res.data);
    }).catch(() => setWorkspaceInfo(null));
  }, [workspaceId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Welcome, {user?.name}</h1>
          <p className="text-crm-textMuted">
            {workspaceInfo?.workspace?.name
              ? `Your workspace: ${workspaceInfo.workspace.name}`
              : 'Your agency client portal'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/channels', { state: { workspaceId } })}
            className="glass-button flex items-center gap-2"
          >
            <MessageSquare size={18} /> Team Chat
          </button>
          <button type="button" onClick={() => navigate('/messages')} className="glass-button-secondary flex items-center gap-2">
            <Target size={18} /> Direct Messages
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Workspace" value={workspaceInfo?.workspace?.name?.slice(0, 12) || '—'} icon={Briefcase} color="primary" />
        <StatCard title="Team Chat" value="Live" icon={MessageSquare} color="emerald" onClick={() => navigate('/channels')} />
        <StatCard title="Meta Ads" value="View" icon={Target} color="violet" onClick={() => navigate('/meta-ads')} />
      </div>

      {workspaceId && user?.clientProfileId && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Your Meta Ads Performance</h2>
          <MetaAdsDashboard embedded workspaceId={workspaceId} fixedClientId={user.clientProfileId} clientLabel={user.name} />
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
