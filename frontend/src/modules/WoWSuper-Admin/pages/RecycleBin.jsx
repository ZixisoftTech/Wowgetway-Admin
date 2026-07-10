import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  SlidersHorizontal, 
  AlertTriangle, 
  Home, 
  CalendarClock, 
  Users, 
  CarFront 
} from 'lucide-react';

const initialDeletedItems = [
  { id: 'DEL-101', entity: 'Homestay', name: 'Sunny Hills Villa', deletedAt: '2026-06-12 11:24', deletedBy: 'Rahul Sharma', size: 'Property ID: 2901' },
  { id: 'DEL-102', entity: 'Booking', name: 'BKG-2875 Payout (Amit)', deletedAt: '2026-06-12 14:02', deletedBy: 'Rahul Sharma', size: 'Receipt Ledger' },
  { id: 'DEL-103', entity: 'Staff', name: 'Rohan Verma (Ops)', deletedAt: '2026-06-10 18:33', deletedBy: 'Super Admin', size: 'ID Card: 8841' },
  { id: 'DEL-104', entity: 'Rider', name: 'Kartik Aaryan (Driver)', deletedAt: '2026-06-08 09:12', deletedBy: 'Rahul Sharma', size: 'License: DL-20412' }
];

export default function RecycleBin() {
  const [deletedItems, setDeletedItems] = useState(initialDeletedItems);
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('All');

  const handleRestore = (id, name) => {
    setDeletedItems(prev => prev.filter(item => item.id !== id));
    alert(`"${name}" has been successfully restored to active operations.`);
  };

  const handlePurge = (id, name) => {
    if (confirm(`CAUTION: Are you sure you want to permanently delete "${name}"? This action is IRREVERSIBLE.`)) {
      setDeletedItems(prev => prev.filter(item => item.id !== id));
      alert(`"${name}" has been permanently purged from database backups.`);
    }
  };

  const handlePurgeAll = () => {
    if (confirm('CAUTION: Are you sure you want to permanently purge all items in the Recycle Bin? This action is IRREVERSIBLE.')) {
      setDeletedItems([]);
      alert('Recycle Bin has been completely cleared.');
    }
  };

  const filteredItems = deletedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.deletedBy.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = filterEntity === 'All' || item.entity === filterEntity;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-slate-900 text-white rounded-xl">
              <Trash2 size={22} />
            </span>
            Recycle Bin
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Review and restore recently deleted homestays, bookings record files, staff logs, and registered drivers.
          </p>
        </div>
        <button
          onClick={handlePurgeAll}
          disabled={deletedItems.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <AlertTriangle size={13} />
          Purge All Items
        </button>
      </div>

      {/* Warning Alert Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 font-semibold space-y-1 leading-relaxed">
        <span className="font-extrabold text-amber-900 block text-[9px] uppercase tracking-wider">⚠️ Retention Policy Notice:</span>
        Deleted entities are retained in temporary storage for a maximum of 30 days before being permanently purged by the database garbage collection service.
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted record name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-slate-350 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mt-0.5">
            <SlidersHorizontal size={11} />
            Category:
          </span>
          {['All', 'Homestay', 'Booking', 'Staff', 'Rider'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterEntity(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterEntity === cat
                  ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat === 'All' ? 'All Records' : `${cat}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Tables list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                <th className="py-4 px-6">Entity Type</th>
                <th className="py-4 px-6">Deleted Record Name</th>
                <th className="py-4 px-6">Parameters</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6">Deleted By</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <Trash2 size={36} className="text-slate-200" />
                      <span>The Recycle Bin is currently empty.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const Icon = item.entity === 'Homestay' ? Home : item.entity === 'Booking' ? CalendarClock : item.entity === 'Staff' ? Users : CarFront;
                  const iconBg = item.entity === 'Homestay' ? 'bg-green-50 text-green-600 border-green-100' : item.entity === 'Booking' ? 'bg-blue-50 text-blue-600 border-blue-100' : item.entity === 'Staff' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-teal-50 text-teal-600 border-teal-100';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[9px] font-extrabold uppercase border ${iconBg}`}>
                          <Icon size={11} className="stroke-[2.5]" />
                          {item.entity}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 block">{item.name}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500">
                        {item.size}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500">
                        {item.deletedAt}
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {item.deletedBy}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button
                            onClick={() => handleRestore(item.id, item.name)}
                            title="Restore active status"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => handlePurge(item.id, item.name)}
                            title="Purge permanently"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
