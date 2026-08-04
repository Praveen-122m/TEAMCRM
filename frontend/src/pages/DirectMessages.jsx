import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
 Send, Paperclip, Download, X, MessageSquare, Users, Trash2, 
 CornerUpLeft, Pin, PinOff, FileText, Check, CheckCheck, Copy, ChevronDown, 
 Info, Bell, ExternalLink, Globe, UserPlus, LogOut, CheckCircle2,
 Plus, Hash, Search, Image, Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { messageService } from '../services/messageService';
import { workspaceService } from '../services/workspaceService';
import api from '../services/api';
import { resolveMediaUrl, isImageFile, isVideoFile, fileDisplayName } from '../utils/mediaUrl';
import { downloadMediaFile } from '../utils/downloadFile';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { UserProfileModal } from '../components/modals/UserProfileModal';
import { SlimSidebar } from '../components/SlimSidebar';

const formatDateForHeader = (dateStr) => {
 if (!dateStr) return '';
 const date = new Date(dateStr);
 const today = new Date();
 const yesterday = new Date();
 yesterday.setDate(yesterday.getDate() - 1);

 if (date.toDateString() === today.toDateString()) return 'Today';
 if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
 
 return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

const DirectMessages = () => {
 const { user, activeWorkspace, setActiveWorkspace } = useAuth();
 const { socket, isConnected, clearUnread, onlineUsers = [] } = useContext(SocketContext) || {};
 const location = useLocation();
 const navigate = useNavigate();
 const { confirm } = useConfirm();

 const workspaceId = useMemo(() => {
 if (location.state?.workspaceId) {
 return location.state.workspaceId.toString();
 }
 const ws = activeWorkspace || user?.workspaces?.[0];
 return ws?.toString?.() || ws;
 }, [activeWorkspace, user?.workspaces, location.state?.workspaceId]);

 // Sync active workspace context globally if passed in navigation state
 useEffect(() => {
 const stateWsId = location.state?.workspaceId;
 if (stateWsId && stateWsId !== activeWorkspace) {
 setActiveWorkspace(stateWsId);
 }
 }, [location.state?.workspaceId, activeWorkspace, setActiveWorkspace]);

 // Redesign Layout State
 const [activeTab, setActiveTab] = useState('Chat'); // 'Chat', 'Files', 'Pinned', 'Links'
 const [showRightSidebar, setShowRightSidebar] = useState(true);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [workspaces, setWorkspaces] = useState([]);
 const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
 const [channels, setChannels] = useState([]);
 const [openAccordions, setOpenAccordions] = useState({
 files: false,
 pinned: false,
 links: false
 });

 const toggleAccordion = (sec) => {
 setOpenAccordions(prev => ({ ...prev, [sec]: !prev[sec] }));
 };

 const [members, setMembers] = useState([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [conversations, setConversations] = useState([]);
 const [selectedUser, setSelectedUser] = useState(null);
 const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
 const [selectedFiles, setSelectedFiles] = useState([]);
 const [isBulkDeleting, setIsBulkDeleting] = useState(false);

 const filteredTeammates = useMemo(() => {
 return members.filter((m) =>
 (m.name || '').toLowerCase().includes(searchTerm.toLowerCase())
 );
 }, [members, searchTerm]);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [pendingUploads, setPendingUploads] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
 const [loading, setLoading] = useState(true);
 const [uploading, setUploading] = useState(false);
 const [sideTab, setSideTab] = useState('people');
 const [remoteTyping, setRemoteTyping] = useState(false);
 
 // Profile Click Modal State
 const [clickedUserId, setClickedUserId] = useState(null);
 const [isProfileOpen, setIsProfileOpen] = useState(false);

 // Message Replies & Pins
 const [pinnedMessages, setPinnedMessages] = useState([]);
 const [showPinnedModal, setShowPinnedModal] = useState(false);
 const [deletingMsgId, setDeletingMsgId] = useState(null);
 const [selectedMessage, setSelectedMessage] = useState(null);

 useEffect(() => {
 setSelectedMessage(null);
 setActiveTab('Chat');
 }, [selectedUser]);

 const fetchPinnedMessages = useCallback(async () => {
 if (!workspaceId || !selectedUser?._id) return;
 try {
 const res = await api.get(`/messages/pinned?workspaceId=${workspaceId}&receiverId=${selectedUser._id}`);
 setPinnedMessages(res.data);
 } catch (err) {
 console.error('Failed to load pinned messages', err);
 }
 }, [workspaceId, selectedUser?._id]);

 useEffect(() => {
 fetchPinnedMessages();
 }, [fetchPinnedMessages]);

 const handlePin = async (msg) => {
 try {
 const res = await api.put(`/messages/${msg._id}/pin`);
 toast.success('Message pinned');
 setMessages((prev) => prev.map(m => m._id === msg._id ? res.data : m));
 fetchPinnedMessages();
 } catch (err) {
 toast.error(err.response?.data?.message || 'Failed to pin message');
 }
 };

 const handleUnpin = async (msg) => {
 const confirmed = await confirm({
 title: 'Unpin message?',
 message: 'Are you sure you want to unpin this message?'
 });
 if (!confirmed) return;
 try {
 const res = await api.put(`/messages/${msg._id}/unpin`);
 toast.success('Message unpinned');
 setMessages((prev) => prev.map(m => m._id === msg._id ? res.data : m));
 fetchPinnedMessages();
 } catch (err) {
 toast.error(err.response?.data?.message || 'Failed to unpin message');
 }
 };

 const handleDeleteMessage = async (msg) => {
 const confirmed = await confirm({
 title: 'Delete message?',
 message: 'This action cannot be undone. All related data will be permanently removed.'
 });
 if (!confirmed) return;
 try {
 await api.delete(`/messages/${msg._id}`);
 toast.success('Message deleted');
 setMessages((prev) => prev.filter((m) => m._id !== msg._id));
 setDeletingMsgId(null);
 if (msg.isPinned) {
 fetchPinnedMessages();
 }
 } catch (err) {
 setDeletingMsgId(null);
 toast.error(err.response?.data?.message || 'Failed to delete message');
 }
 };

  const handleBulkDeleteFiles = async () => {
    if (selectedFiles.length === 0) return;
    const confirmed = await confirm({
      title: `Delete ${selectedFiles.length} files?`,
      message: 'This action cannot be undone. Selected files will be permanently removed.'
    });
    if (!confirmed) return;
    
    setIsBulkDeleting(true);
    try {
      const promises = selectedFiles.map(id => api.delete(`/messages/${id}`));
      await Promise.all(promises);
      toast.success(`${selectedFiles.length} files deleted successfully`);
      setMessages(prev => prev.filter(m => !selectedFiles.includes(m._id)));
      setSelectedFiles([]);
    } catch (err) {
      toast.error('Failed to delete some files');
    } finally {
      setIsBulkDeleting(false);
    }
  };

 const scrollToMessage = (msgId) => {
 const el = document.getElementById(`msg-${msgId}`);
 if (el) {
 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
 el.classList.add('ring-2', 'ring-crm-primary', 'duration-300');
 setTimeout(() => {
 el.classList.remove('ring-2', 'ring-crm-primary');
 }, 2000);
 } else {
 toast.error('Original message not found in this view');
 }
 };

 const handleOpenProfile = (id) => {
 const targetId = id || selectedUser?._id || selectedUser?.id;
 console.log('[handleOpenProfile] opening profile modal for targetId:', targetId);
 if (!targetId) {
 toast.error('User ID is missing');
 return;
 }
 setClickedUserId(targetId);
 setIsProfileOpen(true);
 };

 const messagesEndRef = useRef(null);
 const fileInputRef = useRef(null);
 const inputRef = useRef(null);
 const typingTimeoutRef = useRef(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 const loadSidebar = useCallback(async () => {
 if (!workspaceId) {
 setLoading(false);
 return;
 }
 try {
 const [memRes, convRes, chRes] = await Promise.all([
 workspaceService.getMembers(workspaceId),
 messageService.getConversations(workspaceId),
 api.get(`/channels/${workspaceId}`)
 ]);
 setMembers(memRes.data.filter((m) => m._id !== user._id));
 setConversations(convRes.data);
 setChannels(chRes.data);
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

 // Fetch workspaces list for switcher
 useEffect(() => {
 const fetchWorkspaces = async () => {
 try {
 const res = await api.get('/workspaces');
 setWorkspaces(res.data);
 } catch (err) {
 console.error('Failed to fetch workspaces', err);
 }
 };
 fetchWorkspaces();
 }, []);

 const activeWorkspaceObj = useMemo(() => {
 return workspaces.find(w => w._id?.toString() === workspaceId?.toString());
 }, [workspaces, workspaceId]);

 const currentWorkspaceName = activeWorkspaceObj?.name || 'Workspace';
 const workspaceInitial = currentWorkspaceName.charAt(0).toUpperCase();

 const handleSwitchWorkspace = async (wsId, wsName) => {
 await setActiveWorkspace(wsId, wsName);
 setShowWorkspaceDropdown(false);
 navigate('/messages', { state: null });
 };

 useEffect(() => {
 const preselect = location.state?.selectedUser;
 if (preselect) {
 setSelectedUser(preselect);
 clearUnread?.(preselect._id);
 navigate(location.pathname, { replace: true, state: {} });
 } else if (location.state?.selectUserId && members.length > 0) {
 const targetMember = members.find(m => m._id === location.state.selectUserId);
 if (targetMember) {
 setSelectedUser(targetMember);
 clearUnread?.(targetMember._id);
 navigate(location.pathname, { replace: true, state: {} });
 }
 }
 }, [location.state, members, clearUnread, navigate, location.pathname]);

  const loadThread = useCallback(async () => {
    if (!selectedUser || !workspaceId) return;
    try {
      setPage(1);
      setHasMore(true);
      const res = await messageService.getDirectMessages(selectedUser._id, workspaceId, 1, 150);
      setMessages(res.data);
      if (res.data.length < 150) setHasMore(false);
      
      messageService.getDirectMessageAttachments(selectedUser._id, workspaceId)
        .then(attRes => setAttachments(attRes.data))
        .catch(console.error);

      scrollToBottom();
      if (socket?.connected) {
        socket.emit('join_channel', selectedUser._id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversation');
    }
  }, [selectedUser, workspaceId, socket]);

  const handleScroll = async (e) => {
    if (e.target.scrollTop === 0 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        const nextPage = page + 1;
        const res = await messageService.getDirectMessages(selectedUser._id, workspaceId, nextPage, 150);
        if (res.data.length < 150) setHasMore(false);
        setPage(nextPage);
        
        const scrollHeight = e.target.scrollHeight;
        setMessages(prev => [...res.data, ...prev]);

        setTimeout(() => {
           e.target.scrollTop = e.target.scrollHeight - scrollHeight;
        }, 0);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

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

 const pinListener = (pinnedMsg) => {
 if (pinnedMsg.isDirectMessage) {
 const senderId = (pinnedMsg.senderId || pinnedMsg.sender?._id || '').toString();
 const receiverId = (pinnedMsg.receiverId || pinnedMsg.receiver?._id || '').toString();
 const myId = user._id.toString();
 const otherId = selectedUser._id.toString();
 const isThisThread =
 (senderId === otherId && receiverId === myId) ||
 (senderId === myId && receiverId === otherId);
 if (isThisThread) {
 setMessages((prev) => prev.map(m => m._id === pinnedMsg._id ? pinnedMsg : m));
 fetchPinnedMessages();
 }
 }
 };

 const unpinListener = (unpinnedMsg) => {
 if (unpinnedMsg.isDirectMessage) {
 const senderId = (unpinnedMsg.senderId || unpinnedMsg.sender?._id || '').toString();
 const receiverId = (unpinnedMsg.receiverId || unpinnedMsg.receiver?._id || '').toString();
 const myId = user._id.toString();
 const otherId = selectedUser._id.toString();
 const isThisThread =
 (senderId === otherId && receiverId === myId) ||
 (senderId === myId && receiverId === otherId);
 if (isThisThread) {
 setMessages((prev) => prev.map(m => m._id === unpinnedMsg._id ? unpinnedMsg : m));
 fetchPinnedMessages();
 }
 }
 };

 const deleteListener = (deletedId) => {
 setMessages((prev) => prev.filter((m) => m._id !== deletedId));
 fetchPinnedMessages();
 };

 socket.on('message_received', onMessage);
 socket.on('typing', onTyping);
 socket.on('stop_typing', onStopTyping);
 socket.on('message_pinned', pinListener);
 socket.on('message_unpinned', unpinListener);
 socket.on('message_deleted', deleteListener);

 return () => {
 socket.off('message_received', onMessage);
 socket.off('typing', onTyping);
 socket.off('stop_typing', onStopTyping);
 socket.off('message_pinned', pinListener);
 socket.off('message_unpinned', unpinListener);
 socket.off('message_deleted', deleteListener);
 };
 }, [socket, selectedUser, user._id, workspaceId, fetchPinnedMessages]);

 const handleSelectUser = (member) => {
 setSelectedUser(member);
 setActiveTab('Chat');
 clearUnread?.(member._id);
 };

 const handleInputChange = (e) => {
 const val = e.target.value;
 setInput(val);

 if (inputRef.current) {
 inputRef.current.style.height = 'auto';
 const scrollHeight = inputRef.current.scrollHeight;
 inputRef.current.style.height = `${Math.min(scrollHeight, 128)}px`;
 inputRef.current.style.overflowY = scrollHeight > 128 ? 'auto' : 'hidden';
 }

 if (!socket?.connected || !selectedUser) return;
 socket.emit('typing', selectedUser._id);
 if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
 typingTimeoutRef.current = setTimeout(() => {
 socket.emit('stop_typing', selectedUser._id);
 }, 2000);
 };

  const handleSend = async (e) => {
  if (e) e.preventDefault();
  if (!selectedUser || !workspaceId) return;
  if (!input.trim() && pendingUploads.length === 0) return;

  const content = input.trim();
  const filesToUpload = [...pendingUploads];
  setInput('');
  setPendingUploads([]);
  if (inputRef.current) {
    inputRef.current.style.height = 'auto';
    inputRef.current.style.overflowY = 'hidden';
  }
  const currentReply = replyingTo;
  setReplyingTo(null);

  setUploading(true);
  try {
    if (filesToUpload.length > 0) {
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileObj = filesToUpload[i];
        const isFirst = i === 0;
        const formData = new FormData();
        formData.append('file', fileObj.file);
        
        const up = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const fileData = { url: up.data.url, type: up.data.format, name: fileObj.file.name };
        
        const payload = {
          content: (isFirst && content) ? content : `Shared a file: ${fileData.name}`,
          workspaceId,
          isDirectMessage: true,
          receiverId: selectedUser._id,
          fileUrl: fileData.url,
          fileType: fileData.type,
        };
        
        if (currentReply && isFirst) {
          payload.replyToMessageId = currentReply._id;
          payload.replyPreview = currentReply.fileUrl
            ? (currentReply.fileType === 'audio' ? 'Voice Note' : 'Attachment')
            : currentReply.content;
        }
        
        const res = await messageService.sendMessage(payload);
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev;
          return [...prev, res.data];
        });
      }
    } else {
      const payload = {
        content,
        workspaceId,
        isDirectMessage: true,
        receiverId: selectedUser._id,
      };
      if (currentReply) {
        payload.replyToMessageId = currentReply._id;
        payload.replyPreview = currentReply.fileUrl
          ? (currentReply.fileType === 'audio' ? 'Voice Note' : 'Attachment')
          : currentReply.content;
      }
      const res = await messageService.sendMessage(payload);
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
    }
    scrollToBottom();
    loadSidebar();
  } catch (err) {
    console.error('[SEND_MSG_ERR]', err);
    const msg = err?.response?.data?.message || err?.message || 'Failed to send message';
    toast.error(msg);
  } finally {
    setUploading(false);
  }
};

 const handleSendAudio = async (blob) => {
 if (!selectedUser || !workspaceId) return;
 setUploading(true);
 const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
 const formData = new FormData();
 formData.append('file', file);

 const currentReply = replyingTo;
 setReplyingTo(null);

 try {
 const up = await api.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' },
 });
 const payload = {
 content: 'Sent a voice note',
 workspaceId,
 isDirectMessage: true,
 receiverId: selectedUser._id,
 fileUrl: up.data.url,
 fileType: 'audio',
 };
 if (currentReply) {
 payload.replyToMessageId = currentReply._id;
 payload.replyPreview = currentReply.fileUrl
 ? (currentReply.fileType === 'audio' ? 'Voice Note' : 'Attachment')
 : currentReply.content;
 }
 const res = await messageService.sendMessage(payload);
 setMessages((prev) => {
 if (prev.some((m) => m._id === res.data._id)) return prev;
 return [...prev, res.data];
 });
 scrollToBottom();
 loadSidebar();
 } catch (err) {
 console.error('[AUDIO_SEND_ERR]', err);
 toast.error('Failed to send voice note');
 } finally {
 setUploading(false);
 }
 };

 const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    
    const newUploads = files.map(file => {
      const isImage = file.type && file.type.startsWith('image/');
      const isVideo = file.type && file.type.startsWith('video/');
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: (isImage || isVideo) ? URL.createObjectURL(file) : null,
        isVideo
      };
    });
    setPendingUploads(prev => [...prev, ...newUploads]);
    // reset input so the same files can be selected again if needed
    e.target.value = '';
  };

  // Helper to extract URLs from attachments for the Links Tab
  const channelLinks = useMemo(() => {
    const urls = [];
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    attachments.forEach((msg) => {
      if (msg.content) {
        const matches = msg.content.match(urlRegex);
        if (matches) {
          matches.forEach((match) => {
            urls.push({
              _id: msg._id,
              url: match,
              sender: msg.sender,
              createdAt: msg.createdAt
            });
          });
        }
      }
    });
    return urls;
  }, [attachments]);

  const channelFiles = useMemo(() => attachments.filter((m) => m.fileUrl), [attachments]);

 // Redesign File Attachment Renderer (matches PDF style of mockup)
 const renderAttachment = (msg, isOwnArg) => {
 const url = resolveMediaUrl(msg.fileUrl);
 const name = fileDisplayName(msg);
 const isOwn = isOwnArg !== undefined ? isOwnArg : (msg.sender?._id || msg.senderId) === user._id;

 if (msg.fileType === 'audio' || msg.fileUrl?.match(/\.(mp3|wav|m4a|ogg|webm|aac)$/i)) {
 return <VoiceNotePlayer audioUrl={msg.fileUrl} isOwn={isOwn} />;
 }

  if (isImageFile(msg.fileType, msg.fileUrl)) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-[320px] w-full sm:max-w-[360px] bg-[#0b141a] group/img relative shadow-md">
 <img src={url} alt={name} className="w-full h-auto object-contain max-h-[300px] block hover:scale-[1.01] transition-transform duration-200" />
 <div className="p-2 bg-crm-darker flex justify-between items-center border-t border-crm-border">
 <span className="text-[10px] text-crm-text truncate w-3/4">{name}</span>
 <button
 type="button"
 onClick={() => downloadMediaFile(msg.fileUrl, name)}
 className="text-crm-primary hover:text-crm-primary p-1 rounded hover:bg-crm-border"
 >
 <Download size={14} />
 </button>
 </div>
 </div>
 );
 }

  if (isVideoFile(msg.fileType, msg.fileUrl)) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-crm-border max-w-[320px] w-full sm:max-w-[360px] bg-[#0b141a] shadow-md">
 <video 
            src={url} 
            controls 
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            className="w-full max-h-[300px] object-contain block" 
          />
 <div className="p-2 bg-crm-darker flex justify-between items-center border-t border-crm-border">
 <span className="text-[10px] text-crm-text truncate w-3/4">{name}</span>
 <button
 type="button"
 onClick={() => downloadMediaFile(msg.fileUrl, name)}
 className="text-crm-primary hover:text-crm-primary p-1 rounded hover:bg-crm-border"
 >
 <Download size={14} />
 </button>
 </div>
 </div>
 );
 }

 // Generic file renderer - Looks like the mock red PDF card
 const isPDF = name.toLowerCase().endsWith('.pdf');
 return (
 <div className="mt-2 rounded-xl border border-crm-border bg-crm-card p-3 flex items-center justify-between gap-4 max-w-sm">
 <div className="flex items-center gap-3 min-w-0">
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPDF ? 'bg-red-500/10 text-red-500' : 'bg-crm-primary/10 text-crm-primary'}`}>
 <FileText size={20} />
 </div>
 <div className="min-w-0">
 <p className="text-xs font-semibold text-crm-text truncate">{name}</p>
 <p className="text-[10px] text-crm-textMuted uppercase mt-0.5">{isPDF ? 'PDF Document' : 'Media File'}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => downloadMediaFile(msg.fileUrl, name)}
 title="Download file"
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-crm-dark text-crm-primary hover:text-crm-primary hover:bg-crm-border transition-colors"
 >
 <Download size={14} />
 </button>
 <a
 href={url}
 target="_blank"
 rel="noopener noreferrer"
 title="Open in new window"
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-crm-dark text-crm-primary hover:text-crm-primary hover:bg-crm-border transition-colors"
 >
 <ExternalLink size={14} />
 </a>
 </div>
 </div>
 );
 };

 // Redesign Link Preview Renderer (matches mockup link cards)
 const renderLinkPreview = (url) => {
 const isTeckPilot = url.toLowerCase().includes('teckpilot.com');
 
 const previewData = isTeckPilot ? {
 title: "TeckPilot - Channels",
 desc: "Manage team channels, collaborate efficiently, and stay organized.",
 domain: "teckpilot.com"
 } : {
 title: "Shared Link Preview",
 desc: "Click to explore this external shared web address resources.",
 domain: new URL(url.startsWith('http') ? url : 'http://' + url).hostname || 'external-link'
 };

 return (
 <div className="mt-2 rounded-xl border border-crm-border bg-crm-card p-3 flex items-center justify-between gap-4 max-w-sm cursor-pointer hover:border-crm-primary/35 transition-colors" onClick={() => window.open(url.startsWith('http') ? url : 'http://' + url, '_blank', 'noopener,noreferrer')}>
 <div className="min-w-0 flex-1">
 <span className="text-[10px] text-crm-primary hover:underline break-all truncate block">{url}</span>
 <p className="text-xs font-semibold text-crm-text mt-1 truncate">{previewData.title}</p>
 <p className="text-[10px] text-crm-textMuted mt-0.5 line-clamp-2 leading-relaxed">{previewData.desc}</p>
 </div>
 <div className="w-10 h-10 rounded-lg bg-crm-card flex items-center justify-center shrink-0 border border-crm-border">
 <Globe size={18} className="text-crm-primary" />
 </div>
 </div>
 );
 };

 const renderMessageContent = (content, isOwn) => {
 if (!content) return '';
 const regex = /((?:https?:\/\/|www\.)[^\s]+|@\w+(?:\s\w+)?)/g;
 const parts = content.split(regex);
 let linksInContent = [];

 const parsedContent = parts.map((part, i) => {
 if (part.startsWith('@')) {
 return (
 <span key={i} className={`font-bold px-1.5 py-0.5 rounded text-xs ${isOwn ? 'text-crm-primary-text bg-white/20' : 'text-crm-primary bg-crm-primary/10'}`}>
 {part}
 </span>
 );
 }
 const isUrl = /^(https?:\/\/|www\.)/i.test(part);
 if (isUrl) {
 linksInContent.push(part);
 let href = part;
 if (part.toLowerCase().startsWith('www.')) {
 href = 'http://' + part;
 }
 return (
 <a
 key={i}
 href={href}
 target="_blank"
 rel="noopener noreferrer"
 className={`underline font-semibold transition-colors ${isOwn ? 'text-crm-primary-text hover:text-crm-primary-text' : 'text-crm-primary hover:text-crm-primary'}`}
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 window.open(href, '_blank', 'noopener,noreferrer');
 }}
 >
 {part}
 </a>
 );
 }
 return part;
 });

 return (
 <div>
 <p className={`text-[13.5px] leading-relaxed whitespace-pre-wrap ${isOwn ? 'text-crm-primary-text' : 'text-crm-text'}`}>{parsedContent}</p>
 {linksInContent.map((url, index) => (
 <div key={index} onClick={(e) => e.stopPropagation()}>
 {renderLinkPreview(url)}
 </div>
 ))}
 </div>
 );
 };

 // Redesign Files Tab
  const renderFilesTab = () => {
  const deletableFileIds = channelFiles
    .filter(f => f.sender?._id === user?._id || f.senderId === user?._id || ['Admin', 'super_admin', 'SuperAdmin'].includes(user?.role))
    .map(f => f._id);
    
  const isAllSelected = deletableFileIds.length > 0 && selectedFiles.length === deletableFileIds.length;
  const hasSelected = selectedFiles.length > 0;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedFiles([]);
    else setSelectedFiles(deletableFileIds);
  };

  const toggleFileSelection = (id) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  return (
  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-crm-dark">
  <div className="mb-4 flex items-start justify-between">
    <div>
      <h3 className="text-sm font-bold text-crm-text uppercase tracking-wider">Shared Files</h3>
      <p className="text-[10px] text-crm-textMuted mt-0.5">Photos, voice notes, and documents exchanged with {selectedUser?.name}</p>
    </div>
    {deletableFileIds.length > 0 && (
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
        {hasSelected && (
          <button
            onClick={handleBulkDeleteFiles}
            disabled={isBulkDeleting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
          >
            {isBulkDeleting ? <div className="w-3 h-3 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" /> : <Trash2 size={13} />}
            Delete ({selectedFiles.length})
          </button>
        )}
        <label className="flex items-center gap-2 cursor-pointer bg-crm-card/50 px-2 py-1 rounded-md border border-crm-border/50">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="rounded border-crm-border text-crm-primary bg-crm-darker focus:ring-crm-primary w-3.5 h-3.5 cursor-pointer"
          />
          <span className="text-[11px] text-crm-textMuted font-medium uppercase tracking-wider">Select All</span>
        </label>
      </div>
    )}
  </div>
  {channelFiles.length === 0 ? (
  <div className="text-center py-16 text-crm-textMuted flex flex-col items-center gap-2">
  <FileText size={32} className="opacity-20" />
  <p className="text-xs">No files shared yet in this thread.</p>
  </div>
  ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {channelFiles.map((file) => {
  const name = fileDisplayName(file);
  const isPDF = name.toLowerCase().endsWith('.pdf');
  const canDelete = file.sender?._id === user?._id || file.senderId === user?._id || ['Admin', 'super_admin', 'SuperAdmin'].includes(user?.role);
  
  return (
  <div key={file._id} 
    className={`rounded-xl border ${selectedFiles.includes(file._id) ? 'border-crm-primary/50 bg-crm-primary/5' : 'border-crm-border bg-crm-card'} p-3 flex items-center justify-between gap-3 hover:border-crm-primary/25 transition-colors ${canDelete ? 'cursor-pointer' : ''}`}
    onClick={() => {
      if (canDelete) toggleFileSelection(file._id);
    }}
  >
  <div className="flex items-center gap-3 min-w-0">
  {canDelete && (
    <input
      type="checkbox"
      checked={selectedFiles.includes(file._id)}
      onChange={() => toggleFileSelection(file._id)}
      onClick={(e) => e.stopPropagation()}
      className="rounded border-crm-border text-crm-primary bg-crm-darker focus:ring-crm-primary w-4 h-4 cursor-pointer shrink-0"
    />
  )}
  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPDF ? 'bg-red-500/10 text-red-500' : 'bg-crm-primary/10 text-crm-primary'}`}>
  <FileText size={16} />
  </div>
  <div className="min-w-0">
  <p className="text-xs font-semibold text-crm-text truncate">{name}</p>
  <p className="text-[10px] text-crm-textMuted mt-0.5 truncate">{file.sender?.name || 'Sender'}</p>
  </div>
  </div>
  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    downloadMediaFile(file.fileUrl, name);
  }}
  className="w-7 h-7 rounded-lg flex items-center justify-center bg-crm-dark text-crm-primary hover:text-crm-primary transition-colors shrink-0 z-10"
  >
  <Download size={13} />
  </button>
  </div>
  );
 })}
 </div>
 )}
 </div>
 );
 };

 // Redesign Pinned Tab
 const renderPinnedTab = () => {
 return (
 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-crm-dark space-y-3">
 <div className="mb-4">
 <h3 className="text-sm font-bold text-crm-text uppercase tracking-wider">Pinned Messages</h3>
 <p className="text-[10px] text-crm-textMuted mt-0.5">Important posts pinned in this conversation</p>
 </div>
 {pinnedMessages.length === 0 ? (
 <div className="text-center py-16 text-crm-textMuted flex flex-col items-center gap-2">
 <Pin size={32} className="opacity-20 rotate-45" />
 <p className="text-xs">No pinned messages.</p>
 </div>
 ) : (
 pinnedMessages.map((msg) => (
 <div key={msg._id} className="p-3 rounded-xl bg-crm-card border border-crm-border flex flex-col gap-2 hover:border-crm-primary/25 transition-colors">
 <div className="flex items-center justify-between gap-2">
 <span className="font-semibold text-xs text-crm-text">{msg.sender?.name || 'Unknown User'}</span>
 </div>
 <p className="text-xs text-crm-text whitespace-pre-wrap leading-relaxed">
 {msg.content}
 </p>
 {msg.fileUrl && (
 <span className="text-[10px] text-crm-primary flex items-center gap-1 font-semibold">
 📎 Attachment ({msg.fileType || 'file'})
 </span>
 )}
 <div className="flex justify-end gap-2 mt-1 pt-2 border-t border-crm-border/40">
 {user?.role !== 'Client' && (
 <button
 type="button"
 onClick={() => handleUnpin(msg)}
 className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
 >
 Unpin
 </button>
 )}
 <button
 type="button"
 onClick={() => {
 setActiveTab('Chat');
 setTimeout(() => scrollToMessage(msg._id), 100);
 }}
 className="px-2 py-0.5 rounded bg-crm-primaryHover/20 text-[10px] font-bold text-crm-primary hover:bg-crm-primaryHover/30 transition-colors"
 >
 Jump
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 );
 };

 // Redesign Links Tab
 const renderLinksTab = () => {
 return (
 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-crm-dark space-y-3">
 <div className="mb-4">
 <h3 className="text-sm font-bold text-crm-text uppercase tracking-wider">Shared Links</h3>
 <p className="text-[10px] text-crm-textMuted mt-0.5">Hyperlinks and web resources exchanged in this chat</p>
 </div>
 {channelLinks.length === 0 ? (
 <div className="text-center py-16 text-crm-textMuted flex flex-col items-center gap-2">
 <Globe size={32} className="opacity-20" />
 <p className="text-xs">No links shared yet in this thread.</p>
 </div>
 ) : (
 channelLinks.map((link, idx) => (
 <div key={idx} className="p-3 rounded-xl bg-crm-card border border-crm-border flex items-center justify-between gap-3 hover:border-crm-primary/25 transition-colors">
 <div className="min-w-0 flex-1">
 <a
 href={link.url.startsWith('http') ? link.url : 'http://' + link.url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-semibold text-crm-primary hover:underline truncate block"
 >
 {link.url}
 </a>
 <p className="text-[9px] text-crm-textMuted mt-1">Shared by {link.sender?.name || 'Member'} on {new Date(link.createdAt).toLocaleDateString()}</p>
 </div>
 <button
 type="button"
 onClick={() => {
 setActiveTab('Chat');
 setTimeout(() => scrollToMessage(link._id), 100);
 }}
 className="p-1.5 rounded-lg bg-crm-dark text-crm-primary hover:text-crm-primary transition-colors"
 title="Jump to Message"
 >
 <CornerUpLeft size={13} />
 </button>
 </div>
 ))
 )}
 </div>
 );
 };

 if (!workspaceId && !loading) {
 return (
 <div className="glass-panel p-8 text-center text-crm-textMuted max-w-lg mx-auto mt-24">
 <p>No workspace selected. Open a workspace first, then open Direct Messages again.</p>
 </div>
 );
 }

 return (
 <div className="flex flex-col h-full w-full bg-transparent overflow-hidden text-crm-text min-h-0">
 {/* Main Container */}
 <div className="flex-1 flex overflow-hidden min-h-0">
 
 {/* Column 1: Workspace Channels & Teammates List */}
 <div
 className="bg-crm-darker border-r border-crm-border flex flex-col shrink-0 overflow-hidden relative transition-all duration-300 ease-in-out"
 style={{ width: sidebarCollapsed ? '64px' : '260px' }}
 >
 
 {/* Workspace Title Dropdown + Collapse Toggle */}
 <div className="relative">
 {sidebarCollapsed ? (
 /* Collapsed: Show workspace initial + expand button */
 <div className="flex flex-col items-center py-3 border-b border-crm-border gap-2">
 <div
 className="w-9 h-9 rounded-xl bg-crm-primaryHover/20 text-crm-primary flex items-center justify-center text-sm font-bold cursor-pointer border border-crm-border/40 hover:bg-crm-primaryHover/30 transition-colors"
 title={currentWorkspaceName}
 onClick={() => setSidebarCollapsed(false)}
 >
 {workspaceInitial}
 </div>
 <button
 onClick={() => setSidebarCollapsed(false)}
 className="p-1 rounded text-crm-textMuted hover:text-crm-text hover:bg-crm-border transition-colors"
 title="Expand sidebar"
 >
 <ChevronDown size={14} className="-rotate-90" />
 </button>
 </div>
 ) : (
 <button
 onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
 className="w-full p-4 border-b border-crm-border flex items-center justify-between text-left hover:bg-crm-border transition-colors group"
 >
 <div className="min-w-0 flex-1">
 <span className="text-[10px] font-bold text-crm-textMuted uppercase tracking-widest block">Workspace</span>
 <span className="text-sm font-bold text-crm-text truncate block mt-0.5">{currentWorkspaceName}</span>
 </div>
 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setSidebarCollapsed(true); }}
 className="p-1 rounded text-crm-textMuted hover:text-crm-text hover:bg-crm-border transition-colors opacity-0 group-hover:opacity-100"
 title="Collapse sidebar"
 >
 <ChevronDown size={13} className="rotate-90" />
 </button>
 <ChevronDown size={16} className={`text-crm-textMuted transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
 </div>
 </button>
 )}

 {showWorkspaceDropdown && !sidebarCollapsed && (
 <div className="absolute top-[65px] left-3 right-3 rounded-xl bg-crm-card border border-crm-border/60 shadow-glass z-50 p-2 py-1.5 animate-in fade-in slide-in-from-top-1">
 <p className="px-2 py-1 text-[9px] font-bold text-crm-textMuted uppercase tracking-wider">Switch Workspace</p>
 {workspaces.map((ws) => (
 <button
 key={ws._id}
 onClick={() => handleSwitchWorkspace(ws._id, ws.name)}
 className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold mt-1 transition-colors flex items-center justify-between ${
 ws._id?.toString() === workspaceId?.toString()
 ? 'bg-crm-primaryHover/20 text-crm-primary'
 : 'text-crm-text hover:bg-crm-border hover:text-crm-text'
 }`}
 >
 <span className="truncate">{ws.name}</span>
 {ws._id?.toString() === workspaceId?.toString() && <CheckCircle2 size={12} className="text-crm-primary" />}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Search bar - hide when collapsed */}
 {!sidebarCollapsed && (
 <div className="p-3 border-b border-crm-border">
 <div className="flex items-center gap-2 bg-crm-dark border border-crm-border rounded-lg px-2.5 py-1.5">
 <Search size={14} className="text-crm-textMuted shrink-0" />
 <input
 type="text"
 placeholder="Search teammates..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="flex-1 bg-transparent text-xs text-crm-text placeholder-crm-textMuted focus:outline-none"
 />
 <span className="text-[9px] text-crm-textMuted font-bold bg-crm-darker px-1.5 py-0.5 rounded border border-crm-border">⌘K</span>
 </div>
 </div>
 )}

 {/* Direct Messages Scrollable List */}
 <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
 
 {sidebarCollapsed ? (
 /* Collapsed icon-only view */
 <div className="flex flex-col items-center gap-1 pt-1">
 {filteredTeammates.map((m) => {
 const isSelected = selectedUser?._id === m._id;
 return (
 <button
 key={m._id}
 onClick={() => handleSelectUser(m)}
 title={m.name}
 className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden transition-colors relative ${
 isSelected
 ? 'bg-crm-primaryHover/30 ring-2 ring-indigo-500/50'
 : 'bg-crm-primary/10 text-crm-primary hover:bg-crm-primary/20'
 }`}
 >
 {m.profileImage ? (
 <img src={resolveMediaUrl(m.profileImage)} alt="" className="w-full h-full object-cover" />
 ) : (
 <span className="text-crm-primary">{m.name?.charAt(0)}</span>
 )}
 {onlineUsers.includes(m._id) && (
 <span className="absolute bottom-0.5 right-0.5 block h-2 w-2 rounded-full bg-emerald-400 ring-[1.5px] ring-crm-darker" />
 )}
 </button>
 );
 })}
 </div>
 ) : (
 /* Expanded view */
 <div>
 <div className="flex items-center justify-between px-2 mb-2">
 <span className="text-[10px] font-bold text-crm-textMuted uppercase tracking-wider font-semibold">Direct Messages</span>
 </div>

 {loading ? (
 <div className="px-2 py-1 text-xs text-crm-textMuted animate-pulse">Loading teammates...</div>
 ) : filteredTeammates.length === 0 ? (
 <div className="px-2 py-1 text-xs text-crm-textMuted">No teammates found</div>
 ) : (
 filteredTeammates.map((m) => {
 const isSelected = selectedUser?._id === m._id;
 return (
 <button
 key={m._id}
 onClick={() => handleSelectUser(m)}
 className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left mb-0.5 transition-colors text-xs font-semibold ${
 isSelected
 ? 'bg-crm-primary/15 text-crm-primary'
 : 'hover:bg-crm-border text-crm-textMuted hover:text-crm-text'
 }`}
 >
 <div className="relative shrink-0">
 {m.profileImage ? (
 <img src={resolveMediaUrl(m.profileImage)} alt="" className="w-5 h-5 rounded-full object-cover" />
 ) : (
 <div className="w-5 h-5 rounded-full bg-crm-primary/20 text-crm-primary flex items-center justify-center text-[10px] font-bold">
 {m.name?.charAt(0)}
 </div>
 )}
 {onlineUsers.includes(m._id) && (
 <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-emerald-400 ring-[1px] ring-crm-darker" />
 )}
 </div>
 <span className="truncate flex-1">{m.name}</span>
 </button>
 );
 })
 )}
 </div>
 )}
 </div>
 </div>

 {/* Column 2: Central Chat Column */}
 <div className="flex-1 flex flex-col bg-crm-dark overflow-hidden min-w-0 min-h-0">
 {selectedUser ? (
 <>
 {/* Central Chat Header */}
 <div className="border-b border-crm-border bg-crm-card z-10">
 {selectedMessage ? (
 <div className="p-4 h-[65px] flex items-center justify-between bg-crm-primary/10 transition-all duration-200">
 <div className="flex items-center gap-4">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedMessage(null);
 }}
 className="p-1.5 hover:bg-crm-border rounded-lg text-crm-text transition-colors"
 title="Clear selection"
 >
 <X size={16} />
 </button>
 <span className="text-xs font-bold text-crm-text">1 Message Selected</span>
 </div>
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setReplyingTo(selectedMessage);
 setSelectedMessage(null);
 }}
 className="p-1.5 hover:bg-crm-border rounded-lg text-crm-textMuted hover:text-crm-text transition-colors"
 title="Reply"
 >
 <CornerUpLeft size={14} />
 </button>
 {user?.role !== 'Client' && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 selectedMessage.isPinned ? handleUnpin(selectedMessage) : handlePin(selectedMessage);
 setSelectedMessage(null);
 }}
 className="p-1.5 hover:bg-crm-border rounded-lg text-crm-textMuted hover:text-crm-text transition-colors"
 title={selectedMessage.isPinned ? "Unpin message" : "Pin message"}
 >
 {selectedMessage.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
 </button>
 )}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 navigator.clipboard.writeText(selectedMessage.content || '');
 toast.success('Copied to clipboard');
 setSelectedMessage(null);
 }}
 className="p-1.5 hover:bg-crm-border rounded-lg text-crm-textMuted hover:text-crm-text transition-colors"
 title="Copy text"
 >
 <Copy size={14} />
 </button>
 {(selectedMessage.sender?._id === user._id || selectedMessage.senderId === user._id || ['Admin', 'super_admin', 'SuperAdmin'].includes(user?.role)) && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteMessage(selectedMessage);
 setSelectedMessage(null);
 }}
 className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
 title="Delete message"
 >
 <Trash2 size={14} />
 </button>
 )}
 </div>
 </div>
 ) : (
  <div className="px-4 py-2 flex items-center justify-between h-[54px] w-full">
    {/* Left: User Info */}
    <div className="flex items-center gap-3 shrink-0 max-w-[40%]">
      <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleOpenProfile(selectedUser._id)}>
        <div className="relative shrink-0">
          {selectedUser.profileImage ? (
            <img src={resolveMediaUrl(selectedUser.profileImage)} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-crm-primary/20 text-crm-primary flex items-center justify-center font-bold text-xs">
              {selectedUser.name?.charAt(0)}
            </div>
          )}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-emerald-400 ring-[1px] ring-crm-darker" />
          )}
        </div>
        <h3 className="font-bold text-crm-text truncate text-[13px]">{selectedUser.name}</h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-crm-card border border-crm-border text-crm-textMuted font-bold uppercase tracking-wider shrink-0">{selectedUser.role}</span>
      </div>
      <div className="w-[1px] h-4 bg-crm-border shrink-0"></div>
      <p className="text-[11px] text-crm-textMuted truncate min-w-[50px]">{selectedUser.email}</p>
    </div>

    {/* Center: Tabs */}
    <div className="flex items-center gap-1.5 flex-1 justify-center">
      {['Chat', 'Files', 'Pinned', 'Links'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3 py-1.5 text-[11px] rounded-md font-semibold transition-all ${
            activeTab === tab
              ? 'bg-crm-primary/15 text-crm-primary'
              : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border/50'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>

    {/* Right: Info button */}
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={() => setShowRightSidebar(!showRightSidebar)}
        className={`p-1.5 rounded-lg transition-colors ${showRightSidebar ? 'bg-crm-primaryHover/20 text-crm-primary' : 'text-crm-textMuted hover:text-crm-text hover:bg-crm-border'}`}
        title="Teammate Details"
      >
        <Info size={16} />
      </button>
    </div>
  </div>
 )}

 </div>

 {/* Chat tab content render switch */}
 {activeTab === 'Chat' ? (
 <>
 {/* Inline Pinned Alert Banner */}
 {pinnedMessages.length > 0 && (
 <div 
 onClick={() => setActiveTab('Pinned')}
 className="bg-crm-primary/5 border-b border-crm-border/40 px-4 py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-crm-primary/10 transition-colors select-none"
 >
 <div className="flex items-center gap-2 truncate">
 <Pin size={12} className="text-crm-primary shrink-0 rotate-45" />
 <span className="font-semibold text-crm-text">Pinned Messages ({pinnedMessages.length})</span>
 <span className="text-crm-textMuted truncate">
 | {pinnedMessages[0].content || 'Attachment'}
 </span>
 </div>
 <span className="text-crm-primary hover:underline font-semibold shrink-0 ml-2">View All</span>
 </div>
 )}

 {/* Message scroll viewport */}
 <div 
   className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 bg-crm-dark min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-crm-border/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-crm-textMuted/80"
   onScroll={handleScroll}
 >
 


 {messages.length === 0 ? (
 <div className="text-center py-16 text-crm-textMuted flex flex-col items-center gap-2">
 <MessageSquare size={36} className="opacity-20" />
 <p className="text-xs">No messages yet. Send a direct message to start chatting!</p>
 </div>
 ) : (
 messages.map((msg, index) => {
 const isOwn = (msg.sender?._id || msg.senderId) === user._id;
 const isSelected = selectedMessage?._id === msg._id;
 
 // Sticky Date Header Logic
 const currentMsgDate = new Date(msg.createdAt).toDateString();
 const previousMsgDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
 const showDateHeader = currentMsgDate !== previousMsgDate;

 return (
 <React.Fragment key={msg._id}>
 {showDateHeader && (
 <div className="sticky top-2 z-10 flex justify-center my-4 pointer-events-none">
 <span className="px-3 py-1 rounded-full bg-crm-darker border border-crm-border/40 text-[10px] text-crm-text font-bold tracking-wider shadow-glass uppercase pointer-events-auto">
 {formatDateForHeader(msg.createdAt)}
 </span>
 </div>
 )}
 <div 
 id={`msg-${msg._id}`} 
 className={`flex items-start gap-2 select-text mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
 >
 {/* Message Sender Initial Avatar - Only for received messages */}
 {!isOwn && (
 <div 
 onClick={() => handleOpenProfile(msg.sender?._id || msg.senderId)}
 className="w-8 h-8 rounded-full bg-crm-primaryHover/30 flex items-center justify-center text-crm-primary-text font-bold text-xs shrink-0 cursor-pointer overflow-hidden mt-0.5 border border-crm-border/40"
 >
 {selectedUser.profileImage ? (
 <img src={resolveMediaUrl(selectedUser.profileImage)} alt="" className="w-full h-full object-cover" />
 ) : (
 selectedUser.name?.charAt(0) || 'T'
 )}
 </div>
 )}

 {/* Message Details */}
 <div 
 onClick={(e) => {
 if (
 e.target.closest('a') || 
 e.target.closest('button') || 
 e.target.closest('video') || 
 e.target.closest('audio') || 
 e.target.closest('img') || 
 window.getSelection().toString()
 ) {
 return;
 }
 setSelectedMessage(selectedMessage?._id === msg._id ? null : msg);
 }}
 className={`group flex flex-col relative max-w-[85%] 2xl:max-w-[90%] cursor-pointer ${
 isOwn ? 'items-end' : 'items-start'
 }`}
 >
 {/* Replying block */}
 {msg.repliedTo && (
 <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
 <div
 onClick={(e) => {
 e.stopPropagation();
 scrollToMessage(msg.repliedTo._id);
 }}
 className="mb-1 p-2 rounded-lg bg-crm-card border-l-4 border-crm-primary text-xs text-crm-text cursor-pointer hover:bg-crm-border transition-colors select-none max-w-full"
 >
 <p className="font-bold text-crm-text text-[10px] mb-0.5">{msg.repliedTo.sender?.name || 'Teammate'}</p>
 <p className="truncate text-crm-textMuted text-[11px] max-w-full">
 {msg.repliedTo.content || (msg.repliedTo.fileUrl ? 'Attachment' : '')}
 </p>
 </div>
 </div>
 )}

 {/* Message Pinned indicator */}
 {msg.isPinned && (
 <div className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-crm-primary mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
 <Pin size={8} className="rotate-45" />
 <span>Pinned</span>
 </div>
 )}

 {/* Main message text & attachment body */}
 <div className={`px-3 py-1.5 rounded-xl break-words relative shadow-sm text-[14px] ${
 isSelected ? 'ring-2 ring-indigo-500/50' : ''
 } ${
 isOwn 
 ? 'bg-crm-primary text-crm-primary-text rounded-tr-sm' 
 : 'dark:bg-[#222738] bg-slate-200 text-crm-text rounded-tl-sm'
 }`}>
 <div className="flex flex-wrap items-end gap-x-3 gap-y-0.5">
 <div className="leading-snug min-w-[20px]">
 {msg.fileUrl ? (
 <>
 {msg.content && !/^(shared (a )?file:?|sent a voice note)/i.test(msg.content.trim()) && (
 <div className="mb-1">{renderMessageContent(msg.content, isOwn)}</div>
 )}
 {renderAttachment(msg, isOwn)}
 </>
 ) : (
 renderMessageContent(msg.content, isOwn)
 )}
 </div>
 
 <div className={`flex items-center gap-1 text-[9px] opacity-70 ml-auto shrink-0 pb-0.5 translate-y-[2px] ${isOwn ? 'text-crm-primary-text' : 'text-crm-textMuted'}`}>
 <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 {isOwn && <CheckCheck size={13} />}
 </div>
 </div>
 </div>
 </div>
 
 {/* Floating Action Menu inside bubble container on hover */}
 <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 flex items-center bg-crm-card border border-crm-border rounded-lg p-1 gap-1 shadow-2xl ${
 isOwn ? 'right-[calc(100%+10px)]' : 'left-[calc(100%+10px)]'
 }`}>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setReplyingTo(msg);
 }}
 title="Reply"
 className="p-1 hover:bg-crm-border rounded text-crm-textMuted hover:text-crm-text transition-colors"
 >
 <CornerUpLeft size={13} />
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 msg.isPinned ? handleUnpin(msg) : handlePin(msg);
 }}
 title={msg.isPinned ? "Unpin message" : "Pin message"}
 className={`p-1 hover:bg-crm-border rounded transition-colors ${msg.isPinned ? 'text-crm-primary' : 'text-crm-textMuted hover:text-crm-text'}`}
 >
 {msg.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
 </button>
 {(isOwn || ['Admin', 'super_admin', 'SuperAdmin'].includes(user?.role)) && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteMessage(msg);
 }}
 title="Delete message"
 className="p-1 hover:bg-rose-500/10 rounded text-crm-textMuted hover:text-rose-400 transition-colors"
 >
 <Trash2 size={13} />
 </button>
 )}
 </div>
 </div>
 </React.Fragment>
 );
 })
 )}
 {remoteTyping && (
 <p className="text-[10px] text-crm-primary font-semibold animate-pulse px-12">Teammate is typing...</p>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Message Input Bottom Panel */}
 <div className="p-3 border-t border-crm-border relative bg-crm-card shrink-0">
 
 {/* Attachment preview bar */}
 {pendingUploads.length > 0 && (
    <div className="mb-2 px-3 py-2 rounded-xl bg-crm-card border border-crm-border flex flex-wrap gap-2 text-xs text-crm-text">
      {pendingUploads.map((upload) => (
        <div key={upload.id} className="relative group flex items-center gap-2 bg-crm-darker pr-3 rounded border border-crm-border/50">
          {upload.preview && !upload.isVideo ? (
            <img src={upload.preview} alt="" className="w-8 h-8 rounded-l object-cover" />
          ) : upload.preview && upload.isVideo ? (
            <video src={upload.preview} className="w-10 h-8 rounded-l object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-l bg-crm-dark flex items-center justify-center">
              <FileText size={14} className="text-crm-textMuted" />
            </div>
          )}
          <span className="max-w-[120px] truncate text-[10px] font-medium">{upload.file.name}</span>
          <button 
            type="button" 
            onClick={() => setPendingUploads(prev => prev.filter(u => u.id !== upload.id))} 
            className="w-4 h-4 rounded-full bg-crm-dark flex items-center justify-center text-crm-textMuted hover:text-rose-400 border border-crm-border shrink-0 ml-1"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )}

 {/* Thread reply active bar */}
 {replyingTo && (
 <div className="mb-2 px-3 py-2 rounded-xl bg-crm-card border border-crm-border flex items-center justify-between text-xs text-crm-text animate-in slide-in-from-bottom duration-150">
 <div className="flex-1 min-w-0 border-l-2 border-crm-primary pl-2">
 <p className="text-[10px] font-bold text-crm-primary">Replying to {replyingTo.sender?.name || 'Member'}</p>
 <p className="text-[11px] text-crm-textMuted truncate">
 {replyingTo.content || (replyingTo.fileUrl ? 'Attachment' : '')}
 </p>
 </div>
 <button type="button" onClick={() => setReplyingTo(null)} className="text-crm-textMuted hover:text-crm-text shrink-0 ml-2">
 <X size={14} />
 </button>
 </div>
 )}

  {/* Redesigned Slim Input Bar Container */}
  <form onSubmit={handleSend} className="relative z-[60] rounded-2xl border border-crm-border bg-crm-card/60 backdrop-blur-xl px-2 py-1.5 mx-4 mb-4 flex items-end gap-2 shadow-glass focus-within:border-crm-primary/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
    {/* Control panel row - left */}
    <div className="flex items-center gap-1 pb-0.5 shrink-0 relative">
        <input
          type="file"
          hidden
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-crm-border text-crm-textMuted hover:text-crm-text transition-colors"
      >
        <Paperclip size={16} />
      </button>
    </div>

    <textarea
      ref={inputRef}
      rows={1}
      value={input}
      onChange={handleInputChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend(e);
        }
      }}
      placeholder={`Message ${selectedUser.name}`}
      className="flex-1 w-full bg-transparent border-0 text-sm text-crm-text placeholder-crm-textMuted focus:ring-0 focus:outline-none resize-none py-2 max-h-32 min-h-[36px] custom-scrollbar"
      disabled={uploading}
    />
    
    {/* Control panel row - right */}
    <div className="flex items-center gap-2 pb-0.5 shrink-0">
      <VoiceRecorder onSend={handleSendAudio} disabled={uploading} />
      
      <button
        type="submit"
        disabled={uploading || (!input.trim() && pendingUploads.length === 0)}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-crm-primaryHover hover:bg-crm-primary disabled:opacity-40 disabled:hover:bg-crm-primaryHover text-crm-primary-text transition-all shadow-glow"
      >
        {uploading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Send size={14} />
        )}
      </button>
    </div>
  </form>
 </div>
 </>
 ) : activeTab === 'Files' ? (
 renderFilesTab()
 ) : activeTab === 'Pinned' ? (
 renderPinnedTab()
 ) : (
 renderLinksTab()
 )}
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-crm-textMuted gap-3 p-6">
 <MessageSquare size={40} className="opacity-20 animate-bounce" />
 <p className="text-center text-xs">Select a teammate to begin chatting</p>
 </div>
 )}
 </div>

 {/* Column 3: Toggleable Details Panel */}
 {selectedUser && showRightSidebar && (
 <div className="w-[280px] bg-crm-darker border-l border-crm-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar text-xs">
 
 {/* Right sidebar header */}
 <div className="p-3 border-b border-crm-border flex items-center justify-between bg-crm-darker sticky top-0 z-10">
 <span className="font-bold text-crm-text uppercase tracking-wider text-[11px]">User details</span>
 <button 
 onClick={() => setShowRightSidebar(false)}
 className="p-1 rounded hover:bg-crm-border text-crm-textMuted hover:text-crm-text transition-colors"
 >
 <X size={15} />
 </button>
 </div>

 {/* Central big member square */}
 <div className="p-5 text-center border-b border-crm-border">
 <div className="relative w-16 h-16 rounded-2xl bg-crm-primary/10 text-crm-primary border border-crm-primary/20 flex items-center justify-center text-2xl font-bold mx-auto mb-3 shadow-glow overflow-hidden">
 {selectedUser.profileImage ? (
 <img src={resolveMediaUrl(selectedUser.profileImage)} alt="" className="w-full h-full object-cover" />
 ) : (
 selectedUser.name?.charAt(0)
 )}
 {onlineUsers.includes(selectedUser._id) && (
 <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-crm-darker" />
 )}
 </div>
 <h4 className="font-bold text-crm-text text-base truncate">{selectedUser.name}</h4>
 <p className="text-[10px] text-crm-textMuted mt-1 uppercase tracking-wider font-semibold">{selectedUser.role}</p>
 </div>

 {/* Collapsible Accordion List */}
 <div className="flex-1">
 
 {/* Shared Files Accordion */}
 <div className="border-b border-crm-border/50">
 <button
 type="button"
 onClick={() => toggleAccordion('files')}
 className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-crm-text hover:bg-crm-border transition-colors"
 >
 <span>Files</span>
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-semibold text-crm-textMuted">{channelFiles.length}</span>
 <ChevronDown size={14} className={`text-crm-textMuted transition-transform ${openAccordions.files ? 'rotate-180' : ''}`} />
 </div>
 </button>
 {openAccordions.files && (
 <div className="px-4 pb-3 space-y-2">
 {channelFiles.length === 0 ? (
 <p className="text-[10px] text-crm-textMuted">No files shared yet</p>
 ) : (
 channelFiles.slice(0, 5).map((f) => (
 <div key={f._id} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-crm-border">
 <span className="text-crm-textMuted truncate flex-1 font-medium">{fileDisplayName(f)}</span>
 <button
 type="button"
 onClick={() => downloadMediaFile(f.fileUrl, fileDisplayName(f))}
 className="text-crm-primary hover:text-crm-accent shrink-0"
 >
 <Download size={12} />
 </button>
 </div>
 ))
 )}
 </div>
 )}
 </div>

 {/* Pinned Messages Accordion */}
 <div className="border-b border-crm-border/50">
 <button
 type="button"
 onClick={() => toggleAccordion('pinned')}
 className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-crm-text hover:bg-crm-border transition-colors"
 >
 <span>Pinned</span>
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-semibold text-crm-textMuted">{pinnedMessages.length}</span>
 <ChevronDown size={14} className={`text-crm-textMuted transition-transform ${openAccordions.pinned ? 'rotate-180' : ''}`} />
 </div>
 </button>
 {openAccordions.pinned && (
 <div className="px-4 pb-3 space-y-2">
 {pinnedMessages.length === 0 ? (
 <p className="text-[10px] text-crm-textMuted">No pinned messages</p>
 ) : (
 pinnedMessages.slice(0, 3).map((p) => (
 <div 
 key={p._id}
 onClick={() => {
 setActiveTab('Chat');
 setTimeout(() => scrollToMessage(p._id), 100);
 }}
 className="p-1.5 rounded bg-crm-darker border border-crm-border text-[10px] text-crm-text hover:border-crm-primary/20 cursor-pointer transition-colors"
 >
 <p className="truncate font-semibold text-crm-text">{p.sender?.name || 'Teammate'}</p>
 <p className="truncate mt-0.5 text-crm-textMuted">{p.content}</p>
 </div>
 ))
 )}
 </div>
 )}
 </div>

 {/* Shared Links Accordion */}
 <div className="border-b border-crm-border/50">
 <button
 type="button"
 onClick={() => toggleAccordion('links')}
 className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-crm-text hover:bg-crm-border transition-colors"
 >
 <span>Links</span>
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-semibold text-crm-textMuted">{channelLinks.length}</span>
 <ChevronDown size={14} className={`text-crm-textMuted transition-transform ${openAccordions.links ? 'rotate-180' : ''}`} />
 </div>
 </button>
 {openAccordions.links && (
 <div className="px-4 pb-3 space-y-2">
 {channelLinks.length === 0 ? (
 <p className="text-[10px] text-crm-textMuted">No shared links</p>
 ) : (
 channelLinks.slice(0, 5).map((l, idx) => (
 <div key={idx} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-crm-border">
 <a
 href={l.url.startsWith('http') ? l.url : 'http://' + l.url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-crm-primary hover:text-crm-accent truncate flex-1 font-medium"
 >
 {l.url}
 </a>
 </div>
 ))
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 <UserProfileModal
 isOpen={isProfileOpen}
 onClose={() => setIsProfileOpen(false)}
 userId={clickedUserId}
 />
 </div>
 );
};

export default DirectMessages;
