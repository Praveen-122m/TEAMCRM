import api from './api';

export const deviceService = {
  register: (data) => api.post('/devices/register', data),
  unregister: (token) => api.delete('/devices/unregister', { data: { token } })
};
