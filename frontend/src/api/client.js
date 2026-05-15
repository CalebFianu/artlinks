import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach access token ---
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('artlinks:access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Response interceptor: silent JWT refresh on 401 ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refresh = localStorage.getItem('artlinks:refresh');
      if (!refresh) {
        window.dispatchEvent(new Event('artlinks:logout'));
        return Promise.reject(error);
      }

      try {
        // Use plain axios (not client) to avoid re-attaching the expired token
        const baseURL = import.meta.env.VITE_API_BASE_URL;
        const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, { refresh });
        localStorage.setItem('artlinks:access', data.access);
        processQueue(null, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError);
        window.dispatchEvent(new Event('artlinks:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
