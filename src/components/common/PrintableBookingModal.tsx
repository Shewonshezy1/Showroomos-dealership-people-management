/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { Printer, X, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

export const PrintableBookingModal: React.FC = () => {
  const { printableBookingId, setPrintableBookingId, bookings } = useShowroom();

  if (!printableBookingId) return null;

  const booking = bookings.find(b => b.id === printableBookingId);
  if (!booking) return null;

  const verifiedPaid = booking.payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const pendingPaid = booking.payments
    .filter(p => p.status === 'Pending Verification')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const balance = booking.finalPriceLkr - verifiedPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white text-stone-900 rounded-xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col border border-stone-300">
        {/* Top Controls Toolbar (Hidden in Print) */}
        <div className="no-print bg-[#1a1b1f] text-stone-200 px-5 py-3 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">
              Booking Summary Sheet
            </span>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
              {booking.id}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9b1c1c] text-white hover:bg-[#b91c1c] text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={() => setPrintableBookingId(null)}
              className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Canvas */}
        <div className="p-8 bg-white print:p-6 space-y-6 text-stone-800 font-sans">
          {/* Prominent Legal Disclaimer Watermark */}
          <div className="border-2 border-dashed border-amber-700 bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-900 tracking-wide uppercase">
            DEMO — NOT A TAX INVOICE · PROPOSAL SPECIMEN FOR IDEAL MOTORS SRI LANKA
          </div>

          {/* Dealership Header */}
          <div className="flex justify-between items-start border-b border-stone-300 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-stone-900">
                  IDEAL MOTORS (PVT) LTD
                </span>
                <span className="bg-[#9b1c1c] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  ROYAL ENFIELD
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                Authorized Dealer & Showroom Operations · Colombo Flagship
              </p>
              <p className="text-[11px] text-stone-500">
                298 Union Place, Colombo 02, Sri Lanka · Tel: +94 11 200 4500
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-stone-500 font-semibold">
                Booking Reference
              </div>
              <div className="text-base font-mono font-bold text-[#9b1c1c]">
                {booking.id}
              </div>
              <div className="text-xs text-stone-600 mt-1">
                Date: <span className="font-mono">{booking.createdAt}</span>
              </div>
              <div className="text-xs text-stone-600">
                Status: <span className="font-semibold uppercase">{booking.status}</span>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Customer Particulars */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] border-b border-stone-200 pb-1">
                Customer Particulars
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Customer Name:</span>
                <span className="font-semibold text-stone-900 text-sm">
                  {booking.customerName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-500 block text-[10px]">NIC No (Synthetic):</span>
                  <span className="font-mono font-medium">{booking.customerNIC}</span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Contact Mobile:</span>
                  <span className="font-mono font-medium">{booking.customerPhone}</span>
                </div>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Address / Location:</span>
                <span className="font-medium text-stone-700">{booking.customerAddress}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Sales Consultant:</span>
                <span className="font-medium text-stone-800">{booking.salespersonName}</span>
              </div>
            </div>

            {/* Vehicle & Allocation Particulars */}
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] border-b border-stone-200 pb-1">
                Motorcycle Allocation Particulars
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Model & Variant:</span>
                <span className="font-bold text-stone-900 text-sm">
                  Royal Enfield {booking.bikeModel}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Colour Scheme:</span>
                <span className="font-medium text-stone-800">{booking.bikeColour}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-500 block text-[10px]">Chassis / VIN:</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {booking.bikeChassis}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Engine Number:</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {booking.bikeEngine}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Allocation Lock Status:</span>
                <span className="inline-block bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Reserved & Tied to Order
                </span>
              </div>
            </div>
          </div>

          {/* Financial Schedule */}
          <div>
            <div className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-2">
              Payment & Verification Ledger
            </div>
            <table className="w-full text-xs text-left border border-stone-200 rounded-lg overflow-hidden">
              <thead className="bg-stone-100 text-stone-700 text-[11px] uppercase">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Bank / Transaction Reference</th>
                  <th className="py-2 px-3">Verification State</th>
                  <th className="py-2 px-3 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {booking.payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-stone-500 italic">
                      No payments logged yet. Initial advance pending.
                    </td>
                  </tr>
                ) : (
                  booking.payments.map(p => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono">{p.date}</td>
                      <td className="py-2 px-3 font-medium text-stone-800">{p.type}</td>
                      <td className="py-2 px-3 text-stone-600 font-mono text-[11px]">
                        {p.reference}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded ${
                            p.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {formatLKR(p.amountLkr)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Reconciliation Summary */}
          <div className="flex justify-end">
            <div className="w-72 bg-stone-50 p-4 rounded-lg border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Illustrative Vehicle Price:</span>
                <span className="font-mono">{formatLKR(booking.totalPriceLkr)}</span>
              </div>
              {booking.discountLkr > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Approved Discount:</span>
                  <span className="font-mono">-{formatLKR(booking.discountLkr)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1.5 text-sm">
                <span>Final Purchase Price:</span>
                <span className="font-mono">{formatLKR(booking.finalPriceLkr)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>Verified Collections:</span>
                <span className="font-mono">{formatLKR(verifiedPaid)}</span>
              </div>
              {pendingPaid > 0 && (
                <div className="flex justify-between text-amber-700 text-[11px]">
                  <span>Pending Finance Verification:</span>
                  <span className="font-mono">{formatLKR(pendingPaid)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t-2 border-stone-900 pt-2 text-[#9b1c1c]">
                <span>Remaining Balance:</span>
                <span className="font-mono">{formatLKR(balance)}</span>
              </div>
            </div>
          </div>

          {/* Delivery & PDI Readiness Note */}
          <div className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded border border-stone-200">
            <span className="font-bold text-stone-800">Delivery Prerequisite Notice:</span>
            <p className="mt-0.5">
              Physical motorcycle delivery requires 100% verified settlement (zero balance), full vehicle registration document clearance, and signed Pre-Delivery Inspection (PDI) sign-off by the lead master technician.
            </p>
          </div>

          {/* Signature Sign-offs */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-stone-600 border-t border-stone-300">
            <div>
              <div className="h-10 border-b border-stone-400"></div>
              <p className="mt-1 font-medium text-stone-800">Customer Signature</p>
              <p className="text-[10px] text-stone-500">Order Acceptance</p>
            </div>
            <div>
              <div className="h-10 border-b border-stone-400"></div>
              <p className="mt-1 font-medium text-stone-800">Sales Consultant</p>
              <p className="text-[10px] text-stone-500">{booking.salespersonName}</p>
            </div>
            <div>
              <div className="h-10 border-b border-stone-400"></div>
              <p className="mt-1 font-medium text-stone-800">Finance & Admin Lead</p>
              <p className="text-[10px] text-stone-500">Ideal Motors Sri Lanka</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
