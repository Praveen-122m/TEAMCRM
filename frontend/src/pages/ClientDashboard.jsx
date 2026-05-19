import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, Typography, Grid, Paper, Divider, Button, CircularProgress, 
  List, ListItem, Avatar, Chip, IconButton, 
  Link, Modal, LinearProgress, Stack, Tooltip, Menu, MenuItem
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CampaignIcon from '@mui/icons-material/Campaign';
import MessageIcon from '@mui/icons-material/Message';
import { useNavigate } from 'react-router-dom';
import CreateProjectRequestModal from '../components/modals/CreateProjectRequestModal';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ClientDashboard = () => {
  const { user, activeWorkspace, setActiveWorkspace } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [stats, setStats] = useState({ overallProgress: 0, completedTasks: 0, pendingTasks: 0, totalProjects: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const workspaceId = activeWorkspace || user?.workspaces?.[0];
      const [statRes, annRes, wpRes] = await Promise.all([
        workspaceId ? axios.get(`/api/projects/stats/${workspaceId}`) : Promise.resolve({ data: { overallProgress: 0, completedTasks: 0, pendingTasks: 0, totalProjects: 0 } }),
        workspaceId ? axios.get(`/api/announcements/${workspaceId}`) : Promise.resolve({ data: [] }),
        axios.get('/api/workspaces')
      ]);
      
      setStats(statRes.data);
      setAnnouncements(annRes.data.slice(0, 4));
      setWorkspaces(wpRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace]);

  const handleSwitchWorkspace = (id, name) => {
    setActiveWorkspace(id, name);
    setAnchorEl(null);
  };

  if (loading) return <Box sx={{ p: 5, textAlign: 'center', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: '1400px', mx: 'auto', backgroundColor: '#fcfcfc', minHeight: '100vh', pt: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', mb: 1 }}>Welcome back, {user?.name} 👋</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ color: '#718096' }}>Workspace:</Typography>
            <Button 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              endIcon={<ExpandMoreIcon />}
              sx={{ fontWeight: 900, color: '#4c6ef5', textTransform: 'none', fontSize: '1rem' }}
            >
              {workspaces.find(w => w._id === activeWorkspace)?.name || 'Select Workspace'}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {workspaces.map(wp => (
                <MenuItem key={wp._id} onClick={() => handleSwitchWorkspace(wp._id, wp.name)} selected={activeWorkspace === wp._id}>
                  {wp.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsRequestModalOpen(true)} sx={{ backgroundColor: '#4c6ef5', borderRadius: 3, fontWeight: 800, px: 3, py: 1.5, textTransform: 'none' }}>New Project Request</Button>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {[
          { label: 'Total Projects', value: stats.totalProjects, icon: <TrendingUpIcon />, color: '#5c7cfa' },
          { label: 'Tasks Completed', value: stats.completedTasks, icon: <CheckCircleIcon />, color: '#40c057' },
          { label: 'Pending Tasks', value: stats.pendingTasks, icon: <AccessTimeIcon />, color: '#fab005' },
          { label: 'Overall Progress', value: `${stats.overallProgress}%`, icon: <TrendingUpIcon />, color: '#228be6' }
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #f1f3f5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: `${stat.color}15`, color: stat.color }}>{stat.icon}</Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#2d3436' }}>{stat.value}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#adb5bd' }}>{stat.label}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 4, borderRadius: 6, mb: 4, border: '1px solid #f1f3f5', minHeight: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Workspace Announcements</Typography>
            <Stack spacing={3}>
              {announcements.length > 0 ? announcements.map(ann => (
                <Box key={ann._id} sx={{ display: 'flex', gap: 2, p: 2, borderRadius: 4, backgroundColor: '#f8f9fa' }}>
                  <Box sx={{ p: 1.5, height: 'fit-content', borderRadius: 3, backgroundColor: '#ebf4ff', color: '#4c6ef5' }}><CampaignIcon sx={{ fontSize: 20 }} /></Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>{ann.title}</Typography>
                    <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 600 }}>{ann.message}</Typography>
                  </Box>
                </Box>
              )) : (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                  <Typography color="textSecondary">No announcements for this workspace.</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 4, borderRadius: 6, mb: 4, border: '1px solid #f1f3f5', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Quick Actions</Typography>
            <Stack spacing={2}>
              <Button fullWidth variant="contained" startIcon={<MessageIcon />} onClick={() => navigate('/channels')} sx={{ py: 1.5, borderRadius: 3, backgroundColor: '#4c6ef5', fontWeight: 900, textTransform: 'none' }}>Open Workspace Chat</Button>
              <Button fullWidth variant="outlined" onClick={() => navigate('/calls')} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>Meeting Rooms</Button>
              <Button fullWidth variant="outlined" onClick={() => navigate('/files')} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, textTransform: 'none' }}>Access Files</Button>
            </Stack>

          </Paper>
        </Grid>
      </Grid>

      <CreateProjectRequestModal open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} workspaceId={activeWorkspace} onSuccess={fetchData} />
    </Box>
  );
};

export default ClientDashboard;
