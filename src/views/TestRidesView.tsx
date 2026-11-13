/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { getTodayDDMMYYYY } from '../utils/formatters';
import {
  Zap,
  Calendar,
  Clock,
  MapPin,
  Star,
  UserCheck,
  Plus,
  Search,
  MessageSquare,
  CheckCircle,
  X,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { TestRideRecord } from '../types';

export const TestRidesView: React.FC = () => {
  const {
    testRides,
    bikes,
    employees,
    addTestRide,
    updateTestRideStatus,
    convertTestRideToLead,
    openNotificationModal,
    setCurrentView,
    setSelectedLeadId,
  } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeRideForFeedback, setActiveRideForFeedback] = useState<TestRideRecord | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 7');
  const [licenseNumber, setLicenseNumber] = useState('B');
  const [model, setModel] = useState('Classic 350');
  const [demoBikeChassis, setDemoBikeChassis] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [route, setRoute] = useState<TestRideRecord['route']>('Marine Drive Coastal Route');
  const [salespersonName, setSalespersonName] = useState(
    employees.find(e => e.department === 'Sales')?.fullName || 'Kasun Perera'
  );

  // Feedback Form states
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  // Demo fleet
  const demoBikes = bikes.filter(b => b.status === 'Demo' || b.status === 'Available');

  const filteredRides = testRides.filter(tr => {
    const matchesSearch =
      tr.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.customerPhone.includes(searchQuery) ||
      tr.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || tr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenSchedule = () => {
    setCustomerName('');
    setCustomerPhone('+94 77 123 4567');
    setLicenseNumber(`B${Math.floor(1000000 + Math.random() * 9000000)}`);
    const availableDemo = bikes.find(b => b.status === 'Demo');
    setDemoBikeChassis(availableDemo?.chassisNumber || 'ME3-DEMO-001');
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !licenseNumber) return;

    addTestRide({
      customerName,
      customerPhone,
      licenseNumber,
      model,
      demoBikeChassis: demoBikeChassis || 'ME3-TEST-DEMO',
      scheduledDate: getTodayDDMMYYYY(),
      timeSlot,
      route,
      status: 'Scheduled',
      salespersonName,
    });

    setScheduleModalOpen(false);
  };

  const handleOpenFeedback = (ride: TestRideRecord) => {
    setActiveRideForFeedback(ride);
    setRating(ride.feedbackRating || 5);
    setNotes(ride.feedbackNotes || '');
    setFeedbackModalOpen(true);
  };

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRideForFeedback) return;
    updateTestRideStatus(activeRideForFeedback.id, 'Completed', rating, notes);
    setFeedbackModalOpen(false);
  };

  const handleConvertToLead = (rideId: string) => {
    const res = convertTestRideToLead(rideId);
    if (res.success && res.leadId) {
      setSelectedLeadId(res.leadId);
      setCurrentView('crm');
    }
  };

  const handleSendReminder = (ride: TestRideRecord) => {
    openNotificationModal({
      title: 'Test Ride Confirmation & Slot Reminder',
      recipientName: ride.customerName,
      recipientPhone: ride.customerPhone,
      message: `Dear ${ride.customerName},\nYour Royal Enfield ${ride.model} test ride is scheduled for today at ${ride.timeSlot}.\nRoute: ${ride.route}.\nPlease ensure you bring your valid driving license (${ride.licenseNumber}).\nIdeal Motors Showroom, Colombo 03.\nHotline: 011 234 5678`,
      channel: 'SMS',
      purpose: 'Appointment Confirmation',
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900/40">
              Customer Experience Desk
            </span>
            <span className="text-xs text-stone-500">· Showroom Demo Fleet & Trial Rides</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            Test Ride Operations & Feedback Log
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Manage test ride bookings, driving license compliance, customer route trials, and post-ride feedback conversion.
          </p>
        </div>

        <button
          onClick={handleOpenSchedule}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Book Test Ride
        </button>
      </div>

      {/* Demo Fleet Showcase Strip */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
        <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Dedicated Showroom Demo Fleet
          </span>
          <span className="text-[11px] text-stone-400 font-normal">
            Colombo 03 Showroom Bay · Cleaned & Fueled Daily
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-200">Hunter 350 Dapper Ash</div>
              <div className="text-[11px] font-mono text-stone-500">VIN: ME3-HN35-D9802</div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active on Route
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                Urban Circuit
              </span>
            </div>
          </div>

          <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-200">Meteor 350 Supernova Red</div>
              <div className="text-[11px] font-mono text-stone-500">VIN: ME3-MT35-D4103</div>
              <div className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> In Showroom Bay
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                Coastal Route
              </span>
            </div>
          </div>

          <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-200">Himalayan 450 Kamet White</div>
              <div className="text-[11px] font-mono text-stone-500">VIN: ME3-HM45-D1908</div>
              <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Slot at 02:30 PM
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                Expressway Link
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191d] border border-stone-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
          <input
            type="text"
            placeholder="Search test rides by customer, phone, model or license..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-red-700"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['All', 'Scheduled', 'Completed', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-red-900/60 text-red-200 border border-red-700/60'
                  : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Test Ride Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-stone-400 border-b border-stone-800 font-medium">
              <tr>
                <th className="py-3 px-4">Slot & Date</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Model & Route</th>
                <th className="py-3 px-4">Driving License</th>
                <th className="py-3 px-4">Status & Experience</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filteredRides.map(ride => {
                const isCompleted = ride.status === 'Completed';
                const isScheduled = ride.status === 'Scheduled';

                return (
                  <tr key={ride.id} className="hover:bg-stone-800/40 transition-colors">
                    {/* Slot & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span className="font-mono">{ride.timeSlot}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                        {ride.scheduledDate}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-100">{ride.customerName}</div>
                      <div className="text-[11px] font-mono text-stone-400">{ride.customerPhone}</div>
                    </td>

                    {/* Model & Route */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-red-300">{ride.model}</div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                        <span>{ride.route}</span>
                      </div>
                    </td>

                    {/* License */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono text-stone-300">{ride.licenseNumber}</span>
                      </div>
                      <div className="text-[10px] text-stone-500 uppercase font-mono mt-0.5">
                        Verified SL DL
                      </div>
                    </td>

                    {/* Status & Feedback */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                            isCompleted
                              ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'
                              : isScheduled
                              ? 'bg-amber-950/50 text-amber-400 border-amber-900/50'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {ride.status}
                        </span>
                      </div>

                      {ride.feedbackRating && (
                        <div className="flex items-center gap-1 mt-1 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < (ride.feedbackRating || 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-700'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-mono text-stone-400 ml-1">
                            {ride.feedbackRating}/5
                          </span>
                        </div>
                      )}
                      {ride.feedbackNotes && (
                        <p className="text-[11px] text-stone-400 italic line-clamp-1 mt-0.5">
                          "{ride.feedbackNotes}"
                        </p>
                      )}
                    </td>

                    {/* Consultant */}
                    <td className="py-3.5 px-4 text-stone-400 text-xs">
                      {ride.salespersonName}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send SMS Reminder */}
                        <button
                          type="button"
                          onClick={() => handleSendReminder(ride)}
                          title="Simulate Reminder SMS"
                          className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Complete & Rate */}
                        {isScheduled && (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(ride)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-white bg-amber-950/50 hover:bg-amber-800/80 rounded border border-amber-900/50 transition-colors"
                          >
                            <Star className="w-3 h-3" />
                            Feedback
                          </button>
                        )}

                        {/* Convert to Lead */}
                        <button
                          type="button"
                          onClick={() => handleConvertToLead(ride.id)}
                          title="Convert this test ride into a CRM Lead"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-red-800 rounded border border-stone-700 transition-colors"
                        >
                          Convert Lead
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">Schedule Demo Test Ride</h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanjeewa Bandara"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Sri Lankan Driving License
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Target Model
                  </label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                  >
                    <option value="Classic 350">Classic 350</option>
                    <option value="Bullet 350">Bullet 350</option>
                    <option value="Hunter 350">Hunter 350</option>
                    <option value="Meteor 350">Meteor 350</option>
                    <option value="Himalayan 450">Himalayan 450</option>
                    <option value="Continental GT 650">Continental GT 650</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={e => setTimeSlot(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                  >
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Test Ride Route
                </label>
                <select
                  value={route}
                  onChange={e => setRoute(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                >
                  <option value="Marine Drive Coastal Route">Marine Drive Coastal Route (Scenic & Open Throttle)</option>
                  <option value="Urban Colombo Circuit">Urban Colombo Circuit (Galle Road & Traffic Handling)</option>
                  <option value="Suburban Expressway Link">Suburban Expressway Link (High-Speed Stability)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Assigned Sales Consultant
                </label>
                <select
                  value={salespersonName}
                  onChange={e => setSalespersonName(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                >
                  {employees
                    .filter(e => e.department === 'Sales')
                    .map(emp => (
                      <option key={emp.id} value={emp.fullName}>
                        {emp.fullName} ({emp.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalOpen && activeRideForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-100">Log Test Ride Feedback</h3>
              </div>
              <button
                onClick={() => setFeedbackModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="p-6 space-y-4">
              <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 text-xs">
                <div className="text-stone-200 font-semibold">{activeRideForFeedback.customerName}</div>
                <div className="text-stone-400">{activeRideForFeedback.model} · {activeRideForFeedback.route}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-2">
                  Customer Experience Rating (1-5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-mono font-bold text-amber-400 ml-2">
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Customer Feedback & Ride Impressions
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Highly impressed with low-end torque and comfortable upright riding posture. Intends to proceed with booking..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
                >
                  Save & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
