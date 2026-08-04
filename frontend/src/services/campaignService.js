import api from './api';

export const campaignService = {
  getCampaigns: (workspaceId, status) => api.get('/campaigns', { params: { workspaceId, status } }),
  getCampaignById: (id) => api.get(`/campaigns/${id}`),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
};
