import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

export default function EmployeePerformanceTable({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-6 rounded-2xl h-[340px] animate-pulse flex flex-col justify-between">
        <div className="h-4 bg-slate-100 rounded w-44"></div>
        <div className="flex-1 mt-6 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-[360px]"
    >
      <div className="flex justify-between items-center mb-5">
        <h4 className="text-sm font-bold text-slate-800">
          Performance of Employees
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
              <th className="pb-3.5 font-bold">Employee</th>
              <th className="pb-3.5 font-bold text-center">Bookings</th>
              <th className="pb-3.5 font-bold text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((emp, index) => {
              const formattedRevenue = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
              }).format(emp.revenue);

              return (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-3.5 pr-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={emp.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-700 block group-hover:text-slate-900 transition-colors">
                          {emp.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 capitalize">
                          {emp.role}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center text-xs font-bold text-slate-600">
                    {emp.bookings}
                  </td>
                  <td className="py-3.5 text-right text-xs font-bold text-slate-800">
                    {formattedRevenue}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
