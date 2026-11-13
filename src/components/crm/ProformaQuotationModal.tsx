/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR, getTodayDDMMYYYY } from '../../utils/formatters';
import {
  X,
  Printer,
  FileText,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';

export const ProformaQuotationModal: React.FC = () => {
  const {
    proformaQuoteLeadId,
    setProformaQuoteLeadId,
    leads,
    currentUser,
    openNotificationModal,
  } = useShowroom();

  if (!proformaQuoteLeadId) return null;
  const lead = leads.find(l => l.id === proformaQuoteLeadId);
  if (!lead) return null;

  // Illustrative price estimate based on model
  const getBasePrice = (model: string): number => {
    if (model.includes('Continental') || model.includes('650')) return 3450000;
    if (model.includes('Himalayan') || model.includes('450')) return 3450000;
    if (model.includes('Meteor')) return 2250000;
    if (model.includes('Hunter')) return 1890000;
    if (model.includes('Bullet')) return 1950000;
    return 2450000; // Classic 350 default
  };

  const basePriceLkr = getBasePrice(lead.modelInterest);
  const registrationFeesLkr = 45000;
  const insuranceLkr = 65000;
  const standardDiscountLkr = 30000;
  const accessoriesEstimateLkr = 45000;
  const totalOnTheRoadLkr =
    basePriceLkr + registrationFeesLkr + insuranceLkr + accessoriesEstimateLkr - standardDiscountLkr;

  const quoteId = `QTN-2026-${lead.id.replace('lead-', '').padStart(4, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsAppQuote = () => {
    openNotificationModal({
      title: 'Royal Enfield Official Proforma Quotation',
      recipientName: lead.customerName,
      recipientPhone: lead.phone,
      message: `Dear ${lead.customerName},\nThank you for choosing Ideal Nova Motors (Royal Enfield Sri Lanka).\nHere is your official Proforma Quotation #${quoteId}:\n\n` +
        `• Motorcycle: Royal Enfield ${lead.modelInterest} (${lead.colorPreference})\n` +
        `• Base Price: ${formatLKR(basePriceLkr)}\n` +
        `• Registration & RMV: ${formatLKR(registrationFeesLkr)}\n` +
        `• 1st Year Insurance: ${formatLKR(insuranceLkr)}\n` +
        `• Genuine Accessories Bundle: ${formatLKR(accessoriesEstimateLkr)}\n` +
        `• Dealer Discount: -${formatLKR(standardDiscountLkr)}\n` +
        `• Total On-The-Road (LKR): ${formatLKR(totalOnTheRoadLkr)}\n\n` +
        `Quotation valid for 14 calendar days.\nConsultant: ${lead.salespersonName}\nIdeal Nova Motors Flagship, Colombo 03.\nHotline: 011 234 5678`,
      channel: 'WhatsApp',
      purpose: 'Official Proforma Quote',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header toolbar (Hidden when printing) */}
        <div className="no-print px-6 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">
                Official Proforma Quotation
              </h3>
              <p className="text-xs text-stone-400 font-mono">Ref: {quoteId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsAppQuote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              WhatsApp Quote
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={() => setProformaQuoteLeadId(null)}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto bg-white text-stone-900 font-sans print:p-0 print:m-0 space-y-6">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-red-800 pb-4">
            <div className="space-y-1">
              <div className="bg-white p-1 rounded w-fit mb-1">
                <img
                  src="/assets/aistudio/image_b229486a.png"
                  alt="Ideal Nova Motors"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="text-[11px] text-stone-600 font-medium">
                Ideal Nova Motors (Pvt) Ltd · Official Royal Enfield Dealership
              </div>
              <div className="text-[10px] text-stone-500">
                Flagship Experience Centre, Galle Road, Colombo 03, Sri Lanka.<br />
                Hotline: +94 11 234 5678 · Email: sales@idealnova.lk · Web: www.idealnova.lk
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-lg font-black tracking-tight text-red-900 block font-mono">
                PROFORMA QUOTATION
              </span>
              <div className="text-xs font-mono font-bold text-stone-800">
                {quoteId}
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Date: {getTodayDDMMYYYY()}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                Valid for 14 Days
              </div>
            </div>
          </div>

          {/* Customer & Consultant Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-500 font-bold mb-1">
                Customer Particulars
              </div>
              <div className="text-sm font-bold text-stone-900">{lead.customerName}</div>
              <div className="text-stone-600 font-mono mt-0.5">{lead.phone}</div>
              <div className="text-stone-600">{lead.email}</div>
              <div className="text-stone-500 mt-1">{lead.city}, Sri Lanka</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-stone-500 font-bold mb-1">
                Dealership Consultant
              </div>
              <div className="text-sm font-bold text-stone-900">{lead.salespersonName}</div>
              <div className="text-stone-600">Sales Executive · Royal Enfield Colombo</div>
              <div className="text-stone-500 mt-1">Branch: Colombo Flagship Hub</div>
            </div>
          </div>

          {/* Motorcycle Specification Header */}
          <div className="p-3 bg-red-950 text-white rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-red-300">
                Vehicle Proposed
              </div>
              <div className="text-base font-bold">
                Royal Enfield {lead.modelInterest}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-red-300">Color Choice</div>
              <div className="text-xs font-medium text-stone-100">
                {lead.colorPreference || 'Standard Factory Finish'}
              </div>
            </div>
          </div>

          {/* Itemized Quotation Table */}
          <table className="w-full text-xs text-left border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-stone-100 text-stone-700 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-800">
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  Royal Enfield {lead.modelInterest} (Brand New 2026 Model)
                  <span className="block text-[10px] text-stone-500">
                    Includes factory warranty 2 Years / 30,000 km + 3 Free Services
                  </span>
                </td>
                <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">Motorcycle</td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold">
                  {formatLKR(basePriceLkr)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">
                  Department of Motor Traffic (RMV) Registration & Number Plates
                </td>
                <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">Statutory Fee</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatLKR(registrationFeesLkr)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">
                  1st Year Comprehensive Insurance Cover (SRCC Included)
                </td>
                <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">Insurance</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatLKR(insuranceLkr)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">
                  Genuine Royal Enfield Touring Accessories Package (Seat & Sump Guard)
                </td>
                <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">Accessories</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatLKR(accessoriesEstimateLkr)}
                </td>
              </tr>
              <tr className="bg-emerald-50 text-emerald-900 font-medium">
                <td className="py-2 px-3">
                  Special Ideal Nova Motors Launch Discount
                </td>
                <td className="py-2 px-3 font-mono text-[11px]">Promotion</td>
                <td className="py-2 px-3 text-right font-mono font-bold">
                  -{formatLKR(standardDiscountLkr)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-stone-100 font-bold text-stone-900 border-t-2 border-stone-800">
              <tr>
                <td colSpan={2} className="py-3 px-3 text-sm uppercase">
                  Total On-The-Road Price (LKR)
                </td>
                <td className="py-3 px-3 text-right text-base font-mono text-red-900">
                  {formatLKR(totalOnTheRoadLkr)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Financing Reference & Terms */}
          <div className="grid grid-cols-2 gap-4 text-[11px] text-stone-600 border-t border-stone-200 pt-3">
            <div>
              <div className="font-bold text-stone-800 uppercase mb-1">
                Indicative Leasing Option (30% Down)
              </div>
              <p>Down Payment: {formatLKR(Math.round(totalOnTheRoadLkr * 0.3))}</p>
              <p>Financed Capital: {formatLKR(Math.round(totalOnTheRoadLkr * 0.7))}</p>
              <p className="text-emerald-700 font-semibold mt-0.5">
                Estimated Monthly EMI: {formatLKR(Math.round((totalOnTheRoadLkr * 0.7 * 0.0345)))} / mo (36 Months)
              </p>
            </div>
            <div>
              <div className="font-bold text-stone-800 uppercase mb-1">Terms & Conditions</div>
              <ul className="list-disc pl-3.5 space-y-0.5">
                <li>Price validity: 14 calendar days from quote issuance.</li>
                <li>Chassis reservation requires an advance payment of LKR 500,000.</li>
                <li>Delivery within 5-7 business days following final payment settlement.</li>
              </ul>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-stone-200 text-xs">
            <div className="pt-8 border-t border-stone-400 text-center text-stone-600">
              Customer Acknowledgement
            </div>
            <div className="pt-8 border-t border-stone-400 text-center text-stone-600">
              Authorized Signatory · Ideal Nova Motors
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
