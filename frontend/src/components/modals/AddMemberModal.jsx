import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, List, ListItem, ListItemAvatar, Avatar, ListItemText, IconButton, Typography, Box, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import axios from 'axios';

const AddMemberModal = ({ open, onClose, workspaceId }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/search?q=${search}`);
      setResults(res.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (userId) => {
    setAddingId(userId);
    try {
      await axios.post(`/api/workspaces/${workspaceId}/members`, { userId });
      // Notify parent or show success
      setResults(results.filter(u => u._id !== userId));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Team Member</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
          }}
        />
        
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>}
        
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {results.map((user) => (
            <ListItem
              key={user._id}
              secondaryAction={
                <IconButton 
                  edge="end" 
                  onClick={() => handleAdd(user._id)}
                  disabled={addingId === user._id}
                >
                  {addingId === user._id ? <CircularProgress size={20} /> : <AddCircleOutlinedIcon color="primary" />}
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar src={user.profileImage} />
              </ListItemAvatar>
              <ListItemText 
                primary={user.name} 
                secondary={
                  <Typography variant="caption" sx={{ color: '#718096' }}>
                    {user.email} {user.phoneNumber && `• ${user.phoneNumber}`}
                  </Typography>
                } 
              />
            </ListItem>
          ))}
          {!loading && search && results.length === 0 && (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
              No users found.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberModal;
