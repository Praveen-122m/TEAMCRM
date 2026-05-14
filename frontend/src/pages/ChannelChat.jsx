import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, Paper, Divider, Avatar, TextField, IconButton, List, ListItemButton, ListItemIcon, ListItemText, InputBase, Button, CircularProgress, Tabs, Tab, AvatarGroup, Tooltip } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TagIcon from '@mui/icons-material/Tag';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import CallIcon from '@mui/icons-material/Call';
import CreateChannelModal from '../components/modals/CreateChannelModal';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const ChannelChat = ({ isEmbedded = false }) => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState(1);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // WhatsApp-style preview
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      if (workspaceId) {
        const [chRes, memRes] = await Promise.all([
          axios.get(`/api/channels/${workspaceId}`),
          axios.get(`/api/workspaces/${workspaceId}/members`)
        ]);
        setChannels(chRes.data);
        setMembers(memRes.data);
        
        // Handle deep-linking from dashboard
        const targetChannelId = location.state?.activeChannelId;
        if (targetChannelId) {
          const target = chRes.data.find(c => c._id === targetChannelId);
          if (target) {
            setActiveChannel(target);
            return;
          }
        }

        // Reset active channel when switching workspace
        if (chRes.data.length > 0) {
          setActiveChannel(chRes.data[0]);
        } else {
          setActiveChannel(null);
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
      if (activeChannel && activeChannel._id === newMessage.channel) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    };
    const deleteListener = (data) => {
      setMessages((prev) => prev.filter(m => m._id !== data.messageId));
    };
    socket.on('message_received', messageListener);
    socket.on('message_deleted', deleteListener);
    return () => {
      socket.off('message_received', messageListener);
      socket.off('message_deleted', deleteListener);
    };
  }, [socket, activeChannel, scrollToBottom]);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('typing', (data) => {
      const room = data.room || data;
      const name = data.userName || 'Someone';
      if (activeChannel && activeChannel._id === room) {
        setTypingUserName(name);
        setIsTyping(true);
      }
    });

    socket.on('stop_typing', (data) => {
      const room = data.room || data;
      if (activeChannel && activeChannel._id === room) {
        setIsTyping(false);
        setTypingUserName('');
      }
    });

    return () => {
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeChannel]);

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    
    if (!socket || !activeChannel) return;

    socket.emit('typing', { room: activeChannel._id, userName: user.name });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: activeChannel._id });
    }, 3000);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;
    if (!activeChannel) return;

    if (socket) socket.emit('stop_typing', { room: activeChannel._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let fileData = null;
    if (selectedFile) {
// ... existing logic ...
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

    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      const payload = {
        content: content || (fileData ? `Shared a file: ${fileData.name}` : ''),
        channelId: activeChannel._id,
        workspaceId: workspaceId,
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

  const handleDeleteMessage = async (id) => {
    try {
      await axios.delete(`/api/messages/${id}`);
      if (socket) socket.emit('delete_message', { messageId: id, channelId: activeChannel._id });
      setMessages((prev) => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

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
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            borderBottom: '1px solid #f0f0f0',
            '& .MuiTabs-indicator': { backgroundColor: '#5a67d8', height: 3 }
          }}
        >
          <Tab label="Members" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Channels" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 2, px: 2, py: 0.5, mb: 1 }}>
            <SearchIcon sx={{ color: '#adb5bd', fontSize: 18, mr: 1 }} />
            <InputBase
              placeholder="Search..."
              sx={{ flex: 1, fontSize: '0.8rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>

          {(tabValue === 1) && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setIsModalOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, color: '#5a67d8', fontSize: '0.75rem' }}
            >
              Add Channel
            </Button>
          )}
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
          {(tabValue === 1 ? channels : members).filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
            <ListItemButton
              key={item._id}
              onClick={() => (tabValue === 1) ? setActiveChannel(item) : navigate('/dms', { state: { selectedUser: item } })}
              selected={activeChannel?._id === item._id}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': { backgroundColor: '#ebf4ff', color: '#5a67d8' }
              }}
            >
              {(tabValue === 1) ? (
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
            <Box sx={{ p: 1.5, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TagIcon sx={{ color: '#5a67d8' }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{activeChannel.name}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AvatarGroup max={3}>
                  {members.slice(0, 3).map(m => <Avatar key={m._id} src={m.profileImage} sx={{ width: 28, height: 28 }} />)}
                </AvatarGroup>
                <IconButton><CallIcon fontSize="small" /></IconButton>
              </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {messages.map((msg) => {
                const isMe = (msg.sender?._id || msg.sender).toString() === user?._id?.toString();
                return (
                  <Box key={msg._id} sx={{ display: 'flex', gap: 2, position: 'relative', '&:hover .delete-btn': { opacity: 1 } }}>
                    <Avatar src={msg.sender?.profileImage} sx={{ width: 40, height: 40, borderRadius: 1.5 }} />
                    <Box sx={{ maxWidth: '80%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{msg.sender?.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#adb5bd' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {isMe && (
                          <IconButton size="small" className="delete-btn" sx={{ opacity: 0, transition: '0.2s', ml: 1 }} onClick={() => handleDeleteMessage(msg._id)}>
                            <DeleteIcon fontSize="inherit" sx={{ color: '#e53e3e' }} />
                          </IconButton>
                        )}
                      </Box>
                      {msg.fileUrl ? (
                        <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid #f0f0f0', backgroundColor: '#f8f9fa' }}>
                          {msg.fileType?.includes('image') ? (
                            <Box>
                              <img src={msg.fileUrl} style={{ maxWidth: '100%', display: 'block' }} alt="shared" />
                              <Button size="small" fullWidth startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank">Download Image</Button>
                            </Box>
                          ) : msg.fileType?.includes('video') ? (
                            <Box>
                              <video src={msg.fileUrl} controls style={{ maxWidth: '100%', display: 'block' }} />
                              <Button size="small" fullWidth startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank">Download Video</Button>
                            </Box>
                          ) : (
                            <Button startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank">Download Document</Button>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#495057' }}>{msg.content}</Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            {/* Selection Preview (WhatsApp-style) */}
            {selectedFile && (
              <Box sx={{ p: 2, backgroundColor: '#f7fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                {selectedFile.preview ? (
                  <img src={selectedFile.preview} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} alt="preview" />
                ) : (
                  <Box sx={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#cbd5e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AttachFileIcon />
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{selectedFile.file.name}</Typography>
                  <Typography variant="caption" color="textSecondary">{(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB</Typography>
                </Box>
                <IconButton onClick={() => setSelectedFile(null)}><CloseIcon /></IconButton>
              </Box>
            )}

            {/* Input */}
            <Box sx={{ p: 2, px: 3, pt: 0 }}>
              {isTyping && (
                <Typography variant="caption" sx={{ color: '#718096', fontStyle: 'italic', ml: 2, mb: 0.5, display: 'block' }}>
                  {typingUserName} is typing...
                </Typography>
              )}
              <Box component="form" onSubmit={handleSendMessage} sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: 10,
                px: 2,
                py: 0.5,
                border: '1px solid #e2e8f0'
              }}>
                <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} />
                <IconButton size="small" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                  <AttachFileIcon fontSize="small" />
                </IconButton>
                <InputBase
                  fullWidth
                  placeholder={selectedFile ? "Add a caption..." : `Message #${activeChannel.name}`}
                  value={messageInput}
                  onChange={handleTyping}
                  sx={{ fontSize: '0.9rem', ml: 1 }}
                />
                <IconButton type="submit" sx={{ color: '#5a67d8' }} disabled={uploading}>
                  {uploading ? <CircularProgress size={20} /> : <SendIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography color="textSecondary">Select a channel to begin chatting</Typography>
          </Box>
        )}
      </Box>

      <CreateChannelModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        workspaceId={activeWorkspace || user.workspaces?.[0]}
        onSuccess={() => fetchData()}
      />
    </Box>
  );
};

export default ChannelChat;
