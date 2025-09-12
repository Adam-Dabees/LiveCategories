// pages/api/lobby/[lobbyCode].js
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lobbyCode } = req.query;

  try {
    const lobby = gameStorage.getLobby(lobbyCode);
    
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }

    res.status(200).json({
      lobby_code: lobby.lobbyCode,
      phase: lobby.phase,
      players: Object.keys(lobby.players),
      player_count: Object.keys(lobby.players).length,
      category: lobby.category,
      status: lobby.status,
      scores: lobby.scores,
      round: lobby.round,
      highBid: lobby.highBid,
      listCount: lobby.listCount
    });
  } catch (error) {
    console.error('Error getting lobby info:', error);
    res.status(500).json({ error: 'Failed to get lobby information' });
  }
}