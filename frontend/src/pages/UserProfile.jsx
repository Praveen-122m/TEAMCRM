import React, { useContext, useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Avatar, List, ListItemButton, ListItemIcon, ListItemText, Divider, MenuItem, CircularProgress, Alert } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';
import axios from 'axios';

const UserProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    department: '',
    profileImage: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        department: user.department || 'Development',
        profileImage: user.profileImage || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const res = await axios.put('/api/users/profile', formData);
      setUser(res.data);
      setSuccess(true);
    } catch (error) {
      console.error('Update failed', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { text: 'Profile', icon: <PersonOutlineOutlinedIcon />, selected: true },
    { text: 'Account', icon: <LockOutlinedIcon />, selected: false },
    { text: 'Notifications', icon: <NotificationsNoneOutlinedIcon />, selected: false },
    { text: 'Privacy', icon: <SecurityOutlinedIcon />, selected: false },
    { text: 'Appearance', icon: <ColorLensOutlinedIcon />, selected: false },
    { text: 'Integrations', icon: <IntegrationInstructionsOutlinedIcon />, selected: false },
  ];

  return (
    <Box sx={{ p: 1, maxWidth: 1200 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a202c', mb: 3 }}>Profile Settings</Typography>

      <Grid container spacing={4}>
        {/* Settings Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ backgroundColor: 'transparent' }}>
            <List sx={{ pt: 0 }}>
              {menuItems.map((item, index) => (
                <ListItemButton 
                  key={index} 
                  selected={item.selected}
                  sx={{ 
                    borderRadius: 2, 
                    mb: 1,
                    backgroundColor: item.selected ? '#edf2f7' : 'transparent',
                    color: item.selected ? '#5a67d8' : '#4a5568',
                    '&.Mui-selected:hover': { backgroundColor: '#e2e8f0' }
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: item.selected ? 600 : 500 }} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Profile Form Area */}
        <Grid item xs={12} md={9}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a202c', mb: 4 }}>Profile Information</Typography>
            
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>Profile updated successfully!</Alert>}

            <Grid container spacing={6}>
              {/* Avatar Section */}
              <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar 
                    src={formData.profileImage || "https://i.pravatar.cc/150?u=12"} 
                    sx={{ width: 120, height: 120, mb: 2, border: '4px solid white', boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <Box sx={{ 
                    position: 'absolute', bottom: 20, right: 0, 
                    width: 20, height: 20, backgroundColor: '#48bb78', 
                    borderRadius: '50%', border: '3px solid white' 
                  }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{formData.name}</Typography>
                <Typography variant="body2" sx={{ color: '#48bb78', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, backgroundColor: '#48bb78', borderRadius: '50%' }} /> Active
                </Typography>
              </Grid>

              {/* Form Section */}
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Full Name</Typography>
                <TextField 
                  fullWidth size="small" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Email</Typography>
                <TextField 
                  fullWidth size="small" 
                  value={user?.email || ''} 
                  disabled
                  sx={{ mb: 3, backgroundColor: '#f7fafc' }}
                />

                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Bio</Typography>
                <TextField 
                  fullWidth size="small" multiline rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Department</Typography>
                <TextField 
                  select fullWidth size="small" 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  sx={{ mb: 3 }}
                >
                  <MenuItem value="Development">Development</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Design">Design</MenuItem>
                </TextField>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    sx={{ borderRadius: 2 }}
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserProfile;
