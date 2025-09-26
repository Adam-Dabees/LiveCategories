// app/api/lobby/create/route.js
import { v4 as uuidv4 } from 'uuid';
import gameStorage from '../../../../lib/gameStorage.js';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const best_of = searchParams.get('best_of') || '5';
    
    if (!category) {
      return Response.json({ error: 'Category is required' }, { status: 400 });
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
      host: null, // Will be set when first player joins
      players: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameState: {
        phase: 'lobby',
        round: 1,
        scores: {},
        bids: {},
        submissions: {},
        currentBid: 0,
        highBid: 0,
        listCount: 0,
        timerEnd: null,
        results: {}
      }
    };

    // For now, just use local storage in the API
    // The client-side will handle Firestore operations with proper authentication
    console.log('Creating lobby in local storage (API side):', gameId);
    gameStorage.createLobby(lobby);

    return Response.json({
      success: true,
      game_id: gameId,
      lobby_code: lobbyCode,
      category,
      best_of: parseInt(best_of),
      status: 'waiting_for_players'
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    return Response.json({ error: 'Failed to create lobby' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}