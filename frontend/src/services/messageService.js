import api from './api';

export const messageService = {
  getChannels: (workspaceId) => api.get(`/channels/${workspaceId}`),
  createChannel: (data) => api.post('/channels', data),
  getMessages: (channelId, page = 1) => api.get(`/messages/${channelId}?page=${page}`),
  getDirectMessages: (userId, workspaceId) =>
    api.get(`/messages/direct/${userId}`, { params: workspaceId ? { workspaceId } : {} }),
  getConversations: (workspaceId) =>
    api.get('/messages/conversations', { params: workspaceId ? { workspaceId } : {} }),
  sendMessage: (payload) => api.post('/messages', payload),
};
