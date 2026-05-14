import React, { useContext } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Divider, Badge, Tooltip } from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Sidebar = () => {
  const { user, logout, activeWorkspace } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const activeWorkspaceName = localStorage.getItem('activeWorkspaceName') || 'Select Team';

  const menuItems = [
    { text: 'Dashboard', icon: <HomeOutlinedIcon />, path: '/' },
    { text: 'Workspaces', icon: <BusinessOutlinedIcon />, path: '/workspaces', memberOnly: true },
    { text: 'Management', icon: <SettingsOutlinedIcon />, path: '/admin-suite', adminOnly: true },
    { text: 'My Projects', icon: <FolderOpenOutlinedIcon />, path: '/projects', clientOnly: true },
    { text: 'Tasks', icon: <CheckCircleIcon />, path: '/projects', clientOnly: true },
    { text: 'Messages', icon: <ChatBubbleOutlineOutlinedIcon />, path: '/dms', clientOnly: true },
    { text: 'Announcements', icon: <ForumOutlinedIcon />, path: '/channels', clientOnly: true },
    { text: 'Attendance', icon: <VideocamOutlinedIcon />, path: '/attendance', memberOnly: true },
    { text: 'Channels', icon: <ForumOutlinedIcon />, path: '/channels', memberOnly: true },
    { text: 'Direct Messages', icon: <ChatBubbleOutlineOutlinedIcon />, path: '/dms', memberOnly: true },
    { text: 'Meetings', icon: <VideocamOutlinedIcon />, path: '/calls' },
    { text: 'File Manager', icon: <FolderOpenOutlinedIcon />, path: '/files' },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && user?.role !== 'Admin') return false;
    if (item.clientOnly && user?.role !== 'Client') return false;
    if (item.memberOnly && user?.role !== 'Member' && user?.role !== 'Admin') return false;
    // Explicitly hide personal attendance for Admin
    if (item.text === 'Attendance' && user?.role === 'Admin') return false;
    return true;
  });

  return (
    <Box sx={{ 
      width: 260, 
      height: '100vh', 
      backgroundColor: '#ffffff', 
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Workspace Quick Switcher (Hidden for Clients) */}
      {user?.role !== 'Client' ? (
        <Box sx={{ p: 2, mb: 1 }}>
          <ListItemButton 
            onClick={() => navigate('/workspaces')}
            sx={{ 
              borderRadius: 3, 
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              p: 1.5,
              transition: 'all 0.2s',
              '&:hover': { backgroundColor: '#edf2f7', borderColor: '#5a67d8' }
            }}
          >
            <Avatar 
              sx={{ 
                width: 36, height: 36, borderRadius: 2, 
                backgroundColor: '#5a67d8', color: 'white',
                fontSize: '1rem', fontWeight: 800, mr: 1.5
              }}
            >
              {activeWorkspaceName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="caption" sx={{ color: '#718096', fontWeight: 700, display: 'block', lineHeight: 1 }}>WORKSPACE</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, noWrap: true, color: '#1a202c' }}>
                {activeWorkspaceName}
              </Typography>
            </Box>
          </ListItemButton>
        </Box>
      ) : (
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            width: 32, height: 32, borderRadius: 1, 
            backgroundColor: '#5a67d8', display: 'flex', 
            alignItems: 'center', justifyContent: 'center' 
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>T</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: '#1a202c' }}>
            TeamChat
          </Typography>
        </Box>
      )}

      <Divider sx={{ mx: 2, mb: 2, opacity: 0.5 }} />

      {/* User Quick Profile */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 3, 
          backgroundColor: '#f7fafc',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}>
          <Badge 
            overlap="circular" 
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
            variant="dot"
            sx={{ '& .MuiBadge-badge': { backgroundColor: '#48bb78', border: '2px solid white' } }}
          >
            <Avatar src={user?.profileImage} sx={{ width: 40, height: 40, borderRadius: 2 }} />
          </Badge>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, noWrap: true }}>{user?.name}</Typography>
            <Typography variant="caption" sx={{ color: '#5a67d8', display: 'block', fontWeight: 800 }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation List */}
      <List sx={{ flexGrow: 1, px: 2 }}>
        {visibleMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 2.5,
                py: 1.2,
                transition: 'all 0.2s',
                backgroundColor: location.pathname === item.path ? '#ebf4ff' : 'transparent',
                color: location.pathname === item.path ? '#5a67d8' : '#718096',
                '&:hover': {
                  backgroundColor: '#f7fafc',
                  color: '#5a67d8'
                },
                '& .MuiListItemIcon-root': {
                  color: location.pathname === item.path ? '#5a67d8' : '#718096',
                  minWidth: 40
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: location.pathname === item.path ? 700 : 500,
                  fontSize: '0.9rem'
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 2, opacity: 0.5 }} />

      {/* Footer Actions */}
      <List sx={{ px: 2, py: 2 }}>
        <ListItem disablePadding>
          <ListItemButton sx={{ borderRadius: 2.5, color: '#718096' }}>
            <ListItemIcon sx={{ minWidth: 40 }}><SettingsOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={logout} sx={{ borderRadius: 2.5, color: '#e53e3e', '&:hover': { backgroundColor: '#fff5f5' } }}>
            <ListItemIcon sx={{ minWidth: 40, color: '#e53e3e' }}><LogoutOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar;
