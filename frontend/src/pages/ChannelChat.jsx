import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Hash, Search, Send, Paperclip, Plus, Phone, X, Download, FileText, AtSign } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { resolveMediaUrl, isImageFile, isVideoFile, fileDisplayName } from '../utils/mediaUrl';
import { downloadMediaFile } from '../utils/downloadFile';
import CreateChannelModal from '../components/modals/CreateChannelModal';

const ChannelChat = ({ isEmbedded = false, workspaceId: workspaceIdProp, workspaceName }) => {
  const { user, activeWorkspace, setActiveWorkspace } = useAuth();
  const { socket, isConnected, clearUnread, onlineUsers = [] } = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [tabValue, setTabValue] = useState(1); 
  const [chatTab, setChatTab] = useState(0); 
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);

  const resolvedWorkspaceId = useMemo(() => {
    if (location.state?.workspaceId) {
      return location.state.workspaceId.toString();
    }
    if (user?.role === 'Client' && user?.workspaces?.length > 0) {
      return user.workspaces[0].toString();
    }
    const ws = workspaceIdProp || activeWorkspace || user?.workspaces?.[0];
    return ws?.toString?.() || ws;
  }, [user?.role, user?.workspaces, workspaceIdProp, activeWorkspace, location.state?.workspaceId]);

  // New: Mentions & Real-time States
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // { channelId: Set of names }
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchWorkspaceFiles = useCallback(async (wsId) => {
    if (!wsId) return;
    try {
      const res = await api.get(`/messages/workspace/${wsId}/files`);
      setWorkspaceFiles(res.data);
    } catch (err) {
      console.error('Failed to load workspace files', err);
    }
  }, []);

  useEffect(() => {
    if (isEmbedded || !user?.workspaces?.length) return;
    if (!activeWorkspace && !location.state?.workspaceId) {
      const ws = user.workspaces[0].toString();
      setActiveWorkspace(ws);
    }
  }, [user, activeWorkspace, location.state?.workspaceId, isEmbedded, setActiveWorkspace]);

  const fetchData = useCallback(async () => {
    if (!user || !resolvedWorkspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setActiveChannel(null);
    setMessages([]);
    try {
      const [chRes, memRes, projRes] = await Promise.all([
        api.get(`/channels/${resolvedWorkspaceId}`),
        api.get(`/workspaces/${resolvedWorkspaceId}/members`),
        user.role?.toLowerCase() === 'client'
          ? api.get(`/projects/${resolvedWorkspaceId}`)
          : Promise.resolve({ data: [] }),
      ]);
      setChannels(chRes.data);
      setMembers(memRes.data);
      setProjects(projRes.data);
      await fetchWorkspaceFiles(resolvedWorkspaceId);

      if (socket?.connected && chRes.data?.length) {
        socket.emit(
          'join_channels',
          chRes.data.map((c) => c._id)
        );
      }

      const targetChannelId = location.state?.activeChannelId;
      if (targetChannelId) {
        const target = chRes.data.find(
          (c) => c._id?.toString() === targetChannelId?.toString()
        );
        if (target) {
          setActiveChannel(target);
          return;
        }
      }

      if (chRes.data.length > 0) {
        setActiveChannel(chRes.data[0]);
      }
    } catch (err) {
      console.error('Fetch error', err);
      if (err.response?.status === 403) {
        toast.error('You do not have access to this workspace. Contact your admin.');
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      }
    } finally {
      setLoading(false);
    }
  }, [user, resolvedWorkspaceId, location.state, fetchWorkspaceFiles, socket]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const joinActiveChannel = useCallback(() => {
    if (!socket?.connected || !activeChannel?._id) return;
    socket.emit('join_channel', activeChannel._id);
    if (resolvedWorkspaceId) {
      socket.emit('join_workspace', resolvedWorkspaceId);
    }
  }, [socket, activeChannel, resolvedWorkspaceId]);

  useEffect(() => {
    if (!activeChannel) return;
    api.get(`/messages/${activeChannel._id}`).then((res) => {
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    });
    joinActiveChannel();
  }, [activeChannel?._id, joinActiveChannel]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      joinActiveChannel();
      if (channels.length) {
        socket.emit('join_channels', channels.map((c) => c._id));
      }
    };

    socket.on('connect', onConnect);

    const messageListener = (newMessage) => {
      const msgChannelId = (
        newMessage.channelId ||
        newMessage.channel?._id ||
        newMessage.channel ||
        ''
      ).toString();
      const activeId = activeChannel?._id?.toString();
      if (!activeId || msgChannelId !== activeId) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
      if (newMessage.fileUrl) fetchWorkspaceFiles(resolvedWorkspaceId);
    };

    const onTyping = (room) => {
      const roomId = (room?._id || room || '').toString();
      if (activeChannel?._id?.toString() === roomId) setIsTypingRemote(true);
    };

    const onStopTyping = (room) => {
      const roomId = (room?._id || room || '').toString();
      if (activeChannel?._id?.toString() === roomId) setIsTypingRemote(false);
    };

    socket.on('message_received', messageListener);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('message_received', messageListener);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
    };
  }, [socket, activeChannel, channels, joinActiveChannel, resolvedWorkspaceId, fetchWorkspaceFiles]);

  const [isTypingRemote, setIsTypingRemote] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);

    if (socket?.connected && activeChannel?._id) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing', activeChannel._id);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', activeChannel._id);
        setIsTyping(false);
      }, 2000);
    }

    // Mention detection
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIdx + 1);
      if (!textAfterAt.includes(' ') && (lastAtIdx === 0 || value[lastAtIdx - 1] === ' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (member) => {
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = messageInput.substring(0, cursorPosition);
    const textAfterCursor = messageInput.substring(cursorPosition);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    const newValue = textBeforeCursor.substring(0, lastAtIdx) + '@' + member.name + ' ' + textAfterCursor;
    setMessageInput(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;
    if (!activeChannel) return;

    if (socket?.connected) {
      socket.emit('stop_typing', activeChannel._id);
    }
    setIsTyping(false);

    let fileData = null;
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile.file);
      try {
        const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        fileData = { url: res.data.url, type: res.data.format, name: selectedFile.file.name };
      } catch (err) {
        console.error('Upload failed', err);
        toast.error(err.response?.data?.message || 'File upload failed');
        setUploading(false);
        return;
      }
    }

    const content = messageInput;
    setMessageInput('');
    setSelectedFile(null);
    setUploading(false);
    setShowMentions(false);

    try {
      const payload = {
        content: content || (fileData ? `Shared a file: ${fileData.name}` : ''),
        channelId: activeChannel._id,
        workspaceId: resolvedWorkspaceId,
        fileUrl: fileData?.url,
        fileType: fileData?.type
      };
      const res = await api.post('/messages', payload);
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      if (fileData) fetchWorkspaceFiles(resolvedWorkspaceId);
      scrollToBottom();
    } catch (error) {
      console.error('Send Message Error:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const isPreviewable = file.type.startsWith('image') || file.type.startsWith('video');
      setSelectedFile({ file, preview: isPreviewable ? reader.result : null, isVideo: file.type.startsWith('video') });
    };
    reader.readAsDataURL(file);
  };

  const renderFileAttachment = (msg) => {
    const url = resolveMediaUrl(msg.fileUrl);
    const name = fileDisplayName(msg);

    if (isImageFile(msg.fileType, msg.fileUrl)) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-sm">
          <img src={url} alt={name} className="max-w-full block" />
          <button
            type="button"
            onClick={() => downloadMediaFile(msg.fileUrl, name)}
            className="block w-full text-center text-xs py-2 text-crm-primary hover:underline"
          >
            Download
          </button>
        </div>
      );
    }

    if (isVideoFile(msg.fileType, msg.fileUrl)) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-md">
          <video src={url} controls className="w-full max-h-72 block" />
          <button
            type="button"
            onClick={() => downloadMediaFile(msg.fileUrl, name)}
            className="flex items-center justify-center gap-1 w-full text-xs py-2 text-crm-primary hover:underline"
          >
            <Download size={14} /> Download Video
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => downloadMediaFile(msg.fileUrl, name)}
        className="mt-2 inline-flex items-center gap-2 text-sm text-crm-primary hover:underline"
      >
        <Download size={14} /> {name}
      </button>
    );
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="font-bold text-amber-400 bg-amber-400/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const channelFiles = useMemo(() => messages.filter((m) => m.fileUrl), [messages]);

  const renderFilesTab = () => {
    const files = workspaceFiles.length > 0 ? workspaceFiles : channelFiles;
    return (
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <h3 className="text-lg font-bold text-white mb-1">Shared Files</h3>
        <p className="text-xs text-crm-textMuted mb-4">
          Images, videos, and documents in {activeChannel ? `#${activeChannel.name}` : 'this workspace'}
        </p>
        {files.length === 0 ? (
          <div className="text-center py-16 text-crm-textMuted">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p>No files shared yet. Attach files from the Chat tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => {
              const url = resolveMediaUrl(file.fileUrl);
              const name = fileDisplayName(file);
              return (
                <div key={file._id} className="glass-card overflow-hidden border border-crm-border hover:border-crm-primary/40 transition-colors">
                  {isImageFile(file.fileType, file.fileUrl) ? (
                    <img src={url} alt={name} className="w-full h-36 object-cover" />
                  ) : isVideoFile(file.fileType, file.fileUrl) ? (
                    <video src={url} className="w-full h-36 object-cover bg-black" />
                  ) : (
                    <div className="h-36 flex items-center justify-center bg-crm-darker">
                      <FileText size={40} className="text-crm-textMuted opacity-50" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-bold text-white truncate">{name}</p>
                    <p className="text-[10px] text-crm-textMuted mt-0.5">{file.sender?.name || 'Team member'}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-crm-textMuted">{new Date(file.createdAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => downloadMediaFile(file.fileUrl, name)}
                        className="text-crm-primary hover:text-crm-primaryHover"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!resolvedWorkspaceId && !loading) {
    return (
      <div className="glass-panel p-8 text-center text-crm-textMuted max-w-lg mx-auto">
        <p>No workspace selected. Open a client workspace or join one from My Workspaces, then open Team Chat again.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-10 w-10 border-t-2 border-crm-primary rounded-full" />
      </div>
    );
  }

  const filteredMentions = members.filter((u) =>
    u.name?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const sidebarItems = (tabValue === 1 ? channels : members).filter((i) =>
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const heightClass = isEmbedded ? 'h-full' : 'h-[calc(100vh-8rem)]';

  return (
    <div className={`flex gap-4 overflow-hidden ${heightClass}`}>
      {/* Sidebar */}
      <div className="w-72 flex flex-col glass-panel overflow-hidden shrink-0">
        {workspaceName && (
          <div className="p-4 border-b border-crm-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-crm-textMuted">Workspace</p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{workspaceName}</p>
          </div>
        )}

        <div className="flex border-b border-crm-border">
          {['Members', 'Channels'].map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setTabValue(idx)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tabValue === idx
                  ? 'text-crm-primary border-b-2 border-crm-primary'
                  : 'text-crm-textMuted hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 border-b border-crm-border">
          <div className="flex items-center gap-2 bg-crm-darker/50 border border-crm-border rounded-xl px-3 py-2">
            <Search size={16} className="text-crm-textMuted shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-crm-textMuted focus:outline-none"
            />
          </div>
          {tabValue === 1 && (user.role === 'Admin' || user.role === 'Member') && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-2 flex items-center gap-1 text-xs font-bold text-crm-primary hover:text-crm-primaryHover"
            >
              <Plus size={14} /> Add Channel
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {sidebarItems.map((item) => {
            const isChannel = tabValue === 1;
            const isSelected = isChannel && activeChannel?._id === item._id;
            return (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  if (isChannel) {
                    setActiveChannel(item);
                    clearUnread?.(item._id);
                  } else {
                    navigate('/messages', { state: { selectedUser: item } });
                  }
                }}
                className={`w-full flex items-center gap-2.5 p-3 rounded-xl text-left mb-1 transition-colors ${
                  isSelected
                    ? 'bg-crm-primary/20 border border-crm-primary/40 text-white'
                    : 'hover:bg-crm-border/30 text-crm-text'
                }`}
              >
                {isChannel ? (
                  <Hash size={16} className={isSelected ? 'text-crm-primary' : 'text-crm-textMuted'} />
                ) : (
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary text-xs font-bold shrink-0">
                      {item.name?.charAt(0)}
                    </div>
                    {onlineUsers.includes(item._id) && (
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-crm-darker" />
                    )}
                  </div>
                )}
                <span className="text-sm font-medium truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden min-w-0">
        {activeChannel ? (
          <>
            <div className="border-b border-crm-border">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash size={20} className="text-crm-primary shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{activeChannel.name}</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {isConnected ? 'Live' : 'Connecting...'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map((m) => (
                      <div
                        key={m._id}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-crm-primary to-crm-accent border-2 border-crm-card flex items-center justify-center text-[10px] font-bold text-white"
                        title={m.name}
                      >
                        {m.name?.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/calls')}
                    className="p-2 rounded-xl hover:bg-crm-border/30 text-crm-textMuted hover:text-white"
                  >
                    <Phone size={18} />
                  </button>
                </div>
              </div>

              <div className="flex px-4 border-t border-crm-border/50">
                {['Chat', 'Files'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setChatTab(idx)}
                    className={`px-4 py-2.5 text-xs font-bold transition-colors ${
                      chatTab === idx
                        ? 'text-crm-primary border-b-2 border-crm-primary'
                        : 'text-crm-textMuted hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {chatTab === 0 ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {messages.map((msg) => {
                    const isOwn = (msg.sender?._id || msg.senderId) === user._id;
                    return (
                      <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? 'bg-crm-primary text-white'
                              : 'bg-crm-darker border border-crm-border text-crm-text'
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-[10px] font-semibold text-crm-textMuted mb-1">{msg.sender?.name}</p>
                          )}
                          {msg.fileUrl ? (
                            renderFileAttachment(msg)
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                          )}
                          <p className="text-[10px] opacity-60 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {isTypingRemote && (
                    <p className="text-xs text-emerald-400 animate-pulse">Someone is typing...</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-crm-border relative">
                  {showMentions && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 glass-panel border border-crm-border rounded-xl overflow-hidden z-20 max-h-64 overflow-y-auto custom-scrollbar">
                      <div className="px-3 py-2 border-b border-crm-border flex items-center gap-2 bg-crm-darker/50">
                        <AtSign size={14} className="text-crm-primary" />
                        <span className="text-[10px] font-bold text-crm-textMuted uppercase">Mention member</span>
                      </div>
                      {filteredMentions.length > 0 ? (
                        filteredMentions.map((m) => (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => handleMentionSelect(m)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-crm-primary/10 text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-crm-primary/20 flex items-center justify-center text-crm-primary text-sm font-bold">
                              {m.name?.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-white">{m.name}</span>
                          </button>
                        ))
                      ) : (
                        <p className="p-3 text-xs text-crm-textMuted text-center">No users found</p>
                      )}
                    </div>
                  )}

                  {selectedFile && (
                    <div className="mb-2 px-3 py-2 rounded-xl bg-crm-darker border border-crm-border flex items-center gap-2 text-sm text-white">
                      {selectedFile.preview && !selectedFile.isVideo ? (
                        <img src={selectedFile.preview} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : selectedFile.preview && selectedFile.isVideo ? (
                        <video src={selectedFile.preview} className="w-14 h-10 rounded" />
                      ) : (
                        <Paperclip size={18} className="text-crm-textMuted" />
                      )}
                      <span className="flex-1 truncate text-xs font-medium">{selectedFile.file.name}</span>
                      <button type="button" onClick={() => setSelectedFile(null)} className="text-crm-textMuted hover:text-white">
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="file"
                      hidden
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-2.5 rounded-xl hover:bg-crm-border/30 text-crm-textMuted shrink-0"
                    >
                      <Paperclip size={20} />
                    </button>
                    <input
                      ref={inputRef}
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message #${activeChannel.name}`}
                      className="flex-1 bg-crm-darker/50 border border-crm-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-crm-textMuted focus:border-crm-primary focus:outline-none"
                      disabled={uploading}
                    />
                    <button
                      type="submit"
                      disabled={uploading || (!messageInput.trim() && !selectedFile)}
                      className="glass-button p-2.5 shrink-0 disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              renderFilesTab()
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-crm-textMuted gap-3 p-6">
            <Hash size={48} className="opacity-30" />
            <p className="text-center text-sm">
              {channels.length === 0
                ? 'No channels yet. Create #general or add a new channel.'
                : 'Select a channel to begin chatting'}
            </p>
            {(user.role === 'Admin' || user.role === 'Member') && (
              <button type="button" onClick={() => setIsModalOpen(true)} className="glass-button text-sm">
                <Plus size={16} /> Create Channel
              </button>
            )}
          </div>
        )}
      </div>

      <CreateChannelModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={resolvedWorkspaceId}
        onSuccess={(newChannel) => {
          fetchData();
          if (newChannel) setActiveChannel(newChannel);
        }}
      />
    </div>
  );
};

export default ChannelChat;
