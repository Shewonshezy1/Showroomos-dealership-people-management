/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { X, Send, CheckCircle2, MessageSquare, Smartphone, Copy, Check } from 'lucide-react';

export const NotificationSimulatorModal: React.FC = () => {
  const { notificationModal, closeNotificationModal } = useShowroom();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  if (!notificationModal || !notificationModal.isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(notificationModal.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      setSent(false);
      closeNotificationModal();
    }, 1500);
  };

  const isWhatsApp = notificationModal.channel === 'WhatsApp';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isWhatsApp ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-red-950/60 text-red-400 border border-red-800/50'}`}>
              {isWhatsApp ? <Smartphone className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                {notificationModal.title}
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                  {notificationModal.channel}
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Simulated Customer Dispatch · {notificationModal.purpose}
              </p>
            </div>
          </div>
          <button
            onClick={closeNotificationModal}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Recipient Details */}
          <div className="bg-stone-900/80 rounded-lg p-3 border border-stone-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-400">Recipient: </span>
              <span className="font-semibold text-stone-200">{notificationModal.recipientName}</span>
            </div>
            <div className="font-mono text-stone-300">
              {notificationModal.recipientPhone}
            </div>
          </div>

          {/* Simulated Mobile Bubble */}
          <div className="border border-stone-800 rounded-xl p-4 bg-[#0e0f12] relative">
            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{isWhatsApp ? 'WhatsApp Message Preview' : 'SMS Carrier Preview'}</span>
              <span>Today · Simulated Preview</span>
            </div>

            <div className={`p-3.5 rounded-lg text-xs leading-relaxed font-sans ${isWhatsApp ? 'bg-emerald-950/40 border border-emerald-800/30 text-emerald-100' : 'bg-stone-900 border border-stone-800 text-stone-200'}`}>
              <p className="whitespace-pre-line">{notificationModal.message}</p>
            </div>

            <div className="mt-2 text-[10px] text-stone-500 text-right">
              Delivered via Ideal Motors Showroom Gateway (Simulated)
            </div>
          </div>

          <p className="text-[11px] text-stone-500 italic">
            * This is an in-browser simulated customer dispatch preview. No actual telco SMS charges or WhatsApp API calls are triggered.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-900/40 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-md border border-stone-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeNotificationModal}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sent}
              onClick={handleSend}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md text-white shadow-sm transition-colors ${
                sent
                  ? 'bg-emerald-600'
                  : isWhatsApp
                  ? 'bg-emerald-700 hover:bg-emerald-600'
                  : 'bg-red-800 hover:bg-red-700'
              }`}
            >
              {sent ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Dispatched!
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Simulate Dispatch
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
