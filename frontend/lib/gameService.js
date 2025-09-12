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
      const updatedPlayers = { ...lobbyData.players };
      delete updatedPlayers[playerId];
      
      await updateDoc(lobbyRef, {
        players: updatedPlayers,
        lastActivity: Date.now()
      });
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