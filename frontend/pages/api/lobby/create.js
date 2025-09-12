// pages/api/lobby/create.js
import { v4 as uuidv4 } from 'uuid';
import gameStorage from '../../../lib/gameStorage.js';

export default async function handler(req, res) {
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
    const { category, best_of = 5 } = req.query;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const gameId = uuidv4().substring(0, 8);
    const lobbyCode = gameId;

    // Create lobby data
    const lobby = {
      id: gameId,
      lobbyCode,
      category,
      bestOf: parseInt(best_of),
      status: 'waiting_for_players',
      players: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      phase: 'lobby',
      scores: {},
      round: 1,
      highBid: 0,
      listCount: 0
    };

    // For now, just use local storage in the API
    // The client-side will handle Firestore operations with proper authentication
    console.log('Creating lobby in local storage (API side):', gameId);
    gameStorage.createLobby(lobby);

    res.status(200).json({
      success: true,
      game_id: gameId,
      lobby_code: lobbyCode,
      category,
      best_of: parseInt(best_of),
      status: 'waiting_for_players'
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
}