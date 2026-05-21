import api from './api';
import { saveAs } from 'file-saver';

export const reportService = {
  generateReport: (data) => api.post('/reports/generate', data),
  getReports: (workspaceId, clientId) => api.get('/reports', { params: { workspaceId, clientId } }),
  exportLeadsCSV: async (workspaceId) => {
    const response = await api.get('/reports/export-leads', { 
      params: { workspaceId },
      responseType: 'blob' 
    });
    saveAs(response.data, `leads_export_${new Date().getTime()}.csv`);
    return true;
  },
};
