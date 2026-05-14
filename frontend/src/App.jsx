import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChannelChat from './pages/ChannelChat';
import DirectMessages from './pages/DirectMessages';
import VideoCall from './pages/VideoCall';
import VideoRooms from './pages/VideoRooms';
import FileManager from './pages/FileManager';
import UserProfile from './pages/UserProfile';
import AdminPanel from './pages/AdminPanel';
import ClientDashboard from './pages/ClientDashboard';
import TeamDashboard from './pages/TeamDashboard';
import AdminManagement from './pages/AdminManagement';
import Workspaces from './pages/Workspaces';

import { Box, CircularProgress } from '@mui/material';

import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f5f7' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/workspaces" element={<PrivateRoute><Workspaces /></PrivateRoute>} />
          <Route path="/channels" element={<PrivateRoute><ChannelChat /></PrivateRoute>} />
          <Route path="/dms" element={<PrivateRoute><DirectMessages /></PrivateRoute>} />
          <Route path="/calls" element={<PrivateRoute><VideoRooms /></PrivateRoute>} />
          <Route path="/video-call" element={<PrivateRoute><VideoCall /></PrivateRoute>} />
          <Route path="/files" element={<PrivateRoute><FileManager /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><TeamDashboard /></PrivateRoute>} />
          <Route path="/admin-suite" element={<PrivateRoute><AdminManagement /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
