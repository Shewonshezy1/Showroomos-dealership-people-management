/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import {
  FileCheck2,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  ChevronRight,
  DollarSign,
  AlertCircle,
  Truck,
} from 'lucide-react';

export const BookingsView: React.FC<{
  onOpenNewBooking: () => void;
  onOpenAddPayment: (bookingId: string) => void;
}> = ({ onOpenNewBooking, onOpenAddPayment }) => {
  const {
    bookings,
    setSelectedBookingId,
    setPrintableBookingId,
    metrics,
  } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.bikeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bikeChassis.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', 'Confirmed', 'Delivered', 'Cancelled'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              Contract & Payment Ledger
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield Operations</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Customer Bookings & Verified Payments
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Chassis allocations, payment schedules, and verified revenue reconciliation. Only verified payments count towards collections.
          </p>
        </div>

        <button
          onClick={onOpenNewBooking}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white font-semibold text-xs rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Booking</span>
        </button>
      </div>

      {/* Financial Ledger Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Confirmed Booking Pipeline
          </span>
          <span className="text-xl font-mono font-bold text-white mt-1 block">
            {formatLKR(metrics.totalPipelineValueLkr)}
          </span>
          <span className="text-[11px] text-stone-400 mt-0.5 block">
            Across {metrics.confirmedBookingsCount} active confirmed orders
          </span>
        </div>

        <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
            Verified Collections
          </span>
          <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
            {formatLKR(metrics.verifiedCollectionsLkr)}
          </span>
          <span className="text-[11px] text-stone-400 mt-0.5 block">
            Audited & cleared by finance
          </span>
        </div>

        <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Pending Payment Verification
          </span>
          <span className="text-xl font-mono font-bold text-amber-300 mt-1 block">
            {formatLKR(metrics.unverifiedPaymentsLkr)}
          </span>
          <span className="text-[11px] text-stone-400 mt-0.5 block">
            Deposits awaiting bank clearance
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Booking ID, customer name, mobile, or chassis..."
              className="w-full bg-[#121316] border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-stone-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#121316] rounded-lg border border-stone-800">
          {statuses.map(st => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Allocated Motorcycle</th>
                <th className="py-3 px-4">Total Order</th>
                <th className="py-3 px-4">Verified Paid</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Verification State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const verifiedPaid = b.payments
                    .filter(p => p.status === 'Verified')
                    .reduce((sum, p) => sum + p.amountLkr, 0);

                  const pendingPaid = b.payments
                    .filter(p => p.status === 'Pending Verification')
                    .reduce((sum, p) => sum + p.amountLkr, 0);

                  const balance = b.finalPriceLkr - verifiedPaid;
                  const hasPending = pendingPaid > 0;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBookingId(b.id)}
                      className="hover:bg-stone-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                        {b.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white block group-hover:text-amber-300 transition-colors">
                          {b.customerName}
                        </span>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {b.customerPhone}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-stone-200 block">
                          Royal Enfield {b.bikeModel}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400">
                          {b.bikeChassis}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-stone-200">
                        {formatLKR(b.finalPriceLkr)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        {formatLKR(verifiedPaid)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        {balance === 0 ? (
                          <span className="text-emerald-400">Settled (0)</span>
                        ) : (
                          <span className="text-amber-300">{formatLKR(balance)}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            <span>1 Pending Check</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPrintableBookingId(b.id)}
                            title="Print / View Summary Sheet"
                            className="p-1.5 text-stone-400 hover:text-white rounded hover:bg-stone-800 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {b.status === 'Confirmed' && balance > 0 && (
                            <button
                              onClick={() => onOpenAddPayment(b.id)}
                              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-[11px] font-semibold rounded border border-stone-700 transition-colors"
                            >
                              + Pay
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedBookingId(b.id)}
                            className="text-stone-400 hover:text-white p-1"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#141518] border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>Showing {filteredBookings.length} bookings</span>
          <span className="font-mono text-[11px]">DEMO — NOT A TAX INVOICE</span>
        </div>
      </div>
    </div>
  );
};
