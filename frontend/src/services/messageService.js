import api from './api';

export const messageService = {
  getChannels: (workspaceId) => api.get(`/channels/${workspaceId}`),
  createChannel: (data) => api.post('/channels', data),
  getMessages: (channelId, page = 1) => api.get(`/messages/${channelId}?page=${page}`),
  getDirectMessages: (userId) => api.get(`/messages/direct/${userId}`),
};
