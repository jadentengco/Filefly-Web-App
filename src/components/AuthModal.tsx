import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, Check, Eye, EyeOff, Shield, X, Sparkles } from 'lucide-react';
import { FireflyLogo } from './FireflyLogo';
import { signInWithEmailPassword, signUpWithEmailPassword, DEMO_USERS } from '../lib/auth';
import { User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const user = await signInWithEmailPassword(email, password);
        onSuccess(user);
        onClose();
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await signUpWithEmailPassword(name, email, password, role);
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUser: typeof DEMO_USERS[0]) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const user = await signInWithEmailPassword(demoUser.email, 'password123');
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden relative transition-colors"
      >
        {/* Close Button */}
        <button
          id="auth-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-700 hover:text-black hover:bg-black/10 rounded-full transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="bg-[#a3e635] p-6 text-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-white/40 p-2 rounded-2xl border border-white/40">
              <FireflyLogo size={28} glow={false} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                {mode === 'signin' ? 'Sign In to Filefly' : 'Create an Account'}
              </h2>
              <p className="text-xs font-bold text-slate-800">
                {mode === 'signin'
                  ? 'Access your secure client file portal'
                  : 'Fast file uploads & high-fidelity conversions'}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-black/10 rounded-xl text-xs font-bold text-slate-900">
            <button
              id="auth-tab-signin"
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
              id="auth-tab-signup"
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

        {/* Modal Form Content */}
        <div className="p-6">
          {errorMsg && (
            <div
              id="auth-error-banner"
              className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2"
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
                      id="signup-name-input"
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
                      className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                        role === 'freelancer'
                          ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50 dark:bg-[#a3e635]/20 text-slate-900 dark:text-white ring-1 ring-lime-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Freelancer / Designer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                        role === 'client'
                          ? 'border-lime-500 dark:border-[#a3e635] bg-lime-50 dark:bg-[#a3e635]/20 text-slate-900 dark:text-white ring-1 ring-lime-500'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
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
                  id="auth-email-input"
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
                {mode === 'signin' && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Demo pass: <code className="text-slate-600 dark:text-slate-300 font-mono">password123</code>
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  id="auth-password-input"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-slate-950 dark:bg-[#a3e635] hover:bg-slate-900 dark:hover:bg-[#bef264] text-white dark:text-slate-950 font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-950/30 border-t-white dark:border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center mb-3">
              Or Try 1-Click Demo Profiles
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="demo-login-sarah"
                onClick={() => handleQuickDemoLogin(DEMO_USERS[0])}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-lime-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-lime-300 dark:hover:border-slate-700 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    S
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Sarah Chen</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Freelancer</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                id="demo-login-alex"
                onClick={() => handleQuickDemoLogin(DEMO_USERS[1])}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    A
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Alex Rivera</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Client Account</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
