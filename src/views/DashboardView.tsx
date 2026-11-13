/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import {
  Users,
  Compass,
  FileCheck2,
  DollarSign,
  UserCheck2,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Truck,
  Plus,
  Calendar,
  Sparkles,
  Zap,
  Repeat,
  Calculator,
} from 'lucide-react';

export const DashboardView: React.FC<{
  onOpenNewLead: () => void;
  onOpenNewBooking: () => void;
}> = ({ onOpenNewLead, onOpenNewBooking }) => {
  const {
    metrics,
    leads,
    bikes,
    bookings,
    leaveRequests,
    setCurrentView,
    setSelectedBookingId,
    setSelectedLeadId,
  } = useShowroom();

  // Funnel calculations
  const stageCounts = {
    New: leads.filter(l => l.status === 'New').length,
    Contacted: leads.filter(l => l.status === 'Contacted').length,
    'Test Ride': leads.filter(l => l.status === 'Test Ride').length,
    Quoted: leads.filter(l => l.status === 'Quoted').length,
    Booked: leads.filter(l => l.status === 'Booked').length,
    Closed: leads.filter(l => l.status === 'Closed').length,
    Lost: leads.filter(l => l.status === 'Lost').length,
  };

  // Stock status counts
  const stockCounts = {
    Available: bikes.filter(b => b.status === 'Available').length,
    Reserved: bikes.filter(b => b.status === 'Reserved').length,
    Demo: bikes.filter(b => b.status === 'Demo').length,
    Delivered: bikes.filter(b => b.status === 'Delivered').length,
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Presentation Bar */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
              Dealership Operations Hub
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield Colombo Flagship</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
            ShowroomOS Executive Overview
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
            Operational overview reconciled against stored Firestore showroom records for your authorized permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>
          <button
            onClick={onOpenNewBooking}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Create Booking</span>
          </button>
        </div>
      </div>

      {/* 5 Core Reconciled Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Active Leads */}
        <div
          onClick={() => setCurrentView('crm')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Leads</span>
            <Users className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {metrics.activeLeadsCount}
            </span>
            <span className="text-[11px] text-amber-400 flex items-center gap-0.5 font-medium">
              <span>CRM</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            In active qualification funnel
          </div>
        </div>

        {/* Metric 2: Available Bikes */}
        <div
          onClick={() => setCurrentView('inventory')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Available Stock</span>
            <Compass className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {metrics.availableBikesCount}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-medium">
              <span>{bikes.length} Total</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Ready for instant allocation
          </div>
        </div>

        {/* Metric 3: Confirmed Bookings */}
        <div
          onClick={() => setCurrentView('bookings')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Confirmed Bookings</span>
            <FileCheck2 className="w-4 h-4 text-stone-400 group-hover:text-white transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {metrics.confirmedBookingsCount}
            </span>
            <span className="text-[11px] text-stone-400 flex items-center gap-0.5 font-medium">
              <span>{metrics.deliveredCount} Delivered</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Chassis locked & allocated
          </div>
        </div>

        {/* Metric 4: Verified Collections (LKR) */}
        <div
          onClick={() => setCurrentView('bookings')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Verified Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
              {formatLKR(metrics.verifiedCollectionsLkr)}
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {metrics.unverifiedPaymentsLkr > 0 ? (
              <span className="text-amber-400 font-mono">
                +{formatLKR(metrics.unverifiedPaymentsLkr)} pending
              </span>
            ) : (
              '100% verified collections'
            )}
          </div>
        </div>

        {/* Metric 5: Pending Leave Requests */}
        <div
          onClick={() => setCurrentView('hr')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Leave Requests</span>
            <UserCheck2 className="w-4 h-4 text-stone-400 group-hover:text-rose-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.pendingLeaveRequestsCount > 0 ? 'text-rose-400' : 'text-stone-300'
              }`}
            >
              {metrics.pendingLeaveRequestsCount}
            </span>
            <span className="text-[11px] text-stone-400 flex items-center gap-0.5 font-medium">
              <span>HR Ops</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {metrics.pendingLeaveRequestsCount > 0
              ? 'Pending management approval'
              : 'All requests settled'}
          </div>
        </div>
      </div>

      {/* 2-Column Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Pipeline Funnel (2 Cols) */}
        <div className="lg:col-span-2 bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Sales Pipeline Velocity & Lead Stages
              </h3>
              <p className="text-xs text-stone-400">
                Current customer journey distribution across CRM pipeline
              </p>
            </div>
            <button
              onClick={() => setCurrentView('crm')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View CRM Pipeline</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Funnel Progress Bars */}
          <div className="space-y-3 pt-1">
            {Object.entries(stageCounts).map(([stage, count]) => {
              const maxLeads = Math.max(...Object.values(stageCounts), 1);
              const percentage = Math.round((count / Math.max(leads.length, 1)) * 100);
              const barWidth = Math.max(8, (count / maxLeads) * 100);

              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-300">{stage}</span>
                    <span className="font-mono text-stone-400 tabular-nums">
                      {count} leads ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#121316] h-2 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stage === 'Booked'
                          ? 'bg-[#9b1c1c]'
                          : stage === 'Quoted'
                          ? 'bg-amber-500'
                          : stage === 'Test Ride'
                          ? 'bg-blue-500'
                          : stage === 'Lost'
                          ? 'bg-stone-700'
                          : 'bg-stone-500'
                      }`}
                      style={{ width: `${count === 0 ? 0 : barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
            <span>Total Inquiries: <strong className="text-stone-200 font-mono">{leads.length}</strong></span>
            <span>Total Stock Value: <strong className="text-stone-200 font-mono">{formatLKR(metrics.totalStockValueLkr)}</strong></span>
          </div>
        </div>

        {/* Inventory Status Breakdown (1 Col) */}
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Showroom Inventory
              </h3>
              <p className="text-xs text-stone-400">
                Stock allocation by status
              </p>
            </div>
            <button
              onClick={() => setCurrentView('inventory')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>Manage Stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#141518] p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                Available
              </span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {stockCounts.Available}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Unallocated units
              </span>
            </div>

            <div className="bg-[#141518] p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                Reserved
              </span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {stockCounts.Reserved}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Tied to orders
              </span>
            </div>

            <div className="bg-[#141518] p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Demo Fleet
              </span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {stockCounts.Demo}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Test ride floor
              </span>
            </div>

            <div className="bg-[#141518] p-3 rounded-lg border border-stone-800">
              <span className="text-[10px] uppercase font-bold text-blue-400 block">
                Delivered
              </span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {stockCounts.Delivered}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Handed over
              </span>
            </div>
          </div>

          {/* Stock Location Summary */}
          <div className="space-y-2 pt-2 border-t border-stone-800 text-xs">
            <span className="text-[10px] uppercase font-semibold text-stone-400 block">
              Stock Distribution:
            </span>
            <div className="space-y-1.5 text-stone-300">
              <div className="flex justify-between">
                <span>Colombo Flagship Floor</span>
                <span className="font-mono text-stone-400">
                  {bikes.filter(b => b.location === 'Colombo Flagship Floor').length} units
                </span>
              </div>
              <div className="flex justify-between">
                <span>Warehouse A - Kelaniya</span>
                <span className="font-mono text-stone-400">
                  {bikes.filter(b => b.location === 'Warehouse A - Kelaniya').length} units
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pre-Delivery Bay</span>
                <span className="font-mono text-stone-400">
                  {bikes.filter(b => b.location === 'Pre-Delivery Bay').length} units
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showroom Experience & Special Programs Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setCurrentView('accessories')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Accessories & Gear</span>
            <Sparkles className="w-4 h-4 text-stone-400 group-hover:text-red-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              {formatLKR(metrics.totalAccessoriesStockValueLkr)}
            </span>
            <span className="text-[11px] text-red-400 flex items-center gap-0.5 font-medium">
              <span>Catalog</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Royal Enfield Accessories & Parts Catalog
          </div>
        </div>

        <div
          onClick={() => setCurrentView('testrides')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Test Ride Desk</span>
            <Zap className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              {metrics.scheduledTestRidesCount} Slots
            </span>
            <span className="text-[11px] text-amber-400 flex items-center gap-0.5 font-medium">
              <span>Demo Fleet</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Demo trials & driving license logs
          </div>
        </div>

        <div
          onClick={() => setCurrentView('tradein')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Trade-In Exchange</span>
            <Repeat className="w-4 h-4 text-stone-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              {metrics.activeTradeInsCount} Pending
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-medium">
              <span>Valuations</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Multi-brand commuter credit desk
          </div>
        </div>

        <div
          onClick={() => setCurrentView('financing')}
          className="bg-[#18191d] border border-stone-800 hover:border-stone-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1c1d22] group"
        >
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Leasing & EMI</span>
            <Calculator className="w-4 h-4 text-stone-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              EMI Simulator
            </span>
            <span className="text-[11px] text-blue-400 flex items-center gap-0.5 font-medium">
              <span>Calculate</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Down payments & bank leasing
          </div>
        </div>
      </div>

      {/* Recent Activity Feed & Active Bookings Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Confirmed Bookings Table */}
        <div className="lg:col-span-2 bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Active Vehicle Bookings
              </h3>
              <p className="text-xs text-stone-400">
                Customer allocation contracts and verification status
              </p>
            </div>
            <button
              onClick={() => setCurrentView('bookings')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>All Bookings</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase text-stone-400 bg-[#121316] border-y border-stone-800">
                <tr>
                  <th className="py-2.5 px-3">Order Ref</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Motorcycle</th>
                  <th className="py-2.5 px-3">Verified Paid</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {bookings.slice(0, 4).map(b => {
                  const verifiedPaid = b.payments
                    .filter(p => p.status === 'Verified')
                    .reduce((sum, p) => sum + p.amountLkr, 0);
                  const balance = b.finalPriceLkr - verifiedPaid;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setCurrentView('bookings');
                      }}
                      className="hover:bg-stone-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-300">
                        {b.id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white block">{b.customerName}</span>
                        <span className="text-[11px] text-stone-400">{b.customerPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-stone-200 block font-medium">{b.bikeModel}</span>
                        <span className="font-mono text-[10px] text-stone-400">{b.bikeChassis}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                        {formatLKR(verifiedPaid)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-300">
                        {balance === 0 ? (
                          <span className="text-emerald-400">Settled (0)</span>
                        ) : (
                          formatLKR(balance)
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-amber-400 hover:underline">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Controls & Governance Summary */}
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Dealership Governance & Controls
              </h3>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Every metric on this dashboard reflects Firestore showroom records accessible under your assigned staff role. Financial approvals, chassis allocations, and handover gates are enforced server-side.
            </p>

            <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 space-y-2 text-xs">
              <div className="font-semibold text-stone-200">Mandatory Workflow Gates:</div>
              <ul className="space-y-1.5 text-stone-400 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  1:1 atomic chassis reservation per active booking
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Finance verification & approval before collections count
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Zero balance + PDI sign-off required for handover
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('bookings')}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <FileCheck2 className="w-4 h-4 text-amber-400" />
            <span>Open Bookings & Payments Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
