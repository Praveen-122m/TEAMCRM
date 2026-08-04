import React, { useEffect, useState } from 'react';
import { Box, Avatar, Tooltip, IconButton, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const WorkspaceRail = () => {
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await axios.get('/api/workspaces');
        setWorkspaces(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkspaces();
  }, []);

  return (
    <Box sx={{ 
      width: 72, 
      height: '100vh', 
      backgroundColor: '#1a1d21', // Dark Slack-like rail
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      py: 2,
      gap: 2,
      zIndex: 1201 // Above drawer
    }}>
      {workspaces.map((ws) => (
        <Tooltip key={ws._id} title={ws.name} placement="right">
          <IconButton sx={{ p: 0 }}>
            <Avatar 
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2.5, // Slack style rounded squares
                backgroundColor: '#5a67d8',
                fontSize: '1.2rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderRadius: 2, transform: 'scale(1.05)' }
              }}
            >
              {ws.name.charAt(0)}
            </Avatar>
          </IconButton>
        </Tooltip>
      ))}

      <Divider sx={{ width: '60%', borderColor: 'rgba(255,255,255,0.1)' }} />

      <Tooltip title="Add Workspace" placement="right">
        <IconButton sx={{ 
          width: 48, 
          height: 48, 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          color: 'white',
          borderRadius: 2.5,
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
        }}>
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default WorkspaceRail;
