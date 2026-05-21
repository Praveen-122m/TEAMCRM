import api from './api';

export const workspaceService = {
  getWorkspaces: (type) => api.get('/workspaces', { params: type ? { type } : {} }),
  createClientWorkspace: (data) => api.post('/workspaces/client-setup', data),
  joinWorkspace: (inviteCode) => api.post('/workspaces/join', { inviteCode }),
  getMembers: (workspaceId) => api.get(`/workspaces/${workspaceId}/members`),
  getWorkspaceClient: (workspaceId) => api.get(`/workspaces/${workspaceId}/client`),
};
