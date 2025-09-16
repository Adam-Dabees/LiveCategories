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
  Gamepad2
} from 'lucide-react';

const categoryIcons = {
  programming_languages: Code,
  countries: Globe,
  animals: Heart,
  fruits: Apple,
  books: BookOpen,
  movies: Film,
  sports: Trophy,
  // Fallback for any new categories
  default: Gamepad2,
};

const categoryColors = {
  programming_languages: 'from-blue-500 via-blue-600 to-indigo-600',
  countries: 'from-green-500 via-emerald-600 to-teal-600',
  animals: 'from-pink-500 via-rose-600 to-red-500',
  fruits: 'from-orange-500 via-amber-600 to-yellow-500',
  books: 'from-purple-500 via-violet-600 to-fuchsia-600',
  movies: 'from-red-500 via-pink-600 to-rose-500',
  sports: 'from-yellow-500 via-orange-600 to-red-500',
  // Fallback for any new categories
  default: 'from-gray-500 via-gray-600 to-gray-700',
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
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      loadCategories();
    }
  }, [user, authLoading, router]);

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
          router.push(`/lobby?code=${result.lobby_code}&category=${result.category}`);
        } else {
          // For Firestore lobbies where category is unknown, let the lobby page figure it out
          router.push(`/lobby?code=${result.lobby_code}`);
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
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-l from-pink-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Main title with enhanced styling */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight">
                🎯 Choose Your
                <br />
                <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                  Battle Arena
                </span>
              </h1>
            </motion.div>
            
            {/* Subtitle with better styling */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-3xl text-blue-100 mb-12 font-semibold leading-relaxed"
            >
              ⚡ Lightning-fast knowledge battles with friends!
              <br />
              <span className="text-lg md:text-xl text-blue-200">
                Who's the ultimate category champion? 🏆
              </span>
            </motion.p>
            
            {/* Enhanced feature badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4 mb-8"
            >
              {/* Real-time Multiplayer Badge */}
              <div className="group relative">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl px-8 py-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Users className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <div className="text-lg font-bold text-white">Real-time Multiplayer</div>
                      <div className="text-sm text-green-100">Live battles with friends</div>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Lightning Fast Badge */}
              <div className="group relative">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl px-8 py-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-2xl">⚡</span>
                    </motion.div>
                    <div>
                      <div className="text-lg font-bold text-white">Lightning Fast</div>
                      <div className="text-sm text-yellow-100">Instant responses</div>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Brain Power Badge */}
              <div className="group relative">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl px-8 py-4 shadow-2xl border-2 border-white/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-2xl">🧠</span>
                    </motion.div>
                    <div>
                      <div className="text-lg font-bold text-white">Brain Power</div>
                      <div className="text-sm text-purple-100">Test your knowledge</div>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
              </div>
            </motion.div>
            
            {/* Call to action */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center"
            >
              <div className="inline-flex items-center space-x-2 text-blue-200 text-lg font-semibold">
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  👇
                </motion.span>
                <span>Scroll down to start your battle!</span>
                <motion.span
                  animate={{ x: [0, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  👇
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {categories.map((category, index) => {
            const IconComponent = categoryIcons[category.name] || categoryIcons.default;
            const colorClass = categoryColors[category.name] || categoryColors.default;
            const categoryName = category.displayName || category.display_name || category.name;
            const categoryDesc = category.description || 'Test your knowledge!';
            
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  rotateY: 2,
                  rotateX: 2
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCategorySelect(category)}
                className="relative overflow-hidden bg-white rounded-2xl p-8 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-0 group border border-gray-100"
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
              >
                {/* Background gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-0`}></div>
                
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-3 transition-opacity duration-0">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-0"></div>
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Icon with enhanced animation */}
                  <motion.div 
                    className={`w-20 h-20 bg-gradient-to-br ${colorClass} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-0 shadow-lg group-hover:shadow-xl`}
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <IconComponent className="w-10 h-10 text-white group-hover:scale-105 transition-transform duration-0" />
                  </motion.div>
                  
                  {/* Category name with better typography */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors duration-0 text-center">
                    {categoryName}
                  </h3>
                  
                  {/* Description with better styling */}
                  <div className="h-12 mb-6 flex items-center justify-center">
                    <p className="text-gray-600 text-base leading-relaxed group-hover:text-gray-700 transition-colors duration-0 text-center">
                      {categoryDesc}
                    </p>
                  </div>
                  
                  {/* Play button with enhanced animation */}
                  <div className="h-12 flex items-center justify-center">
                    <motion.div 
                      className="flex items-center justify-center space-x-3 text-primary-600 group-hover:text-primary-700 transition-colors duration-0"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <motion.div
                        className="w-10 h-10 bg-primary-100 group-hover:bg-primary-600 rounded-full flex items-center justify-center transition-all duration-0 flex-shrink-0"
                        whileHover={{ scale: 1.2 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <Play className="w-5 h-5 ml-0.5 text-primary-600 group-hover:text-white transition-colors duration-0" />
                      </motion.div>
                      <span className="font-bold text-lg text-center leading-none">Start Playing</span>
                      <motion.div
                        className="w-2 h-2 bg-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-0 flex-shrink-0"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      ></motion.div>
                    </motion.div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-0"></div>
                <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-0"></div>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowLobbyOptions(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedCategory.displayName || selectedCategory.display_name || selectedCategory.name}
              </h3>
              <p className="text-gray-600 mb-3">
                How would you like to play?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 text-blue-700">
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
                className="w-full p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center space-x-3 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create New Lobby</span>
              </motion.button>

              {/* Join Random */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRandom}
                className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center space-x-3 transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="font-medium">Join Random Game</span>
              </motion.button>

              {/* Join with Code */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  placeholder="Enter lobby code"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinWithCode}
                  disabled={!lobbyCode.trim()}
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center space-x-3 transition-colors"
                >
                  <Hash className="w-5 h-5" />
                  <span className="font-medium">Join with Code</span>
                </motion.button>
              </div>
            </div>

            <button
              onClick={() => setShowLobbyOptions(false)}
              className="w-full mt-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}