/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import {
  Lock,
  Mail,
  ShieldCheck,
  ChevronRight,
  Building2,
  KeyRound,
  AlertTriangle,
  Ban,
  LogOut,
  Loader2,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    authStatus,
    authError,
    pendingAuthEmail,
    signInWithGoogle,
    signInWithEmail,
    sendPasswordReset,
    logout,
  } = useShowroom();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetNotice, setResetNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetNotice(null);
    if (resetMode) {
      setIsLoading(true);
      const res = await sendPasswordReset(email);
      setIsLoading(false);
      setResetNotice({ ok: res.success, msg: res.message });
      return;
    }
    setIsLoading(true);
    await signInWithEmail(email, password);
    setIsLoading(false);
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0e0f12] text-stone-100 flex items-center justify-center p-6">
        <div className="bg-[#16171b] border border-stone-800 rounded-2xl p-8 max-w-md w-full text-center space-y-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          <h2 className="text-base font-bold text-white">Verifying Staff Identity...</h2>
          <p className="text-xs text-stone-400">
            Checking Firebase Authentication session and Firestore staff authorization rules.
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'disabled' || authStatus === 'uninvited' || authStatus === 'unverified_email') {
    const title =
      authStatus === 'disabled'
        ? 'Staff Account Disabled'
        : authStatus === 'unverified_email'
        ? 'Email Verification Required'
        : 'Access Denied — Invitation Required';

    const detail =
      authStatus === 'disabled'
        ? 'Your dealership account has been disabled by a System Administrator. Contact IT/Management to restore access.'
        : authStatus === 'unverified_email'
        ? 'Your email address has not been verified. Please verify your email via the link sent to your inbox before signing in.'
        : 'Public self-registration is disabled. Your account has not been pre-invited or assigned a staff role by an authorized System Administrator.';

    return (
      <div className="min-h-screen bg-[#0e0f12] text-stone-100 flex items-center justify-center p-6">
        <div className="bg-[#16171b] border border-rose-900/70 rounded-2xl p-8 max-w-md w-full space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {pendingAuthEmail && (
              <p className="text-xs font-mono text-amber-300 mt-1">{pendingAuthEmail}</p>
            )}
            <p className="text-xs text-stone-300 mt-3 leading-relaxed">{detail}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Return to Staff Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0f12] text-stone-100 flex flex-col justify-between selection:bg-red-800 selection:text-white">
      {/* Top Bar */}
      <header className="px-6 py-3 border-b border-stone-800/80 bg-[#141518]/80 backdrop-blur-md flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="bg-white/95 px-2.5 py-1 rounded shadow-xs border border-stone-300 flex items-center">
            <img
              src="/assets/aistudio/image_b229486a.png"
              alt="Ideal Nova Motors"
              className="h-6 w-auto object-contain"
            />
          </div>
          <span className="text-stone-500">|</span>
          <span className="text-stone-300 font-semibold tracking-wide">
            ShowroomOS — Dealership Staff Portal
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="hidden sm:inline font-mono">Colombo 03 · Invite-Only Access</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full bg-[#16171b] border border-stone-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Hero Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1b1c22] via-[#15161a] to-[#221010] p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-800 relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="bg-white/95 p-3 rounded-xl shadow-md border border-stone-300 w-fit">
                <img
                  src="/assets/aistudio/image_b229486a.png"
                  alt="Ideal Nova Motors"
                  className="h-10 w-auto object-contain"
                />
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300 font-bold bg-amber-950/60 border border-amber-900/60 px-2 py-0.5 rounded">
                  Restricted Staff Access
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
                  Ideal Nova Motors
                </h2>
                <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                  Internal dealership operations platform for Royal Enfield showroom CRM, unit allocation, cashier payment verification, and workshop PDI workflows.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-stone-800/80 space-y-3 relative z-10 text-xs text-stone-400">
              <div className="flex items-center gap-2 text-stone-300 font-medium">
                <Building2 className="w-4 h-4 text-red-400 shrink-0" />
                <span>Ideal Nova Motors (Pvt) Ltd</span>
              </div>
              <p className="text-[11px] text-stone-500 pl-6 leading-relaxed">
                Colombo Operations Hub · Sri Lanka<br />
                Authentication & authorization enforced via Firebase Authentication and Firestore Security Rules.
              </p>
              <div className="pt-2 text-[10px] font-mono text-stone-500 pl-6 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Role-Based Access Control Enabled</span>
              </div>
            </div>
          </div>

          {/* Right Column: Single Staff Sign-In */}
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between bg-[#18191d]">
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {resetMode ? 'Reset Staff Password' : 'Staff Sign In'}
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {resetMode
                    ? 'Enter your invited corporate email address to request a Firebase password reset email.'
                    : 'Sign in using your pre-invited company Google account or assigned staff email and password.'}
                </p>
              </div>

              {authError && (
                <div className="bg-rose-950/60 border border-rose-800 rounded-lg p-3 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {resetNotice && (
                <div
                  className={`rounded-lg p-3 text-xs border ${
                    resetNotice.ok
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {resetNotice.msg}
                </div>
              )}

              {!resetMode && (
                <>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-4 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-900 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>Sign in with Company Google Account</span>
                  </button>

                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-stone-800"></div>
                    <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-stone-500">
                      Or Email & Password
                    </span>
                    <div className="flex-grow border-t border-stone-800"></div>
                  </div>
                </>
              )}

              {/* Email / Password Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.lk"
                      className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-hidden focus:border-red-700"
                    />
                  </div>
                </div>

                {!resetMode && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-stone-300">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetMode(true);
                          setResetNotice(null);
                        }}
                        className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your staff password"
                        className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-hidden focus:border-red-700"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : resetMode ? (
                    <span>Send Password Reset Link</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Sign In with Email & Password</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {resetMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(false);
                      setResetNotice(null);
                    }}
                    className="w-full text-center text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                )}
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-800/60 text-[11px] text-stone-500 space-y-1">
              <p className="text-stone-400 font-medium">
                No public self-registration: Accounts must be invited and assigned a role by an authorized System Administrator.
              </p>
              <p>All protected operations are recorded in the immutable dealership audit log.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-stone-800/60 bg-[#121316] text-center text-xs text-stone-500">
        © 2026 Ideal Nova Motors (Pvt) Ltd · ShowroomOS Dealership Management System
      </footer>
    </div>
  );
};
