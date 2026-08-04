import api from './api';

export const fileService = {
  uploadFile: (formData, onProgress) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  getFiles: (workspaceId, clientId, category) => api.get('/files', { params: { workspaceId, clientId, category } }),
  deleteFile: (id) => api.delete(`/files/${id}`),
};
