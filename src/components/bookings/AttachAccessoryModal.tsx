/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { X, Sparkles, Plus, Check, ShieldAlert } from 'lucide-react';

interface AttachAccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedBookingId?: string | null;
  preSelectedAccessoryId?: string | null;
}

export const AttachAccessoryModal: React.FC<AttachAccessoryModalProps> = ({
  isOpen,
  onClose,
  preSelectedBookingId,
  preSelectedAccessoryId,
}) => {
  const { bookings, accessories, addAccessoryToBooking } = useShowroom();

  const activeBookings = bookings.filter(b => b.status === 'Confirmed');

  const [bookingId, setBookingId] = useState<string>(
    preSelectedBookingId || (activeBookings.length > 0 ? activeBookings[0].id : '')
  );
  const [accessoryId, setAccessoryId] = useState<string>(
    preSelectedAccessoryId || (accessories.length > 0 ? accessories[0].id : '')
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetBooking = activeBookings.find(b => b.id === bookingId);
  const selectedAccessory = accessories.find(a => a.id === accessoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bookingId) {
      setError('Please select an active confirmed booking.');
      return;
    }
    if (!accessoryId) {
      setError('Please select an accessory to attach.');
      return;
    }
    if (quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    const res = await addAccessoryToBooking(bookingId, accessoryId, quantity);
    if (!res.success) {
      setError(res.error || 'Failed to attach accessory.');
      return;
    }

    setSuccessMsg(
      `Successfully added ${quantity}x ${selectedAccessory?.name} to Booking #${bookingId}!`
    );
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">Attach Accessory to Booking</h3>
              <p className="text-xs text-stone-400">Add to customer motorcycle booking & bill</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Select Target Booking */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Select Confirmed Booking
            </label>
            {activeBookings.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-950/30 p-2.5 rounded border border-amber-900/40">
                No active confirmed bookings available. Please create or confirm a booking first.
              </p>
            ) : (
              <select
                value={bookingId}
                onChange={e => setBookingId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-red-700"
              >
                {activeBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.customerName} ({b.bikeModel} · {b.bikeColour})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Select Accessory */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Select Royal Enfield Accessory / Apparel
            </label>
            <select
              value={accessoryId}
              onChange={e => setAccessoryId(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-red-700"
            >
              {accessories.map(acc => (
                <option
                  key={acc.id}
                  value={acc.id}
                  disabled={acc.stockQuantity === 0}
                >
                  {acc.name} — {formatLKR(acc.priceLkr)} ({acc.stockQuantity} in stock)
                </option>
              ))}
            </select>
          </div>

          {/* Details Preview */}
          {selectedAccessory && (
            <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-400">
                <span>Category:</span>
                <span className="text-stone-200 font-medium">{selectedAccessory.category}</span>
              </div>
              <div className="flex justify-between items-center text-stone-400">
                <span>Compatibility:</span>
                <span className="text-stone-300 text-[11px]">
                  {selectedAccessory.compatibleModels.join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-400">
                <span>Stock Available:</span>
                <span className={`font-mono ${selectedAccessory.stockQuantity > 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedAccessory.stockQuantity} units
                </span>
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={selectedAccessory?.stockQuantity || 1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-stone-200 focus:outline-hidden focus:border-red-700"
              />
              {selectedAccessory && (
                <div className="text-xs text-stone-400">
                  Item Total:{' '}
                  <span className="font-mono tabular-nums text-stone-100 font-semibold">
                    {formatLKR(selectedAccessory.priceLkr * quantity)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Impact on Booking Total */}
          {targetBooking && selectedAccessory && (
            <div className="p-3 bg-stone-900/40 rounded-lg border border-stone-800/80 text-xs space-y-1">
              <div className="flex justify-between text-stone-400">
                <span>Current Booking Total:</span>
                <span className="font-mono tabular-nums text-stone-300">
                  {formatLKR(targetBooking.finalPriceLkr)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-stone-800">
                <span>New Booking Total:</span>
                <span className="font-mono tabular-nums">
                  {formatLKR(targetBooking.finalPriceLkr + selectedAccessory.priceLkr * quantity)}
                </span>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!bookingId || !selectedAccessory || selectedAccessory.stockQuantity === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md text-white bg-red-800 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Attach to Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
