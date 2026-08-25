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

// Safe configuration with defaults
const firebaseConfig = {
  projectId: config?.projectId || 'gen-lang-client-0420214686',
  appId: config?.appId || '1:921555207161:web:f71018855cd2fb61ecb328',
  apiKey: config?.apiKey || 'AIzaSyCJOJTx_a11yGvgjCAaTtr2DF6WCQb4foY',
  authDomain: config?.authDomain || 'gen-lang-client-0420214686.firebaseapp.com',
  firestoreDatabaseId: config?.firestoreDatabaseId || 'ai-studio-filefly-58be3d23-b26f-48d1-8db5-bf88d6ee67b5',
  storageBucket: config?.storageBucket || 'gen-lang-client-0420214686.firebasestorage.app',
  messagingSenderId: config?.messagingSenderId || '921555207161',
};

// Initialize Firebase App singleton safely
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const auth: Auth = getAuth(firebaseApp);

// Initialize Firebase Storage
export const storage: FirebaseStorage = firebaseConfig.storageBucket
  ? getStorage(firebaseApp, `gs://${firebaseConfig.storageBucket.replace(/^gs:\/\//, '')}`)
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

