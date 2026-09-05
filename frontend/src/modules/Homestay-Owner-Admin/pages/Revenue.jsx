import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  CircleDollarSign,
  TrendingUp,
  Download,
  Calendar,
  ChevronDown,
  Building2,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Receipt,
  Eye,
  CreditCard,
  Wallet,
  Phone,
  MessageSquare,
  X,
  ExternalLink,
  CalendarCheck,
  AlertCircle,
  Filter
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Revenue() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('analytics'); // 'analytics' | 'payments'
  const [activeChartTab, setActiveChartTab] = useState('Day-wise');
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [properties, setProperties] = useState([]);
  const [propertyBreakdown, setPropertyBreakdown] = useState([]);

  // Search and filter states for booking tables
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [viewTableMode, setViewTableMode] = useState('bookings'); // 'bookings' | 'periods'

  // Summary state
  const [summary, setSummary] = useState({
    today: 0,
    todayChange: '+0.0',
    todayPositive: true,
    thisWeek: 0,
    weekChange: '+0.0',
    weekPositive: true,
    thisMonth: 0,
    monthChange: '+0.0',
    monthPositive: true,
    totalRevenue: 0,
    dateRange: 'All Time'
  });

  const [dailyDetails, setDailyDetails] = useState([]);
  const [chartPoints, setChartPoints] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);

  useEffect(() => {
    fetchRevenueData();
  }, [selectedPropertyId, activeChartTab]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/homestay-owner/revenue?propertyId=${selectedPropertyId}&timeframe=${activeChartTab}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.properties) setProperties(res.data.properties);
        if (res.data.propertyBreakdown) setPropertyBreakdown(res.data.propertyBreakdown);
        if (res.data.detailsTable) setDailyDetails(res.data.detailsTable);
        if (res.data.chartPoints) setChartPoints(res.data.chartPoints);
        if (res.data.transactions) setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('Failed to load revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.print();
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

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    // Property Filter
    if (selectedPropertyId !== 'all') {
      const propMatch = properties.find(p => p.id === selectedPropertyId)?.name;
      if (propMatch && t.propertyName && !t.propertyName.toLowerCase().includes(propMatch.toLowerCase())) {
        return false;
      }
    }

    // Status Filter
    if (paymentStatusFilter !== 'all') {
      if (paymentStatusFilter === 'completed' && t.paymentStatus !== 'Completed') return false;
      if (paymentStatusFilter === 'partial' && t.paymentStatus !== 'Partial') return false;
      if (paymentStatusFilter === 'pending' && t.paymentStatus !== 'Pending') return false;
    }

    // Payment Mode Filter
    if (paymentModeFilter !== 'all') {
      if (t.paymentMode?.toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = t.guestName?.toLowerCase().includes(q);
      const matchPhone = t.phone?.toLowerCase().includes(q);
      const matchBookingId = t.bookingId?.toLowerCase().includes(q);
      const matchProp = t.propertyName?.toLowerCase().includes(q);
      return matchName || matchPhone || matchBookingId || matchProp;
    }

    return true;
  });

  // Financial calculations for Payments tab
  const totalBilled = filteredTransactions.reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);
  const totalCollected = filteredTransactions.reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);
  const totalPending = filteredTransactions.reduce((acc, t) => acc + (Number(t.pendingAmount) || 0), 0);
  const completedCount = filteredTransactions.filter(t => t.paymentStatus === 'Completed').length;

  return (
    <div className="space-y-6 select-none font-sans pb-12 print:p-0">
      
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4 print:hidden">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Financial Ledger & Revenue Hub
          </h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Track performance analytics, booking-wise transaction records, and payment settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Property Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
            <Building2 size={14} className="text-rose-700" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Homestays (Consolidated)</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchRevenueData()}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
          >
            <Download size={13} className="stroke-[3]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white p-2 px-6 rounded-2xl shadow-xs gap-3 print:hidden">
        <button
          onClick={() => setActiveMainTab('analytics')}
          className={`pb-3 pt-2 px-4 text-xs font-black transition-all border-none bg-transparent cursor-pointer relative flex items-center gap-2 ${
            activeMainTab === 'analytics'
              ? 'text-rose-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp size={15} />
          <span>Revenue Analytics & Performance</span>
          {activeMainTab === 'analytics' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full"></span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('payments')}
          className={`pb-3 pt-2 px-4 text-xs font-black transition-all border-none bg-transparent cursor-pointer relative flex items-center gap-2 ${
            activeMainTab === 'payments'
              ? 'text-rose-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet size={15} />
          <span>Booking Payments & Transactions</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-50 text-rose-600 font-extrabold">
            {transactions.length}
          </span>
          {activeMainTab === 'payments' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full"></span>
          )}
        </button>
      </div>

      {/* TAB 1: REVENUE ANALYTICS & OVERVIEW */}
      {activeMainTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Today's Revenue */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Today's Revenue
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.today || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.todayPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.todayPositive ? `↑ ${summary.todayChange}% vs yesterday` : `${summary.todayChange}% vs yesterday`}
                </span>
              </div>
            </div>

            {/* This Week */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  This Week
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.thisWeek || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.weekPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.weekPositive ? `↑ ${summary.weekChange}% vs last week` : `${summary.weekChange}% vs last week`}
                </span>
              </div>
            </div>

            {/* This Month */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  This Month
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.thisMonth || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.monthPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.monthPositive ? `↑ ${summary.monthChange}% vs last month` : `${summary.monthChange}% vs last month`}
                </span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Total Revenue
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.totalRevenue || 0).toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-slate-400">
                  {summary.dateRange || 'Cumulative Gross'}
                </span>
              </div>
            </div>
          </div>

          {/* PROPERTY-WISE BREAKDOWN (Visible when viewing All Homestays) */}
          {selectedPropertyId === 'all' && propertyBreakdown.length > 0 && (
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Building2 size={16} className="text-rose-700" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Homestay Properties Revenue Breakdown
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propertyBreakdown.map((pb) => (
                  <div 
                    key={pb.id}
                    onClick={() => setSelectedPropertyId(pb.id)}
                    className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-rose-200 hover:bg-rose-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 group-hover:text-rose-600 transition-colors">
                          {pb.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                          {pb.bookingsCount || 0} Bookings Recorded
                        </span>
                      </div>
                      <span className="text-sm font-black font-mono text-slate-800 group-hover:text-rose-600">
                        ₹ {Number(pb.revenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                  {activeChartTab} Revenue Performance Curve
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-black text-rose-600 tracking-tight leading-none font-mono">
                    ₹ {Number(summary.today || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Today's Earnings
                  </span>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
                {['Day-wise', 'Weekly', 'Monthly', 'Yearly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveChartTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
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

            {/* SVG Line Chart */}
            <div className="p-6">
              <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end bg-slate-50/20">
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
                  {areaPath && (
                    <path d={areaPath} fill="url(#revGrad)" />
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
                        r={index === validPoints.length - 1 ? "5.5" : "4"}
                        fill="#ffffff"
                        stroke="#d31e1e"
                        strokeWidth={index === validPoints.length - 1 ? "3.5" : "2"}
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        fill={index === validPoints.length - 1 ? "#d31e1e" : "#64748b"}
                        className="font-black font-mono"
                        style={{ fontSize: '8px' }}
                      >
                        ₹{Number(pt.value || 0).toLocaleString()}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* X Axis Labels */}
                <div className="absolute bottom-1.5 inset-x-0 px-5 flex justify-between text-[8px] font-black text-slate-400 text-center leading-tight">
                  {validPoints.map((pt, i) => (
                    <span key={i} className={i === validPoints.length - 1 ? 'text-rose-600 font-extrabold' : ''}>
                      {String(pt.label || '').replace('\n', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOOKING-WISE TRANSACTION TABLE (Below Chart) */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
            <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight">
                  Booking-wise Revenue & Transaction Ledger
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Detailed financial transactions mapped to individual guest bookings.
                </p>
              </div>

              {/* Controls: Search, View Mode Toggle */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search guest, phone, booking ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>

                <button
                  onClick={() => setViewTableMode(viewTableMode === 'bookings' ? 'periods' : 'bookings')}
                  className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <Filter size={12} />
                  <span>{viewTableMode === 'bookings' ? 'View Periods' : 'View Bookings'}</span>
                </button>
              </div>
            </div>

            {/* Table Rendering */}
            {viewTableMode === 'bookings' ? (
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Booking ID</th>
                      <th className="pb-3 px-3">Guest</th>
                      <th className="pb-3 px-3">Property & Room</th>
                      <th className="pb-3 px-3">Dates (In - Out)</th>
                      <th className="pb-3 px-3 text-right">Total Bill</th>
                      <th className="pb-3 px-3 text-right">Collected</th>
                      <th className="pb-3 px-3 text-right">Pending</th>
                      <th className="pb-3 px-3 text-center">Mode</th>
                      <th className="pb-3 px-3 text-center">Status</th>
                      <th className="pb-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-bold text-xs">
                          No transactions found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id || t.bookingId} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-[11px] font-extrabold text-slate-800">
                            {t.bookingId}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-extrabold text-slate-800">{t.guestName}</div>
                            <div className="text-[10px] text-slate-400">{t.phone}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800">{t.propertyName}</div>
                            <div className="text-[10px] text-rose-600 font-extrabold">{t.roomNumber} ({t.roomType})</div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                            {t.checkInDate} → {t.checkOutDate}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                            ₹ {Number(t.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                            ₹ {Number(t.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                            ₹ {Number(t.pendingAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                              {t.paymentMode || 'UPI'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.paymentStatus === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.paymentStatus === 'Partial'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {t.paymentStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedBookingModal(t)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer bg-white shadow-xs"
                            >
                              <Eye size={11} className="stroke-[2.5]" />
                              <span>Show Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Period Itemized Table fallback */
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Date / Period</th>
                      <th className="pb-3 px-3">Day / Timeframe</th>
                      <th className="pb-3 px-3 text-center">Bookings</th>
                      <th className="pb-3 px-3 text-right">Base Tariff</th>
                      <th className="pb-3 px-3 text-right">Add-ons</th>
                      <th className="pb-3 px-3 text-right">Taxes</th>
                      <th className="pb-3 px-3 text-right">Total Revenue</th>
                      <th className="pb-3 px-3 text-right">Collected</th>
                      <th className="pb-3 px-3 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {dailyDetails.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {row.date || row.period}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={row.isBold ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                            {row.day}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600">{row.bookings}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.baseTariff || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.addOns || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.tax || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">{row.revenue}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">{row.collected || '₹ 0'}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700">{row.pending || '₹ 0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKING PAYMENTS & TRANSACTIONS */}
      {activeMainTab === 'payments' && (
        <div className="space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Billed */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shadow-sm">
                <Receipt size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Total Gross Billed
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {totalBilled.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-slate-400">
                  {filteredTransactions.length} Total Bookings
                </span>
              </div>
            </div>

            {/* Collected */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-sm">
                <CheckCircle2 size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Collected / Received
                </span>
                <span className="block text-xl font-black text-emerald-600 tracking-tight mt-1.5 font-mono">
                  ₹ {totalCollected.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-emerald-600">
                  {totalBilled > 0 ? `${Math.round((totalCollected / totalBilled) * 100)}% Collection Rate` : '0%'}
                </span>
              </div>
            </div>

            {/* Pending Dues */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-sm">
                <Clock size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Pending Receivables
                </span>
                <span className="block text-xl font-black text-rose-600 tracking-tight mt-1.5 font-mono">
                  ₹ {totalPending.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-rose-400">
                  Outstanding Balance
                </span>
              </div>
            </div>

            {/* Completed Settlements */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                <CreditCard size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Settled In Full
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  {completedCount} / {filteredTransactions.length}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-indigo-600">
                  Fully Paid Bookings
                </span>
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest, phone, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-rose-500"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Status' },
                { id: 'completed', label: 'Paid / Completed' },
                { id: 'partial', label: 'Partial Paid' },
                { id: 'pending', label: 'Pending Dues' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setPaymentStatusFilter(pill.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                    paymentStatusFilter === pill.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              {/* Mode Filter Dropdown */}
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Detailed Payment Transactions Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
            <div className="p-6 pb-0 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Booking Payment Transactions ({filteredTransactions.length})
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                Sorted by most recent
              </span>
            </div>

            <div className="overflow-x-auto px-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Transaction / Booking ID</th>
                    <th className="pb-3 px-3">Guest Details</th>
                    <th className="pb-3 px-3">Property & Room</th>
                    <th className="pb-3 px-3">Dates</th>
                    <th className="pb-3 px-3 text-center">Payment Mode</th>
                    <th className="pb-3 px-3 text-right">Billed Amount</th>
                    <th className="pb-3 px-3 text-right">Collected</th>
                    <th className="pb-3 px-3 text-right">Pending</th>
                    <th className="pb-3 px-3 text-center">Payment Status</th>
                    <th className="pb-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-bold text-xs">
                        No transactions recorded for this criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id || t.bookingId} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[11px] font-extrabold text-slate-800 block">
                            {t.bookingId}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {t.bookingDate || 'Recent'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-800">{t.guestName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{t.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{t.propertyName}</div>
                          <div className="text-[10px] text-rose-600 font-extrabold">{t.roomNumber} ({t.roomType})</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {t.checkInDate} → {t.checkOutDate}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {t.paymentMode || 'UPI'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                          ₹ {Number(t.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                          ₹ {Number(t.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                          ₹ {Number(t.pendingAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            t.paymentStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.paymentStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.paymentStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedBookingModal(t)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-707 rounded-lg transition-colors cursor-pointer"
                              title="Show Booking Details"
                            >
                              <Eye size={12} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${t.dbId || t.id}`)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-707 rounded-lg transition-colors cursor-pointer"
                              title="Confirmation Slip"
                            >
                              <Receipt size={12} />
                            </button>
                            <button
                              onClick={() => navigate(`/homestay-owner/bookings/invoice/${t.dbId || t.id}`)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-707 rounded-lg transition-colors cursor-pointer"
                              title="Tax Invoice"
                            >
                              <FileText size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                  Booking & Transaction Overview
                </span>
                <h2 className="text-base font-black text-slate-800 tracking-tight mt-0.5">
                  {selectedBookingModal.bookingId || 'Booking Details'}
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
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-lg border border-white shadow-xs">
                {selectedBookingModal.guestName ? selectedBookingModal.guestName.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-800 truncate">{selectedBookingModal.guestName}</h3>
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
                <span className="text-[11px] font-extrabold text-rose-600 block mt-0.5">{selectedBookingModal.roomNumber || selectedBookingModal.roomType || 'Standard Room'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Stay Dates</span>
                <span className="font-bold text-slate-800 block mt-1 font-mono text-[11px]">Check-in: {selectedBookingModal.checkInDate}</span>
                <span className="font-bold text-slate-800 block mt-0.5 font-mono text-[11px]">Check-out: {selectedBookingModal.checkOutDate}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Financial Breakdown</span>
              
              <div className="flex justify-between text-slate-600">
                <span>Base Tariff</span>
                <span className="font-mono font-bold">₹ {Number(selectedBookingModal.baseTariff || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Add-ons & Extras</span>
                <span className="font-mono font-bold">₹ {Number(selectedBookingModal.addOns || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Taxes (GST)</span>
                <span className="font-mono font-bold">₹ {Number(selectedBookingModal.tax || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-800 font-black">Total Bill</span>
                <span className="text-sm font-black font-mono text-slate-800">
                  ₹ {Number(selectedBookingModal.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-bold">
                <span>Amount Paid</span>
                <span className="font-mono">₹ {Number(selectedBookingModal.paidAmount || 0).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-rose-700 font-bold">
                <span>Balance Pending</span>
                <span className="font-mono">₹ {Number(selectedBookingModal.pendingAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Special Requests */}
            {selectedBookingModal.specialRequests && (
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs">
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Special Requests</span>
                <p className="text-slate-700 mt-1">{selectedBookingModal.specialRequests}</p>
              </div>
            )}

            {/* Action Links */}
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
                <span>Open in Manage Bookings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-6 gap-3 print:hidden">
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
