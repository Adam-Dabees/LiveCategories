// lib/gameService.js
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  addDoc,
  query,
  where,
  getDocs 
} from 'firebase/firestore';

// Fallback storage for when Firebase is not available
const localLobbies = new Map();

class GameService {
  constructor() {
    this.listeners = new Map();
    this.useFirestore = true; // Will be set to false if Firestore fails
  }

  // Create a new lobby
  async createLobby(lobbyData) {
    console.log('Creating lobby with data:', lobbyData);
    
    // Try Firestore first
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyData.id);
        await setDoc(lobbyRef, {
          ...lobbyData,
          createdAt: Date.now(),
          lastActivity: Date.now()
        });
        
        console.log('Lobby created successfully in Firestore:', lobbyData.id);
        return lobbyData;
      } catch (error) {
        console.error('Firestore error creating lobby:', error);
        
        // If it's a permission error, disable Firestore for this session
        if (error.code === 'permission-denied') {
          console.warn('Firestore permissions denied. Falling back to local storage.');
          this.useFirestore = false;
        }
        
        // Fall through to local storage
      }
    }
    
    // Fallback to local storage
    console.log('Using local storage for lobby:', lobbyData.id);
    const lobbyWithTimestamp = {
      ...lobbyData,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    localLobbies.set(lobbyData.id, lobbyWithTimestamp);
    
    // Trigger any listeners
    this.triggerLocalListeners(lobbyData.id, lobbyWithTimestamp);
    
    return lobbyData;
  }

  // Join an existing lobby
  async joinLobby(lobbyId, player) {
    console.log('Joining lobby:', lobbyId, 'as player:', player);
    
    // Validate player data
    if (!player || !player.id) {
      console.error('Invalid player data:', player);
      throw new Error('Invalid player data');
    }
    
    // Try Firestore first
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const updatedPlayers = {
            ...lobbyData.players,
            [player.id]: {
              id: player.id,
              name: player.name || 'Anonymous',
              email: player.email || '',
              ready: player.ready || false,
              connected: true,
              joinedAt: Date.now()
            }
          };
          
          await updateDoc(lobbyRef, {
            players: updatedPlayers,
            lastActivity: Date.now()
          });
          
          console.log('Successfully joined existing lobby via Firestore');
          return;
        } else {
          console.log('Lobby not found in Firestore, creating it...');
          // If lobby doesn't exist, create it with the current player
          // Get category from URL params or use default
          const urlParams = new URLSearchParams(window.location.search);
          const category = urlParams.get('category') || 'fruits';
          
          const sanitizedPlayer = {
            id: player.id,
            name: player.name || 'Anonymous',
            email: player.email || '',
            ready: player.ready || false,
            connected: true,
            joinedAt: Date.now()
          };
          
          const newLobby = {
            id: lobbyId,
            lobbyCode: lobbyId,
            category: category,
            bestOf: 5,
            status: 'waiting_for_players',
            players: {
              [player.id]: sanitizedPlayer
            },
            createdAt: Date.now(),
            lastActivity: Date.now(),
            phase: 'lobby',
            scores: {},
            round: 1,
            highBid: 0,
            listCount: 0
          };
          
          await setDoc(lobbyRef, newLobby);
          console.log('Created and joined new lobby in Firestore');
          return;
        }
      } catch (error) {
        console.error('Error joining lobby via Firestore:', error);
        
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
          console.warn('Firestore permissions denied. Falling back to local storage.');
          this.useFirestore = false;
        } else if (error.message.includes('undefined')) {
          console.error('Firestore data validation error. Falling back to local storage.');
          this.useFirestore = false;
        }
        
        // Fall through to local storage
      }
    }
    
    // Fallback to local storage
    console.log('Using local storage to join lobby:', lobbyId);
    let lobby = localLobbies.get(lobbyId);
    
    if (!lobby) {
      // Create lobby if it doesn't exist in local storage
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'fruits';
      
      lobby = {
        id: lobbyId,
        lobbyCode: lobbyId,
        category: category,
        bestOf: 5,
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
    }
    
    const sanitizedPlayer = {
      id: player.id,
      name: player.name || 'Anonymous',
      email: player.email || '',
      ready: player.ready || false,
      connected: true,
      joinedAt: Date.now()
    };
    
    const updatedPlayers = {
      ...lobby.players,
      [player.id]: sanitizedPlayer
    };
    
    const updatedLobby = {
      ...lobby,
      players: updatedPlayers,
      lastActivity: Date.now()
    };
    
    localLobbies.set(lobbyId, updatedLobby);
    this.triggerLocalListeners(lobbyId, updatedLobby);
    
    console.log('Successfully joined lobby via local storage');
  }

  // Leave a lobby
  async leaveLobby(lobbyId, playerId) {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const lobbyRef = doc(db, 'lobbies', lobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    
    if (lobbySnap.exists()) {
      const lobbyData = lobbySnap.data();
      const gameState = lobbyData.gameState;
      
      // Always save stats when someone leaves, regardless of game state
      // This ensures stats are saved even if the game state is inconsistent
      console.log(`🚪 Player ${playerId} leaving, saving stats for both players...`);
      console.log(`🎮 Game state:`, gameState);
      console.log(`👥 Players:`, lobbyData.players);
      
      try {
        await this.handlePlayerLeaveGame(lobbyId, playerId, lobbyData);
        console.log(`✅ Successfully processed stats for both players`);
      } catch (error) {
        console.error(`❌ Error processing stats when player left:`, error);
        
        // Fallback: try to save stats directly
        console.log(`🔄 Attempting fallback stats saving...`);
        try {
          await this.saveStatsDirectly(lobbyId, playerId, lobbyData);
        } catch (fallbackError) {
          console.error(`❌ Fallback stats saving also failed:`, fallbackError);
        }
      }
      
      const updatedPlayers = { ...lobbyData.players };
      delete updatedPlayers[playerId];
      
      await updateDoc(lobbyRef, {
        players: updatedPlayers,
        lastActivity: Date.now()
      });
      
      console.log(`✅ Player ${playerId} successfully left lobby ${lobbyId}`);
    }
  }

  // Handle when a player leaves during an active game
  // NOTE: This function only saves stats for the LEAVING player due to Firestore security rules
  // The remaining player will save their own stats when they detect the game ended
  async handlePlayerLeaveGame(lobbyId, leavingPlayerId, lobbyData) {
    try {
      console.log(`🎮 handlePlayerLeaveGame called for lobby ${lobbyId}, leaving player ${leavingPlayerId}`);
      
      const gameState = lobbyData.gameState;
      const players = lobbyData.players;
      const scores = gameState.scores || {};
      
      console.log(`🎮 Game state phase: ${gameState.phase}`);
      console.log(`👥 Players in lobby:`, Object.keys(players));
      
      // Always process stats when someone leaves, even if game is ended
      // This ensures we don't miss any stats updates
      console.log(`📊 Processing stats for player leave, regardless of game state`);
      
      // Check if we've already processed this game to avoid duplicates
      if (gameState.processedForLeave) {
        console.log(`⚠️ Game already processed for leave, skipping duplicate processing`);
        return;
      }
      
      // Determine winner based on scores, not just who left
      // If there are scores, use them to determine the actual winner
      let winnerId = null;
      let loserId = leavingPlayerId;
      
      if (scores && Object.keys(scores).length > 0) {
        // Use actual scores to determine winner
        winnerId = Object.keys(scores).reduce((a, b) => 
          (scores[a] || 0) > (scores[b] || 0) ? a : b
        );
        // The loser is whoever is not the winner
        loserId = Object.keys(scores).find(id => id !== winnerId) || leavingPlayerId;
        console.log(`🏆 Winner determined by scores: ${winnerId} (score: ${scores[winnerId]})`);
        console.log(`❌ Loser determined by scores: ${loserId} (score: ${scores[loserId]})`);
      } else {
        // Fallback: remaining player wins if no scores
        const remainingPlayers = Object.keys(players).filter(id => id !== leavingPlayerId);
        winnerId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
        console.log(`🏆 No scores available, remaining player wins: ${winnerId}`);
      }
      
      console.log(`👥 All players:`, Object.keys(players));
      console.log(`📊 Current scores:`, scores);
      
      // Import stats functions
      const { updateUserStats, saveGameResult, checkAchievements } = await import('./firestore');
      
      // ONLY save stats for the leaving player (due to Firestore security rules)
      // The remaining player will save their own stats when they detect the game ended
      const leavingPlayer = players[leavingPlayerId];
      if (leavingPlayer) {
        console.log(`👤 Processing leaving player ${leavingPlayerId}:`, leavingPlayer);
        
        // Determine if the leaving player won or lost based on scores
        const isLeavingPlayerWinner = winnerId === leavingPlayerId;
        
        const gameData = {
          won: isLeavingPlayerWinner, // True if leaving player won, false if they lost
          score: scores[leavingPlayerId] || 0,
          category: gameState.category || 'unknown',
          duration: Date.now() - (lobbyData.createdAt || Date.now()),
          lobbyCode: lobbyId,
          opponentId: isLeavingPlayerWinner ? loserId : winnerId,
          itemsSubmitted: (gameState.submittedItems || []).filter(item => item.playerId === leavingPlayerId).length,
          validItems: (gameState.submittedItems || []).filter(item => item.playerId === leavingPlayerId && item.isValid).length,
          leftGame: true // Mark that they left the game
        };
        
        console.log(`💾 Saving stats for LEAVING player ${leavingPlayerId} (won: ${isLeavingPlayerWinner}):`, gameData);
        
        try {
          const gameResult = await saveGameResult({
            userId: leavingPlayerId,
            ...gameData,
            timestamp: Date.now()
          });
          console.log(`💾 Game result saved for LEAVING player ${leavingPlayerId}:`, gameResult);
          
          const statsResult = await updateUserStats(leavingPlayerId, gameData);
          console.log(`📈 Stats update result for LEAVING player ${leavingPlayerId}:`, statsResult);
        } catch (error) {
          console.error(`❌ Error saving stats for LEAVING player ${leavingPlayerId}:`, error);
        }
      } else {
        console.error(`❌ Leaving player ${leavingPlayerId} not found in players:`, players);
      }
      
      // Mark the game as ended since someone left and mark as processed
      const lobbyRef = doc(db, 'lobbies', lobbyId);
      await updateDoc(lobbyRef, {
        'gameState.phase': 'ended',
        'gameState.endedAt': Date.now(),
        'gameState.processedForLeave': true,
        'gameState.winnerId': winnerId, // Store winner ID for remaining player
        'gameState.loserId': loserId,   // Store loser ID for remaining player
        lastActivity: Date.now()
      });
      
      console.log('🎮 Game marked as ended and processed due to player leaving');
      console.log(`📝 Winner ID stored for remaining player: ${winnerId}`);
      
    } catch (error) {
      console.error('Error handling player leave during game:', error);
    }
  }

  // Save stats for remaining player when game ends due to opponent leaving
  async saveRemainingPlayerStats(lobbyId, remainingPlayerId, lobbyData) {
    try {
      console.log(`🎮 Saving stats for remaining player ${remainingPlayerId} in lobby ${lobbyId}`);
      
      const gameState = lobbyData.gameState;
      const players = lobbyData.players;
      const scores = gameState.scores || {};
      
      // Get winner/loser info that was stored when the other player left
      const winnerId = gameState.winnerId;
      const loserId = gameState.loserId;
      
      if (!winnerId || !loserId) {
        console.warn('Winner/Loser IDs not found in game state, skipping stats save');
        return;
      }
      
      console.log(`🏆 Winner: ${winnerId}, Loser: ${loserId}, Remaining player: ${remainingPlayerId}`);
      
      // Determine if the remaining player won or lost
      const isRemainingPlayerWinner = winnerId === remainingPlayerId;
      
      // Import stats functions
      const { updateUserStats, saveGameResult } = await import('./firestore');
      
      const gameData = {
        won: isRemainingPlayerWinner, // True if remaining player won, false if they lost
        score: scores[remainingPlayerId] || 0,
        category: gameState.category || 'unknown',
        duration: Date.now() - (lobbyData.createdAt || Date.now()),
        lobbyCode: lobbyId,
        opponentId: isRemainingPlayerWinner ? loserId : winnerId,
        itemsSubmitted: (gameState.submittedItems || []).filter(item => item.playerId === remainingPlayerId).length,
        validItems: (gameState.submittedItems || []).filter(item => item.playerId === remainingPlayerId && item.isValid).length,
        opponentLeft: true // Mark that opponent left the game
      };
      
      console.log(`💾 Saving stats for REMAINING player ${remainingPlayerId} (won: ${isRemainingPlayerWinner}):`, gameData);
      
      // Save game result
      const gameResult = await saveGameResult({
        userId: remainingPlayerId,
        ...gameData,
        timestamp: Date.now()
      });
      console.log(`💾 Game result saved for REMAINING player ${remainingPlayerId}:`, gameResult);
      
      // Update user statistics
      const statsResult = await updateUserStats(remainingPlayerId, gameData);
      console.log(`📈 Stats update result for REMAINING player ${remainingPlayerId}:`, statsResult);
      
      console.log(`✅ Successfully saved stats for remaining player ${remainingPlayerId}`);
      
    } catch (error) {
      console.error('Error saving stats for remaining player:', error);
    }
  }

  // Fallback method to save stats directly
  async saveStatsDirectly(lobbyId, leavingPlayerId, lobbyData) {
    try {
      console.log(`🔄 Fallback: Saving stats directly for lobby ${lobbyId}`);
      
      const gameState = lobbyData.gameState;
      const players = lobbyData.players;
      const scores = gameState.scores || {};
      
      // Determine winner
      const remainingPlayers = Object.keys(players).filter(id => id !== leavingPlayerId);
      const winnerId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
      
      console.log(`🔄 Fallback: Winner determined as ${winnerId}`);
      
      // Import stats functions
      const { updateUserStats, saveGameResult } = await import('./firestore');
      
      // Save stats for leaving player (loses)
      if (players[leavingPlayerId]) {
        const gameData = {
          won: false,
          score: scores[leavingPlayerId] || 0,
          category: gameState.category || 'unknown',
          duration: Date.now() - (lobbyData.createdAt || Date.now()),
          lobbyCode: lobbyId,
          opponentId: winnerId,
          leftGame: true
        };
        
        console.log(`🔄 Fallback: Saving stats for leaving player ${leavingPlayerId}`);
        await saveGameResult({ userId: leavingPlayerId, ...gameData, timestamp: Date.now() });
        await updateUserStats(leavingPlayerId, gameData);
      }
      
      // Save stats for remaining player (wins)
      if (winnerId && players[winnerId]) {
        const gameData = {
          won: true,
          score: scores[winnerId] || 0,
          category: gameState.category || 'unknown',
          duration: Date.now() - (lobbyData.createdAt || Date.now()),
          lobbyCode: lobbyId,
          opponentId: leavingPlayerId,
          opponentLeft: true
        };
        
        console.log(`🔄 Fallback: Saving stats for winning player ${winnerId}`);
        await saveGameResult({ userId: winnerId, ...gameData, timestamp: Date.now() });
        await updateUserStats(winnerId, gameData);
      }
      
      console.log(`✅ Fallback stats saving completed`);
    } catch (error) {
      console.error('Error in fallback stats saving:', error);
    }
  }

  // Update player connection status
  async updatePlayerConnection(lobbyId, playerId, connected) {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const lobbyRef = doc(db, 'lobbies', lobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    
    if (lobbySnap.exists()) {
      const lobbyData = lobbySnap.data();
      const gameState = lobbyData.gameState;
      
      // If player disconnected during an active game, save stats
      if (!connected && gameState && gameState.phase && gameState.phase !== 'lobby' && gameState.phase !== 'ended') {
        console.log(`🔌 Player ${playerId} disconnected during active game, saving stats...`);
        await this.handlePlayerLeaveGame(lobbyId, playerId, lobbyData);
      }
      
      const updatedPlayers = {
        ...lobbyData.players,
        [playerId]: {
          ...lobbyData.players[playerId],
          connected
        }
      };
      
      await updateDoc(lobbyRef, {
        players: updatedPlayers,
        lastActivity: Date.now()
      });
    }
  }

  // Update game state
  async updateGameState(lobbyId, gameState) {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const lobbyRef = doc(db, 'lobbies', lobbyId);
    await updateDoc(lobbyRef, {
      gameState: {
        ...gameState,
        lastUpdate: Date.now()
      },
      lastActivity: Date.now()
    });
  }

  // Listen to lobby changes
  listenToLobby(lobbyId, callback) {
    // Try Firestore first
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        
        const unsubscribe = onSnapshot(lobbyRef, (doc) => {
          if (doc.exists()) {
            callback(doc.data());
          }
        }, (error) => {
          console.error('Firestore listener error:', error);
          if (error.code === 'permission-denied') {
            console.warn('Firestore permissions denied. Falling back to local storage.');
            this.useFirestore = false;
            this.setupLocalListener(lobbyId, callback);
          }
        });

        // Store the unsubscribe function
        this.listeners.set(lobbyId, unsubscribe);

        // Return cleanup function
        return () => {
          const listener = this.listeners.get(lobbyId);
          if (listener) {
            listener();
            this.listeners.delete(lobbyId);
          }
        };
      } catch (error) {
        console.error('Error setting up Firestore listener:', error);
        // Fall through to local storage
      }
    }
    
    // Fallback to local storage polling
    return this.setupLocalListener(lobbyId, callback);
  }

  setupLocalListener(lobbyId, callback) {
    console.log('Setting up local storage listener for:', lobbyId);
    
    // Check if lobby exists in local storage
    const lobby = localLobbies.get(lobbyId);
    if (lobby) {
      // Immediately call callback with current data
      console.log('Found lobby in local storage, calling callback');
      callback(lobby);
    } else {
      // Create empty lobby structure if it doesn't exist
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category') || 'fruits';
      
      const emptyLobby = {
        id: lobbyId,
        lobbyCode: lobbyId,
        category: category,
        bestOf: 5,
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
      
      localLobbies.set(lobbyId, emptyLobby);
      console.log('Created empty lobby in local storage, calling callback');
      callback(emptyLobby);
    }
    
    // Store callback for future updates
    const listenerKey = `${lobbyId}_${Date.now()}`;
    this.listeners.set(listenerKey, callback);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listenerKey);
    };
  }

  triggerLocalListeners(lobbyId, data) {
    // Trigger all listeners for this lobby
    this.listeners.forEach((callback, key) => {
      if (typeof key === 'string' && key.startsWith(lobbyId)) {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in local listener callback:', error);
        }
      }
    });
  }

  // Stop listening to a lobby
  stopListening(lobbyId) {
    const listener = this.listeners.get(lobbyId);
    if (listener) {
      listener();
      this.listeners.delete(lobbyId);
    }
  }

  // Send a game action (like placing a bid, submitting an item, etc.)
  async sendGameAction(lobbyId, action) {
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }

    const actionsRef = collection(db, 'lobbies', lobbyId, 'actions');
    
    await addDoc(actionsRef, {
      ...action,
      timestamp: Date.now()
    });
  }

  // Listen to game actions
  listenToGameActions(lobbyId, callback) {
    if (!db) {
      console.warn('Firebase Firestore not available, using offline mode');
      return () => {}; // Return empty cleanup function
    }

    const actionsRef = collection(db, 'lobbies', lobbyId, 'actions');
    
    const unsubscribe = onSnapshot(actionsRef, (snapshot) => {
      const actions = [];
      snapshot.forEach((doc) => {
        actions.push({ id: doc.id, ...doc.data() });
      });
      // Sort by timestamp
      actions.sort((a, b) => a.timestamp - b.timestamp);
      callback(actions);
    });

    return unsubscribe;
  }

  // Get available lobbies for a category
  async getAvailableLobbies(category) {
    if (!db) {
      return [];
    }

    try {
      const lobbiesRef = collection(db, 'lobbies');
      const q = query(
        lobbiesRef, 
        where('category', '==', category),
        where('status', '==', 'waiting_for_players')
      );
      
      const querySnapshot = await getDocs(q);
      const lobbies = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (Object.keys(data.players || {}).length < 2) {
          lobbies.push({ id: doc.id, ...data });
        }
      });
      
      return lobbies;
    } catch (error) {
      console.error('Error getting available lobbies:', error);
      return [];
    }
  }

  // Start the game by transitioning to bidding phase
  async startGame(lobbyId) {
    console.log('Starting game for lobby:', lobbyId);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          
          // Check if we have at least 2 players
          const playerCount = Object.keys(lobbyData.players || {}).length;
          if (playerCount < 2) {
            throw new Error('Need at least 2 players to start the game');
          }
          
          // Initialize game state
          const gameState = {
            phase: 'bidding',
            round: 1,
            currentBid: 0,
            highBidderId: null,
            scores: {},
            phaseEndsAt: Date.now() + (30 * 1000), // 30 seconds for bidding
            category: lobbyData.category
          };
          
          // Initialize scores for all players
          Object.keys(lobbyData.players).forEach(playerId => {
            gameState.scores[playerId] = 0;
          });
          
          await updateDoc(lobbyRef, {
            status: 'in_progress',
            gameState: gameState,
            lastActivity: Date.now()
          });
          
          console.log('Game started successfully');
          return gameState;
        } else {
          throw new Error('Lobby not found');
        }
      } catch (error) {
        console.error('Error starting game via Firestore:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby) {
        const playerCount = Object.keys(lobby.players || {}).length;
        if (playerCount < 2) {
          throw new Error('Need at least 2 players to start the game');
        }
        
        const gameState = {
          phase: 'bidding',
          round: 1,
          currentBid: 0,
          highBidderId: null,
          scores: {},
          phaseEndsAt: Date.now() + (30 * 1000),
          category: lobby.category
        };
        
        Object.keys(lobby.players).forEach(playerId => {
          gameState.scores[playerId] = 0;
        });
        
        lobby.status = 'in_progress';
        lobby.gameState = gameState;
        lobby.lastActivity = Date.now();
        
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        return gameState;
      } else {
        throw new Error('Lobby not found');
      }
    }
  }

  // Handle placing a bid
  async placeBid(lobbyId, playerId, bidAmount) {
    console.log(`Player ${playerId} placing bid of ${bidAmount} in lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          if (gameState.phase !== 'bidding') {
            throw new Error('Not in bidding phase');
          }
          
          if (bidAmount <= gameState.currentBid) {
            throw new Error('Bid must be higher than current bid');
          }
          
          // Update game state - don't reset timer, just update bid
          const updatedGameState = {
            ...gameState,
            currentBid: bidAmount,
            highBidderId: playerId
            // Keep existing phaseEndsAt - don't reset timer
          };
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          console.log('Bid placed successfully');
        }
      } catch (error) {
        console.error('Error placing bid:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        if (lobby.gameState.phase !== 'bidding') {
          throw new Error('Not in bidding phase');
        }
        
        if (bidAmount <= lobby.gameState.currentBid) {
          throw new Error('Bid must be higher than current bid');
        }
        
        lobby.gameState.currentBid = bidAmount;
        lobby.gameState.highBidderId = playerId;
        // Keep existing phaseEndsAt - don't reset timer
        lobby.lastActivity = Date.now();
        
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
      }
    }
  }

  // Handle a player passing (or transition to listing phase if bidding ends)
  async transitionToListing(lobbyId) {
    console.log(`Transitioning lobby ${lobbyId} to listing phase`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          // If no bids were placed, set a default bidder (first player) and minimum bid
          let highBidderId = gameState.highBidderId;
          let currentBid = gameState.currentBid;
          
          if (!highBidderId || currentBid === 0) {
            const players = Object.keys(lobbyData.players || {});
            if (players.length > 0) {
              highBidderId = players[0]; // Use first player as default
              currentBid = 1; // Set minimum bid
              console.log(`No bids placed, setting default bidder: ${highBidderId} with bid: ${currentBid}`);
            } else {
              throw new Error('No players found in lobby');
            }
          }
          
          // Transition to listing phase
          const updatedGameState = {
            ...gameState,
            phase: 'listing',
            listerId: highBidderId,
            highBidderId: highBidderId,
            currentBid: currentBid,
            targetCount: currentBid,
            submittedItems: [],
            phaseEndsAt: Date.now() + (30 * 1000) // 30 seconds for listing
          };
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          console.log('Transitioned to listing phase');
        }
      } catch (error) {
        console.error('Error transitioning to listing:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        let highBidderId = lobby.gameState.highBidderId;
        let currentBid = lobby.gameState.currentBid;
        
        // If no bids were placed, set a default bidder (first player) and minimum bid
        if (!highBidderId || currentBid === 0) {
          const players = Object.keys(lobby.players || {});
          if (players.length > 0) {
            highBidderId = players[0]; // Use first player as default
            currentBid = 1; // Set minimum bid
            console.log(`No bids placed, setting default bidder: ${highBidderId} with bid: ${currentBid}`);
          } else {
            throw new Error('No players found in lobby');
          }
        }
        
        lobby.gameState.phase = 'listing';
        lobby.gameState.listerId = highBidderId;
        lobby.gameState.highBidderId = highBidderId;
        lobby.gameState.currentBid = currentBid;
        lobby.gameState.targetCount = currentBid;
        lobby.gameState.submittedItems = [];
        lobby.gameState.phaseEndsAt = Date.now() + (30 * 1000);
        lobby.lastActivity = Date.now();
        
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
      }
    }
  }

  // Validate if an item belongs to the category
  async validateCategoryItem(category, item) {
    try {
      const categoryLower = category.toLowerCase();
      
      // Use direct API validation for categories that support search
      switch (categoryLower) {
        case 'movies':
        case 'movie':
          const { validateMovie } = await import('../lib/categoryFetchers');
          return await validateMovie(item);
          
        case 'countries':
        case 'country':
          const { validateCountry } = await import('../lib/categoryFetchers');
          return await validateCountry(item);
          
        case 'pokemon':
          const { validatePokemon } = await import('../lib/categoryFetchers');
          return await validatePokemon(item);
          
        case 'food':
        case 'foods':
          const { validateFood } = await import('../lib/categoryFetchers');
          return await validateFood(item);
          
        case 'fruits':
        case 'fruit':
          const { validateFood: validateFruit } = await import('../lib/categoryFetchers');
          return await validateFruit(item);
          
        case 'animals':
        case 'animal':
          const { validateAnimal } = await import('../lib/categoryFetchers');
          return await validateAnimal(item);
          
        case 'books':
        case 'book':
          const { validateBook } = await import('../lib/categoryFetchers');
          return await validateBook(item);
          
        case 'music':
          const { validateMusic } = await import('../lib/categoryFetchers');
          return await validateMusic(item);
          
        case 'sports':
        case 'sport':
          const { validateSports } = await import('../lib/categoryFetchers');
          return await validateSports(item);
          
        default:
          // Fallback to existing logic for unknown categories
          console.log(`Using fallback validation for category: ${category}`);
          return await this.fallbackValidation(category, item);
      }
    } catch (error) {
      console.error('Error validating category item:', error);
      return false;
    }
  }

  // Fallback validation method (original logic)
  async fallbackValidation(category, item) {
    try {
      const response = await fetch(`/api/categories/${category}`);
      if (!response.ok) {
        throw new Error('Category not found');
      }
      
      const categoryItems = await response.json();
      if (!Array.isArray(categoryItems)) {
        console.error('Invalid category data format:', categoryItems);
        return false;
      }
      
      const normalizedItem = item.toLowerCase().trim();
      
      // More flexible matching for API data
      return categoryItems.some(catItem => {
        const normalizedCatItem = catItem.toLowerCase().trim();
        
        // Exact match
        if (normalizedCatItem === normalizedItem) {
          return true;
        }
        
        // Partial match for longer names (e.g., "Harry Potter" matches "Harry Potter and the Philosopher's Stone")
        if (normalizedCatItem.includes(normalizedItem) || normalizedItem.includes(normalizedCatItem)) {
          return true;
        }
        
        // Remove common prefixes/suffixes for movies/books
        const cleanCatItem = normalizedCatItem
          .replace(/^the\s+/i, '')
          .replace(/\s+the$/i, '')
          .replace(/\s*\([^)]*\)$/, ''); // Remove year/description in parentheses
          
        const cleanItem = normalizedItem
          .replace(/^the\s+/i, '')
          .replace(/\s+the$/i, '')
          .replace(/\s*\([^)]*\)$/, '');
        
        if (cleanCatItem === cleanItem) {
          return true;
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error in fallback validation:', error);
      return false;
    }
  }

  // Submit an item during listing phase
  async submitItem(lobbyId, playerId, item) {
    console.log(`Player ${playerId} submitting item "${item}" in lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          if (gameState.phase !== 'listing') {
            throw new Error('Not in listing phase');
          }
          
          if (gameState.listerId !== playerId) {
            throw new Error('Only the high bidder can submit items');
          }
          
          // Check for duplicate submissions (case-insensitive)
          const existingItems = gameState.submittedItems || [];
          const isDuplicate = existingItems.some(existingItem => 
            existingItem.text.toLowerCase() === item.toLowerCase()
          );
          
          if (isDuplicate) {
            throw new Error(`"${item}" already submitted!`);
          }
          
          // Validate the item against the category
          const isValid = await this.validateCategoryItem(gameState.category, item);
          
          const submittedItem = {
            text: item,
            isValid: isValid,
            timestamp: Date.now()
          };
          
          const updatedItems = [...existingItems, submittedItem];
          
          const updatedGameState = {
            ...gameState,
            submittedItems: updatedItems,
            listCount: updatedItems.length
          };
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          // Check if target is reached and auto-complete listing phase
          const validItemsCount = updatedItems.filter(item => item.isValid).length;
          const targetCount = gameState.targetCount || gameState.currentBid;
          
          if (validItemsCount >= targetCount) {
            console.log(`Target reached (${validItemsCount}/${targetCount}), completing listing phase...`);
            // Delay slightly to let the UI update, then complete the phase
            setTimeout(async () => {
              try {
                await this.completeListingPhase(lobbyId);
              } catch (error) {
                console.error('Error auto-completing listing phase:', error);
              }
            }, 1000);
          }
          
          console.log(`Item submitted: ${item} (valid: ${isValid})`);
          return { isValid, item: submittedItem };
        }
      } catch (error) {
        console.error('Error submitting item:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        if (lobby.gameState.phase !== 'listing') {
          throw new Error('Not in listing phase');
        }
        
        if (lobby.gameState.listerId !== playerId) {
          throw new Error('Only the high bidder can submit items');
        }
        
        // Check for duplicate submissions (case-insensitive)
        const existingItems = lobby.gameState.submittedItems || [];
        const isDuplicate = existingItems.some(existingItem => 
          existingItem.text.toLowerCase() === item.toLowerCase()
        );
        
        if (isDuplicate) {
          throw new Error(`"${item}" already submitted!`);
        }
        
        const isValid = await this.validateCategoryItem(lobby.gameState.category, item);
        
        const submittedItem = {
          text: item,
          isValid: isValid,
          timestamp: Date.now()
        };
        
        lobby.gameState.submittedItems = existingItems;
        lobby.gameState.submittedItems.push(submittedItem);
        lobby.gameState.listCount = lobby.gameState.submittedItems.length;
        lobby.lastActivity = Date.now();
        
        // Check if target is reached and auto-complete listing phase
        const validItemsCount = lobby.gameState.submittedItems.filter(item => item.isValid).length;
        const targetCount = lobby.gameState.targetCount || lobby.gameState.currentBid;
        
        if (validItemsCount >= targetCount) {
          console.log(`Target reached (${validItemsCount}/${targetCount}), completing listing phase...`);
          // Delay slightly to let the UI update, then complete the phase
          setTimeout(async () => {
            try {
              await this.completeListingPhase(lobbyId);
            } catch (error) {
              console.error('Error auto-completing listing phase:', error);
            }
          }, 1000);
        }
        
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        return { isValid, item: submittedItem };
      }
    }
  }

  // Complete the listing phase and calculate scores
  async completeListingPhase(lobbyId) {
    console.log(`Completing listing phase for lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          if (gameState.phase !== 'listing') {
            throw new Error('Not in listing phase');
          }
          
          // Calculate score - winner takes all (1 point per round)
          const validItems = (gameState.submittedItems || []).filter(item => item.isValid);
          const targetCount = gameState.targetCount || gameState.currentBid;
          const actualCount = validItems.length;
          
          const updatedScores = { ...gameState.scores };
          const listerId = gameState.listerId;
          const playerIds = Object.keys(gameState.scores || {});
          const opponentId = playerIds.find(id => id !== listerId);
          
          let roundWinner = null;
          if (actualCount >= targetCount) {
            // Lister succeeded - gets 1 point
            updatedScores[listerId] = (updatedScores[listerId] || 0) + 1;
            roundWinner = listerId;
          } else if (opponentId) {
            // Lister failed - opponent gets 1 point
            updatedScores[opponentId] = (updatedScores[opponentId] || 0) + 1;
            roundWinner = opponentId;
          }
          
          // Single round game - always end after one round
          const isGameComplete = true;
          
          let updatedGameState;
          if (isGameComplete) {
            // Game is complete - update user statistics
            await this.endGame(lobbyId);
            
            updatedGameState = {
              ...gameState,
              phase: 'ended',
              scores: updatedScores,
              finalScores: updatedScores,
              winner: Object.keys(updatedScores).reduce((a, b) => updatedScores[a] > updatedScores[b] ? a : b),
                phaseEndsAt: Date.now() + (60 * 1000), // Show results for 60 seconds, then redirect to categories
              lastRoundResult: {
                listerId,
                targetCount,
                actualCount,
                validItems: validItems.map(item => item.text),
                roundWinner,
                success: actualCount >= targetCount
              }
            };
            
            // Schedule redirect to categories page after showing results
            setTimeout(async () => {
              try {
                await this.redirectToCategories(lobbyId);
              } catch (error) {
                console.error('Error redirecting to categories:', error);
              }
             }, 60000); // 60 seconds before redirecting to categories
          } else {
            // Continue to next round
            updatedGameState = {
              phase: 'summary',
              round: gameState.round + 1,
              scores: updatedScores,
              currentBid: 0,
              highBidderId: null,
              listerId: null,
              submittedItems: [],
              phaseEndsAt: Date.now() + (10 * 1000), // 10 seconds to show results
              lastRoundResult: {
                listerId,
                targetCount,
                actualCount,
                validItems: validItems.map(item => item.text),
                roundWinner,
                success: actualCount >= targetCount
              },
              category: gameState.category
            };
          }
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          console.log('Listing phase completed, scores updated');
          return updatedGameState;
        }
      } catch (error) {
        console.error('Error completing listing phase:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        const gameState = lobby.gameState;
        
        if (gameState.phase !== 'listing') {
          throw new Error('Not in listing phase');
        }
        
        const validItems = (gameState.submittedItems || []).filter(item => item.isValid);
        const targetCount = gameState.targetCount || gameState.currentBid;
        const actualCount = validItems.length;
        
        const updatedScores = { ...gameState.scores };
        const listerId = gameState.listerId;
        const playerIds = Object.keys(gameState.scores || {});
        const opponentId = playerIds.find(id => id !== listerId);
        
        let roundWinner = null;
        if (actualCount >= targetCount) {
          // Lister succeeded - gets 1 point
          updatedScores[listerId] = (updatedScores[listerId] || 0) + 1;
          roundWinner = listerId;
        } else if (opponentId) {
          // Lister failed - opponent gets 1 point
          updatedScores[opponentId] = (updatedScores[opponentId] || 0) + 1;
          roundWinner = opponentId;
        }
        
        // Single round game - always end after one round
        const isGameComplete = true;
        
        if (isGameComplete) {
          lobby.gameState = {
            ...gameState,
            phase: 'ended',
            scores: updatedScores,
            finalScores: updatedScores,
            winner: Object.keys(updatedScores).reduce((a, b) => updatedScores[a] > updatedScores[b] ? a : b),
            lastRoundResult: {
              listerId,
              targetCount,
              actualCount,
              validItems: validItems.map(item => item.text),
              roundWinner,
              success: actualCount >= targetCount
            }
          };
        } else {
          lobby.gameState = {
            phase: 'summary',
            round: gameState.round + 1,
            scores: updatedScores,
            currentBid: 0,
            highBidderId: null,
            listerId: null,
            submittedItems: [],
            phaseEndsAt: Date.now() + (10 * 1000),
            lastRoundResult: {
              listerId,
              targetCount,
              actualCount,
              validItems: validItems.map(item => item.text),
              roundWinner,
              success: actualCount >= targetCount
            },
            category: gameState.category
          };
        }
        
        lobby.lastActivity = Date.now();
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        return lobby.gameState;
      }
    }
  }

  // Transition from summary phase to next bidding round
  async transitionFromSummary(lobbyId) {
    console.log(`Transitioning from summary to bidding for lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          // Transition to bidding phase for next round
          const updatedGameState = {
            ...gameState,
            phase: 'bidding',
            currentBid: 0,
            highBidderId: null,
            listerId: null,
            submittedItems: [],
            phaseEndsAt: Date.now() + (30 * 1000), // 30 seconds for bidding
            lastRoundResult: null // Clear previous round result
          };
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          console.log('Transitioned from summary to bidding phase');
          return updatedGameState;
        }
      } catch (error) {
        console.error('Error transitioning from summary:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        lobby.gameState = {
          ...lobby.gameState,
          phase: 'bidding',
          currentBid: 0,
          highBidderId: null,
          listerId: null,
          submittedItems: [],
          phaseEndsAt: Date.now() + (30 * 1000),
          lastRoundResult: null
        };
        
        lobby.lastActivity = Date.now();
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        console.log('Transitioned from summary to bidding phase (local storage)');
        return lobby.gameState;
      }
    }
  }

  // Start next round (from summary to bidding)
  async startNextRound(lobbyId) {
    console.log(`Starting next round for lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          
          const updatedGameState = {
            ...gameState,
            phase: 'bidding',
            currentBid: 0,
            highBidderId: null,
            listerId: null,
            submittedItems: [],
            phaseEndsAt: Date.now() + (30 * 1000), // 30 seconds for next bidding round
            lastRoundResult: null
          };
          
          await updateDoc(lobbyRef, {
            gameState: updatedGameState,
            lastActivity: Date.now()
          });
          
          return updatedGameState;
        }
      } catch (error) {
        console.error('Error starting next round:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby && lobby.gameState) {
        lobby.gameState = {
          ...lobby.gameState,
          phase: 'bidding',
          currentBid: 0,
          highBidderId: null,
          listerId: null,
          submittedItems: [],
          phaseEndsAt: Date.now() + (30 * 1000),
          lastRoundResult: null
        };
        
        lobby.lastActivity = Date.now();
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        return lobby.gameState;
      }
    }
  }

  // Redirect to categories page after game completion
  async redirectToCategories(lobbyId) {
    console.log(`Redirecting to categories page after game completion for lobby ${lobbyId}`);
    
    // Update lobby status to completed
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        await updateDoc(lobbyRef, {
          status: 'completed',
          lastActivity: Date.now()
        });
        console.log('Lobby marked as completed');
      } catch (error) {
        console.error('Error marking lobby as completed:', error);
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby) {
        lobby.status = 'completed';
        lobby.lastActivity = Date.now();
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
      }
    }
    
    // Redirect to categories page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  // Reset game to lobby waiting state after completion
  async resetToLobby(lobbyId) {
    console.log(`Resetting lobby ${lobbyId} to waiting state`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          
          // Reset game state while keeping players
          const resetGameState = {
            phase: 'waiting_for_players',
            round: 1,
            scores: {},
            currentBid: 0,
            highBidderId: null,
            listerId: null,
            submittedItems: [],
            phaseEndsAt: null,
            lastRoundResult: null,
            winner: null,
            finalScores: null,
            category: lobbyData.category // Keep the same category
          };
          
          // Reset player ready states
          const resetPlayers = {};
          for (const [playerId, player] of Object.entries(lobbyData.players || {})) {
            resetPlayers[playerId] = {
              ...player,
              ready: false
            };
          }
          
          await updateDoc(lobbyRef, {
            gameState: resetGameState,
            players: resetPlayers,
            status: 'waiting_for_players',
            lastActivity: Date.now()
          });
          
          console.log('Lobby reset to waiting state');
          return resetGameState;
        }
      } catch (error) {
        console.error('Error resetting lobby:', error);
        throw error;
      }
    } else {
      // Local storage fallback
      let lobby = localLobbies.get(lobbyId);
      if (lobby) {
        lobby.gameState = {
          phase: 'waiting_for_players',
          round: 1,
          scores: {},
          currentBid: 0,
          highBidderId: null,
          listerId: null,
          submittedItems: [],
          phaseEndsAt: null,
          lastRoundResult: null,
          winner: null,
          finalScores: null,
          category: lobby.category
        };
        
        // Reset player ready states
        for (const [playerId, player] of Object.entries(lobby.players || {})) {
          lobby.players[playerId].ready = false;
        }
        
        lobby.status = 'waiting_for_players';
        lobby.lastActivity = Date.now();
        localLobbies.set(lobbyId, lobby);
        this.triggerLocalListeners(lobbyId, lobby);
        
        console.log('Lobby reset to waiting state (local storage)');
        return lobby.gameState;
      }
    }
  }

  // End the game and update user statistics
  async endGame(lobbyId) {
    console.log(`🎮 Ending game for lobby ${lobbyId}`);
    
    if (db && this.useFirestore) {
      try {
        const lobbyRef = doc(db, 'lobbies', lobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        
        if (lobbySnap.exists()) {
          const lobbyData = lobbySnap.data();
          const gameState = lobbyData.gameState;
          const players = lobbyData.players;
          
          // Check if game was already processed for a player leaving
          if (gameState.processedForLeave) {
            console.log('⚠️ Game already processed for player leave, skipping endGame');
            return gameState;
          }
          
          console.log('📊 Game data:', { gameState, players });
          
          // Determine winner
          const scores = gameState.scores || {};
          const winnerId = Object.keys(scores).reduce((a, b) => 
            (scores[a] || 0) > (scores[b] || 0) ? a : b
          );
          
          console.log('🏆 Winner determined:', { scores, winnerId });
          
          // Import stats functions
          const { updateUserStats, saveGameResult, checkAchievements } = await import('./firestore');
          
          // Update each player's statistics using the comprehensive stats system
          for (const [playerId, player] of Object.entries(players)) {
            if (playerId && player) {
              try {
                const isWin = playerId === winnerId;
                const playerScore = scores[playerId] || 0;
                const category = gameState.category || 'unknown';
                
                console.log(`👤 Processing stats for player ${playerId}:`, { isWin, playerScore, category });
                
                // Prepare game data for stats update
                const gameData = {
                  won: isWin,
                  score: playerScore,
                  category: category,
                  duration: Date.now() - (lobbyData.createdAt || Date.now()),
                  lobbyCode: lobbyId,
                  opponentId: Object.keys(players).find(id => id !== playerId),
                  itemsSubmitted: (gameState.submittedItems || []).filter(item => item.playerId === playerId).length,
                  validItems: (gameState.submittedItems || []).filter(item => item.playerId === playerId && item.isValid).length
                };
                
                console.log(`💾 Game data for ${playerId}:`, gameData);
                
                // Save game result
                const gameResult = await saveGameResult({
                  userId: playerId,
                  ...gameData,
                  timestamp: Date.now()
                });
                
                console.log(`💾 Game result saved for ${playerId}:`, gameResult);
                
                // Update user statistics
                const statsResult = await updateUserStats(playerId, gameData);
                
                console.log(`📈 Stats update result for ${playerId}:`, statsResult);
                
                if (statsResult.success) {
                  // Check for new achievements
                  const newAchievements = await checkAchievements(playerId, statsResult.data);
                  
                  // Log new achievements
                  if (newAchievements.length > 0) {
                    console.log(`🎉 New achievements for ${player.name}:`, newAchievements);
                  }
                } else {
                  console.error(`❌ Failed to update stats for ${playerId}:`, statsResult.error);
                }
                
                console.log(`✅ Updated comprehensive stats for player ${playerId}`);
              } catch (error) {
                console.error(`❌ Error updating stats for player ${playerId}:`, error);
              }
            }
          }
          
          console.log('🎉 Game ended and comprehensive player statistics updated');
          return gameState;
        } else {
          console.error('❌ Lobby not found:', lobbyId);
        }
      } catch (error) {
        console.error('❌ Error ending game:', error);
        throw error;
      }
    } else {
      // Local storage doesn't persist user stats
      console.log('⚠️ Game ended (local storage mode - no stats saved)');
    }
  }

  // Cleanup all listeners
  cleanup() {
    this.listeners.forEach((listener) => {
      listener();
    });
    this.listeners.clear();
  }
}

// Create singleton instance
const gameService = new GameService();
export default gameService;