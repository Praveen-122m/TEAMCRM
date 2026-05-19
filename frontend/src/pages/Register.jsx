import React, { useState, useContext } from 'react';
import { 
  Box, Button, TextField, Typography, Alert, Grid, Checkbox, 
  FormControlLabel, Link as MuiLink, Paper, Stack, Avatar, IconButton, InputAdornment, Fade 
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import HexagonIcon from '@mui/icons-material/Hexagon';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import DynamicFormOutlinedIcon from '@mui/icons-material/DynamicFormOutlined';

const SignupIllustration = ({ role }) => (
  <Box sx={{ width: '100%', maxWidth: 480, mt: 4, position: 'relative' }}>
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="50" width="400" height="300" rx="24" fill="#F0F4FF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="50" y="50" width="400" height="40" rx="20" fill="#FFFFFF" />
      <circle cx="80" cy="70" r="5" fill="#FF5F57" />
      <circle cx="100" cy="70" r="5" fill="#FFBD2E" />
      <circle cx="120" cy="70" r="5" fill="#28C840" />

      {/* Floating Elements based on role */}
      {role === 'admin' ? (
        <>
          <rect x="80" y="110" width="140" height="80" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
          <text x="100" y="140" fill="#94A3B8" fontSize="10" fontWeight="bold">TOTAL USERS</text>
          <text x="100" y="170" fill="#1A202C" fontSize="24" fontWeight="900">128</text>
          
          <rect x="240" y="110" width="140" height="80" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
          <text x="260" y="140" fill="#94A3B8" fontSize="10" fontWeight="bold">WORKSPACES</text>
          <text x="260" y="170" fill="#5A67D8" fontSize="24" fontWeight="900">24</text>

          <rect x="80" y="210" width="300" height="100" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
          <path d="M100 280 Q 150 230, 200 260 T 300 240" stroke="#5A67D8" strokeWidth="3" fill="none" />
          <text x="100" y="235" fill="#94A3B8" fontSize="10" fontWeight="bold">ACTIVITY OVERVIEW</text>
        </>
      ) : (
        <>
          <rect x="80" y="110" width="160" height="180" rx="20" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
          <circle cx="160" cy="180" r="40" stroke="#F1F5F9" strokeWidth="8" fill="none" />
          <path d="M160 140 A40 40 0 1 1 120 180" stroke="#5A67D8" strokeWidth="8" fill="none" strokeLinecap="round" />
          <text x="160" y="190" textAnchor="middle" fill="#1A202C" fontSize="18" fontWeight="900">7</text>
          <text x="160" y="240" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="bold">UPCOMING TASKS</text>
          
          <rect x="260" y="110" width="140" height="100" rx="15" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.05))" />
          <circle cx="280" cy="135" r="8" fill="#5A67D8" />
          <rect x="295" y="132" width="60" height="6" rx="3" fill="#F1F5F9" />
          <circle cx="280" cy="160" r="8" fill="#CBD5E0" />
          <rect x="295" y="157" width="40" height="6" rx="3" fill="#F1F5F9" />
        </>
      )}

      {/* Person */}
      <circle cx="150" cy="380" r="60" fill="#5A67D8" />
      <circle cx="150" cy="310" r="35" fill="#FBD38D" />
      <path d="M120 310 C120 280 180 280 180 310" fill="#2D3748" />
      
      {/* Laptop */}
      <rect x="200" y="340" width="120" height="70" rx="10" fill="#1A202C" />
      <rect x="215" y="355" width="90" height="40" rx="4" fill="#2D3748" />
    </svg>
  </Box>
);

const Register = () => {
  const [role, setRole] = useState('member'); // member or admin
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return setError("Please enter a valid email address");
    }

    // Validate password complexity
    if (password.length < 8) {
      return setError("Password must be at least 8 characters long");
    }
    if (!/\d/.test(password)) {
      return setError("Password must contain at least one number");
    }
    if (!/[A-Z]/.test(password)) {
      return setError("Password must contain at least one uppercase letter");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
      return setError("Password must contain at least one special character");
    }

    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!agree) return setError("Please agree to the Terms of Service");
    
    setError('');
    const res = await register(name, email, password, role);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };



  const passReqs = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*]/.test(password) }
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9faff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#5a67d8', width: 40, height: 40, borderRadius: 2 }}>
            <HexagonIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1a202c' }}>TeamChat</Typography>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', px: 2, pb: 8 }}>
        <Paper sx={{ 
          maxWidth: 1200, width: '100%', borderRadius: 10, display: 'flex', overflow: 'hidden', 
          boxShadow: '0 40px 100px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', minHeight: 700 
        }}>
          
          {/* Left Illustration Pane */}
          <Box sx={{ 
            flex: 1.1, p: 6, pt: 8, backgroundColor: '#fff', 
            display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', 
            alignItems: 'center', borderRight: '1px solid #f1f5f9' 
          }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: '#1a202c' }}>
                Create Your <span style={{ color: '#5a67d8' }}>{role === 'admin' ? 'Admin' : 'Team Member'}</span> Account
              </Typography>
              <Typography variant="body1" sx={{ color: '#718096', textAlign: 'center', maxWidth: 450, fontWeight: 500, lineHeight: 1.6 }}>
                {role === 'admin' 
                  ? "Sign up to access and manage the platform, users, workspaces and all system settings."
                  : "Sign up to collaborate with your team, manage tasks and get work done efficiently."}
              </Typography>
            </Box>
            
            <SignupIllustration role={role} />

            <Box sx={{ mt: 'auto', width: '100%', pt: 4 }}>
               <Grid container spacing={2}>
                 {[
                   { label: role === 'admin' ? 'Full Control' : 'Work Together', sub: role === 'admin' ? 'Manage users & roles' : 'Collaborate seamlessly', icon: role === 'admin' ? <AdminPanelSettingsOutlinedIcon /> : <GroupOutlinedIcon />, color: '#5a67d8', bg: '#f0f4ff' },
                   { label: role === 'admin' ? 'System Overview' : 'Stay Organized', sub: role === 'admin' ? 'Monitor performance' : 'Track progress easily', icon: role === 'admin' ? <DynamicFormOutlinedIcon /> : <CheckCircleOutlinedIcon />, color: '#ed8936', bg: '#fffaf0' },
                   { label: 'Secure & Reliable', sub: 'Enterprise-grade security', icon: <LockOutlinedIcon />, color: '#48bb78', bg: '#f0fff4' }
                 ].map((item, i) => (
                   <Grid item xs={4} key={i}>
                     <Box sx={{ textAlign: 'center' }}>
                       <Avatar sx={{ bgcolor: item.bg, color: item.color, mx: 'auto', mb: 1, borderRadius: 2 }}>{item.icon}</Avatar>
                       <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', color: '#1a202c' }}>{item.label}</Typography>
                       <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>{item.sub}</Typography>
                     </Box>
                   </Grid>
                 ))}
               </Grid>
            </Box>
          </Box>

          {/* Right Signup Form Pane */}
          <Box sx={{ flex: 1, p: { xs: 4, md: 6 }, backgroundColor: '#fff', overflowY: 'auto' }}>
             {/* Role Toggle */}
             <Box sx={{ display: 'flex', mb: 4, bgcolor: '#f8fafc', p: 0.5, borderRadius: 3, width: 'fit-content' }}>
               <Button 
                onClick={() => setRole('member')}
                sx={{ 
                  borderRadius: 2.5, px: 3, textTransform: 'none', fontWeight: 800,
                  bgcolor: role === 'member' ? '#fff' : 'transparent',
                  color: role === 'member' ? '#5a67d8' : '#94a3b8',
                  boxShadow: role === 'member' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  '&:hover': { bgcolor: role === 'member' ? '#fff' : '#f1f5f9' }
                }}
               >Team Member</Button>
               <Button 
                onClick={() => setRole('admin')}
                sx={{ 
                  borderRadius: 2.5, px: 3, textTransform: 'none', fontWeight: 800,
                  bgcolor: role === 'admin' ? '#fff' : 'transparent',
                  color: role === 'admin' ? '#5a67d8' : '#94a3b8',
                  boxShadow: role === 'admin' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  '&:hover': { bgcolor: role === 'admin' ? '#fff' : '#f1f5f9' }
                }}
               >Admin</Button>
             </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Avatar sx={{ bgcolor: '#f0f4ff', color: '#5a67d8', width: 48, height: 48, borderRadius: 3 }}>
                {role === 'admin' ? <AdminPanelSettingsOutlinedIcon /> : <PersonOutlinedIcon />}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#1a202c' }}>{role === 'admin' ? 'Admin' : 'Team Member'} Sign Up</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>Create your account to get started</Typography>
              </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>FULL NAME</Typography>
                  <TextField
                    fullWidth variant="outlined" placeholder="Enter your full name"
                    value={name} onChange={(e) => setName(e.target.value)} required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PersonOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                      sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>EMAIL ADDRESS</Typography>
                  <TextField
                    fullWidth variant="outlined" type="email" placeholder="Enter your email address"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                      sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>PASSWORD</Typography>
                  <TextField
                    fullWidth variant="outlined" type={showPassword ? 'text' : 'password'} placeholder="Create a password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} size="small">
                            {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: '#4a5568' }}>CONFIRM PASSWORD</Typography>
                  <TextField
                    fullWidth variant="outlined" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ fontSize: 20, color: '#94a3b8' }} /></InputAdornment>,
                      sx: { borderRadius: 3, bgcolor: '#f8fafc' }
                    }}
                  />
                </Box>

                {/* Password Requirements Checklist */}
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 4, border: '1px solid #edf2f7' }}>
                   <Typography variant="caption" sx={{ fontWeight: 900, color: '#4a5568', mb: 1.5, display: 'block' }}>Password must contain:</Typography>
                   <Grid container spacing={1}>
                     {passReqs.map((req, i) => (
                       <Grid item xs={6} key={i}>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: req.met ? '#48bb78' : '#cbd5e0' }} />
                           <Typography variant="caption" sx={{ fontWeight: 700, color: req.met ? '#2d3748' : '#a0aec0' }}>{req.label}</Typography>
                         </Box>
                       </Grid>
                     ))}
                   </Grid>
                </Box>

                <FormControlLabel 
                  control={<Checkbox size="small" checked={agree} onChange={(e) => setAgree(e.target.checked)} />} 
                  label={<Typography variant="caption" sx={{ fontWeight: 700, color: '#718096' }}>I agree to the <MuiLink sx={{ color: '#5a67d8', cursor: 'pointer' }}>Terms of Service</MuiLink> and <MuiLink sx={{ color: '#5a67d8', cursor: 'pointer' }}>Privacy Policy</MuiLink></Typography>} 
                />

                <Button type="submit" variant="contained" fullWidth size="large" sx={{ bgcolor: '#5a67d8', py: 1.8, borderRadius: 3, fontWeight: 900, textTransform: 'none', boxShadow: '0 10px 20px rgba(90, 103, 216, 0.2)' }}>Create {role === 'admin' ? 'Admin' : 'Account'}</Button>



                <Typography align="center" variant="body2" sx={{ color: '#718096', fontWeight: 600, mt: 2 }}>
                  Already have an account? <Link to="/login" style={{ color: '#5a67d8', textDecoration: 'none', fontWeight: 800 }}>Login</Link>
                </Typography>
              </Stack>
            </form>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Register;
