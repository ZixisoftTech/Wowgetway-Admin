import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  ChevronRight,
  Building2,
  MoreVertical,
  X,
  FileText,
  Receipt,
  CalendarCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTableTab, setActiveTableTab] = useState('Check-in Today');
  const [activeChartTab, setActiveChartTab] = useState('Weekly');
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');

  const [ownerName, setOwnerName] = useState('Host');
  const [properties, setProperties] = useState([]);
  
  // Dynamic KPIs
  const [kpis, setKpis] = useState({
    totalRooms: 0,
    availableToday: 0,
    unoccupiedToday: 0,
    occupancyRate: 100,
    vacancyRate: 0,
    todayRevenue: 0,
    todayRevenueRaw: 0,
    todayRevenueChange: '+0%',
    todayRevenuePositive: true,
    checkInsCount: 0,
    checkInsYesterday: 0,
    checkOutsCount: 0,
    checkOutsYesterday: 0
  });

  const [chartPoints, setChartPoints] = useState([]);
  const [checkInsToday, setCheckInsToday] = useState([]);
  const [checkOutsToday, setCheckOutsToday] = useState([]);
  const [yesterdayBookings, setYesterdayBookings] = useState([]);
  const [tomorrowBookings, setTomorrowBookings] = useState([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPropertyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/homestay-owner/dashboard?propertyId=${selectedPropertyId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        if (res.data.ownerName) setOwnerName(res.data.ownerName);
        if (res.data.properties) setProperties(res.data.properties);
        
        const m = res.data.metrics || {};
        const checkIns = res.data.checkInsToday || res.data.todayCheckIns || [];
        const checkOuts = res.data.checkOutsToday || res.data.todayCheckOuts || [];
        const yesterday = res.data.yesterdayBookings || [];
        const tomorrow = res.data.tomorrowBookings || [];

        const rawRev = typeof m.todayRevenueRaw === 'number' 
          ? m.todayRevenueRaw 
          : (typeof m.todayRevenue === 'number' ? m.todayRevenue : 0);

        setKpis({
          ...m,
          totalRooms: m.totalRooms ?? 0,
          availableToday: m.availableToday ?? m.todayAvailableRooms ?? 0,
          unoccupiedToday: m.unoccupiedToday ?? m.unoccupiedRooms ?? 0,
          occupancyRate: m.occupancyRate ?? m.availabilityPercent ?? 100,
          vacancyRate: m.vacancyRate ?? m.vacancyPercent ?? 0,
          todayRevenue: rawRev,
          todayRevenueRaw: rawRev,
          todayRevenueChange: m.todayRevenueChange || '+0% vs yesterday',
          todayRevenuePositive: m.todayRevenuePositive !== false,
          checkInsCount: m.checkInsCount ?? checkIns.length,
          checkOutsCount: m.checkOutsCount ?? checkOuts.length,
          checkInsYesterday: m.checkInsYesterday ?? 0,
          checkOutsYesterday: m.checkOutsYesterday ?? 0
        });

        if (res.data.chartPoints) setChartPoints(res.data.chartPoints);
        setCheckInsToday(checkIns);
        setCheckOutsToday(checkOuts);
        setYesterdayBookings(yesterday);
        setTomorrowBookings(tomorrow);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build SVG path strings from chartPoints
  const getSvgPaths = () => {
    if (!chartPoints || chartPoints.length === 0) {
      return { linePath: '', areaPath: '', validPoints: [] };
    }

    const count = chartPoints.length;
    const maxVal = Math.max(...chartPoints.map(p => Number(p.value) || 0), 1000);

    const validPoints = chartPoints.map((pt, idx) => {
      const x = (typeof pt.x === 'number' && !isNaN(pt.x)) ? pt.x : (count > 1 ? Math.round(50 + (idx / (count - 1)) * 420) : 260);
      const y = (typeof pt.y === 'number' && !isNaN(pt.y)) ? pt.y : Math.max(20, Math.min(150, Math.round(140 - ((Number(pt.value) || 0) / maxVal) * 110)));
      return { ...pt, x, y };
    });

    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];

    const linePath = validPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const areaPath = `M ${first.x} 170 L ${linePath.replace('M ', '')} L ${last.x} 170 Z`;

    return { linePath, areaPath, validPoints };
  };

  const { linePath, areaPath, validPoints = [] } = getSvgPaths();

  // Get active table data
  const getActiveGuestsList = () => {
    switch (activeTableTab) {
      case 'Check-in Today':
        return checkInsToday;
      case 'Check-out Today':
        return checkOutsToday;
      case 'Yesterday':
        return yesterdayBookings;
      case 'Tomorrow':
        return tomorrowBookings;
      default:
        return checkInsToday;
    }
  };

  const activeGuests = getActiveGuestsList();

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
      {/* Top Greeting Row & Bird's-Eye View Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>Good Morning, {ownerName}</span>
              <span>👋</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              80% PROFILE COMPLETE
            </span>
            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Bird's Eye View Property Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-2xl shadow-sm">
            <Building2 size={14} className="text-rose-700" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Properties (Bird's Eye View)</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/homestay-owner/bookings/create')}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Create Booking</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Rooms */}
        <div className="bg-white border border-slate-100 p-5.5 rounded-3xl shadow-sm space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg shadow-sm">
              <BedDouble size={18} className="stroke-[2.2]" />
            </div>
            <MoreVertical size={15} className="text-slate-300 hover:text-slate-500 cursor-pointer" />
          </div>
          
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Total Rooms Available
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {kpis.totalRooms}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3">
            <button 
              onClick={() => navigate('/homestay-owner/inventory')}
              className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer hover:underline p-0"
            >
              <span>View Details</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* Today's Available Rooms */}
        <div className="bg-white border border-slate-100 p-5.5 rounded-3xl shadow-sm space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg shadow-sm">
              <CheckCircle size={18} className="stroke-[2.2]" />
            </div>
            <MoreVertical size={15} className="text-slate-300 hover:text-slate-500 cursor-pointer" />
          </div>
          
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Today's Available Rooms
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {kpis.availableToday ?? kpis.todayAvailableRooms ?? 0}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">
                {kpis.occupancyRate ?? kpis.availabilityPercent ?? 100}% Availability
              </span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3">
            <button 
              onClick={() => navigate('/homestay-owner/availability')}
              className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer hover:underline p-0"
            >
              <span>View Details</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* Unoccupied Rooms */}
        <div className="bg-white border border-slate-100 p-5.5 rounded-3xl shadow-sm space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shadow-sm">
              <BedDouble size={18} className="stroke-[2.2]" />
            </div>
            <MoreVertical size={15} className="text-slate-300 hover:text-slate-500 cursor-pointer" />
          </div>
          
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Unoccupied Rooms
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {kpis.unoccupiedToday ?? kpis.unoccupiedRooms ?? 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {kpis.vacancyRate ?? kpis.vacancyPercent ?? 0}% Vacancy
              </span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3">
            <button 
              onClick={() => navigate('/homestay-owner/availability')}
              className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer hover:underline p-0"
            >
              <span>View Details</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white border border-slate-100 p-5.5 rounded-3xl shadow-sm space-y-4 relative">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg shadow-sm">
              <TrendingUp size={18} className="stroke-[2.2]" />
            </div>
            <MoreVertical size={15} className="text-slate-300 hover:text-slate-500 cursor-pointer" />
          </div>
          
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Today's Revenue
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">
                ₹{Number(kpis.todayRevenueRaw ?? (typeof kpis.todayRevenue === 'number' ? kpis.todayRevenue : 0)).toLocaleString()}
              </span>
              <span className={`text-[10px] font-bold ${kpis.todayRevenuePositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {kpis.todayRevenueChange}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3">
            <button 
              onClick={() => navigate('/homestay-owner/revenue')}
              className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer hover:underline p-0"
            >
              <span>View Details</span>
              <span>➔</span>
            </button>
          </div>
        </div>
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
          <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end bg-slate-50/20">
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
              {areaPath && (
                <path d={areaPath} fill="url(#chartGrad)" />
              )}

              {/* Main Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#d31e1e"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {validPoints.map((pt, index) => (
                <g key={index}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={index === validPoints.length - 1 ? "5.5" : "4.5"}
                    fill="#ffffff"
                    stroke="#d31e1e"
                    strokeWidth={index === validPoints.length - 1 ? "3.5" : "2.5"}
                  />
                </g>
              ))}
            </svg>

            {/* Today Tooltip */}
            <div className="absolute top-[8%] right-[8%] bg-rose-600 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md flex items-center gap-1 font-mono">
              <span>₹{Number(kpis.todayRevenueRaw ?? (typeof kpis.todayRevenue === 'number' ? kpis.todayRevenue : 0)).toLocaleString()}</span>
            </div>

            {/* X Axis Labels */}
            <div className="absolute bottom-1.5 inset-x-0 px-4 flex justify-between text-[9px] font-bold text-slate-400">
              {validPoints.map((pt, i) => (
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
                <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  {String(kpis.checkInsCount ?? checkInsToday.length ?? 0).padStart(2, '0')}
                </span>
                <span className="block text-[8px] font-bold text-slate-400 mt-1">
                  Yesterday: {kpis.checkInsYesterday ?? 0}
                </span>
              </div>
            </div>
            
            {/* Avatars Stack */}
            <div className="flex -space-x-2">
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <div className="w-6.5 h-6.5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                +{Math.max(0, (kpis.checkInsCount ?? checkInsToday.length ?? 0) - 2)}
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
                <span className="block text-2xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  {String(kpis.checkOutsCount ?? checkOutsToday.length ?? 0).padStart(2, '0')}
                </span>
                <span className="block text-[8px] font-bold text-slate-400 mt-1">
                  Yesterday: {kpis.checkOutsYesterday ?? 0}
                </span>
              </div>
            </div>

            {/* Avatars Stack */}
            <div className="flex -space-x-2">
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <img className="w-6.5 h-6.5 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              <div className="w-6.5 h-6.5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                +{Math.max(0, (kpis.checkOutsCount ?? checkOutsToday.length ?? 0) - 2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Dynamic Check-in / Check-out Table */}
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
            <button 
              onClick={() => fetchDashboardData()}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center"
              title="Refresh Dashboard"
            >
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
                <th className="pb-3 px-4">Room & Property</th>
                <th className="pb-3 px-4">Check-in Date</th>
                <th className="pb-3 px-4">Check-out Date</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {activeGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">
                    No reservations found for {activeTableTab.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                activeGuests.map((guest, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={guest.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                          alt={guest.name} 
                          className="w-7.5 h-7.5 rounded-full border border-slate-100 object-cover shadow-sm"
                        />
                        <button
                          onClick={() => navigate(`/homestay-owner/guests/${guest.dbId || guest.id}`)}
                          className="font-extrabold text-slate-800 hover:text-rose-700 bg-transparent border-none cursor-pointer p-0 text-left"
                        >
                          {guest.name}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {guest.phone && (
                          <>
                            <a 
                              href={`tel:${guest.phone}`}
                              className="w-7 h-7 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-100/50 transition-colors"
                              title="Call Guest"
                            >
                              <Phone size={11} className="stroke-[2.5]" />
                            </a>
                            <a 
                              href={`https://wa.me/${guest.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center hover:bg-emerald-100/50 transition-colors"
                              title="WhatsApp Guest"
                            >
                              <MessageSquare size={11} className="stroke-[2.5]" />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="block font-black text-slate-800 leading-none">{guest.room}</span>
                        <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1 leading-none">
                          {guest.propertyName || guest.roomType}
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
                        onClick={() => setSelectedBookingModal(guest)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer bg-white shadow-xs"
                      >
                        <Eye size={11} className="stroke-[2.5]" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View All Footer */}
        <div className="p-4.5 border-t border-slate-50 text-center">
          <button 
            onClick={() => navigate('/homestay-owner/bookings/manage')}
            className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center justify-center gap-1 mx-auto bg-transparent border-none cursor-pointer hover:underline"
          >
            <span>VIEW ALL BOOKINGS & SCHEDULE</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                  Reservation Summary
                </span>
                <h2 className="text-base font-black text-slate-800 tracking-tight mt-0.5">
                  {selectedBookingModal.bookingId || selectedBookingModal.id || 'Booking Details'}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedBookingModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Guest Header Info */}
            <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <img 
                src={selectedBookingModal.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                alt="" 
                className="w-12 h-12 rounded-2xl object-cover border border-white shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-800 truncate">{selectedBookingModal.name}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold">
                  <span>{selectedBookingModal.phone || 'No phone'}</span>
                  {selectedBookingModal.email && <span>• {selectedBookingModal.email}</span>}
                </div>
              </div>

              {/* Direct Contact Icons */}
              {selectedBookingModal.phone && (
                <div className="flex items-center gap-1.5">
                  <a 
                    href={`tel:${selectedBookingModal.phone}`}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-rose-600 flex items-center justify-center hover:bg-rose-50 transition-colors"
                    title="Call Guest"
                  >
                    <Phone size={13} className="stroke-[2.5]" />
                  </a>
                  <a 
                    href={`https://wa.me/${selectedBookingModal.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 transition-colors"
                    title="WhatsApp Guest"
                  >
                    <MessageSquare size={13} className="stroke-[2.5]" />
                  </a>
                </div>
              )}
            </div>

            {/* Stay & Room Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Property & Room</span>
                <span className="font-bold text-slate-800 block mt-1">{selectedBookingModal.propertyName || 'Homestay'}</span>
                <span className="text-[11px] font-extrabold text-rose-600 block mt-0.5">{selectedBookingModal.room || selectedBookingModal.roomNumber || selectedBookingModal.roomType || 'Standard Room'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Stay Duration</span>
                <span className="font-bold text-slate-800 block mt-1 font-mono text-[11px]">In: {selectedBookingModal.checkIn}</span>
                <span className="font-bold text-slate-800 block mt-0.5 font-mono text-[11px]">Out: {selectedBookingModal.checkOut}</span>
              </div>
            </div>

            {/* Financial & Status Summary */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Booking Status</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 font-extrabold rounded-lg text-[10px] uppercase">
                  {selectedBookingModal.status || 'Confirmed'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Payment Status</span>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 font-extrabold rounded-lg text-[10px] uppercase">
                  {selectedBookingModal.paymentStatus || 'Paid / Active'}
                </span>
              </div>
              {selectedBookingModal.totalAmount != null && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-800 font-black">Total Bill</span>
                  <span className="text-sm font-black font-mono text-slate-800">
                    ₹{Number(selectedBookingModal.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const id = selectedBookingModal.dbId || selectedBookingModal.id;
                    setSelectedBookingModal(null);
                    navigate(`/homestay-owner/bookings/confirmation-slip/${id}`);
                  }}
                  className="py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt size={13} />
                  <span>Confirmation Slip</span>
                </button>
                <button
                  onClick={() => {
                    const id = selectedBookingModal.dbId || selectedBookingModal.id;
                    setSelectedBookingModal(null);
                    navigate(`/homestay-owner/bookings/invoice/${id}`);
                  }}
                  className="py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText size={13} />
                  <span>Tax Invoice</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedBookingModal(null);
                  navigate('/homestay-owner/bookings/manage');
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-colors"
              >
                <CalendarCheck size={15} />
                <span>Manage in Bookings Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

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


