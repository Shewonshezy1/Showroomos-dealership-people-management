/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../../context/ShowroomContext';
import { formatLKR } from '../../utils/formatters';
import { BikeStatus, BikeLocation } from '../../types';
import {
  X,
  Compass,
  FileCheck2,
  MapPin,
  Calendar,
  Layers,
  Zap,
  Tag,
  Shield,
  ArrowRight,
} from 'lucide-react';

export const BikeDetailDrawer: React.FC<{
  onOpenBookingForBike: (bikeId: string) => void;
}> = ({ onOpenBookingForBike }) => {
  const {
    selectedBikeId,
    setSelectedBikeId,
    bikes,
    updateBike,
    setSelectedBookingId,
    setCurrentView,
  } = useShowroom();

  const [imgError, setImgError] = useState(false);

  if (!selectedBikeId) return null;
  const bike = bikes.find(b => b.id === selectedBikeId);
  if (!bike) return null;

  const isAvailable = bike.status === 'Available';

  const handleLocationChange = (loc: BikeLocation) => {
    updateBike(bike.id, { location: loc });
  };

  const locations: BikeLocation[] = [
    'Colombo Flagship Floor',
    'Warehouse A - Kelaniya',
    'Colombo 03 Transit',
    'Pre-Delivery Bay',
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#18191d] border-l border-stone-800 text-stone-200 w-full max-w-xl h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#151619]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-800 text-amber-400 flex items-center justify-center font-bold text-xs border border-stone-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Royal Enfield {bike.model}
                </h3>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    bike.status === 'Available'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : bike.status === 'Reserved'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : bike.status === 'Delivered'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  {bike.status}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {bike.variant} · Colour: {bike.colour}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedBikeId(null)}
            className="text-stone-400 hover:text-white p-1 rounded-md hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto text-xs">
          {/* Motorcycle Image Frame with Fallback */}
          <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-[#121316] aspect-4/3 flex items-center justify-center">
            {bike.imageUrl && !imgError ? (
              <img
                src={bike.imageUrl}
                alt={`${bike.model} - ${bike.colour}`}
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 space-y-2 text-stone-500">
                <Compass className="w-12 h-12 mx-auto text-stone-600 stroke-[1.5]" />
                <div className="font-semibold text-stone-300">
                  Royal Enfield {bike.model}
                </div>
                <div className="text-[11px] text-stone-400">{bike.colour} · {bike.variant}</div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] text-stone-200 font-mono border border-white/10">
              VIN: {bike.chassisNumber}
            </div>
          </div>

          {/* Price & Booking Callout */}
          <div className="bg-[#202228] p-4 rounded-lg border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                Illustrative Showroom Price
              </span>
              <span className="text-lg font-mono font-bold text-white block mt-0.5">
                {formatLKR(bike.priceLkr)}
              </span>
            </div>

            {isAvailable ? (
              <button
                onClick={() => {
                  onOpenBookingForBike(bike.id);
                  setSelectedBikeId(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white font-semibold rounded-md shadow-xs transition-colors"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Reserve / Create Booking</span>
              </button>
            ) : bike.allocatedBookingId ? (
              <button
                onClick={() => {
                  setSelectedBookingId(bike.allocatedBookingId!);
                  setCurrentView('bookings');
                  setSelectedBikeId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-md font-mono text-xs border border-stone-700 transition-colors"
              >
                <span>View Order {bike.allocatedBookingId}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-stone-400 text-xs italic">
                Status: {bike.status}
              </span>
            )}
          </div>

          {/* Technical Specifications */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1c1d22] p-3.5 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block border-b border-stone-800 pb-1">
                Engine & Drivetrain
              </span>
              <div>
                <span className="text-[11px] text-stone-400 block">Engine Number:</span>
                <span className="font-mono text-stone-200 font-semibold">
                  {bike.engineNumber}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Displacement:</span>
                <span className="text-stone-200">{bike.displacementCc} cc</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Power Output:</span>
                <span className="text-stone-200">{bike.powerBhp}</span>
              </div>
            </div>

            <div className="bg-[#1c1d22] p-3.5 rounded-lg border border-stone-800/90 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 block border-b border-stone-800 pb-1">
                Showroom Tracking
              </span>
              <div>
                <span className="text-[11px] text-stone-400 block">Model Year:</span>
                <span className="font-mono text-stone-200">{bike.year}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Stock Arrival Date:</span>
                <span className="font-mono text-stone-200">{bike.arrivalDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Chassis (VIN):</span>
                <span className="font-mono text-amber-300 font-medium">
                  {bike.chassisNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Showroom Location Editor */}
          <div className="bg-[#1c1d22] p-4 rounded-lg border border-stone-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-stone-400">
                Current Location
              </label>
              <span className="text-[10px] text-stone-400">Change location:</span>
            </div>
            <select
              value={bike.location}
              onChange={e => handleLocationChange(e.target.value as BikeLocation)}
              className="w-full bg-[#121316] border border-stone-700 rounded-md px-3 py-2 text-stone-100 text-xs focus:outline-hidden focus:border-stone-500"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#151619] flex items-center justify-between text-xs">
          <span className="text-stone-500 font-mono text-[11px]">
            Unit ID: {bike.id}
          </span>
          <button
            onClick={() => setSelectedBikeId(null)}
            className="px-4 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
