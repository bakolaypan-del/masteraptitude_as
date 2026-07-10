import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (currentUser: User) => {
    try {
      const profileRef = doc(db, 'profiles', currentUser.uid);
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
        if (isOwner && data.role !== 'admin') {
          const updatedProfile = { ...data, role: 'admin' as const };
          await setDoc(profileRef, updatedProfile, { merge: true });
          setProfile(updatedProfile);
          localStorage.setItem('ma_profile', JSON.stringify(updatedProfile));
          localStorage.setItem('ma_profile_ts', String(Date.now()));
        } else {
          setProfile(data);
          localStorage.setItem('ma_profile', JSON.stringify(data));
          localStorage.setItem('ma_profile_ts', String(Date.now()));
        }
      }
    } catch (e) {
      console.error("Error refreshing profile:", e);
    }
  };

  const handleRefresh = async () => {
    if (auth.currentUser) {
      await refreshProfile(auth.currentUser);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Try reading from cache first
        const cachedProfile = localStorage.getItem('ma_profile');
        const cachedTs = localStorage.getItem('ma_profile_ts');
        const cacheAgeLimit = 7 * 24 * 60 * 60 * 1000; // 7 days

        let loadedFromCache = false;
        if (cachedProfile && cachedTs && (Date.now() - Number(cachedTs) < cacheAgeLimit)) {
          try {
            const parsed = JSON.parse(cachedProfile);
            setProfile(parsed);
            loadedFromCache = true;
            setLoading(false);
          } catch (e) {
            localStorage.removeItem('ma_profile');
            localStorage.removeItem('ma_profile_ts');
          }
        }
        
        // If not loaded from cache (or cache was empty/expired), fetch from Firestore via getDoc
        if (!loadedFromCache) {
          const profileRef = doc(db, 'profiles', currentUser.uid);
          const profilePath = `profiles/${currentUser.uid}`;
          try {
            const snap = await getDoc(profileRef);
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
              
              if (isOwner && data.role !== 'admin') {
                const updatedProfile = { ...data, role: 'admin' as const };
                await setDoc(profileRef, updatedProfile, { merge: true });
                setProfile(updatedProfile);
                localStorage.setItem('ma_profile', JSON.stringify(updatedProfile));
                localStorage.setItem('ma_profile_ts', String(Date.now()));
              } else {
                setProfile(data);
                localStorage.setItem('ma_profile', JSON.stringify(data));
                localStorage.setItem('ma_profile_ts', String(Date.now()));
              }
            } else {
              // Create default profile
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
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
              localStorage.setItem('ma_profile', JSON.stringify(newProfile));
              localStorage.setItem('ma_profile_ts', String(Date.now()));
            }
          } catch (error) {
            console.error("Profile load error", error);
            handleFirestoreError(error, OperationType.GET, profilePath);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setProfile(null);
        setLoading(false);
        // Clear profile cache on logout
        localStorage.removeItem('ma_profile');
        localStorage.removeItem('ma_profile_ts');
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: handleRefresh }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
