import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage, ensureAuth } from './firebase';
import { FileItem } from '../types';

const DB_NAME = 'filefly_db';
const DB_VERSION = 2;
const STORE_FILES = 'files';

// --- Firebase Cloud Storage Helpers ---

export async function uploadFileToFirebaseStorage(
  userId: string,
  fileId: string,
  fileName: string,
  blob: Blob | File,
  timeoutMs: number = 8000
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  try {
    await ensureAuth();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${userId}/files/${fileId}_${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: blob.type || 'application/octet-stream',
      customMetadata: {
        userId,
        fileId,
        fileName,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Use a Promise.race timeout to prevent indefinite hangs
    const uploadPromise = (async () => {
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return { downloadUrl, storagePath };
    })();

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('Firebase Storage upload timed out after', timeoutMs, 'ms; file retained locally & in Firestore.');
        resolve(null);
      }, timeoutMs)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Firebase Cloud Storage upload notice (stored in Firestore & local cache):', err);
    return null;
  }
}

export async function deleteFileFromFirebaseStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Firebase Storage delete notice:', err);
  }
}

// --- IndexedDB Local Fallback and Blob Storage ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        try {
          const idb = (event.target as IDBOpenDBRequest).result;
          let store: IDBObjectStore;
          if (!idb.objectStoreNames.contains(STORE_FILES)) {
            store = idb.createObjectStore(STORE_FILES, { keyPath: 'id' });
            store.createIndex('userId', 'userId', { unique: false });
            store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          } else {
            store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_FILES);
          }

          if (!store.indexNames.contains('tags')) {
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          }
        } catch {
          // ignore upgrade error
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

// Convert Blob to data URL for Firestore metadata sync
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Convert data URL back to Blob
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// --- Combined Firebase Storage + Firestore + Local IndexedDB Store ---

export async function saveFileToDB(fileItem: FileItem): Promise<void> {
  const cleanTags = fileItem.tags || [];

  // 1. Immediately save Blob in local IndexedDB for zero-latency local caching & offline resilience
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.put({
        ...fileItem,
        tags: cleanTags,
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Local IndexedDB write error:', err);
  }

  // 2. Sync initial Metadata & dataUrl to Firebase Firestore immediately
  try {
    await ensureAuth();
    let dataUrl = fileItem.dataUrl;
    // For small files (< 600KB), generate lightweight preview dataUrl if not present
    if (!dataUrl && fileItem.blob && fileItem.size < 600 * 1024 && !fileItem.downloadUrl) {
      try {
        dataUrl = await blobToDataUrl(fileItem.blob);
      } catch {}
    }

    const docRef = doc(db, 'files', fileItem.id);
    const firestoreRecord: Record<string, any> = {
      id: fileItem.id,
      userId: fileItem.userId,
      name: fileItem.name,
      size: fileItem.size,
      type: fileItem.type,
      extension: fileItem.extension,
      uploadedAt: fileItem.uploadedAt,
      tags: cleanTags,
    };

    if (fileItem.downloadUrl) firestoreRecord.downloadUrl = fileItem.downloadUrl;
    if (fileItem.storagePath) firestoreRecord.storagePath = fileItem.storagePath;
    if (fileItem.clientName) firestoreRecord.clientName = fileItem.clientName;
    if (fileItem.convertedFromId) firestoreRecord.convertedFromId = fileItem.convertedFromId;
    if (fileItem.conversionFormat) firestoreRecord.conversionFormat = fileItem.conversionFormat;
    if (dataUrl && dataUrl.startsWith('data:') && dataUrl.length < 800 * 1024) {
      firestoreRecord.dataUrl = dataUrl;
    }

    await setDoc(docRef, firestoreRecord, { merge: true });
  } catch (err) {
    console.warn('Firestore initial metadata write note:', err);
  }

  // 3. Concurrently upload binary payload to Firebase Cloud Storage in background
  if (fileItem.blob && (!fileItem.downloadUrl || !fileItem.storagePath)) {
    uploadFileToFirebaseStorage(
      fileItem.userId,
      fileItem.id,
      fileItem.name,
      fileItem.blob
    ).then(async (storageResult) => {
      if (storageResult) {
        fileItem.downloadUrl = storageResult.downloadUrl;
        fileItem.storagePath = storageResult.storagePath;

        // Update IndexedDB
        try {
          const idb = await openDB();
          const tx = idb.transaction(STORE_FILES, 'readwrite');
          const store = tx.objectStore(STORE_FILES);
          store.put({
            ...fileItem,
            tags: cleanTags,
          });
        } catch {}

        // Update Firestore
        try {
          await ensureAuth();
          const docRef = doc(db, 'files', fileItem.id);
          await setDoc(
            docRef,
            {
              downloadUrl: storageResult.downloadUrl,
              storagePath: storageResult.storagePath,
            },
            { merge: true }
          );
        } catch {}
      }
    }).catch((err) => {
      console.warn('Background Firebase Storage sync note:', err);
    });
  }
}

export async function updateFileItem(fileItem: FileItem): Promise<void> {
  return saveFileToDB(fileItem);
}

export async function updateFileTags(fileId: string, tags: string[]): Promise<void> {
  const cleanTags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));

  // Update in IndexedDB
  try {
    const file = await getFileById(fileId);
    if (file) {
      const idb = await openDB();
      const tx = idb.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.put({
        ...file,
        tags: cleanTags,
      });
    }
  } catch (err) {
    console.warn('IndexedDB updateFileTags error:', err);
  }

  // Update in Firestore
  try {
    await ensureAuth();
    const docRef = doc(db, 'files', fileId);
    await setDoc(docRef, { tags: cleanTags }, { merge: true });
  } catch (err) {
    console.error('Firestore updateFileTags error:', err);
  }
}

export async function bulkAddTags(fileIds: string[], tagsToAdd: string[]): Promise<void> {
  const cleanTags = tagsToAdd.map((t) => t.trim()).filter(Boolean);
  if (fileIds.length === 0 || cleanTags.length === 0) return;

  for (const id of fileIds) {
    const file = await getFileById(id);
    if (file) {
      const currentTags = file.tags || [];
      const merged = Array.from(new Set([...currentTags, ...cleanTags]));
      await updateFileTags(id, merged);
    }
  }
}

export async function bulkRemoveTag(fileIds: string[], tagToRemove: string): Promise<void> {
  for (const id of fileIds) {
    const file = await getFileById(id);
    if (file && file.tags) {
      const filtered = file.tags.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase());
      await updateFileTags(id, filtered);
    }
  }
}

export async function getFilesByUser(userId: string): Promise<FileItem[]> {
  // First, fetch from Firestore cloud database
  try {
    await ensureAuth();
    const q = query(collection(db, 'files'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const cloudFiles: FileItem[] = [];
      let localIdb: IDBDatabase | null = null;
      try {
        localIdb = await openDB();
      } catch {
        // ignore IDB availability
      }

      for (const d of querySnapshot.docs) {
        const data = d.data() as FileItem;
        let blob = data.blob;

        // Try getting original binary blob from local IndexedDB if present
        if (localIdb) {
          try {
            const localItem = await new Promise<FileItem | null>((resolve) => {
              const tx = localIdb!.transaction(STORE_FILES, 'readonly');
              const req = tx.objectStore(STORE_FILES).get(data.id);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
            if (localItem?.blob) {
              blob = localItem.blob;
            }
          } catch {
            // ignore local read
          }
        }

        // If no blob in IndexedDB, reconstruct from stored dataUrl if available
        if (!blob && data.dataUrl) {
          try {
            blob = dataUrlToBlob(data.dataUrl);
          } catch {
            // ignore
          }
        }

        cloudFiles.push({
          ...data,
          blob,
          tags: data.tags || [],
        });
      }

      cloudFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      return cloudFiles;
    }
  } catch (err) {
    console.warn('Firestore getFilesByUser fallback to local IndexedDB:', err);
  }

  // Fallback to local IndexedDB
  try {
    const idb = await openDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const items: FileItem[] = (request.result || []).map((item) => ({
          ...item,
          tags: item.tags || [],
        }));
        items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(items);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getFileById(id: string): Promise<FileItem | null> {
  // Check local IndexedDB first for fast blob access
  try {
    const idb = await openDB();
    const local = await new Promise<FileItem | null>((resolve) => {
      const tx = idb.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (local) {
      return {
        ...local,
        tags: local.tags || [],
      };
    }
  } catch {
    // fallback to Firestore
  }

  // Check Firestore
  try {
    await ensureAuth();
    const docRef = doc(db, 'files', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as FileItem;
      let blob = data.blob;
      if (!blob && data.dataUrl) {
        blob = dataUrlToBlob(data.dataUrl);
      }
      return {
        ...data,
        blob,
        tags: data.tags || [],
      };
    }
  } catch (err) {
    console.error('Firestore getFileById error:', err);
  }

  return null;
}

export async function deleteFileFromDB(id: string): Promise<void> {
  let storagePathToDelete: string | undefined;

  // Retrieve file metadata to find storagePath if any
  try {
    const existing = await getFileById(id);
    if (existing?.storagePath) {
      storagePathToDelete = existing.storagePath;
    }
  } catch {
    // ignore
  }

  // Delete from local IndexedDB
  try {
    const idb = await openDB();
    const tx = idb.transaction(STORE_FILES, 'readwrite');
    tx.objectStore(STORE_FILES).delete(id);
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }

  // Delete from Firebase Cloud Storage
  if (storagePathToDelete) {
    await deleteFileFromFirebaseStorage(storagePathToDelete);
  }

  // Delete from Firestore
  try {
    await ensureAuth();
    const docRef = doc(db, 'files', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteDoc error:', err);
  }
}

export async function deleteMultipleFiles(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteFileFromDB(id);
  }
}

// Real-time Firestore subscription hook helper for files
export function subscribeToUserFiles(
  userId: string, 
  callback: (files: FileItem[]) => void
): () => void {
  let unsubscribeFn: (() => void) = () => {};
  let isCancelled = false;

  // If this is a temporary guest or offline-only user, skip remote subscription
  if (!userId || userId.startsWith('user_guest_')) {
    return () => {};
  }

  ensureAuth().then((currentUser) => {
    if (isCancelled || !currentUser) return;
    try {
      const q = query(collection(db, 'files'), where('userId', '==', userId));
      unsubscribeFn = onSnapshot(q, async (snapshot) => {
        const files: FileItem[] = [];
        const idb = await openDB().catch(() => null);

        for (const d of snapshot.docs) {
          const data = d.data() as FileItem;
          let blob = data.blob;

          if (idb) {
            try {
              const local = await new Promise<FileItem | null>((res) => {
                const tx = idb.transaction(STORE_FILES, 'readonly');
                const req = tx.objectStore(STORE_FILES).get(data.id);
                req.onsuccess = () => res(req.result || null);
                req.onerror = () => res(null);
              });
              if (local?.blob) {
                blob = local.blob;
              }
            } catch {
              // ignore
            }
          }

          if (!blob && data.dataUrl) {
            try {
              blob = dataUrlToBlob(data.dataUrl);
            } catch {
              // ignore
            }
          }

          files.push({
            ...data,
            blob,
            tags: data.tags || [],
          });
        }

        files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        callback(files);
      }, (error) => {
        // Log friendly note if operating in offline mode or network unavailable
        if (error?.message?.includes('unavailable') || error?.message?.includes('offline')) {
          console.info('Firestore operating in offline local cache mode.');
        } else {
          console.warn('Firestore subscription notice:', error?.message || error);
        }
      });
    } catch (err) {
      console.warn('Firestore snapshot setup notice:', err);
    }
  });

  return () => {
    isCancelled = true;
    unsubscribeFn();
  };
}

// --- Admin Dashboard Storage & Firestore Helpers ---

export async function getAllUsersFromFirestore(): Promise<any[]> {
  try {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: any[] = [];
    querySnapshot.forEach((d) => {
      const data = d.data();
      users.push({
        id: data.id || d.id,
        name: data.name || 'Unnamed User',
        email: data.email || 'No email',
        role: data.role || 'freelancer',
        avatarColor: data.avatarColor || 'bg-slate-700',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return users;
  } catch (err) {
    console.warn('Failed to fetch all users from Firestore:', err);
    return [];
  }
}

export async function getAllFilesFromFirestore(): Promise<FileItem[]> {
  try {
    await ensureAuth();
    const querySnapshot = await getDocs(collection(db, 'files'));
    const files: FileItem[] = [];
    const localIdb = await openDB().catch(() => null);

    for (const d of querySnapshot.docs) {
      const data = d.data() as FileItem;
      let blob = data.blob;

      if (localIdb) {
        try {
          const localItem = await new Promise<FileItem | null>((res) => {
            const tx = localIdb.transaction(STORE_FILES, 'readonly');
            const req = tx.objectStore(STORE_FILES).get(data.id);
            req.onsuccess = () => res(req.result || null);
            req.onerror = () => res(null);
          });
          if (localItem?.blob) {
            blob = localItem.blob;
          }
        } catch {}
      }

      if (!blob && data.dataUrl) {
        try {
          blob = dataUrlToBlob(data.dataUrl);
        } catch {}
      }

      files.push({
        ...data,
        blob,
        tags: data.tags || [],
      });
    }

    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return files;
  } catch (err) {
    console.warn('Failed to fetch all files from Firestore:', err);
    return [];
  }
}

export function subscribeToAllUsers(
  callback: (users: any[]) => void
): () => void {
  let unsubscribeFn: (() => void) = () => {};
  let isCancelled = false;

  ensureAuth().then((currentUser) => {
    if (isCancelled || !currentUser) return;
    try {
      unsubscribeFn = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          users.push({
            id: data.id || d.id,
            name: data.name || 'Unnamed User',
            email: data.email || 'No email',
            role: data.role || 'freelancer',
            avatarColor: data.avatarColor || 'bg-slate-700',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        callback(users);
      }, (error) => {
        if (!error?.message?.includes('unavailable') && !error?.message?.includes('offline')) {
          console.warn('Firestore all users subscription note:', error?.message || error);
        }
      });
    } catch (err) {
      console.warn('Firestore all users setup note:', err);
    }
  });

  return () => {
    isCancelled = true;
    unsubscribeFn();
  };
}

export function subscribeToAllFiles(
  callback: (files: FileItem[]) => void
): () => void {
  let unsubscribeFn: (() => void) = () => {};
  let isCancelled = false;

  ensureAuth().then((currentUser) => {
    if (isCancelled || !currentUser) return;
    try {
      unsubscribeFn = onSnapshot(collection(db, 'files'), async (snapshot) => {
        const files: FileItem[] = [];
        const idb = await openDB().catch(() => null);

        for (const d of snapshot.docs) {
          const data = d.data() as FileItem;
          let blob = data.blob;

          if (idb) {
            try {
              const local = await new Promise<FileItem | null>((res) => {
                const tx = idb.transaction(STORE_FILES, 'readonly');
                const req = tx.objectStore(STORE_FILES).get(data.id);
                req.onsuccess = () => res(req.result || null);
                req.onerror = () => res(null);
              });
              if (local?.blob) {
                blob = local.blob;
              }
            } catch {}
          }

          if (!blob && data.dataUrl) {
            try {
              blob = dataUrlToBlob(data.dataUrl);
            } catch {}
          }

          files.push({
            ...data,
            blob,
            tags: data.tags || [],
          });
        }

        files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        callback(files);
      }, (error) => {
        if (!error?.message?.includes('unavailable') && !error?.message?.includes('offline')) {
          console.warn('Firestore all files subscription note:', error?.message || error);
        }
      });
    } catch (err) {
      console.warn('Firestore all files setup note:', err);
    }
  });

  return () => {
    isCancelled = true;
    unsubscribeFn();
  };
}

