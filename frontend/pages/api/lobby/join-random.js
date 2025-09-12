// pages/api/lobby/join-random.js
import gameStorage from '../../../lib/gameStorage.js';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Find available lobbies for this category
    const availableLobbies = gameStorage.getLobbiesByCategory(category);
    
    if (availableLobbies.length > 0) {
      // Join the first available lobby
      const lobby = availableLobbies[0];
      
      res.status(200).json({
        success: true,
        game_id: lobby.id,
        lobby_code: lobby.lobbyCode,
        category: lobby.category,
        status: 'joined'
      });
    } else {
      // No available lobbies, return error for now
      // In a real implementation, you might create a new lobby automatically
      res.status(404).json({ error: 'No available lobbies found for this category' });
    }
  } catch (error) {
    console.error('Error joining random lobby:', error);
    res.status(500).json({ error: 'Failed to join random lobby' });
  }
}