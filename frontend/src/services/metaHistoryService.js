import api from './api';

export const metaHistoryService = {
  getHistory: (clientId, startDate, endDate) =>
    api.get('/meta/history', { params: { clientId, startDate, endDate } }),

  getCharts: (clientId, startDate, endDate) =>
    api.get('/meta/history/charts', { params: { clientId, startDate, endDate } }),

  getCampaigns: (clientId, startDate, endDate) =>
    api.get('/meta/history/campaigns', { params: { clientId, startDate, endDate } }),

  getExportUrl: (clientId, startDate, endDate, format) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
    const token = localStorage.getItem('token');
    return `${apiBase}/meta/history/export?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}&format=${format}&token=${encodeURIComponent(token || '')}`;
  },

  getFollowersHistory: (clientId, startDate, endDate) =>
    api.get('/meta/followers/history', { params: { clientId, startDate, endDate } }),

  getFollowersChart: (clientId, startDate, endDate) =>
    api.get('/meta/followers/chart', { params: { clientId, startDate, endDate } }),

  getFollowersLatest: (clientId) =>
    api.get('/meta/followers/latest', { params: { clientId } })
};
