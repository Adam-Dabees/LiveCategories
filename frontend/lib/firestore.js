import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  arrayUnion,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// Create or update user profile
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Get user statistics
export const getUserStats = async (userId) => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return { success: true, data: statsSnap.data() };
    } else {
      // Create initial stats if they don't exist
      const initialStats = {
        totalGames: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        averageScore: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        favoriteCategory: null,
        categoriesPlayed: [],
        achievements: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(statsRef, initialStats);
      return { success: true, data: initialStats };
    }
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { success: false, error: error.message };
  }
};

// Update user statistics after a game
export const updateUserStats = async (userId, gameData) => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    let currentStats = {};
    if (statsSnap.exists()) {
      currentStats = statsSnap.data();
    }

    const isWin = gameData.won;
    const newTotalGames = (currentStats.totalGames || 0) + 1;
    const newGamesWon = (currentStats.gamesWon || 0) + (isWin ? 1 : 0);
    const newWinRate = (newGamesWon / newTotalGames) * 100;
    const newTotalScore = (currentStats.totalScore || 0) + gameData.score;
    const newAverageScore = newTotalScore / newTotalGames;
    
    // Update win streak
    let newCurrentStreak = 0;
    let newLongestStreak = currentStats.longestWinStreak || 0;
    
    if (isWin) {
      newCurrentStreak = (currentStats.currentWinStreak || 0) + 1;
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
    } else {
      newCurrentStreak = 0;
    }

    // Update category tracking
    const categoriesPlayed = currentStats.categoriesPlayed || [];
    const categoryIndex = categoriesPlayed.findIndex(c => c.name === gameData.category);
    
    if (categoryIndex >= 0) {
      categoriesPlayed[categoryIndex].games += 1;
      if (isWin) categoriesPlayed[categoryIndex].wins += 1;
    } else {
      categoriesPlayed.push({
        name: gameData.category,
        games: 1,
        wins: isWin ? 1 : 0
      });
    }

    // Find favorite category (most played)
    const favoriteCategory = categoriesPlayed.reduce((prev, current) => 
      (prev.games > current.games) ? prev : current
    );

    const updateData = {
      totalGames: newTotalGames,
      gamesWon: newGamesWon,
      winRate: Math.round(newWinRate * 10) / 10, // Round to 1 decimal
      totalScore: newTotalScore,
      averageScore: Math.round(newAverageScore * 10) / 10,
      longestWinStreak: newLongestStreak,
      currentWinStreak: newCurrentStreak,
      favoriteCategory: favoriteCategory.name,
      categoriesPlayed: categoriesPlayed,
      updatedAt: serverTimestamp()
    };

    await setDoc(statsRef, updateData, { merge: true });
    return { success: true, data: updateData };
  } catch (error) {
    console.error('Error updating user stats:', error);
    return { success: false, error: error.message };
  }
};

// Save game result
export const saveGameResult = async (gameData) => {
  try {
    const gamesRef = collection(db, 'games');
    const gameDoc = await addDoc(gamesRef, {
      ...gameData,
      timestamp: serverTimestamp()
    });
    
    return { success: true, gameId: gameDoc.id };
  } catch (error) {
    console.error('Error saving game result:', error);
    return { success: false, error: error.message };
  }
};

// Get user's recent games
export const getUserRecentGames = async (userId, limitCount = 10) => {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const games = [];
    querySnapshot.forEach((doc) => {
      games.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: games };
  } catch (error) {
    console.error('Error getting recent games:', error);
    return { success: false, error: error.message };
  }
};

// Add achievement to user
export const addAchievement = async (userId, achievement) => {
  try {
    const statsRef = doc(db, 'userStats', userId);
    await updateDoc(statsRef, {
      achievements: arrayUnion(achievement),
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error adding achievement:', error);
    return { success: false, error: error.message };
  }
};

// Check and award achievements
export const checkAchievements = async (userId, stats) => {
  const newAchievements = [];
  
  // First Win achievement
  if (stats.gamesWon === 1 && !stats.achievements?.includes('first_win')) {
    newAchievements.push('first_win');
  }
  
  // Streak Master achievement (5 wins in a row)
  if (stats.currentWinStreak >= 5 && !stats.achievements?.includes('streak_master')) {
    newAchievements.push('streak_master');
  }
  
  // Century Club achievement (100+ total score)
  if (stats.totalScore >= 100 && !stats.achievements?.includes('century_club')) {
    newAchievements.push('century_club');
  }
  
  // Veteran achievement (50+ games)
  if (stats.totalGames >= 50 && !stats.achievements?.includes('veteran')) {
    newAchievements.push('veteran');
  }
  
  // Award new achievements
  for (const achievement of newAchievements) {
    await addAchievement(userId, achievement);
  }
  
  return newAchievements;
};
