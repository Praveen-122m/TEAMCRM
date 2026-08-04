import api from './api';

export const messageService = {
  getChannels: (workspaceId) => api.get(`/channels/${workspaceId}`),
  createChannel: (data) => api.post('/channels', data),
  getMessages: (channelId, page = 1, limit = 150) => api.get(`/messages/${channelId}`, { params: { page, limit } }),
  getDirectMessages: (userId, workspaceId, page = 1, limit = 150) =>
    api.get(`/messages/direct/${userId}`, { params: { workspaceId, page, limit } }),
  getConversations: (workspaceId) =>
    api.get('/messages/conversations', { params: workspaceId ? { workspaceId } : {} }),
  sendMessage: (payload) => api.post('/messages', payload),
  getDirectMessageAttachments: (userId, workspaceId) => 
    api.get(`/messages/attachments/direct/${userId}`, { params: { workspaceId } }),
  getChannelAttachments: (channelId) =>
    api.get(`/messages/attachments/channel/${channelId}`),
};
