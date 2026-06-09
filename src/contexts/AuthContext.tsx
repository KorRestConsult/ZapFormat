import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { ensureUserProfile, getUserProfile } from '../services/userService';
import type { AppUser } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  startPhoneLogin(phone: string): Promise<void>;
  confirmPhoneLogin(code: string, profileDraft?: Partial<AppUser>): Promise<void>;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name: string, phone: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }
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
      async startPhoneLogin(phone) {
        if (!auth || !isFirebaseConfigured) {
          setPendingPhone(phone);
          return;
        }
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
        setConfirmation(await signInWithPhoneNumber(auth, phone, verifier));
      },
      async confirmPhoneLogin(code, profileDraft) {
        if (!auth || !isFirebaseConfigured) {
          const demoProfile: AppUser = {
            uid: 'demo-user',
            phone: profileDraft?.phone ?? pendingPhone,
            name: profileDraft?.name ?? 'Клиент ZapFormat',
            telegram: profileDraft?.telegram ?? '',
            city: profileDraft?.city ?? '',
            comment: profileDraft?.comment ?? '',
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          setFirebaseUser({ uid: demoProfile.uid, phoneNumber: demoProfile.phone } as User);
          setProfile(demoProfile);
          return;
        }
        if (!confirmation) throw new Error('Сначала запросите SMS-код');
        const credential = await confirmation.confirm(code);
        const existing = await getUserProfile(credential.user.uid);
        const userProfile: AppUser =
          existing ?? {
            uid: credential.user.uid,
            phone: credential.user.phoneNumber ?? profileDraft?.phone ?? '',
            name: profileDraft?.name ?? 'Клиент ZapFormat',
            telegram: profileDraft?.telegram ?? '',
            city: profileDraft?.city ?? '',
            comment: profileDraft?.comment ?? '',
            role: 'client',
            createdAt: new Date().toISOString(),
          };
        await ensureUserProfile(userProfile);
        setProfile(userProfile);
      },
      async login(email, password) {
        if (!auth) throw new Error('Firebase не настроен, используйте демо-вход по телефону');
        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(email, password, name, phone) {
        if (!auth) throw new Error('Firebase не настроен, используйте демо-вход по телефону');
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const userProfile: AppUser = {
          uid: credential.user.uid,
          name,
          phone,
          email,
          telegram: '',
          city: '',
          comment: '',
          role: 'client',
          createdAt: new Date().toISOString(),
        };
        await ensureUserProfile(userProfile);
        setProfile(userProfile);
      },
      logout() {
        if (!auth) {
          setFirebaseUser(null);
          setProfile(null);
          return Promise.resolve();
        }
        return signOut(auth);
      },
    }),
    [firebaseUser, profile, confirmation, pendingPhone],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
