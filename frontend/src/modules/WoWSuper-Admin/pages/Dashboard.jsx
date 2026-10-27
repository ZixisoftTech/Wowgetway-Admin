import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Clock, 
  Building2, 
  BarChart3, 
  PieChart as PieIcon, 
  Trophy, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  RefreshCw,
  Building
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart, 
  Pie 
} from 'recharts';
import { useSuperAdminDashboard } from '../hooks/useDashboardData.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('October 2026');
  const [revenueRange, setRevenueRange] = useState('Last 6 Months');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [performanceRange, setPerformanceRange] = useState('This Month');

  // Query backend with selected period & range parameters for real-time live data
  const { data, isLoading, isFetching, refetch } = useSuperAdminDashboard({
    period: selectedPeriod,
    range: revenueRange
  });

  // Real data straight from database
  const summary = data?.summary || {
    totalHomestaysAndHotels: 0,
    homestaysGrowth: '0 Listed',
    totalOwners: 0,
    ownersGrowth: '0 Registered',
    expiringSoonCount: 0,
    activeSubscriptionsCount: 0,
    activeSubscriptionsGrowth: '0% active'
  };

  const rawRevenueData = data?.subscriptionRevenue?.months || [];
  const revenueData = rawRevenueData.length > 0 ? rawRevenueData : [
    { name: 'May', revenue: 0, formatted: '₹0' },
    { name: 'Jun', revenue: 0, formatted: '₹0' },
    { name: 'Jul', revenue: 0, formatted: '₹0' },
    { name: 'Aug', revenue: 0, formatted: '₹0' },
    { name: 'Sep', revenue: 0, formatted: '₹0' },
    { name: 'Oct', revenue: 0, formatted: '₹0', isCurrent: true }
  ];

  // Dynamic Y-axis scale calculated from real database numbers
  const maxRevenue = useMemo(() => {
    const vals = revenueData.map(d => Number(d.revenue) || 0);
    return Math.max(...vals, 1000);
  }, [revenueData]);

  const yDomainMax = useMemo(() => {
    if (maxRevenue <= 5000) return 6000;
    if (maxRevenue <= 15000) return 16000;
    if (maxRevenue <= 50000) return 60000;
    return Math.ceil((maxRevenue * 1.25) / 10000) * 10000;
  }, [maxRevenue]);

  const lastMonth = data?.subscriptionRevenue?.lastMonth || {
    label: 'Last Month',
    amount: '₹0',
    growthText: 'No revenue'
  };

  const thisMonth = data?.subscriptionRevenue?.thisMonth || {
    label: 'This Month',
    amount: '₹0',
    growthText: 'No revenue'
  };

  const thisYear = data?.subscriptionRevenue?.thisYear || {
    label: 'This Year (2026)',
    amount: '₹0',
    growthText: 'Total revenue in 2026'
  };

  const overviewSlices = data?.subscriptionOverview?.slices || [
    { name: 'Active', count: 0, percentage: 0, color: '#059669' },
    { name: 'Expiring Soon', count: 0, percentage: 0, color: '#F59E0B' },
    { name: 'Expired', count: 0, percentage: 0, color: '#EF4444' },
    { name: 'Not Subscribed', count: 0, percentage: 0, color: '#94A3B8' }
  ];

  // Real best performing properties from MongoDB bookings & properties
  const rawBestPerforming = data?.bestPerformingHomestays || [];
  const bestPerforming = rawBestPerforming;

  // Real expiring subscriptions from MongoDB homestayowners
  const expiringList = data?.subscriptionsExpiringSoon || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-7 pb-10"
    >
      {/* 1. Header with Welcome greeting & Month/Year selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
            <span>Welcome back!</span>
            <span className="text-2xl sm:text-3xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 m-0">
            Here's an overview of your homestay & hotel business.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-800 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D80032]/20 cursor-pointer transition-all"
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="All Time">All Time</option>
            </select>
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => refetch()}
            title="Refresh Live Data"
            className="p-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-600 rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-[#D80032]' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards in a row showing real-time database numbers) */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Homestays & Hotels */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/homestays')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
            <Home size={22} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">
              Total Homestays & Hotels
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : summary.totalHomestaysAndHotels}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                {summary.homestaysGrowth || '↑ Live'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block">
              in platform
            </span>
          </div>
        </motion.div>

        {/* Card 2: Total Owners */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/homestay-owners')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
            <Users size={22} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">
              Total Owners
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : summary.totalOwners}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                {summary.ownersGrowth || 'Registered'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block">
              verified accounts
            </span>
          </div>
        </motion.div>

        {/* Card 3: Subscriptions Expiring Soon */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/homestay-owners')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock size={22} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">
              Subscriptions Expiring Soon
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : summary.expiringSoonCount}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block">
              Within 30 days
            </span>
          </div>
        </motion.div>

        {/* Card 4: Active Subscriptions */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/homestay-owners')}
          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 size={22} className="stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 block truncate">
              Active Subscriptions
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : summary.activeSubscriptionsCount}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                {summary.activeSubscriptionsGrowth || 'Active'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 block truncate">
              of {summary.totalOwners} total owners
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Middle Section: Subscription Revenue & Subscription Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (lg:col-span-7): Subscription Revenue */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 m-0 leading-tight">
                    Subscription Revenue
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                    Monthly subscription revenue for your platform
                  </p>
                </div>
              </div>

              <div className="relative self-start sm:self-auto">
                <select
                  value={revenueRange}
                  onChange={(e) => setRevenueRange(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100/70 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="This Year (2026)">This Year (2026)</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Bar Chart Area */}
            <div className="h-64 sm:h-72 w-full pt-2 min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart
                  data={revenueData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
                  barSize={44}
                >
                  <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }}
                    tickFormatter={(val) => val === 0 ? '0' : `₹${Number(val).toLocaleString()}`}
                    domain={[0, yDomainMax]}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                    formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[6, 6, 0, 0]}
                    label={({ x, y, width, value }) => (
                      <text
                        x={x + width / 2}
                        y={y - 8}
                        fill="#1E293B"
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={800}
                      >
                        {Number(value) > 0 ? `₹${Number(value).toLocaleString()}` : ''}
                      </text>
                    )}
                  >
                    {revenueData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCurrent ? '#D80032' : '#FFB5BE'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom 3 Summary KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 mt-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block truncate">
                {lastMonth.label}
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-900 m-0 mt-0.5 tracking-tight">
                {lastMonth.amount}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 block mt-0.5 truncate">
                {lastMonth.growthText}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#D80032] block truncate">
                {thisMonth.label}
              </span>
              <p className="text-lg sm:text-xl font-black text-[#D80032] m-0 mt-0.5 tracking-tight">
                {thisMonth.amount}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 block mt-0.5 truncate">
                {thisMonth.growthText}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 block truncate">
                {thisYear.label}
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-900 m-0 mt-0.5 tracking-tight">
                {thisYear.amount}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 block mt-0.5 truncate">
                {thisYear.growthText}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Column (lg:col-span-5): Subscription Overview */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
                  <PieIcon size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900 m-0 leading-tight">
                  Subscription Overview
                </h3>
              </div>

              <div className="relative">
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100/70 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="All Plans">All Plans</option>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Donut Chart + Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              {/* Donut Container with Center Text */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center min-w-0 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={overviewSlices.filter(s => s.count > 0)}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={overviewSlices.filter(s => s.count > 0).length > 1 ? 3 : 0}
                      stroke="none"
                    >
                      {overviewSlices.filter(s => s.count > 0).map((entry, index) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val, name) => [`${val} owners`, name]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut Center Label showing actual real owners count */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-black text-slate-900 leading-tight">
                    {summary.totalOwners}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
                    Total Owners
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-3 pl-1 sm:pl-3">
                {overviewSlices.map((slice, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: slice.color }} 
                      />
                      <span className="font-bold text-slate-600 truncate">
                        {slice.name}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900 shrink-0">
                      {slice.count}{' '}
                      <span className="text-slate-400 font-semibold">({slice.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert Box at Bottom */}
          <div 
            onClick={() => navigate('/homestay-owners')}
            className="mt-6 p-3.5 bg-sky-50/70 hover:bg-sky-100/60 border border-sky-100 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Info size={16} className="text-sky-600 shrink-0" />
              <p className="text-xs text-sky-900 font-medium m-0 leading-tight truncate">
                {summary.expiringSoonCount > 0
                  ? `${summary.expiringSoonCount} subscription is expiring within 30 days. Renew on time to avoid service interruption.`
                  : 'All active subscriptions are currently up to date.'
                }
              </p>
            </div>
            <ChevronRight size={15} className="text-sky-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* 4. Bottom Section: Best Performing Homestays / Hotels & Subscriptions Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Best Performing Homestays / Hotels */}
        <motion.div
          variants={cardVariants}
          className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 m-0 leading-tight">
                    Best Performing Homestays / Hotels
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                    Real properties by total bookings ({performanceRange})
                  </p>
                </div>
              </div>

              <div className="relative self-start sm:self-auto">
                <select
                  value={performanceRange}
                  onChange={(e) => setPerformanceRange(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100/70 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="This Month">This Month</option>
                  <option value="This Year">This Year</option>
                  <option value="All Time">All Time</option>
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Homestay / Hotel Name</th>
                    <th className="py-2.5 px-3">Owner Name</th>
                    <th className="py-2.5 px-3 text-right">Total Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {bestPerforming.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 font-semibold">
                        No homestays found in database
                      </td>
                    </tr>
                  ) : (
                    bestPerforming.map((item, index) => (
                      <tr 
                        key={item.id || index}
                        onClick={() => navigate('/homestays')}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-slate-400 font-bold">
                          {item.rank || index + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 group-hover:text-[#D80032] transition-colors">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {item.ownerName}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {item.totalBookings}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Link */}
          <div className="pt-4 border-t border-slate-100 mt-3 flex justify-end">
            <button
              onClick={() => navigate('/homestays')}
              className="text-xs font-bold text-[#D80032] hover:text-[#B00028] flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent p-0"
            >
              <span>View All Homestays ({summary.totalHomestaysAndHotels})</span>
              <span className="text-sm">→</span>
            </button>
          </div>
        </motion.div>

        {/* Right Column: Subscriptions Expiring Soon */}
        <motion.div
          variants={cardVariants}
          className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900 m-0 leading-tight">
                  Subscriptions Expiring Soon
                </h3>
              </div>

              <button
                onClick={() => navigate('/homestay-owners')}
                className="px-3 py-1.5 text-xs font-bold text-[#D80032] hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Homestay / Hotel Name</th>
                    <th className="py-2.5 px-3">Owner Name</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-center">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {expiringList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 font-semibold">
                        No subscriptions expiring within 30 days
                      </td>
                    </tr>
                  ) : (
                    expiringList.map((item, index) => (
                      <tr 
                        key={item.id || index}
                        onClick={() => navigate('/homestay-owners')}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-slate-400 font-bold">
                          {item.rank || index + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 group-hover:text-[#D80032] transition-colors">
                          {item.homestayName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {item.ownerName}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">
                          {item.plan}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                          {item.expiryDate}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block bg-rose-50 text-[#D80032] font-black text-xs px-2.5 py-0.5 rounded-full border border-rose-100 min-w-7">
                            {item.daysLeft}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Spacer to align evenly with left card */}
          <div className="pt-4 border-t border-slate-100 mt-3 flex justify-end">
            <button
              onClick={() => navigate('/homestay-owners')}
              className="text-xs font-bold text-[#D80032] hover:text-[#B00028] flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent p-0"
            >
              <span>Manage Subscriptions ({summary.totalOwners} Owners)</span>
              <span className="text-sm">→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
