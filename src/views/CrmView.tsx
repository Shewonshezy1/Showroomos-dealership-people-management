/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { LeadStatus } from '../types';
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
  ArrowUpDown,
} from 'lucide-react';

export const CrmView: React.FC<{
  onOpenNewLead: () => void;
  onOpenConvertModal: (leadId: string) => void;
}> = ({ onOpenNewLead, onOpenConvertModal }) => {
  const { leads, setSelectedLeadId } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');

  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.salespersonName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesModel = modelFilter === 'All' || l.modelInterest.includes(modelFilter);

    return matchesSearch && matchesStatus && matchesModel;
  });

  const statuses: string[] = [
    'All',
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

  return (
    <div className="space-y-5">
      {/* Module Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              Customer Relationship Management
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield Sri Lanka</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Sales Leads & Inquiry Pipeline
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Track inquiries, follow-up commitments, and convert qualified prospects to formal stock allocations.
          </p>
        </div>

        <button
          onClick={onOpenNewLead}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white font-semibold text-xs rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Lead</span>
        </button>
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

        {/* Model Filter */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium whitespace-nowrap">Model:</span>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-hidden focus:border-stone-500"
          >
            {models.map(m => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Models' : m}
              </option>
            ))}
          </select>
        </div>

        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#121316] rounded-lg border border-stone-800">
          {statuses.map(st => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Model & Preference</th>
                <th className="py-3 px-4">Salesperson</th>
                <th className="py-3 px-4">Source</th>
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
                            <span className="font-semibold text-white block text-sm group-hover:text-amber-300 transition-colors">
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
                        <span className="text-stone-400 text-[11px]">
                          {lead.source}
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
                              ? 'bg-[#9b1c1c] text-white'
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
                        <div className="flex items-center justify-end gap-2">
                          {!isBooked && lead.status !== 'Lost' && (
                            <button
                              onClick={() => onOpenConvertModal(lead.id)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white text-[11px] font-semibold rounded shadow-xs transition-colors whitespace-nowrap"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>Convert to Booking</span>
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
          <span className="font-mono text-[11px]">Storage: Local Browser DB</span>
        </div>
      </div>
    </div>
  );
};
