import React, { useContext, useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, Divider, Button, 
  CircularProgress, Avatar, AvatarGroup, IconButton, 
  LinearProgress, Card, CardContent, Badge, Tooltip, List, Stack
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CampaignIcon from '@mui/icons-material/Campaign';
import CreateWorkspaceModal from '../components/modals/CreateWorkspaceModal';
import JoinWorkspaceModal from '../components/modals/JoinWorkspaceModal';
import ClientDashboard from './ClientDashboard';
import AdminPanel from './AdminPanel';

const StatCard = ({ title, value, icon, color, loading }) => (
  <Paper sx={{ p: 3, borderRadius: 5, border: '1px solid #edf2f7', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="caption" sx={{ color: '#718096', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</Typography>
        {loading ? <CircularProgress size={20} sx={{ mt: 1 }} /> : (
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', mt: 0.5 }}>{value}</Typography>
        )}
      </Box>
      <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: `${color}15`, color: color }}>
        {icon}
      </Box>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const { user, activeWorkspace, setActiveWorkspace } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({ memberCount: 0, channelCount: 0, pendingTasks: 0, upcomingMeetings: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const wpRes = await axios.get('/api/workspaces');
      setWorkspaces(wpRes.data);
      
      const workspaceId = activeWorkspace || wpRes.data[0]?._id;
      if (workspaceId) {
        if (!activeWorkspace) {
          setActiveWorkspace(wpRes.data[0]._id, wpRes.data[0].name);
        }
        
        const [statRes, annRes] = await Promise.all([
          axios.get(`/api/workspaces/${workspaceId}/stats`),
          axios.get(`/api/announcements/${workspaceId}`)
        ]);
        setStats(statRes.data);
        setAnnouncements(annRes.data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'Client' && user.role !== 'Admin') {
      fetchData();
    }
  }, [activeWorkspace, user]);

  if (user?.role === 'Client') return <ClientDashboard />;
  if (user?.role === 'Admin') return <AdminPanel />;

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
      <CircularProgress sx={{ color: '#5a67d8' }} />
      <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600 }}>Loading your workspace...</Typography>
    </Box>
  );

  const currentWp = workspaces.find(w => w._id === activeWorkspace) || workspaces[0];

  return (
    <Box sx={{ p: 4, backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-1px' }}>
            Hello, {user?.name?.split(' ')[0]} 👋
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096', mt: 0.5 }}>
            You are currently in <span style={{ color: '#5a67d8', fontWeight: 800 }}>{currentWp?.name || 'your workspace'}</span>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
           <Button variant="contained" startIcon={<CampaignIcon />} onClick={() => navigate('/announcements')} sx={{ backgroundColor: '#1a202c', borderRadius: 3, fontWeight: 700, textTransform: 'none', px: 3 }}>View All Updates</Button>
        </Box>
      </Box>

      {workspaces.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 6, border: '1px dashed #cbd5e0', backgroundColor: '#f8fafc' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Welcome to TeamChat!</Typography>
          <Typography variant="body1" sx={{ color: '#718096', mb: 4 }}>Join a workspace to start collaborating.</Typography>
          <Button variant="contained" onClick={() => setIsJoinModalOpen(true)} sx={{ borderRadius: 3, px: 4, fontWeight: 700 }}>Join Workspace</Button>
        </Paper>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}><StatCard title="Team Members" value={stats.memberCount} icon={<GroupAddIcon />} color="#5a67d8" /></Grid>
              <Grid item xs={12} sm={6}><StatCard title="Channels" value={stats.channelCount} icon={<ChatBubbleOutlineOutlinedIcon />} color="#48bb78" /></Grid>
            </Grid>

            <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid #edf2f7' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Latest Workspace Announcements</Typography>
              <Stack spacing={2.5}>
                {announcements.length > 0 ? announcements.map(ann => (
                  <Box 
                    key={ann._id} 
                    onClick={() => navigate('/announcements', { state: { announcementId: ann._id } })}
                    sx={{ 
                      display: 'flex', gap: 2, p: 2, borderRadius: 4, backgroundColor: '#f8f9fa',
                      cursor: 'pointer', transition: '0.2s', '&:hover': { backgroundColor: '#ebf4ff', transform: 'translateX(5px)' }
                    }}
                  >
                    <Box sx={{ p: 1, height: 'fit-content', borderRadius: 2, backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                      <CampaignIcon sx={{ fontSize: 20, color: '#5a67d8' }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{ann.title}</Typography>
                      <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ann.message}</Typography>
                    </Box>
                  </Box>
                )) : (
                  <Typography color="textSecondary">No official announcements yet.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid #edf2f7', mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Quick Links</Typography>
              <Stack spacing={2}>
                <Button fullWidth variant="outlined" onClick={() => navigate('/channels')} sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 1.2 }}>Go to Chat</Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/files')} sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 1.2 }}>Files & Docs</Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/workspaces')} sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 1.2 }}>Switch Workspace</Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      <CreateWorkspaceModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={() => fetchData()} />
      <JoinWorkspaceModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSuccess={() => fetchData()} />
    </Box>
  );
};

export default Dashboard;
