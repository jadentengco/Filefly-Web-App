import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  HardDrive, 
  FolderOpen, 
  Search, 
  Calendar, 
  Mail, 
  FileText, 
  Download, 
  Eye, 
  LogOut, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Tag,
  Copy,
  Check,
  RefreshCw,
  User as UserIcon,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';
import { User, FileItem } from '../types';
import { formatBytes, getFileCategory } from '../lib/converter';
import { 
  getAllUsersFromFirestore, 
  getAllFilesFromFirestore, 
  subscribeToAllUsers, 
  subscribeToAllFiles 
} from '../lib/storage';
import { DEMO_USERS, ADMIN_USER_ID } from '../lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { FireflyLogo } from './FireflyLogo';

interface AdminDashboardViewProps {
  currentUser: User;
  onSignOut: () => void;
  onPreviewFile: (file: FileItem) => void;
  onDownloadFile: (file: FileItem) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onSignOut,
  onPreviewFile,
  onDownloadFile,
  theme,
  onToggleTheme,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Search and filter states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'freelancer' | 'client' | 'admin'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'all-files'>('users');

  // Load and subscribe to real-time users and files
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadInitialAdminData() {
      try {
        const [firestoreUsers, firestoreFiles] = await Promise.all([
          getAllUsersFromFirestore(),
          getAllFilesFromFirestore(),
        ]);

        if (isMounted) {
          // Merge with known demo users if not already present in Firestore
          const mergedUsersMap = new Map<string, User>();
          
          // Add demo users as baseline
          DEMO_USERS.forEach((u) => mergedUsersMap.set(u.id, u));
          // Always ensure current admin user is in map
          mergedUsersMap.set(currentUser.id, currentUser);
          // Overwrite with Firestore real live users
          firestoreUsers.forEach((u) => mergedUsersMap.set(u.id, u));

          const finalUsers = Array.from(mergedUsersMap.values());
          setUsers(finalUsers);
          setAllFiles(firestoreFiles);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialAdminData();

    // Subscribe to real-time updates from Firestore
    const unsubUsers = subscribeToAllUsers((realtimeUsers) => {
      if (isMounted && realtimeUsers && realtimeUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map<string, User>();
          DEMO_USERS.forEach((u) => map.set(u.id, u));
          map.set(currentUser.id, currentUser);
          prev.forEach((u) => map.set(u.id, u));
          realtimeUsers.forEach((u) => map.set(u.id, u));
          return Array.from(map.values());
        });
      }
    });

    const unsubFiles = subscribeToAllFiles((realtimeFiles) => {
      if (isMounted && realtimeFiles) {
        setAllFiles(realtimeFiles);
      }
    });

    return () => {
      isMounted = false;
      unsubUsers();
      unsubFiles();
    };
  }, [currentUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [firestoreUsers, firestoreFiles] = await Promise.all([
        getAllUsersFromFirestore(),
        getAllFilesFromFirestore(),
      ]);

      const map = new Map<string, User>();
      DEMO_USERS.forEach((u) => map.set(u.id, u));
      map.set(currentUser.id, currentUser);
      firestoreUsers.forEach((u) => map.set(u.id, u));
      
      setUsers(Array.from(map.values()));
      setAllFiles(firestoreFiles);
    } catch (err) {
      console.warn('Manual refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Map files count and total size per user
  const userStatsMap = useMemo(() => {
    const counts: Record<string, { count: number; totalBytes: number; files: FileItem[] }> = {};
    for (const u of users) {
      counts[u.id] = { count: 0, totalBytes: 0, files: [] };
    }
    for (const file of allFiles) {
      if (!counts[file.userId]) {
        counts[file.userId] = { count: 0, totalBytes: 0, files: [] };
      }
      counts[file.userId].count += 1;
      counts[file.userId].totalBytes += file.size || 0;
      counts[file.userId].files.push(file);
    }
    return counts;
  }, [users, allFiles]);

  // Overall platform statistics
  const totalPlatformStorageBytes = useMemo(() => {
    return allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [allFiles]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = 
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearchQuery, roleFilter]);

  // Active selected user
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Files of selected user
  const selectedUserFiles = useMemo(() => {
    if (!selectedUserId) return [];
    const userFiles = userStatsMap[selectedUserId]?.files || [];
    if (!fileSearchQuery.trim()) return userFiles;
    const q = fileSearchQuery.toLowerCase();
    return userFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.extension.toLowerCase().includes(q) ||
        (f.tags && f.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [selectedUserId, userStatsMap, fileSearchQuery]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format date helper
  const formatCreationDate = (isoString?: string) => {
    if (!isoString) return 'Unknown date';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 flex flex-col font-sans antialiased selection:bg-purple-300 selection:text-slate-950 transition-colors duration-200">
      {/* Top Admin Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 px-6 sm:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Filefly
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                </span>
                {/* Prominent Admin Badge */}
                <span
                  id="admin-status-badge"
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Firestore Cloud Database & Multi-User Governance
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            <button
              id="admin-refresh-data-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-purple-400' : ''} />
              <span>Refresh</span>
            </button>

            <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon" idPrefix="admin-theme" />

            <div className="h-6 w-px bg-slate-800 mx-1" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                A
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-white leading-tight">Admin User</p>
                <p className="text-[10px] text-purple-300 font-mono">UID: {currentUser.id.substring(0, 10)}...</p>
              </div>
            </div>

            <button
              id="admin-sign-out-btn"
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-10 space-y-8">
        {/* Banner with Live Database Status & Admin Privileges Notice */}
        <section className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/60 p-6 rounded-3xl border border-purple-500/30 dark:border-purple-500/20 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider">
                  Super Admin
                </span>
                <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                  <ShieldCheck size={14} className="text-purple-600 dark:text-purple-400" />
                  Full Firestore Read Authorization Granted
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                System Administration & User Database
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                You are authenticated with Admin ID <code className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-bold">{ADMIN_USER_ID}</code>.
                You can inspect all user profiles and browse user deliverables uploaded across the platform.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-2 rounded-2xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
              <div className="px-3 py-1.5 text-center border-r border-slate-200 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Users</p>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400">{users.length}</p>
              </div>
              <div className="px-3 py-1.5 text-center border-r border-slate-200 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Files</p>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{allFiles.length}</p>
              </div>
              <div className="px-3 py-1.5 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Storage Used</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatBytes(totalPlatformStorageBytes)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Selected User Files View (Drill-down view) */}
        {selectedUser ? (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Back Button & User Info Header */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <button
                  id="admin-back-to-users-btn"
                  onClick={() => {
                    setSelectedUserId(null);
                    setFileSearchQuery('');
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer w-fit"
                >
                  <ArrowLeft size={16} />
                  <span>&larr; Back to All Users List</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Viewing User Files:</span>
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800">
                    {userStatsMap[selectedUser.id]?.count || 0} Files ({formatBytes(userStatsMap[selectedUser.id]?.totalBytes || 0)})
                  </span>
                </div>
              </div>

              {/* User Profile Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl ${selectedUser.avatarColor || 'bg-purple-600'} text-white font-black text-xl flex items-center justify-center shadow-md`}
                  >
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {selectedUser.role}
                      </span>
                      {selectedUser.id === ADMIN_USER_ID && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail size={13} className="text-slate-400" />
                        {selectedUser.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        Account Created: {formatCreationDate(selectedUser.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400">UID:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedUser.id}</span>
                  <button
                    onClick={() => handleCopy(selectedUser.id, `uid-${selectedUser.id}`)}
                    className="p-1 text-slate-400 hover:text-purple-600 transition-colors ml-1"
                    title="Copy UID"
                  >
                    {copiedId === `uid-${selectedUser.id}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Files Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user's files..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
              </div>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {selectedUserFiles.length} file{selectedUserFiles.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Files Grid / List for Selected User */}
            {selectedUserFiles.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No files uploaded yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  {fileSearchQuery
                    ? `No files matching "${fileSearchQuery}" found for this user.`
                    : `${selectedUser.name} has not uploaded any files or deliverables yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedUserFiles.map((file) => (
                  <div
                    key={file.id}
                    id={`admin-file-card-${file.id}`}
                    className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800 shrink-0">
                            {file.extension.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 truncate">
                            {getFileCategory(file.extension)}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      </div>

                      <h4
                        className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1"
                        title={file.name}
                      >
                        {file.name}
                      </h4>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3">
                        <Clock size={12} />
                        <span>{formatCreationDate(file.uploadedAt)}</span>
                      </div>

                      {/* File Tags */}
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-3">
                          {file.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        ID: {file.id.substring(0, 8)}...
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          id={`admin-preview-btn-${file.id}`}
                          onClick={() => onPreviewFile(file)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title="Preview File"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          id={`admin-download-btn-${file.id}`}
                          onClick={() => onDownloadFile(file)}
                          className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 text-purple-600 dark:text-purple-400 hover:text-white transition-colors"
                          title="Download File"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Users Directory View */
          <section className="space-y-6">
            {/* Control & Search Bar */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-purple-600 dark:text-purple-400" />
                    Firestore Registered Users Directory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click on any user row to inspect their uploaded deliverables and files
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-72">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="admin-user-search-input"
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 font-medium"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    id="admin-role-filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden focus:border-purple-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="freelancer">Freelancers</option>
                    <option value="client">Clients</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table / List */}
            {isLoading ? (
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Loading Firestore users & files...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                <Users size={32} className="text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No users found</h3>
                <p className="text-xs text-slate-400 mt-1">No user profiles matched your current search filters.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-6">User Profile</th>
                        <th className="py-3.5 px-6">Role</th>
                        <th className="py-3.5 px-6">Email Address</th>
                        <th className="py-3.5 px-6">Account Created</th>
                        <th className="py-3.5 px-6 text-center">Uploaded Files</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                      {filteredUsers.map((user) => {
                        const stats = userStatsMap[user.id] || { count: 0, totalBytes: 0 };
                        const isCurrent = user.id === currentUser.id;
                        const isAdminUser = user.id === ADMIN_USER_ID || user.role === 'admin';

                        return (
                          <tr
                            key={user.id}
                            id={`admin-user-row-${user.id}`}
                            onClick={() => setSelectedUserId(user.id)}
                            className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                          >
                            {/* User Avatar & Name */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl ${user.avatarColor || 'bg-purple-600'} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                                      {user.name}
                                    </p>
                                    {isCurrent && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-400 truncate">
                                    UID: {user.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isAdminUser
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                    : user.role === 'freelancer'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>

                            {/* Email Address */}
                            <td className="py-4 px-6 font-medium text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <Mail size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </td>

                            {/* Account Created Date */}
                            <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-400 shrink-0" />
                                <span>{formatCreationDate(user.createdAt)}</span>
                              </div>
                            </td>

                            {/* Uploaded Files Count */}
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                                  stats.count > 0
                                    ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                              >
                                <FileText size={12} />
                                {stats.count} {stats.count === 1 ? 'file' : 'files'}
                              </span>
                              {stats.totalBytes > 0 && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {formatBytes(stats.totalBytes)}
                                </p>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-4 px-6 text-right">
                              <button
                                id={`admin-view-user-files-${user.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUserId(user.id);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-600 text-purple-700 dark:text-purple-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <span>View Files</span>
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Admin Footer */}
      <footer className="px-10 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <p>© {new Date().getFullYear()} Filefly Admin System • Firestore Cloud Database & User Management.</p>
      </footer>
    </div>
  );
};
