import api from './api';

export const leadService = {
  getLeads: (params) => api.get('/leads', { params }),
  getLead: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateStatus: (id, data) => api.put(`/leads/${id}/status`, data),
  assignLead: (id, memberId) => api.put(`/leads/${id}/assign`, { memberId }),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  exportCsv: (params) =>
    api.get('/leads/export/csv', { params, responseType: 'blob' }),
  exportExcel: (params) =>
    api.get('/leads/export/excel', { params, responseType: 'blob' }),
  exportPdf: (params) =>
    api.get('/leads/export/pdf', { params, responseType: 'blob' }),
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
export const LEAD_SOURCES = ['Meta Ads', 'Website', 'Instagram', 'Facebook', 'Other'];

export const statusBadgeClass = (status) => {
  const s = (status || 'NEW').toUpperCase();
  const map = {
    NEW: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    CONTACTED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    QUALIFIED: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    CONVERTED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    LOST: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };
  return map[s] || map.NEW;
};
