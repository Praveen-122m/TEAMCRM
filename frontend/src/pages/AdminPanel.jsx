import React, { useEffect, useState, useContext } from 'react';
import { 
  Box, Typography, Grid, Paper, Avatar, List, ListItem, ListItemAvatar, 
  ListItemText, Divider, Chip, CircularProgress, Button, IconButton, 
  Tooltip, Stack, LinearProgress, InputBase, Link, Modal, TextField, Alert
} from '@mui/material';
import { 
  Group as GroupIcon,
  Tag as TagIcon,
  Videocam as VideocamIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Campaign as CampaignIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, subtext, icon, color, trend, onClick }) => (
  <Paper 
    onClick={onClick}
    sx={{ 
      p: 3, borderRadius: 5, border: '1px solid #f1f3f5', 
      boxShadow: '0 2px 12px rgba(0,0,0,0.02)', height: '100%',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { transform: 'translateY(-4px)', borderColor: color } : {},
      transition: '0.2s'
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
      <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: `${color}15`, color: color }}>{icon}</Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#2d3436' }}>{value}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase' }}>{title}</Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {trend && <Typography variant="caption" sx={{ fontWeight: 800, color: trend.startsWith('+') ? '#40c057' : '#adb5bd' }}>{trend}</Typography>}
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#adb5bd' }}>{subtext}</Typography>
    </Box>
  </Paper>
);

const AdminPanel = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    members: 0, 
    channels: 0,
    clients: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', message: '' });
  const [newClient, setNewClient] = useState({ name: '', secretCode: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    const workspaceId = activeWorkspace || user?.workspaces?.[0] || sessionStorage.getItem('activeWorkspace');
    if (!workspaceId || workspaceId === 'null') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [annRes, memRes, chRes, clientRes] = await Promise.allSettled([
        axios.get(`/api/announcements/${workspaceId}`),
        axios.get(`/api/workspaces/${workspaceId}/members`),
        axios.get(`/api/channels/${workspaceId}`),
        axios.get(`/api/auth/clients/${workspaceId}`)
      ]);

      const newStats = { members: 0, channels: 0, clients: 0 };
      
      if (memRes.status === 'fulfilled') {
        setMembers(memRes.value.data);
        newStats.members = memRes.value.data.length;
      }
      if (chRes.status === 'fulfilled') newStats.channels = chRes.value.data.length;
      if (clientRes.status === 'fulfilled') newStats.clients = clientRes.value.data.length;
      if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data.slice(0, 4));

      setStats(newStats);
    } catch (err) {
      console.error('Admin Panel Fetch Error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeWorkspace]);

  const handleCreateAnnouncement = async () => {
    if (!newAnn.title || !newAnn.message) return;
    try {
      const workspaceId = activeWorkspace || user?.workspaces?.[0];
      await axios.post('/api/announcements', { ...newAnn, workspace: workspaceId });
      setNewAnn({ title: '', message: '' });
      setIsAnnModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create announcement', err);
    }
  };

  const handleOnboardClient = async () => {
    // Validate password complexity
    if (newClient.password.length < 8) {
      return setMsg({ type: 'error', text: 'Client password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one numeric digit (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one special character.' });
    }

    try {
      const workspaceId = activeWorkspace || user?.workspaces?.[0];
      await axios.post('/api/auth/clients', { ...newClient, workspaceId });
      setMsg({ type: 'success', text: `Client ${newClient.name} added!` });
      setIsClientModalOpen(false);
      setNewClient({ name: '', secretCode: '', password: '' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Onboarding failed' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: '1600px', mx: 'auto', backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', mb: 1 }}>
            Admin Control Dashboard 👋
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096' }}>
            Overview of your workspace members, clients and communications.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<PersonAddIcon />}
            onClick={() => setIsClientModalOpen(true)}
            sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none' }}
          >
            Add Client
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            sx={{ borderRadius: 3, fontWeight: 800, textTransform: 'none', backgroundColor: '#4c6ef5' }}
            onClick={() => navigate('/workspaces')}
          >
            Switch Workspace
          </Button>
        </Box>
      </Box>

      {msg.text && <Alert severity={msg.type} sx={{ mb: 4, borderRadius: 3 }} onClose={() => setMsg({text:'', type:''})}>{msg.text}</Alert>}

      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={4}><StatCard title="Team Members" value={stats.members} icon={<GroupIcon />} color="#5c7cfa" subtext="Active users" onClick={() => navigate('/admin-suite')} /></Grid>
        <Grid item xs={12} sm={4}><StatCard title="Workspace Clients" value={stats.clients} icon={<PersonAddIcon />} color="#be4bdb" subtext="Client accounts" onClick={() => navigate('/admin-suite')} /></Grid>
        <Grid item xs={12} sm={4}><StatCard title="Active Channels" value={stats.channels} icon={<TagIcon />} color="#40c057" subtext="Team channels" onClick={() => navigate('/channels')} /></Grid>
      </Grid>

      {/* Content Row */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #f1f3f5', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Workspace Team</Typography>
              <Link onClick={() => navigate('/admin-suite')} sx={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800, color: '#4c6ef5', textDecoration: 'none' }}>Manage Team</Link>
            </Box>
            <Stack spacing={3}>
               {members.slice(0, 8).map((m, i) => (
                 <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                   <Avatar src={m.profileImage} sx={{ width: 40, height: 40, borderRadius: 2 }} />
                   <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{m.name}</Typography>
                     <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 700 }}>{m.role || 'Member'}</Typography>
                   </Box>
                   <Chip label="Member" size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                 </Box>
               ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #f1f3f5' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Latest Announcements</Typography>
                <Stack spacing={2.5}>
                  {announcements.map(ann => (
                    <Box 
                      key={ann._id} 
                      onClick={() => navigate('/announcements', { state: { announcementId: ann._id } })}
                      sx={{ 
                        display: 'flex', gap: 2, p: 2, borderRadius: 4, backgroundColor: '#f8f9fa', 
                        cursor: 'pointer', transition: '0.2s', '&:hover': { backgroundColor: '#edf2ff', transform: 'translateX(5px)' } 
                      }}
                    >
                      <Box sx={{ p: 1, height: 'fit-content', borderRadius: 2, backgroundColor: '#fff', border: '1px solid #f1f3f5' }}>
                        <CampaignIcon sx={{ fontSize: 20, color: '#4c6ef5' }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{ann.title}</Typography>
                        <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ann.message}</Typography>
                      </Box>
                    </Box>
                  ))}
                  <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setIsAnnModalOpen(true)} sx={{ mt: 1, fontWeight: 900, backgroundColor: '#4c6ef5', borderRadius: 3 }}>New Announcement</Button>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #f1f3f5' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Quick Shortcuts</Typography>
                <Stack direction="row" spacing={2}>
                  <Button fullWidth variant="outlined" onClick={() => navigate('/admin-suite')} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}>Workspace Settings</Button>
                  <Button fullWidth variant="outlined" onClick={() => navigate('/channels')} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}>Open Chat</Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Modals */}
      <Modal open={isAnnModalOpen} onClose={() => setIsAnnModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 450, bgcolor: 'background.paper', borderRadius: 5, p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Broadcast Announcement</Typography>
          <Stack spacing={3}>
            <TextField fullWidth label="Title" variant="outlined" value={newAnn.title} onChange={(e) => setNewAnn({...newAnn, title: e.target.value})} />
            <TextField fullWidth multiline rows={4} label="Message" variant="outlined" value={newAnn.message} onChange={(e) => setNewAnn({...newAnn, message: e.target.value})} />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => setIsAnnModalOpen(false)}>Cancel</Button>
              <Button fullWidth variant="contained" onClick={handleCreateAnnouncement} sx={{ backgroundColor: '#4c6ef5' }}>Broadcast</Button>
            </Box>
          </Stack>
        </Box>
      </Modal>

      <Modal open={isClientModalOpen} onClose={() => setIsClientModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 450, bgcolor: 'background.paper', borderRadius: 5, p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Onboard New Client</Typography>
          <Stack spacing={3}>
            <TextField fullWidth label="Full Name" variant="outlined" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
            <TextField fullWidth label="Secret ID" variant="outlined" value={newClient.secretCode} onChange={(e) => setNewClient({...newClient, secretCode: e.target.value})} />
            <TextField fullWidth type="password" label="Password" variant="outlined" value={newClient.password} onChange={(e) => setNewClient({...newClient, password: e.target.value})} />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => setIsClientModalOpen(false)}>Cancel</Button>
              <Button fullWidth variant="contained" onClick={handleOnboardClient} sx={{ backgroundColor: '#4c6ef5' }}>Add Client</Button>
            </Box>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminPanel;
