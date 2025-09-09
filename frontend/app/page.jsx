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
  Hash
} from 'lucide-react';

const categoryIcons = {
  programming_languages: Code,
  countries: Globe,
  animals: Heart,
  fruits: Apple,
};

const categoryColors = {
  programming_languages: 'from-blue-500 to-blue-600',
  countries: 'from-green-500 to-green-600',
  animals: 'from-pink-500 to-pink-600',
  fruits: 'from-orange-500 to-orange-600',
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
      setCategories(response.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
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
        const result = await gameAPI.createLobby(selectedCategory.name);
        if (result.error) {
          console.error('Failed to create lobby:', result.error);
          return;
        }
        router.push(`/lobby?gameId=${result.game_id}&lobbyCode=${result.lobby_code}&category=${selectedCategory.name}`);
      } catch (error) {
        console.error('Failed to create lobby:', error);
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
    if (selectedCategory && lobbyCode.trim()) {
      try {
        setLoading(true);
        const result = await gameAPI.getGameByLobbyCode(lobbyCode.trim());
        if (result.error) {
          console.error('Lobby not found:', result.error);
          return;
        }
        router.push(`/lobby?gameId=${result.game_id}&lobbyCode=${result.lobby_code}&category=${result.category}`);
      } catch (error) {
        console.error('Failed to join lobby:', error);
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
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Choose Your Category
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8">
              Test your knowledge in real-time battles!
            </p>
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
            const IconComponent = categoryIcons[category.name] || Code;
            const colorClass = categoryColors[category.name] || 'from-gray-500 to-gray-600';
            
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategorySelect(category)}
                className="card p-6 cursor-pointer hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${colorClass} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.display_name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {category.description}
                </p>
                <div className="mt-4 flex items-center text-primary-600 group-hover:text-primary-700">
                  <Play className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Start Playing</span>
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
                {selectedCategory.display_name}
              </h3>
              <p className="text-gray-600">
                How would you like to play?
              </p>
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