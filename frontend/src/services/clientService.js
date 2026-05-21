import api from './api';

export const clientService = {
  createClient: (data) => api.post('/clients', data),
  getClients: (workspaceId) => api.get(`/clients`, { params: { workspaceId } }),
  getClientById: (id) => api.get(`/clients/${id}`),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  assignMember: (clientId, memberId, role) => api.post(`/clients/${clientId}/assign`, { memberId, role }),
  removeAssignment: (clientId, assignmentId) => api.delete(`/clients/${clientId}/assign/${assignmentId}`),
};
