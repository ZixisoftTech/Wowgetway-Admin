import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

export default function IncomeLineChart({ 
  total = '12,45,000', 
  change = '15.6%', 
  data = [], 
  loading = false 
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-6 rounded-2xl h-[340px] animate-pulse flex flex-col justify-between">
        <div className="h-4 bg-slate-100 rounded w-32"></div>
        <div className="flex-1 mt-6 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  // Format currency into INR formatting
  const formattedTotal = typeof total === 'number' 
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(total)
    : `₹ ${total}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-[360px]"
    >
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">
            Income Overview
          </span>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {formattedTotal}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-bold text-emerald-600">↗ {change}</span>
            <span className="text-[11px] font-medium text-slate-400">vs last month</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
          <Calendar size={13} className="text-slate-400" />
          <span>This Month</span>
        </div>
      </div>

      {/* Area Spline Chart Canvas */}
      <div className="flex-1 w-full text-xs font-medium mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGreenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 9 }}
              tickFormatter={(val) => `₹${(val / 1000)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#1E293B',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}
              formatter={(value) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#incomeGreenGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
