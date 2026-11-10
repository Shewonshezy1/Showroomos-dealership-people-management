/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { BikeLocation, BikeStatus } from '../../types';
import {
  generateChassisNumber,
  generateEngineNumber,
  getTodayDDMMYYYY,
} from '../../utils/formatters';
import { X, Plus, AlertCircle, RefreshCw } from 'lucide-react';

export const NewBikeModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { addBike } = useShowroom();

  const [model, setModel] = useState('Classic 350');
  const [variant, setVariant] = useState('Halcyon Chrome Edition');
  const [colour, setColour] = useState('Halcyon Black');
  const [chassisNumber, setChassisNumber] = useState(generateChassisNumber());
  const [engineNumber, setEngineNumber] = useState(generateEngineNumber());
  const [location, setLocation] = useState<BikeLocation>('Colombo Flagship Floor');
  const [priceLkr, setPriceLkr] = useState(2450000);
  const [year, setYear] = useState(2026);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegenerateVin = () => {
    setChassisNumber(generateChassisNumber());
    setEngineNumber(generateEngineNumber());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !chassisNumber.trim()) {
      setError('Model and Chassis Number are required.');
      return;
    }

    addBike({
      model: model.trim(),
      variant: variant.trim() || 'Showroom Spec',
      colour: colour.trim() || 'Standard Black',
      chassisNumber: chassisNumber.trim(),
      engineNumber: engineNumber.trim(),
      year,
      location,
      priceLkr,
      status: 'Available',
      imageKey: 'classic350',
      imageUrl: '/src/assets/images/re_classic_350_1794340625407.jpg',
      arrivalDate: getTodayDDMMYYYY(),
      displacementCc: model.includes('650') ? 648 : model.includes('450') ? 452 : 349,
      powerBhp: model.includes('650') ? '47.0 bhp' : model.includes('450') ? '40.0 bhp' : '20.2 bhp',
    });

    onClose();
  };

  const models = [
    { name: 'Classic 350', defaultPrice: 2450000 },
    { name: 'Hunter 350', defaultPrice: 1890000 },
    { name: 'Himalayan 450', defaultPrice: 3450000 },
    { name: 'Continental GT 650', defaultPrice: 4650000 },
    { name: 'Bullet 350', defaultPrice: 2250000 },
    { name: 'Meteor 350', defaultPrice: 2550000 },
    { name: 'Super Meteor 650', defaultPrice: 4950000 },
  ];

  const handleModelChange = (selected: string) => {
    setModel(selected);
    const m = models.find(item => item.name === selected);
    if (m) setPriceLkr(m.defaultPrice);
  };

  const locations: BikeLocation[] = [
    'Colombo Flagship Floor',
    'Warehouse A - Kelaniya',
    'Colombo 03 Transit',
    'Pre-Delivery Bay',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#18191d] border border-stone-700 text-stone-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9b1c1c] text-white flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Add Stock Motorcycle to Inventory
              </h3>
              <p className="text-[11px] text-stone-400">
                Log new stock arrival for showroom allocation
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
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Model Line *</label>
              <select
                value={model}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              >
                {models.map(m => (
                  <option key={m.name} value={m.name}>
                    Royal Enfield {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Variant / Trim</label>
              <input
                type="text"
                value={variant}
                onChange={e => setVariant(e.target.value)}
                placeholder="e.g. Dual-Channel ABS Spoke"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Colour Scheme *</label>
              <input
                type="text"
                required
                value={colour}
                onChange={e => setColour(e.target.value)}
                placeholder="e.g. Halcyon Green, Dapper Ash"
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Illustrative Price (LKR) *</label>
              <input
                type="number"
                min={100000}
                step={10000}
                required
                value={priceLkr}
                onChange={e => setPriceLkr(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="bg-[#121316] p-3 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-stone-300 font-medium">Synthetic VIN & Engine Identifiers</span>
              <button
                type="button"
                onClick={handleRegenerateVin}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate Random</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-stone-400 block mb-0.5">Chassis Number (VIN)</label>
                <input
                  type="text"
                  required
                  value={chassisNumber}
                  onChange={e => setChassisNumber(e.target.value)}
                  className="w-full bg-[#18191d] border border-stone-700 rounded px-2.5 py-1.5 font-mono text-xs text-amber-300 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-0.5">Engine Number</label>
                <input
                  type="text"
                  required
                  value={engineNumber}
                  onChange={e => setEngineNumber(e.target.value)}
                  className="w-full bg-[#18191d] border border-stone-700 rounded px-2.5 py-1.5 font-mono text-xs text-stone-200 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Location</label>
              <select
                value={location}
                onChange={e => setLocation(e.target.value as BikeLocation)}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:outline-hidden focus:border-stone-500"
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-stone-400 mb-1 font-medium">Model Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 font-mono focus:outline-hidden focus:border-stone-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2.5">
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
              Add to Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
