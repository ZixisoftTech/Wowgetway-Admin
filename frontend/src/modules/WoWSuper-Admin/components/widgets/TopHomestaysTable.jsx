import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

export default function TopHomestaysTable({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-6 rounded-2xl h-[340px] animate-pulse flex flex-col justify-between">
        <div className="h-4 bg-slate-100 rounded w-44"></div>
        <div className="flex-1 mt-6 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  // Color logic for occupancy rate badges
  const getOccupancyBadge = (rate) => {
    let styles = 'bg-emerald-50 text-emerald-700';
    if (rate < 60) {
      styles = 'bg-rose-50 text-rose-700';
    } else if (rate < 75) {
      styles = 'bg-amber-50 text-amber-700';
    }
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide ${styles}`}>
        {rate}%
      </span>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-[360px]"
    >
      <div className="flex justify-between items-center mb-5">
        <h4 className="text-sm font-bold text-slate-800">
          Top Homestay/Hotel By Booking
        </h4>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
          <Calendar size={13} className="text-slate-400" />
          <span>This Month</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">
              <th className="pb-3.5 font-bold">Homestay/Hotel</th>
              <th className="pb-3.5 font-bold text-center">Bookings</th>
              <th className="pb-3.5 font-bold text-right">Occupancy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4 pr-2 text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate max-w-[150px]">
                  {item.name}
                </td>
                <td className="py-4 text-center text-xs font-bold text-slate-600">
                  {item.bookings}
                </td>
                <td className="py-4 text-right">
                  {getOccupancyBadge(item.occupancyRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
