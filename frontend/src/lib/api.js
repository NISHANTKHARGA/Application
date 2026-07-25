import axios from 'axios';

let API_URL;
if (process.env.NEXT_PUBLIC_API_URL) {
  API_URL = process.env.NEXT_PUBLIC_API_URL;
} else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  API_URL = 'https://application-nu-ochre-beryl.vercel.app/_/backend/api';
} else {
  API_URL = 'http://localhost:5000/api';
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
