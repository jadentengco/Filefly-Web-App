import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  variant?: 'icon' | 'pill' | 'full';
  idPrefix?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  variant = 'icon',
  idPrefix = 'theme',
}) => {
  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <div
        id={`${idPrefix}-toggle-pill`}
        className="flex items-center p-1 bg-black/10 dark:bg-slate-800/80 rounded-xl border border-white/20 dark:border-slate-700/60"
      >
        <button
          type="button"
          onClick={() => {
            if (isDark) onToggle();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !isDark
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
          title="Switch to Light Theme"
        >
          <Sun size={14} className={!isDark ? 'text-amber-500' : 'text-slate-500'} />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isDark) onToggle();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isDark
              ? 'bg-[#a3e635] text-slate-950 shadow-xs'
              : 'text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
          title="Switch to Dark Theme"
        >
          <Moon size={14} className={isDark ? 'text-slate-950' : 'text-slate-600'} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <button
        id={`${idPrefix}-toggle-full-btn`}
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/20 dark:bg-slate-800/70 hover:bg-white/30 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-white/30 dark:border-slate-700/60"
      >
        <span className="flex items-center gap-2">
          {isDark ? (
            <Moon size={15} className="text-[#a3e635]" />
          ) : (
            <Sun size={15} className="text-amber-600" />
          )}
          <span>Appearance</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/40 dark:bg-slate-900 text-slate-900 dark:text-[#a3e635]">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      </button>
    );
  }

  return (
    <button
      id={`${idPrefix}-toggle-btn`}
      type="button"
      onClick={onToggle}
      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs relative group"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon size={16} className="text-[#a3e635] transition-transform rotate-0 duration-200" />
        ) : (
          <Sun size={16} className="text-amber-500 transition-transform rotate-0 duration-200" />
        )}
      </div>
      <span className="sr-only">Toggle Theme</span>
    </button>
  );
};
