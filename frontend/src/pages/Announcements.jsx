import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, Typography, Grid, Paper, Button, Divider, List, 
  ListItem, ListItemText, Chip, Avatar, TextField, 
  IconButton, Modal, Select, MenuItem, FormControl, 
  InputLabel, CircularProgress, Badge, Tooltip, Stack
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import HistoryIcon from '@mui/icons-material/History';
import MessageIcon from '@mui/icons-material/Message';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CampaignIcon from '@mui/icons-material/Campaign';
import LockIcon from '@mui/icons-material/Lock';
import GroupsIcon from '@mui/icons-material/Groups';

const Announcements = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  
  const [newAnn, setNewAnn] = useState({
    title: '',
    message: '',
    priority: 'Medium'
  });

  const fetchData = async () => {
    try {
      const workspaceId = activeWorkspace || user?.workspaces?.[0];
      if (!workspaceId) return;

      const annRes = await axios.get(`/api/announcements/${workspaceId}`);
      setAnnouncements(annRes.data);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace]);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('announcement_received', (data) => {
      setAnnouncements(prev => {
        if (prev.find(a => a._id === data._id)) {
           return prev.map(a => a._id === data._id ? data : a);
        }
        return [data, ...prev];
      });
      if (selectedAnn?._id === data._id) {
        setSelectedAnn(data);
      }
    });

    return () => {
      socket.off('announcement_received');
    };
  }, [socket, selectedAnn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const workspaceId = activeWorkspace || user?.workspaces?.[0];
      if (newAnn._id) {
        await axios.put(`/api/announcements/${newAnn._id}`, { ...newAnn, workspace: workspaceId });
      } else {
        await axios.post('/api/announcements', { ...newAnn, workspace: workspaceId });
      }
      setIsModalOpen(false);
      setNewAnn({ title: '', message: '', priority: 'Medium' });
      fetchData();
    } catch (err) {
      console.error('Failed to save announcement', err);
    }
  };

  const handleBroadcast = async (id) => {
    try {
      await axios.post(`/api/announcements/${id}/broadcast`);
      alert('Announcement successfully sent to all workspace members!');
      fetchData();
    } catch (err) {
      console.error('Broadcast failed', err);
      alert('Failed to send update.');
    }
  };

  const handleReply = async (id) => {
    if (!replyMessage.trim()) return;
    try {
      const res = await axios.post(`/api/announcements/${id}/reply`, { message: replyMessage });
      setSelectedAnn(res.data);
      setReplyMessage('');
      fetchData();
    } catch (err) {
      console.error('Reply failed', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await axios.put(`/api/announcements/${id}`, { status: 'Approved' });
      setSelectedAnn(res.data);
      fetchData();
    } catch (err) {
      console.error('Approve failed', err);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await axios.put(`/api/announcements/${id}`, { status: 'Rejected' });
      setSelectedAnn(res.data);
      fetchData();
    } catch (err) {
      console.error('Reject failed', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`/api/announcements/${id}`);
      setSelectedAnn(null);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Urgent': return '#e53e3e';
      case 'High': return '#ed8936';
      case 'Medium': return '#3182ce';
      default: return '#718096';
    }
  };

  if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

  const isAdmin = user.role?.toLowerCase() === 'admin';

  return (
    <Box sx={{ p: 4, backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-0.5px' }}>
            Workspace Updates
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096', mt: 0.5 }}>
            {isAdmin ? 'Manage project communications and client requests.' : 'Official broadcasts and team updates.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setIsModalOpen(true)}
            sx={{ backgroundColor: '#1a202c', borderRadius: 3, fontWeight: 700, px: 3, textTransform: 'none' }}
          >
            {user.role?.toLowerCase() === 'client' ? 'Submit New Request' : 'Post Update'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={selectedAnn ? 6 : 12}>
          <Stack spacing={3}>
            {announcements.length > 0 ? announcements.map((ann) => (
              <Paper 
                key={ann._id} 
                onClick={() => setSelectedAnn(ann)}
                sx={{ 
                  p: 3, borderRadius: 5, border: '1px solid #e2e8f0', 
                  cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: selectedAnn?._id === ann._id ? '#f7fafc' : 'white',
                  borderLeft: (!ann.isBroadcasted && ann.senderRole === 'Client') ? '5px solid #ed8936' : '1px solid #e2e8f0',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar src={ann.sender?.profileImage} sx={{ width: 40, height: 40, borderRadius: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{ann.sender?.name}</Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>
                         {ann.senderRole}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {ann.status === 'Approved' && <Chip label="Approved" size="small" color="success" sx={{ fontWeight: 800 }} />}
                    {ann.status === 'Rejected' && <Chip label="Rejected" size="small" color="error" sx={{ fontWeight: 800 }} />}
                    {!ann.isBroadcasted && ann.senderRole === 'Client' && (
                       <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Admin Only" size="small" sx={{ fontWeight: 800, backgroundColor: '#fffaf0', color: '#ed8936' }} />
                    )}
                    {ann.isBroadcasted && <Chip icon={<GroupsIcon sx={{ fontSize: 14 }} />} label="Broadcasted" size="small" sx={{ fontWeight: 800, backgroundColor: '#ebf4ff', color: '#5a67d8' }} />}
                    <Chip label={ann.priority} size="small" sx={{ fontWeight: 800, backgroundColor: getPriorityColor(ann.priority) + '15', color: getPriorityColor(ann.priority) }} />
                  </Box>
                </Box>
                
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{ann.title}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {ann.message}
                </Typography>
                
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#adb5bd' }}>{new Date(ann.createdAt).toLocaleString()}</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  {isAdmin && !ann.isBroadcasted && ann.senderRole === 'Client' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {ann.status !== 'Approved' && ann.status !== 'Rejected' && (
                        <>
                          <Button size="small" variant="contained" color="success" onClick={(e) => { e.stopPropagation(); handleApprove(ann._id); }} sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none' }}>Approve</Button>
                          <Button size="small" variant="contained" color="error" onClick={(e) => { e.stopPropagation(); handleReject(ann._id); }} sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none' }}>Reject</Button>
                        </>
                      )}
                      <Button 
                        size="small" 
                        variant="contained"
                        startIcon={<GroupsIcon />} 
                        onClick={(e) => { e.stopPropagation(); handleBroadcast(ann._id); }}
                        sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', backgroundColor: '#5a67d8' }}
                      >
                        Send to Workspace Members
                      </Button>
                    </Box>
                  )}
                </Box>
              </Paper>
            )) : (
              <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 6, border: '1px dashed #cbd5e0', backgroundColor: '#f8fafc' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#718096' }}>No Updates Yet</Typography>
              </Paper>
            )}
          </Stack>
        </Grid>

        {selectedAnn && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 5, position: 'sticky', top: 20, height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{selectedAnn.title}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Avatar src={selectedAnn.sender?.profileImage} sx={{ width: 24, height: 24 }} />
                    <Typography variant="caption" color="textSecondary">By {selectedAnn.sender?.name} • {new Date(selectedAnn.createdAt).toLocaleString()}</Typography>
                  </Box>
                </Box>
                <IconButton onClick={() => setSelectedAnn(null)}><CloseIcon /></IconButton>
              </Box>

              <Box sx={{ p: 3, backgroundColor: '#f8fafc', borderRadius: 4, mb: 3, border: '1px solid #edf2f7', flexGrow: 1, overflow: 'auto' }}>
                <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.6 }}>{selectedAnn.message}</Typography>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2 }}>Discussion ({selectedAnn.replies?.length || 0})</Typography>
                <Stack spacing={2}>
                  {selectedAnn.replies?.map((reply, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Avatar src={reply.user?.profileImage} sx={{ width: 32, height: 32, borderRadius: 1.5 }} />
                      <Box sx={{ p: 1.5, backgroundColor: reply.user?._id === user._id ? '#ebf4ff' : '#fff', borderRadius: 3, flexGrow: 1, border: '1px solid #edf2f7' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, display: 'block' }}>{reply.user?.name}</Typography>
                        <Typography variant="body2">{reply.message}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                {isAdmin && !selectedAnn.isBroadcasted && selectedAnn.senderRole === 'Client' && (
                   <>
                     {selectedAnn.status !== 'Approved' && selectedAnn.status !== 'Rejected' && (
                       <>
                         <Button variant="contained" color="success" onClick={() => handleApprove(selectedAnn._id)} sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>Approve</Button>
                         <Button variant="contained" color="error" onClick={() => handleReject(selectedAnn._id)} sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>Reject</Button>
                       </>
                     )}
                     <Button variant="contained" fullWidth startIcon={<GroupsIcon />} onClick={() => handleBroadcast(selectedAnn._id)} sx={{ borderRadius: 3, fontWeight: 800, backgroundColor: '#5a67d8', textTransform: 'none' }}>Send to Workspace Members</Button>
                   </>
                )}
                <IconButton color="error" onClick={() => handleDelete(selectedAnn._id)} sx={{ ml: 'auto' }}><DeleteIcon /></IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField 
                  fullWidth size="small" placeholder="Add a comment..." 
                  value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleReply(selectedAnn._id)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <IconButton onClick={() => handleReply(selectedAnn._id)} sx={{ backgroundColor: '#5a67d8', color: 'white' }}><SendIcon /></IconButton>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 450, bgcolor: 'background.paper', borderRadius: 6, p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>{user.role?.toLowerCase() === 'client' ? 'Submit New Request' : 'New Update'}</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField fullWidth label="Title / Subject" required value={newAnn.title} onChange={(e) => setNewAnn({...newAnn, title: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            <TextField fullWidth label="Details" multiline rows={4} required value={newAnn.message} onChange={(e) => setNewAnn({...newAnn, message: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={newAnn.priority} label="Priority" onChange={(e) => setNewAnn({...newAnn, priority: e.target.value})} sx={{ borderRadius: 3 }}>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => setIsModalOpen(false)} sx={{ borderRadius: 3, fontWeight: 700 }}>Cancel</Button>
              <Button fullWidth variant="contained" type="submit" sx={{ backgroundColor: '#1a202c', borderRadius: 3, fontWeight: 700 }}>
                 {user.role?.toLowerCase() === 'client' ? 'Send to Admin' : 'Post Update'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default Announcements;
