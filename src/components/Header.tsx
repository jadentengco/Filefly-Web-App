import React from 'react';
import { 
  Menu, 
  UploadCloud, 
  Share2, 
  Shield, 
  Sparkles, 
  User as UserIcon,
  Search
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onOpenMobileSidebar: () => void;
  onOpenAuth: () => void;
  onTriggerUpload: () => void;
  onSharePortal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenMobileSidebar,
  onOpenAuth,
  onTriggerUpload,
  onSharePortal,
  theme,
  onToggleTheme,
}) => {
  const getInitials = () => {
    if (!currentUser?.name) return 'SD';
    const parts = currentUser.name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return currentUser.name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-20 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800/80 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Sidebar Trigger & Welcome */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle-btn"
          onClick={onOpenMobileSidebar}
          className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Client Portal
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-lime-100 dark:bg-[#a3e635]/20 text-lime-800 dark:text-[#a3e635] border border-lime-200 dark:border-[#a3e635]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 dark:bg-[#a3e635] animate-pulse"></span>
              Cloud Sync
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Welcome back, {currentUser ? currentUser.name : 'Sarah Design Co.'}
          </p>
        </div>
      </div>

      {/* Right: Theme Switcher, Quick Action Buttons & Profile Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Theme Switcher Toggle */}
        <ThemeToggle
          theme={theme}
          onToggle={onToggleTheme}
          variant="icon"
          idPrefix="header-theme"
        />

        <button
          id="header-share-portal-btn"
          onClick={onSharePortal}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          <Share2 size={14} className="text-slate-500 dark:text-[#a3e635]" />
          <span>Client Link</span>
        </button>

        <button
          id="header-upload-btn"
          onClick={onTriggerUpload}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-[#a3e635] hover:bg-slate-800 dark:hover:bg-[#bef264] text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <UploadCloud size={14} className="text-[#a3e635] dark:text-slate-950 stroke-[2.5]" />
          <span>Upload</span>
        </button>

        <button
          id="header-profile-avatar"
          onClick={onOpenAuth}
          className="bg-slate-100 dark:bg-slate-800 rounded-full h-10 w-10 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm hover:ring-2 hover:ring-lime-400 dark:hover:ring-[#a3e635] transition-all ml-1 shrink-0"
          title={currentUser ? currentUser.name : 'Sign In / Account'}
        >
          {getInitials()}
        </button>
      </div>
    </header>
  );
};

