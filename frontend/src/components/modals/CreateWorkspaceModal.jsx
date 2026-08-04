import React, { useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const CreateWorkspaceModal = ({ open, onClose, onSuccess }) => {
  const { refreshUser } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/workspaces', { name, description });
      await refreshUser(); // Sync admin status instantly
      onSuccess(res.data);
      onClose();
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Create a Workspace</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>
            Workspaces are where your team communicates. Give yours a name and a short description.
          </Typography>
          <TextField
            fullWidth
            label="Workspace Name"
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            placeholder="What does this team do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} sx={{ color: '#718096' }}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !name.trim()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateWorkspaceModal;
