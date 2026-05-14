import React, { useEffect, useState, useContext } from 'react';
import { Box, Typography, Button, IconButton, Paper, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const VideoCall = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get room ID from URL query
  const queryParams = new URLSearchParams(location.search);
  const roomId = queryParams.get('room') || 'General';
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Initialize Jitsi Meet
    const domain = 'meet.jit.si';
    const options = {
      roomName: roomId,
      width: '100%',
      height: '100%',
      parentNode: document.querySelector('#jitsi-container'),
      userInfo: {
        displayName: user.name,
        email: user.email
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ],
      }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    
    api.addEventListener('videoConferenceJoined', () => {
      setLoading(false);
    });

    api.addEventListener('readyToClose', () => {
      navigate('/calls');
    });

    return () => {
      api.dispose();
    };
  }, [user, roomId, navigate]);

  const formatMeetingId = (id) => {
    if (!id || !/^\d+$/.test(id)) return id;
    return id.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', backgroundColor: '#1a202c' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2d3748', borderBottom: '1px solid #4a5568' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/calls')} sx={{ color: 'white' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 800, lineHeight: 1 }}>
              Team Meeting
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0aec0', fontWeight: 600 }}>
              Meeting ID: {formatMeetingId(roomId)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" sx={{ color: '#cbd5e0', borderColor: '#4a5568', textTransform: 'none', borderRadius: 2 }}>
            Invite
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a202c', zIndex: 10 }}>
            <CircularProgress size={60} sx={{ color: '#0e71eb', mb: 2 }} />
            <Typography sx={{ color: 'white', fontWeight: 600 }}>Connecting to Zoom-style secure room...</Typography>
          </Box>
        )}
        <div id="jitsi-container" style={{ width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
};

export default VideoCall;
