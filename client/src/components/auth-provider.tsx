import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Try to verify with our backend, fall back to temporary user if backend unavailable
          const apiUrl = import.meta.env.VITE_API_URL || '';
          try {
            const response = await fetch(`${apiUrl}/auth/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken }),
            });

            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
            } else {
              throw new Error('Backend verification failed');
            }
          } catch (backendError) {
            console.warn('Backend not available, creating temporary user:', backendError);
            // Create temporary user from Firebase data with proper role assignment
            const email = firebaseUser.email || '';
            let role: 'user' | 'admin' | 'super_admin' = 'user';

            // Set super admin for specified emails
            if (email === 'sadasivanarun84@gmail.com' || email === 'Edthrustory@gmail.com') {
              role = 'super_admin';
            }

            setUser({
              id: firebaseUser.uid,
              email: email,
              googleId: firebaseUser.uid,
              displayName: firebaseUser.displayName || null,
              profilePicture: firebaseUser.photoURL || null,
              role: role,
              isActive: true,
              createdAt: new Date(),
              lastLoginAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error verifying user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login() {
    if (!auth || !googleProvider) {
      console.error('Firebase not configured');
      alert('Firebase not configured. Please check your environment variables.');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting Firebase login...');
      
      // Configure custom parameters for the provider
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Login successful:', result.user.email);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the popup');
      } else if (error.code === 'auth/popup-blocked') {
        alert('Popup blocked by browser. Please allow popups for this site and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('This domain is not authorized. Please add localhost:3000 to your Firebase authorized domains.');
      } else {
        alert(`Login failed: ${error.message}`);
      }
      setLoading(false);
    }
  }

  async function logout() {
    if (!auth) {
      console.error('Firebase not configured');
      return;
    }

    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}