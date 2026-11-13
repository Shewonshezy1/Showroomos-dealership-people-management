/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import {
  RotateCcw,
  BookOpen,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { DemoRole } from '../../types';

export const Header: React.FC<{ onOpenResetModal: () => void }> = ({ onOpenResetModal }) => {
  const {
    currentUser,
    logout,
    currentRole,
    switchUserRole,
    setDemoGuideOpen,
    currentView,
  } = useShowroom();

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Executive Management Overview';
      case 'crm':
        return 'CRM & Sales Pipeline';
      case 'inventory':
        return 'Motorcycle Stock & Inventory';
      case 'bookings':
        return 'Customer Bookings & Payments';
      case 'delivery':
        return 'Pre-Delivery Inspection & Handover';
      case 'accessories':
        return 'Genuine Accessories & Gear Catalog';
      case 'testrides':
        return 'Test Ride Operations & Feedback Log';
      case 'tradein':
        return 'Motorcycle Trade-In & Valuation Desk';
      case 'financing':
        return 'Motorcycle Leasing & EMI Simulator';
      case 'hr':
        return 'People Operations & Attendance';
      case 'service':
        return 'Service Bay & PDI Job Cards';
      case 'reports':
        return 'Audit Reconciliation & CSV Exports';
      default:
        return 'Showroom Operations';
    }
  };

  return (
    <header className="no-print bg-[#16171b] border-b border-[#292b32] text-white sticky top-0 z-30 select-none">
      {/* Top Dealer Status & Hub Bar */}
      <div className="bg-[#1a1b22] border-b border-[#282a33] px-5 py-1.5 flex flex-wrap items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-white tracking-wide">
            IDEAL NOVA MOTORS
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-300 font-medium">
            Royal Enfield Authorized Flagship · Sri Lanka
          </span>
          <span className="hidden md:inline text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] border border-emerald-800/60 font-mono">
            DMS Operational · Live
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Colombo Flagship Showroom
          </span>
          <span className="text-stone-600">·</span>
          <span>Official LKR Pricing (Taxes Included)</span>
        </div>
      </div>

      {/* Main Top Header */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-6">
        {/* Brand & View Context */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1 rounded shadow-xs flex items-center border border-stone-300/40">
              <img
                src="/assets/aistudio/image_b229486a.png"
                alt="Ideal Nova Motors"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                  ShowroomOS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/70 border border-rose-800/70 px-1.5 py-0.2 rounded">
                  Royal Enfield
                </span>
              </div>
              <div className="text-[11px] text-stone-400 whitespace-nowrap">
                Dealership & Enterprise Management
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-7 w-px bg-stone-700/60 mx-1"></div>

          <div className="hidden lg:block min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">
              Active Module
            </span>
            <h2 className="text-sm font-bold text-stone-100 truncate">
              {getViewTitle()}
            </h2>
          </div>
        </div>

        {/* Center: Quick Switcher for Staff Testing */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#1f2127] p-1 rounded-lg border border-[#30333d]">
          <span className="text-[11px] text-stone-400 px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden xl:inline">Staff View:</span>
          </span>
          {(['management', 'sales', 'hr'] as const).map(role => {
            const active = currentRole === role;
            const labels: Record<string, string> = {
              management: 'General Management',
              sales: 'Sales Consultant',
              hr: 'HR & People',
            };
            return (
              <button
                key={role}
                onClick={() => switchUserRole(role)}
                title={`Switch active view to ${labels[role]}`}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {labels[role]}
              </button>
            );
          })}
        </div>

        {/* Right Actions: System User & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 bg-stone-900 border border-stone-800 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-xs">
                {(currentUser.name || currentUser.fullName || 'U').charAt(0)}
              </div>
              <div className="text-left text-xs leading-tight">
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {currentUser.name || currentUser.fullName}
                </div>
                <div className="text-[10px] text-stone-400">
                  {currentUser.roleLabel || currentUser.designation}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out of dealership portal"
                className="text-[11px] text-rose-400 hover:text-rose-300 ml-1 hover:underline font-medium"
              >
                Exit
              </button>
            </div>
          )}

          <button
            onClick={() => setDemoGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-md transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Operations Manual</span>
          </button>

          <button
            onClick={onOpenResetModal}
            title="Reset system database to fresh state"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden lg:inline">Reset Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
