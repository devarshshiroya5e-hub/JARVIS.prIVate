import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  signInAnonymously,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { MemoryItem, ChatMessage } from '../types';

// User's Firebase web application configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBw33aDytLaa63VoHE5tcrn080xjo1S5R4",
  authDomain: "jarvis-8eba0.firebaseapp.com",
  projectId: "jarvis-8eba0",
  storageBucket: "jarvis-8eba0.firebasestorage.app",
  messagingSenderId: "588523132440",
  appId: "1:588523132440:web:8ae2600a17e8f13528156d",
  measurementId: "G-RN63DLMCGJ",
};

// Initialize or reuse existing Firebase instance
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics if supported in the current environment
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('[Firebase] Analytics initialized for jarvis-8eba0');
      }
    })
    .catch((err) => {
      console.warn('[Firebase] Analytics not supported in this runtime:', err);
    });
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Firestore Cloud Sync Helpers for JARVIS Data (Project: jarvis-8eba0)
export async function syncMemoryToCloud(userId: string, memory: MemoryItem): Promise<void> {
  try {
    const memoryDocRef = doc(db, 'users', userId, 'memories', memory.id);
    await setDoc(memoryDocRef, {
      ...memory,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Failed to sync memory to Firestore:', err);
  }
}

export async function deleteMemoryFromCloud(userId: string, memoryId: string): Promise<void> {
  try {
    const memoryDocRef = doc(db, 'users', userId, 'memories', memoryId);
    await deleteDoc(memoryDocRef);
  } catch (err) {
    console.warn('[Firebase] Failed to delete memory from Firestore:', err);
  }
}

export async function fetchCloudMemories(userId: string): Promise<MemoryItem[]> {
  try {
    const colRef = collection(db, 'users', userId, 'memories');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<MemoryItem, 'id'>),
    }));
  } catch (err) {
    console.warn('[Firebase] Error loading memories from Firestore:', err);
    return [];
  }
}

export async function saveConversationTurnToCloud(userId: string, message: ChatMessage): Promise<void> {
  try {
    const chatDocRef = doc(db, 'users', userId, 'conversations', message.id);
    await setDoc(chatDocRef, {
      ...message,
      savedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Error saving chat message to Firestore:', err);
  }
}

export async function testFirebaseConnection(): Promise<{ success: boolean; projectId: string; user: string | null }> {
  try {
    const currentUser = auth.currentUser;
    return {
      success: true,
      projectId: firebaseConfig.projectId,
      user: currentUser ? currentUser.email || currentUser.displayName || currentUser.uid : null,
    };
  } catch (err) {
    return {
      success: false,
      projectId: firebaseConfig.projectId,
      user: null,
    };
  }
}
