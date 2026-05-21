import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
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
  profileIncomplete: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileIncomplete: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    const profileRef = doc(db, 'profiles', user.uid);
    const snap = await getDoc(profileRef);
    if (snap.exists()) setProfile(snap.data() as UserProfile);
  };

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Auto sign-in anonymously — students need no registration
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error('Anonymous sign-in failed', e);
          setLoading(false);
        }
        return;
      }

      setUser(currentUser);

      const profileRef = doc(db, 'profiles', currentUser.uid);
      const profilePath = `profiles/${currentUser.uid}`;

      unsubscribeProfile = onSnapshot(profileRef, async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';

          if (isOwner && data.role !== 'admin') {
            const updatedProfile = { ...data, role: 'admin' as const };
            try {
              await setDoc(profileRef, updatedProfile, { merge: true });
            } catch (e) {
              console.error('Error upgrading to admin', e);
            }
          } else {
            setProfile(data);
          }
        } else {
          // Create default guest profile for anonymous users
          const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
          const newProfile: UserProfile = {
            name: currentUser.displayName || '',
            email: currentUser.email || '',
            phoneNumber: '',
            role: isOwner ? 'admin' : 'user',
            totalTestsTaken: 0,
            cumulativeScore: 0,
            globalRank: 0,
          };
          try {
            await setDoc(profileRef, newProfile);
          } catch (writeErr) {
            handleFirestoreError(writeErr, OperationType.WRITE, profilePath);
          }
        }
        setLoading(false);
      }, (error) => {
        console.error('Profile onSnapshot error', error);
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, profilePath);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  // profileIncomplete: guest user hasn't entered their name+mobile yet
  const profileIncomplete =
    !!user &&
    profile?.role !== 'admin' &&
    (!profile?.name || !profile?.phoneNumber);

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileIncomplete, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
