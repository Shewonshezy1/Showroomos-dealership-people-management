/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { ROLE_LABELS, isSuperAdminUser } from '../../auth/permissions';
import { AppView } from '../../types';
import {
  LayoutDashboard,
  Users,
  Compass,
  FileCheck2,
  Truck,
  UserCheck2,
  Wrench,
  BarChart3,
  Sparkles,
  Zap,
  Repeat,
  Calculator,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, metrics, currentUser, logout, canView } = useShowroom();

  const coreNavItems: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Management Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'crm',
      label: 'CRM & Sales Pipeline',
      icon: Users,
      badge: metrics.activeLeadsCount,
      badgeColor: 'bg-stone-800 text-stone-300 border border-stone-700',
    },
    {
      id: 'inventory',
      label: 'Motorcycle Inventory',
      icon: Compass,
      badge: `${metrics.availableBikesCount} Avail`,
      badgeColor: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'bookings',
      label: 'Bookings & Payments',
      icon: FileCheck2,
      badge: metrics.confirmedBookingsCount,
      badgeColor: 'bg-stone-800 text-stone-300 border border-stone-700',
    },
    {
      id: 'delivery',
      label: 'Delivery & Handover',
      icon: Truck,
      badge: metrics.readyForDeliveryCount > 0 ? `${metrics.readyForDeliveryCount} Ready` : undefined,
      badgeColor: 'bg-amber-950/70 text-amber-300 border border-amber-800',
    },
  ];

  const showroomProgramItems: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'accessories',
      label: 'Accessories & Apparel',
      icon: Sparkles,
    },
    {
      id: 'testrides',
      label: 'Test Ride Experience',
      icon: Zap,
      badge: metrics.scheduledTestRidesCount > 0 ? `${metrics.scheduledTestRidesCount} Booked` : undefined,
      badgeColor: 'bg-amber-950/70 text-amber-300 border border-amber-800',
    },
    {
      id: 'tradein',
      label: 'Bike Exchange / Trade-In',
      icon: Repeat,
      badge: metrics.activeTradeInsCount > 0 ? `${metrics.activeTradeInsCount} Open` : undefined,
      badgeColor: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'financing',
      label: 'Leasing & EMI Estimator',
      icon: Calculator,
    },
  ];

  const operationsItems: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'hr',
      label: 'HR & Staff Operations',
      icon: UserCheck2,
      badge: metrics.pendingLeaveRequestsCount > 0 ? `${metrics.pendingLeaveRequestsCount} Leave` : undefined,
      badgeColor: 'bg-rose-950/70 text-rose-300 border border-rose-800',
    },
    {
      id: 'service',
      label: 'Service Bay & PDI',
      icon: Wrench,
    },
    {
      id: 'reports',
      label: 'Reports & CSV Audits',
      icon: BarChart3,
    },
    {
      id: 'admin',
      label: isSuperAdminUser(currentUser) ? 'Super Admin Console' : 'Access & Audit Logs',
      icon: ShieldCheck,
    },
  ];

  const renderNavGroup = (label: string, items: typeof coreNavItems) => {
    const allowed = items.filter(item => canView(item.id));
    if (allowed.length === 0) return null;

    return (
      <div>
        <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider px-3 py-1 mb-1">
          {label}
        </div>
        <div className="space-y-0.5">
          {allowed.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-stone-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                      isActive
                        ? 'bg-black/40 text-white'
                        : item.badgeColor || 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="no-print w-64 bg-[#141518] border-r border-[#24262b] text-stone-300 flex flex-col shrink-0 select-none">
      {/* Dealer Identity Strip */}
      <div className="p-3.5 border-b border-[#24262b] bg-[#101113]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="bg-white px-2 py-1 rounded shadow-xs flex items-center">
            <img
              src="/assets/aistudio/image_b229486a.png"
              alt="Ideal Nova Motors"
              className="h-6 w-auto object-contain"
            />
          </div>
          <span className="text-[10px] text-stone-400 font-mono bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded">
            FIRESTORE
          </span>
        </div>
        <div>
          <div className="text-[12px] font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>IDEAL NOVA MOTORS</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
            <span>Royal Enfield Showroom</span>
            <span>·</span>
            <span>Sri Lanka</span>
          </div>
        </div>
      </div>

      {/* Permission-Filtered Navigation Links */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {renderNavGroup('Core Dealership', coreNavItems)}
        {renderNavGroup('Experience & Programs', showroomProgramItems)}
        {renderNavGroup('Operations & Governance', operationsItems)}
      </nav>

      {/* Active Authenticated User Card (No Role Switcher) */}
      <div className="p-3 border-t border-[#24262b] bg-[#101113]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.fullName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.fullName || 'Staff Member'}
              </div>
              <div className="text-[10px] text-amber-300 font-mono truncate">
                {currentUser ? ROLE_LABELS[currentUser.role] : 'Authenticated'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="text-[10px] font-semibold text-stone-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
};
