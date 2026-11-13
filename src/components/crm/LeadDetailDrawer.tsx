/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { LeadStatus } from '../../types';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Plus,
  Send,
  FileCheck2,
  Trash2,
  AlertCircle,
  PhoneCall,
  FileText,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { LeadPriority } from '../../types';
import { LogCallModal } from './LogCallModal';

export const LeadDetailDrawer: React.FC<{
  onOpenConvertModal: (leadId: string) => void;
}> = ({ onOpenConvertModal }) => {
  const {
    selectedLeadId,
    setSelectedLeadId,
    leads,
    updateLead,
    updateLeadPriority,
    addLeadNote,
    deleteLead,
    setSelectedBookingId,
    setCurrentView,
    setProformaQuoteLeadId,
    openNotificationModal,
  } = useShowroom();

  const [newNoteText, setNewNoteText] = useState('');
  const [logCallModalOpen, setLogCallModalOpen] = useState(false);

  if (!selectedLeadId) return null;

  const lead = leads.find(l => l.id === selectedLeadId);
  if (!lead) return null;

  const handleStatusChange = (status: LeadStatus) => {
    updateLead(lead.id, { status });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addLeadNote(lead.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleDelete = () => {
    if (confirm(`Remove lead record for ${lead.customerName}?`)) {
      deleteLead(lead.id);
      setSelectedLeadId(null);
    }
  };

  const statusOptions: LeadStatus[] = [
    'New',
    'Contacted',
    'Test Ride',
    'Quoted',
    'Booked',
    'Closed',
    'Lost',
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#18191d] border-l border-stone-800 text-stone-200 w-full max-w-xl h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-stone-800 text-stone-300 font-bold flex items-center justify-center text-sm border border-stone-700">
              {lead.customerName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {lead.customerName}
              </h3>
              <p className="text-xs text-stone-400">
                Source: <span className="text-stone-300">{lead.source}</span> · Registered {lead.createdAt}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedLeadId(null)}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Stage & Convert Action Strip */}
          <div className="bg-[#202228] p-4 rounded-lg border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-semibold text-stone-400">
                Sales Stage
              </label>
              {lead.bookingId ? (
                <button
                  onClick={() => {
                    setSelectedBookingId(lead.bookingId!);
                    setCurrentView('bookings');
                    setSelectedLeadId(null);
                  }}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Linked Booking: {lead.bookingId}</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenConvertModal(lead.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded-md shadow-xs transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Convert to Booking</span>
                </button>
              )}
            </div>

            {/* Segmented Status Selector */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {statusOptions.map(st => {
                const isActive = lead.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`py-1.5 px-2 text-[11px] font-medium rounded transition-colors ${
                      isActive
                        ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                        : 'bg-stone-800/80 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Quick Actions */}
          <div className="bg-[#202228] p-3.5 rounded-lg border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Lead Priority
              </span>
              <div className="flex items-center gap-1.5">
                {(['Hot', 'Warm', 'Cold'] as LeadPriority[]).map((p) => {
                  const isCur = (lead.priority || 'Warm') === p;
                  return (
                    <button
                      key={p}
                      onClick={() => updateLeadPriority(lead.id, p)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                        isCur
                          ? p === 'Hot'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : p === 'Warm'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
                      }`}
                    >
                      {p === 'Hot' ? '🔥 Hot' : p === 'Warm' ? '⚡ Warm' : '❄️ Cold'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-800/80">
              <button
                type="button"
                onClick={() => setLogCallModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-md border border-stone-700 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
                <span>Log Call</span>
              </button>
              <button
                type="button"
                onClick={() => setProformaQuoteLeadId(lead.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-md border border-stone-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Quotation</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openNotificationModal({
                    title: 'Proforma & Test Ride Preview (Simulated)',
                    recipientName: lead.customerName,
                    recipientPhone: lead.phone,
                    channel: 'WhatsApp',
                    purpose: 'Simulated Lead Follow-up Preview',
                    message: `Proforma estimate and test ride invitation draft prepared for ${lead.customerName}. Ideal Nova Motors (+94 11 200 4500).`,
                  })
                }
                className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 rounded-md border border-emerald-800/60 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Contact & Sales Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1c1d22] p-3.5 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Contact Information
              </span>
              <div className="flex items-center gap-2 text-stone-200">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-mono">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-200">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span className="truncate">{lead.email}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-200">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{lead.city}</span>
              </div>
            </div>

            <div className="bg-[#1c1d22] p-3.5 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Motorcycle Interest
              </span>
              <div>
                <span className="text-stone-400 text-[11px] block">Model:</span>
                <span className="font-semibold text-white text-sm">
                  {lead.modelInterest}
                </span>
              </div>
              <div>
                <span className="text-stone-400 text-[11px] block">Preferred Colour:</span>
                <span className="text-stone-300">{lead.colorPreference || 'Any Colour'}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[11px] block">Sales Consultant:</span>
                <span className="text-stone-300 font-medium">{lead.salespersonName}</span>
              </div>
            </div>
          </div>

          {/* Follow-up scheduler */}
          <div className="bg-[#1c1d22] p-3.5 rounded-lg border border-stone-800/90 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Next Follow-up Scheduled:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={lead.nextFollowUpDate}
                onChange={e => updateLead(lead.id, { nextFollowUpDate: e.target.value })}
                placeholder="DD/MM/YYYY"
                className="bg-stone-900 border border-stone-700 px-2.5 py-1 text-xs font-mono rounded text-stone-200 w-32 focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          {/* Call Logs & Interactions */}
          {lead.callLogs && lead.callLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
                  Call Log History ({lead.callLogs.length})
                </h4>
              </div>
              <div className="space-y-2">
                {lead.callLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#1f2025] p-2.5 rounded-lg border border-stone-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-sky-400">
                        {log.outcome}
                      </span>
                      <span className="text-stone-400 font-mono text-[10px]">
                        {log.timestamp || log.date} · {log.caller}
                      </span>
                    </div>
                    <p className="text-stone-300 text-[11px]">{log.notes}</p>
                    {log.nextFollowUp && (
                      <p className="text-[10px] text-amber-400/90 font-mono">
                        Follow-up scheduled: {log.nextFollowUp}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Activity Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Activity & Notes History ({lead.notes.length})
              </h4>
            </div>

            {/* Add note input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                placeholder="Add conversation notes, customer requirements, or test ride feedback..."
                rows={2}
                className="w-full bg-[#141518] border border-stone-700 rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-stone-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Log Note</span>
                </button>
              </div>
            </form>

            {/* Note items */}
            <div className="space-y-2.5 pt-2">
              {lead.notes.map(note => (
                <div
                  key={note.id}
                  className="bg-[#1f2025] p-3 rounded-lg border border-stone-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span className="font-semibold text-stone-300">{note.author}</span>
                    <span className="font-mono">{note.date}</span>
                  </div>
                  <p className="text-stone-300 leading-relaxed">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#151619] flex items-center justify-between text-xs">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Lead</span>
          </button>
          <button
            onClick={() => setSelectedLeadId(null)}
            className="px-4 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={logCallModalOpen}
        onClose={() => setLogCallModalOpen(false)}
        leadId={lead.id}
      />
    </div>
  );
};
