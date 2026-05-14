import React, { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, Alert, Grid, Checkbox, FormControlLabel, Link as MuiLink } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import HexagonIcon from '@mui/icons-material/Hexagon';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [loginType, setLoginType] = useState('team'); // 'team' or 'client'
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = loginType === 'team' 
      ? await login(email, password) 
      : await login(null, password, secretCode);
      
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  return (
    <Grid container sx={{ height: '100vh' }}>
      {/* Left Side (Illustration) */}
      <Grid item xs={12} md={6} sx={{ 
        backgroundColor: '#5a67d8', 
        display: { xs: 'none', md: 'flex' }, 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'white',
        p: 4
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'absolute', top: 40, left: 40 }}>
          <HexagonIcon sx={{ fontSize: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>TeamWorkspace</Typography>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, textAlign: 'center' }}>
          Your All-in-One<br/>Enterprise Hub.
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.8, textAlign: 'center', maxWidth: 400 }}>
          Manage teams, track projects, and delight clients with one powerful platform.
        </Typography>
      </Grid>

      {/* Right Side (Form) */}
      <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Box sx={{ width: '100%', maxWidth: 420, p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#1a202c' }}>
            {loginType === 'team' ? 'Welcome Back 👋' : 'Client Access 🔑'}
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096', mb: 4 }}>
            Please select your portal to continue
          </Typography>

          {/* Tab Selector */}
          <Box sx={{ display: 'flex', backgroundColor: '#f7fafc', p: 0.5, borderRadius: 3, mb: 4 }}>
            <Button 
              fullWidth 
              onClick={() => setLoginType('team')}
              sx={{ 
                borderRadius: 2.5, py: 1, textTransform: 'none', fontWeight: 700,
                backgroundColor: loginType === 'team' ? '#ffffff' : 'transparent',
                color: loginType === 'team' ? '#5a67d8' : '#718096',
                boxShadow: loginType === 'team' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none',
                '&:hover': { backgroundColor: loginType === 'team' ? '#ffffff' : '#edf2f7' }
              }}
            >
              Team Login
            </Button>
            <Button 
              fullWidth 
              onClick={() => setLoginType('client')}
              sx={{ 
                borderRadius: 2.5, py: 1, textTransform: 'none', fontWeight: 700,
                backgroundColor: loginType === 'client' ? '#ffffff' : 'transparent',
                color: loginType === 'client' ? '#5a67d8' : '#718096',
                boxShadow: loginType === 'client' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none',
                '&:hover': { backgroundColor: loginType === 'client' ? '#ffffff' : '#edf2f7' }
              }}
            >
              Client Portal
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            {loginType === 'team' ? (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#4a5568', mb: 1 }}>Official Email</Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  sx={{ mb: 3 }}
                />
              </>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#4a5568', mb: 1 }}>Secret Admin Code</Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Enter your 8-digit secret ID"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
              </>
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#4a5568', mb: 1 }}>Security Password</Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              sx={{ mb: 4 }}
            />

            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mb: 3, py: 1.5, borderRadius: 2.5, backgroundColor: '#5a67d8', fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}>
              Sign In to Dashboard
            </Button>
          </form>

          {loginType === 'team' && (
            <Typography align="center" variant="body2" sx={{ color: '#718096' }}>
              Admin or Member? <Link to="/register" style={{ color: '#5a67d8', textDecoration: 'none', fontWeight: 700 }}>Create Workspace</Link>
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default Login;
