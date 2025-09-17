'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  User, 
  LogOut, 
  BarChart3, 
  Home,
  Menu,
  X
} from 'lucide-react';

export default function Navbar() {
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
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
    
    router.push('/');
  };

  const cancelLeave = () => {
    setShowLeaveConfirm(false);
  };

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Home Button */}
            <motion.button
              onClick={handleHomeClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Gamepad2 className="w-8 h-8" />
              <span className="text-xl font-bold">LiveCategories</span>
            </motion.button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setShowProfile(true)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{user?.displayName || user?.email?.split('@')[0]}</span>
                  </button>
                  
                  <button
                    onClick={handleStatsClick}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Stats</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-200"
            >
              <div className="px-4 py-2 space-y-2">
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setShowProfile(true);
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full text-left py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span>{user?.displayName || user?.email?.split('@')[0]}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleStatsClick();
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full text-left py-2 text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <BarChart3 className="w-5 h-5" />
                      <span>Statistics</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full text-left py-2 text-red-600 hover:text-red-700 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      router.push('/login');
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full text-left py-2 text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>Login</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Profile Dropdown */}
      <AnimatePresence>
        {showProfile && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowProfile(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {user?.displayName || user?.email?.split('@')[0]}
                </h3>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      router.push('/profile');
                      setShowProfile(false);
                    }}
                    className="w-full btn-primary"
                  >
                    View Statistics
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowProfile(false);
                    }}
                    className="w-full btn-danger"
                  >
                    Logout
                  </button>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelLeave}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Leave Current Lobby?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to leave the current lobby and go to the categories page? 
                  You'll need to rejoin if you want to continue playing.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={cancelLeave}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLeave}
                    className="flex-1 btn-primary"
                  >
                    Yes, Leave Lobby
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

