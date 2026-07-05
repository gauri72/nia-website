import axios from 'axios';

const MEMBER_TOKEN_KEY = 'nia_member_token';

const memberApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

memberApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(MEMBER_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

memberApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(MEMBER_TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export { MEMBER_TOKEN_KEY };
export default memberApi;
