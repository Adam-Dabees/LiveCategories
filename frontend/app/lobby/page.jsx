'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentBid, setCurrentBid] = useState(1);
  const [bidInput, setBidInput] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [lastItem, setLastItem] = useState('');
  const [messages, setMessages] = useState([]);
  
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef(null);

  const category = searchParams.get('category');
  const action = searchParams.get('action');
  const code = searchParams.get('code');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (gameState?.phase_ends_at) {
      startTimer();
    }
  }, [gameState?.phase_ends_at]);

  const connectWebSocket = async () => {
    let gameId;
    
    // If we have a lobby code, try to join that game
    if (code) {
      try {
        const response = await fetch(`http://localhost:8001/lobby/${code}`);
        const data = await response.json();
        if (data.error) {
          console.error('Failed to join lobby:', data.error);
          router.push('/');
          return;
        }
        gameId = data.game_id;
      } catch (error) {
        console.error('Error joining lobby:', error);
        router.push('/');
        return;
      }
    } else if (action === 'join') {
      // For random join, we'll create a new game for now
      // In a real implementation, you'd want to find an existing lobby
      gameId = `game-${Date.now()}`;
    } else {
      // Create new game
      gameId = `game-${Date.now()}`;
    }
    
    const wsUrl = `ws://localhost:8001/ws/${gameId}?playerId=${user.id}&name=${user.username}`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleGameMessage(data);
    };

    websocket.onclose = () => {
      setConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
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
        addMessage(`New high bid: ${data.highBid} by ${data.highBidderId}`);
        break;
      case 'listing_update':
        setGameState(data.game);
        setLastItem(data.lastItem);
        addMessage(`Item submitted: ${data.lastItem} (${data.count}/${gameState?.highBid})`);
        break;
      case 'round_result':
        setGameState(data.game);
        addMessage(`Round complete! Winner: ${data.winnerId}, Hit: ${data.listerHit}`);
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
      if (gameState?.phase_ends_at) {
        const now = Date.now() / 1000;
        const timeLeft = Math.max(0, gameState.phase_ends_at - now);
        setTimeLeft(Math.ceil(timeLeft));

        if (timeLeft <= 5) {
          setIsCritical(true);
          setIsWarning(false);
        } else if (timeLeft <= 10) {
          setIsWarning(true);
          setIsCritical(false);
        } else {
          setIsCritical(false);
          setIsWarning(false);
        }

        if (timeLeft <= 0) {
          clearInterval(timerRef.current);
        }
      }
    }, 100);
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, { id: Date.now(), message, timestamp: new Date() }]);
  };

  const sendMessage = (type, data = {}) => {
    if (ws && connected) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  };

  const handleBid = () => {
    const bid = parseInt(bidInput);
    if (bid > currentBid) {
      sendMessage('place_bid', { n: bid });
      setBidInput('');
    }
  };

  const handlePass = () => {
    sendMessage('pass');
  };

  const handleSubmitItem = () => {
    if (itemInput.trim()) {
      sendMessage('submit_item', { text: itemInput.trim() });
      setItemInput('');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseTitle = () => {
    switch (gameState?.phase) {
      case Phase.LOBBY: return 'Waiting for Players...';
      case Phase.BIDDING: return 'Bidding Phase';
      case Phase.LISTING: return 'Item Submission';
      case Phase.SUMMARY: return 'Round Summary';
      case Phase.ENDED: return 'Game Ended';
      default: return 'Loading...';
    }
  };

  const getPhaseDescription = () => {
    switch (gameState?.phase) {
      case Phase.LOBBY: return 'Waiting for another player to join...';
      case Phase.BIDDING: return 'Place your bid or pass to end bidding';
      case Phase.LISTING: return 'Submit items from the category';
      case Phase.SUMMARY: return 'Round results are being calculated...';
      case Phase.ENDED: return 'The game has ended. Check the final scores!';
      default: return '';
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"
        />
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
              {timeLeft > 0 && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-lg ${
                  isCritical ? 'timer-critical bg-red-100' : 
                  isWarning ? 'timer-warning bg-orange-100' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {gameState.round || 1}
                  </div>
                  <div className="text-sm text-gray-600">Round</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {gameState.bestOf || 5}
                  </div>
                  <div className="text-sm text-gray-600">Best of</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {gameState.highBid || 0}
                  </div>
                  <div className="text-sm text-gray-600">High Bid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {gameState.listCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Items Listed</div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Category: {gameState.category?.replace('_', ' ').toUpperCase()}
                </h3>
                {gameState.lobbyCode && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">Lobby Code:</p>
                    <p className="text-2xl font-bold text-primary-600 font-mono">
                      {gameState.lobbyCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this code with friends to join!
                    </p>
                  </div>
                )}
                {gameState.highBidderId && (
                  <p className="text-gray-600">
                    High Bidder: {gameState.highBidderId}
                  </p>
                )}
              </div>
            </div>

            {/* Bidding Phase */}
            {gameState.phase === Phase.BIDDING && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Place Your Bid
                </h3>
                <div className="flex space-x-4">
                  <input
                    type="number"
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    placeholder="Enter bid amount"
                    className="flex-1 input-field"
                    min={currentBid + 1}
                  />
                  <button
                    onClick={handleBid}
                    disabled={!bidInput || parseInt(bidInput) <= currentBid}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Bid
                  </button>
                  <button
                    onClick={handlePass}
                    className="btn-secondary"
                  >
                    Pass
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Current high bid: {currentBid}. Enter a higher amount to bid.
                </p>
              </motion.div>
            )}

            {/* Listing Phase */}
            {gameState.phase === Phase.LISTING && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Submit Items
                </h3>
                {gameState.listerId === user.id ? (
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        value={itemInput}
                        onChange={(e) => setItemInput(e.target.value)}
                        placeholder="Enter item name"
                        className="flex-1 input-field"
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitItem()}
                      />
                      <button
                        onClick={handleSubmitItem}
                        disabled={!itemInput.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Progress: {gameState.listCount || 0} / {gameState.highBid || 1}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Waiting for {gameState.listerId} to submit items...
                    </p>
                    {lastItem && (
                      <p className="text-sm text-gray-500 mt-2">
                        Last item: {lastItem}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Summary Phase */}
            {gameState.phase === Phase.SUMMARY && (
              <motion.div
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Players ({Object.keys(gameState.players || {}).length})
              </h3>
              <div className="space-y-3">
                {Object.values(gameState.players || {}).map((player) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        player.connected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-gray-900">{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {gameState.scores?.[player.id] || 0}
                    </span>
                  </div>
                ))}
              </div>
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
