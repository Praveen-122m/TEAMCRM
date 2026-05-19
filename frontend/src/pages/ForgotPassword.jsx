import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Paper, Avatar, InputAdornment, IconButton } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyIcon from '@mui/icons-material/Key';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep(2);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request reset');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/reset-password', { email, newPassword });
      setMessage(res.data.message + '. Redirecting to login...');
      setError('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9faff', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper sx={{ maxWidth: 450, width: '100%', p: 5, borderRadius: 8, boxShadow: '0 25px 70px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <IconButton onClick={() => navigate('/login')} sx={{ mb: 2, bgcolor: '#f0f4ff', color: '#5a67d8', '&:hover': { bgcolor: '#e0e7ff' } }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Avatar sx={{ bgcolor: '#f0f4ff', color: '#5a67d8', width: 64, height: 64, mx: 'auto', mb: 3 }}>
          <KeyIcon sx={{ fontSize: 32 }} />
        </Avatar>

        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c', mb: 1 }}>
          {step === 1 ? 'Forgot Password?' : 'Reset Password'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 4 }}>
          {step === 1 ? "No worries! Enter your email and we'll help you reset it." : "Create a strong new password for your account."}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3, textAlign: 'left' }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 3, borderRadius: 3, textAlign: 'left' }}>{message}</Alert>}

        {step === 1 ? (
          <form onSubmit={handleRequestReset}>
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>EMAIL ADDRESS</Typography>
              <TextField
                fullWidth variant="outlined" placeholder="Enter your email"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                InputProps={{
                  startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                  sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                }}
              />
            </Box>
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ bgcolor: '#5a67d8', py: 1.8, borderRadius: 3, fontWeight: 900, textTransform: 'none' }}>
              Verify Email
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>NEW PASSWORD</Typography>
              <TextField
                fullWidth variant="outlined" type="password" placeholder="Enter new password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                  sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                }}
              />
            </Box>
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ bgcolor: '#5a67d8', py: 1.8, borderRadius: 3, fontWeight: 900, textTransform: 'none' }}>
              Reset Password
            </Button>
          </form>
        )}

        <Box sx={{ mt: 4 }}>
          <Link to="/login" style={{ color: '#5a67d8', textDecoration: 'none', fontWeight: 800, fontSize: '0.875rem' }}>Back to Login</Link>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPassword;
