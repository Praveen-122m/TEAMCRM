import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Chip, IconButton, Paper, CircularProgress, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import VideocamIcon from '@mui/icons-material/Videocam';
import AddBoxIcon from '@mui/icons-material/AddBox';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const VideoRooms = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'join', 'schedule'
  const [newMeeting, setNewMeeting] = useState({ name: '', description: '', scheduledAt: '', meetingId: '' });
  const [creating, setCreating] = useState(false);

  const fetchRooms = async () => {
    if (!user) return;
    try {
      const workspaceId = user.workspaces?.[0] || localStorage.getItem('activeWorkspace');
      if (workspaceId) {
        const res = await axios.get(`/api/meetings/${workspaceId}`);
        setRooms(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch real rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room_created', fetchRooms);
    return () => socket.off('room_created');
  }, [socket]);

  const handleCreateMeeting = async (e) => {
    if (e) e.preventDefault();
    if (modalMode === 'create' || modalMode === 'schedule') {
      if (!newMeeting.name.trim()) return;
      setCreating(true);
      try {
        const workspaceId = user.workspaces?.[0] || localStorage.getItem('activeWorkspace');
        const res = await axios.post('/api/meetings', { 
          ...newMeeting, 
          workspaceId 
        });
        if (socket) socket.emit('new_room_created', res.data);
        setOpenModal(false);
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
      if (!newMeeting.meetingId.trim()) return;
      navigate(`/video-call?room=${newMeeting.meetingId.replace(/\s/g, '')}`);
    }
  };

  const formatMeetingId = (id) => {
    if (!id) return '';
    return id.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Zoom-Style Action Buttons */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <IconButton 
              onClick={() => { setModalMode('create'); setOpenModal(true); }}
              sx={{ 
                width: 80, height: 80, borderRadius: 3, backgroundColor: '#ff742e', color: 'white', mb: 1,
                '&:hover': { backgroundColor: '#e66829' } 
              }}
            >
              <VideocamIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>New Meeting</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <IconButton 
              onClick={() => { setModalMode('join'); setOpenModal(true); }}
              sx={{ 
                width: 80, height: 80, borderRadius: 3, backgroundColor: '#0e71eb', color: 'white', mb: 1,
                '&:hover': { backgroundColor: '#0c62cc' } 
              }}
            >
              <AddBoxIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Join</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <IconButton 
              onClick={() => { setModalMode('schedule'); setOpenModal(true); }}
              sx={{ 
                width: 80, height: 80, borderRadius: 3, backgroundColor: '#0e71eb', color: 'white', mb: 1,
                '&:hover': { backgroundColor: '#0c62cc' } 
              }}
            >
              <ScheduleIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Schedule</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ textAlign: 'center' }}>
            <IconButton 
              sx={{ 
                width: 80, height: 80, borderRadius: 3, backgroundColor: '#0e71eb', color: 'white', mb: 1,
                '&:hover': { backgroundColor: '#0c62cc' } 
              }}
            >
              <ScreenShareIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Share Screen</Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4 }} />

      <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Recent Meetings</Typography>

      {rooms.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, backgroundColor: '#f7fafc', boxShadow: 'none' }}>
          <MeetingRoomIcon sx={{ fontSize: 48, color: '#cbd5e0', mb: 2 }} />
          <Typography color="textSecondary">No upcoming meetings scheduled</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <Grid item xs={12} md={6} key={room._id}>
              <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ p: 1.5, backgroundColor: room.status === 'Active' ? '#ff742e' : '#0e71eb', borderRadius: 3, color: 'white' }}>
                    <VideocamIcon />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{room.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#718096', display: 'block' }}>
                      ID: {formatMeetingId(room.roomId)}
                    </Typography>
                    {room.status === 'Scheduled' && (
                      <Typography variant="caption" sx={{ color: '#0e71eb', fontWeight: 700 }}>
                        Scheduled for: {new Date(room.scheduledAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => navigate(`/video-call?room=${room.roomId}`)}
                    sx={{ backgroundColor: '#0e71eb', borderRadius: 2, textTransform: 'none' }}
                  >
                    {room.status === 'Active' ? 'Start' : 'Join'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Modal (Create/Join/Schedule) */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {modalMode === 'create' ? 'Start a New Meeting' : modalMode === 'join' ? 'Join a Meeting' : 'Schedule Meeting'}
        </DialogTitle>
        <form onSubmit={handleCreateMeeting}>
          <DialogContent>
            {modalMode === 'join' ? (
              <TextField
                fullWidth
                label="Meeting ID"
                placeholder="e.g. 123 456 7890"
                value={newMeeting.meetingId}
                onChange={(e) => setNewMeeting({ ...newMeeting, meetingId: e.target.value })}
                required
                sx={{ mt: 1 }}
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Meeting Topic"
                  value={newMeeting.name}
                  onChange={(e) => setNewMeeting({ ...newMeeting, name: e.target.value })}
                  required
                  sx={{ mb: 3, mt: 1 }}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  multiline
                  rows={2}
                  sx={{ mb: 3 }}
                />
                {modalMode === 'schedule' && (
                  <TextField
                    fullWidth
                    label="Date and Time"
                    type="datetime-local"
                    value={newMeeting.scheduledAt}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenModal(false)} sx={{ color: '#718096' }}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={creating}
              sx={{ 
                borderRadius: 2, px: 4, 
                backgroundColor: modalMode === 'create' ? '#ff742e' : '#0e71eb',
                '&:hover': { backgroundColor: modalMode === 'create' ? '#e66829' : '#0c62cc' } 
              }}
            >
              {creating ? <CircularProgress size={20} /> : (modalMode === 'create' ? 'Start' : modalMode === 'join' ? 'Join' : 'Schedule')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default VideoRooms;
