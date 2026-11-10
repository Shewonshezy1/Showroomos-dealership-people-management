/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR, getTodayDDMMYYYY } from '../utils/formatters';
import { ServiceJobCard } from '../types';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  FileCheck2,
} from 'lucide-react';

export const ServiceView: React.FC = () => {
  const { serviceJobCards, updateServiceStatus, addServiceJobCard } = useShowroom();

  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+94 7');
  const [bikeModel, setBikeModel] = useState('Classic 350');
  const [chassisNumber, setChassisNumber] = useState('ME3U4S2C5...');
  const [serviceType, setServiceType] = useState<ServiceJobCard['serviceType']>('1st Free Service (500 km)');
  const [technicianName, setTechnicianName] = useState('Rohan Jayatillake (Master Tech)');
  const [bay, setBay] = useState('Bay 1 - PDI Bay');
  const [notes, setNotes] = useState('Routine inspection');
  const [estimatedCostLkr, setEstimatedCostLkr] = useState(15000);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    addServiceJobCard({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      bikeModel,
      chassisNumber: chassisNumber.trim(),
      serviceType,
      technicianName,
      bay,
      status: 'Scheduled',
      scheduledDate: getTodayDDMMYYYY(),
      notes: notes.trim(),
      estimatedCostLkr,
    });

    setModalOpen(false);
  };

  const statusList: ServiceJobCard['status'][] = [
    'Scheduled',
    'In Progress',
    'Inspection Completed',
    'Ready for Handover',
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              Service Operations & Technical Bay
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Royal Enfield Service Facility</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Workshop & Pre-Delivery Job Cards
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Track Pre-Delivery Inspections, free warranty services, and customer repair appointments.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white font-semibold text-xs rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Service Job Card</span>
        </button>
      </div>

      {/* Service Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {serviceJobCards.map(card => {
          return (
            <div
              key={card.id}
              className="bg-[#18191d] border border-stone-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {card.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      card.status === 'Ready for Handover'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : card.status === 'In Progress'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : card.status === 'Inspection Completed'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <h3 className="font-bold text-white text-sm">{card.customerName}</h3>
                  <div className="text-xs text-amber-400 font-medium">{card.bikeModel}</div>
                  <div className="font-mono text-[11px] text-stone-400">
                    VIN: {card.chassisNumber}
                  </div>
                </div>

                <div className="mt-3 p-2.5 bg-[#121316] rounded border border-stone-800 text-xs space-y-1">
                  <div className="flex justify-between text-stone-400">
                    <span>Service:</span>
                    <span className="text-stone-200 font-medium">{card.serviceType}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Assigned Bay:</span>
                    <span className="text-stone-300">{card.bay}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Lead Tech:</span>
                    <span className="text-stone-300">{card.technicianName}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 border-t border-stone-800/80 pt-1">
                    <span>Est. Cost:</span>
                    <span className="font-mono text-white font-semibold">
                      {card.estimatedCostLkr === 0 ? 'Complimentary PDI' : formatLKR(card.estimatedCostLkr)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 mt-2 italic leading-relaxed">
                  "{card.notes}"
                </p>
              </div>

              {/* Status progression buttons */}
              <div className="pt-3 border-t border-stone-800 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                  Update Workflow Status:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {statusList.map(st => (
                    <button
                      key={st}
                      onClick={() => updateServiceStatus(card.id, st)}
                      className={`py-1 px-1.5 rounded transition-colors text-center font-medium ${
                        card.status === st
                          ? 'bg-[#9b1c1c] text-white font-bold'
                          : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Job Card Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
              <h3 className="text-sm font-bold text-white">Create Service Job Card</h3>
              <button onClick={() => setModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-stone-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-400 mb-1">Motorcycle Model</label>
                  <input
                    type="text"
                    value={bikeModel}
                    onChange={e => setBikeModel(e.target.value)}
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Chassis / VIN</label>
                  <input
                    type="text"
                    value={chassisNumber}
                    onChange={e => setChassisNumber(e.target.value)}
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-stone-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Service Category</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value as ServiceJobCard['serviceType'])}
                  className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-stone-200"
                >
                  <option value="Pre-Delivery Inspection (PDI)">Pre-Delivery Inspection (PDI)</option>
                  <option value="1st Free Service (500 km)">1st Free Service (500 km)</option>
                  <option value="General Service & Oil">General Service & Oil</option>
                  <option value="Warranty Inspection">Warranty Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Workshop Notes / Symptoms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-stone-200"
                />
              </div>
              <div className="pt-2 border-t border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 text-stone-400 bg-stone-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-[#9b1c1c] rounded font-semibold"
                >
                  Open Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
