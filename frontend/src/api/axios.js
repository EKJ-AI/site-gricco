import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://localhost:3000',
  baseURL: 'https://api.gricco.com.br',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // para enviar cookies
});

// Add interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await api.post('/api/auth/refresh');
        const newAccessToken = res.data.accessToken;
        localStorage.setItem('imax-token', newAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error('Refresh token falhou', err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
