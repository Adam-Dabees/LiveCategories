// Example: How to use the Firestore functions after a game ends

import { updateUserStats, saveGameResult, checkAchievements } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';

// Example function to call when a game ends
export const handleGameEnd = async (gameData) => {
  const { user } = useAuth();
  
  if (!user) return;

  try {
    // 1. Save the game result
    const gameResult = await saveGameResult({
      userId: user.id,
      category: gameData.category,
      score: gameData.score,
      won: gameData.won,
      duration: gameData.duration, // in seconds
      difficulty: gameData.difficulty,
      questions: gameData.questions, // array of questions and answers
      lobbyCode: gameData.lobbyCode // if multiplayer
    });

    // 2. Update user statistics
    const statsResult = await updateUserStats(user.id, gameData);
    
    if (statsResult.success) {
      // 3. Check for new achievements
      const newAchievements = await checkAchievements(user.id, statsResult.data);
      
      // 4. Show achievement notifications if any
      if (newAchievements.length > 0) {
        showAchievementNotifications(newAchievements);
      }
    }

    console.log('Game data saved successfully!');
  } catch (error) {
    console.error('Error saving game data:', error);
  }
};

// Example achievement notification function
const showAchievementNotifications = (achievements) => {
  achievements.forEach(achievement => {
    const achievementData = {
      first_win: { title: 'First Win!', description: 'Win your first game' },
      streak_master: { title: 'Streak Master!', description: 'Win 5 games in a row' },
      century_club: { title: 'Century Club!', description: 'Score 100+ total points' },
      veteran: { title: 'Veteran!', description: 'Play 50+ games' }
    };
    
    const data = achievementData[achievement];
    if (data) {
      // Show notification (you can use a toast library or custom notification)
      console.log(`🏆 Achievement Unlocked: ${data.title} - ${data.description}`);
    }
  });
};

// Example usage in a game component:
/*
const GameComponent = () => {
  const endGame = async (finalScore, won) => {
    const gameData = {
      category: 'Fruits',
      score: finalScore,
      won: won,
      duration: 120, // 2 minutes
      difficulty: 'medium',
      questions: [
        { question: 'Apple', answer: 'Red fruit', correct: true },
        // ... more questions
      ]
    };
    
    await handleGameEnd(gameData);
    
    // Navigate to results page or home
    router.push('/');
  };
  
  return (
    // Your game UI
  );
};
*/
