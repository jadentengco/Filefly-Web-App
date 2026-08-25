import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  FolderLock, 
  Layers, 
  Zap, 
  CloudLightning,
  CheckCircle2,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { FireflyLogo } from './FireflyLogo';
import { ThemeToggle } from './ThemeToggle';
import { signInWithEmailPassword, signUpWithEmailPassword } from '../lib/auth';
import { User, UserRole } from '../types';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  onContinueGuest?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onContinueGuest,
  theme,
  onToggleTheme,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('freelancer');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const user = await signInWithEmailPassword(email, password);
        onSuccess(user);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await signUpWithEmailPassword(name, email, password, role);
        onSuccess(user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-lime-300 selection:text-slate-950 transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#a3e635] rounded-xl flex items-center justify-center shadow-xs">
            <FireflyLogo size={24} glow={false} />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Filefly
              <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635] animate-pulse" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Secure Cloud File Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {onContinueGuest && (
            <button
              id="guest-access-top-btn"
              onClick={onContinueGuest}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Explore as Guest &rarr;
            </button>
          )}
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div 
            id="auth-screen-card"
            className="bg-white dark:bg-[#111827] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
          >
            {/* Top Accent Banner */}
            <div className="bg-[#a3e635] p-6 text-slate-950">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950">
                    {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
                  </h1>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {mode === 'signin'
                      ? 'Sign in to access your deliverables and cloud storage'
                      : 'Create your account to organize and share files'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/50 flex items-center justify-center shrink-0">
                  <ShieldCheck size={26} className="text-slate-950" />
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="mt-5 grid grid-cols-2 p-1 bg-black/10 rounded-xl text-xs font-bold text-slate-900">
                <button
                  id="auth-screen-tab-signin"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-900 hover:text-slate-950'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="auth-screen-tab-signup"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-900 hover:text-slate-950'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-6 sm:p-8 space-y-5">
              {errorMsg && (
                <div
                  id="auth-screen-error"
                  className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        />
                        <input
                          id="auth-screen-name-input"
                          type="text"
                          required
                          placeholder="e.g. Sarah Chen"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-lime-500 dark:focus:border-[#a3e635] focus:bg-white dark:focus:bg-slate-800 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Account Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('freelancer')}
                          className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                            role === 'freelancer'
                              ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50 dark:bg-[#a3e635]/20 text-slate-900 dark:text-white ring-1 ring-lime-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Briefcase size={14} />
                          Freelancer / Creator
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('client')}
                          className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 ${
                            role === 'client'
                              ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50 dark:bg-[#a3e635]/20 text-slate-900 dark:text-white ring-1 ring-lime-500'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <UserCheck size={14} />
                          Client
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="auth-screen-email-input"
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-lime-500 dark:focus:border-[#a3e635] focus:bg-white dark:focus:bg-slate-800 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      id="auth-screen-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-lime-500 dark:focus:border-[#a3e635] focus:bg-white dark:focus:bg-slate-800 rounded-xl text-sm outline-hidden font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  id="auth-screen-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-slate-950 dark:bg-[#a3e635] hover:bg-slate-900 dark:hover:bg-[#92d32a] text-white dark:text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In to Portal' : 'Create Account'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Guest Explore Link */}
          {onContinueGuest && (
            <div className="mt-6 text-center">
              <button
                id="guest-access-bottom-btn"
                onClick={onContinueGuest}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Prefer to test first? <span className="font-bold underline decoration-lime-500">Continue as Guest</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer Features Bar */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-emerald-500" />
              End-to-End Client Encryption
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CloudLightning size={14} className="text-lime-500 dark:text-[#a3e635]" />
              Real-time Firestore Database
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Layers size={14} className="text-indigo-500" />
              Lossless Multi-Format Conversion
            </span>
          </div>
          <p className="text-[11px]">
            &copy; 2026 Filefly. High-performance deliverable portal.
          </p>
        </div>
      </footer>
    </div>
  );
};
