import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  CircleDollarSign,
  TrendingUp,
  Download,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

export default function Revenue() {
  const navigate = useNavigate();
  const [activeChartTab, setActiveChartTab] = useState('Day-wise');

  // Revenue Summary Cards data
  const summaryCards = [
    {
      title: "Today's Revenue",
      value: '₹12,500',
      icon: CircleDollarSign,
      color: 'text-rose-500 bg-rose-50',
      change: '12.5% vs yesterday',
      isPositive: true
    },
    {
      title: 'This Week',
      value: '₹86,400',
      icon: CircleDollarSign,
      color: 'text-indigo-500 bg-indigo-50',
      change: '15.3% vs last week',
      isPositive: true
    },
    {
      title: 'This Month',
      value: '₹3,24,800',
      icon: CircleDollarSign,
      color: 'text-amber-500 bg-amber-50',
      change: '18.8% vs last month',
      isPositive: true
    },
    {
      title: 'Total Revenue',
      value: '₹18,76,600',
      icon: CircleDollarSign,
      color: 'text-rose-500 bg-rose-50',
      change: 'Apr 2023 - May 2025',
      isPositive: null
    }
  ];

  // Daily Details table
  const dailyDetails = [
    { date: '20 May 2025', day: 'Tuesday', bookings: 6, revenue: '₹12,500', isBold: true },
    { date: '19 May 2025', day: 'Monday', bookings: 7, revenue: '₹14,680', isBold: false },
    { date: '18 May 2025', day: 'Sunday', bookings: 5, revenue: '₹13,420', isBold: false },
    { date: '17 May 2025', day: 'Saturday', bookings: 5, revenue: '₹11,750', isBold: false },
    { date: '16 May 2025', day: 'Friday', bookings: 4, revenue: '₹9,800', isBold: false },
    { date: '15 May 2025', day: 'Thursday', bookings: 6, revenue: '₹10,230', isBold: false },
    { date: '14 May 2025', day: 'Wednesday', bookings: 4, revenue: '₹8,450', isBold: false }
  ];

  // SVG Chart points
  const chartPoints = [
    { label: '14 May\nWed', value: 8450, x: 50, y: 140 },
    { label: '15 May\nThu', value: 10230, x: 120, y: 115 },
    { label: '16 May\nFri', value: 9800, x: 190, y: 121 },
    { label: '17 May\nSat', value: 11750, x: 260, y: 95 },
    { label: '18 May\nSun', value: 13420, x: 330, y: 72 },
    { label: '19 May\nMon', value: 14680, x: 400, y: 55 },
    { label: '20 May\nTue [Today]', value: 12500, x: 470, y: 85 }
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Revenue Report
          </h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Track and analyze your earnings across various timeframes.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting PDF revenue report...')}
          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
        >
          <Download size={13} className="stroke-[3]" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
            <div className={`w-11 h-11 rounded-2xl ${card.color} flex items-center justify-center text-lg shadow-sm`}>
              <card.icon size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {card.title}
              </span>
              <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5">
                {card.value}
              </span>
              {card.change && (
                <span className={`block text-[8px] font-bold mt-1 ${
                  card.isPositive === true ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {card.isPositive === true ? `↑ ${card.change}` : card.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Block */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Chart Header */}
        <div className="p-6 pb-0 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex w-full sm:w-auto">
            {['Day-wise', 'Weekly', 'Monthly', 'Yearly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChartTab(tab)}
                className={`pb-3.5 px-4.5 text-xs font-bold transition-all border-none bg-transparent cursor-pointer relative ${
                  activeChartTab === tab
                    ? 'text-rose-600 font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab}</span>
                {activeChartTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">
                Last 7 Days Revenue
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-black text-rose-600 tracking-tight leading-none">
                  ₹12,500
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Today's Revenue
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  ↑ 12.5% vs yesterday
                </span>
              </div>
            </div>

            <button className="px-4 py-2 border border-slate-205 bg-white hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
              <Calendar size={13} className="text-slate-400" />
              <span>14 May 2025 - 20 May 2025</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end">
            <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" viewBox="0 0 520 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="50" y1="20" x2="470" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="60" x2="470" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="100" x2="470" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="140" x2="470" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

              {/* Area path */}
              <path
                d="M 50 170 L 50 140 L 120 115 L 190 121 L 260 95 L 330 72 L 400 55 L 470 85 L 470 170 Z"
                fill="url(#revGrad)"
              />

              {/* Main Line path */}
              <path
                d="M 50 140 L 120 115 L 190 121 L 260 95 L 330 72 L 400 55 L 470 85"
                fill="none"
                stroke="#d31e1e"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {chartPoints.map((pt, index) => (
                <g key={index}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={index === chartPoints.length - 1 ? "5.5" : "4"}
                    fill="#white"
                    stroke="#d31e1e"
                    strokeWidth={index === chartPoints.length - 1 ? "3.5" : "2"}
                  />
                  {/* Values over points */}
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fill={index === chartPoints.length - 1 ? "#d31e1e" : "#64748b"}
                    className="font-black font-mono"
                    style={{ fontSize: '8px' }}
                  >
                    ₹{pt.value.toLocaleString()}
                  </text>
                </g>
              ))}
            </svg>

            {/* X Axis Labels */}
            <div className="absolute bottom-1.5 inset-x-0 px-5 flex justify-between text-[8px] font-black text-slate-400 text-center leading-tight">
              <span>14 May<br/>Wed</span>
              <span>15 May<br/>Thu</span>
              <span>16 May<br/>Fri</span>
              <span>17 May<br/>Sat</span>
              <span>18 May<br/>Sun</span>
              <span>19 May<br/>Mon</span>
              <span className="text-rose-600 font-extrabold">20 May<br/>Tue [Today]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Daily Revenue Details */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
        <div className="p-6 pb-0">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">
            Revenue Details (Day-wise)
          </h3>
        </div>

        <div className="overflow-x-auto px-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 px-4">Day</th>
                <th className="pb-3 px-4">Total Bookings</th>
                <th className="pb-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {dailyDetails.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">📅</span>
                      <span>{row.date}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={row.isBold ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                      {row.day}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-600">{row.bookings}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={row.isBold ? 'text-rose-600 font-extrabold' : 'font-mono'}>
                      {row.revenue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll link */}
        <div className="p-4 bg-slate-50/50 text-center">
          <button 
            onClick={() => alert('Loading older records...')}
            className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1 mx-auto bg-transparent border-none cursor-pointer hover:text-slate-800"
          >
            <span>▼ Scroll to view more</span>
          </button>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-6 gap-3">
        <div className="space-y-1 text-center sm:text-left">
          <span className="block text-slate-707 font-extrabold text-[11px]">WOW Gateways</span>
          <span>© 2024 WOW Gateways. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Privacy Policy</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Terms of Service</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
