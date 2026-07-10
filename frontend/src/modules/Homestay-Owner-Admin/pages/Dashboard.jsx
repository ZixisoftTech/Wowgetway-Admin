import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BedDouble, 
  CheckCircle, 
  HelpCircle, 
  TrendingUp, 
  Plus, 
  Calendar, 
  RefreshCw, 
  Phone, 
  MessageSquare, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  LogIn,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const [activeTableTab, setActiveTableTab] = useState('Check-in Today');
  const [activeChartTab, setActiveChartTab] = useState('Weekly');

  // Summary Metrics data
  const metrics = [
    { 
      title: 'Total Rooms Available', 
      value: '24', 
      icon: BedDouble, 
      color: 'bg-rose-50 text-rose-500', 
      linkText: 'View Details',
      subtext: ''
    },
    { 
      title: "Today's Available Rooms", 
      value: '18', 
      icon: CheckCircle, 
      color: 'bg-emerald-50 text-emerald-500', 
      linkText: 'View Details',
      subtext: '75% Availability' 
    },
    { 
      title: 'Unoccupied Rooms', 
      value: '6', 
      icon: BedDouble, 
      color: 'bg-amber-50 text-amber-500', 
      linkText: 'View Details',
      subtext: '25% Vacancy' 
    },
    { 
      title: "Today's Revenue", 
      value: '₹12,500', 
      icon: TrendingUp, 
      color: 'bg-blue-50 text-blue-500', 
      linkText: 'View Details',
      subtext: '↑ 12.5%' 
    }
  ];

  // Table Guests list
  const guests = [
    {
      name: 'Rahul Sharma',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      room: '101',
      roomType: 'Deluxe Room',
      checkIn: '20 May 2025, 02:00 PM',
      checkOut: '23 May 2025, 11:00 AM',
      status: 'Checking In'
    },
    {
      name: 'Priya Singh',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      room: '203',
      roomType: 'Super Deluxe',
      checkIn: '20 May 2025, 01:30 PM',
      checkOut: '22 May 2025, 10:00 AM',
      status: 'Checking In'
    },
    {
      name: 'Amit Verma',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      room: '105',
      roomType: 'Deluxe Room',
      checkIn: '20 May 2025, 12:15 PM',
      checkOut: '24 May 2025, 11:00 AM',
      status: 'Checking In'
    }
  ];

  // Revenue chart data points
  // 14 May to Today
  const chartPoints = [
    { label: '14 May', value: 3450, x: 50, y: 150 },
    { label: '15 May', value: 4320, x: 120, y: 135 },
    { label: '16 May', value: 3200, x: 190, y: 155 },
    { label: '17 May', value: 5800, x: 260, y: 110 },
    { label: '18 May', value: 7200, x: 330, y: 85 },
    { label: '19 May', value: 9500, x: 400, y: 45 },
    { label: 'Today', value: 12500, x: 470, y: 10 }
  ];

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      {/* Top Greeting Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1">
            Good Morning, Keshav 👋
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              80% Profile Complete
            </span>
            <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>

        <button
          onClick={() => alert('Create Booking form will be integrated soon.')}
          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Create Booking</span>
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((card, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5.5 rounded-3xl shadow-sm space-y-4 relative">
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-2xl ${card.color} flex items-center justify-center text-lg shadow-sm`}>
                <card.icon size={18} className="stroke-[2.2]" />
              </div>
              <button className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1">
                ⋮
              </button>
            </div>
            
            <div className="space-y-1">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {card.title}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {card.value}
                </span>
                {card.subtext && (
                  <span className={`text-[10px] font-bold ${
                    card.subtext.includes('↑') ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {card.subtext}
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-slate-50 pt-3">
              <button 
                onClick={() => alert(`Navigating to details for ${card.title}`)}
                className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer hover:underline p-0"
              >
                <span>{card.linkText}</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Grid Row: Revenue Overview & Check-ins summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Revenue Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Revenue Overview
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Weekly trends based on booking volume
              </p>
            </div>

            {/* Selector capsule */}
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-150">
              {['Weekly', 'Monthly', 'Yearly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveChartTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border-none cursor-pointer ${
                    activeChartTab === tab
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Custom Line Chart matching client screenshot style */}
          <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end">
            <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" viewBox="0 0 520 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1="50" y1="10" x2="470" y2="10" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="50" x2="470" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="90" x2="470" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="130" x2="470" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

              {/* Area path */}
              <path
                d="M 50 170 L 50 150 L 120 135 L 190 155 L 260 110 L 330 85 L 400 45 L 470 10 L 470 170 Z"
                fill="url(#chartGrad)"
              />

              {/* Main Line path */}
              <path
                d="M 50 150 L 120 135 L 190 155 L 260 110 L 330 85 L 400 45 L 470 10"
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
                    r={index === chartPoints.length - 1 ? "5.5" : "4.5"}
                    fill="#white"
                    stroke="#d31e1e"
                    strokeWidth={index === chartPoints.length - 1 ? "3.5" : "2.5"}
                  />
                </g>
              ))}
            </svg>

            {/* Today Tooltip */}
            <div className="absolute top-[8%] right-[8%] bg-rose-600 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
              <span>₹12,500</span>
            </div>

            {/* X Axis Labels */}
            <div className="absolute bottom-1.5 inset-x-0 px-4 flex justify-between text-[9px] font-bold text-slate-400">
              {chartPoints.map((pt, i) => (
                <span key={i} className={pt.label === 'Today' ? 'text-rose-600 font-extrabold' : ''}>
                  {pt.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Cards: Today's Checkins & Checkouts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Today's Check-ins */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl shadow-sm">
                <LogIn size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Today's Check-ins
                </span>
                <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1.5">
                  06
                </span>
                <span className="block text-[8px] font-bold text-slate-400 mt-1">
                  Yesterday: 4
                </span>
              </div>
            </div>
            
            {/* Avatars Stack */}
            <div className="flex -space-x-2">
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <div className="w-6.5 h-6.5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                +4
              </div>
            </div>
          </div>

          {/* Today's Check-outs */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl shadow-sm">
                <LogOut size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Today's Check-outs
                </span>
                <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1.5">
                  06
                </span>
                <span className="block text-[8px] font-bold text-slate-400 mt-1">
                  Yesterday: 3
                </span>
              </div>
            </div>

            {/* Avatars Stack */}
            <div className="flex -space-x-2">
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <div className="w-6.5 h-6.5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                +4
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Check-in Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
        {/* Table Header Controls */}
        <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 w-full sm:w-auto">
            {['Check-in Today', 'Check-out Today', 'Yesterday', 'Tomorrow'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTableTab(tab)}
                className={`pb-3.5 px-4.5 text-xs font-bold transition-all border-none bg-transparent cursor-pointer relative ${
                  activeTableTab === tab
                    ? 'text-rose-600 font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab}</span>
                {activeTableTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"></span>
                )}
              </button>
            ))}
          </div>

          {/* Right Action controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
              <Calendar size={13} className="text-slate-400" />
              <span>Select a Custom Date</span>
            </button>
            <button className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center">
              <RefreshCw size={13} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-x-auto px-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Guest Name</th>
                <th className="pb-3 px-4">Contact</th>
                <th className="pb-3 px-4">Room</th>
                <th className="pb-3 px-4">Check-in Date</th>
                <th className="pb-3 px-4">Check-out Date</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {guests.map((guest, idx) => (
                <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={guest.avatar} 
                        alt={guest.name} 
                        className="w-7.5 h-7.5 rounded-full border border-slate-100 object-cover shadow-sm"
                      />
                      <span className="font-extrabold text-slate-800">{guest.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <button className="w-7 h-7 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-rose-100/50">
                        <Phone size={11} className="stroke-[2.5]" />
                      </button>
                      <button className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border-none cursor-pointer hover:bg-emerald-100/50">
                        <MessageSquare size={11} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="block font-black text-slate-800 leading-none">{guest.room}</span>
                      <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1 leading-none">
                        {guest.roomType}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{guest.checkIn}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{guest.checkOut}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-[9px] uppercase tracking-wider inline-block">
                      {guest.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => alert(`View details of ${guest.name}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer bg-white"
                    >
                      <Eye size={10} className="stroke-[2.5]" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View All Footer */}
        <div className="p-4.5 border-t border-slate-50 text-center">
          <button 
            onClick={() => alert('Viewing all check-ins...')}
            className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center justify-center gap-1 mx-auto bg-transparent border-none cursor-pointer hover:underline"
          >
            <span>View All Check-ins</span>
            <span>➔</span>
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
