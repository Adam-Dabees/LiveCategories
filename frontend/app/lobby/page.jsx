'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import gameService from '../../lib/gameService';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  Trophy, 
  Send, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

const Phase = {
  LOBBY: 'lobby',
  BIDDING: 'bidding',
  LISTING: 'listing',
  SUMMARY: 'summary',
  ENDED: 'ended'
};

function LobbyPageContent() {
  const [gameState, setGameState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentBid, setCurrentBid] = useState(1);
  const [bidInput, setBidInput] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [lastItem, setLastItem] = useState('');
  const [messages, setMessages] = useState([]);
  const [lobbyData, setLobbyData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef(null);
  const cleanupRef = useRef(null);

  const category = searchParams.get('category');
  const action = searchParams.get('action');
  const code = searchParams.get('code');
  const gameId = searchParams.get('gameId');
  const lobbyCode = searchParams.get('lobbyCode');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Initialize lobby connection
    initializeLobby();
    
    // Handle window close/refresh - mark player as disconnected
    const handleBeforeUnload = async () => {
      const currentLobbyCode = lobbyCode || code;
      if (currentLobbyCode && user) {
        try {
          await gameService.updatePlayerConnection(currentLobbyCode, user.id, false);
        } catch (error) {
          console.error('Error updating connection status:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Cleanup listeners when component unmounts
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Mark player as disconnected when leaving
      const currentLobbyCode = lobbyCode || code;
      if (currentLobbyCode && user) {
        gameService.updatePlayerConnection(currentLobbyCode, user.id, false).catch(console.error);
      }
    };
  }, [user, lobbyCode, code]); // Dependencies for lobby initialization

  useEffect(() => {
    if (lobbyData?.gameState?.phaseEndsAt) {
      startTimer();
    }
  }, [lobbyData?.gameState?.phaseEndsAt]);

  const initializeLobby = async () => {
    try {
      setLoading(true);
      console.log('Initializing lobby...');
      
      // Use either lobbyCode or code parameter
      const currentLobbyCode = lobbyCode || code;
      
      if (!currentLobbyCode) {
        console.error('No lobby code provided');
        router.push('/');
        return;
      }

      console.log('Setting up listener for lobby:', currentLobbyCode);

      // Set up real-time listener for lobby changes
      const cleanup = gameService.listenToLobby(currentLobbyCode, (data) => {
        console.log('Lobby data updated:', data);
        setLobbyData(data);
        setConnected(true);
        setLoading(false);
        
        // Update game state if it exists
        if (data.gameState) {
          setGameState(data.gameState);
        }
      });
      
      cleanupRef.current = cleanup;

      console.log('Joining lobby as player...');

      // Join the lobby as a player
      const player = {
        id: user.id, // Fixed: use user.id instead of user.uid
        name: user.displayName || user.username || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        ready: false,
        connected: true
      };

      // Small delay to ensure lobby creation has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await gameService.joinLobby(currentLobbyCode, player);
      console.log('Successfully joined lobby');
      
    } catch (error) {
      console.error('Error initializing lobby:', error);
      setLoading(false);
      // Still allow offline mode
      setConnected(false);
    }
  };

  const handleGameMessage = (data) => {
    switch (data.type) {
      case 'joined':
        setGameState(data.game);
        addMessage(`Welcome to the game, ${user.display_name}!`);
        break;
      case 'state_update':
        setGameState(data.game);
        break;
      case 'bid_update':
        setCurrentBid(data.highBid);
        setGameState(data.game);
        const bidderName = data.game?.players?.[data.highBidderId]?.name || 'Unknown';
        addMessage(`New high bid: ${data.highBid} by ${bidderName}`);
        break;
      case 'listing_update':
        setGameState(data.game);
        setLastItem(data.lastItem);
        addMessage(`Item submitted: ${data.lastItem} (${data.count}/${gameState?.highBid})`);
        break;
      case 'round_result':
        setGameState(data.game);
        const winnerName = data.game?.players?.[data.winnerId]?.name || 'Unknown';
        addMessage(`Round complete! Winner: ${winnerName}, Hit: ${data.listerHit}`);
        break;
      case 'item_rejected':
        addMessage(`Item rejected: ${data.text} (${data.reason})`);
        break;
      case 'opponent_status':
        addMessage(`Opponent ${data.connected ? 'connected' : 'disconnected'}`);
        break;
    }
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (lobbyData?.gameState?.phaseEndsAt) {
        const now = Date.now(); // Already in milliseconds
        const timeLeftMs = Math.max(0, lobbyData.gameState.phaseEndsAt - now);
        const timeLeftSeconds = Math.ceil(timeLeftMs / 1000);
        setTimeLeft(timeLeftSeconds);
        
        if (timeLeftSeconds <= 5) {
          setIsCritical(true);
          setIsWarning(false);
        } else if (timeLeftSeconds <= 10) {
          setIsWarning(true);
          setIsCritical(false);
        } else {
          setIsCritical(false);
          setIsWarning(false);
        }

        // Handle phase transitions when time runs out
        if (timeLeftSeconds <= 0) {
          clearInterval(timerRef.current);
          handlePhaseTimeout();
        }
      }
    }, 100);
  };

  const handlePhaseTimeout = async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      const phase = lobbyData?.gameState?.phase;
      
      if (phase === 'bidding') {
        // If no bids were placed, restart bidding
        if (!lobbyData?.gameState?.highBidderId) {
          addMessage('No bids placed, restarting bidding phase...');
          await gameService.startGame(currentLobbyCode); // Restart bidding
        } else {
          // Transition to listing phase
          await gameService.transitionToListing(currentLobbyCode);
          addMessage('Bidding time expired, moving to listing phase');
        }
      } else if (phase === 'listing') {
        // Complete listing phase and calculate scores
        await gameService.completeListingPhase(currentLobbyCode);
        addMessage('Listing time expired, calculating scores...');
      } else if (phase === 'summary') {
        // Summary phase timeout - transition to next bidding round  
        const currentLobbyCode = lobbyCode || code;
        await gameService.transitionFromSummary(currentLobbyCode);
        addMessage('Starting next round...');
      }
    } catch (error) {
      console.error('Error handling phase timeout:', error);
      addMessage(`Phase transition error: ${error.message}`);
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, { 
      id: `${Date.now()}-${Math.random()}`, 
      message, 
      timestamp: new Date() 
    }]);
  };

  const sendMessage = async (type, data = {}) => {
    try {
      const currentLobbyCode = lobbyCode || code;
      if (!currentLobbyCode) return;

      // Handle special actions
      if (type === 'start_game') {
        await handleStartGame();
        return;
      }

      const action = {
        type,
        playerId: user.id,
        playerName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        ...data
      };

      await gameService.sendGameAction(currentLobbyCode, action);
      addMessage(`Action sent: ${type}`);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(`Failed to send ${type}`);
    }
  };

  const handleStartGame = async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      if (!currentLobbyCode) return;

      addMessage('Starting game...');
      await gameService.startGame(currentLobbyCode);
      addMessage('Game started! Get ready to bid!');
    } catch (error) {
      console.error('Error starting game:', error);
      addMessage(`Failed to start game: ${error.message}`);
    }
  };

  const handleBid = async () => {
    try {
      const bid = parseInt(bidInput);
      const currentGameBid = lobbyData?.gameState?.currentBid || 0;
      
      if (bid <= currentGameBid) {
        addMessage(`Bid must be higher than ${currentGameBid}`);
        return;
      }
      
      const currentLobbyCode = lobbyCode || code;
      await gameService.placeBid(currentLobbyCode, user.id, bid);
      setBidInput('');
      addMessage(`Bid placed: ${bid}`);
    } catch (error) {
      console.error('Error placing bid:', error);
      addMessage(`Failed to place bid: ${error.message}`);
    }
  };

  const handlePass = async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      await gameService.transitionToListing(currentLobbyCode);
      addMessage('Bidding ended, moving to listing phase');
    } catch (error) {
      console.error('Error ending bidding:', error);
      addMessage(`Failed to end bidding: ${error.message}`);
    }
  };

  const handleSubmitItem = async () => {
    try {
      if (!itemInput.trim()) {
        addMessage('Please enter an item');
        return;
      }
      
      const currentLobbyCode = lobbyCode || code;
      const result = await gameService.submitItem(currentLobbyCode, user.id, itemInput.trim());
      
      if (result.isValid) {
        addMessage(`✅ "${itemInput.trim()}" - Correct!`);
      } else {
        addMessage(`❌ "${itemInput.trim()}" - Not in ${lobbyData?.gameState?.category || 'this category'}`);
      }
      
      setItemInput('');
      setLastItem(itemInput.trim());
    } catch (error) {
      console.error('Error submitting item:', error);
      addMessage(`Failed to submit item: ${error.message}`);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseTitle = () => {
    const phase = lobbyData?.gameState?.phase || Phase.LOBBY;
    switch (phase) {
      case Phase.LOBBY: return 'Waiting for Players...';
      case Phase.BIDDING: return 'Bidding Phase';
      case Phase.LISTING: return 'Item Submission';
      case Phase.SUMMARY: return 'Round Summary';
      case Phase.ENDED: return 'Game Ended';
      default: return 'Loading...';
    }
  };

  const getPhaseDescription = () => {
    const phase = lobbyData?.gameState?.phase || Phase.LOBBY;
    switch (phase) {
      case Phase.LOBBY: return Object.keys(lobbyData?.players || {}).length < 2 ? 'Waiting for another player to join...' : 'Ready to start!';
      case Phase.BIDDING: return 'Place your bid or pass to end bidding';
      case Phase.LISTING: return 'Submit items from the category';
      case Phase.SUMMARY: return 'Round results are being calculated...';
      case Phase.ENDED: return 'The game has ended. Check the final scores!';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600">Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  if (!connected && !lobbyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
          <p className="text-gray-600 mb-4">
            Unable to connect to the lobby. This might be due to Firebase Firestore permissions.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Fix:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Go to Firebase Console</li>
              <li>2. Navigate to Firestore Database → Rules</li>
              <li>3. Set rules to allow authenticated users</li>
              <li>4. Check FIRESTORE_SETUP.md for details</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            You can still play in offline mode.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getPhaseTitle()}
              </h1>
              <p className="text-gray-600">{getPhaseDescription()}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>{connected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Timer */}
              <div className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-mono text-xl font-bold ${
                timeLeft > 0 ? (
                  isCritical ? 'bg-red-500 text-white animate-pulse' : 
                  isWarning ? 'bg-orange-500 text-white' : 
                  'bg-blue-500 text-white'
                ) : 'bg-gray-500 text-white'
              }`}>
                <Clock className="w-6 h-6" />
                <span>{timeLeft > 0 ? formatTime(timeLeft) : '00:00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game State */}
            <div className="card p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div key="round" className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {lobbyData?.gameState?.round || 1}
                  </div>
                  <div className="text-sm text-gray-600">Round</div>
                </div>
                <div key="high-bid" className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {lobbyData?.gameState?.highBid || 0}
                  </div>
                  <div className="text-sm text-gray-600">High Bid</div>
                </div>
                <div key="items-listed" className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {lobbyData?.gameState?.listCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Items Listed</div>
                </div>
              </div>

              <div className="text-center">
                <div className="mb-6">
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    {(lobbyData?.category || category)?.replace('_', ' ').toUpperCase()}
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full"></div>
                </div>
                {(lobbyData?.id || lobbyCode || code) && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Lobby Code:</p>
                    <p className="text-2xl font-bold text-primary-600 font-mono">
                      {lobbyData?.id || lobbyCode || code}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this code with friends to join!
                    </p>
                  </div>
                )}
                {lobbyData?.gameState?.highBidderId && (
                  <p className="text-gray-600">
                    High Bidder: {lobbyData?.players?.[lobbyData.gameState.highBidderId]?.name || lobbyData.gameState.highBidderId}
                  </p>
                )}
              </div>
            </div>

            {/* Bidding Phase */}
            {lobbyData?.gameState?.phase === Phase.BIDDING && (
              <motion.div
                key="bidding-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    🎯 Bidding Phase
                  </h3>
                  <p className="text-gray-600">How many items can you list from this category?</p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {lobbyData?.gameState?.currentBid || 0}
                    </div>
                    <div className="text-lg text-gray-700 mb-1">Current High Bid</div>
                    {lobbyData?.gameState?.highBidderId && (
                      <div className="text-sm text-gray-600">
                        by <span className="font-semibold text-blue-700">
                          {lobbyData?.players?.[lobbyData.gameState.highBidderId]?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <input
                      type="number"
                      value={bidInput}
                      onChange={(e) => setBidInput(e.target.value)}
                      placeholder="Enter your bid"
                      className="flex-1 input-field text-lg text-center"
                      min={(lobbyData?.gameState?.currentBid || 0) + 1}
                    />
                    <button
                      onClick={handleBid}
                      disabled={!bidInput || parseInt(bidInput) <= (lobbyData?.gameState?.currentBid || 0)}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-lg font-semibold"
                    >
                      💰 Bid
                    </button>
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={handlePass}
                      className="btn-secondary px-8 py-3 text-lg font-semibold"
                    >
                      ✋ Pass
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-600">
                  <p>Enter a number higher than {lobbyData?.gameState?.currentBid || 0} to place a bid</p>
                  <p className="mt-1">The winner will need to list that many items from the category!</p>
                </div>
              </motion.div>
            )}

            {/* Listing Phase */}
            {lobbyData?.gameState?.phase === Phase.LISTING && (
              <motion.div
                key="listing-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    📝 Item Submission
                  </h3>
                  <p className="text-gray-600">List items from the category to reach your target!</p>
                </div>
                
                {lobbyData?.gameState?.listerId === user.id ? (
                  <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="bg-gray-200 rounded-full h-4 mb-4">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, ((lobbyData?.gameState?.listCount || 0) / (lobbyData?.gameState?.currentBid || 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-blue-600">
                        {lobbyData?.gameState?.listCount || 0} / {lobbyData?.gameState?.currentBid || 1}
                      </div>
                      <div className="text-sm text-gray-600">Items submitted</div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        value={itemInput}
                        onChange={(e) => setItemInput(e.target.value)}
                        placeholder="Enter item name..."
                        className="flex-1 input-field text-lg"
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitItem()}
                      />
                      <button
                        onClick={handleSubmitItem}
                        disabled={!itemInput.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-lg font-semibold"
                      >
                        ➕ Submit
                      </button>
                    </div>
                    
                    <div className="text-center text-sm text-gray-600">
                      <p>Type items from the <span className="font-semibold text-purple-600">{(lobbyData?.category || 'category').replace('_', ' ').toUpperCase()}</span> category</p>
                      <p className="mt-1">You need {lobbyData?.gameState?.currentBid || 1} valid items to win!</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-8">
                      <Users className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">
                        Waiting for {lobbyData?.players?.[lobbyData.gameState.listerId]?.name || 'the winner'} to submit items...
                      </h4>
                      <p className="text-gray-600 mb-4">
                        They need to list {lobbyData?.gameState?.currentBid || 1} items from the category
                      </p>
                      
                      {lastItem && (
                        <div className="bg-white border border-orange-200 rounded-lg p-4 mt-4">
                          <p className="text-sm text-gray-600 mb-1">Last item submitted:</p>
                          <p className="text-lg font-semibold text-gray-800">"{lastItem}"</p>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <div className="text-2xl font-bold text-orange-600">
                          {lobbyData?.gameState?.listCount || 0} / {lobbyData?.gameState?.currentBid || 1}
                        </div>
                        <div className="text-sm text-gray-600">Items submitted so far</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Summary Phase */}
            {lobbyData?.gameState?.phase === Phase.SUMMARY && (
              <motion.div
                key="summary-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="text-center">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Round Complete!
                  </h3>
                  <p className="text-gray-600">
                    Results are being calculated...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Game Ended */}
            {lobbyData?.gameState?.phase === Phase.ENDED && (
              <motion.div
                key="ended-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8 text-center"
              >
                <div className="mb-8">
                  <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    Game Complete!
                  </h3>
                  <p className="text-gray-600">Great job everyone!</p>
                </div>
                
                {/* Winner announcement */}
                {lobbyData?.gameState?.winner && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl shadow-lg"
                  >
                    <div className="flex items-center justify-center mb-3">
                      <Trophy className="w-8 h-8 text-yellow-600 mr-2" />
                      <h4 className="text-2xl font-bold text-yellow-800">
                        🏆 {lobbyData?.players?.[lobbyData.gameState.winner]?.name || 'Unknown'} Wins!
                      </h4>
                    </div>
                    <p className="text-lg text-yellow-700 font-semibold">
                      Final Score: {lobbyData?.gameState?.scores?.[lobbyData.gameState.winner] || 0} point{lobbyData?.gameState?.scores?.[lobbyData.gameState.winner] !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                )}
                
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Final Results</h4>
                  <div className="max-w-md mx-auto space-y-3">
                    {Object.values(lobbyData?.players || {})
                      .sort((a, b) => (lobbyData?.gameState?.scores?.[b.id] || 0) - (lobbyData?.gameState?.scores?.[a.id] || 0))
                      .map((player, index) => (
                      <motion.div 
                        key={player.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className={`flex justify-between items-center py-3 px-4 rounded-lg border-2 ${
                          index === 0 
                            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 font-bold shadow-md' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <span className="text-gray-900 text-lg">
                            {player.name}
                          </span>
                        </div>
                        <span className={`text-xl font-bold ${
                          index === 0 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {lobbyData?.gameState?.scores?.[player.id] || 0}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Game stats */}
                <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-900 mb-2">Game Summary</h5>
                  <div className="flex justify-center space-x-6 text-sm text-blue-800">
                    <div>
                      <span className="font-semibold">Category:</span> {(lobbyData?.category || 'Unknown').replace('_', ' ').toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold">High Bid:</span> {lobbyData?.gameState?.currentBid || 0}
                    </div>
                    <div>
                      <span className="font-semibold">Items Listed:</span> {lobbyData?.gameState?.listCount || 0}
                    </div>
                  </div>
                </div>
                
                {/* Play Again Options */}
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-800 mb-4">What would you like to do next?</h5>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => {
                        // Create new lobby with same category
                        const newLobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        router.push(`/lobby?category=${lobbyData?.category || 'fruits'}&action=create&code=${newLobbyCode}`);
                      }}
                      className="btn-primary flex items-center justify-center px-6 py-3"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Play Again (Same Category)
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="btn-secondary flex items-center justify-center px-6 py-3"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Try Different Category
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Players ({Object.keys(lobbyData?.players || {}).length}/2)
              </h3>
              <div className="space-y-3">
                {Object.values(lobbyData?.players || {}).map((player) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        player.connected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-gray-900">{player.name}</span>
                      {player.ready && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {lobbyData?.gameState?.scores?.[player.id] || 0}
                    </span>
                  </div>
                ))}
                {Object.keys(lobbyData?.players || {}).length < 2 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-3 opacity-50"
                  >
                    <motion.div 
                      className="w-3 h-3 rounded-full bg-gray-300"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-gray-500">Waiting for player...</span>
                  </motion.div>
                )}
              </div>
              
              {/* Game start button for lobby phase */}
              {Object.keys(lobbyData?.players || {}).length >= 2 && 
               lobbyData?.status === 'waiting_for_players' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage('start_game')}
                  className="btn-primary w-full mt-4 py-4 text-lg font-bold flex items-center justify-center"
                >
                  <Play className="w-6 h-6 mr-2" />
                  🚀 Start Game
                </motion.button>
              )}
            </div>

            {/* Messages */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Game Messages
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm text-gray-600">
                    <span className="text-gray-400">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="ml-2">{msg.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LobbyPageContent />
    </Suspense>
  );
}
