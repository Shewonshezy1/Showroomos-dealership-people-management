/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { PaymentRecord, PaymentType } from '../../types';
import { X, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export const AddPaymentModal: React.FC<{
  bookingId: string | null;
  onClose: () => void;
}> = ({ bookingId, onClose }) => {
  const { bookings, addPaymentToBooking } = useShowroom();

  if (!bookingId) return null;
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return null;

  const currentTotalPaid = booking.payments.reduce((sum, p) => sum + p.amountLkr, 0);
  const remainingBalance = Math.max(0, booking.finalPriceLkr - currentTotalPaid);

  const [amountLkr, setAmountLkr] = useState<number>(
    remainingBalance > 0 ? Math.min(500000, remainingBalance) : 0
  );
  const [paymentType, setPaymentType] = useState<PaymentType>('Down Payment');
  const [reference, setReference] = useState('SL-TRF-OnlineTransfer');
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountLkr <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (amountLkr > remainingBalance) {
      setError(
        `Overpayment blocked: The maximum outstanding balance is ${formatLKR(
          remainingBalance
        )}. Cannot record ${formatLKR(amountLkr)}.`
      );
      return;
    }

    const res = addPaymentToBooking(booking.id, {
      amountLkr,
      type: paymentType,
      reference: reference.trim() || 'Bank Transfer',
      isVerified,
    });

    if (!res.success) {
      setError(res.error || 'Payment failed.');
      return;
    }

    onClose();
  };

  const paymentTypes: PaymentType[] = [
    'Booking Advance',
    'Down Payment',
    'Finance Settlement',
    'Final Settlement',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Record Payment / Collection
              </h3>
              <p className="text-[11px] text-stone-400 font-mono">
                Booking: {booking.id} ({booking.customerName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-950/70 border border-rose-800 p-3 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Context */}
          <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                Total Order
              </span>
              <span className="font-mono text-stone-200 font-medium">
                {formatLKR(booking.finalPriceLkr)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                Unsettled Balance
              </span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {formatLKR(remainingBalance)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Payment Amount (LKR) *</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={remainingBalance}
                value={amountLkr}
                onChange={e => setAmountLkr(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono text-sm focus:outline-hidden focus:border-stone-500"
              />
              <button
                type="button"
                onClick={() => setAmountLkr(remainingBalance)}
                className="absolute right-2 top-2 text-[10px] bg-stone-800 text-stone-300 hover:text-white px-2 py-0.5 rounded border border-stone-700 font-semibold"
              >
                Pay Full Balance
              </button>
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block">
              System enforces strict validation against overpayment.
            </span>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Payment Type</label>
            <select
              value={paymentType}
              onChange={e => setPaymentType(e.target.value as PaymentType)}
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
            >
              {paymentTypes.map(pt => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">
              Bank / Cheque / Transaction Ref *
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="e.g. SL-CHQ-44910 (HNB Bank)"
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
            />
          </div>

          {/* Verification Option */}
          <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="verifyNow"
              checked={isVerified}
              onChange={e => setIsVerified(e.target.checked)}
              className="mt-0.5 accent-[#9b1c1c] rounded"
            />
            <label htmlFor="verifyNow" className="cursor-pointer">
              <span className="font-semibold text-stone-200 block text-xs">
                Mark Verified Immediately (Finance Authorization)
              </span>
              <span className="text-[11px] text-stone-400">
                If checked, amount is added to "Verified Collections" right away. If unchecked, it stays "Pending Verification" until verified in the booking drawer.
              </span>
            </label>
          </div>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={remainingBalance === 0}
              className="px-5 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
