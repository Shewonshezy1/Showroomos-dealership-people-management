/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { X, CheckCircle2, ArrowRight, Sparkles, ShieldAlert, FileText, Check } from 'lucide-react';

export const DemoGuideModal: React.FC = () => {
  const {
    demoGuideOpen,
    setDemoGuideOpen,
    setCurrentView,
    setSelectedLeadId,
    setSelectedBookingId,
  } = useShowroom();

  if (!demoGuideOpen) return null;

  const journeys = [
    {
      step: '01',
      title: 'CRM Lead Conversion to Reserved Stock',
      objective:
        'Convert a qualified lead into a formal booking, locking chassis allocation and shifting motorcycle status to Reserved.',
      target: 'Lead: Malith Fernando (Quoted for Himalayan 450)',
      actionText: 'Go to CRM Leads',
      onTrigger: () => {
        setCurrentView('crm');
        setSelectedLeadId('lead-002');
        setDemoGuideOpen(false);
      },
      instruction:
        'Notice Malith Fernando is in "Quoted" status. Click "Convert to Booking", select an available bike, and submit. The allocated motorcycle immediately shifts to "Reserved" in inventory.',
    },
    {
      step: '02',
      title: 'Payment Verification & Revenue Integrity',
      objective:
        'Demonstrate how unverified customer deposits do not distort financial metrics until verified by finance.',
      target: 'Booking: Arun Perera (BK-2026-0042)',
      actionText: 'Inspect Booking Payments',
      onTrigger: () => {
        setCurrentView('bookings');
        setSelectedBookingId('BK-2026-0042');
        setDemoGuideOpen(false);
      },
      instruction:
        'Open Arun Perera\'s booking. You will see a LKR 1,000,000 down payment marked "Pending Verification". Click "Verify Payment". Notice the Verified Collections on the Executive Dashboard increase instantly!',
    },
    {
      step: '03',
      title: 'Zero-Balance & PDI Delivery Gating',
      objective:
        'Enforce strict showroom handover rules: bike cannot be delivered until checklist is 100% complete and balance is LKR 0.',
      target: 'Booking: Dinuka Jayasuriya (BK-2026-0041)',
      actionText: 'Open Delivery Bay',
      onTrigger: () => {
        setCurrentView('delivery');
        setSelectedBookingId('BK-2026-0041');
        setDemoGuideOpen(false);
      },
      instruction:
        'Dinuka has fully settled his Hunter 350 (Balance LKR 0). Open his delivery checklist, verify PDI items, and click "Complete Official Delivery". The motorcycle status updates to "Delivered".',
    },
    {
      step: '04',
      title: 'HR Leave Approval & Executive Sync',
      objective:
        'Process pending staff leave and observe real-time reconciliation across HR rosters and the executive dashboard.',
      target: 'Leave: Kavinda De Silva (LV-2026-081)',
      actionText: 'Review HR Leave Requests',
      onTrigger: () => {
        setCurrentView('hr');
        setDemoGuideOpen(false);
      },
      instruction:
        'Click "Approve" on Kavinda\'s pending leave request. The pending leave count on the Executive Dashboard decrements immediately from 1 to 0.',
    },
    {
      step: '05',
      title: 'Audit Reconciliation & CSV Exports',
      objective:
        'Export real CSV files for leads, stock inventory, and bookings. Ensure numbers match dashboard totals down to the rupee.',
      target: 'Audit & Reports Screen',
      actionText: 'Go to Reports & CSV',
      onTrigger: () => {
        setCurrentView('reports');
        setDemoGuideOpen(false);
      },
      instruction:
        'Download any of the 3 CSV export files. Verify the totals reconcile exactly with the metrics in the Executive Overview.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-700 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Stakeholder Walkthrough & Demo Guide
              </h3>
              <p className="text-xs text-stone-400">
                Curated user journeys to evaluate ShowroomOS capabilities
              </p>
            </div>
          </div>
          <button
            onClick={() => setDemoGuideOpen(false)}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-[#21232a] border border-stone-800 rounded-lg p-3 text-xs text-stone-300 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-stone-200">
                Evaluation Notes for Stakeholders:
              </span>
              <p className="text-stone-400">
                This system runs entirely in-browser with synthetic seed data. Every button, status change, and payment verification alters live records and reconciles across modules instantly.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {journeys.map(j => (
              <div
                key={j.step}
                className="bg-[#1b1c21] border border-stone-800 rounded-lg p-4 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                      {j.step}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-100">{j.title}</h4>
                      <p className="text-xs text-stone-400 mt-0.5">{j.objective}</p>
                    </div>
                  </div>
                  <button
                    onClick={j.onTrigger}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded-md transition-colors whitespace-nowrap shadow-xs"
                  >
                    <span>{j.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-stone-400">
                  <div className="text-[11px] text-stone-300">
                    <span className="text-stone-400 font-medium">Demo Target: </span>
                    <span className="font-mono text-amber-300">{j.target}</span>
                  </div>
                  <div className="text-[11px] text-stone-400 leading-normal max-w-lg">
                    {j.instruction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-[#151619] flex items-center justify-between text-xs text-stone-400">
          <span>Proposal Demo · Ideal Motors Sri Lanka · Royal Enfield</span>
          <button
            onClick={() => setDemoGuideOpen(false)}
            className="px-4 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
