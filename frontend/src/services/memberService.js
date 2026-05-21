import api from './api';

export const memberService = {
  createMember: (data) => api.post('/members', data),
  getMembers: (workspaceId) => api.get(`/members`, { params: { workspaceId } }),
  getMemberById: (id) => api.get(`/members/${id}`),
  getAssignedClients: (id) => api.get(`/members/${id}/clients`),
  updateMember: (id, data) => api.put(`/members/${id}`, data),
  deleteMember: (id) => api.delete(`/members/${id}`),
};
