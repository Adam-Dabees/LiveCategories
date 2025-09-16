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
    console.log(`📊 Updating stats for user ${userId} with data:`, gameData);
    
    const statsRef = doc(db, 'userStats', userId);
    const statsSnap = await getDoc(statsRef);
    
    let currentStats = {};
    if (statsSnap.exists()) {
      currentStats = statsSnap.data();
      console.log(`📊 Current stats for ${userId}:`, currentStats);
    } else {
      console.log(`📊 No existing stats for ${userId}, creating new`);
    }

    const isWin = gameData.won;
    const newTotalGames = (currentStats.totalGames || 0) + 1;
    const newGamesWon = (currentStats.gamesWon || 0) + (isWin ? 1 : 0);
    const newWinRate = (newGamesWon / newTotalGames) * 100;
    const newTotalScore = (currentStats.totalScore || 0) + gameData.score;
    const newAverageScore = newTotalScore / newTotalGames;
    
    console.log(`📊 Calculated stats:`, { 
      isWin, 
      newTotalGames, 
      newGamesWon, 
      newWinRate, 
      newTotalScore, 
      newAverageScore 
    });
    
    // Update win streak
    let newCurrentStreak = 0;
    let newLongestStreak = currentStats.longestWinStreak || 0;
    const previousStreak = currentStats.currentWinStreak || 0;
    
    console.log(`📊 STREAK CALCULATION for ${userId}:`, {
      isWin,
      previousStreak,
      longestStreak: newLongestStreak,
      currentStats: {
        currentWinStreak: currentStats.currentWinStreak,
        longestWinStreak: currentStats.longestWinStreak,
        totalGames: currentStats.totalGames,
        gamesWon: currentStats.gamesWon
      }
    });
    
    if (isWin) {
      // Player won - increment current streak
      newCurrentStreak = previousStreak + 1;
      // Update longest streak if current streak is higher
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
      console.log(`✅ WIN: Streak incremented from ${previousStreak} to ${newCurrentStreak}`);
    } else {
      // Player lost - reset current streak to 0
      newCurrentStreak = 0;
      console.log(`❌ LOSS: Streak reset from ${previousStreak} to 0`);
    }
    
    console.log(`📊 FINAL STREAK VALUES:`, { 
      newCurrentStreak, 
      newLongestStreak, 
      previousStreak
    });

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

    console.log(`📊 Final update data for ${userId}:`, updateData);
    
    // First, get the current document to ensure we have the latest data
    const currentSnap = await getDoc(statsRef);
    let finalStats = {};
    
    if (currentSnap.exists()) {
      finalStats = currentSnap.data();
      console.log(`📊 Current stats before merge for ${userId}:`, finalStats);
    }
    
    // Merge the new data with existing data
    const mergedData = {
      ...finalStats,
      ...updateData,
      // Ensure these specific fields are updated correctly
      totalGames: updateData.totalGames,
      gamesWon: updateData.gamesWon,
      winRate: updateData.winRate,
      totalScore: updateData.totalScore,
      averageScore: updateData.averageScore,
      longestWinStreak: updateData.longestWinStreak,
      currentWinStreak: updateData.currentWinStreak,
      favoriteCategory: updateData.favoriteCategory,
      categoriesPlayed: updateData.categoriesPlayed,
      updatedAt: updateData.updatedAt
    };
    
    console.log(`📊 Merged data for ${userId}:`, mergedData);
    
    // Use setDoc to save the merged data
    await setDoc(statsRef, mergedData);
    
    // Verify the update worked by reading back the data
    const verifySnap = await getDoc(statsRef);
    if (verifySnap.exists()) {
      const verifiedData = verifySnap.data();
      console.log(`✅ Verified stats after update for ${userId}:`, verifiedData);
    }
    
    console.log(`✅ Successfully updated stats for ${userId}`);
    return { success: true, data: mergedData };
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
    // If no userId provided, return empty array
    if (!userId) {
      console.warn('No userId provided to getUserRecentGames');
      return { success: true, data: [] };
    }

    const gamesRef = collection(db, 'games');
    const q = query(
      gamesRef,
      where('userId', '==', userId),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const games = [];
    querySnapshot.forEach((doc) => {
      games.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by timestamp in JavaScript since we can't use orderBy in the query
    games.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    return { success: true, data: games };
  } catch (error) {
    console.error('Error getting recent games:', error);
    // Return empty array instead of failing completely
    return { success: true, data: [] };
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
