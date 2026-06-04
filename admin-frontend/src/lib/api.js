import axios from 'axios';
import toast from 'react-hot-toast';

let API_URL;
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_ADMIN_API_URL) {
  API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://admin-backend-correct.vercel.app/api';
} else {
  API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:5001/api';
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_role');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;