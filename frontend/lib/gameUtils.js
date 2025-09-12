// Utility functions for game integration with Firebase
import { saveGameResult, updateUserStats } from './firestore';

export const gameUtils = {
  // Save a completed game result to Firestore
  saveGame: async (userId, gameData) => {
    try {
      const result = await saveGameResult(userId, gameData);
      return result;
    } catch (error) {
      console.error('Error saving game:', error);
      return { success: false, error: error.message };
    }
  },

  // Calculate score based on correct answers and time
  calculateScore: (correctAnswers, totalQuestions, timeElapsed, difficulty = 'normal') => {
    const baseScore = correctAnswers * 10;
    const accuracyBonus = Math.round((correctAnswers / totalQuestions) * 50);
    
    // Time bonus (faster = higher bonus)
    const maxTimeBonus = 100;
    const timeBonus = Math.max(0, maxTimeBonus - Math.round(timeElapsed / 1000));
    
    // Difficulty multiplier
    const difficultyMultiplier = {
      easy: 0.8,
      normal: 1.0,
      hard: 1.3
    };
    
    const multiplier = difficultyMultiplier[difficulty] || 1.0;
    const totalScore = Math.round((baseScore + accuracyBonus + timeBonus) * multiplier);
    
    return Math.max(0, totalScore);
  },

  // Format game data for saving
  formatGameData: (category, correctAnswers, totalQuestions, timeElapsed, difficulty = 'normal') => {
    const score = gameUtils.calculateScore(correctAnswers, totalQuestions, timeElapsed, difficulty);
    
    return {
      category,
      score,
      correctAnswers,
      totalQuestions,
      duration: timeElapsed,
      difficulty,
      accuracy: Math.round((correctAnswers / totalQuestions) * 100)
    };
  },

  // Get performance rating based on score
  getPerformanceRating: (score, maxPossibleScore) => {
    const percentage = (score / maxPossibleScore) * 100;
    
    if (percentage >= 90) return { rating: 'Excellent', color: 'text-green-600' };
    if (percentage >= 75) return { rating: 'Great', color: 'text-blue-600' };
    if (percentage >= 60) return { rating: 'Good', color: 'text-yellow-600' };
    if (percentage >= 40) return { rating: 'Fair', color: 'text-orange-600' };
    return { rating: 'Needs Improvement', color: 'text-red-600' };
  },

  // Get achievement messages based on performance
  getAchievementMessages: (gameData, userStats) => {
    const messages = [];
    
    // Perfect score
    if (gameData.correctAnswers === gameData.totalQuestions) {
      messages.push({ type: 'perfect', message: 'Perfect Score! 🎯' });
    }
    
    // New personal best
    if (gameData.score > (userStats?.bestScore || 0)) {
      messages.push({ type: 'personal_best', message: 'New Personal Best! 🏆' });
    }
    
    // Streak achievements
    const newStreak = (userStats?.streak || 0) + (gameData.score > 0 ? 1 : 0);
    if (newStreak === 5) {
      messages.push({ type: 'streak', message: '5-Game Streak! 🔥' });
    } else if (newStreak === 10) {
      messages.push({ type: 'streak', message: '10-Game Streak! Unstoppable! ⚡' });
    }
    
    // Speed bonus
    const avgTimePerQuestion = gameData.duration / gameData.totalQuestions;
    if (avgTimePerQuestion < 3000) { // Less than 3 seconds per question
      messages.push({ type: 'speed', message: 'Lightning Fast! ⚡' });
    }
    
    return messages;
  }
};

export default gameUtils;
