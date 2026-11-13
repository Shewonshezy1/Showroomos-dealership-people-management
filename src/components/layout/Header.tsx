/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { ROLE_LABELS, isSuperAdminUser } from '../../auth/permissions';
import { LogOut, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout, currentView } = useShowroom();

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Management Overview';
      case 'crm':
        return 'CRM & Sales Pipeline';
      case 'inventory':
        return 'Motorcycle Stock & Inventory';
      case 'bookings':
        return 'Customer Bookings & Payments';
      case 'delivery':
        return 'Pre-Delivery Inspection & Handover';
      case 'accessories':
        return 'Accessories & Apparel Catalog';
      case 'testrides':
        return 'Test Ride Operations & Feedback Log';
      case 'tradein':
        return 'Motorcycle Trade-In & Valuation Desk';
      case 'financing':
        return 'Leasing & EMI Estimator (Illustrative)';
      case 'hr':
        return 'People Operations & Attendance';
      case 'service':
        return 'Service Bay & PDI Job Cards';
      case 'reports':
        return 'Reconciliation & CSV Exports';
      case 'admin':
        return isSuperAdminUser(currentUser)
          ? 'Super Admin Dashboard & Governance'
          : 'Staff Access Governance & Audit Trail';
      default:
        return 'Showroom Operations';
    }
  };

  return (
    <header className="no-print bg-[#16171b] border-b border-[#292b32] text-white sticky top-0 z-30 select-none">
      {/* Top Status Bar */}
      <div className="bg-[#1a1b22] border-b border-[#282a33] px-5 py-1.5 flex flex-wrap items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-white tracking-wide">
            IDEAL NOVA MOTORS
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-300 font-medium">
            Royal Enfield Showroom Operations · Sri Lanka
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore RBAC Enforced</span>
          </span>
          <span className="text-stone-600">·</span>
          <span>Colombo 03 Hub · Prices Illustrative (LKR)</span>
        </div>
      </div>

      {/* Main Top Header */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-6">
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
                Dealership & Operations Management
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

        {/* Authenticated Staff Session Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser && (
            <div className="flex items-center gap-2.5 px-3 py-1 bg-stone-900 border border-stone-800 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-xs">
                {(currentUser.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left text-xs leading-tight">
                <div className="font-semibold text-white truncate max-w-[160px]">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-amber-300 font-mono">
                  {ROLE_LABELS[currentUser.role] || currentUser.designation}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out of dealership portal"
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 ml-2 px-2 py-1 rounded hover:bg-stone-800 font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
