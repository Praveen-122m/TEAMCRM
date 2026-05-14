import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Grid, Paper, LinearProgress, Card, CardContent, Button, Divider, Avatar, List, ListItem, ListItemText, Chip, TextField, IconButton, CircularProgress, Tooltip, Breadcrumbs, Link } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EventIcon from '@mui/icons-material/Event';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MessageIcon from '@mui/icons-material/Message';
import RateReviewIcon from '@mui/icons-material/RateReview';

const ClientDashboard = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [members, setMembers] = useState([]);

  const fetchData = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      const [projRes, memRes] = await Promise.all([
        axios.get(`/api/projects/${workspaceId}`),
        axios.get(`/api/workspaces/${workspaceId}/members`)
      ]);
      setProjects(projRes.data);
      setMembers(memRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace]);

  const handleFeedback = async (projectId) => {
    if (!feedback.trim()) return;
    try {
      await axios.put(`/api/projects/${projectId}`, { 
        $push: { feedback: { user: user._id, comment: feedback } } 
      });
      setFeedback('');
      fetchData();
    } catch (err) {
      console.error('Feedback failed', err);
    }
  };

  if (loading) return <Box sx={{ p: 5, textAlign: 'center', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

  // Overview Dashboard View
  const renderOverview = () => (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-0.5px' }}>
            Welcome, {user?.name.split(' ')[0]} (Client)
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096', fontWeight: 500 }}>
            Workspace: <span style={{ color: '#5a67d8', fontWeight: 800 }}>{localStorage.getItem('activeWorkspaceName') || 'Acme Solutions'}</span>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <IconButton sx={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}><SearchIcon /></IconButton>
          <IconButton sx={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}><NotificationsNoneIcon /></IconButton>
          <Avatar src={user?.profileImage} sx={{ width: 40, height: 40, border: '2px solid #5a67d8' }} />
        </Box>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: '#ebf4ff', color: '#5a67d8' }}><AssignmentIcon /></Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{projects.length}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Total Projects</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: '#f0fff4', color: '#48bb78' }}><CheckCircleIcon /></Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{projects.filter(p => p.status === 'Completed').length}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Completed</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: '#fffaf0', color: '#ed8936' }}><PendingActionsIcon /></Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{projects.filter(p => p.status === 'In Progress').length}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Pending Tasks</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: '#fff5f5', color: '#e53e3e' }}><EventIcon /></Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>3</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Upcoming Deadlines</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Project List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>My Projects</Typography>
              <Button size="small" variant="text" endIcon={<ArrowForwardIosIcon sx={{ fontSize: 10 }} />} sx={{ fontWeight: 800, color: '#5a67d8' }}>View all</Button>
            </Box>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projects.map(project => (
                <ListItemButton 
                  key={project._id} 
                  onClick={() => setSelectedProject(project)}
                  sx={{ p: 2, borderRadius: 4, border: '1px solid #f0f0f0', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: '#5a67d8' } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
                    <Box sx={{ p: 1.5, borderRadius: 3, backgroundColor: '#ebf4ff' }}><AssignmentIcon sx={{ color: '#5a67d8' }} /></Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{project.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                        <LinearProgress variant="determinate" value={project.progress} sx={{ flexGrow: 1, height: 6, borderRadius: 3, backgroundColor: '#f0f0f0', '& .MuiLinearProgress-bar': { backgroundColor: '#5a67d8' } }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#718096' }}>{project.progress}%</Typography>
                      </Box>
                    </Box>
                    <ArrowForwardIosIcon sx={{ fontSize: 14, color: '#cbd5e0' }} />
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </Paper>

          {/* Task Overview Chart (Simplified) */}
          <Paper sx={{ p: 4, mt: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Task Overview</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, py: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={75} size={150} thickness={6} sx={{ color: '#5a67d8' }} />
                <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>75%</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#5a67d8' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Completed: 24 (75%)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ed8936' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Pending: 8 (25%)</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#e53e3e' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Overdue: 2 (6%)</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar Widgets */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, mb: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button fullWidth startIcon={<MessageIcon />} sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, backgroundColor: '#f7fafc', color: '#1a202c', '&:hover': { backgroundColor: '#edf2f7' } }}>Send Message</Button>
              <Button fullWidth startIcon={<RateReviewIcon />} sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, backgroundColor: '#f7fafc', color: '#1a202c', '&:hover': { backgroundColor: '#edf2f7' } }}>Give Feedback</Button>
              <Button fullWidth startIcon={<AccessTimeIcon />} sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, backgroundColor: '#f7fafc', color: '#1a202c', '&:hover': { backgroundColor: '#edf2f7' } }}>Request Meeting</Button>
              <Button fullWidth startIcon={<FolderOpenOutlinedIcon />} sx={{ justifyContent: 'flex-start', p: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, backgroundColor: '#f7fafc', color: '#1a202c', '&:hover': { backgroundColor: '#edf2f7' } }}>Download Report</Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Upcoming Deadlines</Typography>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>UI/UX Final Review</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>May 25, 2024</Typography>
                </Box>
                <Chip label="High" size="small" sx={{ backgroundColor: '#fff5f5', color: '#e53e3e', fontWeight: 800, fontSize: '0.65rem' }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Content Integration</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>May 28, 2024</Typography>
                </Box>
                <Chip label="Medium" size="small" sx={{ backgroundColor: '#fffaf0', color: '#ed8936', fontWeight: 800, fontSize: '0.65rem' }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Final Testing</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>May 30, 2024</Typography>
                </Box>
                <Chip label="High" size="small" sx={{ backgroundColor: '#fff5f5', color: '#e53e3e', fontWeight: 800, fontSize: '0.65rem' }} />
              </Box>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Project Detail View
  const renderDetail = () => (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" sx={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setSelectedProject(null)}>My Projects</Link>
        <Typography color="textPrimary" sx={{ fontWeight: 800 }}>{selectedProject.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{selectedProject.name}</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, fontWeight: 500 }}>Started on Apr 20, 2024 • <Chip label={selectedProject.status} size="small" color="success" sx={{ fontWeight: 800 }} /></Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" sx={{ borderRadius: 3, fontWeight: 700 }}>Manage Files</Button>
          <Button variant="contained" sx={{ backgroundColor: '#5a67d8', borderRadius: 3, fontWeight: 700 }}>Project Settings</Button>
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Progress Overview</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#5a67d8' }}>{selectedProject.progress}%</Typography>
                <LinearProgress variant="determinate" value={selectedProject.progress} sx={{ flexGrow: 1, height: 12, borderRadius: 6, backgroundColor: '#f0f0f0', '& .MuiLinearProgress-bar': { backgroundColor: '#48bb78' } }} />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#718096', fontWeight: 700 }}>Completed</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>24 Tasks</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#718096', fontWeight: 700 }}>Pending</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>8 Tasks</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: '#718096', fontWeight: 700 }}>Overdue</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#e53e3e' }}>2 Tasks</Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 4 }} />

            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Task Progress</Typography>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { name: 'Homepage Design', progress: 100, status: 'Completed' },
                { name: 'Inner Pages Design', progress: 100, status: 'Completed' },
                { name: 'Frontend Development', progress: 60, status: 'In Progress' },
                { name: 'Backend Integration', progress: 40, status: 'In Progress' },
                { name: 'Testing', progress: 0, status: 'Pending' }
              ].map((task, idx) => (
                <Box key={idx} sx={{ p: 2, borderRadius: 3, border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AssignmentIcon sx={{ color: '#cbd5e0' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{task.name}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{task.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={task.progress} sx={{ height: 4, borderRadius: 2, backgroundColor: '#f0f0f0', '& .MuiLinearProgress-bar': { backgroundColor: task.progress === 100 ? '#48bb78' : (task.progress > 0 ? '#ed8936' : '#cbd5e0') } }} />
                  </Box>
                  <Chip label={task.status} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, mb: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Team Members</Typography>
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.slice(0, 5).map(m => (
                <Box key={m._id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={m.profileImage} sx={{ width: 40, height: 40, borderRadius: 2 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{m.name}</Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>{m.role || 'Member'}</Typography>
                  </Box>
                </Box>
              ))}
            </List>
            <Button fullWidth sx={{ mt: 3, fontWeight: 800, color: '#5a67d8', textTransform: 'none' }}>View all team members</Button>
          </Paper>

          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Give Feedback</Typography>
            <TextField 
              fullWidth 
              multiline 
              rows={4} 
              placeholder="Write your feedback..." 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4, backgroundColor: '#f8f9fa' } }} 
            />
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleFeedback(selectedProject._id)}
              sx={{ backgroundColor: '#5a67d8', borderRadius: 3, py: 1.5, fontWeight: 700 }}
            >
              Submit
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 4, backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      {selectedProject ? renderDetail() : renderOverview()}
    </Box>
  );
};

export default ClientDashboard;
