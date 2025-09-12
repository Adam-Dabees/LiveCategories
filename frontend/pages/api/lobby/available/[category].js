// pages/api/lobby/available/[category].js
import gameStorage from '../../../../lib/gameStorage.js';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category } = req.query;

  try {
    const availableLobbies = gameStorage.getLobbiesByCategory(category);
    
    // Format the response to include relevant lobby information
    const lobbyList = availableLobbies.map(lobby => ({
      id: lobby.id,
      lobbyCode: lobby.lobbyCode,
      category: lobby.category,
      playerCount: Object.keys(lobby.players).length,
      status: lobby.status,
      createdAt: lobby.createdAt
    }));

    res.status(200).json(lobbyList);
  } catch (error) {
    console.error('Error getting available lobbies:', error);
    res.status(500).json({ error: 'Failed to get available lobbies' });
  }
}