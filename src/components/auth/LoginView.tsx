/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { PRESET_USERS } from '../../data/seedData';
import { UserRole } from '../../types';
import {
  Lock,
  Mail,
  ShieldCheck,
  ChevronRight,
  User,
  Sparkles,
  Building2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useShowroom();
  const [email, setEmail] = useState('roshan.s@idealnova.lk');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>('management');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickSelect = (userRole: UserRole) => {
    setSelectedRole(userRole);
    const user = PRESET_USERS.find(u => u.role === userRole);
    if (user) {
      setEmail(user.email);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(email, password, selectedRole);
      setIsLoading(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#0e0f12] text-stone-100 flex flex-col justify-between selection:bg-red-800 selection:text-white">
      {/* Top Bar with System Status */}
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
            Royal Enfield Dealer Management System
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Showroom Network Online
          </span>
          <span className="hidden sm:inline text-stone-600">·</span>
          <span className="hidden sm:inline font-mono">Colombo 03 Flagship Hub</span>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full bg-[#16171b] border border-stone-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in duration-300">
          {/* Left Hero Column: Brand Story & Showroom Visual */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#1b1c22] via-[#15161a] to-[#221010] p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-4 relative z-10">
              <div className="bg-white/95 p-3 rounded-xl shadow-md border border-stone-300 w-fit">
                <img
                  src="/assets/aistudio/image_b229486a.png"
                  alt="Ideal Nova Motors"
                  className="h-10 w-auto object-contain"
                />
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold bg-red-950/70 border border-red-900/60 px-2 py-0.5 rounded">
                  Authorized Dealer
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
                  Royal Enfield Sri Lanka
                </h2>
                <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                  Ideal Nova Motors Dealership & Operations Management System. Centralized CRM, stock allocation, cashier verification, and PDI workshop management.
                </p>
              </div>
            </div>

            {/* Dealership Info Box */}
            <div className="mt-8 pt-6 border-t border-stone-800/80 space-y-3 relative z-10 text-xs text-stone-400">
              <div className="flex items-center gap-2 text-stone-300 font-medium">
                <Building2 className="w-4 h-4 text-red-400 shrink-0" />
                <span>Ideal Nova Motors (Pvt) Ltd</span>
              </div>
              <p className="text-[11px] text-stone-500 pl-6 leading-relaxed">
                Flagship Experience Centre, Galle Road, Colombo 03.<br />
                Hotline: +94 11 234 5678 · info@idealnova.lk
              </p>
              <div className="pt-2 text-[10px] font-mono text-stone-500 pl-6 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enterprise Dealership OS · v2.4 TLS 1.3 Secure</span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Form */}
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between bg-[#18191d]">
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white tracking-tight">Staff Portal Sign In</h3>
                <p className="text-xs text-stone-400 mt-1">
                  Authenticate with your Ideal Nova Motors dealership credentials to access operations.
                </p>
              </div>

              {/* 1-Click Role Switcher Presets */}
              <div className="mb-6">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Quick-Select Staff Account</span>
                  <span className="text-[10px] font-mono text-stone-500">1-Click Fast Access</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_USERS.map(user => {
                    const isSelected = selectedRole === user.role;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleQuickSelect(user.role)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-950/50 border-red-700/80 text-white shadow-xs'
                            : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold truncate text-stone-200">
                            {user.fullName}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {user.designation}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@idealnova.lk"
                      className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-hidden focus:border-red-700"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-stone-300">Password</label>
                    <a href="#reset" onClick={e => e.preventDefault()} className="text-[11px] text-stone-500 hover:text-stone-300">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-stone-100 focus:outline-hidden focus:border-red-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-400 hover:text-stone-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded bg-stone-900 border-stone-700 text-red-700 focus:ring-0"
                    />
                    <span>Remember terminal session</span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-mono">2FA Active</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Sign In to ShowroomOS</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-800/60 text-center text-[11px] text-stone-500">
              Ideal Nova Motors (Pvt) Ltd · All internal dealership activities are monitored and logged.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-stone-800/60 bg-[#121316] text-center text-xs text-stone-500">
        © 2026 Ideal Nova Motors (Pvt) Ltd · Official Royal Enfield Dealership Sri Lanka. All Rights Reserved.
      </footer>
    </div>
  );
};
