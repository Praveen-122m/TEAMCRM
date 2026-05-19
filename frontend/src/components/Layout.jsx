import React, { useState, useContext, useEffect, useRef } from 'react';
import { Box, Snackbar, Alert, Button, Typography, Avatar, Paper, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { SocketContext } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const Layout = ({ children }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#fcfcfc' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNav />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: 2,
            pb: 2,
            px: 4,
            width: '100%',
            overflowY: 'auto',
            backgroundColor: '#fcfcfc'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
