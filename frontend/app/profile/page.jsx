'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserState, getUserStats } from '../../lib/firestore';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Award, 
  Calendar,
  BarChart3,
  Star,
  Zap,
  Crown,
  Medal,
  Flame,
  Gamepad2,
  User
} from 'lucide-react';

const achievementIcons = {
  first_win: Trophy,
  streak_master: Flame,
  century_club: Target,
  veteran: Medal,
  category_expert: Star,
  speed_demon: Zap,
  perfectionist: Award,
  social_butterfly: Crown
};

const achievementNames = {
  first_win: 'First Victory',
  streak_master: 'Streak Master',
  century_club: 'Century Club',
  veteran: 'Veteran',
  category_expert: 'Category Expert',
  speed_demon: 'Speed Demon',
  perfectionist: 'Perfectionist',
  social_butterfly: 'Social Butterfly'
};

const achievementDescriptions = {
  first_win: 'Win your first game',
  streak_master: 'Win 5 games in a row',
  century_club: 'Score 100+ total points',
  veteran: 'Play 50+ games',
  category_expert: 'Win 10 games in one category',
  speed_demon: 'List 20+ items in 30 seconds',
  perfectionist: 'Get 100% accuracy in a game',
  social_butterfly: 'Play 50+ games'
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user stats
      const statsResult = await getUserStats(user.id);
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen font-rubik flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
        <div className="glass-card rounded-4xl p-8">
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8"
            >
              <User className="w-full h-full text-gray-600" />
            </motion.div>
            <p className="text-gray-700 text-lg">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen font-rubik flex items-center justify-center pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
        <div className="glass-card rounded-4xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load your profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-rubik py-8 pt-14" style={{ background: 'linear-gradient(135deg, #FFE6CB 0%, #CBE4FF 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'Player'}!
          </h1>
          <p className="text-xl text-gray-600">Your gaming journey and achievements</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6 fade-in-up stagger-1"
          >
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-4xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Games</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalGames || 0}</p>
                  </div>
                  <div className="glass-button rounded-4xl p-3">
                    <Gamepad2 className="w-6 h-6 text-gray-700" />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-4xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Games Won</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.gamesWon || 0}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-4xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Win Rate</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.winRate || 0}%</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Target className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

            </div>

            {/* Streaks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-4xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-100">Current Streak</p>
                    <p className="text-3xl font-bold">{stats.currentWinStreak || 0}</p>
                  </div>
                  <Flame className="w-8 h-8 text-orange-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-4xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100">Best Streak</p>
                    <p className="text-3xl font-bold">{stats.longestWinStreak || 0}</p>
                  </div>
                  <Crown className="w-8 h-8 text-blue-200" />
                </div>
              </div>
            </div>

            {/* Category Performance */}
            {stats.categoriesPlayed && stats.categoriesPlayed.length > 0 && (
              <div className="bg-white rounded-4xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Category Performance</h3>
                <div className="space-y-3">
                  {stats.categoriesPlayed.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800 capitalize">{category.name}</p>
                        <p className="text-sm text-gray-600">{category.games} games, {category.wins} wins</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">
                          {category.games > 0 ? Math.round((category.wins / category.games) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-600">win rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>

          {/* Achievements Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-4xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-500" />
                Achievements
              </h3>
              
              {stats.achievements && stats.achievements.length > 0 ? (
                <div className="space-y-3">
                  {stats.achievements.map((achievement, index) => {
                    const IconComponent = achievementIcons[achievement] || Award;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                      >
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <IconComponent className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {achievementNames[achievement] || achievement}
                          </p>
                          <p className="text-sm text-gray-600">
                            {achievementDescriptions[achievement] || 'Achievement unlocked!'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No achievements yet</p>
                  <p className="text-sm text-gray-400">Keep playing to unlock achievements!</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-4xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-100">Favorite Category</span>
                  <span className="font-bold capitalize">
                    {(() => {
                      if (!stats.categoriesPlayed || stats.categoriesPlayed.length === 0) return 'None';
                      
                      // Find category with highest win percentage
                      let favorite = stats.categoriesPlayed[0];
                      let bestWinRate = favorite.games > 0 ? (favorite.wins / favorite.games) : 0;
                      
                      for (const category of stats.categoriesPlayed) {
                        const winRate = category.games > 0 ? (category.wins / category.games) : 0;
                        if (winRate > bestWinRate || (winRate === bestWinRate && category.games > favorite.games)) {
                          favorite = category;
                          bestWinRate = winRate;
                        }
                      }
                      
                      return favorite.name;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-100">Total Categories</span>
                  <span className="font-bold">{stats.categoriesPlayed?.length || 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
