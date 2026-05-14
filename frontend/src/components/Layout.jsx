import React, { useState, useContext, useEffect, useRef } from 'react';
import { Box, Snackbar, Alert, Button, Typography, Avatar, Paper } from '@mui/material';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const Layout = ({ children }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
  
  const ringtoneRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'));

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg) => {
      const isDM = msg.isDirectMessage;
      const myId = user._id.toString();
      const receiverId = (msg.receiver?._id || msg.receiver)?.toString();
      
      const isToMe = receiverId === myId;
      const isCurrentChat = location.pathname === '/dms';

      if (isDM && isToMe && !isCurrentChat) {
        setNotification(msg);
        setOpen(true);
      }
    };

    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setShowCallDialog(true);
      const playPromise = ringtoneRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.log("Audio play prevented"));
      }
    };

    const handleCallBusy = () => {
      alert('The user is busy or declined the call.');
    };

    socket.on('message_received', handleNewMessage);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_busy', handleCallBusy);
    
    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_busy', handleCallBusy);
      ringtoneRef.current.pause();
    };
  }, [socket, user, location.pathname]);

  const handleAcceptCall = () => {
    ringtoneRef.current.pause();
    socket.emit('call_accepted', { toId: incomingCall.from._id, roomId: incomingCall.roomId });
    navigate(`/video-call?room=${incomingCall.roomId}`);
    setShowCallDialog(false);
  };

  const handleDeclineCall = () => {
    ringtoneRef.current.pause();
    socket.emit('call_rejected', { toId: incomingCall.from._id });
    setShowCallDialog(false);
    setIncomingCall(null);
  };

  const handleClose = () => setOpen(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f4f5f7' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: 2,
            pb: 2,
            px: 4,
            width: '100%',
            overflowY: 'auto'
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Global Notification Pop-up */}
      <Snackbar 
        open={open} 
        autoHideDuration={6000} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 7 }}
      >
        <Alert 
          onClose={handleClose} 
          severity="info" 
          icon={false}
          sx={{ 
            width: '100%', 
            backgroundColor: '#ffffff', 
            color: '#1a202c',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            '& .MuiAlert-message': { p: 0 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
            <Avatar src={notification?.sender?.profileImage} sx={{ width: 40, height: 40 }} />
            <Box sx={{ mr: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{notification?.sender?.name}</Typography>
              <Typography variant="body2" sx={{ color: '#718096', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {notification?.content}
              </Typography>
            </Box>
            <Button 
              size="small" 
              variant="contained" 
              onClick={() => {
                navigate('/dms', { state: { selectedUser: notification.sender } });
                handleClose();
              }}
              sx={{ backgroundColor: '#5a67d8', textTransform: 'none', borderRadius: 2 }}
            >
              Reply
            </Button>
          </Box>
        </Alert>
      </Snackbar>

      {/* Incoming Call Dialog */}
      <Snackbar open={showCallDialog} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ mt: 10 }}>
        <Paper sx={{ p: 3, width: 320, textAlign: 'center', borderRadius: 4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '2px solid #5a67d8' }}>
          <Avatar src={incomingCall?.from?.profileImage} sx={{ width: 70, height: 70, mx: 'auto', mb: 2, border: '3px solid #5a67d8' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Incoming Call</Typography>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>{incomingCall?.from?.name} is calling...</Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" color="error" onClick={handleDeclineCall} sx={{ borderRadius: 2 }}>Decline</Button>
            <Button variant="contained" color="success" onClick={handleAcceptCall} sx={{ borderRadius: 2, backgroundColor: '#48bb78' }}>Accept</Button>
          </Box>
        </Paper>
      </Snackbar>
    </Box>
  );
};

export default Layout;
