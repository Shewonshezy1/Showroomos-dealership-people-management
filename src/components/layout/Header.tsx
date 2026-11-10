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
    currentRole,
    setCurrentRole,
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
      {/* Top Advisory Disclaimer Bar */}
      <div className="bg-[#1f2026] border-b border-[#2a2c34] px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span className="font-semibold text-stone-200">
            ShowroomOS Demo Proposal
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-300">
            Ideal Motors Sri Lanka · Royal Enfield Showroom Operations
          </span>
          <span className="hidden md:inline text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded text-[11px] border border-stone-700">
            Independent proposal demo — not an official system
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Browser-Local Storage
          </span>
          <span className="text-stone-600">·</span>
          <span>Illustrative LKR Pricing & Payroll</span>
        </div>
      </div>

      {/* Main Top Header: 3-Zone Contract */}
      <div className="px-5 py-3 flex items-center justify-between gap-6">
        {/* Zone 1: Brand & View Context */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm border border-red-700">
              RE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                  ShowroomOS
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-amber-300/90 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                  Proposal
                </span>
              </div>
              <div className="text-[11px] text-stone-400 whitespace-nowrap">
                Royal Enfield Showroom · Colombo Flagship
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-7 w-px bg-stone-700/60 mx-1"></div>

          <div className="hidden lg:block min-w-0">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-medium">
              Current Module
            </span>
            <h2 className="text-sm font-semibold text-stone-100 truncate">
              {getViewTitle()}
            </h2>
          </div>
        </div>

        {/* Zone 2: Demo Role Preview Switcher (Explicitly labeled) */}
        <div className="hidden md:flex items-center gap-2 bg-[#1f2127] p-1 rounded-lg border border-[#30333d]">
          <span className="text-[11px] text-stone-400 px-2 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden xl:inline">Demo Role:</span>
          </span>
          {(['management', 'sales', 'hr'] as DemoRole[]).map(role => {
            const active = currentRole === role;
            const labels: Record<DemoRole, string> = {
              management: 'Management',
              sales: 'Sales Consultant',
              hr: 'HR & People',
            };
            return (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                title="Demo role preview — not authentication"
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#9b1c1c] text-white shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {labels[role]}
              </button>
            );
          })}
        </div>

        {/* Zone 3: Actions (Demo Guide & Reset) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setDemoGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/70 rounded-md transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Walkthrough Guide</span>
          </button>

          <button
            onClick={onOpenResetModal}
            title="Reset demo data back to default state"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700 border border-stone-700 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Reset Seed Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
