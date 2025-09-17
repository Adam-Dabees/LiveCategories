'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
  RotateCcw,
  Gamepad2
} from 'lucide-react';

const Phase = {
  LOBBY: 'lobby',
  BIDDING: 'bidding',
  LISTING: 'listing',
  SUMMARY: 'summary',
  ENDED: 'ended',
  NO_CONTEST: 'no_contest'
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
  const [copied, setCopied] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);
  const [submissionAnimation, setSubmissionAnimation] = useState(false);
  
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

  // Navigation protection - prevent leaving game accidentally
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (lobbyData?.gameState?.phase && lobbyData.gameState.phase !== 'lobby') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave the game? Your progress will be lost.';
        return 'Are you sure you want to leave the game? Your progress will be lost.';
      }
    };

    const handlePopState = (e) => {
      if (lobbyData?.gameState?.phase && lobbyData.gameState.phase !== 'lobby') {
        const confirmed = window.confirm('Are you sure you want to leave the game? Your progress will be lost.');
        if (!confirmed) {
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [lobbyData?.gameState?.phase]);

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
        // Only call leaveLobby - it will handle both stats saving and disconnection
        gameService.leaveLobby(currentLobbyCode, user.id).catch(console.error);
      }
    };
  }, [user, lobbyCode, code]); // Dependencies for lobby initialization

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      // Only start timer if we have a phaseEndsAt and we're not waiting for players
      if (lobbyData?.gameState?.phaseEndsAt && lobbyData?.status !== 'waiting_for_players') {
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
      } else {
        // Idle mode when waiting for players
        setTimeLeft(0);
        setIsCritical(false);
        setIsWarning(false);
      }
    }, 100);
  };

  useEffect(() => {
    console.log('useEffect triggered:', { 
      phaseEndsAt: lobbyData?.gameState?.phaseEndsAt, 
      phase: lobbyData?.gameState?.phase,
      status: lobbyData?.status
    });
    
    if (lobbyData?.gameState?.phaseEndsAt) {
      startTimer();
    }
    
    // Cleanup timer when component unmounts or phase changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lobbyData?.gameState?.phaseEndsAt, lobbyData?.gameState?.phase]);


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
        console.log('Game state:', data.gameState);
        setLobbyData(data);
        setConnected(true);
        setLoading(false);
        
        // Update game state if it exists
        if (data.gameState) {
          setGameState(data.gameState);
          console.log('Updated game state:', data.gameState);
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

  const addMessage = (message) => {
    setMessages(prev => [...prev, { 
      id: `${Date.now()}-${Math.random()}`, 
      message, 
      timestamp: new Date() 
    }]);
  };

  const copyLobbyCode = async () => {
    const lobbyCode = lobbyData?.id || lobbyCode || code;
    if (lobbyCode) {
      try {
        await navigator.clipboard.writeText(lobbyCode);
        setCopied(true);
        addMessage('Lobby code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy lobby code:', err);
        addMessage('Failed to copy lobby code');
      }
    }
  };

  const triggerSubmissionAnimation = (isCorrect) => {
    setLastSubmissionResult(isCorrect);
    setSubmissionAnimation(true);
    setTimeout(() => {
      setSubmissionAnimation(false);
      setLastSubmissionResult(null);
    }, 1500); // Reduced from 2000ms to 1500ms
  };

  const handlePhaseTimeout = useCallback(async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      const phase = lobbyData?.gameState?.phase;
      
      console.log('Phase timeout triggered:', { 
        phase, 
        currentLobbyCode, 
        highBidderId: lobbyData?.gameState?.highBidderId,
        currentBid: lobbyData?.gameState?.currentBid,
        gameState: lobbyData?.gameState
      });
      
      if (phase === 'bidding') {
        // Check if there's a pass opportunity active
        if (lobbyData?.gameState?.passOpportunity) {
          console.log('Pass opportunity time expired, creating no contest');
          addMessage('Pass opportunity expired, creating no contest');
          await gameService.createNoContest(currentLobbyCode, user.id);
        } else {
          // Always transition to listing phase when bidding time expires
          // The transitionToListing method will handle setting a default bidder if no bids were placed
          console.log('Bidding time expired, transitioning to listing phase');
          addMessage('Bidding time expired, moving to listing phase');
          await gameService.transitionToListing(currentLobbyCode);
        }
      } else if (phase === 'no_contest') {
        // No contest time expired - end game
        console.log('No contest time expired, ending game');
        addMessage('No contest time expired, ending game');
        // You could add logic here to end the game or return to lobby
      } else if (phase === 'listing') {
        // Complete listing phase and calculate scores
        console.log('Completing listing phase');
        await gameService.completeListingPhase(currentLobbyCode);
        addMessage('Listing time expired, calculating scores...');
        } else if (phase === 'ended') {
          // Game ended - stats saving is handled by separate useEffect
          console.log('Game ended - stats saving handled by dedicated useEffect');
        }
    } catch (error) {
      console.error('Error handling phase timeout:', error);
      addMessage(`Phase transition error: ${error.message}`);
    }
  }, [lobbyCode, code, lobbyData?.gameState?.phase, lobbyData?.gameState?.highBidderId]);

  // Separate useEffect to handle game ending and stats saving
  useEffect(() => {
    const handleGameEnd = async () => {
      if (!user || !lobbyData?.gameState) return;
      
      const phase = lobbyData.gameState.phase;
      const currentLobbyCode = lobbyCode || code;
      
      if (phase === 'ended') {
        console.log('🎮 Game ended detected - saving stats for current player');
        
        // Check if this game was ended due to player leaving
        if (lobbyData?.gameState?.processedForLeave && lobbyData?.gameState?.winnerId) {
          console.log('🎮 Game ended due to player leaving, saving stats for remaining player');
          console.log('🔍 DEBUG: Winner ID from game state:', lobbyData.gameState.winnerId);
          console.log('🔍 DEBUG: Loser ID from game state:', lobbyData.gameState.loserId);
          console.log('🔍 DEBUG: Current user ID:', user.id);
          console.log('🔍 DEBUG: Remaining player should be:', lobbyData.gameState.winnerId === user.id ? 'WINNER' : 'LOSER');
          
          try {
            await gameService.saveRemainingPlayerStats(currentLobbyCode, user.id, lobbyData);
            console.log('✅ Stats saved for remaining player');
          } catch (error) {
            console.error('❌ Error saving stats for remaining player:', error);
          }
        } else {
          console.log('ℹ️ Game ended normally - saving stats for current player');
          try {
            await gameService.savePlayerStats(currentLobbyCode, user.id);
            console.log('✅ Stats saved for current player');
          } catch (error) {
            console.error('❌ Error saving stats for current player:', error);
          }
        }
        
        // Don't redirect immediately - let the 60-second timer handle it
        console.log('Game ended - stats saved, waiting for 60-second timer to redirect');
      }
    };

    handleGameEnd();
  }, [lobbyData?.gameState?.phase, user, lobbyCode, code, lobbyData?.gameState?.processedForLeave, lobbyData?.gameState?.winnerId, router]);

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
      
      // If no bids were placed, create a pass opportunity for the other player
      if (!lobbyData?.gameState?.highBidderId || lobbyData?.gameState?.currentBid === 0) {
        console.log('No bids placed, creating pass opportunity for other player');
        await gameService.createPassOpportunity(currentLobbyCode, user.id);
        addMessage('You passed! Other player can now pass (no contest) or bid to continue');
        return;
      }
      
      // If there are bids, transition to listing phase normally
      await gameService.transitionToListing(currentLobbyCode);
      addMessage('Bidding ended, moving to listing phase');
    } catch (error) {
      console.error('Error ending bidding:', error);
      addMessage(`Failed to end bidding: ${error.message}`);
    }
  };

  const handlePassOpportunityChoice = async (choice) => {
    try {
      const currentLobbyCode = lobbyCode || code;
      await gameService.handlePassOpportunityChoice(currentLobbyCode, user.id, choice);
      
      if (choice === 'pass') {
        addMessage('You passed too! No contest - both players can choose to play or not');
      } else {
        addMessage('You chose to bid! Bidding continues...');
      }
    } catch (error) {
      console.error('Error handling pass opportunity choice:', error);
      addMessage(`Failed to make choice: ${error.message}`);
    }
  };

  const handleNoContestChoice = async (choice) => {
    try {
      const currentLobbyCode = lobbyCode || code;
      
      if (choice === 'play') {
        await gameService.startNoContestListing(currentLobbyCode, user.id);
        addMessage('You chose to play! List 1 item to win');
      } else {
        // Handle not playing - could end game or return to lobby
        addMessage('You chose not to play. Game ended.');
        // You could add logic here to end the game or return to lobby
      }
    } catch (error) {
      console.error('Error handling no contest choice:', error);
      addMessage(`Failed to make choice: ${error.message}`);
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
      
      // Trigger animation based on result
      triggerSubmissionAnimation(result.isValid);
      
      if (result.isValid) {
        addMessage(`✅ "${itemInput.trim()}" - Correct!`);
      } else {
        addMessage(`❌ "${itemInput.trim()}" - Not in ${lobbyData?.gameState?.category || 'this category'}`);
      }
      
      setItemInput('');
      setLastItem(itemInput.trim());
    } catch (error) {
      console.error('Error submitting item:', error);
      
      // Handle duplicate submission error specifically
      if (error.message.includes('already submitted')) {
        addMessage(`⚠️ "${itemInput.trim()}" already submitted! Try a different item.`);
        setItemInput(''); // Clear the input to encourage trying something new
      } else {
        addMessage(`Failed to submit item: ${error.message}`);
      }
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
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "center" }}
            className="mx-auto mb-4"
          >
            <Gamepad2 className="w-12 h-12 text-primary-600" />
          </motion.div>
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
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
          <div className="absolute top-1/4 right-0 w-64 h-64 bg-gradient-to-l from-pink-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1 
                className="text-3xl font-black mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎯 {getPhaseTitle()}
              </motion.h1>
              <p className="text-blue-100 text-lg font-semibold">{getPhaseDescription()}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <motion.div 
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold ${
                  connected ? 'bg-green-500 text-white shadow-lg' : 'bg-red-500 text-white shadow-lg'
                }`}
                animate={{ scale: connected ? [1, 1.05, 1] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <motion.div 
                  className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-white' : 'bg-white'
                  }`}
                  animate={{ opacity: connected ? [1, 0.3, 1] : 1 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span>{connected ? '🟢 LIVE' : '🔴 OFFLINE'}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game State */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 shadow-2xl border-2 border-blue-200">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-200 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
              </div>
              
              <div className="relative z-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <motion.div 
                    className="text-center bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-4 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-3xl font-black text-blue-600 mb-1">
                    {lobbyData?.gameState?.round || 1}
                  </div>
                    <div className="text-sm font-bold text-blue-800 uppercase tracking-wide">Round</div>
                  </motion.div>
                  
                  <motion.div 
                    className="text-center bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-4 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-3xl font-black text-purple-600 mb-1">
                      {lobbyData?.gameState?.currentBid || 0}
                </div>
                    <div className="text-sm font-bold text-purple-800 uppercase tracking-wide">High Bid</div>
                  </motion.div>
                  
                  <motion.div 
                    className="text-center bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-4 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-3xl font-black text-orange-600 mb-1">
                      {(lobbyData?.gameState?.submittedItems || []).filter(item => item.isValid).length}
                  </div>
                    <div className="text-sm font-bold text-orange-800 uppercase tracking-wide">Items Listed</div>
                  </motion.div>
              </div>

                {/* Category Display */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="mb-6"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <h2 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
                      {(lobbyData?.category || category)?.replace('_', ' ').toUpperCase()}
                    </h2>
                    <div className="w-32 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 mx-auto rounded-full shadow-lg"></div>
                  </motion.div>
                  
                {(lobbyData?.id || lobbyCode || code) && (
                    <motion.div 
                      className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-4 shadow-lg mb-4 cursor-pointer hover:shadow-xl transition-all duration-200"
                      onClick={copyLobbyCode}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">🎮 Lobby Code</p>
                      <p className="text-3xl font-black text-primary-600 font-mono tracking-wider">
                      {lobbyData?.id || lobbyCode || code}
                    </p>
                      <p className="text-sm text-gray-600 mt-2 font-semibold flex items-center justify-center">
                        {copied ? (
                          <>
                            <span className="text-green-600 mr-2">✅</span>
                            Copied to clipboard!
                          </>
                        ) : (
                          <>
                            <span className="mr-2">📤</span>
                            Click to copy and share with friends!
                          </>
                        )}
                      </p>
                    </motion.div>
                  )}
                  
                {lobbyData?.gameState?.highBidderId && (
                    <div className="bg-gradient-to-r from-yellow-100 to-orange-200 rounded-2xl p-4 shadow-lg">
                      <p className="text-lg font-bold text-orange-800">
                        👑 High Bidder: <span className="text-2xl">{lobbyData?.players?.[lobbyData.gameState.highBidderId]?.name || lobbyData.gameState.highBidderId}</span>
                  </p>
                    </div>
                )}
                </div>
              </div>
            </div>

            {/* Bidding Phase */}
            {lobbyData?.gameState?.phase === Phase.BIDDING && (
              <motion.div
                key="bidding-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-yellow-50 rounded-3xl p-8 shadow-2xl border-2 border-yellow-200"
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-yellow-200 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10">
                  <motion.div 
                    className="text-center mb-8"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-3">
                      🎯 Bidding Phase
                </h3>
                    <p className="text-gray-700 text-lg font-semibold">How many items can you list from this category?</p>
                  </motion.div>
                  
                  {/* Current High Bid Display */}
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-200 rounded-3xl p-8 mb-8 shadow-lg border-2 border-yellow-300">
                    <div className="text-center">
                      <div className="text-5xl font-black text-orange-600 mb-3">
                        {lobbyData?.gameState?.currentBid || 0}
                      </div>
                      <div className="text-xl font-bold text-orange-800 mb-2">Current High Bid</div>
                  {lobbyData?.gameState?.highBidderId && (
                        <div className="text-lg font-bold text-orange-700">
                          👑 by <span className="text-2xl">
                            {lobbyData?.players?.[lobbyData.gameState.highBidderId]?.name || 'Unknown'}
                    </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bidding Controls - Mobile Optimized */}
                  <div className="space-y-4">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <input
                    type="number"
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBid()}
                        placeholder="Enter your bid"
                        className="flex-1 text-lg sm:text-xl font-bold text-center py-3 sm:py-4 px-4 sm:px-6 border-2 border-yellow-300 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-200"
                    min={(lobbyData?.gameState?.currentBid || 0) + 1}
                  />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    onClick={handleBid}
                        disabled={!bidInput || parseInt(bidInput) <= (lobbyData?.gameState?.currentBid || 0)}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💰 BID
                      </motion.button>
                    </div>
                    
                    <div className="flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    onClick={handlePass}
                        className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200"
                      >
                        ✋ PASS
                      </motion.button>
                      
                </div>
                  </div>
                  
                  {/* Instructions */}
                  <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-100 rounded-3xl p-8 shadow-xl border-2 border-amber-200">
                    <div className="text-center space-y-4">
                      <motion.div 
                        className="flex items-center justify-center"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="text-4xl mr-4">📈</span>
                        <span className="text-xl font-bold text-amber-800">
                          Bid higher than <span className="text-2xl font-black text-amber-900">{lobbyData?.gameState?.currentBid || 0}</span>
                        </span>
                      </motion.div>
                      
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
                      
                      <motion.div 
                        className="flex items-center justify-center"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        <span className="text-4xl mr-4">🎯</span>
                        <span className="text-lg font-semibold text-amber-700">
                          Winner lists <span className="font-black text-amber-900">that many</span> items!
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Pass Opportunity Phase */}
            {lobbyData?.gameState?.phase === Phase.BIDDING && lobbyData?.gameState?.passOpportunity && (
              <motion.div
                key="pass-opportunity-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 shadow-2xl border-2 border-blue-200"
              >
                <div className="relative z-10">
                  <motion.div 
                    className="text-center mb-8"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-3">
                      🤔 Pass Opportunity
                    </h3>
                    <p className="text-gray-700 text-lg font-semibold">
                      {lobbyData?.gameState?.passOpportunity?.firstPlayerPassed === user.id 
                        ? "You passed! Waiting for other player to decide..."
                        : "Other player passed! What do you want to do?"
                      }
                    </p>
                  </motion.div>
                  
                  {lobbyData?.gameState?.passOpportunity?.firstPlayerPassed !== user.id && (
                    <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePassOpportunityChoice('pass')}
                        className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200"
                      >
                        ✋ PASS (No Contest)
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePassOpportunityChoice('bid')}
                        className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200"
                      >
                        💰 BID (Continue)
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* No Contest Phase */}
            {lobbyData?.gameState?.phase === Phase.NO_CONTEST && (
              <motion.div
                key="no-contest-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50 rounded-3xl p-8 shadow-2xl border-2 border-purple-200"
              >
                <div className="relative z-10">
                  <motion.div 
                    className="text-center mb-8"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-3">
                      🤝 No Contest
                    </h3>
                    <p className="text-gray-700 text-lg font-semibold">
                      Both players passed! You can choose to play with 1 item or not play at all.
                    </p>
                  </motion.div>
                  
                  <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNoContestChoice('play')}
                      className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200"
                    >
                      🎮 PLAY (List 1 Item)
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNoContestChoice('pass')}
                      className="px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-black bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200"
                    >
                      🚪 DON'T PLAY
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Listing Phase */}
            {lobbyData?.gameState?.phase === Phase.LISTING && (
              <motion.div
                key="listing-phase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-green-50 rounded-3xl p-8 shadow-2xl border-2 border-green-200"
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-green-200 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
                </div>
                
                <div className="relative z-10">
                  <motion.div 
                    className="text-center mb-8"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <h3 className="text-3xl font-black text-gray-900 mb-3">
                      📝 Item Submission
                </h3>
                    <p className="text-gray-700 text-lg font-semibold">List items from the category to reach your target!</p>
                  </motion.div>
                  
                  {lobbyData?.gameState?.listerId === user.id ? (
                    <div className="space-y-6">
                      {/* Progress Bar with Animation - Mobile Optimized */}
                      <div className="bg-gray-200 rounded-full h-3 sm:h-4 mb-4 shadow-inner">
                        <motion.div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 sm:h-4 rounded-full shadow-lg"
                          style={{ 
                            width: `${Math.min(100, (((lobbyData?.gameState?.submittedItems || []).filter(item => item.isValid).length) / (lobbyData?.gameState?.currentBid || 1)) * 100)}%` 
                          }}
                          animate={{ 
                            boxShadow: [
                              '0 0 0px rgba(34, 197, 94, 0)',
                              '0 0 20px rgba(34, 197, 94, 0.5)',
                              '0 0 0px rgba(34, 197, 94, 0)'
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      
                      <div className="text-center mb-4">
                        <motion.div 
                          className="text-2xl sm:text-3xl font-black text-primary-600 mb-1"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          {(lobbyData?.gameState?.submittedItems || []).filter(item => item.isValid).length} / {lobbyData?.gameState?.currentBid || 1}
                        </motion.div>
                        <div className="text-sm sm:text-base font-bold text-gray-600">Items submitted</div>
                      </div>

                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <input
                        type="text"
                        value={itemInput}
                        onChange={(e) => setItemInput(e.target.value)}
                          placeholder="Enter item name..."
                          className="flex-1 text-base sm:text-lg font-bold text-center py-3 sm:py-4 px-4 sm:px-6 border-2 border-green-300 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-200"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitItem()}
                      />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        onClick={handleSubmitItem}
                        disabled={!itemInput.trim()}
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          + SUBMIT
                        </motion.button>
                    </div>

                      {/* Submitted Items List */}
                      {(lobbyData?.gameState?.submittedItems || []).length > 0 && (
                        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                          <h4 className="text-xl font-bold text-blue-800 mb-4 text-center">📝 Items Submitted</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {(lobbyData?.gameState?.submittedItems || []).map((item, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold text-center ${
                                  item.isValid 
                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}
                              >
                                {item.isValid ? '✅' : '❌'} {item.text}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Instructions - Matching Bidding Phase Style */}
                      <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-100 rounded-3xl p-8 shadow-xl border-2 border-amber-200">
                        <div className="text-center space-y-6">
                          <motion.div
                            className="flex items-center justify-center"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <span className="text-4xl mr-4">🎯</span>
                            <div className="text-xl font-bold text-amber-800">
                              Type items from the <span className="text-2xl font-black text-amber-900">{(lobbyData?.category || 'category').replace('_', ' ').toUpperCase()}</span> category
                            </div>
                          </motion.div>
                          
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
                          
                          <motion.div
                            className="flex items-center justify-center"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                          >
                            <span className="text-4xl mr-4">🏆</span>
                            <div className="text-lg font-semibold text-amber-700">
                              You need <span className="text-2xl font-black text-amber-900">{lobbyData?.gameState?.currentBid || 1}</span> valid items to win!
                            </div>
                          </motion.div>
                        </div>
                      </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                      {/* Animated waiting state */}
                      <motion.div 
                        className="text-8xl mb-6"
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        ⏳
                      </motion.div>
                      
                      <motion.h4 
                        className="text-2xl font-black text-gray-700 mb-4"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Waiting for <span className="text-primary-600">{lobbyData?.players?.[lobbyData.gameState.listerId]?.name || 'the winner'}</span> to submit items...
                      </motion.h4>
                      
                      <motion.p 
                        className="text-lg font-semibold text-gray-600 mb-6"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        They need to list <span className="font-black text-primary-600 text-xl">{lobbyData?.gameState?.currentBid || 1}</span> items from the category
                      </motion.p>
                      
                      {/* Animated progress display */}
                      <motion.div 
                        className="bg-gradient-to-r from-yellow-100 to-orange-200 rounded-2xl p-6 shadow-lg border-2 border-orange-300"
                        animate={{ 
                          scale: [1, 1.02, 1],
                          boxShadow: [
                            '0 4px 6px rgba(0, 0, 0, 0.1)',
                            '0 10px 15px rgba(0, 0, 0, 0.2)',
                            '0 4px 6px rgba(0, 0, 0, 0.1)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <motion.div 
                          className="text-3xl font-black text-orange-600 mb-2"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {(lobbyData?.gameState?.submittedItems || []).filter(item => item.isValid).length} / {lobbyData?.gameState?.currentBid || 1}
                        </motion.div>
                        <div className="text-sm font-bold text-orange-800">Items submitted so far</div>
                      </motion.div>
                    </div>
                  )}

                </div>
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
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3 
                    className="text-5xl font-black text-gray-900 mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    🎉 Game Complete! 🎉
                  </motion.h3>
                  <motion.p 
                    className="text-2xl font-bold text-gray-700"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Great job everyone! 🎊
                  </motion.p>
                </div>
                
                {/* Winner announcement */}
                {lobbyData?.gameState?.winner && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 p-8 bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-3xl shadow-2xl"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="flex items-center justify-center mb-4"
                    >
                      <Trophy className="w-16 h-16 text-yellow-600 mr-3" />
                      <h4 className="text-4xl font-black text-yellow-800">
                        🏆 {lobbyData?.players?.[lobbyData.gameState.winner]?.name || 'Unknown'} Wins! 🏆
                    </h4>
                  </motion.div>
                    <p className="text-2xl font-bold text-yellow-700 text-center">
                      Final Score: <span className="text-3xl font-black text-orange-600">{lobbyData?.gameState?.scores?.[lobbyData.gameState.winner] || 0}</span> point{lobbyData?.gameState?.scores?.[lobbyData.gameState.winner] !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                )}
                
                <div className="mb-8">
                  <motion.h4 
                    className="text-3xl font-black text-gray-800 mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    🏅 Final Results 🏅
                  </motion.h4>
                  <div className="max-w-lg mx-auto space-y-4">
                  {Object.values(lobbyData?.players || {})
                    .sort((a, b) => (lobbyData?.gameState?.scores?.[b.id] || 0) - (lobbyData?.gameState?.scores?.[a.id] || 0))
                    .map((player, index) => (
                      <motion.div 
                        key={player.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className={`flex justify-between items-center py-6 px-6 rounded-2xl border-3 shadow-xl ${
                          index === 0 
                            ? 'bg-gradient-to-r from-yellow-200 to-orange-200 border-yellow-400 font-bold' 
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
                            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center">
                          <span className="text-4xl mr-4">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                          <span className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-800' : 'text-gray-800'
                          }`}>
                            {player.name}
                      </span>
                    </div>
                        <span className={`text-3xl font-black ${
                          index === 0 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {lobbyData?.gameState?.scores?.[player.id] || 0}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {/* Game stats */}
                <motion.div 
                  className="mb-8 p-8 bg-gradient-to-r from-blue-100 to-purple-100 border-3 border-blue-300 rounded-3xl shadow-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <h5 className="text-2xl font-black text-blue-900 mb-6 text-center">📊 Game Summary 📊</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <motion.div 
                      className="bg-white rounded-2xl p-4 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl mb-2">🎯</div>
                      <div className="text-lg font-bold text-blue-800">Category</div>
                      <div className="text-xl font-black text-blue-600">{(lobbyData?.category || 'Unknown').replace('_', ' ').toUpperCase()}</div>
                    </motion.div>
                    <motion.div 
                      className="bg-white rounded-2xl p-4 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl mb-2">💰</div>
                      <div className="text-lg font-bold text-blue-800">High Bid</div>
                      <div className="text-xl font-black text-blue-600">{lobbyData?.gameState?.currentBid || 0}</div>
                    </motion.div>
                    <motion.div 
                      className="bg-white rounded-2xl p-4 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl mb-2">✅</div>
                      <div className="text-lg font-bold text-blue-800">Items Listed</div>
                      <div className="text-xl font-black text-blue-600">{(lobbyData?.gameState?.submittedItems || []).filter(item => item.isValid).length}</div>
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Play Again Options */}
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  <h5 className="text-3xl font-black text-gray-800 mb-8 text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    🎮 What would you like to do next? 🎮
                  </h5>
                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <motion.button
                      onClick={() => {
                        // Create new lobby with same category
                        const newLobbyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                        router.push(`/lobby?category=${lobbyData?.category || 'fruits'}&action=create&code=${newLobbyCode}`);
                      }}
                      className="flex items-center justify-center px-12 py-6 text-2xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="w-8 h-8 mr-3" />
                      🔄 Play Again (Same Category)
                    </motion.button>
                    <motion.button
                      onClick={() => router.push('/')}
                      className="flex items-center justify-center px-12 py-6 text-2xl font-black bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 border-4 border-blue-400"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="w-8 h-8 mr-3" />
                      🎯 Back to Categories (Default)
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-green-50 rounded-3xl p-6 shadow-2xl border-2 border-green-200">
              <h3 className="text-xl font-black text-gray-900 mb-6 text-center">
                👥 Players ({Object.keys(lobbyData?.players || {}).length}/2)
              </h3>
              <div className="space-y-4">
                {Object.values(lobbyData?.players || {}).map((player, index) => (
                  <motion.div 
                    key={player.id} 
                    className="flex items-center justify-between bg-gradient-to-r from-white to-gray-50 rounded-2xl p-4 shadow-lg border border-gray-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div 
                        className={`w-4 h-4 rounded-full ${
                        player.connected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        animate={{ scale: player.connected ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-gray-900 font-bold text-lg">{player.name}</span>
                      {player.ready && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-3 py-1 font-black text-lg">
                      {lobbyData?.gameState?.scores?.[player.id] || 0}
                  </div>
                  </motion.div>
                ))}
                {Object.keys(lobbyData?.players || {}).length < 2 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-3 opacity-50 bg-gray-100 rounded-2xl p-4"
                  >
                    <motion.div 
                      className="w-4 h-4 rounded-full bg-gray-300"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-gray-500 font-semibold">Waiting for player...</span>
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
                  className="w-full mt-6 py-4 text-xl font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:shadow-3xl transition-all duration-200"
                >
                  <Play className="w-6 h-6 mr-3" />
                  🚀 Start Battle!
                </motion.button>
              )}
            </div>

            {/* Game Messages */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50 rounded-3xl p-6 shadow-2xl border-2 border-purple-200">
              <h3 className="text-xl font-black text-gray-900 mb-6 text-center">
                💬 Game Messages
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {messages.map((msg, index) => (
                  <motion.div 
                    key={msg.id} 
                    className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-3 shadow-lg border border-gray-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                      <span className="text-sm text-gray-800 font-semibold flex-1">{msg.message}</span>
                  </div>
                  </motion.div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 font-semibold py-8">
                    No messages yet... Start the game! 🎮
              </div>
                )}
            </div>
          </div>

            {/* Big Stress Timer */}
            <div className={`relative overflow-hidden rounded-3xl p-8 shadow-2xl border-2 ${
              lobbyData?.status === 'waiting_for_players' 
                ? 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400' 
                : 'bg-gradient-to-br from-red-500 to-orange-600 border-red-400'
            }`}>
              <div className="text-center">
                <motion.div
                  animate={{ scale: timeLeft <= 10 && lobbyData?.status !== 'waiting_for_players' ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.5, repeat: timeLeft <= 10 && lobbyData?.status !== 'waiting_for_players' ? Infinity : 0 }}
                  className="mb-4"
                >
                  <Clock className="w-12 h-12 text-white mx-auto mb-2" />
                  <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">
                    ⏰ Time Left
                  </h3>
                </motion.div>
                
                <motion.div
                  className={`text-6xl font-black font-mono mb-4 ${
                    lobbyData?.status === 'waiting_for_players' ? 'text-gray-300' :
                    timeLeft > 0 ? (
                      isCritical ? 'text-white' : 
                      isWarning ? 'text-yellow-200' : 
                      'text-white'
                    ) : 'text-gray-300'
                  }`}
                  animate={{ 
                    scale: timeLeft <= 5 && lobbyData?.status !== 'waiting_for_players' ? [1, 1.2, 1] : 1
                  }}
                  transition={{ duration: 0.3, repeat: timeLeft <= 5 && lobbyData?.status !== 'waiting_for_players' ? Infinity : 0 }}
                  style={{ 
                    textShadow: timeLeft <= 5 && lobbyData?.status !== 'waiting_for_players' ? '0 0 20px #ff0000, 0 0 40px #ff0000' : 'none',
                    background: 'transparent'
                  }}
                >
                  {lobbyData?.status === 'waiting_for_players' ? '⏸️' : 
                   timeLeft > 0 ? formatTime(timeLeft) : '00:00'}
                </motion.div>
                
                <div className="text-white font-bold text-lg">
                  {lobbyData?.status === 'waiting_for_players' ? '⏸️ Waiting for players...' :
                   timeLeft > 10 ? '⏳ Take your time!' : 
                   timeLeft > 5 ? '⚡ Hurry up!' : 
                   timeLeft > 0 ? '🚨 URGENT!' : '⏰ Time\'s up!'}
                </div>
              </div>
              
              {/* Animated background for stress effect */}
              {lobbyData?.status !== 'waiting_for_players' && (
                <div className="absolute inset-0 opacity-20">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: timeLeft <= 10 ? Infinity : 0 }}
                  />
                </div>
              )}
            </div>
            
            {/* Dart Board Animation - Below Timer */}
            {submissionAnimation && (
              <motion.div
                className="flex items-center justify-center mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: [0, 1.2, 1],
                    rotate: [180, 0, 360]
                  }}
                  transition={{ 
                    duration: 1.2,
                    ease: "easeOut"
                  }}
                >
                  {/* Dart Board */}
                  <div className="relative w-32 h-32">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-8 border-gray-600 bg-gray-700"></div>
                    {/* Middle ring */}
                    <div className="absolute inset-4 rounded-full border-6 border-gray-500 bg-gray-600"></div>
                    {/* Inner ring */}
                    <div className="absolute inset-8 rounded-full border-4 border-gray-400 bg-gray-500"></div>
                    {/* Bullseye */}
                    <div className={`absolute inset-12 rounded-full border-2 ${
                      lastSubmissionResult 
                        ? 'border-yellow-400 bg-yellow-500' 
                        : 'border-gray-300 bg-gray-400'
                    }`}></div>
                    {/* Center dot */}
                    <div className={`absolute inset-16 rounded-full ${
                      lastSubmissionResult 
                        ? 'bg-red-600' 
                        : 'bg-gray-300'
                    }`}></div>
                    
                    {/* Dart */}
                    <motion.div
                      className="absolute top-2 left-1/2 w-1 h-8 bg-gray-800 transform -translate-x-1/2"
                      initial={{ rotate: 0, y: 0 }}
                      animate={{ 
                        rotate: [0, 15, -15, 0],
                        y: [0, 8, 0]
                      }}
                      transition={{ 
                        duration: 0.6,
                        delay: 0.3
                      }}
                    />
                  </div>
                  
                  {/* Result text */}
                  <motion.div
                    className={`text-center mt-4 text-2xl font-black ${
                      lastSubmissionResult ? 'text-green-600' : 'text-red-600'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    {lastSubmissionResult ? '🎯 BULLSEYE!' : '❌ MISS!'}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center" }}
          className="mx-auto"
        >
          <Gamepad2 className="w-12 h-12 text-primary-600" />
        </motion.div>
      </div>
    }>
      <LobbyPageContent />
    </Suspense>
  );
}
