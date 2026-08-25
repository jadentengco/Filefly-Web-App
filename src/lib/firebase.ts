import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getStorage, 
  FirebaseStorage 
} from 'firebase/storage';
import config from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(config) : getApp();

// Initialize Firestore with specific database ID if configured
export const db: Firestore = config.firestoreDatabaseId
  ? getFirestore(firebaseApp, config.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const auth: Auth = getAuth(firebaseApp);

// Initialize Firebase Storage
export const storage: FirebaseStorage = config.storageBucket
  ? getStorage(firebaseApp, `gs://${config.storageBucket.replace(/^gs:\/\//, '')}`)
  : getStorage(firebaseApp);

// Automatic anonymous auth fallback if not already signed in
export function ensureAuth(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (err) {
          console.warn('Anonymous auth note (continuing with session):', err);
          resolve(null);
        }
      }
    });
  });
}

