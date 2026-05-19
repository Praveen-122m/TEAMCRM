import React, { useState, useContext } from 'react';
import { 
  Box, Button, TextField, Typography, Alert, Grid, Checkbox, 
  FormControlLabel, Link as MuiLink, Paper, Stack, Avatar, IconButton, InputAdornment 
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InsightsIcon from '@mui/icons-material/Insights';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';

const DashboardIllustration = () => (
  <Box sx={{ width: '100%', maxWidth: 500, mt: 4, position: 'relative' }}>
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Dashboard Window */}
      <rect x="50" y="50" width="400" height="300" rx="20" fill="#F0F4FF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="50" y="50" width="400" height="40" rx="20" fill="#FFFFFF" />
      <circle cx="80" cy="70" r="5" fill="#FF5F57" />
      <circle cx="100" cy="70" r="5" fill="#FFBD2E" />
      <circle cx="120" cy="70" r="5" fill="#28C840" />

      {/* Widget 1: My Projects */}
      <rect x="80" y="110" width="160" height="180" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
      <text x="100" y="140" fill="#94A3B8" fontSize="12" fontWeight="bold">My Projects</text>
      <circle cx="160" cy="200" r="40" stroke="#F1F5F9" strokeWidth="8" fill="none" />
      <path d="M160 160 A40 40 0 1 1 120 200" stroke="#5A67D8" strokeWidth="8" fill="none" strokeLinecap="round" />
      <text x="160" y="210" textAnchor="middle" fill="#1A202C" fontSize="16" fontWeight="900">75%</text>
      <text x="160" y="260" textAnchor="middle" fill="#5A67D8" fontSize="10" fontWeight="bold">In Progress</text>

      {/* Widget 2: Tasks */}
      <rect x="260" y="110" width="160" height="100" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
      <text x="280" y="140" fill="#94A3B8" fontSize="12" fontWeight="bold">Tasks</text>
      <rect x="280" y="155" width="10" height="10" rx="2" fill="#5A67D8" />
      <rect x="300" y="160" width="80" height="4" rx="2" fill="#F1F5F9" />
      <rect x="280" y="175" width="10" height="10" rx="2" fill="#5A67D8" />
      <rect x="300" y="180" width="60" height="4" rx="2" fill="#F1F5F9" />

      {/* Widget 3: Messages */}
      <rect x="260" y="220" width="160" height="70" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
      <text x="280" y="245" fill="#94A3B8" fontSize="12" fontWeight="bold">Messages</text>
      <circle cx="295" cy="270" r="10" fill="#E0E7FF" />
      <text x="295" y="274" textAnchor="middle" fill="#5A67D8" fontSize="8" fontWeight="900">JS</text>
      <text x="315" y="274" fill="#1A202C" fontSize="12" fontWeight="900">2 New</text>

      {/* Person Illustration */}
      <path d="M120 380 C120 320 180 320 180 380" fill="#5A67D8" />
      <circle cx="150" cy="310" r="30" fill="#FBD38D" />
      <path d="M120 310 C120 280 180 280 180 310" fill="#2D3748" />
      
      {/* Laptop */}
      <rect x="180" y="340" width="100" height="60" rx="8" fill="#1A202C" />
      <circle cx="230" cy="370" r="4" fill="#FFFFFF" opacity="0.5" />
    </svg>
  </Box>
);

const Login = () => {
  const [role, setRole] = useState('client'); 
  const [email, setEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [workspaceKey, setWorkspaceKey] = useState(''); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const isClient = role === 'client';
    const res = isClient 
      ? await login(null, password, secretCode)
      : await login(email, password);
      
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  const getIllustrationText = () => {
    switch(role) {
      case 'client': return "Login as Client to access your projects, track progress and stay updated.";
      case 'member': return "Login as Team Member to collaborate with your peers and manage tasks.";
      case 'admin': return "Login as Administrator to manage workspace settings, members and clients.";
      default: return "";
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9faff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: 1400, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#5a67d8', width: 44, height: 44, borderRadius: 2.5 }}>
            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '-0.5px' }}>TeamChat</Typography>
        </Box>
      </Box>

      <Typography align="center" variant="subtitle2" sx={{ fontWeight: 800, color: '#94a3b8', mb: 5, letterSpacing: '0.5px' }}>
        One Platform. Three Roles. Complete Collaboration.
      </Typography>

      {/* Role Selection */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6, gap: 2.5, px: 2, flexWrap: 'wrap' }}>
        {[
          { id: 'client', label: 'Client', sub: 'Access your projects', icon: <PersonOutlinedIcon /> },
          { id: 'member', label: 'Team Member', sub: 'Manage tasks & collaborate', icon: <GroupOutlinedIcon /> },
          { id: 'admin', label: 'Admin', sub: 'Manage workspace', icon: <AdminPanelSettingsOutlinedIcon /> }
        ].map((item) => (
          <Paper
            key={item.id}
            onClick={() => setRole(item.id)}
            sx={{ 
              p: 2.5, px: 4, cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 2.5,
              border: '2.5px solid', borderColor: role === item.id ? '#5a67d8' : 'transparent',
              boxShadow: role === item.id ? '0 15px 35px rgba(90, 103, 216, 0.12)' : 'none',
              backgroundColor: role === item.id ? '#fff' : 'transparent',
              transition: 'all 0.3s ease',
              minWidth: 280
            }}
          >
            <Box sx={{ color: role === item.id ? '#5a67d8' : '#94a3b8', display: 'flex' }}>{item.icon}</Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1a202c' }}>{item.label}</Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>{item.sub}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Main Login Card */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 2, pb: 10 }}>
        <Paper sx={{ maxWidth: 1150, width: '100%', borderRadius: 10, display: 'flex', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          
          {/* Left Illustration Pane */}
          <Box sx={{ flex: 1.1, p: 4, pt: 8, backgroundColor: '#fff', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #f1f5f9' }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 1.5, color: '#1a202c' }}>Welcome Back! 👋</Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', maxWidth: 350, fontWeight: 500, lineHeight: 1.6 }}>{getIllustrationText()}</Typography>
            </Box>
            
            <DashboardIllustration />
            
          </Box>

          {/* Right Login Form Pane */}
          <Box sx={{ flex: 1, p: { xs: 5, md: 8 }, backgroundColor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 5 }}>
              <Avatar sx={{ bgcolor: '#f0f4ff', color: '#5a67d8', width: 56, height: 56 }}>
                {role === 'client' ? <PersonOutlinedIcon /> : role === 'admin' ? <AdminPanelSettingsOutlinedIcon /> : <GroupOutlinedIcon />}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'capitalize', color: '#1a202c' }}>{role} Login</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                   Use the credentials provided by your admin.
                </Typography>
              </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={3.5}>
                {role === 'client' ? (
                  <>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568', letterSpacing: '0.5px' }}>WORKSPACE KEY</Typography>
                      <TextField
                        fullWidth variant="outlined" placeholder="Enter workspace secret key"
                        value={workspaceKey} onChange={(e) => setWorkspaceKey(e.target.value)} required
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><VpnKeyOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                          sx: { borderRadius: 3, bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } }
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568', letterSpacing: '0.5px' }}>CLIENT SECRET ID</Typography>
                      <TextField
                        fullWidth variant="outlined" placeholder="Enter your client ID"
                        value={secretCode} onChange={(e) => setSecretCode(e.target.value)} required
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><AssignmentIndOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                          sx: { borderRadius: 3, bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } }
                        }}
                      />
                    </Box>
                  </>
                ) : (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568', letterSpacing: '0.5px' }}>EMAIL ADDRESS</Typography>
                    <TextField
                      fullWidth variant="outlined" type="email" placeholder="Enter your email"
                      value={email} onChange={(e) => setEmail(e.target.value)} required
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                        sx: { borderRadius: 3, bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } }
                      }}
                    />
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568', letterSpacing: '0.5px' }}>PASSWORD</Typography>
                  <TextField
                    fullWidth variant="outlined" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 3, bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } }
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormControlLabel control={<Checkbox size="small" sx={{ color: '#cbd5e0' }} />} label={<Typography variant="caption" sx={{ fontWeight: 800, color: '#718096' }}>Remember me</Typography>} />
                  <Link to="/forgot-password" style={{ fontSize: '0.75rem', fontWeight: 900, color: '#5a67d8', textDecoration: 'none' }}>Forgot password?</Link>
                </Box>

                <Button type="submit" variant="contained" size="large" sx={{ bgcolor: '#5a67d8', py: 1.8, borderRadius: 3, fontWeight: 900, textTransform: 'none', boxShadow: '0 10px 20px rgba(90, 103, 216, 0.25)', '&:hover': { bgcolor: '#4c51bf' } }}>Login</Button>


                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                    Don't have an account? <Link to="/register" style={{ color: '#5a67d8', textDecoration: 'none', fontWeight: 800 }}>Create One ✨</Link>
                  </Typography>
                </Box>
              </Stack>
            </form>
          </Box>
        </Paper>
      </Box>

      {/* Bottom Features */}
      <Box sx={{ maxWidth: 1350, mx: 'auto', width: '100%', px: 4, pb: 10 }}>
        <Grid container spacing={5}>
          {[
            { title: 'Secure & Private', sub: '256-bit encryption for all data', icon: <Box sx={{ p: 2, bgcolor: '#f0f4ff', color: '#5a67d8', borderRadius: 4 }}><LockOutlinedIcon /></Box> },
            { title: 'Track Progress', sub: 'Real-time project tracking', icon: <Box sx={{ p: 2, bgcolor: '#fff1f2', color: '#e11d48', borderRadius: 4 }}><TrendingUpIcon /></Box> },
            { title: 'Stay Connected', sub: 'Seamless team communication', icon: <Box sx={{ p: 2, bgcolor: '#f0fdf4', color: '#16a34a', borderRadius: 4 }}><ChatBubbleOutlineOutlinedIcon /></Box> },
            { title: 'Smart Insights', sub: 'Data-driven decision making', icon: <Box sx={{ p: 2, bgcolor: '#fef3c7', color: '#d97706', borderRadius: 4 }}><InsightsIcon /></Box> }
          ].map((feat, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                {feat.icon}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1a202c' }}>{feat.title}</Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', lineHeight: 1.3 }}>{feat.sub}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Typography align="center" variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, display: 'block', mt: 10 }}>© 2024 TeamChat. All rights reserved.</Typography>
      </Box>
    </Box>
  );
};

export default Login;
