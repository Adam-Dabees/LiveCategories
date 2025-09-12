import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for Vercel deployment
// In production (Vercel), this will be '/api'
// In development, this can be set to 'http://localhost:8001' via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Game API - keeping these for game functionality
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
    try {
      const response = await api.post(`/lobby/create?category=${category}&best_of=${bestOf}`);
      return response.data;
    } catch (error) {
      console.error('API Error creating lobby:', error.response?.data || error.message);
      return { error: error.response?.data?.detail || error.message };
    }
  },

  joinRandomLobby: async (category) => {
    try {
      const response = await api.post(`/lobby/join-random?category=${category}`);
      return response.data;
    } catch (error) {
      console.error('API Error joining random lobby:', error.response?.data || error.message);
      return { error: error.response?.data?.detail || error.message };
    }
  },

  getAvailableLobbies: async (category) => {
    const response = await api.get(`/lobby/available/${category}`);
    return response.data;
  },
};

export default api;
