import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Box, Typography, Paper, Divider, Avatar, TextField, IconButton, List, 
  ListItemButton, ListItemIcon, ListItemText, InputBase, Button, 
  CircularProgress, Tabs, Tab, AvatarGroup, Tooltip, Grid, Card, CardMedia, CardContent, Fade
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { resolveMediaUrl, isImageFile, isVideoFile, fileDisplayName } from '../utils/mediaUrl';
import TagIcon from '@mui/icons-material/Tag';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import CallIcon from '@mui/icons-material/Call';
import CreateChannelModal from '../components/modals/CreateChannelModal';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';

const ChannelChat = ({ isEmbedded = false, workspaceId: workspaceIdProp, workspaceName }) => {
  const { user, activeWorkspace } = useAuth();
  const { socket, isConnected, clearUnread } = useContext(SocketContext);
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

  const resolvedWorkspaceId = workspaceIdProp || activeWorkspace || user?.workspaces?.[0];

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

  const fetchData = useCallback(async () => {
    if (!user || !resolvedWorkspaceId) return;
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
        const target = chRes.data.find((c) => c._id === targetChannelId);
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
        <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #f0f0f0', backgroundColor: '#f8f9fa', maxWidth: 360 }}>
          <img src={url} alt={name} style={{ maxWidth: '100%', display: 'block' }} />
          <Button size="small" fullWidth startIcon={<DownloadIcon />} component="a" href={url} download={name} target="_blank" rel="noopener noreferrer">
            Download
          </Button>
        </Box>
      );
    }

    if (isVideoFile(msg.fileType, msg.fileUrl)) {
      return (
        <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #f0f0f0', backgroundColor: '#f8f9fa', maxWidth: 420 }}>
          <video src={url} controls style={{ width: '100%', maxHeight: 280, display: 'block' }} />
          <Button size="small" fullWidth startIcon={<DownloadIcon />} component="a" href={url} download={name} target="_blank" rel="noopener noreferrer">
            Download Video
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, maxWidth: 360 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <InsertDriveFileIcon sx={{ color: '#5a67d8' }} />
          <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Typography>
        </Box>
        <Button size="small" variant="contained" startIcon={<DownloadIcon />} component="a" href={url} download={name} target="_blank" rel="noopener noreferrer" sx={{ backgroundColor: '#5a67d8', flexShrink: 0 }}>
          Download
        </Button>
      </Box>
    );
  };

  const renderMessageContent = (content) => {
    const parts = content.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <Typography key={i} component="span" variant="body2" sx={{ fontWeight: 800, color: '#ffc107', backgroundColor: 'rgba(255, 193, 7, 0.1)', px: 0.5, borderRadius: 1 }}>{part}</Typography>;
      }
      return part;
    });
  };

  const channelFiles = useMemo(() => messages.filter((m) => m.fileUrl), [messages]);

  const renderFilesTab = () => {
    const files = workspaceFiles.length > 0 ? workspaceFiles : channelFiles;
    return (
      <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Shared Files</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 3 }}>
          Images, videos, and documents shared in {activeChannel ? `#${activeChannel.name}` : 'this workspace'}
        </Typography>
        {files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <InsertDriveFileIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
            <Typography color="textSecondary">No files shared yet. Attach files from the Chat tab.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {files.map((file) => {
              const url = resolveMediaUrl(file.fileUrl);
              const name = fileDisplayName(file);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file._id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid #f0f0f0', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                    {isImageFile(file.fileType, file.fileUrl) ? (
                      <CardMedia component="img" height="140" image={url} sx={{ objectFit: 'cover' }} />
                    ) : isVideoFile(file.fileType, file.fileUrl) ? (
                      <Box sx={{ height: 140, backgroundColor: '#000' }}>
                        <video src={url} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                      </Box>
                    ) : (
                      <Box sx={{ height: 140, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <InsertDriveFileIcon sx={{ fontSize: 40, color: '#adb5bd' }} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                        {file.sender?.name || 'Team member'}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">{new Date(file.createdAt).toLocaleDateString()}</Typography>
                        <IconButton size="small" component="a" href={url} download={name} target="_blank" rel="noopener noreferrer" sx={{ color: '#5a67d8' }}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    );
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const filteredMentions = members.filter(u => u.name?.toLowerCase().includes(mentionSearch.toLowerCase()));

  return (
    <Box sx={{
      display: 'flex',
      height: isEmbedded ? '100%' : 'calc(100vh - 100px)',
      backgroundColor: isEmbedded ? 'transparent' : '#ffffff',
      overflow: 'hidden',
      borderRadius: isEmbedded ? 0 : 4
    }}>
      {/* Sidebar — channels */}
      <Box sx={{ width: 280, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', backgroundColor: isEmbedded ? 'rgba(15,23,42,0.4)' : '#fff' }}>
        {workspaceName && (
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Workspace</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isEmbedded ? '#f8fafc' : '#1a202c' }}>{workspaceName}</Typography>
          </Box>
        )}
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth" sx={{ borderBottom: '1px solid #f0f0f0', '& .MuiTabs-indicator': { backgroundColor: '#5a67d8', height: 3 } }}>
          <Tab label="Members" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Channels" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 2, px: 2, py: 0.5, mb: 1 }}>
            <SearchIcon sx={{ color: '#adb5bd', fontSize: 18, mr: 1 }} />
            <InputBase placeholder="Search..." sx={{ flex: 1, fontSize: '0.8rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Box>
          {tabValue === 1 && (user.role === 'Admin' || user.role === 'Member') && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, color: '#5a67d8', fontSize: '0.75rem' }}>Add Channel</Button>
          )}
        </Box>
        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
          {(tabValue === 1 ? channels : members).filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
            <ListItemButton
              key={item._id}
              onClick={() => {
                if (tabValue === 1) {
                  setActiveChannel(item);
                  clearUnread?.(item._id);
                } else {
                  navigate('/messages', { state: { selectedUser: item } });
                }
              }}
              selected={activeChannel?._id === item._id}
              sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { backgroundColor: '#ebf4ff', color: '#5a67d8' } }}
            >
              {tabValue === 1 ? (
                <>
                  <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}><TagIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={item.name} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }} />
                </>
              ) : (
                <>
                  <Avatar src={item.profileImage} sx={{ width: 24, height: 24, mr: 1.5 }} />
                  <ListItemText primary={item.name} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }} />
                </>
              )}
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        {activeChannel ? (
          <>
            <Box sx={{ borderBottom: '1px solid #f0f0f0' }}>
              <Box sx={{ p: 1.5, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TagIcon sx={{ color: '#5a67d8' }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{activeChannel.name}</Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: isConnected ? '#48bb78' : '#fc8181',
                      ml: 0.5,
                    }}
                    title={isConnected ? 'Live — connected' : 'Reconnecting…'}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AvatarGroup max={3}>
                    {members.slice(0, 3).map(m => <Avatar key={m._id} src={m.profileImage} sx={{ width: 28, height: 28 }} />)}
                  </AvatarGroup>
                  <IconButton onClick={() => navigate('/calls')}><CallIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
              
              <Tabs 
                value={chatTab} 
                onChange={(e, v) => setChatTab(v)} 
                sx={{ 
                  px: 3, 
                  minHeight: 40,
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, fontSize: '0.85rem', minWidth: 80, minHeight: 40, color: '#718096' },
                  '& .Mui-selected': { color: '#5a67d8' },
                  '& .MuiTabs-indicator': { backgroundColor: '#5a67d8' }
                }}
              >
                <Tab label="Chat" />
                <Tab label="Files" />
              </Tabs>
            </Box>

            {chatTab === 0 ? (
              <>
                {/* Messages */}
                <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {messages.map((msg) => (
                    <Box key={msg._id} sx={{ display: 'flex', gap: 2 }}>
                      <Avatar src={msg.sender?.profileImage} sx={{ width: 40, height: 40, borderRadius: 1.5 }} />
                      <Box sx={{ maxWidth: '80%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{msg.sender?.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#adb5bd' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                        </Box>
                        {msg.fileUrl ? (
                          renderFileAttachment(msg)
                        ) : (
                          <Typography variant="body2" sx={{ color: '#495057' }}>
                            {renderMessageContent(msg.content)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input Area */}
                <Box sx={{ p: 2, px: 3, position: 'relative' }}>
                  {/* Typing Indicator above input */}
                  {isTypingRemote && (
                    <Box sx={{ position: 'absolute', bottom: '100%', left: 24, mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#48bb78', animation: 'pulse 1.5s infinite' }}>Someone is typing...</Typography>
                    </Box>
                  )}

                  <Fade in={showMentions}>
                    <Paper sx={{ 
                      position: 'absolute', bottom: '100%', left: 24, mb: 1, 
                      borderRadius: 4, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', 
                      minWidth: 260, maxHeight: 300, overflowY: 'auto', 
                      zIndex: 1000, border: '1px solid #e2e8f0' 
                    }}>
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AlternateEmailIcon sx={{ fontSize: 16, color: '#5a67d8' }} />
                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b' }}>MENTION MEMBER</Typography>
                      </Box>
                      <List sx={{ p: 1 }}>
                        {filteredMentions.length > 0 ? filteredMentions.map(m => (
                          <ListItemButton key={m._id} onClick={() => handleMentionSelect(m)} sx={{ borderRadius: 2, gap: 1.5, py: 1 }}>
                            <Avatar src={m.profileImage} sx={{ width: 32, height: 32, borderRadius: 1.5 }} />
                            <ListItemText primary={m.name} primaryTypographyProps={{ fontWeight: 800, fontSize: '0.85rem' }} />
                          </ListItemButton>
                        )) : (
                          <Typography sx={{ p: 2, color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>No users found</Typography>
                        )}
                      </List>
                    </Paper>
                  </Fade>

                  {selectedFile && (
                    <Box sx={{ p: 1.5, backgroundColor: '#f8f9fa', borderRadius: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      {selectedFile.preview && !selectedFile.isVideo ? (
                        <img src={selectedFile.preview} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                      ) : selectedFile.preview && selectedFile.isVideo ? (
                        <video src={selectedFile.preview} style={{ width: 56, height: 40, borderRadius: 4 }} />
                      ) : (
                        <AttachFileIcon />
                      )}
                      <Typography variant="caption" sx={{ flexGrow: 1, fontWeight: 700 }}>{selectedFile.file.name}</Typography>
                      <IconButton size="small" onClick={() => setSelectedFile(null)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, px: 2, py: 0.5, border: '1px solid #e2e8f0' }}>
                    <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" />
                    <IconButton size="small" onClick={() => fileInputRef.current.click()} disabled={uploading}><AttachFileIcon fontSize="small" /></IconButton>
                    <InputBase 
                      inputRef={inputRef}
                      fullWidth 
                      placeholder={`Message #${activeChannel.name}`} 
                      value={messageInput} 
                      onChange={handleInputChange} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      sx={{ fontSize: '0.9rem', ml: 1 }} 
                    />
                    <IconButton type="submit" sx={{ color: '#5a67d8' }} disabled={uploading}>{uploading ? <CircularProgress size={20} /> : <SendIcon fontSize="small" />}</IconButton>
                  </Box>
                </Box>
              </>
            ) : renderFilesTab()}
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, p: 3 }}>
            <Typography color="textSecondary" textAlign="center">
              {channels.length === 0
                ? 'No channels yet. Create #general or add a new channel.'
                : 'Select a channel to begin chatting'}
            </Typography>
            {(user.role === 'Admin' || user.role === 'Member') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)} sx={{ backgroundColor: '#5a67d8' }}>
                Create Channel
              </Button>
            )}
          </Box>
        )}
      </Box>

      <CreateChannelModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={resolvedWorkspaceId}
        onSuccess={(newChannel) => {
          fetchData();
          if (newChannel) setActiveChannel(newChannel);
        }}
      />
      <style>{`
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </Box>
  );
};

export default ChannelChat;
