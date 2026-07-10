import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

export default function BookingsBarChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-6 rounded-2xl h-[360px] animate-pulse flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-100 rounded w-48"></div>
          <div className="h-8 bg-slate-100 rounded w-24"></div>
        </div>
        <div className="flex-1 mt-6 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-[380px]"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            Month-wise Bookings (This Year)
          </h4>
        </div>
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
          <Calendar size={13} className="text-slate-400" />
          <span>This Year</span>
        </div>
      </div>

      <div className="flex-1 w-full text-xs font-medium text-slate-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            barGap={0}
          >
            <defs>
              <linearGradient id="bookingBlueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10 }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              domain={[0, 300]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.4)', radius: 8 }}
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#1E293B',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}
              labelStyle={{ color: '#64748B', marginBottom: '4px' }}
              formatter={(value) => [`${value} bookings`, 'Total']}
            />
            <Bar 
              dataKey="bookings" 
              fill="url(#bookingBlueGradient)" 
              radius={[6, 6, 0, 0]} 
              barSize={24}
              label={{ 
                position: 'top', 
                fill: '#64748B', 
                fontSize: 9, 
                fontWeight: 'bold',
                offset: 6
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
