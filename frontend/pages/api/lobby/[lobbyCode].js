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
    // First try to get lobby from local storage
    let lobby = gameStorage.getLobby(lobbyCode);
    
    if (!lobby) {
      // If not found in local storage, the lobby might exist in Firestore
      // For now, we'll return a generic response that allows the client to try joining
      // The actual lobby validation will happen when the user tries to join via Firestore
      console.log(`Lobby ${lobbyCode} not found in local storage, assuming it exists in Firestore`);
      return res.status(200).json({
        lobby_code: lobbyCode,
        phase: 'lobby',
        players: [],
        player_count: 0,
        category: 'unknown', // This will be determined when joining
        status: 'waiting_for_players',
        scores: {},
        round: 1,
        highBid: 0,
        listCount: 0,
        source: 'firestore' // Indicates this is a Firestore-based lobby
      });
    }

    // Return local storage lobby data
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
      listCount: lobby.listCount,
      source: 'local' // Indicates this is a local storage lobby
    });
  } catch (error) {
    console.error('Error getting lobby info:', error);
    res.status(500).json({ error: 'Failed to get lobby information' });
  }
}