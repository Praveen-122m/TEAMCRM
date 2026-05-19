import React, { useContext, useState, useEffect } from 'react';
import { 
  Box, Typography, Avatar, IconButton, Badge, Menu, MenuItem, 
  List, ListItem, ListItemAvatar, ListItemText, Divider, Button, Fade
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import axios from 'axios';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import { useNavigate } from 'react-router-dom';

const TopNav = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const { unreadCounts, totalUnread, clearUnread } = useContext(SocketContext);
  const [workspaceName, setWorkspaceName] = useState('Team Workspace');
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkspaceName = async () => {
      if (!activeWorkspace) return;
      try {
        const res = await axios.get('/api/workspaces');
        if (Array.isArray(res.data)) {
          const current = res.data.find(w => w._id === activeWorkspace);
          if (current) setWorkspaceName(current.name);
        }
      } catch (err) {
        console.error('TopNav Workspace Fetch Error:', err);
      }
    };
    fetchWorkspaceName();
  }, [activeWorkspace]);

  const handleOpenNotifications = (event) => setAnchorEl(event.currentTarget);
  const handleCloseNotifications = () => setAnchorEl(null);

  const handleNotificationClick = (notif) => {
    if (notif.type === 'dm') {
      navigate('/dms', { state: { selectedUser: { _id: notif.id } } });
    } else if (notif.type === 'mention') {
      navigate('/channels', { state: { activeChannelId: notif.channelId } });
    } else if (notif.type === 'announcement') {
      navigate('/announcements');
    }
    clearUnread(notif.id);
    handleCloseNotifications();
  };

  // Convert unreadCounts map to a list for rendering
  const notifications = Object.entries(unreadCounts)
    .filter(([_, data]) => data.count > 0)
    .map(([id, data]) => ({ id, ...data }));

  return (
    <Box sx={{ 
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      px: 3, backgroundColor: '#ffffff', borderBottom: '1px solid #f0f0f0',
      zIndex: 1100, position: 'sticky', top: 0
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1a202c' }}>
          Workspace: <span style={{ color: '#5a67d8' }}>{workspaceName}</span>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small" sx={{ color: '#718096' }}>
          <HelpOutlineOutlinedIcon fontSize="small" />
        </IconButton>
        
        <IconButton size="small" sx={{ color: '#718096' }} onClick={handleOpenNotifications}>
          <Badge badgeContent={totalUnread} color="error" overlap="rectangular">
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseNotifications}
          TransitionComponent={Fade}
          PaperProps={{
            sx: { 
              mt: 1.5, borderRadius: 4, width: 360, 
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #f1f3f5' 
            }
          }}
        >
          <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Notification Center</Typography>
            {totalUnread > 0 && <Badge badgeContent={totalUnread} color="error" sx={{ mr: 2 }} />}
          </Box>
          <Divider />
          <List sx={{ p: 0, maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length > 0 ? notifications.map((notif) => (
              <MenuItem 
                key={notif.id} 
                onClick={() => handleNotificationClick(notif)}
                sx={{ py: 2, px: 2, '&:hover': { backgroundColor: '#f8fafc' } }}
              >
                <ListItemAvatar sx={{ minWidth: 56 }}>
                  <Badge 
                    overlap="circular" 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={notif.type === 'dm' ? <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 10, color: 'white' }} /> : <AlternateEmailIcon sx={{ fontSize: 10, color: 'white' }} />}
                    sx={{ '& .MuiBadge-badge': { backgroundColor: notif.type === 'dm' ? '#5a67d8' : '#ed8936', width: 16, height: 16, borderRadius: '50%', minWidth: 16 } }}
                  >
                    <Avatar src={notif.profileImage} sx={{ width: 44, height: 44, borderRadius: 2.5 }} />
                  </Badge>
                </ListItemAvatar>
                <ListItemText 
                  primary={notif.name} 
                  secondary={notif.lastMessage}
                  primaryTypographyProps={{ fontWeight: 900, fontSize: '0.85rem', color: '#1a202c' }}
                  secondaryTypographyProps={{ 
                    fontWeight: 600, fontSize: '0.75rem', color: '#718096',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}
                />
                {notif.count > 0 && (
                  <Box sx={{ 
                    ml: 1, bgcolor: notif.type === 'dm' ? '#5a67d8' : '#ed8936', color: 'white', borderRadius: 1.5, 
                    px: 0.8, py: 0.2, fontSize: '0.65rem', fontWeight: 900 
                  }}>
                    {notif.count}
                  </Box>
                )}
              </MenuItem>
            )) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 700 }}>No new alerts</Typography>
              </Box>
            )}
          </List>
          {notifications.length > 0 && (
            <>
              <Divider />
              <Box sx={{ p: 1.5, textAlign: 'center' }}>
                <Button fullWidth size="small" onClick={() => navigate('/dms')} sx={{ textTransform: 'none', fontWeight: 900, color: '#5a67d8' }}>View All Activity</Button>
              </Box>
            </>
          )}
        </Menu>

        <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
           <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
             {user?.name}
           </Typography>
           <Avatar src={user?.profileImage} sx={{ width: 32, height: 32, borderRadius: 1.5 }} />
        </Box>
      </Box>
    </Box>
  );
};

export default TopNav;
