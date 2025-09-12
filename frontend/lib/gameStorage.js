// lib/gameStorage.js
// Shared in-memory storage for game data
// In production, this should be replaced with a database like Firebase or Supabase

class GameStorage {
  constructor() {
    this.lobbies = new Map();
  }

  createLobby(lobbyData) {
    this.lobbies.set(lobbyData.id, lobbyData);
    return lobbyData;
  }

  getLobby(lobbyId) {
    return this.lobbies.get(lobbyId);
  }

  updateLobby(lobbyId, updates) {
    const existing = this.lobbies.get(lobbyId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.lobbies.set(lobbyId, updated);
      return updated;
    }
    return null;
  }

  deleteLobby(lobbyId) {
    return this.lobbies.delete(lobbyId);
  }

  getAllLobbies() {
    return Array.from(this.lobbies.values());
  }

  getLobbiesByCategory(category) {
    return Array.from(this.lobbies.values()).filter(
      lobby => lobby.category === category && lobby.status === 'waiting_for_players'
    );
  }
}

// Create a singleton instance
const gameStorage = new GameStorage();

export default gameStorage;