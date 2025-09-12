'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getUserStats } from '../../lib/firestore';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Award, 
  BarChart3,
  Calendar,
  Star,
  Zap
} from 'lucide-react';

export default function ProfilePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const result = await getUserStats(user.id);
      if (result.success) {
        // Convert Firestore field names to match your UI
        const firestoreStats = result.data;
        setStats({
          total_games: firestoreStats.totalGames || 0,
          games_won: firestoreStats.gamesWon || 0,
          win_rate: firestoreStats.winRate || 0,
          total_score: firestoreStats.totalScore || 0,
          average_score: firestoreStats.averageScore || 0,
          longest_win_streak: firestoreStats.longestWinStreak || 0,
          current_win_streak: firestoreStats.currentWinStreak || 0,
          favorite_category: firestoreStats.favoriteCategory || null
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  const statCards = [
    {
      title: 'Total Games',
      value: stats?.total_games || 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Games Won',
      value: stats?.games_won || 0,
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Win Rate',
      value: `${stats?.win_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Score',
      value: stats?.total_score || 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Average Score',
      value: stats?.average_score || 0,
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Current Streak',
      value: stats?.current_win_streak || 0,
      icon: Zap,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user.display_name || user.username}'s Statistics
            </h1>
            <p className="text-gray-600">
              Track your performance and achievements
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Longest Win Streak */}
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Longest Win Streak
                </h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats?.longest_win_streak || 0}
                </p>
                <p className="text-sm text-gray-600">
                  Consecutive victories
                </p>
              </div>
            </div>
          </div>

          {/* Favorite Category */}
          <div className="card p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Favorite Category
                </h3>
                <p className="text-xl font-bold text-purple-600">
                  {stats?.favorite_category || 'None yet'}
                </p>
                <p className="text-sm text-gray-600">
                  Most played category
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'First Win', description: 'Win your first game', unlocked: (stats?.games_won || 0) > 0 },
              { name: 'Streak Master', description: 'Win 5 games in a row', unlocked: (stats?.longest_win_streak || 0) >= 5 },
              { name: 'Century Club', description: 'Score 100+ total points', unlocked: (stats?.total_score || 0) >= 100 },
              { name: 'Veteran', description: 'Play 50+ games', unlocked: (stats?.total_games || 0) >= 50 },
            ].map((achievement, index) => (
              <motion.div
                key={achievement.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${
                  achievement.unlocked
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    achievement.unlocked ? 'bg-yellow-400' : 'bg-gray-300'
                  }`}>
                    <Trophy className={`w-4 h-4 ${
                      achievement.unlocked ? 'text-white' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${
                      achievement.unlocked ? 'text-yellow-800' : 'text-gray-500'
                    }`}>
                      {achievement.name}
                    </h4>
                    <p className={`text-sm ${
                      achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
