import { User, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase/config';
import { ensureUserProfile, getUserProfile } from '../services/userService';
import type { AppUser } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name: string, phone: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setProfile(user ? await getUserProfile(user.uid) : null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      async login(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(email, password, name, phone) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const userProfile: AppUser = {
          uid: credential.user.uid,
          name,
          phone,
          email,
          role: 'customer',
          createdAt: new Date().toISOString(),
        };
        await ensureUserProfile(userProfile);
        setProfile(userProfile);
      },
      logout() {
        return signOut(auth);
      },
    }),
    [firebaseUser, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
