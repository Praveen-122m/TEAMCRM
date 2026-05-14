import React, { useContext } from 'react';
import { Box, Typography, Avatar, IconButton, Badge } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

const TopNav = () => {
  const { user } = useContext(AuthContext);

  return (
    <Box sx={{ 
      height: 64, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      px: 3, 
      backgroundColor: '#ffffff', 
      borderBottom: '1px solid #f0f0f0',
      zIndex: 1100,
      position: 'sticky',
      top: 0
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1a202c' }}>
          Workspace: <span style={{ color: '#5a67d8' }}>Teckey Digital</span>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small" sx={{ color: '#718096' }}>
          <HelpOutlineOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: '#718096' }}>
          <Badge variant="dot" color="error">
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
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
