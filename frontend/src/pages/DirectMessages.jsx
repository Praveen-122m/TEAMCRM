import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Paperclip, Download, X, MessageSquare, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { messageService } from '../services/messageService';
import { workspaceService } from '../services/workspaceService';
import api from '../services/api';
import { resolveMediaUrl, isImageFile, isVideoFile, fileDisplayName } from '../utils/mediaUrl';

const DirectMessages = () => {
  const { user, activeWorkspace, setActiveWorkspace } = useAuth();
  const { socket, isConnected, clearUnread } = useContext(SocketContext);
  const location = useLocation();

  const [members, setMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sideTab, setSideTab] = useState('people');
  const [remoteTyping, setRemoteTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const workspaceId = activeWorkspace || user?.workspaces?.[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSidebar = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      const [memRes, convRes] = await Promise.all([
        workspaceService.getMembers(workspaceId),
        messageService.getConversations(workspaceId),
      ]);
      setMembers(memRes.data.filter((m) => m._id !== user._id));
      setConversations(convRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, user._id]);

  useEffect(() => {
    loadSidebar();
  }, [loadSidebar]);

  useEffect(() => {
    const preselect = location.state?.selectedUser;
    if (preselect) {
      setSelectedUser(preselect);
      clearUnread?.(preselect._id);
    }
  }, [location.state, clearUnread]);

  const loadThread = useCallback(async () => {
    if (!selectedUser || !workspaceId) return;
    try {
      const res = await messageService.getDirectMessages(selectedUser._id, workspaceId);
      setMessages(res.data);
      scrollToBottom();
      if (socket?.connected) {
        socket.emit('join_channel', selectedUser._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversation');
    }
  }, [selectedUser, workspaceId, socket]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const onMessage = (msg) => {
      if (!msg.isDirectMessage) return;
      const senderId = (msg.sender?._id || msg.sender || msg.senderId || '').toString();
      const receiverId = (msg.receiverId || msg.receiver?._id || msg.receiver || '').toString();
      const myId = user._id.toString();
      const otherId = selectedUser._id.toString();

      const isThisThread =
        (senderId === otherId && receiverId === myId) ||
        (senderId === myId && receiverId === otherId);

      if (!isThisThread) return;
      if (msg.workspaceId && msg.workspaceId !== workspaceId) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    };

    const onTyping = (room) => {
      if (room?.toString() === selectedUser._id.toString()) setRemoteTyping(true);
    };
    const onStopTyping = (room) => {
      if (room?.toString() === selectedUser._id.toString()) setRemoteTyping(false);
    };

    socket.on('message_received', onMessage);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);

    return () => {
      socket.off('message_received', onMessage);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
    };
  }, [socket, selectedUser, user._id, workspaceId]);

  const handleSelectUser = (member) => {
    setSelectedUser(member);
    clearUnread?.(member._id);
    setSideTab('chats');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (!socket?.connected || !selectedUser) return;
    socket.emit('typing', selectedUser._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', selectedUser._id);
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedUser || !workspaceId) return;
    if (!input.trim() && !selectedFile) return;

    let fileData = null;
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        const up = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileData = { url: up.data.url, type: up.data.format, name: selectedFile.name };
      } catch {
        toast.error('File upload failed');
        setUploading(false);
        return;
      }
    }

    try {
      const res = await messageService.sendMessage({
        content: input.trim() || `Shared file: ${fileData?.name}`,
        workspaceId,
        isDirectMessage: true,
        receiverId: selectedUser._id,
        fileUrl: fileData?.url,
        fileType: fileData?.type,
      });
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setInput('');
      setSelectedFile(null);
      scrollToBottom();
      loadSidebar();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const renderAttachment = (msg) => {
    const url = resolveMediaUrl(msg.fileUrl);
    const name = fileDisplayName(msg);
    if (isImageFile(msg.fileType, msg.fileUrl)) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-xs">
          <img src={url} alt={name} className="max-w-full" />
          <a href={url} download={name} className="block text-center text-xs py-2 text-crm-primary hover:underline">
            Download
          </a>
        </div>
      );
    }
    if (isVideoFile(msg.fileType, msg.fileUrl)) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-sm">
          <video src={url} controls className="w-full max-h-48" />
          <a href={url} download={name} className="flex items-center gap-1 text-xs py-2 px-2 text-crm-primary">
            <Download size={14} /> Download
          </a>
        </div>
      );
    }
    return (
      <a href={url} download={name} className="mt-2 inline-flex items-center gap-2 text-sm text-crm-primary hover:underline">
        <Download size={14} /> {name}
      </a>
    );
  };

  if (!workspaceId) {
    return (
      <div className="glass-panel p-8 text-center text-crm-textMuted">
        <p>No workspace selected. {user?.role === 'Member' ? 'Join a workspace from your dashboard first.' : 'Contact your admin.'}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-72 flex flex-col glass-panel overflow-hidden shrink-0">
        <div className="p-4 border-b border-crm-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-crm-primary" />
            Direct Messages
          </h2>
          <p className="text-xs text-crm-textMuted mt-1">Workspace chat — real-time</p>
          <span className={`inline-flex items-center gap-1 text-[10px] mt-2 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>

        <div className="flex border-b border-crm-border">
          {['people', 'chats'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSideTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold capitalize ${
                sideTab === tab ? 'text-crm-primary border-b-2 border-crm-primary' : 'text-crm-textMuted'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <p className="text-center text-sm text-crm-textMuted py-8">Loading...</p>
          ) : sideTab === 'people' ? (
            members.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => handleSelectUser(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left mb-1 transition-colors ${
                  selectedUser?._id === m._id
                    ? 'bg-crm-primary/20 border border-crm-primary/40'
                    : 'hover:bg-crm-border/30'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold text-sm">
                  {m.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-crm-textMuted uppercase">{m.role}</p>
                </div>
              </button>
            ))
          ) : conversations.length === 0 ? (
            <p className="text-center text-xs text-crm-textMuted py-6">No conversations yet</p>
          ) : (
            conversations.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => handleSelectUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left mb-1 ${
                  selectedUser?._id === u._id ? 'bg-crm-primary/20' : 'hover:bg-crm-border/30'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm">
                  {u.name?.charAt(0)}
                </div>
                <p className="text-sm font-medium text-white truncate">{u.name}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col glass-panel overflow-hidden min-w-0">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-crm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center text-white font-bold">
                {selectedUser.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white">{selectedUser.name}</h3>
                <p className="text-xs text-crm-textMuted">{selectedUser.role} · Direct message</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isOwn = (msg.sender?._id || msg.senderId) === user._id;
                return (
                  <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOwn ? 'bg-crm-primary text-white' : 'bg-crm-darker border border-crm-border text-crm-text'}`}>
                      {!isOwn && <p className="text-[10px] font-semibold text-crm-textMuted mb-1">{msg.sender?.name}</p>}
                      {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                      {msg.fileUrl && renderAttachment(msg)}
                      <p className="text-[10px] opacity-60 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {remoteTyping && (
                <p className="text-xs text-emerald-400 animate-pulse">{selectedUser.name} is typing...</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedFile && (
              <div className="px-4 py-2 border-t border-crm-border flex items-center justify-between text-sm text-white">
                <span className="truncate">{selectedFile.name}</span>
                <button type="button" onClick={() => setSelectedFile(null)}><X size={16} /></button>
              </div>
            )}

            <form onSubmit={handleSend} className="p-4 border-t border-crm-border flex gap-2">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*,video/*,.pdf,.doc,.docx" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl hover:bg-crm-border text-crm-textMuted" disabled={uploading}>
                <Paperclip size={20} />
              </button>
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={`Message ${selectedUser.name}...`}
                className="flex-1 bg-crm-darker/50 border border-crm-border rounded-xl px-4 py-2.5 text-sm text-white focus:border-crm-primary focus:outline-none"
                disabled={uploading}
              />
              <button type="submit" disabled={uploading || (!input.trim() && !selectedFile)} className="glass-button p-2.5 disabled:opacity-50">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-crm-textMuted gap-2">
            <Users size={48} className="opacity-30" />
            <p>Select a team member to start a direct chat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessages;
