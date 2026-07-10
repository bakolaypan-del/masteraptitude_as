import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  name?: string;
  email?: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  totalTestsTaken: number;
  cumulativeScore: number;
  globalRank: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const profilePath = `profiles/${currentUser.uid}`;

        unsubscribeProfile = onSnapshot(profileRef, async (snap) => {
          try {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
              
              if (isOwner && data.role !== 'admin') {
                const updatedProfile = { ...data, role: 'admin' as const };
                try {
                  await setDoc(profileRef, updatedProfile, { merge: true });
                } catch (e) {
                  console.error("Error upgrading to admin", e);
                }
                setProfile({ ...data, role: 'admin' });
              } else {
                setProfile(data);
              }
            } else {
              // Create default profile if it doesn't exist
              const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
              const newProfile: UserProfile = {
                name: currentUser.displayName || '',
                email: currentUser.email || '',
                phoneNumber: currentUser.phoneNumber || '',
                role: isOwner ? 'admin' : 'user',
                totalTestsTaken: 0,
                cumulativeScore: 0,
                globalRank: 0
              };
              try {
                await setDoc(profileRef, newProfile);
              } catch (writeErr) {
                console.error('Profile creation failed:', writeErr);
              }
            }
          } catch (err) {
            console.error('Unexpected error in profile snapshot handler:', err);
          } finally {
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile onSnapshot error", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
