/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { X, FileCheck2, AlertCircle } from 'lucide-react';

export const ConvertLeadModal: React.FC<{
  leadId: string | null;
  onClose: () => void;
}> = ({ leadId, onClose }) => {
  const {
    leads,
    bikes,
    convertLeadToBooking,
    setSelectedBookingId,
    setCurrentView,
  } = useShowroom();

  const lead = leadId ? leads.find(l => l.id === leadId) : undefined;
  const availableBikes = bikes.filter(b => b.status === 'Available');
  const preferredBike = lead ? availableBikes.find(b => b.model === lead.modelInterest) : undefined;
  const initialBikeId = preferredBike?.id || availableBikes[0]?.id || '';

  const [selectedBikeId, setSelectedBikeId] = useState<string>(initialBikeId);
  const [advanceAmountLkr, setAdvanceAmountLkr] = useState<number>(500000);
  const [paymentReference, setPaymentReference] = useState('');
  const [customerNIC, setCustomerNIC] = useState('');
  const [customerAddress, setCustomerAddress] = useState(lead ? `${lead.city}, Sri Lanka` : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (leadId && lead) {
      const match = availableBikes.find(b => b.model === lead.modelInterest);
      setSelectedBikeId(match?.id || availableBikes[0]?.id || '');
      setCustomerAddress(`${lead.city}, Sri Lanka`);
      setError('');
    }
  }, [leadId, availableBikes.length, lead?.modelInterest]);

  if (!leadId || !lead) return null;

  const targetBike = bikes.find(b => b.id === selectedBikeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBikeId || !availableBikes.some(b => b.id === selectedBikeId)) {
      setError('Please select an available motorcycle to allocate.');
      return;
    }
    if (advanceAmountLkr < 0) {
      setError('Advance payment amount cannot be negative.');
      return;
    }
    if (targetBike && advanceAmountLkr > targetBike.priceLkr) {
      setError(`Advance payment cannot exceed the bike price (${formatLKR(targetBike.priceLkr)}).`);
      return;
    }

    setSubmitting(true);
    const res = await convertLeadToBooking(lead.id, {
      bikeId: selectedBikeId,
      advanceAmountLkr,
      paymentReference: paymentReference.trim() || 'Counter Advance Receipt',
      customerNIC: customerNIC.trim() || 'Pending NIC',
      customerAddress: customerAddress.trim() || `${lead.city}, Sri Lanka`,
    });
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Conversion failed.');
      return;
    }

    onClose();
    if (res.bookingId) {
      setSelectedBookingId(res.bookingId);
      setCurrentView('bookings');
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
                Convert Lead to Booking
              </h3>
              <p className="text-[11px] text-stone-400">
                Lock stock allocation for {lead.customerName}
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

          <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-400">Customer:</span>
              <span className="font-semibold text-stone-200">{lead.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Phone & City:</span>
              <span className="font-mono text-stone-300">
                {lead.phone} · {lead.city}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Interested Model:</span>
              <span className="font-medium text-amber-300">
                Royal Enfield {lead.modelInterest}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-semibold flex items-center justify-between">
              <span>Select Available Stock Unit *</span>
              <span className="text-[11px] text-emerald-400">
                {availableBikes.length} Available in Inventory
              </span>
            </label>

            {availableBikes.length === 0 ? (
              <div className="p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-rose-300 text-xs">
                No motorcycles currently have "Available" status.
              </div>
            ) : (
              <select
                value={selectedBikeId}
                onChange={e => setSelectedBikeId(e.target.value)}
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
              <div className="mt-2 p-2.5 bg-[#121316] rounded border border-stone-800 text-[11px] space-y-1">
                <div className="flex justify-between text-stone-400">
                  <span>Showroom Location:</span>
                  <span className="text-stone-200">{targetBike.location}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Engine Number:</span>
                  <span className="font-mono text-stone-200">{targetBike.engineNumber}</span>
                </div>
                <div className="flex justify-between text-stone-400 border-t border-stone-800 pt-1">
                  <span>Illustrative Purchase Price:</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {formatLKR(targetBike.priceLkr)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Delivery Address</label>
              <input
                type="text"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="Street address, City"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Booking Advance (LKR)</label>
              <input
                type="number"
                min={0}
                max={targetBike?.priceLkr || 5000000}
                value={advanceAmountLkr}
                onChange={e => setAdvanceAmountLkr(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Payment Reference</label>
              <input
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="e.g. SL-CHQ-10492"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-800/60 p-2.5 rounded text-[11px] text-amber-200">
            <strong>Rule:</strong> Booking reserves this chassis atomically in Firestore. Any initial deposit is logged as <span className="font-mono">Pending Verification</span> for Finance review.
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
              {submitting ? 'Reserving...' : 'Confirm Booking & Reserve Bike'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
