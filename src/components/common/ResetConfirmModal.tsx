/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

export const ResetConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { resetDemoData } = useShowroom();

  if (!isOpen) return null;

  const handleConfirm = () => {
    resetDemoData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in duration-150">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Reset Demo Seed Data?
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                This will restore all CRM leads, stock allocations, payment verifications, and HR leave requests to their initial proposal demo state.
              </p>
            </div>
          </div>

          <div className="bg-stone-900/80 border border-stone-800 rounded-lg p-3 text-xs text-stone-400">
            <span className="font-semibold text-stone-300 block mb-0.5">
              Notice:
            </span>
            Any synthetic leads created or payments logged in this browser session will be reset.
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-stone-800 bg-[#141518] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded-md transition-colors shadow-xs"
          >
            Reset Seed Data
          </button>
        </div>
      </div>
    </div>
  );
};
