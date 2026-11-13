/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { LeadStatus, LeadPriority, Lead } from '../types';
import { formatLKR } from '../utils/formatters';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Calendar,
  FileCheck2,
  ChevronRight,
  User,
  LayoutGrid,
  List,
  PhoneCall,
  FileText,
  Send,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { LogCallModal } from '../components/crm/LogCallModal';

export const CrmView: React.FC<{
  onOpenNewLead: () => void;
  onOpenConvertModal: (leadId: string) => void;
}> = ({ onOpenNewLead, onOpenConvertModal }) => {
  const {
    leads,
    setSelectedLeadId,
    crmViewMode,
    setCrmViewMode,
    setProformaQuoteLeadId,
    openNotificationModal,
    updateLead,
  } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [callModalLeadId, setCallModalLeadId] = useState<string | null>(null);

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.salespersonName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesModel = modelFilter === 'All' || l.modelInterest.includes(modelFilter);
    const matchesPriority = priorityFilter === 'All' || l.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesModel && matchesPriority;
  });

  const statuses: LeadStatus[] = [
    'New',
    'Contacted',
    'Test Ride',
    'Quoted',
    'Booked',
    'Closed',
    'Lost',
  ];

  const models: string[] = [
    'All',
    'Classic 350',
    'Hunter 350',
    'Himalayan 450',
    'Continental GT 650',
    'Bullet 350',
    'Meteor 350',
  ];

  const handleQuickWhatsApp = (lead: Lead) => {
    openNotificationModal({
      title: 'Follow-Up WhatsApp Dispatch',
      recipientName: lead.customerName,
      recipientPhone: lead.phone,
      message: `Dear ${lead.customerName},\nGreetings from Ideal Nova Motors Royal Enfield Colombo!\nWe are following up on your inquiry regarding the Royal Enfield ${lead.modelInterest}.\nWould you like us to schedule a personalized showroom test ride or share an official proforma quote?\nBest regards,\n${lead.salespersonName} · 011 234 5678`,
      channel: 'WhatsApp',
      purpose: 'Lead Follow-up',
    });
  };

  const getPriorityBadge = (priority?: LeadPriority) => {
    if (priority === 'Hot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-950/70 text-red-300 border border-red-800/80">
          <Flame className="w-3 h-3 text-red-400" />
          Hot
        </span>
      );
    }
    if (priority === 'Warm') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-amber-950/70 text-amber-300 border border-amber-800/80">
          Warm
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-stone-900 text-stone-400 border border-stone-800">
        Cold
      </span>
    );
  };

  const kanbanColumns: Array<{ id: LeadStatus; label: string; color: string }> = [
    { id: 'New', label: 'New Inquiries', color: 'border-stone-700' },
    { id: 'Contacted', label: 'Contacted & Engaged', color: 'border-purple-800' },
    { id: 'Test Ride', label: 'Test Ride Experience', color: 'border-blue-800' },
    { id: 'Quoted', label: 'Proforma Quoted', color: 'border-amber-800' },
    { id: 'Booked', label: 'Deposit Booked', color: 'border-emerald-800' },
  ];

  return (
    <div className="space-y-5">
      {/* Module Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-red-400">
              Ideal Nova Motors · Sales & CRM Desk
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield Sri Lanka</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Sales Leads & Dealership Pipeline
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            End-to-end customer pipeline tracking: lead scoring, test rides, proforma quotes, and direct booking conversion.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* View Mode Toggle: Kanban vs List */}
          <div className="bg-[#121316] p-1 rounded-lg border border-stone-800 flex items-center gap-1">
            <button
              onClick={() => setCrmViewMode('list')}
              title="Table List View"
              className={`p-1.5 rounded transition-colors ${
                crmViewMode === 'list'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCrmViewMode('kanban')}
              title="Pipeline Kanban Board"
              className={`p-1.5 rounded transition-colors ${
                crmViewMode === 'kanban'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenNewLead}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, city, or salesperson..."
              className="w-full bg-[#121316] border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-stone-500"
            />
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium whitespace-nowrap">Priority:</span>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-hidden"
          >
            <option value="All">All Priorities</option>
            <option value="Hot">Hot (High Intent)</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>

        {/* Model Filter */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium whitespace-nowrap">Model:</span>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-hidden"
          >
            {models.map(m => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Models' : m}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter for list view */}
        {crmViewMode === 'list' && (
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#121316] rounded-lg border border-stone-800">
            {['All', ...statuses].map(st => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-red-800 text-white shadow-xs font-semibold'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW 1: KANBAN PIPELINE BOARD */}
      {crmViewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
          {kanbanColumns.map(col => {
            const columnLeads = filteredLeads.filter(l => l.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#16171b] border border-stone-800 rounded-xl overflow-hidden flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className={`p-3 bg-stone-900/80 border-b ${col.color} border-b-2 flex items-center justify-between`}>
                  <span className="font-bold text-xs text-stone-200 tracking-wide">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-bold">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[700px]">
                  {columnLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-stone-600 italic">
                      No leads in this stage
                    </div>
                  ) : (
                    columnLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="bg-[#1a1b20] border border-stone-800 hover:border-stone-700 rounded-lg p-3 text-xs space-y-2.5 cursor-pointer transition-all hover:bg-[#1e1f24] group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-stone-100 group-hover:text-red-400 transition-colors block">
                              {lead.customerName}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {lead.phone}
                            </span>
                          </div>
                          {getPriorityBadge(lead.priority)}
                        </div>

                        <div className="p-2 bg-stone-900/80 rounded border border-stone-800/80 text-[11px]">
                          <div className="font-medium text-stone-200">
                            {lead.modelInterest}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5 flex justify-between">
                            <span>{lead.colorPreference}</span>
                            {lead.budgetLkr && (
                              <span className="font-mono text-emerald-400 font-semibold">
                                {formatLKR(lead.budgetLkr)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-800/60">
                          <span className="truncate">{lead.salespersonName}</span>
                          <span className="font-mono text-stone-500">{lead.nextFollowUpDate}</span>
                        </div>

                        {/* Quick action strip */}
                        <div
                          className="pt-1 flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleQuickWhatsApp(lead)}
                            title="Quick WhatsApp message"
                            className="p-1 rounded bg-stone-900 hover:bg-emerald-950 text-stone-400 hover:text-emerald-400 border border-stone-800 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCallModalLeadId(lead.id)}
                            title="Log phone call"
                            className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProformaQuoteLeadId(lead.id)}
                            title="Generate Proforma Quotation"
                            className="p-1 rounded bg-stone-900 hover:bg-amber-950 text-stone-400 hover:text-amber-400 border border-stone-800 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                          {lead.status !== 'Booked' && lead.status !== 'Lost' && (
                            <button
                              type="button"
                              onClick={() => onOpenConvertModal(lead.id)}
                              title="Convert to formal booking"
                              className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white font-semibold text-[10px] transition-colors"
                            >
                              Book
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TRADITIONAL LIST TABLE */}
      {crmViewMode === 'list' && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Model & Preference</th>
                  <th className="py-3 px-4">Salesperson</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4">Sales Stage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500 italic">
                      No leads found matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => {
                    const isBooked = lead.status === 'Booked';

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="hover:bg-stone-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-300 font-bold flex items-center justify-center text-xs border border-stone-700">
                              {lead.customerName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-white block text-sm group-hover:text-red-400 transition-colors">
                                {lead.customerName}
                              </span>
                              <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono">{lead.phone}</span>
                                <span className="text-stone-600">·</span>
                                <span>{lead.city}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getPriorityBadge(lead.priority)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-stone-200 block">
                            Royal Enfield {lead.modelInterest}
                          </span>
                          <span className="text-[11px] text-stone-400 block">
                            {lead.colorPreference || 'No preference'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-stone-300 block font-medium">
                            {lead.salespersonName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-stone-300 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-stone-500" />
                            <span>{lead.nextFollowUpDate}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                              lead.status === 'Booked'
                                ? 'bg-red-900 text-white'
                                : lead.status === 'Quoted'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : lead.status === 'Test Ride'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : lead.status === 'Contacted'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : lead.status === 'Lost'
                                ? 'bg-stone-800 text-stone-500'
                                : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp follow-up */}
                            <button
                              type="button"
                              onClick={() => handleQuickWhatsApp(lead)}
                              title="Send WhatsApp Follow-up"
                              className="p-1.5 text-stone-400 hover:text-emerald-400 hover:bg-stone-800 rounded transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {/* Log call */}
                            <button
                              type="button"
                              onClick={() => setCallModalLeadId(lead.id)}
                              title="Log customer call"
                              className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>

                            {/* Proforma Quote */}
                            <button
                              type="button"
                              onClick={() => setProformaQuoteLeadId(lead.id)}
                              title="Generate Illustrative Proforma Quotation"
                              className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {!isBooked && lead.status !== 'Lost' && (
                              <button
                                onClick={() => onOpenConvertModal(lead.id)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white text-[11px] font-semibold rounded shadow-xs transition-colors whitespace-nowrap cursor-pointer ml-1"
                              >
                                <FileCheck2 className="w-3 h-3" />
                                <span>Convert</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="text-stone-400 hover:text-white p-1"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#141518] border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
            <span>Showing {filteredLeads.length} of {leads.length} recorded leads</span>
            <span className="font-mono text-[11px]">Ideal Nova Motors · CRM Operational Database</span>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={!!callModalLeadId}
        onClose={() => setCallModalLeadId(null)}
        leadId={callModalLeadId}
      />
    </div>
  );
};
