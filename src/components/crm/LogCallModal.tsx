/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { CallLog } from '../../types';
import { PhoneCall, X, Check, Clock, UserCheck } from 'lucide-react';

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
}

export const LogCallModal: React.FC<LogCallModalProps> = ({ isOpen, onClose, leadId }) => {
  const { leads, addCallLogToLead, currentUser } = useShowroom();

  const [outcome, setOutcome] = useState<CallLog['outcome']>('Interested');
  const [notes, setNotes] = useState('');
  const [callerName, setCallerName] = useState(currentUser?.fullName || 'Sales Executive');

  if (!isOpen || !leadId) return null;
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    addCallLogToLead(lead.id, {
      caller: callerName,
      outcome,
      notes,
    });

    onClose();
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">Log Customer Phone Call</h3>
              <p className="text-xs text-stone-400">{lead.customerName} · {lead.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-stone-300 font-medium mb-1.5">
              Call Outcome
            </label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value as any)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-hidden focus:border-red-700"
            >
              <option value="Interested">Interested & Positive</option>
              <option value="Scheduled Test Ride">Scheduled Test Ride Appointment</option>
              <option value="Price Objection">Price / Budget Objection</option>
              <option value="Follow Up Later">Follow Up Later (Busy)</option>
              <option value="Unreachable">Unreachable / Ringing Out</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1.5">
              Caller / Sales Consultant
            </label>
            <input
              type="text"
              value={callerName}
              onChange={e => setCallerName(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-stone-200 focus:outline-hidden focus:border-red-700"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1.5">
              Call Notes & Key Takeaways
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Discussed color preference (Kaza Brown) and financing options. Customer will visit showroom this Saturday..."
              className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2.5 text-stone-200 focus:outline-hidden focus:border-red-700"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-stone-400 hover:text-stone-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
            >
              Save Call Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
