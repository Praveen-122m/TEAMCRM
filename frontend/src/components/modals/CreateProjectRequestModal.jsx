import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, MenuItem, Grid } from '@mui/material';
import axios from 'axios';
import { DatePicker } from '../ui/DatePicker';

const CreateProjectRequestModal = ({ open, onClose, workspaceId, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    requiredFeatures: '',
    priority: 'Medium'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) return;
    setLoading(true);
    try {
      await axios.post('/api/projects/requests', { ...formData, workspaceId });
      onSuccess();
      onClose();
      setFormData({ title: '', description: '', budget: '', deadline: '', requiredFeatures: '', priority: 'Medium' });
    } catch (err) {
      console.error('Failed to create project request', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>🚀 Create Project Request</DialogTitle>
      <DialogContent sx={{ overflow: 'visible' }}>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField 
            label="Project Title" 
            fullWidth 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            placeholder="e.g. E-commerce Website"
            InputProps={{ sx: { borderRadius: 3 } }}
          />
          <TextField 
            label="Project Description" 
            fullWidth 
            multiline 
            rows={4} 
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            placeholder="Describe what you want to build..."
            InputProps={{ sx: { borderRadius: 3 } }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField 
                label="Budget (Optional)" 
                fullWidth 
                value={formData.budget} 
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })} 
                placeholder="e.g. $500 - $1000"
                InputProps={{ sx: { borderRadius: 3 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                label="Priority" 
                select 
                fullWidth 
                value={formData.priority} 
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                SelectProps={{ sx: { borderRadius: 3 } }}
              >
                {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1, mb: 0.5, display: 'block' }}>Expected Deadline</Typography>
            <DatePicker
              value={formData.deadline}
              onChange={(val) => setFormData({ ...formData, deadline: val })}
              placeholder="Select expected deadline"
            />
          </Box>
          <TextField 
            label="Required Features (Comma separated)" 
            fullWidth 
            value={formData.requiredFeatures} 
            onChange={(e) => setFormData({ ...formData, requiredFeatures: e.target.value })} 
            placeholder="e.g. Payment Gateway, Admin Panel, Mobile Responsive"
            InputProps={{ sx: { borderRadius: 3 } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ color: '#718096', fontWeight: 700 }}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading}
          sx={{ backgroundColor: '#5a67d8', borderRadius: 3, px: 4, py: 1, fontWeight: 700 }}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProjectRequestModal;
