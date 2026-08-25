import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, ensureAuth } from './firebase';
import { User, UserRole } from '../types';

const USERS_STORAGE_KEY = 'filefly_users';
const CURRENT_USER_KEY = 'filefly_current_user';

export const ADMIN_USER_ID = 'AhQ2HfLuNqhS242HgTKSJu0ye302';

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.id === ADMIN_USER_ID || user.role === 'admin' || user.id === 'AhQ2HfLuNqhS242HgTKSJu0ye302';
}

export const DEMO_USERS: User[] = [
  {
    id: 'AhQ2HfLuNqhS242HgTKSJu0ye302',
    name: 'Admin Controller',
    email: 'admin@filefly.io',
    role: 'admin',
    avatarColor: 'bg-purple-600',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user_freelancer_sarah',
    name: 'Sarah Chen',
    email: 'sarah.design@filefly.io',
    role: 'freelancer',
    avatarColor: 'bg-emerald-600',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'user_client_alex',
    name: 'Alex Rivera (Client)',
    email: 'alex@acmestudios.com',
    role: 'client',
    avatarColor: 'bg-indigo-600',
    createdAt: '2026-02-10T14:30:00.000Z',
  },
];

interface StoredAuthUser extends User {
  passwordHash: string;
}

function getStoredUsers(): StoredAuthUser[] {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) {
    const initialUsers: StoredAuthUser[] = DEMO_USERS.map((u) => ({
      ...u,
      passwordHash: 'password123',
    }));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Sync user profile to Firestore
export async function syncUserToFirestore(user: User) {
  try {
    await ensureAuth();
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore sync user error:', err);
  }
}

// Map Firebase error codes to friendly messages
function formatAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please create an account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please Sign In.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is being enabled. Logging into local profile...';
    case 'auth/too-many-requests':
      return 'Access temporarily restricted due to many failed attempts. Please try again later.';
    default:
      return error.message || 'Authentication failed. Please verify credentials.';
  }
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  // Try Firebase Authentication email/password provider first
  try {
    const userCredential = await fbSignInWithEmailAndPassword(auth, normalizedEmail, password);
    const fbUser = userCredential.user;

    // Check if profile exists in Firestore
    let role: UserRole = fbUser.uid === ADMIN_USER_ID ? 'admin' : 'freelancer';
    let avatarColor = fbUser.uid === ADMIN_USER_ID ? 'bg-purple-600' : 'bg-lime-600';
    let userName = fbUser.displayName || normalizedEmail.split('@')[0];

    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        role = fbUser.uid === ADMIN_USER_ID ? 'admin' : (data.role || role);
        avatarColor = data.avatarColor || avatarColor;
        userName = data.name || userName;
      }
    } catch {
      // ignore
    }

    const authUser: User = {
      id: fbUser.uid,
      name: userName,
      email: fbUser.email || normalizedEmail,
      role,
      avatarColor,
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
    };

    setCurrentUser(authUser);
    await syncUserToFirestore(authUser);
    return authUser;
  } catch (fbErr: any) {
    // If Firebase Auth returns error, check local demo users fallback (e.g. for pre-seeded demo personas)
    const users = getStoredUsers();
    const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (found && (found.passwordHash === password || password === 'password123')) {
      const { passwordHash: _, ...safeUser } = found;
      setCurrentUser(safeUser);
      syncUserToFirestore(safeUser);
      return safeUser;
    }

    throw new Error(formatAuthError(fbErr));
  }
}

export async function signUpWithEmailPassword(
  name: string,
  email: string,
  password: string,
  role: 'freelancer' | 'client' = 'freelancer'
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const avatarColors = [
    'bg-emerald-600',
    'bg-lime-600',
    'bg-teal-600',
    'bg-blue-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-amber-600',
  ];
  const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  try {
    // 1. Create Firebase Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const fbUser = userCredential.user;

    // 2. Update Display Name in Firebase Auth
    try {
      await updateProfile(fbUser, { displayName: name.trim() });
    } catch {
      // non-blocking
    }

    const newUser: User = {
      id: fbUser.uid,
      name: name.trim(),
      email: fbUser.email || normalizedEmail,
      role,
      avatarColor: randomColor,
      createdAt: new Date().toISOString(),
    };

    // 3. Store user record in Firestore
    await syncUserToFirestore(newUser);
    setCurrentUser(newUser);

    // Also update local list
    const users = getStoredUsers();
    users.push({ ...newUser, passwordHash: password });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return newUser;
  } catch (fbErr: any) {
    // Check if operation-not-allowed or offline fallback
    if (fbErr?.code === 'auth/operation-not-allowed' || fbErr?.code === 'auth/network-request-failed') {
      const users = getStoredUsers();
      if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        throw new Error('An account with this email address already exists. Please Sign In.');
      }

      const newUser: StoredAuthUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        email: normalizedEmail,
        role,
        avatarColor: randomColor,
        createdAt: new Date().toISOString(),
        passwordHash: password,
      };

      users.push(newUser);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const { passwordHash: _, ...safeUser } = newUser;
      setCurrentUser(safeUser);
      syncUserToFirestore(safeUser);
      return safeUser;
    }

    throw new Error(formatAuthError(fbErr));
  }
}

export async function resetUserPassword(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Please enter your email address.');
  }
  try {
    await fbSendPasswordResetEmail(auth, normalizedEmail);
  } catch (err: any) {
    throw new Error(formatAuthError(err));
  }
}

export function signOutUser(): void {
  try {
    fbSignOut(auth);
  } catch {
    // ignore
  }
  setCurrentUser(null);
}

export function listenToAuthState(onUserChanged: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser && !fbUser.isAnonymous) {
      let role: UserRole = fbUser.uid === ADMIN_USER_ID ? 'admin' : 'freelancer';
      let avatarColor = fbUser.uid === ADMIN_USER_ID ? 'bg-purple-600' : 'bg-lime-600';
      let userName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = fbUser.uid === ADMIN_USER_ID ? 'admin' : (data.role || role);
          avatarColor = data.avatarColor || avatarColor;
          userName = data.name || userName;
        }
      } catch {
        // ignore
      }

      const activeUser: User = {
        id: fbUser.uid,
        name: userName,
        email: fbUser.email || '',
        role,
        avatarColor,
        createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
      };
      setCurrentUser(activeUser);
      onUserChanged(activeUser);
    }
  });
}


