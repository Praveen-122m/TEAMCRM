import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  Box, Typography, Paper, Divider, Avatar, TextField, IconButton, List, 
  ListItemButton, ListItemIcon, ListItemText, InputBase, Button, 
  CircularProgress, Tabs, Tab, AvatarGroup, Tooltip, Grid, Card, CardMedia, CardContent, Fade
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
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

const ChannelChat = ({ isEmbedded = false }) => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      if (workspaceId) {
        const [chRes, memRes, projRes] = await Promise.all([
          axios.get(`/api/channels/${workspaceId}`),
          axios.get(`/api/workspaces/${workspaceId}/members`),
          user.role?.toLowerCase() === 'client' ? axios.get(`/api/projects/${workspaceId}`) : Promise.resolve({ data: [] })
        ]);
        setChannels(chRes.data);
        setMembers(memRes.data);
        setProjects(projRes.data);
        
        const targetChannelId = location.state?.activeChannelId;
        if (targetChannelId) {
          const target = chRes.data.find(c => c._id === targetChannelId);
          if (target) {
            setActiveChannel(target);
            return;
          }
        }

        if (chRes.data.length > 0 && !activeChannel) {
          setActiveChannel(chRes.data[0]);
        }
      }
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, location.state]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeChannel) {
      axios.get(`/api/messages/${activeChannel._id}`).then((res) => {
        setMessages(res.data);
        setTimeout(scrollToBottom, 100);
      });
      if (socket) socket.emit('join_channel', activeChannel._id);
    }
  }, [activeChannel, socket]);

  useEffect(() => {
    if (!socket) return;
    
    const messageListener = (newMessage) => {
      const msgChannelId = newMessage.channelId || newMessage.channel?._id || newMessage.channel;
      if (activeChannel && activeChannel._id === msgChannelId) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    };

    const typingListener = (room) => {
       // Logic to identify who is typing in this channel would need the user's name from backend
       // For now, we'll assume the room ID is the channel ID and we can use a generic "Someone is typing"
       // or we'd need to emit { room, userName } from frontend.
       // Let's refine the emit to include name.
    };

    socket.on('message_received', messageListener);
    
    socket.on('typing', (room) => {
      if (activeChannel && room === activeChannel._id) {
         setIsTypingRemote(true);
      }
    });

    socket.on('stop_typing', (room) => {
      if (activeChannel && room === activeChannel._id) {
         setIsTypingRemote(false);
      }
    });

    return () => {
      socket.off('message_received', messageListener);
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeChannel]);

  const [isTypingRemote, setIsTypingRemote] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);

    // Typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', activeChannel?._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', activeChannel?._id);
      setIsTyping(false);
    }, 2000);

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

    socket.emit('stop_typing', activeChannel._id);
    setIsTyping(false);

    let fileData = null;
    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile.file);
      try {
        const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
        workspaceId: activeWorkspace || user.workspaces?.[0],
        fileUrl: fileData?.url,
        fileType: fileData?.type
      };
      const res = await axios.post('/api/messages', payload);
      if (socket) socket.emit('new_message', res.data);
      setMessages((prev) => [...prev, res.data]);
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
      setSelectedFile({ file, preview: file.type.startsWith('image') ? reader.result : null });
    };
    reader.readAsDataURL(file);
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

  const renderFilesTab = () => {
    const files = messages.filter(m => m.fileUrl);
    return (
      <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Shared Files & Photos</Typography>
        {files.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <InsertDriveFileIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
            <Typography color="textSecondary">No files shared in this channel yet.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {files.map((file, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Card sx={{ borderRadius: 3, border: '1px solid #f0f0f0', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                  {file.fileType?.includes('image') ? (
                    <CardMedia component="img" height="140" image={file.fileUrl} sx={{ objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ height: 140, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <InsertDriveFileIcon sx={{ fontSize: 40, color: '#adb5bd' }} />
                    </Box>
                  )}
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.content.replace('Shared a file: ', '') || 'Document'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="textSecondary">{new Date(file.createdAt).toLocaleDateString()}</Typography>
                      <IconButton size="small" component="a" href={file.fileUrl} download target="_blank" sx={{ color: '#5a67d8' }}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      borderRadius: isEmbedded ? 0 : 4
    }}>
      {/* Sidebar */}
      <Box sx={{ width: 280, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth" sx={{ borderBottom: '1px solid #f0f0f0', '& .MuiTabs-indicator': { backgroundColor: '#5a67d8', height: 3 } }}>
          <Tab label="Members" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Channels" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 2, px: 2, py: 0.5, mb: 1 }}>
            <SearchIcon sx={{ color: '#adb5bd', fontSize: 18, mr: 1 }} />
            <InputBase placeholder="Search..." sx={{ flex: 1, fontSize: '0.8rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Box>
          {tabValue === 1 && user.role?.toLowerCase() !== 'client' && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, color: '#5a67d8', fontSize: '0.75rem' }}>Add Channel</Button>
          )}
        </Box>
        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
          {(tabValue === 1 ? channels : members).filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
            <ListItemButton
              key={item._id}
              onClick={() => {
                tabValue === 1 ? setActiveChannel(item) : navigate('/dms', { state: { selectedUser: item } })
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
                <Tab label="Posts" />
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
                          <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #f0f0f0', backgroundColor: '#f8f9fa' }}>
                            {msg.fileType?.includes('image') ? (
                              <Box><img src={msg.fileUrl} style={{ maxWidth: '300px', display: 'block' }} /><Button size="small" fullWidth startIcon={<DownloadIcon />} component="a" href={msg.fileUrl} download target="_blank">Download</Button></Box>
                            ) : <Button startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank">Download File</Button>}
                          </Box>
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
                      {selectedFile.preview ? <img src={selectedFile.preview} style={{ width: 40, height: 40, borderRadius: 4 }} /> : <AttachFileIcon />}
                      <Typography variant="caption" sx={{ flexGrow: 1, fontWeight: 700 }}>{selectedFile.file.name}</Typography>
                      <IconButton size="small" onClick={() => setSelectedFile(null)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, px: 2, py: 0.5, border: '1px solid #e2e8f0' }}>
                    <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} />
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Typography color="textSecondary">Select a channel to begin chatting</Typography></Box>
        )}
      </Box>

      <CreateChannelModal open={isModalOpen} onClose={() => setIsModalOpen(false)} workspaceId={activeWorkspace || user.workspaces?.[0]} onSuccess={() => fetchData()} />
      <style>{`
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </Box>
  );
};

export default ChannelChat;
