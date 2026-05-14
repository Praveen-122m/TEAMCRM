import React, { useEffect, useState, useContext } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress, Avatar, Chip } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';

const FileManager = () => {
  const { user } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get('/api/messages/files'); 
        setFiles(res.data);
      } catch (err) {
        console.error('Failed to fetch real files', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchFiles();
  }, [user]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 4 }}>Workspace Files</Typography>
      
      {files.length === 0 ? (
        <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, border: '1px dashed #cbd5e0', backgroundColor: 'transparent', boxShadow: 'none' }}>
          <InsertDriveFileIcon sx={{ fontSize: 60, color: '#cbd5e0', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">No files shared yet</Typography>
          <Typography variant="body2" color="textSecondary">Every image or document you share in chat will appear here.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid #f0f0f0', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sender</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {file.fileType?.includes('image') ? <ImageIcon sx={{ color: '#5a67d8' }} /> : <InsertDriveFileIcon sx={{ color: '#718096' }} />}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.content?.split(': ')[1] || 'Shared File'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={file.sender?.profileImage} sx={{ width: 24, height: 24 }} />
                      <Typography variant="body2">{file.sender?.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton component="a" href={file.fileUrl} target="_blank" size="small" sx={{ color: '#5a67d8' }}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default FileManager;
