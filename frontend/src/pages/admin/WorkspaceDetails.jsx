import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building, 
  Briefcase, 
  ArrowLeft, 
  Copy, 
  Check, 
  MessageSquare, 
  FolderOpen, 
  Send, 
  Paperclip, 
  Download, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  X,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { SocketContext } from '../../context/SocketContext';

const WorkspaceDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'files'
  
  // Chat state
  const [generalChannel, setGeneralChannel] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null); // null means General Chat
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // File state
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Local file to upload

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch Workspace Meta & Channels & Members
  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        // Fetch all workspaces and filter current
        const wsRes = await api.get('/workspaces');
        const foundWs = wsRes.data.find(w => w._id === id);
        if (!foundWs) {
          toast.error('Workspace not found');
          navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces');
          return;
        }
        setWorkspace(foundWs);

        // Fetch Channels (to find general channel)
        const channelsRes = await api.get(`/channels/${id}`);
        const general = channelsRes.data.find(c => c.name === 'general');
        setGeneralChannel(general);

        // Fetch Members
        const membersRes = await api.get(`/workspaces/${id}/members`);
        setMembers(membersRes.data);
      } catch (err) {
        console.error('Failed to load workspace:', err);
        toast.error('Error loading workspace details');
      }
    };

    loadWorkspaceData();
  }, [id, type, navigate]);

  // Handle Online Users via Socket
  useEffect(() => {
    if (!socket || !user) return;

    // Request online list
    socket.emit('setup', user);

    const handleGetOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => prev.filter(uid => uid !== userId));
    };

    socket.on('get_online_users', handleGetOnlineUsers);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('get_online_users', handleGetOnlineUsers);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket, user]);

  // Fetch messages when Active Chat target changes
  useEffect(() => {
    const fetchChatMessages = async () => {
      setMessages([]);
      setRemoteTyping(false);
      
      if (selectedMember) {
        // Fetch DMs
        setLoadingMessages(true);
        try {
          const res = await api.get(`/messages/direct/${selectedMember._id}`, {
            params: { workspaceId: id }
          });
          setMessages(res.data);
          scrollToBottom();
        } catch (err) {
          console.error(err);
          toast.error('Failed to load direct messages');
        } finally {
          setLoadingMessages(false);
        }
      } else if (generalChannel) {
        // Fetch general channel messages
        setLoadingMessages(true);
        try {
          const res = await api.get(`/messages/${generalChannel._id}`);
          setMessages(res.data);
          scrollToBottom();
        } catch (err) {
          console.error(err);
          toast.error('Failed to load general chat');
        } finally {
          setLoadingMessages(false);
        }
      }
    };

    fetchChatMessages();

    // Join channel if general chat is selected
    if (socket && generalChannel && !selectedMember) {
      socket.emit('join_channel', generalChannel._id);
    }
  }, [selectedMember, generalChannel, id, socket]);

  // Socket Live Message & Typing Listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessage) => {
      const msgChannelId = newMessage.channelId || newMessage.channel?._id || newMessage.channel;
      const msgSenderId = (newMessage.sender?._id || newMessage.sender).toString();
      const msgReceiverId = (newMessage.receiverId || newMessage.receiver?._id || newMessage.receiver)?.toString();
      const msgWorkspaceId = newMessage.workspaceId;

      if (newMessage.isDirectMessage) {
        // Check if DM belongs to this workspace context
        if (msgWorkspaceId === id) {
          // If we are currently chatting with the sender or receiver
          const isCurrentDM = selectedMember && 
            ((msgSenderId === selectedMember._id && msgReceiverId === user._id) || 
             (msgSenderId === user._id && msgReceiverId === selectedMember._id));
             
          if (isCurrentDM) {
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
          }
        }
      } else {
        // General Channel Chat message
        if (generalChannel && msgChannelId === generalChannel._id) {
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      }

      // If files tab or files active, refresh files list on new file attachment
      if (newMessage.fileUrl) {
        fetchFiles();
      }
    };

    const handleTyping = (room) => {
      const activeRoomId = selectedMember ? selectedMember._id : generalChannel?._id;
      if (room === activeRoomId) {
        setRemoteTyping(true);
      }
    };

    const handleStopTyping = (room) => {
      const activeRoomId = selectedMember ? selectedMember._id : generalChannel?._id;
      if (room === activeRoomId) {
        setRemoteTyping(false);
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, selectedMember, generalChannel, id, user]);

  // Fetch Files
  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await api.get(`/messages/workspace/${id}/files`);
      setFiles(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workspace files');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'files') {
      fetchFiles();
    }
  }, [activeTab, id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageInput(val);

    if (!socket) return;
    const roomId = selectedMember ? selectedMember._id : generalChannel?._id;
    if (!roomId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', roomId);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', roomId);
      setIsTyping(false);
    }, 2000);
  };

  // Upload file to server helper
  const uploadAttachment = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data; // Resolves with { url, format, filename, size }
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;

    let fileData = null;
    if (selectedFile) {
      setUploadingFile(true);
      try {
        fileData = await uploadAttachment(selectedFile);
        setSelectedFile(null);
      } catch (err) {
        console.error(err);
        toast.error('File upload failed');
        setUploadingFile(false);
        return;
      }
    }

    try {
      const payload = {
        content: messageInput.trim() || `Shared file: ${fileData?.filename}`,
        workspaceId: id,
        fileUrl: fileData?.url || null,
        fileType: fileData?.format || null
      };

      if (selectedMember) {
        payload.isDirectMessage = true;
        payload.receiverId = selectedMember._id;
      } else {
        payload.channelId = generalChannel._id;
      }

      const res = await api.post('/messages', payload);

      // Append locally and scroll
      setMessages(prev => [...prev, res.data]);
      setMessageInput('');
      scrollToBottom();

      // Emit live socket event
      if (socket) {
        socket.emit('new_message', res.data);
        const roomId = selectedMember ? selectedMember._id : generalChannel?._id;
        socket.emit('stop_typing', roomId);
        setIsTyping(false);
      }

      // If file was uploaded, sync files tab count
      if (fileData) {
        toast.success('File shared successfully!');
        if (activeTab === 'files') {
          fetchFiles();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    } finally {
      setUploadingFile(false);
    }
  };

  // Direct File Upload from Files Tab
  const handleDirectFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileData = await uploadAttachment(file);
      // Create a dummy/system workspace post for this file
      const payload = {
        content: `Uploaded file to repository: ${file.name}`,
        workspaceId: id,
        fileUrl: fileData.url,
        fileType: fileData.format,
        channelId: generalChannel?._id
      };
      
      const res = await api.post('/messages', payload);
      
      if (socket) {
        socket.emit('new_message', res.data);
      }

      toast.success('File uploaded successfully!');
      fetchFiles();
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  // Invite Code Copy Utility
  const [copied, setCopied] = useState(false);
  const copyInviteCode = () => {
    if (!workspace?.inviteCode) return;
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopied(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileCategoryIcon = (fileType) => {
    const typeStr = (fileType || 'other').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'image'].includes(typeStr)) {
      return <ImageIcon className="text-emerald-400" size={24} />;
    }
    if (['mp4', 'mov', 'avi', 'webm', 'video'].includes(typeStr)) {
      return <Video className="text-rose-400" size={24} />;
    }
    return <FileText className="text-violet-400" size={24} />;
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
      {/* Detail Header */}
      <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(type === 'office' ? '/admin/office-workspaces' : '/admin/client-workspaces')}
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
            <p className="text-xs text-crm-textMuted truncate max-w-md mt-0.5">{workspace.description || 'No description'}</p>
          </div>
        </div>

        {/* Tab switch and Invite info */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Invite Code display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-crm-darker/60 border border-crm-border rounded-lg text-xs font-mono">
            <span className="text-crm-textMuted">Invite Code:</span>
            <span className="text-white font-bold tracking-wide">{workspace.inviteCode}</span>
            <button 
              onClick={copyInviteCode}
              className="text-crm-textMuted hover:text-white transition-colors ml-1"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Switcher Tab Buttons */}
          <div className="flex bg-crm-darker/50 p-1 border border-crm-border rounded-lg">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chat' ? 'bg-crm-primary text-white shadow-md' : 'text-crm-textMuted hover:text-white'
              }`}
            >
              <MessageSquare size={14} /> Chat
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'files' ? 'bg-crm-primary text-white shadow-md' : 'text-crm-textMuted hover:text-white'
              }`}
            >
              <FolderOpen size={14} /> Files
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 border border-crm-border rounded-2xl overflow-hidden glass-panel bg-crm-card/40">
            {/* Sidebar list of channels/members */}
            <div className="lg:col-span-1 border-r border-crm-border/60 flex flex-col min-h-0 bg-crm-darker/10">
              <div className="p-4 border-b border-crm-border/40 font-semibold text-xs text-crm-textMuted uppercase tracking-wider">
                Rooms & Members
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {/* General Workspace Chat option */}
                <button
                  onClick={() => setSelectedMember(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    !selectedMember 
                      ? 'bg-crm-primary/20 border border-crm-primary/40 text-white font-semibold' 
                      : 'text-crm-textMuted hover:bg-crm-border/30 hover:text-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center text-white shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">General Chat</p>
                    <p className="text-[10px] text-crm-textMuted truncate">Open channel</p>
                  </div>
                </button>

                <div className="pt-4 pb-2 px-3 text-[10px] font-semibold text-crm-textMuted uppercase tracking-wider">
                  Direct Messages
                </div>

                {/* Filter out current user from listing */}
                {members.filter(m => m._id !== user?._id).map((member) => {
                  const isOnline = onlineUsers.includes(member._id);
                  return (
                    <button
                      key={member._id}
                      onClick={() => setSelectedMember(member)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative ${
                        selectedMember?._id === member._id 
                          ? 'bg-crm-primary/20 border border-crm-primary/40 text-white font-semibold' 
                          : 'text-crm-textMuted hover:bg-crm-border/30 hover:text-white'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {member.profileImage ? (
                          <img src={member.profileImage} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-crm-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-crm-dark border border-crm-border flex items-center justify-center text-xs font-bold text-crm-text capitalize">
                            {member.name.substring(0, 2)}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-crm-card ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{member.name}</p>
                        <p className="text-[10px] text-crm-textMuted uppercase">{member.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Box Container */}
            <div className="lg:col-span-3 flex flex-col min-h-0 bg-crm-darker/5">
              {/* Active Header */}
              <div className="p-4 border-b border-crm-border/40 flex items-center justify-between shrink-0 bg-crm-darker/20">
                <div className="flex items-center gap-3">
                  {selectedMember ? (
                    <>
                      <div className="relative">
                        {selectedMember.profileImage ? (
                          <img src={selectedMember.profileImage} alt={selectedMember.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-crm-primary/10 border border-crm-primary/20 flex items-center justify-center font-bold text-crm-primary uppercase">
                            {selectedMember.name.substring(0, 2)}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-crm-card ${
                          onlineUsers.includes(selectedMember._id) ? 'bg-emerald-500' : 'bg-slate-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{selectedMember.name}</h3>
                        <p className="text-xs text-crm-textMuted capitalize">{selectedMember.role} Member</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center text-white">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">General Workspace Chat</h3>
                        <p className="text-xs text-crm-textMuted">Broadcast messages to everyone in the workspace</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Log messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-crm-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-crm-textMuted space-y-2 p-8">
                    <MessageSquare size={48} className="text-crm-border/60" />
                    <p className="text-sm font-semibold">No messages yet</p>
                    <p className="text-xs">Type your message below and click send to initiate conversation.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = (msg.senderId || msg.sender?._id) === user?._id;
                    const date = new Date(msg.createdAt);
                    
                    return (
                      <div key={msg._id || index} className={`flex gap-3 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {!isOwn && (
                          <div className="shrink-0">
                            {msg.sender?.profileImage ? (
                              <img src={msg.sender.profileImage} alt={msg.sender.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-crm-border/60 flex items-center justify-center text-xs font-bold text-white capitalize">
                                {msg.sender?.name?.substring(0, 2) || 'U'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content bubble */}
                        <div>
                          {/* Sender name info */}
                          {!isOwn && (
                            <p className="text-xs text-crm-textMuted font-medium mb-1 ml-1">{msg.sender?.name}</p>
                          )}
                          <div className={`p-3.5 rounded-2xl ${
                            isOwn 
                              ? 'bg-crm-primary text-white rounded-tr-none' 
                              : 'bg-crm-card text-crm-text border border-crm-border/60 rounded-tl-none'
                          }`}>
                            {/* Message text */}
                            <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>

                            {/* File layout attachment */}
                            {msg.fileUrl && (
                              <div className="mt-3 p-3 bg-crm-darker/60 border border-crm-border/40 rounded-xl flex items-center justify-between gap-4 max-w-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  {getFileCategoryIcon(msg.fileType)}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate" title={msg.fileUrl.split('/').pop()}>
                                      {msg.fileUrl.split('/').pop()}
                                    </p>
                                    <p className="text-[10px] text-crm-textMuted uppercase">{msg.fileType || 'file'}</p>
                                  </div>
                                </div>
                                <a 
                                  href={msg.fileUrl} 
                                  download 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-crm-border hover:bg-crm-primary text-crm-textMuted hover:text-white rounded-lg transition-all"
                                  title="Download File"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            )}
                          </div>
                          
                          {/* Time */}
                          <p className={`text-[10px] text-crm-textMuted mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Anchored ref scroll */}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing remote indicator */}
              {remoteTyping && (
                <div className="px-4 py-1.5 text-xs text-crm-textMuted flex items-center gap-1.5 shrink-0 bg-crm-darker/10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-crm-textMuted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-crm-textMuted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-crm-textMuted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{selectedMember ? `${selectedMember.name} is typing...` : 'Someone is typing...'}</span>
                </div>
              )}

              {/* Selected upload file indicator preview */}
              {selectedFile && (
                <div className="px-4 py-2 border-t border-crm-border bg-crm-darker/30 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={16} className="text-crm-primary" />
                    <span className="text-xs text-white truncate font-medium">{selectedFile.name}</span>
                    <span className="text-[10px] text-crm-textMuted">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)} 
                    className="p-1 hover:bg-crm-border rounded text-crm-textMuted hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input Chat Box bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-crm-border/60 flex items-center gap-3 shrink-0 bg-crm-darker/20">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden" 
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 hover:bg-crm-border rounded-xl text-crm-textMuted hover:text-white transition-all shrink-0"
                  title="Attach File"
                  disabled={uploadingFile}
                >
                  <Paperclip size={20} />
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder={selectedMember ? `Message @${selectedMember.name}...` : "Send message in general chat..."}
                  className="flex-1 bg-crm-dark/50 border border-crm-border hover:border-crm-border/80 focus:border-crm-primary text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none placeholder-crm-textMuted transition-all"
                  disabled={uploadingFile}
                />

                <button
                  type="submit"
                  className="p-2.5 bg-crm-primary hover:bg-crm-primaryHover text-white rounded-xl shadow-md hover:shadow-glow transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={(!messageInput.trim() && !selectedFile) || uploadingFile}
                  title="Send Message"
                >
                  <Send size={20} className={uploadingFile ? "animate-pulse" : ""} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Files repository tab */
          <div className="h-full border border-crm-border rounded-2xl flex flex-col min-h-0 glass-panel bg-crm-card/40">
            <div className="p-4 border-b border-crm-border/60 flex justify-between items-center shrink-0 bg-crm-darker/20">
              <div>
                <h3 className="font-bold text-white text-sm">Workspace File Depository</h3>
                <p className="text-xs text-crm-textMuted">Repository of all attachments shared within this workspace</p>
              </div>
              <div>
                <input 
                  type="file" 
                  id="direct-file-upload" 
                  onChange={handleDirectFileUpload}
                  className="hidden" 
                  disabled={uploadingFile}
                />
                <label 
                  htmlFor="direct-file-upload"
                  className={`glass-button inline-flex items-center gap-2 cursor-pointer text-xs font-medium py-2 px-3 ${
                    uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Paperclip size={14} /> {uploadingFile ? 'Uploading...' : 'Upload File'}
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loadingFiles ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-crm-primary"></div>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-crm-textMuted space-y-2">
                  <FolderOpen size={48} className="text-crm-border/60" />
                  <p className="text-sm font-semibold">No files in this workspace yet</p>
                  <p className="text-xs">Any documents or images uploaded in chat will automatically compile here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {files.map((file) => {
                    const originalName = file.fileUrl.split('/').pop();
                    const createdDate = new Date(file.createdAt).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    
                    return (
                      <div key={file._id} className="glass-card p-4 flex flex-col justify-between group border border-crm-border/50 hover:border-crm-primary/40 relative">
                        {/* Download button hover panel */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={file.fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-crm-darker/80 text-crm-textMuted hover:text-white rounded-lg hover:bg-crm-primary transition-all flex items-center justify-center"
                            title="Download File"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                        
                        <div>
                          {/* File Icon */}
                          <div className="w-11 h-11 rounded-xl bg-crm-darker/50 flex items-center justify-center mb-3">
                            {getFileCategoryIcon(file.fileType)}
                          </div>
                          
                          {/* Name and uploader info */}
                          <p className="text-sm font-semibold text-white truncate pr-6 mb-1" title={originalName}>
                            {originalName}
                          </p>
                          
                          <p className="text-[10px] text-crm-textMuted flex items-center gap-1">
                            <Clock size={10} />
                            Shared by {file.sender?.name || 'User'}
                          </p>
                        </div>

                        {/* Date / Size */}
                        <div className="mt-4 pt-3 border-t border-crm-border/40 flex justify-between items-center text-[10px] text-crm-textMuted">
                          <span>{createdDate}</span>
                          <span className="uppercase font-semibold tracking-wider px-1.5 py-0.5 bg-crm-darker/40 border border-crm-border/30 rounded">
                            {file.fileType || 'file'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceDetails;
