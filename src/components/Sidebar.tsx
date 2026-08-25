import React from 'react';
import { 
  FolderOpen, 
  Clock,
  Repeat, 
  Share2, 
  HardDrive, 
  LogOut, 
  Sparkles, 
  ShieldCheck, 
  User as UserIcon, 
  X 
} from 'lucide-react';
import { FireflyLogo } from './FireflyLogo';
import { ThemeToggle } from './ThemeToggle';
import { User } from '../types';
import { formatBytes } from '../lib/converter';

interface SidebarProps {
  currentUser: User | null;
  activeTab: 'files' | 'convert' | 'portals' | 'recent';
  onSelectTab: (tab: 'files' | 'convert' | 'portals' | 'recent') => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
  storageUsedBytes: number;
  fileCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onSignOut,
  onOpenAuth,
  storageUsedBytes,
  fileCount,
  isOpenMobile,
  onCloseMobile,
  theme,
  onToggleTheme,
}) => {
  // 5GB simulated portal storage limit
  const maxStorage = 5 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, Math.max(1, (storageUsedBytes / maxStorage) * 100));

  const navItems = [
    {
      id: 'files',
      label: 'Deliverables & Files',
      icon: FolderOpen,
      badge: fileCount > 0 ? `${fileCount}` : undefined,
    },
    {
      id: 'recent',
      label: 'Recent Uploads',
      icon: Clock,
      badge: fileCount > 0 ? `${Math.min(5, fileCount)}` : undefined,
    },
    {
      id: 'convert',
      label: 'Quick Converter',
      icon: Repeat,
      badge: 'Multi-format',
    },
    {
      id: 'portals',
      label: 'Client Share Portal',
      icon: Share2,
      badge: 'Live Dropzone',
    },
  ] as const;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="filefly-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } bg-[#a3e635] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 shadow-lg border-r border-[#84cc16]/40 dark:border-slate-800/80`}
      >
        {/* Top Header & Brand */}
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-[#1e293b] rounded-xl shadow-xs flex items-center justify-center shrink-0 border border-transparent dark:border-[#a3e635]/30">
                <FireflyLogo size={26} glow={theme === 'dark'} />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                  Filefly
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-[#a3e635] block">
                  File Portal & Engine
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              id="sidebar-close-mobile-btn"
              onClick={onCloseMobile}
              className="p-2 rounded-xl text-slate-900 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-800 transition-colors lg:hidden"
              aria-label="Close Sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1.5 mt-6" aria-label="Portal Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id as typeof activeTab);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-white/35 dark:bg-[#1e293b] font-semibold text-slate-950 dark:text-white shadow-xs dark:border dark:border-[#a3e635]/30'
                      : 'text-slate-800 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={20}
                      className={
                        isActive
                          ? 'text-slate-950 dark:text-[#a3e635] stroke-[2.2]'
                          : 'text-slate-800 dark:text-slate-400 stroke-2'
                      }
                    />
                    <span className="text-sm font-sans">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-slate-900 dark:bg-[#a3e635] text-white dark:text-slate-950'
                          : 'bg-white/40 dark:bg-slate-800 text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Storage, Theme Toggle & Sign Out / Auth */}
        <div className="p-6 mt-auto border-t border-slate-900/10 dark:border-slate-800/80 space-y-3.5">
          {/* Storage Quota Card */}
          <div className="bg-white/25 dark:bg-[#1e293b]/70 rounded-2xl p-4 border border-white/40 dark:border-slate-800 text-slate-900 dark:text-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-300">
                <HardDrive size={14} className="text-slate-900 dark:text-[#a3e635]" />
                Portal Storage
              </span>
              <span className="text-slate-950 dark:text-white font-mono">{formatBytes(storageUsedBytes)}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-900/15 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 dark:bg-[#a3e635] rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${Math.max(4, storagePercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-800 dark:text-slate-400 font-medium mt-2">
              <span>{fileCount} files</span>
              <span className="text-slate-900 dark:text-[#a3e635] font-semibold">5 GB Max</span>
            </div>
          </div>

          {/* Theme Switcher in Sidebar */}
          <div className="pt-1">
            <ThemeToggle
              theme={theme}
              onToggle={onToggleTheme}
              variant="full"
              idPrefix="sidebar-theme"
            />
          </div>

          {/* User Account / Profile & Sign Out */}
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <div
                  className={`w-9 h-9 rounded-xl ${currentUser.avatarColor || 'bg-slate-900 dark:bg-[#a3e635]'} text-white dark:text-slate-950 font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-400 capitalize truncate">
                    {currentUser.role === 'freelancer' ? 'Designer Co.' : 'Client Portal'}
                  </p>
                </div>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-xs border border-transparent dark:border-slate-700"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              id="sign-in-trigger-btn"
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-[#a3e635] text-white dark:text-slate-950 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-[#bef264] transition-colors shadow-xs"
            >
              <UserIcon size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
