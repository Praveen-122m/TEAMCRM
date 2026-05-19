import React, { useContext, useEffect, useState } from 'react';
import { Snackbar, Box, Typography, Avatar, IconButton, Paper, Slide } from '@mui/material';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { useNavigate, useLocation } from 'react-router-dom';

function TransitionLeft(props) {
  return <Slide {...props} direction="left" />;
}

const NotificationPopup = () => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!socket) return;

    const messageListener = (newMessage) => {
      // Don't show notification if user is already on the relevant chat page
      const senderId = newMessage.senderId || newMessage.sender?._id || newMessage.sender;
      const isMe = senderId.toString() === user?._id?.toString();
      if (isMe) return;

      const isDirectMessage = newMessage.isDirectMessage;
      const currentPath = location.pathname;
      
      // Determine if we should skip notification
      let skip = false;
      if (isDirectMessage && currentPath === '/dms') {
         skip = true; 
      }

      if (!skip) {
        setNotification(newMessage);
        setOpen(true);
        // Play subtle sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.play().catch(() => {});
      }
    };

    const announcementListener = (newAnnouncement) => {
      const senderId = newAnnouncement.senderId || newAnnouncement.sender?._id || newAnnouncement.sender;
      const isMe = senderId?.toString() === user?._id?.toString();
      if (isMe) return;

      if (location.pathname === '/announcements') return;

      setNotification({
        isAnnouncement: true,
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        sender: newAnnouncement.sender
      });
      setOpen(true);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.play().catch(() => {});
    };

    socket.on('message_received', messageListener);
    socket.on('announcement_received', announcementListener);
    
    return () => {
      socket.off('message_received', messageListener);
      socket.off('announcement_received', announcementListener);
    };
  }, [socket, user, location.pathname]);

  const handleClose = () => setOpen(false);

  const handleClick = () => {
    if (notification.isAnnouncement) {
      navigate('/announcements');
    } else if (notification.isDirectMessage) {
      navigate('/dms', { state: { selectedUser: notification.sender } });
    } else {
      const targetChannelId = notification.channelId || notification.channel;
      navigate('/channels', { state: { activeChannelId: targetChannelId } });
    }
    setOpen(false);
  };

  if (!notification) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={TransitionLeft}
      sx={{ top: { xs: 20, sm: 40 }, right: { xs: 20, sm: 40 } }}
    >
      <Paper
        elevation={10}
        onClick={handleClick}
        sx={{
          p: 2,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 300,
          maxWidth: 400,
          cursor: 'pointer',
          border: '1px solid #e2e8f0',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          '&:hover': { transform: 'scale(1.02)', transition: '0.2s' }
        }}
      >
        <Avatar src={notification.sender?.profileImage} sx={{ width: 48, height: 48, borderRadius: 2.5 }}>
          <ChatBubbleOutlineOutlinedIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1a202c' }}>
            {notification.sender?.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#718096', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {notification.isAnnouncement ? 'New Workspace Update' : (notification.isDirectMessage ? 'Direct Message' : 'Channel Message')}
          </Typography>
          <Typography variant="body2" sx={{ 
            color: '#718096', 
            fontWeight: 600, 
            fontSize: '0.8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {notification.isAnnouncement ? notification.title : notification.content}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Snackbar>
  );
};

export default NotificationPopup;
