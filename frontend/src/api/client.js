import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', withCredentials: true });

api.interceptors.response.use(
  response => response,
  error => {
    const url = error.config?.url || '';
    const isAuthFormRequest = /\/auth\/(login|register|me)(?:\?|$)/.test(url);
    if (error.response?.status === 401 && !isAuthFormRequest && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);
