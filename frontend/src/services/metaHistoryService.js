import api from './api';

export const metaHistoryService = {
  getHistory: (clientId, startDate, endDate) =>
    api.get('/meta/history', { params: { clientId, startDate, endDate } }),

  getCharts: (clientId, startDate, endDate) =>
    api.get('/meta/history/charts', { params: { clientId, startDate, endDate } }),

  getCampaigns: (clientId, startDate, endDate) =>
    api.get('/meta/history/campaigns', { params: { clientId, startDate, endDate } }),

  getExportUrl: (clientId, startDate, endDate, format) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = sessionStorage.getItem('token');
    return `${apiBase}/meta/history/export?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}&format=${format}&token=${encodeURIComponent(token || '')}`;
  }
};
