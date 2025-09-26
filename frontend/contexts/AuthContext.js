'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Firebase not initialized, create a demo user for testing
      console.log('Firebase not available, creating demo user');
      const demoUser = {
        id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
        username: 'DemoUser',
        email: 'demo@example.com',
        display_name: 'Demo User',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      setUser(demoUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({
          id: user.uid,
          username: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email,
          display_name: user.displayName,
          created_at: user.metadata.creationTime,
          last_login: user.metadata.lastSignInTime
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!auth) {
      // Demo login when Firebase is not available
      console.log('Firebase not available, using demo login');
      const demoUser = {
        id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
        username: email.split('@')[0] || 'DemoUser',
        email: email,
        display_name: email.split('@')[0] || 'Demo User',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      setUser(demoUser);
      return { success: true };
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  };

  const register = async (username, email, password) => {
    if (!auth) {
      // Demo registration when Firebase is not available
      console.log('Firebase not available, using demo registration');
      const demoUser = {
        id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
        username: username,
        email: email,
        display_name: username,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      setUser(demoUser);
      return { success: true };
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: username
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    if (!auth) {
      // Demo logout when Firebase is not available
      setUser(null);
      return { success: true };
    }
    
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
