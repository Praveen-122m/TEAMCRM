import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  Box, Typography, Grid, Paper, Avatar, Button, Switch, 
  Divider, TextField, IconButton, Stack, CircularProgress, 
  Alert, Breadcrumbs, Link, Fade, Card, Chip, Modal
} from '@mui/material';
import { 
  PersonOutlined as PersonIcon,
  BusinessOutlined as BusinessIcon,
  PhotoCamera as CameraIcon,
  LockOutlined as LockIcon,
  SecurityOutlined as SecurityIcon,
  PhoneOutlined as PhoneIcon,
  EmailOutlined as EmailIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const Settings = () => {
  const { user, setUser, activeWorkspace } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  // Profile State
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    profileImage: user?.profileImage || '',
    phoneNumber: user?.phoneNumber || ''
  });



  // Workspace Info
  const [workspaceInfo, setWorkspaceInfo] = useState({ name: 'TeamChat Workspace', joinedDate: user?.createdAt });

  // Modals
  const [passModal, setPassModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [newPhoto, setNewPhoto] = useState(user?.profileImage || '');
  const fileInputRef = useRef(null);

  // Sync profile state with user context
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        profileImage: user.profileImage || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchWp = async () => {
      if (!activeWorkspace) return;
      try {
        const res = await axios.get('/api/workspaces');
        const current = res.data.find(w => w._id === activeWorkspace);
        if (current) setWorkspaceInfo(prev => ({ ...prev, name: current.name }));
      } catch (err) {}
    };
    fetchWp();
  }, [activeWorkspace]);

  const handleUpdateProfile = async () => {
    setSaveLoading(true);
    try {
      const res = await axios.put('/api/users/profile', { name: profile.name });
      setUser(res.data);
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaveLoading(false);
    }
  };



  const handlePhotoUpdate = async () => {
    try {
      const res = await axios.put('/api/users/profile', { profileImage: newPhoto });
      setUser(res.data);
      setMsg({ type: 'success', text: 'Profile photo updated!' });
      setPhotoModal(false);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update photo' });
    }
  };

  const handleLogoutAll = () => {
    // Clear local storage and logout
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate password complexity
    if (passData.new.length < 8) {
      return setMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(passData.new)) {
      return setMsg({ type: 'error', text: 'Password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(passData.new)) {
      return setMsg({ type: 'error', text: 'Password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(passData.new)) {
      return setMsg({ type: 'error', text: 'Password must contain at least one numeric digit (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(passData.new)) {
      return setMsg({ type: 'error', text: 'Password must contain at least one special character.' });
    }

    if (passData.new !== passData.confirm) return setMsg({ type: 'error', text: 'Passwords do not match' });
    try {
      await axios.put('/api/users/change-password', { currentPassword: passData.current, newPassword: passData.new });
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setPassModal(false);
      setPassData({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Password update failed' });
    }
  };

  const handleUpdateSecurity = async () => {
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(profile.email.trim())) {
      return setMsg({ type: 'error', text: 'Please enter a valid email address.' });
    }

    setSaveLoading(true);
    try {
      const res = await axios.put('/api/users/profile', { email: profile.email, phoneNumber: profile.phoneNumber });
      const updatedUser = { ...user, ...res.data };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setMsg({ type: 'success', text: 'Security settings updated!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update security info' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      // 1. Upload file
      const uploadRes = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = uploadRes.data.url;

      // 2. Update user profile
      const userRes = await axios.put('/api/users/profile', { profileImage: imageUrl });
      
      // 3. Merge data to preserve token
      const updatedUser = { ...user, ...userRes.data };
      setUser(updatedUser);
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      setMsg({ type: 'success', text: 'Profile photo updated!' });
    } catch (err) {
      console.error('Upload error:', err.response?.data || err.message);
      setMsg({ type: 'error', text: `Upload failed: ${err.response?.data?.message || err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto', pb: 10 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', mb: 1 }}>Settings</Typography>
        <Typography variant="body1" sx={{ color: '#718096' }}>Manage your profile, preferences and account settings</Typography>
      </Box>

      {msg.text && <Fade in={!!msg.text}><Alert severity={msg.type} sx={{ mb: 4, borderRadius: 3 }} onClose={() => setMsg({text:'', type:''})}>{msg.text}</Alert></Fade>}

      <Grid container spacing={4}>
        {/* Profile Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #f1f3f5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f0f4ff', color: '#5a67d8' }}><PersonIcon /></Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Profile Details</Typography>
                <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 700 }}>Update your identity</Typography>
              </Box>
            </Box>

            <Grid container spacing={4} alignItems="flex-start">
              <Grid item xs={12} sm={3} sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={profile.profileImage} 
                    sx={{ width: 150, height: 150, fontSize: '3.5rem', fontWeight: 900, bgcolor: '#f0f4ff', color: '#5a67d8', border: '4px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  >
                    {profile.name ? profile.name.split(' ').map(n => n[0]).join('') : '?'}
                  </Avatar>
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />
                  <Button 
                    variant="outlined" size="small" 
                    onClick={() => fileInputRef.current.click()} 
                    sx={{ 
                      borderRadius: 3, textTransform: 'none', fontWeight: 900, 
                      borderColor: '#e2e8f0', color: '#5a67d8', px: 3, py: 1,
                      bgcolor: 'white', '&:hover': { bgcolor: '#f8fafc', borderColor: '#5a67d8' }
                    }}
                  >
                    {loading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} sm={9}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#718096', mb: 1, display: 'block' }}>Full Name</Typography>
                    <TextField 
                      fullWidth variant="outlined" size="small" 
                      placeholder="Enter your name"
                      value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button 
                      variant="contained" onClick={handleUpdateProfile} disabled={saveLoading}
                      sx={{ borderRadius: 3, px: 6, py: 1.5, fontWeight: 900, bgcolor: '#5a67d8', textTransform: 'none', boxShadow: '0 4px 14px 0 rgba(90, 103, 216, 0.39)' }}
                    >
                      {saveLoading ? <CircularProgress size={20} /> : 'Save Profile'}
                    </Button>
                    <Button 
                      variant="outlined" color="error" onClick={handleLogoutAll}
                      sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 900, textTransform: 'none', borderColor: '#fee2e2' }}
                    >
                      Logout Account
                    </Button>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #f1f3f5' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#fff5f5', color: '#e53e3e' }}><SecurityIcon /></Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Security & Password</Typography>
                <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 700 }}>Manage your credentials</Typography>
              </Box>
            </Box>

            <Grid container spacing={4} alignItems="flex-end">
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#718096', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><EmailIcon fontSize="small" /> Email Address</Typography>
                  <TextField 
                    fullWidth variant="outlined" size="small" 
                    value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" fullWidth onClick={handleUpdateSecurity}
                    sx={{ borderRadius: 3, py: 1.2, fontWeight: 900, bgcolor: '#1a202c', textTransform: 'none' }}
                  >
                    Update Email
                  </Button>
                  <Button 
                    variant="outlined" fullWidth onClick={() => setPassModal(true)} startIcon={<LockIcon />}
                    sx={{ borderRadius: 3, py: 1.2, fontWeight: 900, color: '#1a202c', borderColor: '#e2e8f0', textTransform: 'none' }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#adb5bd', fontWeight: 700 }}>© 2026 TeamChat. All rights reserved.</Typography>
      </Box>

      {/* Photo Modal */}
      <Modal open={photoModal} onClose={() => setPhotoModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 4, p: 4, boxShadow: 24 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Update Profile Photo</Typography>
          <Stack spacing={3}>
            <TextField fullWidth label="Image URL" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} helperText="Paste a link to your profile image" />
            <Button fullWidth variant="contained" onClick={handlePhotoUpdate} sx={{ bgcolor: '#5a67d8', borderRadius: 2, py: 1.5, fontWeight: 800 }}>Save Photo</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Password Modal */}
      <Modal open={passModal} onClose={() => setPassModal(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 4, p: 4, boxShadow: 24 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Change Password</Typography>
          <form onSubmit={handleChangePassword}>
            <Stack spacing={3}>
              <TextField fullWidth label="Current Password" type="password" value={passData.current} onChange={(e) => setPassData({...passData, current: e.target.value})} required />
              <TextField fullWidth label="New Password" type="password" value={passData.new} onChange={(e) => setPassData({...passData, new: e.target.value})} required />
              <TextField fullWidth label="Confirm Password" type="password" value={passData.confirm} onChange={(e) => setPassData({...passData, confirm: e.target.value})} required />
              <Button fullWidth variant="contained" type="submit" sx={{ bgcolor: '#1a202c', borderRadius: 2, py: 1.5, fontWeight: 900 }}>Update Password</Button>
            </Stack>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default Settings;
