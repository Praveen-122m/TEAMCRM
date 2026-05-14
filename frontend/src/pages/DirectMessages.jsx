import React, { useContext, useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Divider, Avatar, TextField, IconButton, List, ListItemButton, ListItemAvatar, ListItemIcon, ListItemText, InputBase, Badge, CircularProgress, Button, Tooltip } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';

const DirectMessages = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket, isConnected } = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [dmUsers, setDmUsers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchDMData = async () => {
      try {
        const workspaceId = activeWorkspace || user?.workspaces?.[0];
        
        const [convRes, memRes] = await Promise.all([
          axios.get('/api/messages/conversations'),
          workspaceId ? axios.get(`/api/workspaces/${workspaceId}/members`) : Promise.resolve({ data: [] })
        ]);

        let users = convRes.data;
        setTeamMembers(memRes.data.filter(m => m._id !== user?._id));

        if (location.state?.selectedUser) {
          const selected = location.state.selectedUser;
          if (!users.find(u => u._id === selected._id)) {
            users = [selected, ...users];
          }
          setActiveUser(selected);
        } else if (users.length > 0 && !activeUser) {
          setActiveUser(users[0]);
        }
        setDmUsers(users);
      } catch (err) {
        console.error('Failed to fetch DM data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDMData();
  }, [location.state, activeWorkspace, user?._id]);

  useEffect(() => {
    if (activeUser) {
      axios.get(`/api/messages/direct/${activeUser._id}`).then((res) => {
        setMessages(res.data);
        setTimeout(scrollToBottom, 100);
      });
    }
  }, [activeUser]);

  useEffect(() => {
    if (!socket) return;
    const messageListener = (newMessage) => {
      if (newMessage.isDirectMessage) {
        const senderId = (newMessage.sender?._id || newMessage.sender).toString();
        const receiverId = (newMessage.receiver?._id || newMessage.receiver).toString();
        const myId = user?._id?.toString();
        const activeId = activeUser?._id?.toString();

        if (receiverId === myId || senderId === myId) {
          if (receiverId === myId) notificationSound.play().catch(() => { });
          if (senderId === activeId || (senderId === myId && receiverId === activeId)) {
            setMessages((prev) => [...prev, newMessage]);
            scrollToBottom();
          }
          setDmUsers(prev => {
            const others = prev.filter(u => u._id.toString() !== (senderId === myId ? receiverId : senderId));
            const target = senderId === myId ? prev.find(u => u._id.toString() === receiverId) : (typeof newMessage.sender === 'object' ? newMessage.sender : { _id: senderId, name: 'User' });
            return [{ ...target, lastMessage: newMessage.content }, ...others];
          });
        }
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
  }, [socket, activeUser, user, scrollToBottom]);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('typing', (data) => {
      const room = data.room || data;
      const name = data.userName || 'Someone';
      if (activeUser && activeUser._id === room) {
        setTypingUserName(name);
        setIsTyping(true);
      }
    });

    socket.on('stop_typing', (data) => {
      const room = data.room || data;
      if (activeUser && activeUser._id === room) {
        setIsTyping(false);
        setTypingUserName('');
      }
    });

    return () => {
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeUser]);

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    if (!socket || !activeUser) return;

    socket.emit('typing', { room: activeUser._id, userName: user?.name });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: activeUser._id });
    }, 3000);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !selectedFile) return;
    if (!activeUser) return;

    if (socket) socket.emit('stop_typing', { room: activeUser._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let fileData = null;
    if (selectedFile) {
// ... existing logic ...
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
      const payload = {
        content: content || (fileData ? `Shared a file: ${fileData.name}` : ''),
        receiverId: activeUser._id,
        workspaceId: user?.workspaces?.[0] || localStorage.getItem('activeWorkspace'),
        isDirectMessage: true,
        fileUrl: fileData?.url,
        fileType: fileData?.type
      };
      const res = await axios.post('/api/messages', payload);
      if (socket) socket.emit('new_message', res.data);
      setMessages(prev => [...prev, res.data]);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message', error);
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
      if (socket) socket.emit('delete_message', { messageId: id, receiverId: activeUser._id, senderId: user?._id });
      setMessages((prev) => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleStartCall = () => {
    if (!activeUser || !socket) return;
    const roomId = `room_${user?._id}_${activeUser._id}`;
    socket.emit('call_request', {
      from: { _id: user?._id, name: user?.name, profileImage: user?.profileImage },
      toId: activeUser._id,
      roomId
    });
    navigate(`/video-call?room=${roomId}`);
  };

  const filteredUsers = dmUsers.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', backgroundColor: '#ffffff', borderRadius: 4, overflow: 'hidden' }}>
      <Box sx={{ width: 320, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Messages</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f7fafc', borderRadius: 2, px: 2, py: 0.5 }}>
            <SearchIcon sx={{ color: '#a0aec0', fontSize: 18, mr: 1 }} />
            <InputBase placeholder="Search..." sx={{ flex: 1, fontSize: '0.85rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Box>
        </Box>
        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
          <Typography variant="overline" sx={{ px: 2, fontWeight: 800, color: '#a0aec0' }}>Recent Chats</Typography>
          {filteredUsers.map((u) => (
            <ListItemButton key={u._id} onClick={() => setActiveUser(u)} selected={activeUser?._id === u._id} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemAvatar>
                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" sx={{ '& .MuiBadge-badge': { backgroundColor: isConnected ? '#48bb78' : '#cbd5e0', border: '2px solid white' } }}>
                  <Avatar src={u.profileImage} sx={{ width: 40, height: 40 }} />
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={u.name}
                secondary={u.lastMessage}
                primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                secondaryTypographyProps={{ sx: { noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden', display: 'block', maxWidth: 150 } }}
              />
            </ListItemButton>
          ))}

          {teamMembers.length > 0 && (
            <>
              <Divider sx={{ my: 2, mx: 1 }} />
              <Typography variant="overline" sx={{ px: 2, fontWeight: 800, color: '#a0aec0' }}>Team Members</Typography>
              {teamMembers.filter(m => !dmUsers.find(u => u._id === m._id)).map((m) => (
                <ListItemButton key={m._id} onClick={() => setActiveUser(m)} selected={activeUser?._id === m._id} sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemAvatar>
                    <Avatar src={m.profileImage} sx={{ width: 32, height: 32 }} />
                  </ListItemAvatar>
                  <ListItemText primary={m.name} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }} />
                </ListItemButton>
              ))}
            </>
          )}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fcfcfc' }}>
        {activeUser ? (
          <>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', backgroundColor: '#ffffff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={activeUser.profileImage} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{activeUser.name}</Typography>
                  <Typography variant="caption" color="success.main">Online</Typography>
                </Box>
              </Box>
              <Box>
                <IconButton onClick={handleStartCall}><CallOutlinedIcon /></IconButton>
                <IconButton onClick={handleStartCall}><VideocamOutlinedIcon /></IconButton>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((msg) => {
                const isMe = (msg.sender?._id || msg.sender).toString() === user?._id?.toString();
                return (
                  <Box key={msg._id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', position: 'relative', '&:hover .delete-btn': { opacity: 1 } }}>
                    <Box sx={{ p: 1.5, px: 2, borderRadius: 3, backgroundColor: isMe ? '#5a67d8' : '#ffffff', color: isMe ? 'white' : '#1a202c', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0', maxWidth: '70%' }}>
                      {isMe && (
                        <IconButton size="small" className="delete-btn" sx={{ opacity: 0, transition: '0.2s', position: 'absolute', top: -10, [isMe ? 'right' : 'left']: -30 }} onClick={() => handleDeleteMessage(msg._id)}>
                          <DeleteIcon fontSize="small" sx={{ color: '#e53e3e' }} />
                        </IconButton>
                      )}
                      {msg.fileUrl ? (
                        <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
                          {msg.fileType?.includes('image') ? (
                            <Box>
                              <img src={msg.fileUrl} style={{ maxWidth: '100%', borderRadius: 8 }} alt="shared" />
                              <Button size="small" fullWidth startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank" sx={{ color: isMe ? 'white' : 'inherit', mt: 1 }}>Download Image</Button>
                            </Box>
                          ) : msg.fileType?.includes('video') ? (
                            <Box>
                              <video src={msg.fileUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                              <Button size="small" fullWidth startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank" sx={{ color: isMe ? 'white' : 'inherit', mt: 1 }}>Download Video</Button>
                            </Box>
                          ) : (
                            <Button startIcon={<AttachFileIcon />} component="a" href={msg.fileUrl} download target="_blank" sx={{ color: isMe ? 'white' : 'inherit' }}>Download Document</Button>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2">{msg.content}</Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            {/* Selection Preview (WhatsApp-style) */}
            {selectedFile && (
              <Box sx={{ p: 2, mx: 2, mb: 1, backgroundColor: '#f7fafc', borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                {selectedFile.preview ? (
                  <img src={selectedFile.preview} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} alt="preview" />
                ) : (
                  <Box sx={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#cbd5e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AttachFileIcon />
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{selectedFile.file.name}</Typography>
                  <Typography variant="caption" color="textSecondary">{(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB</Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelectedFile(null)}><CloseIcon fontSize="small" /></IconButton>
              </Box>
            )}

            <Box sx={{ p: 2, borderTop: '1px solid #f0f0f0', backgroundColor: '#ffffff' }}>
              {isTyping && (
                <Typography variant="caption" sx={{ color: '#718096', fontStyle: 'italic', ml: 2, mb: 0.5, display: 'block' }}>
                  {typingUserName} is typing...
                </Typography>
              )}
              <Paper component="form" onSubmit={handleSendMessage} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 3, boxShadow: 'none', border: '1px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
                <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} />
                <IconButton sx={{ p: '10px' }} onClick={() => fileInputRef.current.click()} disabled={uploading}>
                  <AttachFileIcon />
                </IconButton>
                <InputBase sx={{ ml: 1, flex: 1 }} placeholder={selectedFile ? "Add a caption..." : "Type a message..."} value={messageInput} onChange={handleTyping} />
                <IconButton type="submit" sx={{ p: '10px', color: '#5a67d8' }} disabled={uploading}>
                  {uploading ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Paper>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography color="textSecondary">Select a member to start chatting</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DirectMessages;
