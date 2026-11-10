/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import { BikeStatus } from '../types';
import {
  Compass,
  Search,
  Plus,
  FileCheck2,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
} from 'lucide-react';

export const InventoryView: React.FC<{
  onOpenNewBike: () => void;
  onOpenBookingForBike: (bikeId: string) => void;
}> = ({ onOpenNewBike, onOpenBookingForBike }) => {
  const { bikes, setSelectedBikeId } = useShowroom();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredBikes = bikes.filter(b => {
    const matchesSearch =
      b.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.chassisNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.engineNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.colour.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchesModel = modelFilter === 'All' || b.model.includes(modelFilter);

    return matchesSearch && matchesStatus && matchesModel;
  });

  const statuses = ['All', 'Available', 'Reserved', 'Demo', 'Delivered'];
  const models = [
    'All',
    'Classic 350',
    'Hunter 350',
    'Himalayan 450',
    'Continental GT 650',
    'Bullet 350',
    'Meteor 350',
    'Super Meteor 650',
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18191d] border border-stone-800 p-5 rounded-xl text-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400">
              Motorcycle Asset Management
            </span>
            <span className="text-stone-600">·</span>
            <span className="text-xs text-stone-400">Chassis & VIN Tracking</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
            Showroom Motorcycle Inventory
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Individual motorcycle records with synthetic unique chassis & engine numbers. Only Available units can be reserved.
          </p>
        </div>

        <button
          onClick={onOpenNewBike}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#9b1c1c] hover:bg-[#b91c1c] text-white font-semibold text-xs rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock Motorcycle</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191d] border border-stone-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by VIN, chassis, engine #, model, or colour..."
              className="w-full bg-[#121316] border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-stone-500"
            />
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium whitespace-nowrap">Model:</span>
          <select
            value={modelFilter}
            onChange={e => setModelFilter(e.target.value)}
            className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-hidden focus:border-stone-500"
          >
            {models.map(m => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Models' : m}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-[#121316] rounded-lg border border-stone-800">
          {statuses.map(st => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#9b1c1c] text-white shadow-xs font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Grid / Table View Switcher */}
        <div className="flex items-center gap-1 bg-[#121316] p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBikes.map(bike => {
            const isAvailable = bike.status === 'Available';

            return (
              <div
                key={bike.id}
                onClick={() => setSelectedBikeId(bike.id)}
                className="bg-[#18191d] border border-stone-800 hover:border-stone-700 rounded-xl overflow-hidden shadow-sm flex flex-col cursor-pointer group transition-all"
              >
                {/* Photo Header */}
                <div className="relative aspect-4/3 bg-[#121316] overflow-hidden">
                  {bike.imageUrl ? (
                    <img
                      src={bike.imageUrl}
                      alt={bike.model}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-600">
                      <Compass className="w-10 h-10" />
                    </div>
                  )}

                  {/* Status Tag Overlay */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-xs ${
                        bike.status === 'Available'
                          ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
                          : bike.status === 'Reserved'
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-800'
                          : bike.status === 'Delivered'
                          ? 'bg-blue-950/90 text-blue-300 border border-blue-800'
                          : 'bg-stone-900/90 text-stone-300 border border-stone-700'
                      }`}
                    >
                      {bike.status}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-stone-300 font-mono">
                    {bike.location}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                      {bike.model}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">{bike.colour}</p>
                    <p className="text-[11px] text-stone-500">{bike.variant}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                    <div className="flex justify-between text-stone-400">
                      <span>VIN / Chassis:</span>
                      <span className="text-stone-200 font-medium truncate max-w-[150px]">
                        {bike.chassisNumber}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Engine:</span>
                      <span className="text-stone-300">{bike.engineNumber}</span>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-stone-500 block">
                        Illustrative Price
                      </span>
                      <span className="font-mono font-bold text-sm text-white">
                        {formatLKR(bike.priceLkr)}
                      </span>
                    </div>

                    {isAvailable ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenBookingForBike(bike.id);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded transition-colors shadow-xs"
                      >
                        Reserve
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-500 font-mono">
                        {bike.allocatedBookingId ? bike.allocatedBookingId : bike.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#18191d] border border-stone-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#141518] border-b border-stone-800 text-[10px] uppercase text-stone-400 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Model & Colour</th>
                  <th className="py-3 px-4">Chassis / VIN</th>
                  <th className="py-3 px-4">Engine Number</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Illustrative Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {filteredBikes.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => setSelectedBikeId(b.id)}
                    className="hover:bg-stone-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">
                        Royal Enfield {b.model}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {b.colour} · {b.variant}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300 font-medium">
                      {b.chassisNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-300">{b.engineNumber}</td>
                    <td className="py-3 px-4 text-stone-300">{b.location}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {formatLKR(b.priceLkr)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          b.status === 'Available'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : b.status === 'Reserved'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : b.status === 'Delivered'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      {b.status === 'Available' ? (
                        <button
                          onClick={() => onOpenBookingForBike(b.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-[#9b1c1c] hover:bg-[#b91c1c] rounded shadow-xs"
                        >
                          Book Unit
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedBikeId(b.id)}
                          className="text-stone-400 hover:text-white text-xs"
                        >
                          Details →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
