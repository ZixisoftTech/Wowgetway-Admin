import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { store } from './store/index.js';
import { authSuccess, logout } from './modules/WoWSuper-Admin/store/superAdminAuthSlice.js';
import App from './App.jsx';
import './index.css';

// Enable credentials so cookies (refresh tokens) are sent automatically
axios.defaults.withCredentials = true;

// 1. Request Interceptor: Maps base URLs and injects the Authorization header
axios.interceptors.request.use((config) => {
  // Map the hardcoded hosted domain to local port during development
  if (config.url && config.url.includes('https://wow-getway-api.onrender.com')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const targetBase = isLocal 
      ? (import.meta.env.VITE_API_URL || 'http://localhost:5005')
      : 'https://backend-sand-nine-13.vercel.app';
    config.url = config.url.replace('https://wow-getway-api.onrender.com', targetBase);
  }

  // Inject JWT from localStorage based on URL or current browser path
  const isOwnerPath = (config.url && config.url.includes('/homestay-owner')) || 
                      (typeof window !== 'undefined' && window.location.pathname.startsWith('/homestay-owner'));
  const token = isOwnerPath 
    ? (localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken') || localStorage.getItem('token'))
    : (localStorage.getItem('superAdminToken') || localStorage.getItem('token'));

  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Response Interceptor: Safe concurrent token renewal queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for 401 or 403 errors indicating expired access token
    const isTokenExpired = error.response && (
      error.response.status === 401 ||
      (error.response.status === 403 && (error.response.data?.code === 'TOKEN_EXPIRED' || error.response.data?.error?.includes('expired')))
    );

    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/login');

    if (isTokenExpired && !originalRequest._retry && !isAuthEndpoint) {
      const storedRefreshToken = localStorage.getItem('superAdminRefreshToken') || localStorage.getItem('refreshToken');
      
      // If neither stored refresh token nor cookie exists, avoid calling refresh and redirect immediately
      if (!storedRefreshToken && typeof document !== 'undefined' && !document.cookie.includes('refreshToken')) {
        console.warn('[Auth Interceptor] No refresh token available. Logging out and redirecting to login...');
        store.dispatch(logout());
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('token');
        localStorage.removeItem('superAdminRefreshToken');
        localStorage.removeItem('superAdminUser');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If we are already renewing the token, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const base = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:5005') : 'https://backend-sand-nine-13.vercel.app';
        console.log('[Auth Interceptor] Access token expired. Attempting token refresh...');
        const res = await axios.post(`${base}/api/auth/refresh`, { refreshToken: storedRefreshToken }, {
          headers: storedRefreshToken ? { 'x-refresh-token': storedRefreshToken } : {}
        });
        const { token, refreshToken: newRefreshToken } = res.data;

        // Retrieve user and dispatch update to Redux
        const userStr = localStorage.getItem('superAdminUser');
        const user = userStr ? JSON.parse(userStr) : null;
        store.dispatch(authSuccess({ token, user }));
        localStorage.setItem('superAdminToken', token);
        localStorage.setItem('token', token);
        if (newRefreshToken) {
          localStorage.setItem('superAdminRefreshToken', newRefreshToken);
        }

        // Update default header and original request header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers['Authorization'] = `Bearer ${token}`;

        processQueue(null, token);
        isRefreshing = false;

        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Log out user on refresh token failure and redirect to login
        console.warn('[Auth Interceptor] Refresh token expired or invalid. Logging out and redirecting to login...');
        store.dispatch(logout());
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('token');
        localStorage.removeItem('superAdminRefreshToken');
        localStorage.removeItem('superAdminUser');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
