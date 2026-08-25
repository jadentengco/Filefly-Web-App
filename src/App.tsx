/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Repeat, 
  Share2, 
  UploadCloud, 
  Sparkles, 
  HardDrive, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { User, FileItem } from './types';
import { getCurrentUser, signOutUser, listenToAuthState, isAdminUser, ADMIN_USER_ID } from './lib/auth';
import { 
  getFilesByUser, 
  saveFileToDB, 
  deleteFileFromDB, 
  deleteMultipleFiles,
  updateFileTags,
  subscribeToUserFiles
} from './lib/storage';
import { seedInitialFilesIfEmpty } from './lib/sampleData';
import { getMonthlyConversionsCount } from './lib/conversions';
import { formatBytes } from './lib/converter';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { ConvertModal } from './components/ConvertModal';
import { PreviewModal } from './components/PreviewModal';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { ClientPortalView } from './components/ClientPortalView';
import { QuickConvertView } from './components/QuickConvertView';
import { RecentFilesView } from './components/RecentFilesView';
import { AdminDashboardView } from './components/AdminDashboardView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'files' | 'convert' | 'portals' | 'recent'>('files');

  // Theme state with localStorage and system preference detection
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('filefly_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  // Apply dark class to documentElement whenever theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('filefly_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Modals & States
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<FileItem | null>(null);
  const [activeConvertFile, setActiveConvertFile] = useState<FileItem | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Show auto-dismissing toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = listenToAuthState((authUser) => {
      if (authUser) {
        setCurrentUser(authUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load user files & listen to real-time Firestore updates
  useEffect(() => {
    if (!currentUser) {
      setFiles([]);
      setIsLoadingFiles(false);
      return;
    }

    let isSubscribed = true;
    setIsLoadingFiles(true);

    async function initUserFiles() {
      try {
        await seedInitialFilesIfEmpty(currentUser!.id);
        const userFiles = await getFilesByUser(currentUser!.id);
        if (isSubscribed) {
          setFiles(userFiles);
        }
      } catch (err) {
        console.error('Failed to load user files from storage:', err);
      } finally {
        if (isSubscribed) {
          setIsLoadingFiles(false);
        }
      }
    }

    initUserFiles();

    // Subscribe to real-time updates from Firestore
    const unsubscribe = subscribeToUserFiles(currentUser.id, (cloudFiles) => {
      if (isSubscribed && cloudFiles && cloudFiles.length > 0) {
        setFiles(cloudFiles);
        setIsLoadingFiles(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [currentUser]);

  // Handle new uploads
  const handleFilesUploaded = async (newFiles: FileItem[]) => {
    // 1. Immediately update UI state so user sees files right away
    setFiles((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = newFiles.filter((n) => !existingIds.has(n.id));
      return [...filtered, ...prev];
    });
    showToast(`Successfully uploaded ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}!`);

    // 2. Persist asynchronously in background
    for (const f of newFiles) {
      try {
        await saveFileToDB(f);
      } catch (err) {
        console.warn('File persistence note:', err);
      }
    }
  };

  // Handle updating tags on files
  const handleUpdateTags = async (fileIds: string[], tags: string[]) => {
    for (const id of fileIds) {
      await updateFileTags(id, tags);
    }
    setFiles((prev) =>
      prev.map((file) => {
        if (fileIds.includes(file.id)) {
          return { ...file, tags };
        }
        return file;
      })
    );
    if (activePreviewFile && fileIds.includes(activePreviewFile.id)) {
      setActivePreviewFile((prev) => (prev ? { ...prev, tags } : null));
    }
    showToast(`Updated tags for ${fileIds.length} file${fileIds.length > 1 ? 's' : ''}!`);
  };

  // Handle single deletion
  const handleDeleteFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (activePreviewFile?.id === id) {
      setActivePreviewFile(null);
    }
    if (activeConvertFile?.id === id) {
      setActiveConvertFile(null);
    }
    try {
      await deleteFileFromDB(id);
    } catch (err) {
      console.warn('Delete file DB note:', err);
    }
    showToast('File deleted successfully.');
  };

  // Handle batch deletion
  const handleBatchDelete = async (ids: string[]) => {
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
    if (activePreviewFile && ids.includes(activePreviewFile.id)) {
      setActivePreviewFile(null);
    }
    if (activeConvertFile && ids.includes(activeConvertFile.id)) {
      setActiveConvertFile(null);
    }
    try {
      await deleteMultipleFiles(ids);
    } catch (err) {
      console.warn('Batch delete DB note:', err);
    }
    showToast(`Deleted ${ids.length} files.`);
  };

  // Handle saving newly converted file
  const handleSavedConvertedFile = async (convertedFile: FileItem) => {
    setFiles((prev) => [convertedFile, ...prev.filter((f) => f.id !== convertedFile.id)]);
    showToast(`Converted & saved "${convertedFile.name}" to your files!`);
    try {
      await saveFileToDB(convertedFile);
    } catch (err) {
      console.warn('Converted file save note:', err);
    }
  };

  // Handle file download
  const handleDownloadFile = async (fileItem: FileItem) => {
    if (fileItem.blob) {
      const url = URL.createObjectURL(fileItem.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (fileItem.downloadUrl) {
      try {
        const response = await fetch(fileItem.downloadUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        window.open(fileItem.downloadUrl, '_blank');
      }
    } else if (fileItem.dataUrl) {
      const a = document.createElement('a');
      a.href = fileItem.dataUrl;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    showToast(`Downloading "${fileItem.name}"...`);
  };

  // Handle sign out
  const handleSignOut = () => {
    signOutUser();
    setCurrentUser(null);
    showToast('Signed out of Filefly.');
  };

  const handleContinueGuest = () => {
    const guestUser: User = {
      id: 'user_guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest User',
      email: 'guest@filefly.io',
      role: 'freelancer',
      avatarColor: 'bg-slate-700',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(guestUser);
    showToast('Entered as Guest User.');
  };

  // If not authenticated, render dedicated Sign-In / Login Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`);
        }}
        onContinueGuest={handleContinueGuest}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Admin User Dashboard Check (ID: AhQ2HfLuNqhS242HgTKSJu0ye302)
  const isAdmin = isAdminUser(currentUser) || currentUser.id === ADMIN_USER_ID;

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 flex flex-col font-sans antialiased transition-colors duration-200">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-60 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
            <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <AdminDashboardView
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onPreviewFile={(file) => setActivePreviewFile(file)}
          onDownloadFile={handleDownloadFile}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Global File Preview Modal for Admin inspection */}
        {activePreviewFile && (
          <PreviewModal
            file={activePreviewFile}
            onClose={() => setActivePreviewFile(null)}
            onDownload={() => handleDownloadFile(activePreviewFile)}
            onConvert={() => {
              setActiveConvertFile(activePreviewFile);
            }}
            onDelete={async () => {
              await handleDeleteFile(activePreviewFile.id);
              setActivePreviewFile(null);
            }}
          />
        )}

        {/* Global Convert Modal */}
        {activeConvertFile && (
          <ConvertModal
            file={activeConvertFile}
            onClose={() => setActiveConvertFile(null)}
            onSaveConvertedFile={handleSavedConvertedFile}
            userId={currentUser.id}
          />
        )}
      </div>
    );
  }

  // Calculate storage used & statistics
  const totalStorageBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const maxStorageBytes = 5 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, Math.max(0, (totalStorageBytes / maxStorageBytes) * 100));
  
  // Exact conversions made this month by this user
  const monthlyConversionsCount = getMonthlyConversionsCount(currentUser?.id || 'guest', files);
  
  // Uploads added today
  const todayUploads = files.filter(
    (f) => new Date(f.uploadedAt).toDateString() === new Date().toDateString()
  ).length;

  const scrollToUpload = () => {
    setActiveTab('files');
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 flex flex-col font-sans antialiased selection:bg-lime-300 selection:text-slate-950 transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
          <CheckCircle2 size={16} className="text-[#a3e635] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenAuth={() => setIsAuthOpen(true)}
        storageUsedBytes={totalStorageBytes}
        fileCount={files.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onTriggerUpload={scrollToUpload}
          onSharePortal={() => setActiveTab('portals')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Dashboard Body */}
        <main className="p-6 sm:p-10 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {/* 1. Deliverables & All Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-8">
              {/* Sleek Interface 3-Column Stats Row */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Storage Used */}
                <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Storage Used
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatBytes(totalStorageBytes)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-sm mb-1">of 5 GB</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-[#a3e635] h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(totalStorageBytes > 0 ? 3 : 0, storagePercentage))}%` }}
                    />
                  </div>
                </div>

                {/* 2. Total Files */}
                <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Total Files
                  </p>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{files.length}</span>
                  <p className="text-xs text-lime-600 dark:text-[#a3e635] font-medium mt-1">
                    +{todayUploads} uploaded today
                  </p>
                </div>

                {/* 3. Conversions */}
                <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Conversions
                  </p>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {monthlyConversionsCount}
                  </span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Successful this month</p>
                </div>
              </section>

              {/* Upload Zone */}
              <div ref={uploadSectionRef}>
                <FileUpload
                  userId={currentUser?.id || 'guest'}
                  onFilesUploaded={handleFilesUploaded}
                />
              </div>

              {/* Uploaded Files Manager */}
              <div>
                {isLoadingFiles ? (
                  <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="w-8 h-8 border-3 border-lime-500 dark:border-[#a3e635] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading your files...</p>
                  </div>
                ) : (
                  <FileList
                    files={files}
                    onPreview={setActivePreviewFile}
                    onConvert={setActiveConvertFile}
                    onDelete={handleDeleteFile}
                    onBatchDelete={handleBatchDelete}
                    onDownload={handleDownloadFile}
                    onUpdateTags={handleUpdateTags}
                  />
                )}
              </div>
            </div>
          )}

          {/* 2. Recent Files (Last 5 Uploads) Tab */}
          {activeTab === 'recent' && (
            <RecentFilesView
              files={files}
              onPreview={setActivePreviewFile}
              onConvert={setActiveConvertFile}
              onDelete={handleDeleteFile}
              onBatchDelete={handleBatchDelete}
              onDownload={handleDownloadFile}
              onNavigateToAllFiles={() => setActiveTab('files')}
              onTriggerUpload={scrollToUpload}
            />
          )}

          {/* 3. Quick Converter Tab */}
          {activeTab === 'convert' && currentUser && (
            <QuickConvertView
              currentUser={currentUser}
              onSavedConvertedFile={handleSavedConvertedFile}
            />
          )}

          {/* 4. Client Share Portal Tab */}
          {activeTab === 'portals' && currentUser && (
            <ClientPortalView
              currentUser={currentUser}
              onFilesUploaded={handleFilesUploaded}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="px-10 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
          <p>© {new Date().getFullYear()} Filefly • Client File & Format Conversion Portal. All rights reserved.</p>
        </footer>
      </div>

      {/* Convert Modal */}
      <ConvertModal
        isOpen={Boolean(activeConvertFile)}
        onClose={() => setActiveConvertFile(null)}
        fileItem={activeConvertFile}
        onSavedConvertedFile={handleSavedConvertedFile}
      />

      {/* File Preview Modal */}
      <PreviewModal
        isOpen={Boolean(activePreviewFile)}
        onClose={() => setActivePreviewFile(null)}
        fileItem={activePreviewFile}
        onConvert={setActiveConvertFile}
        onDelete={handleDeleteFile}
        onDownload={handleDownloadFile}
        onUpdateTags={handleUpdateTags}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
          showToast(`Welcome back, ${user.name}!`);
        }}
      />
    </div>
  );
}
