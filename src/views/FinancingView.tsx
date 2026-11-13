/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import {
  Calculator,
  Percent,
  Calendar,
  DollarSign,
  ShieldAlert,
  Send,
  Building2,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';

export const FinancingView: React.FC = () => {
  const { openNotificationModal } = useShowroom();

  const modelPresets: { [key: string]: number } = {
    'Hunter 350 Dapper': 1850000,
    'Classic 350 Halcyon': 2150000,
    'Classic 350 Stealth Black': 2350000,
    'Meteor 350 Fireball': 2250000,
    'Himalayan 450 Kaziranga': 2850000,
    'Continental GT 650 Apex Grey': 3450000,
    'Bullet 350 Standard': 1950000,
  };

  const [selectedModel, setSelectedModel] = useState<string>('Classic 350 Halcyon');
  const [vehiclePriceLkr, setVehiclePriceLkr] = useState<number>(2150000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30); // 30%
  const [tenureMonths, setTenureMonths] = useState<number>(36); // 36 months
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(15.5); // 15.5% p.a.
  const [customerName, setCustomerName] = useState('Pradeep Kumara');
  const [customerPhone, setCustomerPhone] = useState('+94 77 456 7890');

  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    if (modelPresets[modelName]) {
      setVehiclePriceLkr(modelPresets[modelName]);
    }
  };

  // Calculations
  const downPaymentLkr = useMemo(() => {
    return Math.round((vehiclePriceLkr * downPaymentPercent) / 100);
  }, [vehiclePriceLkr, downPaymentPercent]);

  const principalLkr = useMemo(() => {
    return Math.max(0, vehiclePriceLkr - downPaymentLkr);
  }, [vehiclePriceLkr, downPaymentLkr]);

  const monthlyEMI = useMemo(() => {
    if (principalLkr <= 0) return 0;
    const monthlyRate = annualInterestRate / 12 / 100;
    const emi =
      (principalLkr * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  }, [principalLkr, annualInterestRate, tenureMonths]);

  const totalRepaymentLkr = useMemo(() => {
    return monthlyEMI * tenureMonths;
  }, [monthlyEMI, tenureMonths]);

  const totalInterestLkr = useMemo(() => {
    return Math.max(0, totalRepaymentLkr - principalLkr);
  }, [totalRepaymentLkr, principalLkr]);

  const totalOutflowLkr = useMemo(() => {
    return downPaymentLkr + totalRepaymentLkr;
  }, [downPaymentLkr, totalRepaymentLkr]);

  // Year-wise schedule
  const yearlySchedule = useMemo(() => {
    const years = Math.ceil(tenureMonths / 12);
    const schedule = [];
    let balance = principalLkr;
    const monthlyRate = annualInterestRate / 12 / 100;

    for (let y = 1; y <= years; y++) {
      const monthsInYear = Math.min(12, tenureMonths - (y - 1) * 12);
      let interestYear = 0;
      let principalYear = 0;

      for (let m = 1; m <= monthsInYear; m++) {
        const interestMonth = balance * monthlyRate;
        const principalMonth = monthlyEMI - interestMonth;
        interestYear += interestMonth;
        principalYear += principalMonth;
        balance = Math.max(0, balance - principalMonth);
      }

      schedule.push({
        year: `Year ${y}`,
        months: `${monthsInYear} Months`,
        principalPaid: Math.round(principalYear),
        interestPaid: Math.round(interestYear),
        balanceRemaining: Math.round(balance),
      });
    }

    return schedule;
  }, [principalLkr, annualInterestRate, tenureMonths, monthlyEMI]);

  const handleDispatchQuote = (channel: 'WhatsApp' | 'SMS') => {
    openNotificationModal({
      title: 'Motorcycle Financing & EMI Quotation',
      recipientName: customerName,
      recipientPhone: customerPhone,
      message: `Dear ${customerName},\nHere is your requested Royal Enfield Leasing Proposal for the ${selectedModel}:\n\n` +
        `• Showroom Price: ${formatLKR(vehiclePriceLkr)}\n` +
        `• Down Payment (${downPaymentPercent}%): ${formatLKR(downPaymentLkr)}\n` +
        `• Financed Capital: ${formatLKR(principalLkr)}\n` +
        `• Monthly Installment (EMI): ${formatLKR(monthlyEMI)} / month\n` +
        `• Repayment Tenure: ${tenureMonths} Months (${tenureMonths / 12} Years)\n` +
        `• Indicative Interest: ${annualInterestRate}% p.a.\n\n` +
        `Partner Banks: Commercial Bank, HNB, Sampath Bank, LOLC Finance.\n` +
        `Ideal Motors Royal Enfield Showroom, Colombo 03.\n* Illustrative estimate; subject to credit approval.`,
      channel,
      purpose: 'Leasing Quotation',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-950/50 text-blue-400 border border-blue-900/40">
              Finance & Leasing Desk
            </span>
            <span className="text-xs text-stone-500">· Sri Lankan Financial Institution Calculator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            Motorcycle Leasing & EMI Simulator
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Calculate customer down payments, monthly lease rentals, amortization curves, and partner institution comparisons.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => handleDispatchQuote('WhatsApp')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            WhatsApp Quote
          </button>
          <button
            onClick={() => handleDispatchQuote('SMS')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            SMS Quote
          </button>
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Sliders & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#18191d] border border-stone-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
                <Sliders className="w-4 h-4 text-red-400" />
                <span>Lease Parameters</span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                Real-Time Calculation
              </span>
            </div>

            {/* Model Preset Selector */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Select Royal Enfield Model
              </label>
              <select
                value={selectedModel}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full bg-[#111215] border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-hidden focus:border-red-700"
              >
                {Object.keys(modelPresets).map(m => (
                  <option key={m} value={m}>
                    {m} — {formatLKR(modelPresets[m])}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Price Input */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-stone-300">Motorcycle Price (LKR)</span>
                <span className="font-mono text-stone-400">Total Invoice Value</span>
              </div>
              <input
                type="number"
                step={50000}
                value={vehiclePriceLkr}
                onChange={e => setVehiclePriceLkr(Math.max(100000, parseInt(e.target.value) || 0))}
                className="w-full bg-[#111215] border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-stone-100 font-semibold focus:outline-hidden focus:border-red-700"
              />
            </div>

            {/* Down Payment Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-stone-300">Down Payment Percentage</span>
                <span className="font-mono font-bold text-red-400">{downPaymentPercent}% ({formatLKR(downPaymentLkr)})</span>
              </div>
              <input
                type="range"
                min={20}
                max={70}
                step={5}
                value={downPaymentPercent}
                onChange={e => setDownPaymentPercent(parseInt(e.target.value))}
                className="w-full accent-red-700 bg-stone-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono mt-1">
                <span>Min 20% (Regulated)</span>
                <span>30% Standard</span>
                <span>50%</span>
                <span>Max 70%</span>
              </div>
            </div>

            {/* Tenure Buttons */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Lease Tenure (Months)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[12, 24, 36, 48, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenureMonths(m)}
                    className={`py-2 text-xs font-mono font-medium rounded-lg border transition-colors ${
                      tenureMonths === m
                        ? 'bg-red-900/60 text-red-200 border-red-700'
                        : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
                    }`}
                  >
                    {m}M ({m / 12}Y)
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-stone-300">Annual Interest Rate (% p.a.)</span>
                <span className="font-mono font-bold text-amber-400">{annualInterestRate}%</span>
              </div>
              <input
                type="range"
                min={12.0}
                max={22.0}
                step={0.5}
                value={annualInterestRate}
                onChange={e => setAnnualInterestRate(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-stone-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono mt-1">
                <span>12.0% Subsidized</span>
                <span>15.5% Sri Lanka Market Avg</span>
                <span>22.0% High</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="pt-3 border-t border-stone-800 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#111215] border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Contact Mobile
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#111215] border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-200 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Quotation & EMI Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Big Featured Monthly Installment Card */}
          <div className="bg-gradient-to-b from-[#211a1a] to-[#18191d] border border-red-900/50 rounded-xl p-6 text-center space-y-4 shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-300 bg-red-950/80 px-2.5 py-1 rounded border border-red-800/60 inline-block">
              Estimated Monthly Rental (EMI)
            </span>

            <div className="text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatLKR(monthlyEMI)}
              <span className="text-sm font-normal text-stone-400 block mt-1">/ month</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800/80 text-left text-xs">
              <div className="p-2.5 bg-stone-900/60 rounded-lg border border-stone-800">
                <div className="text-stone-400 text-[10px] uppercase font-mono">Down Payment</div>
                <div className="text-stone-200 font-bold font-mono tabular-nums mt-0.5">
                  {formatLKR(downPaymentLkr)}
                </div>
              </div>
              <div className="p-2.5 bg-stone-900/60 rounded-lg border border-stone-800">
                <div className="text-stone-400 text-[10px] uppercase font-mono">Financed Capital</div>
                <div className="text-stone-200 font-bold font-mono tabular-nums mt-0.5">
                  {formatLKR(principalLkr)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-left pt-2 border-t border-stone-800/80">
              <div className="flex justify-between text-stone-400">
                <span>Total Interest Payable:</span>
                <span className="font-mono tabular-nums text-amber-400">
                  {formatLKR(totalInterestLkr)}
                </span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Total Repayment Over Tenure:</span>
                <span className="font-mono tabular-nums text-stone-300">
                  {formatLKR(totalRepaymentLkr)}
                </span>
              </div>
              <div className="flex justify-between text-stone-300 font-semibold pt-1 border-t border-stone-800">
                <span>Total Customer Outflow:</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {formatLKR(totalOutflowLkr)}
                </span>
              </div>
            </div>
          </div>

          {/* Partner Leasing Institutions Preview */}
          <div className="bg-[#18191d] border border-stone-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-400" />
              <span>Partner Leasing Facilities</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-stone-900/60 rounded-lg border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-200">Commercial Bank Leasing</div>
                  <div className="text-[10px] text-stone-400">Up to 5 Yrs · Special RE Rate</div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">14.75%</span>
              </div>
              <div className="p-2 bg-stone-900/60 rounded-lg border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-200">Hatton National Bank (HNB)</div>
                  <div className="text-[10px] text-stone-400">Instant 24hr Fast-Track Approval</div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">15.25%</span>
              </div>
              <div className="p-2 bg-stone-900/60 rounded-lg border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-200">LOLC Finance PLC</div>
                  <div className="text-[10px] text-stone-400">Flexible Guarantor Terms</div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">16.00%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year Amortization Schedule Table */}
      <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
          <div>
            <h3 className="text-sm font-semibold text-stone-200">
              Illustrative Amortization Schedule
            </h3>
            <p className="text-xs text-stone-400">
              Breakdown of annual principal recovery vs interest charges across the {tenureMonths} month tenure
            </p>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            {tenureMonths} Payments Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121316] text-stone-400 border-b border-stone-800 font-medium">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Tenure Months</th>
                <th className="py-3 px-4">Principal Repaid (LKR)</th>
                <th className="py-3 px-4">Interest Paid (LKR)</th>
                <th className="py-3 px-4">Yearly Total (LKR)</th>
                <th className="py-3 px-4 text-right">Balance Remaining (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300 font-mono tabular-nums">
              {yearlySchedule.map((row, idx) => (
                <tr key={idx} className="hover:bg-stone-800/30">
                  <td className="py-3 px-4 font-semibold text-stone-200 font-sans">{row.year}</td>
                  <td className="py-3 px-4 text-stone-400 font-sans">{row.months}</td>
                  <td className="py-3 px-4 text-stone-300">{formatLKR(row.principalPaid)}</td>
                  <td className="py-3 px-4 text-amber-400">{formatLKR(row.interestPaid)}</td>
                  <td className="py-3 px-4 font-bold text-stone-100">
                    {formatLKR(row.principalPaid + row.interestPaid)}
                  </td>
                  <td className="py-3 px-4 text-right text-stone-400">
                    {formatLKR(row.balanceRemaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Illustrative Disclaimer Notice */}
      <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl flex items-start gap-3 text-xs text-stone-400">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-stone-300">Illustrative Financing Notice: </span>
          This simulator is provided for showroom presentation and customer quotation purposes only. Figures are representative calculations based on prevailing Sri Lankan financial institution guidelines and do not constitute a formal lease commitment or legally binding contract. Final terms, VAT/NBT applicability, documentation fees, and interest rates remain subject to formal credit appraisal and approval by the partner leasing institution.
        </div>
      </div>
    </div>
  );
};
