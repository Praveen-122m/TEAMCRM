import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, Briefcase, ArrowLeft, Copy, Check, MessageSquare, Megaphone, Trash2, UserPlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../hooks/useAuth';
import ChannelChat from '../ChannelChat';
import MetaAdsDashboard from '../MetaAdsDashboard';

const WorkspaceDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveWorkspace, user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  
  const isEffectiveSuperAdmin = ['super_admin', 'SuperAdmin', 'superadmin'].includes(
    user?.role ? user.role.toLowerCase().replace(/[\s_]+/g, '') : ''
  ) || (user?.name && user.name.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin'));
  
  const isEffectiveAdmin = isEffectiveSuperAdmin || ['admin', 'Admin'].includes(user?.role);

  const [workspaceClient, setWorkspaceClient] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [copied, setCopied] = useState(false);

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);

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

  const handleDeleteWorkspace = async () => {
    if (window.confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/workspaces/${workspace._id}`);
        toast.success('Workspace deleted successfully');
        navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete workspace');
      }
    }
  };

  const handleOpenAddMemberModal = async () => {
    setShowAddMemberModal(true);
    setIsFetchingMembers(true);
    try {
      const res = await api.get('/members');
      // Filter out the logged-in user so they don't add themselves
      const currentUserId = user?._id || user?.id;
      const filteredMembers = res.data.filter(m => m.userId !== currentUserId);
      setAvailableMembers(filteredMembers);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setIsFetchingMembers(false);
    }
  };

  const handleAddMember = async (memberId) => {
    setAddingMemberId(memberId);
    try {
      await api.post(`/workspaces/${id}/members`, { userId: memberId });
      toast.success('Member added successfully!');
      setAvailableMembers(prev => prev.filter(m => m.userId !== memberId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMemberId(null);
    }
  };

  if (!workspace) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-crm-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 border-b border-crm-border bg-crm-card">
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces')
            }
            className="p-2 hover:bg-crm-border rounded-lg text-crm-textMuted hover:text-crm-text transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-crm-primary/20 rounded text-crm-primary">
                {type === 'office' ? <Building size={16} /> : <Briefcase size={16} />}
              </span>
              <h1 className="text-xl font-bold text-crm-text tracking-tight">{workspace.name}</h1>
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
            <span className="text-crm-text font-bold tracking-wide">{workspace.inviteCode}</span>
            <button onClick={copyInviteCode} className="text-crm-textMuted hover:text-crm-text ml-1">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex bg-crm-darker/50 p-1 border border-crm-border rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                activeTab === 'chat' ? 'bg-crm-primary text-crm-primary-text' : 'text-crm-textMuted hover:text-crm-text'
              }`}
            >
              <MessageSquare size={14} /> Team Chat
            </button>
            {type === 'client' && (
              <button
                onClick={() => setActiveTab('meta')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                  activeTab === 'meta' ? 'bg-crm-primary text-crm-primary-text' : 'text-crm-textMuted hover:text-crm-text'
                }`}
              >
                <Megaphone size={14} /> Meta Ads
              </button>
            )}
          </div>
          
          {workspace && isEffectiveAdmin && (
            <button
              onClick={handleOpenAddMemberModal}
              className="flex items-center gap-2 px-3 py-1.5 text-crm-textMuted hover:text-crm-text hover:bg-crm-darker/80 rounded-lg text-xs font-medium transition-all"
            >
              <UserPlus size={14} /> Add Member
            </button>
          )}
          
          {workspace && isEffectiveSuperAdmin && (
            <button
              onClick={handleDeleteWorkspace}
              className="p-1.5 ml-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all"
              title="Delete Workspace"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-crm-card w-full max-w-md rounded-2xl border border-crm-border shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-crm-border">
              <div>
                <h3 className="text-lg font-bold text-crm-text">Add Member to Workspace</h3>
                <p className="text-xs text-crm-textMuted mt-0.5">Select a member you manage to add them directly.</p>
              </div>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                className="p-2 text-crm-textMuted hover:text-crm-text hover:bg-crm-darker rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {isFetchingMembers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={28} className="text-crm-text animate-spin" />
                  <span className="text-sm text-crm-textMuted">Loading your members...</span>
                </div>
              ) : availableMembers.length === 0 ? (
                <div className="text-center py-10 bg-crm-darker rounded-xl border border-crm-border">
                  <UserPlus size={32} className="mx-auto text-crm-textMuted mb-3" />
                  <p className="text-sm font-medium text-crm-text">No members available</p>
                  <p className="text-xs text-crm-textMuted mt-1">You haven't created any members yet, or they are all added.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableMembers.map(member => (
                    <div key={member._id} className="flex items-center justify-between p-3 bg-crm-darker hover:bg-crm-dark border border-crm-border rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-crm-card text-crm-text flex items-center justify-center font-bold border border-crm-border shrink-0">
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-crm-text">{member.name || 'Unknown User'}</div>
                            {member.role && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-crm-dark border border-crm-border text-crm-textMuted rounded uppercase tracking-wider">
                                {member.role.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-crm-textMuted mt-0.5">{member.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(member.userId)}
                        disabled={addingMemberId === member.userId}
                        className="px-3 py-1.5 bg-crm-text text-crm-card hover:opacity-80 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                      >
                        {addingMemberId === member.userId ? (
                          <><Loader2 size={12} className="animate-spin text-crm-card" /> Adding...</>
                        ) : (
                          'Add'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-crm-border bg-crm-darker rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 bg-crm-dark border border-crm-border hover:bg-crm-card text-crm-text text-sm font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetails;
