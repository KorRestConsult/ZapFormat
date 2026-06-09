import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppUser } from '../types';

export async function ensureUserProfile(user: AppUser) {
  if (!db) return;
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, user);
  }
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as AppUser) : null;
}
