import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, Typography, Grid, Paper, Tabs, Tab, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, IconButton, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, List, ListItem, ListItemButton, ListItemAvatar, ListItemText, Tooltip, Badge, CircularProgress, Modal, Divider, Breadcrumbs, Link, LinearProgress, Select, MenuItem, FormControl, InputLabel, Stack
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useConfirm } from '../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';

const AdminManagement = () => {
  const { user, activeWorkspace } = useContext(AuthContext);
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [openClientModal, setOpenClientModal] = useState(false);
  const [openMemberModal, setOpenMemberModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', secretCode: '', password: '' });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const rawId = activeWorkspace || user?.workspaces?.[0];
    if (!rawId) return;
    
    setLoading(true);
    try {
      const workspaceId = rawId;
      const [wpRes, memRes, clientRes] = await Promise.allSettled([
        axios.get('/api/workspaces'),
        axios.get(`/api/workspaces/${workspaceId}/members`),
        axios.get(`/api/auth/clients/${workspaceId}`)
      ]);

      if (wpRes.status === 'fulfilled') {
        const activeWp = wpRes.value.data.find(w => w._id === workspaceId);
        if (activeWp) { 
          setWorkspace(activeWp); 
          setWorkspaceName(activeWp.name); 
          setWorkspaceDesc(activeWp.description || '');
        }
      }
      if (memRes.status === 'fulfilled') setMembers(Array.isArray(memRes.value.data) ? memRes.value.data : []);
      if (clientRes.status === 'fulfilled') setClients(Array.isArray(clientRes.value.data) ? clientRes.value.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user, activeWorkspace, tab]);

  const handleAddClient = async () => {
    // Validate password complexity
    if (newClient.password.length < 8) {
      return setMsg({ type: 'error', text: 'Client password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one uppercase letter (A-Z).' });
    }
    if (!/[a-z]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one lowercase letter (a-z).' });
    }
    if (!/[0-9]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one numeric digit (0-9).' });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newClient.password)) {
      return setMsg({ type: 'error', text: 'Client password must contain at least one special character.' });
    }

    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      await axios.post('/api/auth/clients', { ...newClient, workspaceId });
      setMsg({ type: 'success', text: 'Client added successfully!' });
      setOpenClientModal(false);
      setNewClient({ name: '', secretCode: '', password: '' });
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to add client';
      setMsg({ type: 'error', text: errorMsg });
    }
  };

  const handleAddMember = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      await axios.post(`/api/workspaces/join`, { inviteCode: workspace?.inviteCode }); // For simplicity, using invite code logic
      setMsg({ type: 'success', text: 'Invitation logic triggered (Simulation)' });
      setOpenMemberModal(false);
      setNewMemberEmail('');
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to add member';
      setMsg({ type: 'error', text: errorMsg });
    }
  };

  const handleUpdateWorkspace = async () => {
    try {
      const workspaceId = activeWorkspace || user.workspaces?.[0];
      await axios.put(`/api/workspaces/${workspaceId}`, { name: workspaceName, description: workspaceDesc });
      setMsg({ type: 'success', text: 'Workspace updated!' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update workspace' });
    }
  };

  const handleRemoveUser = async (id) => {
    const confirmed = await confirm({
      title: 'Remove this user?',
      message: 'This action cannot be undone. All related data will be permanently removed.'
    });
    if (!confirmed) return;
    try {
      await axios.delete(`/api/users/${id}`);
      setMsg({ type: 'success', text: 'User removed' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Action failed' });
    }
  };

  return (
    <Box sx={{ p: 4, backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a202c' }}>Workspace Management</Typography>
          <Typography variant="body1" sx={{ color: '#718096' }}>Configure your workspace and manage team access</Typography>
        </Box>
      </Box>

      {msg.text && <Alert severity={msg.type} sx={{ mb: 3, borderRadius: 3 }} onClose={() => setMsg({text:'', type:''})}>{msg.text}</Alert>}

      <Paper sx={{ borderRadius: 5, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 25px rgba(0,0,0,0.05)' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid #edf2f7', px: 2, '& .MuiTab-root': { py: 3, fontWeight: 800, textTransform: 'none', fontSize: '1rem' } }}>
          <Tab icon={<GroupIcon sx={{ mr: 1 }} />} iconPosition="start" label="Team Members" />
          <Tab icon={<PersonIcon sx={{ mr: 1 }} />} iconPosition="start" label="Workspace Clients" />
          <Tab icon={<SettingsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Workspace Settings" />
        </Tabs>

        <Box sx={{ p: 4 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
          ) : (
            <>
              {tab === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Team Directory</Typography>
                    <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpenMemberModal(true)} sx={{ borderRadius: 3, fontWeight: 700, backgroundColor: '#5a67d8', textTransform: 'none' }}>Add Member</Button>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ backgroundColor: '#f7fafc' }}><TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Member Info</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {members.map((m) => (
                          <TableRow key={m._id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={m.profileImage} sx={{ width: 44, height: 44, borderRadius: 2 }} />
                                <Box><Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{m.name}</Typography><Typography variant="caption" sx={{ color: '#718096' }}>{m.email}</Typography></Box>
                              </Box>
                            </TableCell>
                            <TableCell><Chip label={m.role} size="small" sx={{ fontWeight: 800, backgroundColor: '#ebf4ff', color: '#5a67d8' }} /></TableCell>
                            <TableCell align="right">
                               {user?._id !== m._id && <IconButton color="error" onClick={() => handleRemoveUser(m._id)}><DeleteIcon /></IconButton>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>Client Accounts</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenClientModal(true)} sx={{ borderRadius: 3, fontWeight: 700, backgroundColor: '#5a67d8', textTransform: 'none' }}>Add Client</Button>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ backgroundColor: '#f7fafc' }}><TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Client Name</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Secret ID</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {clients.map(c => (
                          <TableRow key={c._id} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{c.name}</TableCell>
                            <TableCell><Chip label={c.secretCode} variant="outlined" sx={{ fontWeight: 800, color: '#5a67d8', borderColor: '#5a67d8' }} /></TableCell>
                            <TableCell align="right">
                               <IconButton color="primary" onClick={() => navigate('/dms', { state: { selectedUser: c } })}><ChatIcon /></IconButton>
                               <IconButton color="error" onClick={() => handleRemoveUser(c._id)}><DeleteIcon /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {tab === 2 && (
                <Box sx={{ maxWidth: 600 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Workspace Configuration</Typography>
                  <Stack spacing={3}>
                    <TextField fullWidth label="Display Name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} variant="outlined" />
                    <TextField fullWidth multiline rows={3} label="Description / Bio" value={workspaceDesc} onChange={(e) => setWorkspaceDesc(e.target.value)} variant="outlined" />
                    <Box sx={{ p: 2, borderRadius: 3, backgroundColor: '#f7fafc', border: '1px solid #e2e8f0' }}>
                       <Typography variant="caption" sx={{ fontWeight: 800, color: '#718096', display: 'block', mb: 1 }}>WORKSPACE INVITE CODE</Typography>
                       <Typography variant="h6" sx={{ fontWeight: 900, color: '#1a202c', letterSpacing: '2px' }}>{workspace?.inviteCode}</Typography>
                    </Box>
                    <Box>
                      <Button variant="contained" onClick={handleUpdateWorkspace} sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 800, backgroundColor: '#5a67d8', textTransform: 'none' }}>Save Changes</Button>
                    </Box>
                  </Stack>

                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Invite Member Modal */}
      <Dialog open={openMemberModal} onClose={() => setOpenMemberModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Invite Team Member</DialogTitle>
        <DialogContent sx={{ minWidth: 400, pt: 2 }}>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>Share the invite code or enter email to notify them.</Typography>
          <TextField fullWidth label="Email Address" variant="outlined" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} sx={{ mb: 2 }} />
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center', border: '1px dashed #cbd5e0' }}>
            <Typography variant="caption" sx={{ color: '#718096', fontWeight: 800 }}>SHARE INVITE CODE</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#5a67d8', mt: 1 }}>{workspace?.inviteCode}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setOpenMemberModal(false)}>Cancel</Button><Button variant="contained" onClick={handleAddMember} sx={{ fontWeight: 700, backgroundColor: '#5a67d8' }}>Send Invite</Button></DialogActions>
      </Dialog>

      {/* Onboard Client Modal */}
      <Dialog open={openClientModal} onClose={() => setOpenClientModal(false)} PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Onboard New Client</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2, minWidth: 400 }}>
          <TextField label="Full Name" fullWidth value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
          <TextField label="Secret ID" fullWidth value={newClient.secretCode} onChange={(e) => setNewClient({...newClient, secretCode: e.target.value})} />
          <TextField label="Password" type="password" fullWidth value={newClient.password} onChange={(e) => setNewClient({...newClient, password: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setOpenClientModal(false)}>Cancel</Button><Button variant="contained" onClick={handleAddClient} sx={{ fontWeight: 700, backgroundColor: '#5a67d8' }}>Onboard</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagement;
