/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import {
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  Wrench,
  UserCheck,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react';

export const DeliveryView: React.FC = () => {
  const {
    bookings,
    updateDeliveryChecklist,
    deliverBooking,
    employees,
    selectedBookingId,
    setSelectedBookingId,
    setCurrentView,
  } = useShowroom();

  const [activeBookingId, setActiveBookingId] = useState<string>(
    selectedBookingId && bookings.some(b => b.id === selectedBookingId)
      ? selectedBookingId
      : bookings.find(b => b.status === 'Confirmed')?.id || bookings[0]?.id || ''
  );
  const [deliveredBy, setDeliveredBy] = useState('Dilantha Perera (Senior Consultant)');
  const [actionMessage, setActionMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  React.useEffect(() => {
    if (selectedBookingId && bookings.some(b => b.id === selectedBookingId)) {
      setActiveBookingId(selectedBookingId);
    }
  }, [selectedBookingId, bookings]);

  const selectedBooking = bookings.find(b => b.id === activeBookingId) || bookings[0];

  if (!selectedBooking) {
    return (
      <div className="p-8 text-center text-stone-500 bg-[#18191d] rounded-xl border border-stone-800">
        No booking orders found. Create a booking first.
      </div>
    );
  }

  const verifiedPaid = selectedBooking.payments
    .filter(p => p.status === 'Verified')
    .reduce((sum, p) => sum + p.amountLkr, 0);

  const balance = selectedBooking.finalPriceLkr - verifiedPaid;
  const isDelivered = selectedBooking.status === 'Delivered';
  const isCancelled = selectedBooking.status === 'Cancelled';

  const checklist = selectedBooking.deliveryChecklist;
  const isPaymentCleared = balance === 0;

  const canDeliver =
    !isDelivered &&
    !isCancelled &&
    isPaymentCleared &&
    checklist.documentsChecked &&
    checklist.pdiCompleted;

  const handleToggleDocCheck = () => {
    if (isDelivered || isCancelled) return;
    updateDeliveryChecklist(selectedBooking.id, {
      documentsChecked: !checklist.documentsChecked,
    });
  };

  const handleTogglePdi = () => {
    if (isDelivered || isCancelled) return;
    updateDeliveryChecklist(selectedBooking.id, {
      pdiCompleted: !checklist.pdiCompleted,
    });
  };

  const handleToggleOrientation = () => {
    if (isDelivered || isCancelled) return;
    updateDeliveryChecklist(selectedBooking.id, {
      customerOrientationDone: !checklist.customerOrientationDone,
    });
  };

  const handleExecuteDelivery = () => {
    const res = deliverBooking(selectedBooking.id, deliveredBy);
    if (!res.success) {
      setActionMessage({ type: 'error', text: res.error || 'Delivery failed.' });
    } else {
      setActionMessage({
        type: 'success',
        text: `Handover successful! Motorcycle ${selectedBooking.bikeModel} (VIN: ${selectedBooking.bikeChassis}) delivered to ${selectedBooking.customerName}.`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              Vehicle Handover & Quality Assurance
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield PDI Bay</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Pre-Delivery Inspection (PDI) & Handover Gating
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Motorcycles cannot be delivered until finance clearance is 100% verified, legal documents are logged, and master technician PDI sign-off is completed.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#121316] px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
          <span className="text-stone-400">Active Order:</span>
          <select
            value={selectedBooking.id}
            onChange={e => {
              setActiveBookingId(e.target.value);
              setActionMessage(null);
            }}
            className="bg-transparent text-amber-300 font-mono font-bold focus:outline-hidden"
          >
            {bookings.map(b => (
              <option key={b.id} value={b.id} className="bg-[#18191d] text-stone-200">
                {b.id} — {b.customerName} ({b.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            actionMessage.type === 'error'
              ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
              : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Handover Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Delivery Inspection Checklist (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Handover Compliance Checklist
                </h3>
                <p className="text-xs text-stone-400">
                  Pre-requisites for physical motorcycle handover
                </p>
              </div>

              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                  isDelivered
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : canDeliver
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {isDelivered
                  ? 'Delivered to Customer'
                  : canDeliver
                  ? 'Ready for Key Handover'
                  : 'Gated / Incomplete'}
              </span>
            </div>

            {/* Checklist Step 1: Financial Settlement */}
            <div className="bg-[#141518] border border-stone-800 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isPaymentCleared
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {isPaymentCleared ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-100">
                      1. Financial Verification & Settlement
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      100% of vehicle price must be verified by finance. Outstanding balance must be zero.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold block">
                    {formatLKR(verifiedPaid)} / {formatLKR(selectedBooking.finalPriceLkr)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      isPaymentCleared ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isPaymentCleared ? 'Balance Settled (LKR 0)' : `Balance: ${formatLKR(balance)}`}
                  </span>
                  {!isPaymentCleared && (
                    <button
                      onClick={() => {
                        setSelectedBookingId(selectedBooking.id);
                        setCurrentView('bookings');
                      }}
                      className="block text-[10px] text-amber-300 hover:underline mt-1 font-medium"
                    >
                      Settle in Bookings →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist Step 2: Documentation Clearance */}
            <div
              onClick={handleToggleDocCheck}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                checklist.documentsChecked
                  ? 'bg-emerald-950/20 border-emerald-800/80'
                  : 'bg-[#141518] border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      checklist.documentsChecked
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {checklist.documentsChecked ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px]">2</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span>2. Vehicle Registration & Legal Documents</span>
                      <span className="text-[10px] text-stone-500 font-normal">
                        (Click to toggle verification)
                      </span>
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Synthetic NIC copy, DMT registration dossier, Revenue License application, and Comprehensive Insurance cover note.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    checklist.documentsChecked
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {checklist.documentsChecked ? 'Cleared' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Checklist Step 3: PDI Technical Inspection */}
            <div
              onClick={handleTogglePdi}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                checklist.pdiCompleted
                  ? 'bg-emerald-950/20 border-emerald-800/80'
                  : 'bg-[#141518] border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      checklist.pdiCompleted
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {checklist.pdiCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px]">3</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span>3. Pre-Delivery Technical Inspection (PDI)</span>
                      <span className="text-[10px] text-stone-500 font-normal">
                        (Click to toggle sign-off)
                      </span>
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Lead technician sign-off: battery terminal torque, 32psi cold tire pressure, mirror alignment, fuel 5L top-up, clean wash & polish.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    checklist.pdiCompleted
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {checklist.pdiCompleted ? 'Passed' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Checklist Step 4: Customer Briefing */}
            <div
              onClick={handleToggleOrientation}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                checklist.customerOrientationDone
                  ? 'bg-emerald-950/20 border-emerald-800/80'
                  : 'bg-[#141518] border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      checklist.customerOrientationDone
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-stone-800 text-stone-400 border border-stone-700'
                    }`}
                  >
                    {checklist.customerOrientationDone ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px]">4</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span>4. Handover Ceremony & Warranty Orientation</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Tool kit inspection, first 500km free service booklet handover, and customer keys photo ceremony.
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    checklist.customerOrientationDone
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {checklist.customerOrientationDone ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Handover Action Strip */}
            <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-stone-400">
                Delivering Officer:
                <span className="text-stone-200 font-medium ml-1.5">{deliveredBy}</span>
              </div>

              {isDelivered ? (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Delivered on {selectedBooking.deliveredAt} by {selectedBooking.deliveredBy}</span>
                </div>
              ) : (
                <button
                  onClick={handleExecuteDelivery}
                  disabled={!canDeliver}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors whitespace-nowrap"
                >
                  <Truck className="w-4 h-4" />
                  <span>Complete Official Handover</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Bike Timeline (1 Col) */}
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 text-stone-200 space-y-4">
          <div className="border-b border-stone-800 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Customer Journey Timeline
            </h3>
            <p className="text-xs text-stone-400">
              Inquiry through PDI and delivery
            </p>
          </div>

          <div className="bg-[#141518] p-3 rounded-lg border border-stone-800 text-xs space-y-1">
            <div className="font-semibold text-white">{selectedBooking.customerName}</div>
            <div className="text-stone-400 font-mono text-[11px]">{selectedBooking.customerPhone}</div>
            <div className="text-amber-300 font-medium pt-1">
              Royal Enfield {selectedBooking.bikeModel} ({selectedBooking.bikeColour})
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              Chassis: {selectedBooking.bikeChassis}
            </div>
          </div>

          <div className="space-y-4 border-l-2 border-stone-800 pl-4 ml-2 pt-2">
            {selectedBooking.timeline.map(t => (
              <div key={t.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#9b1c1c] border-2 border-[#18191d]"></span>
                <span className="text-[10px] text-stone-500 font-mono block">{t.date}</span>
                <span className="text-xs font-semibold text-stone-200 block mt-0.5">{t.title}</span>
                <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
