import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
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

// Initialize Firestore with specific database ID and auto-detect long polling for sandboxed iframe compatibility
export const db: Firestore = (() => {
  try {
    return initializeFirestore(
      firebaseApp,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  }
})();

export const auth: Auth = getAuth(firebaseApp);

// Initialize Firebase Storage
export const storage: FirebaseStorage = firebaseConfig.storageBucket
  ? getStorage(firebaseApp, `gs://${firebaseConfig.storageBucket.replace(/^gs:\/\//, '')}`)
  : getStorage(firebaseApp);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Automatic auth check
export function ensureAuth(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user);
    });
  });
}


