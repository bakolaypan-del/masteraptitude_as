import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profilePath = `profiles/${currentUser.uid}`;
        try {
          const profileRef = doc(db, 'profiles', currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserProfile;
            const isOwner = currentUser.email?.toLowerCase() === 'bakolaypan@gmail.com';
            if (isOwner && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await setDoc(profileRef, updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(data);
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
            try {
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
            } catch (writeErr) {
              handleFirestoreError(writeErr, OperationType.WRITE, profilePath);
            }
          }
        } catch (error) {
          console.error("Error fetching/creating profile", error);
          // Only throw if it's a permission/security error that handleFirestoreError already logged or if it's critical
          if (error instanceof Error && error.message.includes('{')) {
             // Already handled by handleFirestoreError (which throws JSON string)
          } else {
             handleFirestoreError(error, OperationType.GET, profilePath);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
