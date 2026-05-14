import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Grid, Paper, Tabs, Tab, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, IconButton, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, List, ListItemButton, ListItemAvatar, ListItemText, Tooltip, Badge } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';

import { QRCodeSVG } from 'qrcode.react';
import SecurityIcon from '@mui/icons-material/Security';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';

const AdminManagement = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newClient, setNewClient] = useState({ name: '', secretCode: '', password: '' });
  const [workspaceName, setWorkspaceName] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      if (!workspaceId) {
        setMsg({ type: 'error', text: 'Please select a workspace first' });
        return;
      }
      const [memRes, clientRes, attRes, wpRes] = await Promise.all([
        axios.get(`/api/workspaces/${workspaceId}/members`),
        axios.get(`/api/auth/clients/${workspaceId}`),
        axios.get(`/api/attendance/${workspaceId}`),
        axios.get('/api/workspaces')
      ]);
      setMembers(memRes.data);
      setClients(clientRes.data || []);
      setAttendance(attRes.data || []);
      if (memRes.data.length > 0 && !selectedMember) {
        setSelectedMember(memRes.data[0]);
      }
      const activeWp = wpRes.data.find(w => w._id === workspaceId) || wpRes.data[0];
      setWorkspace(activeWp);
      setWorkspaceName(activeWp?.name || '');
    } catch (err) {
      console.error('Fetch failed', err);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace]);

  const handleRoleChange = async (memberId, currentRole) => {
    try {
      const workspaceId = workspace?._id || user.workspaces?.[0];
      const newRole = currentRole === 'Admin' ? 'Member' : 'Admin';
      await axios.put(`/api/workspaces/${workspaceId}/members/${memberId}/role`, { role: newRole });
      setMsg({ type: 'success', text: 'Role updated successfully' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update role' });
    }
  };

  const handleAddClient = async () => {
    try {
      const workspaceId = workspace?._id || user.workspaces?.[0] || localStorage.getItem('activeWorkspace');
      if (!workspaceId) {
        setMsg({ type: 'error', text: 'Please select a workspace first' });
        return;
      }
      await axios.post('/api/auth/clients', { ...newClient, workspaceId });
      setMsg({ type: 'success', text: 'Client Onboarded! Secret Code: ' + newClient.secretCode });
      setOpenModal(false);
      setNewClient({ name: '', secretCode: '', password: '' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to onboard client' });
    }
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm('Remove this user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      setMsg({ type: 'success', text: 'User removed' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Action failed' });
    }
  };

  const handleUpdateWorkspace = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      await axios.put(`/api/workspaces/${workspaceId}`, { name: workspaceName });
      setMsg({ type: 'success', text: 'Workspace updated successfully!' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update workspace' });
    }
  };

  const handleExport = () => {
    const memberAttendance = attendance.filter(a => a.user?._id === selectedMember?._id);
    if (memberAttendance.length === 0) {
      setMsg({ type: 'error', text: 'No data to export' });
      return;
    }

    const headers = ['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Work Summary'];
    const rows = memberAttendance.map(log => {
      const diff = log.clockOut ? (new Date(log.clockOut) - new Date(log.clockIn)) : 0;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const totalTime = log.clockOut ? `${hours}h ${minutes}m` : 'Active';
      
      return [
        new Date(log.date).toISOString().split('T')[0],
        log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour12: true }) : '--',
        log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour12: true }) : 'Working',
        totalTime,
        `"${(log.workSummary || '').replace(/"/g, '""').replace(/\n/g, '; ')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_${selectedMember?.name || 'Report'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#f8f9fd', minHeight: '100vh' }}>
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c' }}>Admin Control Center</Typography>
          <Typography variant="body1" sx={{ color: '#718096' }}>Manage users, clients, and global settings</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpenModal(true)} sx={{ backgroundColor: '#5a67d8', borderRadius: 3, fontWeight: 700, px: 3, py: 1.2 }}>Onboard Client</Button>
      </Box>

      {msg.text && <Alert severity={msg.type} sx={{ mb: 3, borderRadius: 3 }}>{msg.text}</Alert>}

      <Paper sx={{ borderRadius: 5, overflow: 'hidden', boxShadow: '0 4px 25px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #edf2f7', '& .MuiTab-root': { py: 2.5, fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' } }}>
          <Tab icon={<GroupIcon sx={{ mr: 1 }} />} iconPosition="start" label="Team Members" />
          <Tab icon={<VideocamOutlinedIcon sx={{ mr: 1 }} />} iconPosition="start" label="Attendance Tracker" />
          <Tab icon={<BusinessIcon sx={{ mr: 1 }} />} iconPosition="start" label="Client Management" />
          <Tab icon={<SettingsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Workspace Settings" />
        </Tabs>

        <Box sx={{ p: 4 }}>
          {tab === 0 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f7fafc' }}><TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Member</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={m.profileImage} sx={{ width: 40, height: 40, borderRadius: 2 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{m.name}</Typography>
                            <Typography variant="caption" color="textSecondary">{m.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={m.role} 
                          size="small" 
                          sx={{ fontWeight: 700, backgroundColor: m.role === 'Admin' ? '#ebf4ff' : '#f7fafc', color: m.role === 'Admin' ? '#5a67d8' : '#718096' }} 
                        />
                      </TableCell>
                      <TableCell>{m.department || 'General Team'}</TableCell>
                      <TableCell align="right">
                        {user?._id !== m._id && (
                          <>
                            <Tooltip title="Change Role"><IconButton size="small" onClick={() => handleRoleChange(m._id, m.role)} sx={{ mr: 1 }}><SecurityIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Remove User"><IconButton size="small" color="error" onClick={() => handleRemoveUser(m._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Member List</Typography>
                <List sx={{ backgroundColor: '#f8fafc', borderRadius: 4, p: 1 }}>
                  {members.map(m => {
                    const isActive = attendance.some(a => a.user?._id === m._id && !a.clockOut);
                    return (
                      <ListItemButton key={m._id} selected={selectedMember?._id === m._id} onClick={() => setSelectedMember(m)} sx={{ borderRadius: 3, mb: 0.5, py: 1.5 }}>
                        <ListItemAvatar>
                          <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot" invisible={!isActive} sx={{ '& .MuiBadge-badge': { backgroundColor: '#48bb78', border: '2px solid white' } }}>
                            <Avatar src={m.profileImage} sx={{ borderRadius: 2 }} />
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText primary={m.name} secondary={isActive ? 'Currently Clocked In' : m.role} primaryTypographyProps={{ fontWeight: 800 }} />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Grid>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Attendance Sheets: {selectedMember?.name || 'Select Member'}</Typography>
                  <Button size="small" variant="contained" onClick={handleExport} sx={{ borderRadius: 2, backgroundColor: '#48bb78', color: 'white', fontWeight: 700 }}>Export to Excel</Button>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
                  <Table>
                    <TableHead sx={{ backgroundColor: '#f7fafc' }}><TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Clock In</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Clock Out</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total Hours</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {attendance.filter(a => a.user?._id === selectedMember?._id).map(log => (
                        <TableRow key={log._id}>
                          <TableCell sx={{ fontWeight: 600 }}>{new Date(log.date).toLocaleDateString()}</TableCell>
                          <TableCell>{log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (log.workSummary ? 'Task Log' : '--')}</TableCell>
                          <TableCell>
                            {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (log.workSummary ? 'Submitted' : <Chip label="Working" size="small" color="success" />)}
                            {log.workSummary && (
                              <Tooltip title={<Box sx={{ whiteSpace: 'pre-line', p: 1 }}>{log.workSummary}</Box>}>
                                <Chip label="View Report" size="small" variant="outlined" sx={{ ml: 1, cursor: 'help', fontWeight: 700 }} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {log.clockOut ? (() => {
                              const diff = new Date(log.clockOut) - new Date(log.clockIn);
                              const hours = Math.floor(diff / (1000 * 60 * 60));
                              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                              return `${hours}h ${minutes}m`;
                            })() : '--'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {attendance.filter(a => a.user?._id === selectedMember?._id).length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#a0aec0' }}>No attendance records found for this member</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}

          {tab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Active Clients & Portal Access</Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#f7fafc' }}><TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Client Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Portal Secret ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Registration Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell sx={{ fontWeight: 800 }}>{c.name}</TableCell>
                        <TableCell><Chip icon={<VpnKeyIcon />} label={c.secretCode} variant="outlined" sx={{ fontWeight: 700, borderColor: '#5a67d8', color: '#5a67d8' }} /></TableCell>
                        <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton color="error" onClick={() => handleRemoveUser(c._id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {clients.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#a0aec0' }}>No clients have been onboarded yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tab === 3 && (
            <Grid container spacing={6}>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 4 }}>Workspace Information</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField 
                    fullWidth 
                    label="Workspace Name" 
                    value={workspaceName} 
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    variant="outlined" 
                    InputProps={{ sx: { borderRadius: 3, fontWeight: 600 } }} 
                  />
                  <TextField fullWidth label="Invite Code" value={workspace?.inviteCode || ''} disabled variant="outlined" InputProps={{ sx: { borderRadius: 3, fontWeight: 800, letterSpacing: 2 } }} />
                  <TextField fullWidth label="Admin Contact" value={user?.email || ''} disabled variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                  <Button 
                    variant="contained" 
                    onClick={handleUpdateWorkspace}
                    sx={{ backgroundColor: '#1a202c', py: 1.5, borderRadius: 3, fontWeight: 700, mt: 2 }}
                  >
                    Update Workspace Settings
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fcfcfc' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Workspace QR Code</Typography>
                  <Typography variant="body2" sx={{ color: '#718096', mb: 4 }}>Share this code with your team to let them join instantly.</Typography>
                  <Box sx={{ p: 3, backgroundColor: 'white', display: 'inline-block', borderRadius: 4, border: '2px solid #edf2f7', mb: 3 }}>
                    <QRCodeSVG value={workspace?.inviteCode || 'N/A'} size={180} />
                  </Box>
                  <Button variant="outlined" fullWidth sx={{ borderRadius: 3, py: 1, fontWeight: 700 }} onClick={() => { navigator.clipboard.writeText(workspace?.inviteCode); setMsg({ type: 'success', text: 'Invite code copied!' }); }}>Copy Invite Code</Button>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} PaperProps={{ sx: { borderRadius: 5, width: '100%', maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 900, px: 4, pt: 4 }}>Onboard New Client</DialogTitle>
        <DialogContent sx={{ px: 4 }}>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>Generate a secure portal ID and password for your client.</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField label="Client Full Name" fullWidth value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} InputProps={{ sx: { borderRadius: 3 } }} />
            <TextField label="Secret ID (e.g. CLI-2024)" fullWidth value={newClient.secretCode} onChange={(e) => setNewClient({...newClient, secretCode: e.target.value})} InputProps={{ sx: { borderRadius: 3, fontWeight: 700 } }} />
            <TextField label="Set Login Password" type="password" fullWidth value={newClient.password} onChange={(e) => setNewClient({...newClient, password: e.target.value})} InputProps={{ sx: { borderRadius: 3 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ color: '#718096', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddClient} sx={{ backgroundColor: '#5a67d8', borderRadius: 3, px: 4, py: 1.2, fontWeight: 700 }}>Generate & Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagement;
