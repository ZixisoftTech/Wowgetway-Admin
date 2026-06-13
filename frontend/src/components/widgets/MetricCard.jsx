import React from 'react';
import { motion } from 'framer-motion';

export default function MetricCard({
  title,
  value,
  subtext,
  icon: IconComponent,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  bgColor = 'bg-white', // Support custom colorful pastel backgrounds
  illustration: IllustrationComponent,
  trendText,
  trendDirection, // 'up' | 'down' | 'status-green' | 'status-red' | null
  loading = false
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 p-5 rounded-2xl animate-pulse flex flex-col justify-between h-32">
        <div className="flex justify-between items-start">
          <div className="h-4 bg-slate-100 rounded w-24"></div>
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
        </div>
        <div>
          <div className="h-8 bg-slate-100 rounded w-16 mb-2"></div>
          <div className="h-3 bg-slate-100 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Determine trend text color and prefix indicator
  let trendElement = null;
  if (trendDirection === 'up') {
    trendElement = (
      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
        ↗ {trendText}
      </span>
    );
  } else if (trendDirection === 'down') {
    trendElement = (
      <span className="text-[11px] font-bold text-red-650 flex items-center gap-0.5">
        ↘ {trendText}
      </span>
    );
  } else if (trendDirection === 'status-green') {
    trendElement = (
      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
        {trendText}
      </span>
    );
  } else if (trendDirection === 'status-red') {
    trendElement = (
      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm" />
        {trendText}
      </span>
    );
  }

  // Motion animation presets. Parent dashboard triggers "show" state.
  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  // Layout with illustration
  if (IllustrationComponent) {
    return (
      <motion.div 
        variants={cardVariants}
        whileHover={{ y: -3, shadow: '0 8px 20px -6px rgba(0, 0, 0, 0.04)' }}
        whileTap={{ scale: 0.99 }}
        className={`${bgColor} border border-slate-100/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[128px] group cursor-pointer`}
      >
        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-4 mt-2">
          <IllustrationComponent />
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              {value}
            </h3>
            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
              {subtext}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default Layout with icon
  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ y: -3, shadow: '0 8px 20px -6px rgba(0, 0, 0, 0.04)' }}
      whileTap={{ scale: 0.99 }}
      className={`${bgColor} border border-slate-100/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[128px] group cursor-pointer`}
    >
      <div className="flex justify-between items-start gap-3">
        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
          {title}
        </span>
        {IconComponent && (
          <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconColor} transition-transform duration-300 group-hover:scale-105 shadow-sm`}>
            <IconComponent size={16} className="stroke-[2.2]" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          {value}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          {trendElement}
          <span className="text-[11px] font-semibold text-slate-400">
            {subtext}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
