import axios from 'axios';

const getTabToken = () => sessionStorage.getItem('token');
const setTabToken = (token) => sessionStorage.setItem('token', token);
const clearTabAuth = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('userInfo');
  sessionStorage.removeItem('activeWorkspace');
};

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://teamcrmbackend.onrender.com/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use(
  (config) => {
    const token = getTabToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) return Promise.reject(error);

    const status = error.response.status;
    const url = originalRequest?.url || '';

    if (status === 401 && !url.includes('/auth/login') && originalRequest && !originalRequest._retry) {
      if (url.includes('/auth/refresh')) {
        clearTabAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          getApiBaseUrl() + '/auth/refresh',
          {},
          { withCredentials: true }
        );

        const { token } = res.data;
        setTabToken(token);

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;

        processQueue(null, token);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        clearTabAuth();

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
