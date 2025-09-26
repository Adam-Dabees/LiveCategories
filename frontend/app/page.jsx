'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { gameAPI } from '../lib/auth';
import { motion } from 'framer-motion';
import { 
  Code, 
  Globe, 
  Heart, 
  Apple, 
  Play, 
  Users, 
  Search,
  Plus,
  Hash,
  BookOpen,
  Film,
  Trophy,
  Gamepad2,
  Music,
  Car
} from 'lucide-react';

const categoryIcons = {
  music: Music,
  countries: Globe,
  animals: Heart,
  fruits: Apple,
  books: BookOpen,
  movies: Film,
  sports: Trophy,
  vehicles: Car,
  // Fallback for any new categories
  default: Gamepad2,
};

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showLobbyOptions, setShowLobbyOptions] = useState(false);
  const [lobbyCode, setLobbyCode] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Always load categories, regardless of login status
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await gameAPI.getCategories();
      // The API returns an array directly, not { categories: [...] }
      setCategories(response || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Set empty array on error so the UI still renders
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    if (!user) {
      // Show sign-in prompt for category selection
      const confirmed = window.confirm('You need to sign in to play! Would you like to sign in now?');
      if (confirmed) {
        router.push('/login');
      }
      return;
    }
    
    setSelectedCategory(category);
    setShowLobbyOptions(true);
  };

  const handleCreateLobby = async () => {
    if (selectedCategory) {
      try {
        setLoading(true);
        console.log('Creating lobby for category:', selectedCategory.name);
        const result = await gameAPI.createLobby(selectedCategory.name);
        console.log('Lobby creation result:', result);
        
        if (result.error) {
          console.error('Failed to create lobby:', result.error);
          alert(`Failed to create lobby: ${result.error}`);
          return;
        }
        
        if (!result.game_id || !result.lobby_code) {
          console.error('Invalid response from lobby creation:', result);
          alert('Invalid response from server. Please try again.');
          return;
        }
        
        console.log('Navigating to lobby:', result.game_id);
        router.push(`/lobby?gameId=${result.game_id}&lobbyCode=${result.lobby_code}&category=${selectedCategory.name}`);
      } catch (error) {
        console.error('Failed to create lobby:', error);
        alert(`Failed to create lobby: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleJoinRandom = async () => {
    if (!user) {
      const confirmed = window.confirm('You need to sign in to play! Would you like to sign in now?');
      if (confirmed) {
        router.push('/login');
      }
      return;
    }
    
    if (selectedCategory) {
      try {
        setLoading(true);
        const result = await gameAPI.joinRandomLobby(selectedCategory.name);
        if (result.error) {
          console.error('Failed to join lobby:', result.error);
          return;
        }
        router.push(`/lobby?gameId=${result.game_id}&lobbyCode=${result.lobby_code}&category=${selectedCategory.name}&action=${result.action}`);
      } catch (error) {
        console.error('Failed to join lobby:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleJoinWithCode = async () => {
    if (!user) {
      const confirmed = window.confirm('You need to sign in to play! Would you like to sign in now?');
      if (confirmed) {
        router.push('/login');
      }
      return;
    }
    
    if (lobbyCode.trim()) {
      try {
        setLoading(true);
        const result = await gameAPI.getGameByLobbyCode(lobbyCode.trim());
        if (result.error) {
          console.error('Lobby not found:', result.error);
          alert('Lobby not found. Please check the code and try again.');
          return;
        }
        
        // Navigate to lobby page - the lobby page will handle category detection
        if (result.category && result.category !== 'unknown') {
          router.push(`/lobby?lobbyCode=${result.lobby_code}&category=${result.category}`);
        } else {
          // For Firestore lobbies where category is unknown, let the lobby page figure it out
          router.push(`/lobby?lobbyCode=${result.lobby_code}`);
        }
      } catch (error) {
        console.error('Failed to join lobby:', error);
        alert('Failed to join lobby. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14">
        <div className="glass-card rounded-4xl p-8 fade-in-scale">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 glass-button rounded-4xl flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-gray-700" />
            </div>
            <p className="text-gray-700 text-lg font-medium">
              {loading ? 'Creating lobby...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-rubik pt-14">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1 
              className="text-4xl sm:text-6xl md:text-7xl font-black mb-6 text-gray-800 fade-in-up"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Choose Your
              <br />
              <span className="text-gray-600">Battle Arena</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-12 font-medium fade-in-up stagger-1"
            >
              Lightning-fast knowledge battles with friends
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row justify-center gap-4 mb-8 fade-in-up stagger-2"
            >
              <div className="glass-card rounded-4xl px-6 py-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-gray-700" />
                  <div>
                    <div className="text-lg font-bold text-gray-800">Real-time Multiplayer</div>
                    <div className="text-sm text-gray-600">Live battles with friends</div>
                  </div>
                </div>
              </div>
              
              <div className="glass-card rounded-4xl px-6 py-4">
                <div className="flex items-center space-x-3">
                  <Search className="w-6 h-6 text-gray-700" />
                  <div>
                    <div className="text-lg font-bold text-gray-800">Lightning Fast</div>
                    <div className="text-sm text-gray-600">Instant responses</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {categories.map((category, index) => {
            const IconComponent = categoryIcons[category.name] || categoryIcons.default;
            const categoryName = category.displayName || category.display_name || category.name;
            const categoryDesc = category.description || 'Test your knowledge!';
            
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCategorySelect(category)}
                className={`glass-card rounded-4xl p-6 cursor-pointer transition-all duration-300 group min-h-[200px] sm:min-h-[240px] flex flex-col justify-between fade-in-scale stagger-${Math.min(index + 1, 6)}`}
              >
                                <div className="text-center flex-1 flex flex-col justify-between">
                  <motion.div 
                    className="glass-button-accent rounded-4xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 group-hover:scale-105"
                    whileHover={{ rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-blue-700" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-800 transition-colors">
                      {categoryName}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-4 hidden sm:block">
                      {categoryDesc}
                    </p>
                  </div>
                  
                  <motion.div 
                    className="glass-button-accent rounded-4xl px-4 py-2 text-blue-700 group-hover:text-blue-800 transition-colors flex items-center justify-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Play className="w-4 h-4" />
                    <span className="font-medium text-sm">Start Playing</span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Lobby Options Modal */}
      {showLobbyOptions && selectedCategory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 sm:bg-black sm:bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowLobbyOptions(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card-dark rounded-4xl p-8 max-w-md w-full mx-4 fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 glass-button rounded-4xl flex items-center justify-center mx-auto mb-4">
                {(() => {
                  const IconComponent = categoryIcons[selectedCategory.name] || categoryIcons.default;
                  return <IconComponent className="w-8 h-8 text-gray-400" />;
                })()}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedCategory.displayName || selectedCategory.display_name || selectedCategory.name}
              </h3>
              <p className="text-gray-300 mb-4">
                How would you like to play?
              </p>
              <div className="glass-card rounded-4xl p-4">
                <div className="flex items-center justify-center space-x-2 text-gray-300">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Real-time multiplayer - See other players instantly!
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Create New Lobby */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateLobby}
                className="w-full glass-button text-gray-300 py-3 px-6 rounded-4xl font-medium flex items-center justify-center space-x-3"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create New Lobby</span>
              </motion.button>

              {/* Join Random */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRandom}
                className="w-full glass-button text-gray-300 py-3 px-6 rounded-4xl font-medium flex items-center justify-center space-x-3"
              >
                <Search className="w-5 h-5" />
                <span className="font-medium">Join Random Game</span>
              </motion.button>

              {/* Join with Code */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  placeholder="Enter lobby code"
                  className="w-full input-glass-dark"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinWithCode}
                  disabled={!lobbyCode.trim()}
                  className="w-full glass-button text-gray-300 py-3 px-6 rounded-4xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  <Hash className="w-5 h-5" />
                  <span className="font-medium">Join with Code</span>
                </motion.button>
              </div>
            </div>

            <motion.button
              onClick={() => setShowLobbyOptions(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-6 py-3 text-gray-300 hover:text-white transition-colors glass-button rounded-4xl"
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}