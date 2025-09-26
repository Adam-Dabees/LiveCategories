// app/api/lobby/[lobbyCode]/route.js
import gameStorage from '../../../../lib/gameStorage.js';

export async function GET(request, { params }) {
  try {
    const { lobbyCode } = params;

    // First try to get lobby from local storage
    let lobby = gameStorage.getLobby(lobbyCode);
    
    if (!lobby) {
      // If not found in local storage, the lobby might exist in Firestore
      // For now, we'll return a generic response that allows the client to try joining
      // The actual lobby validation will happen when the user tries to join via Firestore
      console.log(`Lobby ${lobbyCode} not found in local storage, assuming it exists in Firestore`);
      return Response.json({
        exists: true,
        lobby_code: lobbyCode,
        status: 'active',
        category: 'unknown',
        note: 'Lobby details will be loaded from Firestore when joining'
      });
    }

    // Return the lobby data
    return Response.json({
      exists: true,
      lobby_code: lobby.lobbyCode || lobby.id,
      game_id: lobby.id,
      category: lobby.category,
      status: lobby.status,
      player_count: Object.keys(lobby.players || {}).length,
      phase: lobby.phase || 'lobby',
      round: lobby.round || 1,
      created_at: lobby.createdAt,
      last_activity: lobby.lastActivity
    });

  } catch (error) {
    console.error('Error getting lobby:', error);
    return Response.json({ error: 'Failed to get lobby' }, { status: 500 });
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