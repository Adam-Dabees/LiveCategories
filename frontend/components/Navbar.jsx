'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  BarChart3, 
  Home
} from 'lucide-react';

export default function Navbar() {
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleHomeClick = () => {
    // Always show confirmation when leaving a lobby
    if (window.location.pathname.startsWith('/lobby')) {
      setShowLeaveConfirm(true);
    } else {
      router.push('/');
    }
  };

  const handleStatsClick = () => {
    if (!user) {
      const confirmed = window.confirm('You need to sign in to view your stats! Would you like to sign in now?');
      if (confirmed) {
        router.push('/login');
      }
      return;
    }
    
    // Show confirmation when leaving a lobby for stats
    if (window.location.pathname.startsWith('/lobby')) {
      setPendingAction('stats');
      setShowLeaveConfirm(true);
    } else {
      router.push('/profile');
    }
  };

  const confirmLeave = async () => {
    setShowLeaveConfirm(false);
    
    // If we're in a lobby, properly leave it first
    if (window.location.pathname.startsWith('/lobby')) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const lobbyCode = urlParams.get('lobbyCode') || urlParams.get('code');
        
        if (lobbyCode && user) {
          // Import gameService and call leaveLobby
          const gameService = (await import('../lib/gameService')).default;
          await gameService.leaveLobby(lobbyCode, user.id);
          console.log('Successfully left lobby and saved stats');
        }
      } catch (error) {
        console.error('Error leaving lobby:', error);
      }
    }
    
    // Navigate based on pending action
    if (pendingAction === 'stats') {
      router.push('/profile');
    } else {
      router.push('/');
    }
    
    setPendingAction(null);
  };

  const cancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  return (
    <>
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95vw] max-w-6xl">
        <div className="glass-navbar rounded-full px-6 py-2">
          <div className="flex justify-between items-center">
            {/* Logo/Home Button */}
            <motion.button
              onClick={handleHomeClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 text-gray-800 hover:text-gray-900 transition-colors font-rubik"
            >
              <Home className="w-5 h-5" />
              <span className="text-lg font-bold">LiveCategories</span>
            </motion.button>

            {/* Desktop Menu */}
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  <motion.button
                    onClick={() => setShowProfile(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="glass-button-accent rounded-full p-2 text-blue-700 hover:text-blue-800"
                  >
                    <User className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    onClick={handleStatsClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="glass-button-accent rounded-full p-2 text-blue-700 hover:text-blue-800"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="glass-button rounded-full p-2 text-red-500 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={() => router.push('/login')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glass-button-accent rounded-full px-4 py-2 text-blue-700 hover:text-blue-800 flex items-center space-x-2 font-rubik"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Dropdown */}
      <AnimatePresence>
        {showProfile && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 sm:bg-black sm:bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card-dark rounded-4xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 glass-button rounded-4xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 font-rubik">
                  {user?.username || user?.displayName || user?.display_name || user?.email?.split('@')[0]}
                </h3>
                <p className="text-gray-300 mb-4 font-rubik">{user?.email}</p>
                <div className="space-y-3">
                  <motion.button
                    onClick={() => {
                      router.push('/profile');
                      setShowProfile(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full glass-button text-gray-300 py-2 rounded-4xl font-rubik"
                  >
                    View Statistics
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      handleLogout();
                      setShowProfile(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full glass-button text-red-400 py-2 rounded-4xl font-rubik"
                  >
                    Logout
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Game Confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 sm:bg-black sm:bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelLeave}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card-dark rounded-4xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 glass-button rounded-4xl flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 font-rubik">
                  Leave Current Lobby?
                </h3>
                <p className="text-gray-300 mb-6 font-rubik">
                  Are you sure you want to leave the current lobby and go to the categories page? 
                  You'll need to rejoin if you want to continue playing.
                </p>
                <div className="flex space-x-3">
                  <motion.button
                    onClick={cancelLeave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 glass-button text-gray-300 py-2 rounded-4xl font-rubik"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={confirmLeave}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 glass-button text-gray-300 py-2 rounded-4xl font-rubik"
                  >
                    Yes, Leave Lobby
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
