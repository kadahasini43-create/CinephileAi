import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextProps {
  user: UserProfile | null;
  loading: boolean;
  loginMock: (username: string, email: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Optional Firebase setup
let firebaseAuth: any = null;
let firebaseGoogleProvider: any = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only try initializing if apiKey is set
if (firebaseConfig.apiKey) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(app);
    firebaseGoogleProvider = new GoogleAuthProvider();
    console.log('Firebase successfully initialized client-side.');
  } catch (err) {
    console.warn('Firebase init failed. Using mock authentication fallback.', err);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(true);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem('cinephile_token');
    const cachedUser = localStorage.getItem('cinephile_user');
    
    if (token && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setIsMock(token.startsWith('mock-'));
      } catch (e) {
        localStorage.removeItem('cinephile_token');
        localStorage.removeItem('cinephile_user');
      }
    }
    setLoading(false);
  }, []);

  // Firebase auth state listener (if firebaseAuth is active)
  useEffect(() => {
    if (!firebaseAuth) return;
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: any) => {
      if (fbUser) {
        const token = await fbUser.getIdToken();
        const profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Firebase User',
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fbUser.uid}`,
        };
        setUser(profile);
        setIsMock(false);
        localStorage.setItem('cinephile_token', token);
        localStorage.setItem('cinephile_user', JSON.stringify(profile));
      } else {
        // Only log out if it wasn't a mock session
        const currentToken = localStorage.getItem('cinephile_token');
        if (currentToken && !currentToken.startsWith('mock-')) {
          setUser(null);
          localStorage.removeItem('cinephile_token');
          localStorage.removeItem('cinephile_user');
        }
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const loginMock = async (username: string, email: string) => {
    setLoading(true);
    const cleanUsername = username.trim() || 'Cinephile';
    const cleanEmail = email.trim() || 'cinephile@example.com';
    const uid = 'demo_' + Math.random().toString(36).substring(2, 9);
    const photoURL = `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`;
    
    const profile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: cleanUsername,
      photoURL,
    };
    
    // Auth token structure for backend simulation: mock-uid|email|name|photo
    const token = `mock-${uid}|${cleanEmail}|${cleanUsername}|${photoURL}`;
    
    setUser(profile);
    setIsMock(true);
    localStorage.setItem('cinephile_token', token);
    localStorage.setItem('cinephile_user', JSON.stringify(profile));
    setLoading(false);
  };

  const loginGoogle = async () => {
    if (firebaseAuth && firebaseGoogleProvider) {
      setLoading(true);
      try {
        await signInWithPopup(firebaseAuth, firebaseGoogleProvider);
      } catch (err) {
        console.error('Firebase sign in popup failed:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Trigger simulation Google Login
      await loginMock('Alex Nolan', 'alex.nolan@gmail.com');
    }
  };

  const logout = async () => {
    setLoading(true);
    if (firebaseAuth && !isMock) {
      try {
        await signOut(firebaseAuth);
      } catch (err) {
        console.error('Firebase sign out failed:', err);
      }
    }
    
    setUser(null);
    localStorage.removeItem('cinephile_token');
    localStorage.removeItem('cinephile_user');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginMock, loginGoogle, logout, isMock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
