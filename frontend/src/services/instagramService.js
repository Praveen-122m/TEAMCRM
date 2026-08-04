import api from './api';

export const instagramService = {
  getProfile: (clientId) => api.get('/instagram/profile', { params: { clientId } }),
  getFollowersHistory: (clientId, days) => api.get('/instagram/followers/history', { params: { clientId, days } }),
  getMedia: (clientId, filterType, sortBy) => api.get('/instagram/media', { params: { clientId, filterType, sortBy } }),
  getMediaInsights: (mediaId) => api.get('/instagram/media/insights', { params: { mediaId } }),
  getExportUrl: (clientId, format) => `${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/instagram/export?clientId=${clientId}&format=${format}`
};
