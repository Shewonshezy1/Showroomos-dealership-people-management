/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import {
  X,
  FileCheck2,
  Printer,
  Ban,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Truck,
  Check,
  Sparkles,
  Trash2,
  Repeat,
  Send,
  MessageSquare,
} from 'lucide-react';
import { AttachAccessoryModal } from './AttachAccessoryModal';

export const BookingDetailDrawer: React.FC<{
  onOpenAddPayment: (bookingId: string) => void;
}> = ({ onOpenAddPayment }) => {
  const {
    selectedBookingId,
    setSelectedBookingId,
    bookings,
    togglePaymentVerification,
    cancelBooking,
    setPrintableBookingId,
    setCurrentView,
    removeAccessoryFromBooking,
    openNotificationModal,
  } = useShowroom();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer finance declined');
  const [attachModalOpen, setAttachModalOpen] = useState(false);

  if (!selectedBookingId) return null;
  const booking = bookings.find(b => b.id === selectedBookingId);
  if (!booking) return null;

  const verifiedPaid = booking.payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const pendingPaid = booking.payments
    .filter(p => p.status === 'Pending Verification')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const balance = booking.finalPriceLkr - verifiedPaid;
  const isCancelled = booking.status === 'Cancelled';
  const isDelivered = booking.status === 'Delivered';

  const handleCancel = () => {
    cancelBooking(booking.id, cancelReason);
    setCancelModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#18191d] border-l border-stone-800 text-stone-200 w-full max-w-2xl h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#9b1c1c] text-white flex items-center justify-center font-bold text-xs tracking-wider">
              RE
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {booking.customerName}
                </h3>
                <span className="font-mono text-xs text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
                  {booking.id}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    booking.status === 'Delivered'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : booking.status === 'Cancelled'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-stone-800 text-stone-200 border border-stone-700'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Booked on {booking.createdAt} · Handled by {booking.salespersonName}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedBookingId(null)}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#202228] p-3 rounded-lg border border-stone-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintableBookingId(booking.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-md text-xs font-medium border border-stone-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Summary Sheet</span>
              </button>

              {!isCancelled && !isDelivered && (
                <button
                  onClick={() => onOpenAddPayment(booking.id)}
                  disabled={balance === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              )}
            </div>

            {!isCancelled && !isDelivered && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Booking</span>
              </button>
            )}
          </div>

          {/* Allocation Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1c1d22] p-4 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block border-b border-stone-800 pb-1">
                Allocated Motorcycle
              </span>
              <div>
                <span className="text-[11px] text-stone-400 block">Model & Colour:</span>
                <span className="font-bold text-white text-sm">
                  Royal Enfield {booking.bikeModel}
                </span>
                <span className="text-stone-300 block text-xs">{booking.bikeColour}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block font-medium">
                  Chassis / VIN:
                </span>
                <span className="font-mono text-amber-300 font-medium">
                  {booking.bikeChassis}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block font-medium">
                  Engine Number:
                </span>
                <span className="font-mono text-stone-300">{booking.bikeEngine}</span>
              </div>
            </div>

            <div className="bg-[#1c1d22] p-4 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block border-b border-stone-800 pb-1">
                Customer Particulars
              </span>
              <div>
                <span className="text-[11px] text-stone-400 block">Customer Name:</span>
                <span className="font-semibold text-white">{booking.customerName}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Phone Number:</span>
                <span className="font-mono text-stone-300">{booking.customerPhone}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Synthetic NIC:</span>
                <span className="font-mono text-stone-300">{booking.customerNIC}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Address:</span>
                <span className="text-stone-300 truncate block">{booking.customerAddress}</span>
              </div>
            </div>
          </div>

          {/* Financial Balances Card */}
          <div className="bg-[#1b1c21] p-4 rounded-lg border border-stone-800 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                Financial Summary & Revenue Integrity
              </span>
              <span className="text-[11px] text-stone-400">
                LKR Illustrative Currency
              </span>
            </div>

            {/* Price Line Items Breakdown */}
            <div className="bg-[#141518] p-3 rounded border border-stone-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Motorcycle Base Price:</span>
                <span className="font-mono tabular-nums text-stone-300">
                  {formatLKR(booking.totalPriceLkr)}
                </span>
              </div>

              {(booking.discountLkr || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promotional Discount:</span>
                  <span className="font-mono tabular-nums">
                    - {formatLKR(booking.discountLkr || 0)}
                  </span>
                </div>
              )}

              {(booking.accessoriesTotalLkr || 0) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Genuine Accessories & Gear:</span>
                  <span className="font-mono tabular-nums">
                    + {formatLKR(booking.accessoriesTotalLkr || 0)}
                  </span>
                </div>
              )}

              {(booking.tradeInCreditLkr || 0) > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Motorcycle Trade-In Credit:</span>
                  <span className="font-mono tabular-nums">
                    - {formatLKR(booking.tradeInCreditLkr || 0)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-stone-100 font-bold pt-1 border-t border-stone-800">
                <span>Final Adjusted Price:</span>
                <span className="font-mono tabular-nums text-white text-sm">
                  {formatLKR(booking.finalPriceLkr)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#141518] p-3 rounded border border-stone-800">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                  Total Final Price
                </span>
                <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                  {formatLKR(booking.finalPriceLkr)}
                </span>
              </div>

              <div className="bg-[#141518] p-3 rounded border border-stone-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                  Verified Collections
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                  {formatLKR(verifiedPaid)}
                </span>
              </div>

              <div className="bg-[#141518] p-3 rounded border border-stone-800">
                <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                  Remaining Balance
                </span>
                <span className="text-sm font-mono font-bold text-amber-300 mt-0.5 block">
                  {formatLKR(balance)}
                </span>
              </div>
            </div>

            {pendingPaid > 0 && (
              <div className="bg-amber-950/40 border border-amber-800/80 p-2.5 rounded text-[11px] text-amber-300 flex items-center justify-between">
                <span>
                  <strong>Notice:</strong> {formatLKR(pendingPaid)} is currently logged as "Pending Verification" and is excluded from Verified Collections until authorized below.
                </span>
              </div>
            )}
          </div>

          {/* Genuine Accessories Section */}
          <div className="bg-[#1b1c21] p-4 rounded-lg border border-stone-800 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                  Genuine Accessories & Apparel ({booking.accessories?.length || 0})
                </span>
              </div>
              {!isCancelled && !isDelivered && (
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-stone-800 hover:bg-red-800 text-stone-200 hover:text-white border border-stone-700 hover:border-red-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Accessory
                </button>
              )}
            </div>

            {(!booking.accessories || booking.accessories.length === 0) ? (
              <p className="text-xs text-stone-500 italic py-1">
                No optional accessories attached to this booking yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {booking.accessories.map(acc => (
                  <div
                    key={acc.accessoryId}
                    className="p-2.5 bg-[#141518] rounded border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-stone-200">
                        {acc.name} <span className="text-stone-500">× {acc.quantity}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        Unit: {formatLKR(acc.priceLkr)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-stone-100">
                        {formatLKR(acc.priceLkr * acc.quantity)}
                      </span>
                      {!isCancelled && !isDelivered && (
                        <button
                          type="button"
                          onClick={() => removeAccessoryFromBooking(booking.id, acc.accessoryId)}
                          title="Remove accessory"
                          className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Notification Quick Dispatch Strip */}
          <div className="p-3 bg-stone-900/60 rounded-lg border border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Customer Communications:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openNotificationModal({
                    title: 'Booking Confirmation & Deposit Receipt',
                    recipientName: booking.customerName,
                    recipientPhone: booking.customerPhone,
                    message: `Dear ${booking.customerName},\nThank you for choosing Ideal Motors!\nYour Royal Enfield booking #${booking.id} (${booking.bikeModel} · ${booking.bikeColour}) has been confirmed.\nVerified Deposit: ${formatLKR(verifiedPaid)}\nOutstanding Balance: ${formatLKR(balance)}.\nShowroom: Colombo 03 Flagship.\nHotline: 011 234 5678`,
                    channel: 'WhatsApp',
                    purpose: 'Booking Confirmation',
                  })
                }
                className="px-2.5 py-1 text-[11px] font-medium bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded transition-colors"
              >
                WhatsApp Receipt
              </button>
              <button
                type="button"
                onClick={() =>
                  openNotificationModal({
                    title: 'Payment Reminder & Balance Due',
                    recipientName: booking.customerName,
                    recipientPhone: booking.customerPhone,
                    message: `Dear ${booking.customerName},\nThis is a friendly reminder from Ideal Motors Royal Enfield Showroom.\nBooking #${booking.id} (${booking.bikeModel}) has an outstanding balance of ${formatLKR(balance)}.\nPlease settle before your scheduled PDI inspection for seamless delivery.\nThank you!`,
                    channel: 'SMS',
                    purpose: 'Balance Reminder',
                  })
                }
                className="px-2.5 py-1 text-[11px] font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded transition-colors"
              >
                SMS Balance
              </button>
            </div>
          </div>

          {/* Payment Ledger with 1-Click Verification Toggle */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-stone-400 text-xs">
                Payment Transactions ({booking.payments.length})
              </h4>
              <span className="text-[11px] text-stone-400">
                Click verification button to simulate finance action
              </span>
            </div>

            {booking.payments.length === 0 ? (
              <div className="p-4 bg-[#141518] border border-stone-800 rounded-lg text-center text-stone-500 italic">
                No payments logged yet. Click "Record Payment" above.
              </div>
            ) : (
              <div className="space-y-2">
                {booking.payments.map(p => {
                  const isVer = p.status === 'Verified';
                  return (
                    <div
                      key={p.id}
                      className="bg-[#1f2026] p-3 rounded-lg border border-stone-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-200">{p.type}</span>
                          <span className="text-stone-500">·</span>
                          <span className="font-mono text-stone-400 text-[11px]">{p.date}</span>
                        </div>
                        <div className="font-mono text-stone-400 text-[11px] truncate">
                          Ref: {p.reference}
                        </div>
                        {p.verifiedBy && (
                          <div className="text-[10px] text-emerald-400">
                            Verified by {p.verifiedBy} ({p.verifiedAt})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-stone-100 text-sm">
                          {formatLKR(p.amountLkr)}
                        </span>

                        <button
                          onClick={() => togglePaymentVerification(booking.id, p.id)}
                          title="Click to toggle verification status"
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                            isVer
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                              : 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900'
                          }`}
                        >
                          {isVer ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>Verify Now</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery Checklist Summary */}
          <div className="bg-[#1c1d22] p-4 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">
                Pre-Delivery Inspection (PDI) Gating Status
              </span>
              <button
                onClick={() => {
                  setCurrentView('delivery');
                  setSelectedBookingId(booking.id);
                }}
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Open Delivery Bay</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div
                className={`p-2 rounded border flex items-center gap-1.5 ${
                  booking.deliveryChecklist.paymentVerified
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                {booking.deliveryChecklist.paymentVerified ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>1. Payment Verified</span>
              </div>

              <div
                className={`p-2 rounded border flex items-center gap-1.5 ${
                  booking.deliveryChecklist.documentsChecked
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                {booking.deliveryChecklist.documentsChecked ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>2. Docs Cleared</span>
              </div>

              <div
                className={`p-2 rounded border flex items-center gap-1.5 ${
                  booking.deliveryChecklist.pdiCompleted
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-stone-900 border-stone-800 text-stone-400'
                }`}
              >
                {booking.deliveryChecklist.pdiCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>3. PDI Signed</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-stone-400 text-xs">
              Customer–Bike Journey Timeline
            </h4>
            <div className="border-l-2 border-stone-800 pl-4 space-y-4 ml-2">
              {booking.timeline.map(item => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#9b1c1c] border-2 border-[#18191d]"></span>
                  <div className="text-[11px] text-stone-400 font-mono">{item.date}</div>
                  <div className="text-xs font-semibold text-stone-200 mt-0.5">
                    {item.title}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#151619] flex items-center justify-between text-xs">
          <span className="text-stone-500 font-mono">Stock Lock: {booking.bikeChassis}</span>
          <button
            onClick={() => setSelectedBookingId(null)}
            className="px-4 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-700 rounded-xl max-w-md w-full p-5 space-y-4 text-stone-200 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">
                  Cancel Booking & Release Stock?
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Cancelling will release chassis <strong>{booking.bikeChassis}</strong> back to "Available" status in showroom stock.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-stone-400">Cancellation Reason:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation"
                className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-2 text-xs text-stone-200 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-stone-800 flex justify-end gap-2.5">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-stone-400 hover:text-white bg-stone-800 rounded-md"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-md shadow-xs"
              >
                Confirm Cancellation & Release Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Accessory Modal */}
      <AttachAccessoryModal
        isOpen={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        preSelectedBookingId={booking.id}
      />
    </div>
  );
};
