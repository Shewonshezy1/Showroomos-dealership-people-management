/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { LeadSource, LeadStatus } from '../../types';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { getTodayDDMMYYYY } from '../../utils/formatters';

export const NewLeadModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { addLead, employees } = useShowroom();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+94 7');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Colombo');
  const [modelInterest, setModelInterest] = useState('Classic 350');
  const [colorPreference, setColorPreference] = useState('');
  const [salespersonId, setSalespersonId] = useState(employees[0]?.id || 'emp-001');
  const [source, setSource] = useState<LeadSource>('Walk-in');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(getTodayDDMMYYYY());
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please provide customer name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('Please provide a valid contact number.');
      return;
    }

    const salesperson = employees.find(e => e.id === salespersonId);

    addLead({
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.lk`,
      city: city.trim(),
      modelInterest,
      colorPreference: colorPreference.trim() || 'Showroom Spec',
      salespersonId,
      salespersonName: salesperson ? salesperson.fullName : 'Showroom Sales Desk',
      source,
      status: 'New',
      nextFollowUpDate: nextFollowUpDate || getTodayDDMMYYYY(),
    });

    onClose();
  };

  const models = [
    'Classic 350',
    'Hunter 350',
    'Himalayan 450',
    'Continental GT 650',
    'Bullet 350',
    'Meteor 350',
    'Super Meteor 650',
  ];

  const sources: LeadSource[] = [
    'Walk-in',
    'Digital inquiry',
    'Test ride event',
    'Phone',
    'Referral',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9b1c1c] text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Register New Sales Inquiry
              </h3>
              <p className="text-[11px] text-stone-400">
                Log customer interest in CRM pipeline
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
              <label className="block text-stone-400 mb-1 font-medium">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Priyantha Senaratne"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">Contact Phone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">City / Area</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Colombo 03, Kandy, Galle"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Motorcycle Model *</label>
              <select
                value={modelInterest}
                onChange={e => setModelInterest(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              >
                {models.map(m => (
                  <option key={m} value={m}>
                    Royal Enfield {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1 font-medium">Preferred Colour</label>
              <input
                type="text"
                value={colorPreference}
                onChange={e => setColorPreference(e.target.value)}
                placeholder="e.g. Halcyon Green, Dapper Ash"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Inquiry Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as LeadSource)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              >
                {sources.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div>
            <label className="block text-stone-400 mb-1 font-medium">First Follow-up Date (DD/MM/YYYY)</label>
            <input
              type="text"
              value={nextFollowUpDate}
              onChange={e => setNextFollowUpDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
            />
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded-md transition-colors shadow-xs"
            >
              Register Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
