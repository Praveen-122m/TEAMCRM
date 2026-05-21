import api from './api';

export const leadService = {
  getLeads: (workspaceId, clientId) => api.get('/leads', { params: { workspaceId, clientId } }),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
};
