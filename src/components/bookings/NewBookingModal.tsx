/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { PaymentType } from '../../types';
import { X, FileCheck2, AlertCircle } from 'lucide-react';

export const NewBookingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialBikeId?: string;
}> = ({ isOpen, onClose, initialBikeId }) => {
  const { bikes, employees, createBooking, setSelectedBookingId } = useShowroom();

  const availableBikes = bikes.filter(b => b.status === 'Available');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 7');
  const [customerNIC, setCustomerNIC] = useState('1992****3310');
  const [customerAddress, setCustomerAddress] = useState('Colombo 03, Sri Lanka');
  const [salespersonId, setSalespersonId] = useState(employees[0]?.id || 'emp-001');
  const [bikeId, setBikeId] = useState(
    initialBikeId && availableBikes.some(b => b.id === initialBikeId)
      ? initialBikeId
      : availableBikes[0]?.id || ''
  );
  const [discountLkr, setDiscountLkr] = useState(0);
  const [advanceAmountLkr, setAdvanceAmountLkr] = useState(500000);
  const [paymentRef, setPaymentRef] = useState('SL-CHQ-InitialAdvance');
  const [isVerified, setIsVerified] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialBikeId && availableBikes.some(b => b.id === initialBikeId)) {
        setBikeId(initialBikeId);
      } else if (!availableBikes.some(b => b.id === bikeId)) {
        setBikeId(availableBikes[0]?.id || '');
      }
      setError('');
    }
  }, [isOpen, initialBikeId, availableBikes]);

  if (!isOpen) return null;

  const targetBike = bikes.find(b => b.id === bikeId);
  const finalPrice = targetBike ? Math.max(0, targetBike.priceLkr - discountLkr) : 0;

  const handleSubmit = (e: React.FormEvent) => {
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
      setError(`Advance payment cannot exceed the final price (${formatLKR(finalPrice)}).`);
      return;
    }

    const res = createBooking({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerNIC: customerNIC.trim() || '1990****1234',
      customerAddress: customerAddress.trim() || 'Colombo, Sri Lanka',
      salespersonId,
      bikeId,
      discountLkr,
      initialPayment:
        advanceAmountLkr > 0
          ? {
              amountLkr: advanceAmountLkr,
              type: 'Booking Advance',
              reference: paymentRef.trim() || 'Direct Showroom Deposit',
              isVerified,
            }
          : undefined,
    });

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
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9b1c1c] text-white flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Create Direct Motorcycle Booking
              </h3>
              <p className="text-[11px] text-stone-400">
                Reserve available showroom inventory
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
                placeholder="e.g. Ruwan Weerakkody"
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
              <label className="block text-stone-400 mb-1 font-medium">Synthetic NIC</label>
              <input
                type="text"
                value={customerNIC}
                onChange={e => setCustomerNIC(e.target.value)}
                placeholder="1992****3310"
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
              placeholder="e.g. 50 Galle Road, Colombo 03"
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
            />
          </div>

          {/* Available stock allocation */}
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
                <span className="text-emerald-400 font-medium">Lock: Reserved</span>
              </div>
            )}
          </div>

          {/* Pricing & Advance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Assigned Consultant</label>
              <select
                value={salespersonId}
                onChange={e => setSalespersonId(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              >
                {employees
                  .filter(e => e.department === 'Sales')
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Booking Advance (LKR)</label>
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

          <div>
            <label className="block text-stone-400 mb-1 font-medium">Payment Reference / Cheque</label>
            <input
              type="text"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              placeholder="e.g. SL-CHQ-10492"
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
            />
          </div>

          <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 flex items-center justify-between">
            <span className="text-stone-400">Auto-verify Advance with Finance:</span>
            <input
              type="checkbox"
              checked={isVerified}
              onChange={e => setIsVerified(e.target.checked)}
              className="accent-[#9b1c1c] w-4 h-4 rounded"
            />
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
              disabled={availableBikes.length === 0}
              className="px-5 py-2 font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-xs"
            >
              Create Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
