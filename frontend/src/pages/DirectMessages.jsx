import React, { useContext, useEffect, useState, useRef } from 'react';
import { 
  Box, Typography, Paper, Divider, Avatar, TextField, IconButton, List, ListItemButton, 
  ListItemAvatar, ListItemIcon, ListItemText, InputBase, Badge, CircularProgress, 
  Button, Tooltip, Stack, Dialog, Fade 
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import axios from 'axios';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CallEndIcon from '@mui/icons-material/CallEnd';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';

const DirectMessages = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket, unreadCounts, clearUnread } = useContext(SocketContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [admins, setAdmins] = useState([]);
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  
  // Real-time States
  const [showMentions, setShowMentions] = useState(false);
  const [mentionList, setMentionList] = useState([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [remoteTyping, setRemoteTyping] = useState({}); 
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const outgoingTone = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchDMData = async () => {
      try {
        const workspaceId = activeWorkspace || user?.workspaces?.[0];
        if (!workspaceId) return;

        const res = await axios.get(`/api/workspaces/${workspaceId}/members`);
        const all = res.data.filter(m => m._id !== user?._id);
        
        setAdmins(all.filter(m => m.role?.toLowerCase() === 'admin'));
        setMembers(all.filter(m => m.role?.toLowerCase() === 'member'));
        setClients(all.filter(m => m.role?.toLowerCase() === 'client'));
        setMentionList(all); 

        if (location.state?.selectedUser) {
          setActiveUser(location.state.selectedUser);
        }
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
      // Clear unread count globally for this user
      clearUnread(activeUser._id);
    }
  }, [activeUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on('get_online_users', (users) => {
      setOnlineUsers(new Set(users));
    });

    socket.on('user_online', (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user_offline', (userId) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socket.on('call_joined', (data) => {
      outgoingTone.current.pause();
      setIsCalling(false);
      navigate(`/video-call?room=${data.roomId}`);
    });

    socket.on('call_busy', () => {
      outgoingTone.current.pause();
      setIsCalling(false);
      alert(`${activeUser?.name} is busy or declined the call.`);
    });

    socket.on('typing', (room) => {
      if (room === user?._id) return; 
      setRemoteTyping(prev => ({ ...prev, [room]: true }));
    });

    socket.on('stop_typing', (room) => {
      setRemoteTyping(prev => ({ ...prev, [room]: false }));
    });

    const messageListener = (newMessage) => {
      if (newMessage.isDirectMessage) {
        const senderId = (newMessage.senderId || newMessage.sender?._id || newMessage.sender).toString();
        const receiverId = (newMessage.receiverId || newMessage.receiver?._id || newMessage.receiver).toString();
        const myId = user?._id?.toString();
        const activeId = activeUser?._id?.toString();

        if (receiverId === myId || senderId === myId) {
          if (senderId === activeId || (senderId === myId && receiverId === activeId)) {
            setMessages((prev) => [...prev, newMessage]);
            scrollToBottom();
          }
        }
      }
    };
    socket.on('message_received', messageListener);
    return () => {
      socket.off('get_online_users');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('message_received', messageListener);
      socket.off('call_joined');
      socket.off('call_busy');
      socket.off('typing');
      socket.off('stop_typing');
      outgoingTone.current.pause();
    };
  }, [socket, activeUser, user]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!isTyping && activeUser) {
      setIsTyping(true);
      socket.emit('typing', activeUser._id); 
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeUser) socket.emit('stop_typing', activeUser._id);
      setIsTyping(false);
    }, 2000);

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
    if (!messageInput.trim()) return;
    if (!activeUser) return;

    socket.emit('stop_typing', activeUser._id);
    setIsTyping(false);

    const content = messageInput;
    setMessageInput('');
    setShowMentions(false);

    try {
      const payload = {
        content,
        receiverId: activeUser._id,
        workspaceId: activeWorkspace || user?.workspaces?.[0],
        isDirectMessage: true
      };
      const res = await axios.post('/api/messages', payload);
      if (socket) socket.emit('new_message', res.data);
      setMessages(prev => [...prev, res.data]);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const renderMessageContent = (content) => {
    if (!content) return "";
    const parts = content.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <Typography key={i} component="span" variant="body2" sx={{ fontWeight: 800, color: '#ffc107', backgroundColor: 'rgba(255, 193, 7, 0.1)', px: 0.5, borderRadius: 1 }}>{part}</Typography>;
      }
      return part;
    });
  };

  const handleStartCall = () => {
    if (!activeUser || !socket) return;
    const roomId = `call_${Date.now()}_${user._id}`;
    setIsCalling(true);
    outgoingTone.current.loop = true;
    outgoingTone.current.play().catch(() => {});

    socket.emit('call_request', {
      from: { _id: user._id, name: user.name, profileImage: user.profileImage },
      toId: activeUser._id,
      roomId
    });
  };

  const isClient = user?.role?.toLowerCase() === 'client';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const filterList = (list) => list.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredMentions = mentionList.filter(u => u.name?.toLowerCase().includes(mentionSearch.toLowerCase()));

  const UserListItem = ({ u, sub }) => (
    <ListItemButton key={u._id} onClick={() => setActiveUser(u)} selected={activeUser?._id === u._id} sx={{ borderRadius: 3, mb: 0.5, py: 1.2 }}>
      <ListItemAvatar>
        <Badge badgeContent={unreadCounts[u._id]?.count || 0} color="error" overlap="circular">
          <Avatar src={u.profileImage} sx={{ width: 44, height: 44, borderRadius: 2 }} />
        </Badge>
      </ListItemAvatar>
      <ListItemText 
        primary={u.name} 
        secondary={remoteTyping[u._id] ? "is typing..." : (onlineUsers.has(u._id) ? "Online" : sub)} 
        primaryTypographyProps={{ fontWeight: 800, fontSize: '0.95rem' }} 
        secondaryTypographyProps={{ 
          fontWeight: 700, 
          fontSize: '0.75rem', 
          color: remoteTyping[u._id] ? '#48bb78' : (onlineUsers.has(u._id) ? '#48bb78' : 'inherit') 
        }} 
      />
    </ListItemButton>
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 110px)', backgroundColor: '#ffffff', borderRadius: 5, overflow: 'hidden', border: '1px solid #f1f3f5' }}>
      {/* Sidebar */}
      <Box sx={{ width: 340, borderRight: '1px solid #f1f3f5', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 3 }}>Direct Messages</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 3, px: 2, py: 1, border: '1px solid #f1f3f5' }}>
            <SearchIcon sx={{ color: '#adb5bd', fontSize: 20, mr: 1 }} />
            <InputBase placeholder="Search people..." sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Box>
        </Box>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
          {/* Admins Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ px: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
               <SecurityIcon sx={{ fontSize: 14, color: '#5a67d8' }} />
               <Typography variant="overline" sx={{ fontWeight: 900, color: '#adb5bd', letterSpacing: 1.5 }}>WORKSPACE ADMINS</Typography>
            </Box>
            <List disablePadding>
              {filterList(admins).map(u => <UserListItem key={u._id} u={u} sub="Administrator" />)}
            </List>
          </Box>

          {/* Members Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ px: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
               <GroupIcon sx={{ fontSize: 14, color: '#48bb78' }} />
               <Typography variant="overline" sx={{ fontWeight: 900, color: '#adb5bd', letterSpacing: 1.5 }}>TEAM MEMBERS</Typography>
            </Box>
            <List disablePadding>
              {filterList(members).map(u => <UserListItem key={u._id} u={u} sub="Member" />)}
            </List>
          </Box>

          {(!isClient) && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ px: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                 <PersonIcon sx={{ fontSize: 14, color: '#ed8936' }} />
                 <Typography variant="overline" sx={{ fontWeight: 900, color: '#adb5bd', letterSpacing: 1.5 }}>WORKSPACE CLIENTS</Typography>
              </Box>
              <List disablePadding>
                {filterList(clients).map(u => <UserListItem key={u._id} u={u} sub="Client Account" />)}
              </List>
            </Box>
          )}
        </Box>
      </Box>

      {/* Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fcfcfc' }}>
        {activeUser ? (
          <>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f3f5', backgroundColor: '#ffffff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={activeUser.profileImage} sx={{ width: 48, height: 48, borderRadius: 2.5 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{activeUser.name}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: onlineUsers.has(activeUser._id) ? '#48bb78' : '#adb5bd' }}>
                    {remoteTyping[activeUser._id] ? "typing..." : (onlineUsers.has(activeUser._id) ? "● Online" : "● Offline")}
                  </Typography>
                </Box>
              </Box>
            </Box>


            <Box sx={{ flexGrow: 1, p: 4, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {messages.map((msg) => {
                const isMe = (msg.sender?._id || msg.sender).toString() === user?._id?.toString();
                return (
                  <Box key={msg._id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <Box sx={{ p: 2, px: 2.5, borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px', backgroundColor: isMe ? '#5a67d8' : '#ffffff', color: isMe ? 'white' : '#1a202c', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: isMe ? 'none' : '1px solid #f1f3f5', maxWidth: '65%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
                        {isMe ? msg.content : renderMessageContent(msg.content)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 3, backgroundColor: '#ffffff', borderTop: '1px solid #f1f3f5', position: 'relative' }}>
              {remoteTyping[activeUser._id] && (
                <Box sx={{ position: 'absolute', bottom: '100%', left: 24, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#48bb78', animation: 'pulse 1.5s infinite' }}>{activeUser.name} is typing...</Typography>
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
                    <Typography variant="caption" sx={{ fontWeight: 900, color: '#64748b' }}>MENTION SOMEONE</Typography>
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

              <Paper component="form" onSubmit={handleSendMessage} sx={{ p: '8px 12px', display: 'flex', alignItems: 'center', borderRadius: 4, boxShadow: 'none', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <IconButton sx={{ p: 1 }}><AttachFileIcon /></IconButton>
                <InputBase 
                  inputRef={inputRef}
                  sx={{ ml: 2, flex: 1, fontWeight: 600, fontSize: '0.95rem' }} 
                  placeholder={`Message ${activeUser.name}...`} 
                  value={messageInput} 
                  onChange={handleInputChange} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  autoFocus
                />
                <IconButton type="submit" sx={{ p: 1, backgroundColor: '#5a67d8', color: 'white', '&:hover': { backgroundColor: '#4c51bf' } }}><SendIcon sx={{ fontSize: 20 }} /></IconButton>
              </Paper>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
            <Avatar sx={{ width: 80, height: 80, backgroundColor: '#f0f4ff', color: '#5a67d8' }}><ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 40 }} /></Avatar>
            <Typography sx={{ fontWeight: 800, color: '#718096' }}>Select a team member to start chatting</Typography>
          </Box>
        )}
      </Box>

      {/* Outgoing Call Dialog */}
      <Dialog open={isCalling} PaperProps={{ sx: { borderRadius: 8, p: 4, textAlign: 'center', minWidth: 320, backgroundColor: '#000', color: '#fff' } }}>
        <Box sx={{ mb: 4, position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 140, height: 140, borderRadius: '50%', backgroundColor: 'rgba(14, 113, 235, 0.15)', animation: 'pulse-out 1.5s infinite' }} />
          <Avatar src={activeUser?.profileImage} sx={{ width: 100, height: 100, mx: 'auto', border: '3px solid #0e71eb', position: 'relative', zIndex: 2 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Calling {activeUser?.name}...</Typography>
        <Typography variant="body2" sx={{ color: '#718096', mb: 4, fontWeight: 800 }}>WAITING FOR ANSWER</Typography>
        <IconButton onClick={() => setIsCalling(false)} sx={{ width: 64, height: 64, backgroundColor: '#f56565', color: 'white', '&:hover': { backgroundColor: '#e53e3e' } }}>
          <CallEndIcon sx={{ fontSize: 32 }} />
        </IconButton>
        <style>{`
          @keyframes pulse-out { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; } }
          @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        `}</style>
      </Dialog>
    </Box>
  );
};

export default DirectMessages;
