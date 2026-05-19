import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Grid, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, IconButton, Chip, Avatar, CircularProgress, Alert } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const TeamDashboard = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const [workReports, setWorkReports] = useState([{ task: '', status: 'In Progress', hours: '' }]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const addReportRow = () => setWorkReports([...workReports, { task: '', status: 'In Progress', hours: '' }]);
  
  const handleSubmitReport = async () => {
    try {
      const summary = workReports
        .filter(r => r.task)
        .map(r => `[${r.status}] ${r.task} (${r.hours}h)`)
        .join('\n');
      
      if (!summary) {
        setMsg({ type: 'error', text: 'Please add at least one task' });
        return;
      }

      const workspaceId = activeWorkspace || user.workspaces?.[0];
      await axios.post('/api/attendance/report', { 
        workspaceId,
        workSummary: summary 
      });
      
      setMsg({ type: 'success', text: 'Daily report submitted successfully!' });
      setWorkReports([{ task: '', status: 'In Progress', hours: '' }]);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to submit report' });
    }
  };
  
  const updateReport = (idx, field, val) => {
    const newReports = [...workReports];
    newReports[idx][field] = val;
    setWorkReports(newReports);
  };

  const removeReportRow = (idx) => {
    if (workReports.length === 1) return;
    setWorkReports(workReports.filter((_, i) => i !== idx));
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#f4f7fe', minHeight: '100vh' }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c' }}>Work Reporting</Typography>
        <Typography variant="body1" sx={{ color: '#718096' }}>Submit your daily task summary below</Typography>
      </Box>

      {msg.text && <Alert severity={msg.type} sx={{ mb: 4, borderRadius: 3 }}>{msg.text}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Daily Work Log</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addReportRow} sx={{ color: '#5a67d8', fontWeight: 700 }}>Add Row</Button>
            </Box>
            <TableContainer component={Box}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f7fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Task Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time (Hrs)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workReports.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <TextField fullWidth size="small" variant="standard" placeholder="What did you work on?" value={row.task} onChange={(e) => updateReport(idx, 'task', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" onClick={() => updateReport(idx, 'status', row.status === 'Completed' ? 'In Progress' : 'Completed')} sx={{ cursor: 'pointer', backgroundColor: row.status === 'Completed' ? '#c6f6d5' : '#bee3f8', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" variant="standard" type="number" placeholder="0" value={row.hours} onChange={(e) => updateReport(idx, 'hours', e.target.value)} sx={{ width: 60 }} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => removeReportRow(idx)}><DeleteIcon fontSize="inherit" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<CloudUploadIcon />} 
              onClick={handleSubmitReport}
              sx={{ mt: 4, borderRadius: 3, backgroundColor: '#1a202c', py: 1.5 }}
            >
              Submit Daily Report
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamDashboard;
