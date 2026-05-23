import api from './api';

export const metaService = {
  getAuthUrl: (clientId, workspaceId) => `${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/meta-ads/connect?clientId=${clientId}&workspaceId=${workspaceId}`,
  getAdAccounts: (clientId) => api.get('/meta-ads/accounts', { params: { clientId } }),
  selectAdAccount: (data) => api.post('/meta-ads/account', data),
  syncCampaigns: (clientId, workspaceId) => api.post('/meta-ads/sync-campaigns', null, { params: { clientId, workspaceId } }),
  syncLeads: (clientId, workspaceId) => api.post('/meta-ads/sync-leads', null, { params: { clientId, workspaceId } }),
  getAnalytics: (clientId, startDate, endDate) => api.get('/meta-ads/analytics', { params: { clientId, startDate, endDate } }),
};
