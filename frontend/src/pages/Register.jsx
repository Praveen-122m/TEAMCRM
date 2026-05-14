import React, { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, Alert, Grid, Link as MuiLink } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import HexagonIcon from '@mui/icons-material/Hexagon';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(name, email, password);
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
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
          Join your team and<br/>start collaborating today.
        </Typography>
      </Grid>

      {/* Right Side (Form) */}
      <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <Box sx={{ width: '100%', maxWidth: 400, p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#1a202c' }}>
            Create an Account ✨
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096', mb: 4 }}>
            Sign up to get started
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Full Name</Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Email</Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4a5568', mb: 1 }}>Password</Typography>
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

            <Button type="submit" variant="contained" color="primary" fullWidth size="large" sx={{ mb: 3, py: 1.5 }}>
              Register
            </Button>
          </form>

          <Typography align="center" variant="body2" sx={{ color: '#718096' }}>
            Already have an account? <Link to="/login" style={{ color: '#5a67d8', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Register;
