/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, metrics, currentUser, logout, switchUserRole } = useShowroom();

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
      label: 'Accessories & Custom Parts',
      icon: Sparkles,
      badge: 'Genuine',
      badgeColor: 'bg-stone-800 text-stone-300 border border-stone-700',
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
      badge: metrics.activeTradeInsCount > 0 ? `${metrics.activeTradeInsCount} Pending` : undefined,
      badgeColor: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'financing',
      label: 'Leasing & EMI Calculator',
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
  ];

  const renderNavGroup = (items: typeof coreNavItems) => (
    <div className="space-y-0.5">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
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
  );

  return (
    <aside className="no-print w-64 bg-[#141518] border-r border-[#24262b] text-stone-300 flex flex-col shrink-0 select-none">
      {/* Dealer Identity Strip with Official Logo */}
      <div className="p-3.5 border-b border-[#24262b] bg-[#101113]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="bg-white px-2 py-1 rounded shadow-xs flex items-center">
            <img
              src="/assets/aistudio/image_b229486a.png"
              alt="Ideal Nova Motors"
              className="h-6 w-auto object-contain"
            />
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        </div>
        <div>
          <div className="text-[12px] font-bold text-white tracking-wide flex items-center gap-1.5">
            <span>IDEAL NOVA MOTORS</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
            <span>Authorized Royal Enfield Hub</span>
            <span>·</span>
            <span>Sri Lanka</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider px-3 py-1 mb-1">
            Core Dealership
          </div>
          {renderNavGroup(coreNavItems)}
        </div>

        <div>
          <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider px-3 py-1 mb-1">
            Experience & Programs
          </div>
          {renderNavGroup(showroomProgramItems)}
        </div>

        <div>
          <div className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider px-3 py-1 mb-1">
            Operations & Reports
          </div>
          {renderNavGroup(operationsItems)}
        </div>
      </nav>

      {/* Active User Card & Quick Role Access */}
      <div className="p-3 border-t border-[#24262b] bg-[#101113] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.name || 'Authorized Staff'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {currentUser?.roleLabel || 'Staff Member'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out of DMS"
            className="text-[10px] font-semibold text-stone-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-stone-800 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Quick Role Switcher for seamless workflow testing */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
          <span className="text-[10px] text-stone-500 font-medium">Switch Role:</span>
          <div className="flex items-center gap-1">
            {(['management', 'sales', 'finance', 'service', 'hr'] as const).map(r => (
              <button
                key={r}
                onClick={() => switchUserRole(r)}
                title={`Switch active user view to ${r}`}
                className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold transition-colors ${
                  currentUser?.role === r
                    ? 'bg-[#9b1c1c] text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {r === 'management' ? 'MGT' : r === 'sales' ? 'SALES' : r === 'finance' ? 'FIN' : r === 'service' ? 'SRV' : 'HR'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
