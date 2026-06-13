import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

export default function BookingOverviewPie({ data = [], total = 1248, loading = false }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-6 rounded-2xl h-[380px] animate-pulse flex flex-col justify-between">
        <div className="h-4 bg-slate-100 rounded w-36"></div>
        <div className="flex-1 mt-6 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  // Active shape rendering function for Sector highlight
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.08))' }}
        />
      </g>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-[380px]"
    >
      <h4 className="text-sm font-bold text-slate-800 mb-6">
        Booking Overview
      </h4>

      <div className="flex-1 flex flex-col sm:flex-row items-center gap-6 justify-center">
        {/* Doughnut Chart Canvas */}
        <div className="relative w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    style={{ 
                      transition: 'opacity 0.2s', 
                      opacity: activeIndex === -1 || activeIndex === index ? 1 : 0.65,
                      cursor: 'pointer'
                    }} 
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Centered Total Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-800 leading-none">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-3.5">
          {data.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between text-xs font-semibold text-slate-700 p-1 rounded-md transition-all duration-200 ${
                activeIndex === idx ? 'bg-slate-50 scale-[1.01]' : 'opacity-85'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(-1)}
            >
              <div className="flex items-center gap-2.5">
                <span 
                  className="w-3.5 h-3.5 rounded-md flex-shrink-0 transition-transform duration-200" 
                  style={{ 
                    backgroundColor: item.color,
                    transform: activeIndex === idx ? 'scale(1.15)' : 'scale(1)' 
                  }} 
                />
                <span className="text-slate-500">{item.name}</span>
              </div>
              <div className="text-slate-800 text-right">
                <span className="mr-1">{item.value.toLocaleString()}</span>
                <span className="text-slate-400 font-medium">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
