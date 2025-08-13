import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ipv4Data from '../../assets/ipv4_address.json';
import { Alert } from 'react-native';

interface QueueItem {
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedQueue = [];
};

const setupAxiosInterceptors = (logout: () => Promise<void>) => {
  // Request interceptor
  axios.interceptors.request.use(
    async config => {
      // Add token to requests if available
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  // Response interceptor
  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Don't attempt token refresh for login/register endpoints
      const isAuthEndpoint = 
        originalRequest.url.includes('/auth/login/') || 
        originalRequest.url.includes('/auth/register/');
      
      // If error isn't 401, or it's from an auth endpoint, just reject without refresh attempt
      if (!error.response || error.response.status !== 401 || isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Don't retry requests that already tried to refresh
      if (originalRequest._retry) {
        // Logout and redirect to login screen
        await logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If we're already refreshing the token, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      // Mark this request as retried
      originalRequest._retry = true;
      isRefreshing = true;

      // Try to refresh the token
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Make refresh token request
        const response = await axios.post(
          `http://${ipv4Data.ipv4_address}:8000/api/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access: newToken } = response.data;
        
        // Store the new token
        await SecureStore.setItemAsync('accessToken', newToken);
        
        // Update the failed requests with new token
        processQueue(null, newToken);
        
        // Update header for current request and retry it
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        processQueue(refreshError instanceof Error ? refreshError : new Error(String(refreshError)), null);
        
        // Log the error if needed
        console.error('Token refresh failed:', refreshError);
        
        // Logout the user
        await logout();
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};

export default setupAxiosInterceptors;