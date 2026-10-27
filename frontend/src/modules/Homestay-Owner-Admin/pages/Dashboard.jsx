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
  ExternalLink,
  Filter,
  ChevronDown
} from 'lucide-react';
import FullBookingDetailsModal from '../components/FullBookingDetailsModal.jsx';

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
  const [activeChartTab, setActiveChartTab] = useState('Day-wise'); // 'Day-wise' | 'Weekly' | 'Monthly' | 'Yearly'
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');

  // Month & Year & Day selectors
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear()); // 2026
  const [selectedDay, setSelectedDay] = useState('all'); // 'all' or 1..31
  const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' or 1..4
  const [revenueTimeframe, setRevenueTimeframe] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const monthsList = [
    { value: 1, name: 'January', short: 'Jan' },
    { value: 2, name: 'February', short: 'Feb' },
    { value: 3, name: 'March', short: 'Mar' },
    { value: 4, name: 'April', short: 'Apr' },
    { value: 5, name: 'May', short: 'May' },
    { value: 6, name: 'June', short: 'Jun' },
    { value: 7, name: 'July', short: 'Jul' },
    { value: 8, name: 'August', short: 'Aug' },
    { value: 9, name: 'September', short: 'Sep' },
    { value: 10, name: 'October', short: 'Oct' },
    { value: 11, name: 'November', short: 'Nov' },
    { value: 12, name: 'December', short: 'Dec' }
  ];

  const currentYear = now.getFullYear();
  const yearsList = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysList = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

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
  const [allBookings, setAllBookings] = useState([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);

  // Change 2: Dashboard Date Filters State
  const [filterStatus, setFilterStatus] = useState('Check-in'); // 'Check-in' | 'Check-out'
  const [filterDatePreset, setFilterDatePreset] = useState('Today'); // 'Today' | 'Yesterday' | 'Tomorrow' | 'Custom Date'
  const [customDateValue, setCustomDateValue] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedFilter, setAppliedFilter] = useState({
    status: 'Check-in',
    datePreset: 'Today',
    customDate: new Date().toISOString().split('T')[0]
  });

  const handleApplyFilter = () => {
    setAppliedFilter({
      status: filterStatus,
      datePreset: filterDatePreset,
      customDate: customDateValue
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPropertyId, activeChartTab, selectedMonth, selectedYear, selectedDay, selectedWeek]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        propertyId: selectedPropertyId,
        timeframe: activeChartTab,
        year: String(selectedYear),
        month: String(selectedMonth),
        day: String(selectedDay),
        week: String(selectedWeek)
      });
      const res = await axios.get(getApiUrl(`/api/homestay-owner/dashboard?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        if (res.data.ownerName) setOwnerName(res.data.ownerName);
        if (res.data.properties) setProperties(res.data.properties);
        if (res.data.revenueTimeframe) setRevenueTimeframe(res.data.revenueTimeframe);
        
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
        if (Array.isArray(res.data.allBookings)) {
          setAllBookings(res.data.allBookings);
        } else {
          setAllBookings([...checkIns, ...checkOuts, ...yesterday, ...tomorrow]);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build SVG path strings from chartPoints (Smooth Bezier Spline)
  const getSvgPaths = () => {
    if (!chartPoints || chartPoints.length === 0) {
      return { linePath: '', areaPath: '', validPoints: [] };
    }

    const count = chartPoints.length;
    const maxVal = revenueTimeframe?.niceMax || Math.max(...chartPoints.map(p => Number(p.value) || 0), 1000);

    const validPoints = chartPoints.map((pt, idx) => {
      const x = (typeof pt.x === 'number' && !isNaN(pt.x)) ? pt.x : (count > 1 ? Math.round(50 + (idx / (count - 1)) * 430) : 260);
      const y = (typeof pt.y === 'number' && !isNaN(pt.y)) ? pt.y : Math.max(20, Math.min(145, Math.round(145 - ((Number(pt.value) || 0) / maxVal) * 120)));
      return { ...pt, x, y };
    });

    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];

    if (validPoints.length === 1) {
      return { linePath: `M ${first.x} ${first.y}`, areaPath: '', validPoints };
    }

    let linePath = `M ${first.x} ${first.y}`;
    for (let i = 0; i < validPoints.length - 1; i++) {
      const p0 = validPoints[i === 0 ? 0 : i - 1];
      const p1 = validPoints[i];
      const p2 = validPoints[i + 1];
      const p3 = validPoints[i + 2 < validPoints.length ? i + 2 : i + 1];

      const cp1x = Math.round(p1.x + (p2.x - p0.x) / 6);
      const cp1y = Math.round(p1.y + (p2.y - p0.y) / 6);
      const cp2x = Math.round(p2.x - (p3.x - p1.x) / 6);
      const cp2y = Math.round(p2.y - (p3.y - p1.y) / 6);

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const areaPath = `${linePath} L ${last.x} 150 L ${first.x} 150 Z`;

    return { linePath, areaPath, validPoints };
  };

  const { linePath, areaPath, validPoints = [] } = getSvgPaths();

  // Date helper formatting YYYY-MM-DD
  const toDateStr = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Change 2: Get active table data matching applied filter
  const getActiveGuestsList = () => {
    const { status, datePreset, customDate } = appliedFilter;
    const now = new Date();
    let targetDateStr = '';

    if (datePreset === 'Today') {
      targetDateStr = toDateStr(now);
    } else if (datePreset === 'Yesterday') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      targetDateStr = toDateStr(y);
    } else if (datePreset === 'Tomorrow') {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      targetDateStr = toDateStr(t);
    } else if (datePreset === 'Custom Date') {
      targetDateStr = customDate || toDateStr(now);
    }

    const source = allBookings.length > 0 
      ? allBookings 
      : [...checkInsToday, ...checkOutsToday, ...yesterdayBookings, ...tomorrowBookings];

    const uniqueList = [];
    const seen = new Set();
    for (const b of source) {
      const id = b.dbId || b.id || b._id;
      if (id && !seen.has(id)) {
        seen.add(id);
        uniqueList.push(b);
      }
    }

    const filtered = uniqueList.filter(b => {
      const cinStr = toDateStr(b.rawCheckIn || b.checkInDate || b.checkIn);
      const coutStr = toDateStr(b.rawCheckOut || b.checkOutDate || b.checkOut);
      if (status === 'Check-in') {
        return cinStr === targetDateStr;
      } else {
        return coutStr === targetDateStr;
      }
    });

    return filtered;
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
          {/* Header row with Title, Subtitle, and Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                {activeChartTab === 'Weekly' ? 'Revenue Overview (Weekly)' : 
                 activeChartTab === 'Day-wise' ? 'DAY-WISE REVENUE PERFORMANCE CURVE' :
                 activeChartTab === 'Monthly' ? 'MONTHLY REVENUE PERFORMANCE CURVE' :
                 'YEARLY REVENUE PERFORMANCE CURVE'}
              </h3>
              <div className="mt-1">
                {activeChartTab === 'Weekly' ? (
                  <p className="text-xs font-semibold text-slate-400">
                    For {monthsList.find(m => m.value === selectedMonth)?.name} {selectedYear}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm font-black text-rose-600 font-mono tracking-tight leading-tight">
                    {revenueTimeframe?.periodSubtitle || (
                      activeChartTab === 'Day-wise' ? "₹ 0 TODAY'S EARNINGS" :
                      activeChartTab === 'Monthly' ? `₹ 0 TOTAL EARNINGS (${selectedYear})` :
                      "TOTAL MULTI-YEAR EARNINGS"
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Tabs & Badge */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {activeChartTab === 'Weekly' && (
                <div className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-sm font-mono">
                  {revenueTimeframe?.periodTotalFormatted || "₹0"}
                </div>
              )}
              {/* Pill Capsule Tabs */}
              <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
                {['Day-wise', 'Weekly', 'Monthly', 'Yearly'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveChartTab(tab);
                      setSelectedDay('all');
                      setSelectedWeek('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
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
          </div>

          {/* Filter Bar: Aligned to the RIGHT side and strictly on ONE row */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 flex-nowrap overflow-x-auto no-scrollbar">
            {/* 1. Day-wise Tab Filter: Calendar Date Picker Only */}
            {activeChartTab === 'Day-wise' && (
              <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                <Calendar size={13} className="text-rose-600 shrink-0" />
                <input
                  type="date"
                  value={`${selectedYear}-${String(selectedMonth === 'all' ? 1 : selectedMonth).padStart(2, '0')}-${selectedDay !== 'all' ? String(selectedDay).padStart(2, '0') : '01'}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      setSelectedYear(y);
                      setSelectedMonth(m);
                      setSelectedDay(d);
                    }
                  }}
                  className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* 2. Weekly Tab Filters: Select Month, Year, Week in one row */}
            {activeChartTab === 'Weekly' && (
              <>
                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <Calendar size={13} className="text-rose-600 shrink-0" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {monthsList.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <Clock size={13} className="text-rose-600 shrink-0" />
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    <option value="all">All 4 Weeks</option>
                    <option value="1">Week 1 (1–7)</option>
                    <option value="2">Week 2 (8–14)</option>
                    <option value="3">Week 3 (15–21)</option>
                    <option value="4">Week 4 (22–{daysInSelectedMonth})</option>
                  </select>
                </div>
              </>
            )}

            {/* 3. Monthly Tab Filters: Select Month & Year */}
            {activeChartTab === 'Monthly' && (
              <>
                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <Calendar size={13} className="text-rose-600 shrink-0" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {monthsList.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* 4. Yearly Tab Filters: Select Year Dropdown */}
            {activeChartTab === 'Yearly' && (
              <>
                <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <Calendar size={13} className="text-rose-600 shrink-0" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* SVG Custom Line Chart */}
          <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end bg-slate-50/20 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full p-2 overflow-visible" viewBox="0 0 520 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Y-Axis scale and horizontal grid lines */}
              {(revenueTimeframe?.ySteps || [80000, 60000, 40000, 20000, 0]).map((stepVal, sIdx) => {
                const stepY = Math.round(25 + (sIdx / 4) * 120);
                const stepLabel = stepVal >= 1000 ? `₹${Math.round(stepVal / 1000)}K` : `₹${stepVal}`;
                return (
                  <g key={sIdx}>
                    <text
                      x="42"
                      y={stepY + 3}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="ui-monospace, monospace"
                    >
                      {stepLabel}
                    </text>
                    <line
                      x1="48"
                      y1={stepY}
                      x2="500"
                      y2={stepY}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </g>
                );
              })}

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
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover vertical dashed guideline */}
              {hoveredPoint !== null && validPoints[hoveredPoint] && (
                <line
                  x1={validPoints[hoveredPoint].x}
                  y1={25}
                  x2={validPoints[hoveredPoint].x}
                  y2={150}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              )}

              {/* Data Points with interactive badges */}
              {validPoints.map((pt, index) => {
                const isSelected = (activeChartTab === 'Day-wise' && selectedDay !== 'all' && pt.day === Number(selectedDay)) ||
                                   (activeChartTab === 'Weekly' && selectedWeek !== 'all' && pt.weekNum === Number(selectedWeek));
                const isFaded = (activeChartTab === 'Day-wise' && selectedDay !== 'all' && pt.day !== Number(selectedDay)) ||
                                (activeChartTab === 'Weekly' && selectedWeek !== 'all' && pt.weekNum !== Number(selectedWeek));
                const val = Number(pt.value || 0);
                const isHovered = hoveredPoint === index;
                const showBadge = (val > 0) || isSelected || isHovered;
                const isDenseZero = activeChartTab === 'Day-wise' && val === 0 && !isSelected && !isHovered;

                const labelText = `₹${val.toLocaleString()}`;
                const badgeWidth = Math.max(46, labelText.length * 6.5 + 8);

                return (
                  <g 
                    key={index}
                    opacity={isFaded ? 0.35 : 1}
                    className="cursor-pointer transition-opacity duration-200"
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => {
                      if (activeChartTab === 'Day-wise' && pt.day) {
                        setSelectedDay(selectedDay === String(pt.day) ? 'all' : String(pt.day));
                      } else if (activeChartTab === 'Weekly' && pt.weekNum) {
                        setSelectedWeek(selectedWeek === String(pt.weekNum) ? 'all' : String(pt.weekNum));
                      }
                    }}
                  >
                    {/* Circle Node: Subtle small dot for 0-value days; prominent circle for active/hovered */}
                    {isDenseZero ? (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="2.5"
                        fill="#fda4af"
                        className="transition-all hover:r-4"
                      />
                    ) : (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected || isHovered ? "5.5" : "4"}
                        fill="#ffffff"
                        stroke="#d31e1e"
                        strokeWidth={isSelected || isHovered ? "3" : "2.5"}
                        className="transition-all"
                      />
                    )}

                    {/* Red Badge above Node */}
                    {showBadge && (
                      <g className="animate-in fade-in zoom-in-95 duration-150">
                        <rect
                          x={pt.x - (badgeWidth / 2)}
                          y={pt.y - 25}
                          width={badgeWidth}
                          height="17"
                          rx="4"
                          fill="#d31e1e"
                        />
                        <polygon
                          points={`${pt.x - 3.5},${pt.y - 8} ${pt.x + 3.5},${pt.y - 8} ${pt.x},${pt.y - 4.5}`}
                          fill="#d31e1e"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 13.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="8"
                          fontWeight="800"
                          fontFamily="ui-monospace, monospace"
                        >
                          {labelText}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels along bottom */}
            <div className="absolute bottom-1 inset-x-0 pl-12 pr-4 flex justify-between text-[9px] font-bold text-slate-400 pointer-events-none">
              {validPoints.map((pt, i) => {
                // In Day-wise with 28-31 days, show every 2nd or selected/hovered to avoid overlapping
                const isDayWiseDense = activeChartTab === 'Day-wise' && validPoints.length > 15;
                const showLabel = !isDayWiseDense || (i % 2 === 0) || pt.isToday || (Number(pt.value) > 0) || (hoveredPoint === i);

                if (!showLabel) {
                  return <span key={i} className="opacity-0">.</span>;
                }

                return (
                  <span
                    key={i}
                    className={`transition-colors text-center ${
                      pt.isToday || pt.isSelectedDay || hoveredPoint === i
                        ? 'text-rose-600 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {activeChartTab === 'Weekly' ? `${pt.label} (${pt.subLabel})` : pt.label}
                  </span>
                );
              })}
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
        {/* Table Header Controls (Change 2) */}
        <div className="p-6 pb-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Check-in">Check-in</option>
                <option value="Check-out">Check-out</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Date Preset Dropdown */}
            <div className="relative">
              <select
                value={filterDatePreset}
                onChange={(e) => setFilterDatePreset(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="Custom Date">Custom Date</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Custom Date Input (shown when Custom Date selected) */}
            {filterDatePreset === 'Custom Date' && (
              <input
                type="date"
                value={customDateValue}
                onChange={(e) => setCustomDateValue(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            )}

            {/* Apply Filter Button */}
            <button
              onClick={handleApplyFilter}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-sm shadow-rose-200 cursor-pointer border-none"
            >
              <Filter size={13} className="stroke-[2.5]" />
              <span>Apply Filter</span>
            </button>
          </div>

          {/* Right Action controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchDashboardData()}
              className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center shadow-xs"
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
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
              {activeGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">
                    No reservations found for {appliedFilter.status} ({appliedFilter.datePreset === 'Custom Date' ? appliedFilter.customDate : appliedFilter.datePreset}).
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
                        <div>
                          <button
                            onClick={() => navigate(`/homestay-owner/guests/${guest.dbId || guest.id}`)}
                            className="font-extrabold text-slate-800 hover:text-rose-700 bg-transparent border-none cursor-pointer p-0 text-left block"
                            title="View Guest Details"
                          >
                            {guest.name}
                          </button>
                          <button
                            onClick={() => navigate(`/homestay-owner/bookings/${guest.dbId || guest.id || guest._id}`)}
                            className="font-mono text-[9px] text-rose-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-left block mt-0.5"
                            title="View Dedicated Booking Details Page"
                          >
                            #{guest.id ? String(guest.id).replace(/^#/, '') : 'BK'}
                          </button>
                        </div>
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
                        onClick={() => navigate(`/homestay-owner/bookings/${guest.dbId || guest.id || guest._id}`)}
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

      {/* Full Booking Details Modal (Change 1) */}
      <FullBookingDetailsModal
        isOpen={!!selectedBookingModal}
        onClose={() => setSelectedBookingModal(null)}
        booking={selectedBookingModal}
        onRefresh={fetchDashboardData}
      />

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


