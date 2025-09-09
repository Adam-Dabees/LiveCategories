import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = 'http://localhost:8001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  login: async (username, password) => {
    const response = await api.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/auth/stats');
    return response.data;
  },
};

export const gameAPI = {
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  getCategoryItems: async (categoryName) => {
    const response = await api.get(`/categories/${categoryName}`);
    return response.data;
  },

  getGameStats: async (gameId) => {
    const response = await api.get(`/games/${gameId}/stats`);
    return response.data;
  },

  getGameByLobbyCode: async (lobbyCode) => {
    const response = await api.get(`/lobby/${lobbyCode}`);
    return response.data;
  },

  createLobby: async (category, bestOf = 5) => {
    const response = await api.post(`/lobby/create?category=${category}&best_of=${bestOf}`);
    return response.data;
  },

  joinRandomLobby: async (category) => {
    const response = await api.post(`/lobby/join-random?category=${category}`);
    return response.data;
  },

  getAvailableLobbies: async (category) => {
    const response = await api.get(`/lobby/available/${category}`);
    return response.data;
  },
};

export default api;
