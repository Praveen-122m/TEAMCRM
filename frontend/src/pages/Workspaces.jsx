import React, { useContext, useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Avatar, Button, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CreateWorkspaceModal from '../components/modals/CreateWorkspaceModal';
import JoinWorkspaceModal from '../components/modals/JoinWorkspaceModal';

const Workspaces = () => {
  const { user, setActiveWorkspace } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/workspaces');
      setWorkspaces(res.data);
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSwitch = (workspaceId) => {
    const wp = workspaces.find(w => w._id === workspaceId);
    if (wp) {
      setActiveWorkspace(wp._id, wp.name);
    }
    navigate('/channels'); // Go straight to chat rooms
  };

  const copyInvite = (code) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied!');
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-1px' }}>Your Workspaces</Typography>
          <Typography variant="body1" sx={{ color: '#718096', mt: 0.5 }}>Manage and switch between your enterprise hubs</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<GroupAddIcon />} 
            onClick={() => setIsJoinModalOpen(true)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Join Team
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddCircleOutlinedIcon />} 
            onClick={() => setIsCreateModalOpen(true)}
            sx={{ borderRadius: 2.5, backgroundColor: '#5a67d8', textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Create Workspace
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {workspaces.map((wp) => (
          <Grid item xs={12} sm={6} md={4} key={wp._id}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 5, 
                border: '1px solid #e2e8f0', 
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-5px)', 
                  boxShadow: '0 12px 25px rgba(0,0,0,0.08)',
                  borderColor: '#5a67d8'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 3, 
                    backgroundColor: '#ebf4ff', 
                    color: '#5a67d8',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}
                >
                  {wp.name.charAt(0).toUpperCase()}
                </Avatar>
                <Chip 
                  label={wp.owner?._id === user?._id ? 'Owner' : 'Member'} 
                  size="small"
                  sx={{ 
                    fontWeight: 800, 
                    backgroundColor: wp.owner?._id === user?._id ? '#ebf4ff' : '#f7fafc',
                    color: wp.owner?._id === user?._id ? '#5a67d8' : '#718096'
                  }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#2d3748' }}>{wp.name}</Typography>
              <Typography variant="body2" sx={{ color: '#718096', mb: 3, height: 40, overflow: 'hidden' }}>
                {wp.description || 'Enterprise collaboration workspace for teams.'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: '#f7fafc', p: 1, borderRadius: 2, mb: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#a0aec0', ml: 1, flexGrow: 1 }}>
                  CODE: {wp.inviteCode}
                </Typography>
                <Tooltip title="Copy Invite Code">
                  <IconButton size="small" onClick={() => copyInvite(wp.inviteCode)}><ContentCopyIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>

              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => handleSwitch(wp._id)}
                sx={{ 
                  borderRadius: 2.5, 
                  backgroundColor: '#1a202c', 
                  py: 1.2, 
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#2d3748' }
                }}
              >
                Launch Workspace
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <CreateWorkspaceModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={() => fetchData()} />
      <JoinWorkspaceModal open={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onSuccess={() => fetchData()} />
    </Box>
  );
};

export default Workspaces;
