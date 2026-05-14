import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Alert } from '@mui/material';
import axios from 'axios';

const JoinWorkspaceModal = ({ open, onClose, onSuccess }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/workspaces/join', { inviteCode: inviteCode.trim().toUpperCase() });
      onSuccess(res.data);
      onClose();
      setInviteCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join workspace. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Join a Workspace</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>
            Enter the 6-digit invite code or scan the QR code provided by your workspace administrator.
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Invite Code"
            placeholder="e.g. X8Y2Z9"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            inputProps={{ style: { textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} sx={{ color: '#718096' }}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !inviteCode.trim()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {loading ? 'Joining...' : 'Join Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default JoinWorkspaceModal;
