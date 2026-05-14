import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Switch, FormControlLabel, Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, Checkbox, CircularProgress } from '@mui/material';
import axios from 'axios';

const CreateChannelModal = ({ open, onClose, workspaceId, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  useEffect(() => {
    if (open && workspaceId) {
      const fetchMembers = async () => {
        setFetchingMembers(true);
        try {
          const res = await axios.get(`/api/workspaces/${workspaceId}/members`);
          setMembers(res.data);
        } catch (err) {
          console.error('Error fetching members:', err);
        } finally {
          setFetchingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [open, workspaceId]);

  const toggleMember = (id) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/channels', { 
        name: name.toLowerCase().replace(/\s+/g, '-'), 
        description, 
        workspaceId,
        isPrivate,
        members: selectedMembers
      });
      if (onSuccess) onSuccess(res.data);
      onClose();
      // Reset
      setName('');
      setDescription('');
      setIsPrivate(false);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error creating channel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Create a Channel</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>
            Channels are where your team communicates. They’re best when organized around a topic — like #marketing.
          </Typography>
          <TextField
            fullWidth
            label="Channel Name"
            placeholder="e.g. project-x"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            placeholder="What’s this channel about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />}
            label={
              <Box>
                <Typography variant="subtitle2">Make Private</Typography>
                <Typography variant="caption" color="text.secondary">Only selected members will see this channel.</Typography>
              </Box>
            }
          />

          {isPrivate && (
            <Box sx={{ mt: 2, border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 200, overflowY: 'auto' }}>
              <Typography variant="caption" sx={{ px: 2, pt: 1, display: 'block', fontWeight: 700, color: '#718096' }}>
                Select Members
              </Typography>
              {fetchingMembers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={20} /></Box>
              ) : (
                <List size="small">
                  {members.map((m) => (
                    <ListItem key={m._id} dense button onClick={() => toggleMember(m._id)}>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar src={m.profileImage} sx={{ width: 24, height: 24 }} />
                      </ListItemAvatar>
                      <ListItemText primary={m.name} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                      <Checkbox 
                        edge="end" 
                        size="small" 
                        checked={selectedMembers.includes(m._id)}
                        disableRipple
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} sx={{ color: '#718096' }}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !name.trim()}
            sx={{ borderRadius: 2, px: 3, backgroundColor: '#5a67d8', '&:hover': { backgroundColor: '#4c51bf' } }}
          >
            {loading ? 'Creating...' : 'Create Channel'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateChannelModal;
