import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Grid, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, IconButton, Chip, Avatar, CircularProgress, Alert } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const TeamDashboard = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [workReports, setWorkReports] = useState([{ task: '', status: 'In Progress', hours: '' }]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      if (!workspaceId) return;
      const res = await axios.get(`/api/attendance/${workspaceId}`);
      setAttendance(res.data);
      const active = res.data.find(log => !log.clockOut);
      if (active) setActiveLog(active);
    } catch (err) {
      console.error('Fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace]);

  const handleClockIn = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      const res = await axios.post('/api/attendance/clock-in', { workspaceId });
      setActiveLog(res.data);
      setMsg({ type: 'success', text: 'Clocked in successfully!' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Clock-in failed' });
    }
  };

  const handleClockOut = async () => {
    try {
      await axios.put(`/api/attendance/clock-out/${activeLog._id}`);
      setActiveLog(null);
      setMsg({ type: 'success', text: 'Clocked out! Great job today.' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Clock-out failed' });
    }
  };

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
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to submit report' });
    }
  };
  
  const updateReport = (idx, field, val) => {
    const newReports = [...workReports];
    newReports[idx][field] = val;
    setWorkReports(newReports);
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#f4f7fe', minHeight: '100vh' }}>
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c' }}>Team Workspace</Typography>
          <Typography variant="body1" sx={{ color: '#718096' }}>Manage your daily tasks and attendance</Typography>
        </Box>
        {user?.role !== 'Admin' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!activeLog ? (
              <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleClockIn} sx={{ backgroundColor: '#48bb78', borderRadius: 3, fontWeight: 700, px: 3 }}>Clock In</Button>
            ) : (
              <Button variant="contained" startIcon={<StopIcon />} onClick={handleClockOut} sx={{ backgroundColor: '#e53e3e', borderRadius: 3, fontWeight: 700, px: 3 }}>Clock Out</Button>
            )}
          </Box>
        )}
      </Box>

      {msg.text && <Alert severity={msg.type} sx={{ mb: 4, borderRadius: 3 }}>{msg.text}</Alert>}

      <Grid container spacing={4}>
        {/* Work Report (Excel Type) */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Daily Work Report (Excel Style)</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addReportRow} sx={{ color: '#5a67d8', fontWeight: 700 }}>Add Task</Button>
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
                        <IconButton size="small" color="error"><DeleteIcon fontSize="inherit" /></IconButton>
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

        {/* Attendance History */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Recent Activity</Typography>
            {loading ? <CircularProgress size={24} /> : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {attendance.slice(0, 10).map((log) => (
                  <Box key={log._id} sx={{ p: 2, borderRadius: 3, backgroundColor: '#ffffff', border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1, mr: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {log.workSummary ? (log.workSummary.length > 40 ? log.workSummary.substring(0, 40) + '...' : log.workSummary) : (log.clockIn ? 'Attendance Session' : 'Activity')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(log.date).toLocaleDateString()} • {log.clockIn ? `${new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Report Submitted'}
                      </Typography>
                    </Box>
                    <Chip 
                      label={log.workSummary ? 'Task' : (log.clockOut ? 'Done' : 'Active')} 
                      size="small" 
                      color={log.workSummary ? 'primary' : (log.clockOut ? 'default' : 'success')} 
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamDashboard;
