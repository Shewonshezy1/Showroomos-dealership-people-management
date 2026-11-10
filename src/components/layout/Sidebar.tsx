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
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, metrics, currentRole } = useShowroom();

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    roleHighlight?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Management Dashboard',
      icon: LayoutDashboard,
      roleHighlight: 'management',
    },
    {
      id: 'crm',
      label: 'CRM & Sales Leads',
      icon: Users,
      badge: metrics.activeLeadsCount,
      badgeColor: 'bg-stone-800 text-stone-300 border border-stone-700',
      roleHighlight: 'sales',
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
      label: 'Delivery & PDI',
      icon: Truck,
      badge: metrics.readyForDeliveryCount > 0 ? `${metrics.readyForDeliveryCount} Ready` : undefined,
      badgeColor: 'bg-amber-950/70 text-amber-300 border border-amber-800',
    },
    {
      id: 'hr',
      label: 'HR & People Ops',
      icon: UserCheck2,
      badge: metrics.pendingLeaveRequestsCount > 0 ? `${metrics.pendingLeaveRequestsCount} Leave` : undefined,
      badgeColor: 'bg-rose-950/70 text-rose-300 border border-rose-800',
      roleHighlight: 'hr',
    },
    {
      id: 'service',
      label: 'Service Bay & PDI',
      icon: Wrench,
    },
    {
      id: 'reports',
      label: 'Reports & CSV Audit',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="no-print w-64 bg-[#141518] border-r border-[#24262b] text-stone-300 flex flex-col shrink-0 select-none">
      {/* Dealer Identity Strip */}
      <div className="p-4 border-b border-[#24262b]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
              Dealer Territory
            </div>
            <div className="text-sm font-semibold text-stone-100 flex items-center gap-1.5 mt-0.5">
              <span>Ideal Motors (Pvt) Ltd</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Royal Enfield Colombo Hub
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="System operational in local preview"></span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider px-3 py-1.5">
          Core Operations
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isRoleFocused =
            (currentRole === 'sales' && item.id === 'crm') ||
            (currentRole === 'hr' && item.id === 'hr') ||
            (currentRole === 'management' && item.id === 'dashboard');

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                isActive
                  ? 'bg-[#9b1c1c] text-white shadow-sm font-semibold'
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
      </nav>

      {/* Role Indicator & Disclaimer Box */}
      <div className="p-3.5 border-t border-[#24262b] bg-[#101113] text-[11px] space-y-2">
        <div className="flex items-center justify-between text-stone-400">
          <span className="text-[10px] uppercase tracking-wider font-semibold">Active Role View</span>
          <span className="font-mono text-stone-200 capitalize text-xs">
            {currentRole}
          </span>
        </div>
        <p className="text-[10px] text-stone-400 leading-relaxed">
          Demo role preview — not authentication. UI illustrates operational workflows.
        </p>
        <div className="pt-1 border-t border-stone-800 text-[10px] text-stone-400 flex items-center justify-between">
          <span>Storage: Browser Local</span>
          <span className="text-emerald-400">Synced</span>
        </div>
      </div>
    </aside>
  );
};
