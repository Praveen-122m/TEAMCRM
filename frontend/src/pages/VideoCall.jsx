import React, { useEffect, useState, useContext, useRef } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const VideoCall = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const apiRef = useRef(null);
  
  const queryParams = new URLSearchParams(location.search);
  const roomId = queryParams.get('room') || 'General';

  useEffect(() => {
    if (!user) return;

    const initJitsi = () => {
      if (window.JitsiMeetExternalAPI) {
        // Clear container before initializing to prevent duplicates
        const container = document.querySelector('#jitsi-container');
        if (container) container.innerHTML = '';

        const domain = 'meet.jit.si';
        const options = {
          roomName: roomId,
          width: '100%',
          height: '100%',
          parentNode: container,
          userInfo: {
            displayName: user.name,
            email: user.email
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true
          }
        };

        try {
          apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
          
          apiRef.current.addEventListener('videoConferenceJoined', () => {
            console.log('Jitsi Joined');
            setLoading(false);
          });

          apiRef.current.addEventListener('readyToClose', () => {
            navigate('/calls');
          });
        } catch (err) {
          console.error('Jitsi API Error:', err);
        }
      } else {
        setTimeout(initJitsi, 1000);
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [user, roomId]);

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      {/* Header */}
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/calls')} sx={{ color: 'white' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 900 }}>Workspace Call • {roomId.substring(0, 15)}...</Typography>
        </Box>
        <Button variant="contained" color="error" size="small" onClick={() => navigate('/calls')} sx={{ fontWeight: 800 }}>End Call</Button>
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative', backgroundColor: '#000' }}>
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', zIndex: 10 }}>
            <CircularProgress size={50} sx={{ color: '#0e71eb', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>Connecting...</Typography>
          </Box>
        )}
        <div id="jitsi-container" style={{ width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
};

export default VideoCall;
