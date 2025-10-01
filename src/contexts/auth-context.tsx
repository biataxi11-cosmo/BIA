'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type UserRole = 'customer' | 'driver' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  setRole: () => {},
  loading: true,
  error: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (user: User, role?: UserRole) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setUserProfile(userData);
        setRole(userData.role);
        localStorage.setItem('userRole', userData.role);
      } else {
        // Create new user profile if it doesn't exist
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: role || 'customer', // Default to customer
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setUserProfile(newProfile);
        setRole(newProfile.role);
        localStorage.setItem('userRole', newProfile.role);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      
      // If Firestore fails, create a local profile with the role from localStorage
      const storedRole = localStorage.getItem('userRole') as UserRole;
      if (storedRole) {
        const fallbackProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: storedRole,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUserProfile(fallbackProfile);
        setRole(storedRole);
        console.log('Using fallback profile with role:', storedRole);
      } else {
        setError('Failed to load user profile. Please try logging in again.');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', { user: !!user, email: user?.email });
      setError(null);
      setUser(user);
      
      if (!user) {
        setUserProfile(null);
        setRole(null);
        localStorage.removeItem('userRole');
        setLoading(false);
      } else {
        // Get role from localStorage first for immediate UI update
        const storedRole = localStorage.getItem('userRole') as UserRole;
        console.log('Stored role from localStorage:', storedRole);
        if (storedRole) {
          setRole(storedRole);
        }
        
        // Fetch full user profile from Firestore
        await fetchUserProfile(user, storedRole || undefined);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSetRole = async (newRole: UserRole | null) => {
    if (!user || !newRole) {
      setRole(null);
      localStorage.removeItem('userRole');
      return;
    }

    try {
      // Update role in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        role: newRole,
        updatedAt: new Date(),
      }, { merge: true });

      // Update local state
      setRole(newRole);
      localStorage.setItem('userRole', newRole);
      
      // Update user profile
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          role: newRole,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    }
  };

  const value = {
    user,
    userProfile,
    role,
    setRole: handleSetRole,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
