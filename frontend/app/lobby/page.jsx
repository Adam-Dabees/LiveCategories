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
  Gamepad2,
  Target,
  DollarSign
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
      if (currentLobbyCode && user && user.id) {
        try {
          await gameService.updatePlayerConnection(currentLobbyCode, user.id, false);
        } catch (error) {
          console.error('Error marking player as disconnected:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [user, router, lobbyCode, code]);

  // Timer effect for game phases
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) {
      setIsCritical(false);
      setIsWarning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Set warning states based on remaining time
    if (timeLeft <= 10) {
      setIsCritical(true);
      setIsWarning(false);
    } else if (timeLeft <= 30) {
      setIsWarning(true);
      setIsCritical(false);
    } else {
      setIsWarning(false);
      setIsCritical(false);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft]);

  // Auto-advance bidding phase when timer runs out
  useEffect(() => {
    if (timeLeft === 0 && gameState?.phase === Phase.BIDDING) {
      console.log('Bidding timer expired, auto-advancing to listing phase');
      const handleAutoAdvance = async () => {
        try {
          await gameService.transitionToListing(lobbyCode || code);
        } catch (error) {
          console.error('Error auto-advancing from bidding:', error);
        }
      };
      handleAutoAdvance();
    }
  }, [timeLeft, gameState?.phase, lobbyCode, code]);

  const initializeLobby = async () => {
    try {
      setLoading(true);
      const currentLobbyCode = lobbyCode || code;
      
      if (!currentLobbyCode) {
        throw new Error('No lobby code provided');
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user);

      // First, join the lobby as a player
      const playerData = {
        id: user.id,
        name: user.display_name || user.username || user.email?.split('@')[0] || 'Anonymous',
        email: user.email || '',
        ready: false
      };

      console.log('User object:', user);
      console.log('Player data to send:', playerData);
      console.log('Player ID:', playerData.id);
      
      if (!playerData.id) {
        throw new Error('User ID is missing from player data');
      }

      console.log('Joining lobby:', currentLobbyCode, 'as player:', playerData);
      await gameService.joinLobby(currentLobbyCode, playerData);

      // Set up real-time listener for lobby updates
      const unsubscribe = gameService.listenToLobby(currentLobbyCode, (lobbyData) => {
        console.log('Lobby data received:', lobbyData);
        if (lobbyData) {
          setLobbyData(lobbyData);
          setGameState(lobbyData.gameState);
          setConnected(true);
          console.log('Connection established, gameState:', lobbyData.gameState);
          
          // Update timer if game phase has timer
          if (lobbyData.gameState?.phaseEndsAt) {
            const now = Date.now();
            const timeRemaining = Math.max(0, Math.floor((lobbyData.gameState.phaseEndsAt - now) / 1000));
            setTimeLeft(timeRemaining);
          } else {
            setTimeLeft(0);
          }

          // Handle automatic phase transitions
          handlePhaseTransition(lobbyData.gameState);
        } else {
          console.log('No lobby data received, setting disconnected');
          setConnected(false);
        }
      });

      cleanupRef.current = unsubscribe;
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize lobby:', error);
      setLoading(false);
      setConnected(false);
    }
  };

  const handlePhaseTransition = (gameState) => {
    if (!gameState) return;

    // Phase transitions are handled by the game service automatically
    // This function can be used for client-side state updates if needed
  };

  const findHighestBidder = (gameState) => {
    if (!gameState?.bids) return null;
    
    let highestBid = 0;
    let highestBidder = null;
    
    Object.entries(gameState.bids).forEach(([playerId, bid]) => {
      if (bid > highestBid) {
        highestBid = bid;
        highestBidder = playerId;
      }
    });
    
    return highestBidder;
  };

  const getPhaseTitle = () => {
    switch (gameState?.phase) {
      case Phase.LOBBY:
        return 'Game Lobby';
      case Phase.BIDDING:
        return 'Bidding Phase';
      case Phase.LISTING:
        return 'Listing Phase';
      case Phase.SUMMARY:
        return 'Round Summary';
      case Phase.ENDED:
        return 'Game Complete';
      default:
        return 'LiveCategories';
    }
  };

  const getPhaseDescription = () => {
    switch (gameState?.phase) {
      case Phase.LOBBY:
        return 'Waiting for players to join...';
      case Phase.BIDDING:
        return 'Place your bid on how many items you can list';
      case Phase.LISTING:
        return `List ${gameState?.currentBid || 0} valid items`;
      case Phase.SUMMARY:
        return 'Round results';
      case Phase.ENDED:
        return 'Final game results';
      default:
        return 'Multiplayer category listing game';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer component for all phases
  const Timer = ({ title = "Time Remaining", maxTime = 60, className = "" }) => {
    if (timeLeft <= 0) return null;
    
    return (
      <div className={`bg-orange-50 border border-orange-100 rounded-4xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <span className={`text-lg font-bold ${
            isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.max(0, (timeLeft / maxTime) * 100)}%` 
            }}
          ></div>
        </div>
      </div>
    );
  };

  const handleStartGame = async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      await gameService.startGame(currentLobbyCode, user.id);
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleSubmitBid = async () => {
    if (!bidInput || isNaN(bidInput) || parseInt(bidInput) < 1) return;
    
    try {
      const currentLobbyCode = lobbyCode || code;
      const bidValue = parseInt(bidInput);
      await gameService.placeBid(currentLobbyCode, user.id, bidValue);
      setCurrentBid(bidValue);
      setBidInput('');
    } catch (error) {
      console.error('Failed to submit bid:', error);
    }
  };

  const handlePassBid = async () => {
    try {
      const currentLobbyCode = lobbyCode || code;
      await gameService.passBid(currentLobbyCode, user.id);
    } catch (error) {
      console.error('Failed to pass bid:', error);
    }
  };

  const handleSubmitItem = async () => {
    if (!itemInput.trim()) return;
    
    try {
      setSubmissionAnimation(true);
      const currentLobbyCode = lobbyCode || code;
      
      console.log(`Submitting item: "${itemInput.trim()}" to lobby: ${currentLobbyCode}`);
      console.log(`Current user ID: ${user?.id}`);
      console.log(`Game state:`, gameState);
      
      const result = await gameService.submitItem(currentLobbyCode, user.id, itemInput.trim());
      setLastSubmissionResult(result.valid);
      setLastItem(itemInput.trim());
      setItemInput('');
      
      console.log(`Submission result:`, result);
      
      // Clear animation after delay
      setTimeout(() => {
        setSubmissionAnimation(false);
        setLastSubmissionResult(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit item:', error);
      console.error('Error message:', error.message);
      setSubmissionAnimation(false);
      
      // Show error to user
      alert(`Error: ${error.message}`);
    }
  };

  const copyLobbyCode = () => {
    const currentLobbyCode = lobbyCode || code;
    if (currentLobbyCode) {
      navigator.clipboard.writeText(currentLobbyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayAgain = async () => {
    try {
      // Create a new lobby with the same category instead of resetting current one
      const currentCategory = lobbyData?.category;
      if (!currentCategory) {
        console.error('No category found, redirecting to home');
        router.push('/');
        return;
      }

      console.log('Creating new lobby for category:', currentCategory);
      
      const response = await fetch(`/api/lobby/create?category=${encodeURIComponent(currentCategory)}&best_of=5`);
      if (!response.ok) {
        throw new Error('Failed to create new lobby');
      }
      
      const data = await response.json();
      console.log('New lobby created:', data);
      
      // Navigate to the new lobby
      router.push(`/lobby?code=${data.lobbyCode}`);
    } catch (error) {
      console.error('Failed to create new lobby:', error);
      // Fallback to home page
      router.push('/');
    }
  };

  const handleBackToCategories = () => {
    router.push('/');
  };

  // Loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center font-rubik pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
        <motion.div 
          className="glass-card text-center p-8"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-xl text-gray-600">Loading game...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (!connected && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-rubik pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
        <div className="glass-card rounded-4xl text-center p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">Could not connect to the game lobby</p>
          <button 
            onClick={handleBackToCategories}
            className="glass-button px-6 py-3 text-gray-300 hover:text-gray-100"
          >
            Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-rubik pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-orange-50 rounded-4xl shadow-lg p-8">
          {/* Header with status indicators */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800">
                {getPhaseTitle()}
              </h1>
              <p className="text-gray-600 text-sm sm:text-lg">{getPhaseDescription()}</p>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Connection Status */}
              <div className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                connected ? 'glass-button-accent' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{connected ? 'Connected' : 'Disconnected'}</span>
              </div>

              {/* Player Count */}
              {lobbyData && (
                <div className="glass-button flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-gray-300">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{Object.keys(lobbyData.players || {}).length}/2</span>
                </div>
              )}

              {/* Timer */}
              {timeLeft > 0 && (
                <div className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${
                  isCritical ? 'bg-red-100 text-red-700' : 
                  isWarning ? 'bg-yellow-100 text-yellow-700' : 
                  'glass-button-accent'
                }`}>
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>
          {/* Lobby Phase */}
          {gameState?.phase === Phase.LOBBY && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Category */}
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <Target className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="font-bold text-gray-800 uppercase">
                    {lobbyData?.category || 'Loading...'}
                  </p>
                </div>

                {/* Lobby Code */}
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <button 
                    onClick={copyLobbyCode}
                    className="w-full hover:bg-orange-100 rounded-4xl transition-colors"
                  >
                    <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 mb-1">Lobby Code</p>
                    <p className="font-bold text-gray-800 text-lg">
                      {copied ? 'Copied!' : (lobbyCode || code || 'N/A')}
                    </p>
                  </button>
                </div>

                {/* Players */}
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">Players</p>
                  <p className="font-bold text-gray-800">
                    {Object.keys(lobbyData?.players || {}).length}/2
                  </p>
                </div>
              </div>

              {/* Player List */}
              <div className="space-y-2 mb-6">
                <h3 className="font-semibold text-gray-700">Players in Lobby:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(lobbyData?.players || {}).map(([playerId, player]) => (
                    <div key={playerId} className="bg-orange-50 border border-orange-100 rounded-4xl p-3 flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        player.connected ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm text-gray-700 truncate">{player.username || player.displayName || player.display_name || player.name}</span>
                      {playerId === lobbyData?.host && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Game Button (Host Only) */}
              {user?.id === lobbyData?.host && (
                <button
                  onClick={handleStartGame}
                  disabled={Object.keys(lobbyData?.players || {}).length < 2}
                  className={`w-full py-4 px-6 rounded-4xl text-white font-bold text-lg transition-all ${
                    Object.keys(lobbyData?.players || {}).length < 2
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <Play className="w-5 h-5 inline mr-2" />
                  Start Game
                </button>
              )}

              {/* Waiting Message (Non-Host) */}
              {user?.id !== lobbyData?.host && (
                <div className="text-center p-6 bg-orange-50 border border-orange-100 rounded-4xl">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">Waiting for host to start the game...</p>
                </div>
              )}
            </div>
          )}

          {/* Bidding Phase */}
          {gameState?.phase === Phase.BIDDING && (
            <div className="space-y-6">
              {/* Timer Bar */}
              <Timer title="Bidding Time Remaining" maxTime={30} />

              <div className="text-center mb-6">
                <p className="text-gray-600">
                  How many valid <span className="font-semibold uppercase">{lobbyData?.category}</span> items can you list?
                </p>
              </div>

              {/* Current Round Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <Target className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="font-bold text-gray-800 uppercase">{lobbyData?.category}</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">Your Bid</p>
                  <p className="font-bold text-gray-800 text-xl">
                    {gameState?.bids?.[user?.id] || 'No bid'}
                  </p>
                </div>
                
                <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                  <Trophy className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-1">Highest Bid</p>
                  <p className="font-bold text-gray-800 text-xl">
                    {Math.max(...Object.values(gameState?.bids || {}), 0)}
                  </p>
                </div>
              </div>

              {/* Current Bids Display */}
              <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">Current Bids:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(gameState?.bids || {}).map(([playerId, bid]) => {
                    const player = lobbyData?.players?.[playerId];
                    return (
                      <div key={playerId} className="flex justify-between items-center p-2 bg-white rounded-lg">
                        <span className="text-sm text-gray-700">{player?.username || player?.displayName || player?.display_name || player?.name || 'Unknown'}</span>
                        <span className="font-bold text-gray-800">{bid}</span>
                      </div>
                    );
                  })}
                  {Object.keys(gameState?.bids || {}).length === 0 && (
                    <p className="text-gray-500 text-center col-span-2">No bids yet</p>
                  )}
                </div>
              </div>

              {/* Bidding Interface */}
              <div className="max-w-md mx-auto">
                <div className="flex space-x-2 mb-4">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitBid()}
                    placeholder="Enter your bid..."
                    className="flex-1 px-4 py-3 bg-white border border-orange-200 rounded-4xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    onClick={handleSubmitBid}
                    disabled={!bidInput || isNaN(bidInput) || parseInt(bidInput) < 1}
                    className="bg-blue-500 hover:bg-blue-600 px-6 py-3 text-white font-semibold rounded-4xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Pass Button */}
                <div className="text-center">
                  <button
                    onClick={handlePassBid}
                    className="bg-orange-100 hover:bg-orange-200 px-8 py-3 text-gray-700 font-semibold rounded-4xl transition-colors border border-orange-200"
                  >
                    Pass
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Listing Phase */}
          {gameState?.phase === Phase.LISTING && (
            <div className="space-y-6">
              {/* Timer Bar */}
              <Timer title="Listing Time Remaining" maxTime={30} />
              
              {/* Check if current user is the lister */}
              {gameState?.listerId === user?.id ? (
                // Active lister view
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <p className="text-gray-600">
                      List <span className="font-bold">{gameState?.currentBid}</span> valid{' '}
                      <span className="font-semibold uppercase">{lobbyData?.category}</span> items
                    </p>
                  </div>

                  {/* Progress Display */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                      <Target className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 mb-1">Target Items</p>
                      <p className="font-bold text-gray-800 text-xl">{gameState?.currentBid}</p>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      <p className="text-sm text-gray-500 mb-1">Valid Items</p>
                      <p className="font-bold text-green-600 text-xl">
                        {gameState?.validItems?.[user?.id]?.length || 0}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center">
                      <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                      <p className="text-sm text-gray-500 mb-1">Invalid Items</p>
                      <p className="font-bold text-red-600 text-xl">
                        {gameState?.invalidItems?.[user?.id]?.length || 0}
                      </p>
                      </div>
                    </div>

                    {/* Item Input */}
                    <div className="max-w-md mx-auto mb-6">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={itemInput}
                          onChange={(e) => setItemInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmitItem()}
                          placeholder={`Enter a ${lobbyData?.category || 'category'} item...`}
                          className="flex-1 px-4 py-3 glass-button text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          onClick={handleSubmitItem}
                          disabled={!itemInput.trim()}
                          className="glass-button-accent px-6 py-3 text-white font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Last Submission Result */}
                    {submissionAnimation && lastSubmissionResult !== null && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className={`max-w-md mx-auto p-4 rounded-4xl text-center font-bold ${
                          lastSubmissionResult 
                            ? 'bg-green-100 text-green-700 border border-green-300' 
                            : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                      >
                        {lastSubmissionResult ? (
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>Valid item!</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <XCircle className="w-5 h-5" />
                            <span>Invalid item</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Submitted Items Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Valid Items */}
                      <div>
                        <h3 className="font-semibold text-green-700 mb-3 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Valid Items ({gameState?.validItems?.[user?.id]?.length || 0})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {(gameState?.validItems?.[user?.id] || []).map((item, index) => (
                            <div key={index} className="bg-orange-50 border border-orange-100 rounded-4xl p-3 text-gray-700">
                              {item}
                            </div>
                          ))}
                          {(!gameState?.validItems?.[user?.id] || gameState.validItems[user.id].length === 0) && (
                            <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center text-gray-500">
                              No valid items yet
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invalid Items */}
                      <div>
                        <h3 className="font-semibold text-red-700 mb-3 flex items-center">
                          <XCircle className="w-4 h-4 mr-2" />
                          Invalid Items ({gameState?.invalidItems?.[user?.id]?.length || 0})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {(gameState?.invalidItems?.[user?.id] || []).map((item, index) => (
                            <div key={index} className="bg-orange-50 border border-orange-100 rounded-4xl p-3 text-gray-700">
                              {item}
                            </div>
                          ))}
                          {(!gameState?.invalidItems?.[user?.id] || gameState.invalidItems[user.id].length === 0) && (
                            <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4 text-center text-gray-500">
                              No invalid items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </div>
              ) : (
                // Waiting view for non-lister
                <div className="text-center space-y-6">
                  <div className="glass-card p-8 max-w-md mx-auto">
                    <Clock className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Listing Phase</h2>
                    <p className="text-gray-600 mb-4">
                      Place your bid on how many items you can list
                    </p>
                    <p className="text-gray-600">
                      How many items can you list from <span className="font-bold uppercase">{lobbyData?.category || 'Loading...'}</span>?
                    </p>
                    
                    <div className="mt-6">
                      <div className="bg-orange-50 border border-orange-100 rounded-4xl p-4">
                        <p className="text-lg font-semibold text-gray-700">
                          Waiting for {(() => {
                            const listerPlayer = Object.entries(lobbyData?.players || {}).find(([id, _]) => id === gameState?.listerId);
                            return listerPlayer ? (listerPlayer[1]?.username || listerPlayer[1]?.displayName || listerPlayer[1]?.display_name || listerPlayer[1]?.email?.split('@')[0] || 'player') : 'player';
                          })()} to submit items...
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          They need to list <span className="font-bold">{gameState?.currentBid}</span> items from the category
                        </p>
                        
                        <div className="mt-4 text-center">
                          <div className="text-2xl font-bold text-gray-700">
                            {gameState?.submittedItems?.filter(item => item.isValid).length || 0} / {gameState?.currentBid}
                          </div>
                          <p className="text-sm text-gray-600">Items submitted so far</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Summary Phase */}
        {gameState?.phase === Phase.SUMMARY && (
          <div className="space-y-6">
            {/* Timer Bar */}
            <Timer title="Next Round Starting In" maxTime={10} />
            
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Round Summary</h2>
              
              {/* Winner Announcement */}
              {gameState?.roundWinner && (
                <div className="text-center mb-6 p-6 glass-button-accent rounded-4xl">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {lobbyData?.players?.[gameState.roundWinner]?.name || 'Unknown'} Wins the Round!
                  </h3>
                  <p className="text-gray-600">
                    Met their bid of {gameState?.roundWinnerBid} items
                  </p>
                </div>
              )}

              {/* Player Results */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Player Results:</h3>
                {Object.entries(lobbyData?.players || {}).map(([playerId, player]) => {
                  const bid = gameState?.bids?.[playerId] || 0;
                  const validCount = gameState?.validItems?.[playerId]?.length || 0;
                  const metBid = validCount >= bid && bid > 0;
                  
                  return (
                    <div key={playerId} className="glass-button p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{player.name}</p>
                          <p className="text-sm text-gray-600">
                            Bid: {bid} | Valid: {validCount} | {metBid ? 'Success' : 'Failed'}
                          </p>
                        </div>
                        {metBid && (
                          <Trophy className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue Button */}
              {user?.uid === lobbyData?.host && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => gameService.startNextRound(lobbyCode || code)}
                    className="glass-button-accent px-8 py-4 text-white font-bold rounded-4xl hover:bg-blue-600 transition-colors"
                  >
                    Continue to Next Round
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game End Phase */}
        {gameState?.phase === Phase.ENDED && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Game Complete!</h2>
                <p className="text-gray-600">Great job everyone!</p>
              </div>

              {/* Winner Announcement */}
              {gameState?.winner && (
                <div className="text-center mb-8 p-8 glass-button-accent rounded-4xl">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {lobbyData?.players?.[gameState.winner]?.name || 'Unknown'} Wins!
                  </h3>
                  <p className="text-lg text-gray-600">
                    Final Score: {gameState?.finalScores?.[gameState.winner] || 0} points
                  </p>
                </div>
              )}

              {/* Final Results */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-center text-gray-800 mb-6">Final Results</h3>
                <div className="space-y-3">
                  {Object.entries(lobbyData?.players || {})
                    .map(([playerId, player]) => ({
                      playerId,
                      player,
                      score: gameState?.finalScores?.[playerId] || 0
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ playerId, player, score }, index) => (
                      <div key={playerId} className={`glass-button p-4 ${index === 0 ? 'border-2 border-yellow-400' : ''}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-800' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-300 text-orange-700' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-semibold text-gray-800">{player.name}</span>
                          </div>
                          <span className="text-xl font-bold text-gray-800">{score}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Game Summary Stats */}
              <div className="glass-button-accent p-6 rounded-4xl mb-8">
                <h3 className="text-lg font-bold text-center text-gray-800 mb-4">Game Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="glass-button p-4">
                      <Target className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 mb-1">Category</p>
                      <p className="font-bold text-gray-800 uppercase">{lobbyData?.category}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="glass-button p-4">
                      <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 mb-1">High Bid</p>
                      <p className="font-bold text-gray-800">{gameState?.highestBid || 0}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="glass-button p-4">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 mb-1">Items Listed</p>
                      <p className="font-bold text-gray-800">{gameState?.totalItemsListed || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <h3 className="text-center text-lg font-semibold text-gray-700">What would you like to do next?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handlePlayAgain}
                    className="glass-button-accent px-6 py-4 text-white font-semibold rounded-4xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Play New Game (Same Category)</span>
                  </button>
                  <button
                    onClick={handleBackToCategories}
                    className="glass-button px-6 py-4 text-gray-300 hover:text-gray-100 font-semibold rounded-4xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <Target className="w-5 h-5" />
                    <span>Back to Categories (Default)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Contest Phase */}
        {gameState?.phase === Phase.NO_CONTEST && (
          <div className="space-y-6">
            <div className="glass-card p-6 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Contest</h2>
              <p className="text-gray-600 mb-8">
                Not enough players participated in this round. The game will continue with the next round.
              </p>
              
              {user?.uid === lobbyData?.host && (
                <button
                  onClick={() => gameService.startNextRound(lobbyCode || code)}
                  className="glass-button-accent px-8 py-4 text-white font-bold rounded-4xl hover:bg-blue-600 transition-colors"
                >
                  Continue Game
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-rubik pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
        <div className="glass-card rounded-4xl text-center p-8">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LobbyPageContent />
    </Suspense>
  );
}
