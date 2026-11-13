/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { X, FileCheck2, AlertCircle } from 'lucide-react';

export const NewBookingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialBikeId?: string;
}> = ({ isOpen, onClose, initialBikeId }) => {
  const { bikes, currentUser, createBooking, setSelectedBookingId } = useShowroom();

  const availableBikes = bikes.filter(b => b.status === 'Available');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 7');
  const [customerNIC, setCustomerNIC] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Colombo 03, Sri Lanka');
  const [bikeId, setBikeId] = useState(
    initialBikeId && availableBikes.some(b => b.id === initialBikeId)
      ? initialBikeId
      : availableBikes[0]?.id || ''
  );
  const [discountRequestedLkr, setDiscountRequestedLkr] = useState(0);
  const [advanceAmountLkr, setAdvanceAmountLkr] = useState(500000);
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialBikeId && availableBikes.some(b => b.id === initialBikeId)) {
        setBikeId(initialBikeId);
      } else if (!availableBikes.some(b => b.id === bikeId)) {
        setBikeId(availableBikes[0]?.id || '');
      }
      setError('');
    }
  }, [isOpen, initialBikeId, availableBikes.length]);

  if (!isOpen) return null;

  const targetBike = bikes.find(b => b.id === bikeId);
  const finalPrice = targetBike ? targetBike.priceLkr : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please provide customer name.');
      return;
    }
    if (!bikeId) {
      setError('Please select an available motorcycle.');
      return;
    }
    if (advanceAmountLkr < 0) {
      setError('Advance payment amount cannot be negative.');
      return;
    }
    if (advanceAmountLkr > finalPrice) {
      setError(`Advance payment cannot exceed the unit price (${formatLKR(finalPrice)}).`);
      return;
    }

    setSubmitting(true);
    const res = await createBooking({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerNIC: customerNIC.trim() || 'Pending NIC',
      customerAddress: customerAddress.trim() || 'Colombo, Sri Lanka',
      bikeId,
      discountRequestedLkr: Math.max(0, discountRequestedLkr),
      initialPayment:
        advanceAmountLkr > 0
          ? {
              amountLkr: advanceAmountLkr,
              type: 'Booking Advance',
              reference: paymentRef.trim() || 'Counter Advance Receipt',
            }
          : undefined,
    });
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to create booking.');
      return;
    }

    onClose();
    if (res.bookingId) {
      setSelectedBookingId(res.bookingId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9b1c1c] text-white flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Create Motorcycle Booking
              </h3>
              <p className="text-[11px] text-stone-400">
                Atomic Firestore unit allocation · Created by {currentUser?.fullName}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-950/70 border border-rose-800 p-3 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-stone-400 mb-1 font-medium">Customer Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer Full Name"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Contact Mobile *</label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Customer NIC *</label>
              <input
                type="text"
                required
                value={customerNIC}
                onChange={e => setCustomerNIC(e.target.value)}
                placeholder="NIC Reference"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Customer Address</label>
            <input
              type="text"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              placeholder="Street, City"
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
            />
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium flex items-center justify-between">
              <span>Select Available Stock Unit *</span>
              <span className="text-[11px] text-emerald-400">
                {availableBikes.length} Units Available
              </span>
            </label>
            {availableBikes.length === 0 ? (
              <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-rose-300">
                No motorcycles are currently available to reserve.
              </div>
            ) : (
              <select
                value={bikeId}
                onChange={e => setBikeId(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500 font-mono text-xs"
              >
                {availableBikes.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.model} ({b.colour}) — VIN: {b.chassisNumber} [{formatLKR(b.priceLkr)}]
                  </option>
                ))}
              </select>
            )}
            {targetBike && (
              <div className="mt-2 p-2.5 bg-[#121316] rounded border border-stone-800 text-[11px] flex items-center justify-between">
                <span className="text-stone-400">Price: {formatLKR(targetBike.priceLkr)}</span>
                <span className="font-mono text-amber-300">Engine: {targetBike.engineNumber}</span>
                <span className="text-emerald-400 font-medium">Status: Available</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">
                Requested Discount (LKR)
              </label>
              <input
                type="number"
                min={0}
                max={finalPrice}
                value={discountRequestedLkr}
                onChange={e => setDiscountRequestedLkr(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
              <span className="text-[10px] text-stone-500">Requires GM/Finance approval</span>
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">
                Initial Advance Receipt (LKR)
              </label>
              <input
                type="number"
                min={0}
                max={finalPrice}
                value={advanceAmountLkr}
                onChange={e => setAdvanceAmountLkr(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          {advanceAmountLkr > 0 && (
            <div>
              <label className="block text-stone-400 mb-1 font-medium">
                Payment Reference / Slip No.
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. SL-CHQ-10492"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          )}

          <div className="bg-amber-950/30 border border-amber-800/60 p-2.5 rounded text-[11px] text-amber-200">
            <strong>Controls:</strong> Initial advance payments are logged as{' '}
            <span className="font-mono">Pending Verification</span> until verified by Finance. Any discount request stays <span className="font-mono">Pending</span> until approved by General Manager or Finance.
          </div>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableBikes.length === 0 || submitting}
              className="px-5 py-2 font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? 'Reserving Unit...' : 'Create Booking & Reserve Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
