import api from './api';

export const taskService = {
  createTask: (data) => api.post('/tasks/create', data),
  updateTask: (id, data) => api.put(`/tasks/update/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/delete/${id}`),
  startTask: (id) => api.post(`/tasks/start/${id}`),
  completeTask: (id) => api.post(`/tasks/complete/${id}`),
  getMemberTasks: () => api.get('/tasks/member'),
  getWorkspaceTasks: () => api.get('/tasks/workspace'),
  getAdminTasks: () => api.get('/tasks/admin'),
  getFilterTasks: (range, fromDate, toDate) => 
    api.get('/tasks/filter', { params: { range, fromDate, toDate } })
};
