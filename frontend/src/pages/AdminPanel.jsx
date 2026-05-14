import React, { useEffect, useState, useContext } from 'react';
import { Box, Typography, Grid, Paper, Avatar, List, ListItem, ListItemAvatar, ListItemText, Divider, Chip, CircularProgress, Button, TextField, Alert, IconButton, Tooltip, Tabs, Tab } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import TagIcon from '@mui/icons-material/Tag';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ForumIcon from '@mui/icons-material/Forum';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import ChannelChat from './ChannelChat';

const AdminStatCard = ({ title, value, icon, color, loading }) => (
  <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ p: 1, borderRadius: 2, backgroundColor: `${color}15`, color: color }}>{icon}</Box>
    </Box>
    {loading ? <CircularProgress size={24} /> : (
      <>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>{value}</Typography>
        <Typography variant="subtitle2" sx={{ color: '#718096', fontWeight: 600 }}>{title}</Typography>
      </>
    )}
  </Paper>
);

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, wpRes] = await Promise.all([
        axios.get('/api/users/admin/stats'),
        axios.get('/api/workspaces')
      ]);
      setStats(statsRes.data);
      if (wpRes.data.length > 0) {
        const wp = wpRes.data[0];
        setWorkspace(wp);
        const memRes = await axios.get(`/api/workspaces/${wp._id}/members`);
        setMembers(memRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleRoleChange = async (memberId, currentRole) => {
    try {
      const newRole = currentRole === 'Admin' ? 'Member' : 'Admin';
      await axios.put(`/api/workspaces/${workspace._id}/members/${memberId}/role`, { role: newRole });
      fetchData();
    } catch (err) {
      alert('Failed to change role');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-1.5px', mb: 1 }}>{workspace?.name} Dashboard</Typography>
          <Typography variant="subtitle2" color="textSecondary">Manage your team and collaborate in real-time</Typography>
        </Box>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' } }}>
          <Tab icon={<SettingsIcon />} label="Overview" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<ForumIcon />} label="Workspace Chat" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      {activeTab === 0 ? (
        <>
          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6} md={3}><AdminStatCard title="Team Members" value={members.length} icon={<GroupIcon />} color="#5a67d8" /></Grid>
            <Grid item xs={12} sm={6} md={3}><AdminStatCard title="Total Channels" value={stats?.totalChannels || 0} icon={<TagIcon />} color="#48bb78" /></Grid>
            <Grid item xs={12} sm={6} md={3}><AdminStatCard title="Workspace Level" value="Pro" icon={<VerifiedUserIcon />} color="#ed8936" /></Grid>
            <Grid item xs={12} sm={6} md={3}><AdminStatCard title="Active Status" value="Online" icon={<FlashOnIcon />} color="#e53e3e" /></Grid>
          </Grid>

          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Member Management</Typography>
              <Paper sx={{ borderRadius: 4, border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: 'none' }}>
                <List sx={{ p: 0 }}>
                  {members.map((m, idx) => (
                    <React.Fragment key={m._id}>
                      <ListItem sx={{ py: 2, px: 3 }}>
                        <ListItemAvatar><Avatar src={m.profileImage} sx={{ borderRadius: 2 }} /></ListItemAvatar>
                        <ListItemText primary={m.name} secondary={m.email} primaryTypographyProps={{ fontWeight: 700 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={m.role || 'Member'} size="small" sx={{ fontWeight: 700, backgroundColor: m.role === 'Admin' ? '#ebf4ff' : '#f7fafc', color: m.role === 'Admin' ? '#5a67d8' : '#718096' }} />
                          {user._id !== m._id && (
                            <IconButton size="small" onClick={() => handleRoleChange(m._id, m.role)}><SecurityIcon fontSize="small" /></IconButton>
                          )}
                        </Box>
                      </ListItem>
                      {idx < members.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Invite Code & QR</Typography>
              <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #f0f0f0', textAlign: 'center', boxShadow: 'none' }}>
                <Box sx={{ p: 2, backgroundColor: 'white', display: 'inline-block', borderRadius: 3, border: '1px solid #f0f0f0', mb: 3 }}>
                   <QRCodeSVG value={workspace?.inviteCode || 'N/A'} size={150} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', backgroundColor: '#f7fafc', p: 1, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                   <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: 2 }}>{workspace?.inviteCode}</Typography>
                   <Button variant="contained" size="small" onClick={() => { navigator.clipboard.writeText(workspace.inviteCode); alert('Copied!'); }} sx={{ borderRadius: 1.5, backgroundColor: '#5a67d8' }}>Copy</Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <Box sx={{ 
          borderRadius: '0 0 24px 24px', 
          overflow: 'hidden', 
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          backgroundColor: '#ffffff',
          height: 'calc(100vh - 220px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <ChannelChat isEmbedded={true} />
        </Box>
      )}
    </Box>
  );
};

export default AdminPanel;
