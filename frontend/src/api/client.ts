import axios from 'axios';
import { API_URL } from './config';

const baseURL = import.meta.env.VITE_API_URL || API_URL;

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('farmer');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
