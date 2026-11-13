/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR, getTodayDDMMYYYY } from '../utils/formatters';
import {
  Repeat,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
  Bike,
  Sparkles,
  X,
} from 'lucide-react';
import { TradeInValuation } from '../types';

export const TradeInView: React.FC = () => {
  const { tradeIns, bookings, addTradeInValuation, applyTradeInToBooking } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [valuationModalOpen, setValuationModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [activeTradeInForApply, setActiveTradeInForApply] = useState<TradeInValuation | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');

  // Valuation Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 77 234 5678');
  const [currentMakeModel, setCurrentMakeModel] = useState('Bajaj Pulsar 150 DTS-i');
  const [registrationNumber, setRegistrationNumber] = useState('WP BDE-');
  const [manufacturingYear, setManufacturingYear] = useState<number>(2020);
  const [mileageKm, setMileageKm] = useState<number>(24000);
  const [condition, setCondition] = useState<TradeInValuation['condition']>('Good');
  const [targetModelInterest, setTargetModelInterest] = useState('Classic 350');
  const [notes, setNotes] = useState('Engine running smoothly, minor scratches on fuel tank, chain sprocket good.');

  // Estimate valuation in LKR based on synthetic formula
  const calculateEstimatedValuation = (
    modelName: string,
    year: number,
    km: number,
    cond: TradeInValuation['condition']
  ): number => {
    let base = 650000;
    if (modelName.includes('200') || modelName.includes('R15') || modelName.includes('Hornet')) {
      base = 780000;
    } else if (modelName.includes('FZ') || modelName.includes('Gixxer')) {
      base = 720000;
    }

    // Depreciation for year
    const age = Math.max(0, 2026 - year);
    let val = base * Math.pow(0.92, age);

    // Mileage deduction
    if (km > 30000) val -= (km - 30000) * 4;

    // Condition multiplier
    if (cond === 'Excellent') val *= 1.12;
    if (cond === 'Good') val *= 1.0;
    if (cond === 'Fair') val *= 0.85;
    if (cond === 'Requires Reconditioning') val *= 0.70;

    // Round to nearest 5,000 LKR
    return Math.max(250000, Math.round(val / 5000) * 5000);
  };

  const previewValuation = calculateEstimatedValuation(
    currentMakeModel,
    manufacturingYear,
    mileageKm,
    condition
  );

  const handleOpenNewValuation = () => {
    setCustomerName('');
    setCustomerPhone('+94 77 ' + Math.floor(1000000 + Math.random() * 9000000));
    setRegistrationNumber('WP B' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + '-' + Math.floor(1000 + Math.random() * 9000));
    setValuationModalOpen(true);
  };

  const handleSaveValuation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !registrationNumber) return;

    addTradeInValuation({
      customerName,
      customerPhone,
      currentMakeModel,
      registrationNumber: registrationNumber.toUpperCase(),
      manufacturingYear,
      mileageKm,
      condition,
      targetModelInterest,
      estimatedValuationLkr: previewValuation,
      evaluatorName: 'Pradeep Silva (Technical Evaluator)',
      notes,
    });

    setValuationModalOpen(false);
  };

  const handleOpenApplyCredit = (tradeIn: TradeInValuation) => {
    setActiveTradeInForApply(tradeIn);
    const activeConfirmed = bookings.filter(b => b.status === 'Confirmed');
    setSelectedBookingId(activeConfirmed.length > 0 ? activeConfirmed[0].id : '');
    setApplyModalOpen(true);
  };

  const handleConfirmApply = () => {
    if (!activeTradeInForApply || !selectedBookingId) return;
    applyTradeInToBooking(activeTradeInForApply.id, selectedBookingId);
    setApplyModalOpen(false);
  };

  const filteredTradeIns = tradeIns.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.customerName.toLowerCase().includes(q) ||
      t.registrationNumber.toLowerCase().includes(q) ||
      t.currentMakeModel.toLowerCase().includes(q) ||
      t.customerPhone.includes(q)
    );
  });

  const totalEvaluatedLkr = tradeIns.reduce((sum, t) => sum + t.estimatedValuationLkr, 0);
  const activeConfirmedBookings = bookings.filter(b => b.status === 'Confirmed');

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
              Exchange & Trade-In Desk
            </span>
            <span className="text-xs text-stone-500">· Multi-Brand Upgrade Facility</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            Motorcycle Trade-In & Valuation Desk
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Evaluate customer exchange motorcycles, calculate instant fair-market credit in LKR, and apply deductions to new Royal Enfield bookings.
          </p>
        </div>

        <button
          onClick={handleOpenNewValuation}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Bike Valuation
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <Repeat className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Total Valuations
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {tradeIns.length}
            </div>
            <div className="text-[11px] text-stone-500">Evaluated Used Bikes</div>
          </div>
        </div>

        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Applied To Bookings
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {tradeIns.filter(t => t.appliedBookingId).length}
            </div>
            <div className="text-[11px] text-emerald-400">Credit Offset Completed</div>
          </div>
        </div>

        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <Calculator className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Total Trade-In Value
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {formatLKR(totalEvaluatedLkr)}
            </div>
            <div className="text-[11px] text-stone-500">Accumulated Credit (LKR)</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
          <input
            type="text"
            placeholder="Search valuations by customer, registration number, or bike model..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-red-700"
          />
        </div>

        <div className="text-xs text-stone-400 flex items-center gap-1.5">
          <span>Showing</span>
          <span className="font-semibold text-stone-200 font-mono tabular-nums">
            {filteredTradeIns.length}
          </span>
          <span>of {tradeIns.length} valuations</span>
        </div>
      </div>

      {/* Valuations Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-stone-400 border-b border-stone-800 font-medium">
              <tr>
                <th className="py-3 px-4">Evaluation ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Exchanged Motorcycle</th>
                <th className="py-3 px-4">Condition & Odo</th>
                <th className="py-3 px-4">Target RE Model</th>
                <th className="py-3 px-4">Valuation (LKR)</th>
                <th className="py-3 px-4">Status & Credit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filteredTradeIns.map(trade => {
                const isApplied = !!trade.appliedBookingId;

                return (
                  <tr key={trade.id} className="hover:bg-stone-800/40 transition-colors">
                    {/* ID & Date */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-stone-200 font-semibold">{trade.id}</div>
                      <div className="text-[11px] text-stone-500">{trade.date}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-100">{trade.customerName}</div>
                      <div className="text-[11px] font-mono text-stone-400">{trade.customerPhone}</div>
                    </td>

                    {/* Exchanged Bike */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-200">{trade.currentMakeModel}</div>
                      <div className="font-mono text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-stone-900 border border-stone-800 rounded">
                          {trade.registrationNumber}
                        </span>
                        <span className="text-stone-500">· {trade.manufacturingYear}</span>
                      </div>
                    </td>

                    {/* Condition & Odo */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                          trade.condition === 'Excellent'
                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'
                            : trade.condition === 'Good'
                            ? 'bg-blue-950/50 text-blue-400 border-blue-900/50'
                            : 'bg-amber-950/50 text-amber-400 border-amber-900/50'
                        }`}
                      >
                        {trade.condition}
                      </span>
                      <div className="text-[11px] font-mono text-stone-400 mt-1">
                        {trade.mileageKm.toLocaleString()} km
                      </div>
                    </td>

                    {/* Target Model */}
                    <td className="py-3.5 px-4 font-medium text-red-300">
                      {trade.targetModelInterest}
                    </td>

                    {/* Valuation LKR */}
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-100 tabular-nums">
                      {formatLKR(trade.estimatedValuationLkr)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {isApplied ? (
                        <div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Applied
                          </span>
                          <span className="text-[10px] font-mono text-stone-400 block mt-0.5">
                            Booking #{trade.appliedBookingId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                          Pending Allocation
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {isApplied ? (
                        <span className="text-xs text-stone-500 italic">Credit Linked</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenApplyCredit(trade)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-stone-800 hover:bg-emerald-800 text-stone-200 hover:text-white border border-stone-700 hover:border-emerald-700 transition-colors cursor-pointer"
                        >
                          Apply to Booking
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Valuation Modal */}
      {valuationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-stone-100">
                  New Multi-Brand Trade-In Valuation
                </h3>
              </div>
              <button
                onClick={() => setValuationModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveValuation} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruwan Wickremasinghe"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Current Bike Make & Model
                  </label>
                  <select
                    value={currentMakeModel}
                    onChange={e => setCurrentMakeModel(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                  >
                    <option value="Bajaj Pulsar 150 DTS-i">Bajaj Pulsar 150 DTS-i</option>
                    <option value="Bajaj Pulsar NS200">Bajaj Pulsar NS200</option>
                    <option value="Yamaha FZ-S Version 3.0">Yamaha FZ-S Version 3.0</option>
                    <option value="Yamaha YZF-R15 V4">Yamaha YZF-R15 V4</option>
                    <option value="Honda CB Hornet 160R">Honda CB Hornet 160R</option>
                    <option value="TVS Apache RTR 160 4V">TVS Apache RTR 160 4V</option>
                    <option value="Suzuki Gixxer 150">Suzuki Gixxer 150</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Vehicle Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WP BCN-4412"
                    value={registrationNumber}
                    onChange={e => setRegistrationNumber(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 uppercase focus:border-red-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Year of Mfg
                  </label>
                  <input
                    type="number"
                    min={2014}
                    max={2026}
                    value={manufacturingYear}
                    onChange={e => setManufacturingYear(parseInt(e.target.value) || 2020)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Mileage (Km)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={mileageKm}
                    onChange={e => setMileageKm(parseInt(e.target.value) || 20000)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:border-red-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Requires Reconditioning">Reconditioning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Target Royal Enfield Model
                </label>
                <select
                  value={targetModelInterest}
                  onChange={e => setTargetModelInterest(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                >
                  <option value="Classic 350">Royal Enfield Classic 350</option>
                  <option value="Bullet 350">Royal Enfield Bullet 350</option>
                  <option value="Hunter 350">Royal Enfield Hunter 350</option>
                  <option value="Meteor 350">Royal Enfield Meteor 350</option>
                  <option value="Himalayan 450">Royal Enfield Himalayan 450</option>
                  <option value="Continental GT 650">Royal Enfield Continental GT 650</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Technical Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 focus:border-red-700 focus:outline-hidden"
                />
              </div>

              {/* Instant Valuation Preview Strip */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono text-emerald-400">
                    Calculated Trade-In Credit
                  </div>
                  <div className="text-xs text-stone-400">
                    Instant showroom valuation quote
                  </div>
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-emerald-300">
                  {formatLKR(previewValuation)}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setValuationModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  Save Valuation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Credit Modal */}
      {applyModalOpen && activeTradeInForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-stone-100">
                  Apply Trade-In Credit to Booking
                </h3>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-stone-900/80 rounded-lg border border-stone-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Exchange Motorcycle:</span>
                  <span className="text-stone-200 font-semibold">{activeTradeInForApply.currentMakeModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Registration Number:</span>
                  <span className="font-mono text-amber-400">{activeTradeInForApply.registrationNumber}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-800 text-emerald-400 font-bold">
                  <span>Exchange Credit Amount:</span>
                  <span className="font-mono">{formatLKR(activeTradeInForApply.estimatedValuationLkr)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Select Active Confirmed Booking
                </label>
                {activeConfirmedBookings.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-950/30 p-2.5 rounded border border-amber-900/40">
                    No active confirmed bookings available.
                  </p>
                ) : (
                  <select
                    value={selectedBookingId}
                    onChange={e => setSelectedBookingId(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-red-700"
                  >
                    {activeConfirmedBookings.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.id} — {b.customerName} ({b.bikeModel} · Current Total: {formatLKR(b.finalPriceLkr)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <p className="text-[11px] text-stone-400 italic">
                * Applying this credit will immediately deduct {formatLKR(activeTradeInForApply.estimatedValuationLkr)} from the customer's final payable invoice balance.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApply}
                  disabled={!selectedBookingId}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Confirm & Apply Credit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
