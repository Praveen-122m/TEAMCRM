import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, Briefcase, ArrowLeft, Copy, Check, MessageSquare, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../hooks/useAuth';
import ChannelChat from '../ChannelChat';
import MetaAdsDashboard from '../MetaAdsDashboard';

const WorkspaceDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveWorkspace } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [workspaceClient, setWorkspaceClient] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const wsRes = await api.get('/workspaces');
        if (!Array.isArray(wsRes.data)) {
          throw new Error('Invalid response format from workspaces API');
        }
        const foundWs = wsRes.data.find((w) => w._id === id);
        if (!foundWs) {
          toast.error('Workspace not found');
          navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces');
          return;
        }
        setWorkspace(foundWs);
        setActiveWorkspace(foundWs._id, foundWs.name);

        if (type === 'client') {
          try {
            const clientRes = await workspaceService.getWorkspaceClient(id);
            setWorkspaceClient(clientRes.data);
          } catch {
            setWorkspaceClient(null);
          }
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
        toast.error('Error loading workspace details');
      }
    };

    loadWorkspace();
  }, [id, type, navigate, setActiveWorkspace]);

  const copyInviteCode = () => {
    if (!workspace?.inviteCode) return;
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!workspace) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-crm-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces')
            }
            className="p-2 hover:bg-crm-border rounded-lg text-crm-textMuted hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-crm-primary/20 rounded text-crm-primary">
                {type === 'office' ? <Building size={16} /> : <Briefcase size={16} />}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">{workspace.name}</h1>
            </div>
            <p className="text-xs text-crm-textMuted truncate max-w-md mt-0.5">
              {workspaceClient?.client?.companyName
                ? `Client: ${workspaceClient.user?.name} · ${workspaceClient.client.companyName}`
                : workspace.description || 'Team collaboration hub'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-crm-darker/60 border border-crm-border rounded-lg text-xs font-mono">
            <span className="text-crm-textMuted">Member Invite:</span>
            <span className="text-white font-bold tracking-wide">{workspace.inviteCode}</span>
            <button onClick={copyInviteCode} className="text-crm-textMuted hover:text-white ml-1">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex bg-crm-darker/50 p-1 border border-crm-border rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                activeTab === 'chat' ? 'bg-crm-primary text-white' : 'text-crm-textMuted hover:text-white'
              }`}
            >
              <MessageSquare size={14} /> Team Chat
            </button>
            {type === 'client' && (
              <button
                onClick={() => setActiveTab('meta')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                  activeTab === 'meta' ? 'bg-crm-primary text-white' : 'text-crm-textMuted hover:text-white'
                }`}
              >
                <Megaphone size={14} /> Meta Ads
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-crm-border glass-panel">
        {activeTab === 'chat' ? (
          <ChannelChat workspaceId={id} workspaceName={workspace.name} isEmbedded />
        ) : (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
            {workspaceClient?.client?._id ? (
              <MetaAdsDashboard
                embedded
                workspaceId={id}
                fixedClientId={workspaceClient.client._id}
                clientLabel={workspaceClient.user?.name}
              />
            ) : (
              <p className="text-center text-crm-textMuted py-12">No client profile linked to this workspace.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDetails;
