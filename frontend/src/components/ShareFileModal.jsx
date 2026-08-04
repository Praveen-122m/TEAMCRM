import { useState, useEffect } from 'react';
import { X, Send, Users, Hash, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const ShareFileModal = ({ files, workspaceId, onClose }) => {
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' or 'members'
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chRes, memRes] = await Promise.all([
          api.get(`/channels/${workspaceId}`),
          api.get(`/workspaces/${workspaceId}/members`)
        ]);
        setChannels(chRes.data || []);
        // Filter out current user if needed, but since we don't have current user readily available without hook, we'll just show all members.
        // Members API usually returns populated user objects.
        setMembers(memRes.data || []);
      } catch (error) {
        console.error('Error fetching share targets:', error);
        toast.error('Failed to load channels and members');
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) fetchData();
  }, [workspaceId]);

  const handleShare = async () => {
    if (selectedChannels.length === 0 && selectedMembers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    let successCount = 0;
    
    try {
      for (const file of files) {
        const payloadTemplate = {
          content: message || `Shared a file: ${file.originalName || file.name}`,
          workspaceId,
          fileUrl: file.url,
          fileType: file.mimeType?.startsWith('image/') || file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 
                    file.mimeType?.startsWith('video/') || file.url?.match(/\.(mp4|mov|avi)$/i) ? 'video' : 
                    file.mimeType?.startsWith('audio/') || file.url?.match(/\.(mp3|wav|ogg)$/i) ? 'audio' : 'document'
        };

        const promises = [];

        for (const channelId of selectedChannels) {
          promises.push(api.post('/messages', { ...payloadTemplate, channelId }));
        }

        for (const memberId of selectedMembers) {
          promises.push(api.post('/messages', { ...payloadTemplate, receiverId: memberId, isDirectMessage: true }));
        }

        await Promise.all(promises);
        successCount += 1;
      }
      
      toast.success(`Successfully shared ${successCount} file(s)`);
      onClose();
    } catch (error) {
      console.error('Share error:', error);
      toast.error(error.response?.data?.message || 'Failed to share file');
    } finally {
      setSending(false);
    }
  };

  const filteredChannels = channels.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMembers = members.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-crm-card border border-crm-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-crm-border flex items-center justify-between bg-crm-darker/50">
          <div>
            <h2 className="text-lg font-bold text-crm-text">Share {files.length > 1 ? `${files.length} Files` : 'File'}</h2>
            <p className="text-xs text-crm-textMuted mt-1 truncate max-w-[250px]">
              {files.length === 1 ? (files[0].originalName || files[0].name) : `${files.length} files selected`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-crm-textMuted hover:text-crm-text bg-crm-darker rounded-xl hover:bg-crm-border/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 border-b border-crm-border bg-crm-card">
          <button
            onClick={() => { setActiveTab('channels'); setSearchQuery(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'channels' ? 'bg-crm-primary/20 text-crm-primary' : 'text-crm-textMuted hover:bg-crm-darker'
            }`}
          >
            <Hash size={16} /> Channels {selectedChannels.length > 0 && `(${selectedChannels.length})`}
          </button>
          <button
            onClick={() => { setActiveTab('members'); setSearchQuery(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'members' ? 'bg-crm-primary/20 text-crm-primary' : 'text-crm-textMuted hover:bg-crm-darker'
            }`}
          >
            <Users size={16} /> Direct Message {selectedMembers.length > 0 && `(${selectedMembers.length})`}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-textMuted" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-crm-darker border border-crm-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-crm-text focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar min-h-[200px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-t-2 border-crm-primary rounded-full" />
              </div>
            ) : activeTab === 'channels' ? (
              filteredChannels.length > 0 ? (
                filteredChannels.map(channel => {
                  const isSelected = selectedChannels.includes(channel._id);
                  return (
                    <button
                      key={channel._id}
                      onClick={() => setSelectedChannels(prev => isSelected ? prev.filter(id => id !== channel._id) : [...prev, channel._id])}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSelected ? 'bg-crm-primary/10 border border-crm-primary/30' : 'hover:bg-crm-darker border border-transparent'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary bg-crm-darker pointer-events-none accent-crm-primary shrink-0"
                      />
                      <div className="w-8 h-8 rounded-lg bg-crm-darker border border-crm-border flex items-center justify-center text-crm-textMuted shrink-0">
                        <Hash size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-crm-text truncate">{channel.name}</p>
                        {channel.description && <p className="text-xs text-crm-textMuted truncate">{channel.description}</p>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-sm text-crm-textMuted py-8">No channels found.</p>
              )
            ) : (
              filteredMembers.length > 0 ? (
                filteredMembers.map(member => {
                  const isSelected = selectedMembers.includes(member._id);
                  return (
                    <button
                      key={member._id}
                      onClick={() => setSelectedMembers(prev => isSelected ? prev.filter(id => id !== member._id) : [...prev, member._id])}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSelected ? 'bg-crm-primary/10 border border-crm-primary/30' : 'hover:bg-crm-darker border border-transparent'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        className="w-4 h-4 rounded border-crm-border text-crm-primary focus:ring-crm-primary bg-crm-darker pointer-events-none accent-crm-primary shrink-0"
                      />
                      <img 
                        src={member.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2A2D35&color=fff`} 
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-crm-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-crm-text truncate">{member.name}</p>
                        <p className="text-xs text-crm-textMuted truncate capitalize">{member.role}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-sm text-crm-textMuted py-8">No members found.</p>
              )
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-crm-border">
            <input
              type="text"
              placeholder="Add an optional message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-crm-darker border border-crm-border rounded-xl px-4 py-2.5 text-sm text-crm-text focus:outline-none focus:border-crm-primary transition-all mb-4"
            />
            <button
              onClick={handleShare}
              disabled={(selectedChannels.length === 0 && selectedMembers.length === 0) || sending}
              className="w-full bg-crm-primary hover:bg-crm-primary/90 text-crm-primary-text font-medium rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-crm-primary/20"
            >
              {sending ? (
                <div className="animate-spin h-5 w-5 border-t-2 border-crm-primary-text rounded-full" />
              ) : (
                <>
                  <Send size={18} /> Share {files.length > 1 ? `${files.length} Files` : 'File'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareFileModal;
