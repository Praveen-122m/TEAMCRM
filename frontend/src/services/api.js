import axios from 'axios';

const defaultBaseURL = `http://${window.location.hostname}:5005/api`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Do not redirect if it's the login endpoint returning 401 (e.g. wrong password)
    if (status === 401 && url && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('activeWorkspace');
      
      // Prevent infinite reload loop if already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // 429 = rate limit — do not logout; let the UI show the error
    return Promise.reject(error);
  }
);

export default api;
