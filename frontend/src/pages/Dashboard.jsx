import React, { useContext, useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Divider, Button, CircularProgress } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TagIcon from '@mui/icons-material/Tag';
import CreateWorkspaceModal from '../components/modals/CreateWorkspaceModal';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import JoinWorkspaceModal from '../components/modals/JoinWorkspaceModal';
import QRScannerModal from '../components/modals/QRScannerModal';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

const StatCard = ({ title, value, loading }) => (
  <Paper sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #e2e8f0' }}>
    <Typography variant="subtitle2" sx={{ color: '#718096', mb: 1 }}>{title}</Typography>
    {loading ? <CircularProgress size={20} /> : (
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a202c', mt: 'auto' }}>{value}</Typography>
    )}
  </Paper>
);

const Dashboard = () => {
  const { user, activeWorkspace, setActiveWorkspace } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState({ memberCount: 0, channelCount: 0, pendingTasks: 0, upcomingMeetings: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const wpRes = await axios.get('/api/workspaces');
      setWorkspaces(wpRes.data);
      
      if (wpRes.data.length > 0) {
        // Use global activeWorkspace or the first one from list
        const wpId = activeWorkspace || wpRes.data[0]._id;
        const currentWp = wpRes.data.find(w => w._id === wpId) || wpRes.data[0];
        
        if (!activeWorkspace) setActiveWorkspace(currentWp._id, currentWp.name);
        
        const [chRes, statRes] = await Promise.all([
          axios.get(`/api/channels/${wpId}`),
          axios.get(`/api/workspaces/${wpId}/stats`)
        ]);
        setChannels(chRes.data);
        setStats(statRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeWorkspace]);

  const handleWorkspaceSwitch = (wp) => {
    setLoading(true);
    setActiveWorkspace(wp._id, wp.name);
    // No navigation here, just update the dashboard stats and channels
  };

  const currentWp = workspaces.find(w => w._id === activeWorkspace) || workspaces[0];

  if (workspaces.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <Box sx={{ p: 4, maxWidth: 500 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Welcome to TeamWorkspace!</Typography>
          <Typography variant="body1" sx={{ color: '#718096', mb: 4 }}>
            It looks like you aren't part of any workspace yet. Create a new one for your team or join an existing one using an invite code.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<AddCircleOutlinedIcon />} sx={{ borderRadius: 2, px: 3, py: 1 }} onClick={() => setIsCreateModalOpen(true)}>Create Workspace</Button>
            <Button variant="outlined" startIcon={<GroupAddIcon />} sx={{ borderRadius: 2, px: 3, py: 1 }} onClick={() => setIsJoinModalOpen(true)}>Join by Code</Button>
          </Box>
        </Box>
        <CreateWorkspaceModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={(newWp) => { setActiveWorkspace(newWp._id, newWp.name); fetchData(); }} />
        <JoinWorkspaceModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSuccess={() => fetchData()} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a202c' }}>Good morning, {user?.name?.split(' ')[0]}! 👋</Typography>
          <Typography variant="body1" sx={{ color: '#718096', mt: 0.5 }}>Currently viewing: <strong>{currentWp?.name}</strong></Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setIsJoinModalOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Join Team</Button>
          <Button variant="contained" onClick={() => setIsCreateModalOpen(true)} sx={{ borderRadius: 2, backgroundColor: '#5a67d8', textTransform: 'none', fontWeight: 600 }}>New Workspace</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Team Members" value={stats.memberCount} loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Active Channels" value={stats.channelCount} loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Tasks Pending" value={stats.pendingTasks} loading={loading} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="Upcoming Meetings" value={stats.upcomingMeetings} loading={loading} /></Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Workspaces List */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your Workspaces</Typography>
          <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {workspaces.map((wp, idx) => (
              <React.Fragment key={wp._id}>
                <Box 
                  sx={{ 
                    p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
                    backgroundColor: activeWorkspace === wp._id ? '#ebf4ff' : 'transparent',
                    borderLeft: activeWorkspace === wp._id ? '4px solid #5a67d8' : '4px solid transparent',
                    '&:hover': { backgroundColor: activeWorkspace === wp._id ? '#ebf4ff' : '#f7fafc' }
                  }} 
                  onClick={() => handleWorkspaceSwitch(wp)}
                >
                  <Box sx={{ backgroundColor: activeWorkspace === wp._id ? '#5a67d8' : '#edf2f7', color: activeWorkspace === wp._id ? 'white' : '#718096', borderRadius: 2.5, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {wp.name.charAt(0).toUpperCase()}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: activeWorkspace === wp._id ? '#2c5282' : '#1a202c' }}>{wp.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#718096' }}>{wp.owner?._id === user?._id ? 'Owner' : 'Member'}</Typography>
                  </Box>
                </Box>
                {idx < workspaces.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Paper>
        </Grid>

        {/* Channels List */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Channels in {currentWp?.name}</Typography>
          <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {channels.length > 0 ? channels.map((channel, idx) => (
              <React.Fragment key={channel._id}>
                <Box 
                  sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f7fafc' } }} 
                  onClick={() => navigate('/channels', { state: { activeChannelId: channel._id } })}
                >
                  <Box sx={{ backgroundColor: '#edf2f7', color: '#5a67d8', borderRadius: 2, p: 1, display: 'flex' }}><TagIcon fontSize="small" /></Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{channel.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#718096' }}>{channel.description || 'General discussion'}</Typography>
                  </Box>
                </Box>
                {idx < channels.length - 1 && <Divider />}
              </React.Fragment>
            )) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">No channels found</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* DMs / Quick Actions */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Button fullWidth variant="outlined" sx={{ mb: 2, borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 600 }} onClick={() => navigate('/dms')}>Open Direct Messages</Button>
            <Button fullWidth variant="outlined" sx={{ borderRadius: 2, py: 1.2, textTransform: 'none', fontWeight: 600 }} onClick={() => navigate('/meetings')}>Start Meeting</Button>
          </Paper>
        </Grid>
      </Grid>

      <CreateWorkspaceModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={(newWp) => { setActiveWorkspace(newWp); fetchData(); }} />
      <JoinWorkspaceModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSuccess={() => fetchData()} />
    </Box>
  );
};

export default Dashboard;
