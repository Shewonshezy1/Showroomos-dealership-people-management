/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useShowroom } from '../context/ShowroomContext';
import { formatLKR } from '../utils/formatters';
import {
  Sparkles,
  Search,
  Filter,
  Plus,
  Package,
  Shield,
  Layers,
  Compass,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AttachAccessoryModal } from '../components/bookings/AttachAccessoryModal';
import { Accessory } from '../types';

export const AccessoriesView: React.FC = () => {
  const { accessories, metrics } = useShowroom();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [selectedAccessoryForAttach, setSelectedAccessoryForAttach] = useState<string | null>(null);

  const categories = [
    'All',
    'Performance & Protection',
    'Luggage & Touring',
    'Seats & Comfort',
    'Styling & Wheels',
    'Riding Apparel',
  ];

  const filteredAccessories = useMemo(() => {
    return accessories.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.compatibleModels.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [accessories, searchQuery, selectedCategory]);

  const totalStockUnits = useMemo(() => {
    return accessories.reduce((sum, a) => sum + a.stockQuantity, 0);
  }, [accessories]);

  const handleOpenAttach = (accessoryId?: string) => {
    setSelectedAccessoryForAttach(accessoryId || null);
    setAttachModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-red-950/50 text-red-400 border border-red-900/40">
              Motorcycle Accessories & Gear
            </span>
            <span className="text-xs text-stone-500">· Royal Enfield Parts & Apparel</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">
            Accessories & Riding Apparel Catalog
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Protective gear, luggage systems, seats, and touring accessories tracked in Firestore inventory.
          </p>
        </div>

        <button
          onClick={() => handleOpenAttach()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Attach to Booking
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18191d] border border-stone-800/80 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <Package className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Catalog Items
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {accessories.length}
            </div>
            <div className="text-[11px] text-stone-500">Active Catalog SKUs</div>
          </div>
        </div>

        <div className="bg-[#18191d] border border-stone-800/80 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Total Units In Stock
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {totalStockUnits}
            </div>
            <div className="text-[11px] text-emerald-400">Warehouse & Showroom Bay</div>
          </div>
        </div>

        <div className="bg-[#18191d] border border-stone-800/80 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-stone-800/80 text-stone-300">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
              Inventory Value
            </div>
            <div className="text-xl font-bold text-stone-100 font-mono tabular-nums">
              {formatLKR(metrics.totalAccessoriesStockValueLkr)}
            </div>
            <div className="text-[11px] text-stone-500">Retail Value (LKR)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191d] border border-stone-800/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
            <input
              type="text"
              placeholder="Search by accessory name, bike model, or keywords..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#111215] border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-red-700"
            />
          </div>

          <div className="text-xs text-stone-400 flex items-center gap-1.5 self-end md:self-auto">
            <span>Showing</span>
            <span className="font-semibold text-stone-200 font-mono tabular-nums">
              {filteredAccessories.length}
            </span>
            <span>of {accessories.length} products</span>
          </div>
        </div>

        {/* Category Segmented Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-stone-800/60 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-red-900/60 text-red-200 border border-red-700/60'
                  : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccessories.map(acc => {
          const isLowStock = acc.stockQuantity <= 3;
          const isOutOfStock = acc.stockQuantity === 0;

          return (
            <div
              key={acc.id}
              className="bg-[#18191d] border border-stone-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-stone-700 transition-colors shadow-xs group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                    {acc.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {isOutOfStock ? (
                      <span className="text-rose-400 flex items-center gap-1 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/40">
                        <AlertTriangle className="w-3 h-3" /> Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="text-amber-400 flex items-center gap-1 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40">
                        <AlertTriangle className="w-3 h-3" /> {acc.stockQuantity} left
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                        <CheckCircle2 className="w-3 h-3" /> {acc.stockQuantity} in stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-stone-100 group-hover:text-red-400 transition-colors mb-1">
                  {acc.name}
                </h3>
                <p className="text-xs text-stone-400 line-clamp-2 mb-3 leading-relaxed">
                  {acc.description}
                </p>

                {/* Compatibility Badges */}
                <div className="mb-4">
                  <div className="text-[10px] text-stone-500 uppercase font-mono mb-1">
                    Compatible Models:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {acc.compatibleModels.map(m => (
                      <span
                        key={m}
                        className="text-[10px] bg-stone-900/90 text-stone-300 px-1.5 py-0.5 rounded border border-stone-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-500 uppercase font-mono">Price (LKR)</div>
                  <div className="text-sm font-bold text-stone-100 font-mono tabular-nums">
                    {formatLKR(acc.priceLkr)}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleOpenAttach(acc.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-red-800 text-stone-200 hover:text-white border border-stone-700 hover:border-red-700 transition-colors disabled:opacity-40 disabled:hover:bg-stone-800 disabled:hover:text-stone-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Booking
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAccessories.length === 0 && (
        <div className="bg-[#18191d] border border-stone-800 rounded-xl p-12 text-center">
          <Package className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-stone-300">No accessories match your filter</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or switch category filter to "All".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-3 py-1.5 text-xs text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Attach Modal */}
      <AttachAccessoryModal
        isOpen={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        preSelectedAccessoryId={selectedAccessoryForAttach}
      />
    </div>
  );
};
