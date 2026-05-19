import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Chip, IconButton, Paper, CircularProgress, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider, Tooltip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupIcon from '@mui/icons-material/Group';

const VideoRooms = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'join', 'schedule'
  const [newMeeting, setNewMeeting] = useState({ name: '', description: '', scheduledAt: '', meetingId: '' });
  const [creating, setCreating] = useState(false);

  const fetchRooms = async () => {
    const rawId = activeWorkspace || user?.workspaces?.[0] || localStorage.getItem('activeWorkspace');
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`/api/meetings/${rawId}`);
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user, activeWorkspace]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room_created', fetchRooms);
    socket.on('room_deleted', fetchRooms);
    return () => {
      socket.off('room_created');
      socket.off('room_deleted');
    };
  }, [socket]);

  const handleCreateMeeting = async (e) => {
    if (e) e.preventDefault();
    if (modalMode === 'create' || modalMode === 'schedule') {
      if (!newMeeting.name.trim()) return;
      setCreating(true);
      try {
        const workspaceId = activeWorkspace || user?.workspaces?.[0] || localStorage.getItem('activeWorkspace');
        const res = await axios.post('/api/meetings', { 
          ...newMeeting, 
          workspaceId 
        });
        if (socket) socket.emit('new_room_created', res.data);
        setOpenModal(false);
        setNewMeeting({ name: '', description: '', scheduledAt: '', meetingId: '' });
        
        if (modalMode === 'create') {
          navigate(`/video-call?room=${res.data.roomId}`);
        } else {
          fetchRooms();
        }
      } catch (err) {
        console.error('Action failed', err);
      } finally {
        setCreating(false);
      }
    } else if (modalMode === 'join') {
      const id = newMeeting.meetingId.replace(/\s/g, '');
      if (!id) return;
      navigate(`/video-call?room=${id}`);
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!window.confirm('Delete this meeting permanently?')) return;
    try {
      await axios.delete(`/api/meetings/${id}`);
      if (socket) socket.emit('room_deleted', id);
      fetchRooms();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const copyMeetingId = (id) => {
    navigator.clipboard.writeText(id);
    alert('Meeting ID copied to clipboard!');
  };

  const formatMeetingId = (id) => {
    if (!id) return '';
    return id.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  const isPrivileged = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'member';

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 15 }}>
      <CircularProgress size={50} thickness={4} sx={{ color: '#0e71eb' }} />
      <Typography sx={{ mt: 2, color: '#718096', fontWeight: 600 }}>Loading workspace meetings...</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-1px' }}>Meetings</Typography>
          <Typography variant="body1" sx={{ color: '#718096', fontWeight: 500 }}>Secure, high-definition video conferencing for your team</Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2d3748', opacity: 0.5 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
      </Box>

      {/* Zoom-Style Action Grid */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Stack spacing={1.5} alignItems="center">
            <IconButton 
              disabled={!isPrivileged}
              onClick={() => { setModalMode('create'); setOpenModal(true); }}
              sx={{ 
                width: 90, height: 90, borderRadius: 4, backgroundColor: '#ff742e', color: 'white',
                boxShadow: '0 8px 16px rgba(255, 116, 46, 0.3)',
                '&:hover': { backgroundColor: '#e66829', transform: 'translateY(-4px)' },
                '&:disabled': { backgroundColor: '#cbd5e0' },
                transition: 'all 0.2s'
              }}
            >
              <VideocamIcon sx={{ fontSize: 45 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2d3748' }}>New Meeting</Typography>
          </Stack>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Stack spacing={1.5} alignItems="center">
            <IconButton 
              onClick={() => { setModalMode('join'); setOpenModal(true); }}
              sx={{ 
                width: 90, height: 90, borderRadius: 4, backgroundColor: '#0e71eb', color: 'white',
                boxShadow: '0 8px 16px rgba(14, 113, 235, 0.2)',
                '&:hover': { backgroundColor: '#0c62cc', transform: 'translateY(-4px)' },
                transition: 'all 0.2s'
              }}
            >
              <AddBoxIcon sx={{ fontSize: 45 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2d3748' }}>Join Meeting</Typography>
          </Stack>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Stack spacing={1.5} alignItems="center">
            <IconButton 
              disabled={!isPrivileged}
              onClick={() => { setModalMode('schedule'); setOpenModal(true); }}
              sx={{ 
                width: 90, height: 90, borderRadius: 4, backgroundColor: '#0e71eb', color: 'white',
                boxShadow: '0 8px 16px rgba(14, 113, 235, 0.2)',
                '&:hover': { backgroundColor: '#0c62cc', transform: 'translateY(-4px)' },
                '&:disabled': { backgroundColor: '#cbd5e0' },
                transition: 'all 0.2s'
              }}
            >
              <ScheduleIcon sx={{ fontSize: 45 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2d3748' }}>Schedule</Typography>
          </Stack>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Stack spacing={1.5} alignItems="center">
            <IconButton 
              sx={{ 
                width: 90, height: 90, borderRadius: 4, backgroundColor: '#0e71eb', color: 'white',
                boxShadow: '0 8px 16px rgba(14, 113, 235, 0.2)',
                '&:hover': { backgroundColor: '#0c62cc', transform: 'translateY(-4px)' },
                transition: 'all 0.2s'
              }}
            >
              <ScreenShareIcon sx={{ fontSize: 45 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2d3748' }}>Share Screen</Typography>
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 5, opacity: 0.6 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon sx={{ color: '#5a67d8' }} />
          Upcoming & Recent Meetings
        </Typography>
        <Chip label={`${rooms.length} Rooms Available`} sx={{ fontWeight: 800, backgroundColor: '#ebf4ff', color: '#5a67d8' }} />
      </Box>

      {rooms.length === 0 ? (
        <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 6, backgroundColor: '#fcfcfc', border: '2px dashed #e2e8f0', boxShadow: 'none' }}>
          <MeetingRoomIcon sx={{ fontSize: 60, color: '#cbd5e0', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#4a5568', fontWeight: 800 }}>No Meetings Found</Typography>
          <Typography sx={{ color: '#a0aec0', maxWidth: 300, mx: 'auto', mt: 1 }}>Schedule a session to see it listed here for your team.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <Grid item xs={12} md={6} key={room._id}>
              <Card sx={{ 
                borderRadius: 5, border: '1px solid #e2e8f0', boxShadow: 'none', 
                transition: 'all 0.3s',
                '&:hover': { boxShadow: '0 12px 24px rgba(0,0,0,0.08)', transform: 'translateY(-2px)', borderColor: '#5a67d8' } 
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Box sx={{ 
                      width: 56, height: 56, backgroundColor: room.status === 'Active' ? '#ff742e' : '#ebf4ff', 
                      borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: room.status === 'Active' ? 'white' : '#0e71eb'
                    }}>
                      <VideocamIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, mb: 0.5 }}>{room.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>{room.description || 'No description provided.'}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`ID: ${formatMeetingId(room.roomId)}`} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
                        <Tooltip title="Copy ID">
                          <IconButton size="small" onClick={() => copyMeetingId(room.roomId)} sx={{ color: '#718096' }}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      {(user?._id === room.createdBy?._id || user?.role?.toLowerCase() === 'admin') && (
                        <IconButton size="small" color="error" onClick={() => handleDeleteMeeting(room._id)} sx={{ backgroundColor: '#fff5f5' }}>
                          <DeleteOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2.5, opacity: 0.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      {room.status === 'Scheduled' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: '#0e71eb' }} />
                          <Typography variant="caption" sx={{ color: '#0e71eb', fontWeight: 800 }}>
                            {new Date(room.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Ready to Start" size="small" sx={{ fontWeight: 800, backgroundColor: '#f0fff4', color: '#48bb78' }} />
                      )}
                    </Box>
                    <Button 
                      variant="contained" 
                      onClick={() => navigate(`/video-call?room=${room.roomId}`)}
                      sx={{ 
                        backgroundColor: '#0e71eb', borderRadius: 2.5, textTransform: 'none', px: 4, fontWeight: 800,
                        boxShadow: '0 4px 10px rgba(14, 113, 235, 0.2)'
                      }}
                    >
                      {room.status === 'Active' ? 'Start Now' : 'Join'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Modal (Create/Join/Schedule) */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 6, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem' }}>
          {modalMode === 'create' ? 'Instant Meeting' : modalMode === 'join' ? 'Join by ID' : 'Schedule Meeting'}
        </DialogTitle>
        <form onSubmit={handleCreateMeeting}>
          <DialogContent>
            {modalMode === 'join' ? (
              <TextField
                fullWidth
                label="Enter 10-digit Meeting ID"
                placeholder="123 456 7890"
                variant="filled"
                value={newMeeting.meetingId}
                onChange={(e) => setNewMeeting({ ...newMeeting, meetingId: e.target.value })}
                required
                InputProps={{ sx: { borderRadius: 3, fontWeight: 800, fontSize: '1.2rem', py: 1.5 } }}
              />
            ) : (
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Meeting Topic"
                  placeholder="e.g. Weekly Sync-up"
                  value={newMeeting.name}
                  onChange={(e) => setNewMeeting({ ...newMeeting, name: e.target.value })}
                  required
                  InputProps={{ sx: { borderRadius: 3, fontWeight: 700 } }}
                />
                <TextField
                  fullWidth
                  label="Context / Description"
                  placeholder="What is this meeting about?"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  multiline
                  rows={3}
                  InputProps={{ sx: { borderRadius: 3 } }}
                />
                {modalMode === 'schedule' && (
                  <TextField
                    fullWidth
                    label="Schedule For"
                    type="datetime-local"
                    value={newMeeting.scheduledAt}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                    required
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ sx: { borderRadius: 3, fontWeight: 700 } }}
                  />
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 4, pt: 2 }}>
            <Button onClick={() => setOpenModal(false)} sx={{ color: '#718096', fontWeight: 700, mr: 'auto' }}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={creating}
              sx={{ 
                borderRadius: 3, px: 5, py: 1.5, fontWeight: 800,
                backgroundColor: modalMode === 'create' ? '#ff742e' : '#0e71eb',
                boxShadow: modalMode === 'create' ? '0 6px 12px rgba(255,116,46,0.3)' : '0 6px 12px rgba(14,113,235,0.3)',
                '&:hover': { backgroundColor: modalMode === 'create' ? '#e66829' : '#0c62cc' } 
              }}
            >
              {creating ? <CircularProgress size={24} color="inherit" /> : (modalMode === 'create' ? 'Start Meeting' : modalMode === 'join' ? 'Join' : 'Save & Schedule')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default VideoRooms;
