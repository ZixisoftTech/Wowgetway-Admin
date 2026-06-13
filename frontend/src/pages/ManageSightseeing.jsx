import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Search,
  Compass,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  Copy,
  FileText,
  CheckCircle2,
  XCircle,
  Printer,
  Download,
  Tag,
  Activity,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  Award,
  AlertTriangle,
  Map,
  Check,
  X,
  CalendarDays,
  Plane,
  Coffee,
  ShieldAlert
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

import MetricCard from '../components/widgets/MetricCard.jsx';

const API_BASE_URL = 'http://localhost:5005/api/dashboard/tour-packages';

const destinationsList = [
  'Gangtok', 'Darjeeling', 'Kalimpong', 'Lachen', 'Lachung', 
  'Gurudongmar Lake', 'Yumthang Valley', 'Pelling', 'Ravangla', 
  'Namchi', 'Zuluk', 'Aritar', 'Tsomgo Lake', 'Baba Mandir'
];

const regionsList = [
  'North Sikkim', 'East Sikkim', 'South Sikkim', 'West Sikkim', 'Darjeeling Region'
];


export default function ManageSightseeing() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details' | 'preview'
  const [selectedId, setSelectedId] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [destFilter, setDestFilter] = useState('All');
  const [durationFilter, setDurationFilter] = useState('All');
  const [mealFilter, setMealFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 1. Fetch Stats
  const { data: stats = { totalPackages: 0, activePackages: 0, draftPackages: 0, totalBookings: 0, totalRevenue: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['tourStats'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/stats`);
      return res.data;
    }
  });

  // 2. Fetch Packages List
  const { data: packagesList = [], isLoading: listLoading } = useQuery({
    queryKey: ['tourPackages', searchQuery, statusFilter, destFilter, durationFilter, mealFilter, typeFilter, regionFilter],
    queryFn: async () => {
      const res = await axios.get(API_BASE_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          destination: destFilter,
          duration: durationFilter,
          mealPlan: mealFilter,
          tourType: typeFilter,
          region: regionFilter
        }
      });
      return res.data;
    }
  });

  // 3. Fetch Single Package Details
  const { data: packageDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['tourPackageDetails', selectedId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/${selectedId}`);
      return res.data;
    },
    enabled: !!selectedId && (viewMode === 'details' || viewMode === 'edit' || viewMode === 'preview')
  });

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: async (newData) => {
      const res = await axios.post(API_BASE_URL, newData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tourPackages']);
      queryClient.invalidateQueries(['tourStats']);
      setViewMode('list');
      alert('Tour package created successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to create tour package');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const res = await axios.put(`${API_BASE_URL}/${id}`, updatedData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tourPackages']);
      queryClient.invalidateQueries(['tourStats']);
      queryClient.invalidateQueries(['tourPackageDetails', selectedId]);
      setViewMode('list');
      setSelectedId(null);
      alert('Tour package updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update tour package');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await axios.delete(`${API_BASE_URL}/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tourPackages']);
      queryClient.invalidateQueries(['tourStats']);
      setViewMode('list');
      setSelectedId(null);
      alert('Tour package deleted successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete tour package');
    }
  });



  // Pagination Helper
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return packagesList.slice(start, start + itemsPerPage);
  }, [packagesList, currentPage]);

  const totalPages = Math.ceil(packagesList.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, destFilter, durationFilter, mealFilter, typeFilter, regionFilter]);

  // Handlers
  const handleDuplicate = async (pkg) => {
    if (window.confirm(`Are you sure you want to duplicate "${pkg.title}"?`)) {
      const duplicated = {
        ...pkg,
        title: `Copy of ${pkg.title}`,
        bookings: 0,
        completedTours: 0,
        upcomingTours: 0,
        cancelledTours: 0,
        revenueGenerated: 0,
        averageRating: 5.0,
        packageId: `PKG-${Date.now().toString().slice(-4)}`
      };
      delete duplicated._id;
      delete duplicated.createdAt;
      delete duplicated.lastUpdated;
      
      createMutation.mutate(duplicated);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this tour package? This will verify that no active booking records exist.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = (type) => {
    const headers = ['Package ID', 'Title', 'Category', 'Region', 'Destinations', 'Nights', 'Days', 'Meal Plan', 'B2C Price', 'B2BPrice', 'Bookings', 'Revenue', 'Status'];
    const rows = packagesList.map(p => [
      p.packageId,
      p.title,
      p.category,
      p.region,
      p.destinations.join('; '),
      p.nightsCount,
      p.daysCount,
      p.mealPlan,
      p.b2cPrice,
      p.b2bPrice,
      p.bookings,
      p.revenueGenerated,
      p.status
    ]);

    let content = '';
    if (type === 'csv') {
      content = [headers.join(','), ...rows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `tour_packages_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // excel format mock
      content = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `tour_packages_${Date.now()}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 antialiased">
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Top Navigation / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manage Tour Packages</h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Create, catalog, price, and monitor sightseeing itineraries and packages.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative inline-block text-left">
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-4 py-2.5 bg-white border border-slate-100 hover:border-slate-200 text-slate-600 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={13} className="stroke-[2.5]" />
                    Export CSV
                  </button>
                </div>
                <button
                  onClick={() => setViewMode('add')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  Add Tour Package
                </button>
              </div>
            </div>

            {/* Metric KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <MetricCard
                title="TOTAL TOUR PACKAGES"
                value={stats.totalPackages}
                subtext="All stored itineraries"
                icon={Compass}
                iconBgColor="bg-blue-50"
                iconColor="text-blue-600"
                loading={statsLoading}
              />
              <MetricCard
                title="ACTIVE PACKAGES"
                value={stats.activePackages}
                subtext="Visible on customer website"
                icon={CheckCircle2}
                iconBgColor="bg-emerald-50"
                iconColor="text-emerald-600"
                loading={statsLoading}
                trendDirection="status-green"
                trendText="Live Catalog"
              />
              <MetricCard
                title="DRAFT PACKAGES"
                value={stats.draftPackages}
                subtext="Incomplete or offline"
                icon={FileText}
                iconBgColor="bg-amber-50"
                iconColor="text-amber-600"
                loading={statsLoading}
              />
              <MetricCard
                title="TOTAL BOOKINGS"
                value={stats.totalBookings}
                subtext="Total packages booked"
                icon={Users}
                iconBgColor="bg-violet-50"
                iconColor="text-violet-600"
                loading={statsLoading}
              />
              <MetricCard
                title="REVENUE GENERATED"
                value={`₹${(stats.totalRevenue || 0).toLocaleString()}`}
                subtext="Total bookings value"
                icon={DollarSign}
                iconBgColor="bg-rose-50"
                iconColor="text-rose-600"
                loading={statsLoading}
              />
            </div>

            {/* Filter controls bar */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative w-full lg:w-96">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID, Title, Destination, Region..."
                    className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-slate-200"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Region</span>
                    <select
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-slate-200"
                    >
                      <option value="All">All Regions</option>
                      {regionsList.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Destination</span>
                    <select
                      value={destFilter}
                      onChange={(e) => setDestFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-slate-200"
                    >
                      <option value="All">All Destinations</option>
                      {destinationsList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Duration</span>
                    <select
                      value={durationFilter}
                      onChange={(e) => setDurationFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-slate-200"
                    >
                      <option value="All">All Durations</option>
                      <option value="1-3 Nights">1-3 Nights</option>
                      <option value="4-6 Nights">4-6 Nights</option>
                      <option value="7+ Nights">7+ Nights</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Meal Plan</span>
                    <select
                      value={mealFilter}
                      onChange={(e) => setMealFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-slate-200"
                    >
                      <option value="All">All Meals</option>
                      <option value="EP">EP (Room Only)</option>
                      <option value="CP">CP (Breakfast)</option>
                      <option value="MAP">MAP (Half Board)</option>
                      <option value="AP">AP (Full Board)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* List Table/Grid container */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              {listLoading ? (
                <div className="p-20 text-center flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="text-xs text-slate-400 font-bold">Loading tour packages...</span>
                </div>
              ) : packagesList.length === 0 ? (
                <div className="p-20 text-center max-w-md mx-auto">
                  <Compass size={40} className="text-slate-300 mx-auto mb-4 stroke-[1.5]" />
                  <h3 className="text-sm font-bold text-slate-700 mb-1">No Tour Packages Found</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                    We couldn't find any tour packages matching your search filters. Try adjusting your query parameters.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All');
                      setDestFilter('All');
                      setDurationFilter('All');
                      setMealFilter('All');
                      setRegionFilter('All');
                    }}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Package ID</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title & Route</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category & Region</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destinations</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tour Type</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base B2C / B2B</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Bookings</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Revenue</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creator</th>
                          <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70">
                        {paginatedPackages.map((pkg) => {
                          const statusColors = {
                            Active: 'bg-emerald-50 text-emerald-700 border-emerald-100/70',
                            Draft: 'bg-amber-50 text-amber-700 border-amber-100/70',
                            Inactive: 'bg-slate-50 text-slate-600 border-slate-100/70',
                            Archived: 'bg-rose-50 text-rose-700 border-rose-100/70'
                          };

                          return (
                            <tr key={pkg._id} className="hover:bg-slate-50/40 transition-colors text-xs font-medium">
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-slate-50 border border-slate-150 rounded font-mono text-[10px] text-slate-500 font-bold">
                                  {pkg.packageId}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 max-w-xs">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={pkg.coverPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100'}
                                    alt={pkg.title}
                                    className="w-9 h-9 rounded-lg object-cover shadow-sm bg-slate-100"
                                  />
                                  <div className="truncate">
                                    <span className="block font-bold text-slate-800 hover:text-blue-600 cursor-pointer truncate" onClick={() => { setSelectedId(pkg._id); setViewMode('details'); }}>
                                      {pkg.title}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-semibold">
                                      {pkg.pickupLocation} → {pkg.dropLocation}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="block font-semibold text-slate-700">{pkg.category}</span>
                                <span className="block text-[10px] text-slate-400 font-bold">{pkg.region}</span>
                              </td>
                              <td className="px-5 py-3.5 max-w-[150px] truncate">
                                <span className="text-slate-600 font-semibold text-[11px]" title={pkg.destinations.join(', ')}>
                                  {pkg.destinations.join(', ')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-slate-700 font-bold">{pkg.nightsCount}N / {pkg.daysCount}D</span>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase">{pkg.mealPlan} Plan</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${pkg.isPrivate ? 'bg-indigo-50 border-indigo-100 text-indigo-750' : 'bg-teal-50 border-teal-100 text-teal-700'}`}>
                                  {pkg.tourType} {pkg.isPrivate ? '(Private)' : '(Shared)'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-700">₹{pkg.b2cPrice?.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-405 font-bold">B2B: ₹{pkg.b2bPrice?.toLocaleString()}</div>
                              </td>
                              <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                                {pkg.bookings || 0}
                              </td>
                              <td className="px-5 py-3.5 text-right font-extrabold text-slate-800">
                                ₹{(pkg.revenueGenerated || 0).toLocaleString()}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${statusColors[pkg.status] || 'bg-slate-50'}`}>
                                  {pkg.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="block text-slate-700 font-bold">{pkg.createdBy}</span>
                                <span className="block text-[10px] text-slate-400 font-bold">
                                  {new Date(pkg.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => { setSelectedId(pkg._id); setViewMode('details'); }}
                                    className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-650 rounded-lg border border-slate-150 hover:border-blue-150 transition-colors cursor-pointer"
                                    title="View Profile"
                                  >
                                    <Eye size={12} className="stroke-[2.5]" />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedId(pkg._id); setViewMode('edit'); }}
                                    className="p-1.5 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-650 rounded-lg border border-slate-150 hover:border-amber-150 transition-colors cursor-pointer"
                                    title="Edit Details"
                                  >
                                    <Edit2 size={12} className="stroke-[2.5]" />
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(pkg)}
                                    className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-650 rounded-lg border border-slate-150 hover:border-indigo-150 transition-colors cursor-pointer"
                                    title="Duplicate Package"
                                  >
                                    <Copy size={12} className="stroke-[2.5]" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(pkg._id)}
                                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-650 rounded-lg border border-slate-150 hover:border-rose-150 transition-colors cursor-pointer"
                                    title="Delete Package"
                                  >
                                    <Trash2 size={12} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Grid View */}
                  <div className="block lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50">
                    {paginatedPackages.map((pkg) => (
                      <div key={pkg._id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-4">
                        <div className="flex gap-3">
                          <img
                            src={pkg.coverPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100'}
                            alt={pkg.title}
                            className="w-16 h-16 rounded-xl object-cover bg-slate-100 shadow-sm"
                          />
                          <div className="flex-1 space-y-1">
                            <span className="px-1.5 py-0.5 bg-slate-50 border border-slate-150 rounded font-mono text-[9px] text-slate-500 font-bold">
                              {pkg.packageId}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedId(pkg._id); setViewMode('details'); }}>
                              {pkg.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold">{pkg.category} • {pkg.region}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold border-y border-slate-100 py-3 text-slate-600">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Duration</span>
                            <span className="font-bold text-slate-700">{pkg.nightsCount}N / {pkg.daysCount}D</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Type</span>
                            <span className="font-bold text-slate-700">{pkg.tourType} ({pkg.isPrivate ? 'Private' : 'Shared'})</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">B2C Price</span>
                            <span className="font-extrabold text-slate-800">₹{pkg.b2cPrice?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Bookings</span>
                            <span className="font-bold text-slate-700">{pkg.bookings || 0} (₹{(pkg.revenueGenerated || 0).toLocaleString()})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`inline-block px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${pkg.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500'}`}>
                            {pkg.status}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedId(pkg._id); setViewMode('details'); }}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-colors"
                            >
                              <Eye size={12} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => { setSelectedId(pkg._id); setViewMode('edit'); }}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-colors"
                            >
                              <Edit2 size={12} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => handleDelete(pkg._id)}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 text-slate-600 transition-colors"
                            >
                              <Trash2 size={12} className="stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Section */}
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-550">
                    <span>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, packagesList.length)} of {packagesList.length} items
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ChevronLeft size={13} className="stroke-[2.5]" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer border ${page === currentPage ? 'bg-blue-600 border-blue-600 text-white shadow shadow-blue-500/25' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-all cursor-pointer ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ChevronRight size={13} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* DETAILS STATE */}
        {viewMode === 'details' && selectedId && packageDetails && (
          <DetailsView
            pkg={packageDetails}
            onBack={() => { setViewMode('list'); setSelectedId(null); }}
            onEdit={() => setViewMode('edit')}
            onPreviewItinerary={() => setViewMode('preview')}
            onDuplicate={() => handleDuplicate(packageDetails)}
            onDelete={() => handleDelete(packageDetails._id)}
          />
        )}

        {/* WIZARD STATE (ADD or EDIT) */}
        {(viewMode === 'add' || viewMode === 'edit') && (
          <WizardForm
            pkg={viewMode === 'edit' ? packageDetails : null}
            onBack={() => { setViewMode('list'); setSelectedId(null); }}
            onSubmit={(data) => {
              if (viewMode === 'edit') {
                updateMutation.mutate({ id: selectedId, updatedData: data });
              } else {
                createMutation.mutate(data);
              }
            }}
          />
        )}

        {/* PREVIEW VOUCHER STATE */}
        {viewMode === 'preview' && selectedId && packageDetails && (
          <ItineraryPreview
            pkg={packageDetails}
            onBack={() => setViewMode('details')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: DETAILS VIEW
// =========================================================================
function DetailsView({ pkg, onBack, onEdit, onPreviewItinerary, onDuplicate, onDelete }) {
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'vehicles' | 'bookings'
  
  // Mock bookings history linked to this package
  const bookingsHistory = useMemo(() => {
    return [
      { id: '#BKT-89512', customer: 'Aarav Mehta', mobile: '9988771101', date: '2026-05-12', travelers: 4, amount: pkg.b2cPrice * 4, status: 'Confirmed' },
      { id: '#BKT-89410', customer: 'Riya Gupta', mobile: '9988771104', date: '2026-04-18', travelers: 2, amount: pkg.b2cPrice * 2, status: 'Completed' },
      { id: '#BKT-89290', customer: 'Siddharth Joshi', mobile: '9988771116', date: '2026-03-24', travelers: 3, amount: pkg.b2cPrice * 3, status: 'Completed' },
      { id: '#BKT-88905', customer: 'Kriti Sanon', mobile: '9988771119', date: '2026-02-05', travelers: 5, amount: pkg.b2cPrice * 5, status: 'Cancelled' }
    ];
  }, [pkg]);

  // Monthly stats chart mock data
  const monthlyStatsData = [
    { month: 'Jan', bookings: 5, revenue: 122500 },
    { month: 'Feb', bookings: 12, revenue: 294000 },
    { month: 'Mar', bookings: 18, revenue: 441000 },
    { month: 'Apr', bookings: 14, revenue: 343000 },
    { month: 'May', bookings: pkg.bookings || 22, revenue: pkg.revenueGenerated || 539000 },
    { month: 'Jun', bookings: 8, revenue: 196000 }
  ];

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-6"
    >
      {/* Detail header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} className="stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{pkg.title}</h1>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-150 rounded font-mono text-[9px] text-slate-550 font-bold">
                {pkg.packageId}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Region: {pkg.region} • Category: {pkg.category} • Created by: {pkg.createdBy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviewItinerary}
            className="px-3 py-2 bg-white border border-slate-100 hover:border-slate-200 text-slate-650 font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={13} className="stroke-[2.5]" />
            Preview Itinerary
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-white border border-slate-100 hover:border-slate-200 text-slate-650 font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit2 size={13} className="stroke-[2.5]" />
            Edit Package
          </button>
          <button
            onClick={onDuplicate}
            className="px-3 py-2 bg-white border border-slate-100 hover:border-slate-200 text-slate-650 font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy size={13} className="stroke-[2.5]" />
            Duplicate
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 text-rose-700 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} className="stroke-[2.5]" />
            Delete
          </button>
        </div>
      </div>

      {/* 3-Column layout structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Overview, highlights, destinations map */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Banner</h3>
            <div className="relative rounded-xl overflow-hidden shadow-inner bg-slate-50 border border-slate-100 aspect-video">
              <img
                src={pkg.coverPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'}
                alt={pkg.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Short Description</span>
              <p className="text-xs font-medium text-slate-600 leading-relaxed mt-1">
                {pkg.shortDescription || 'No description provided.'}
              </p>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Package Highlights</span>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {pkg.highlights || 'No highlights declared.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destinations Route</h3>
            <div className="space-y-2">
              {pkg.destinations.map((d, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-extrabold text-blue-600">
                    {index + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{d}</span>
                </div>
              ))}
            </div>
            {pkg.galleryPhotos && pkg.galleryPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Gallery Photo URLs</span>
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {pkg.galleryPhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Gallery"
                      className="w-16 h-12 rounded object-cover shadow-sm bg-slate-50 border border-slate-100 flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Itinerary timeline, Vehicle matrix, Bookings history */}
        <div className="lg:col-span-6 space-y-6">
          {/* View Segment Tab controls */}
          <div className="bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm flex gap-1.5">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'itinerary' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50'}`}
            >
              Day-by-Day Itinerary
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'vehicles' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50'}`}
            >
              Vehicle Cost Specifications
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'bookings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-650 hover:bg-slate-50'}`}
            >
              Bookings History
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            {activeTab === 'itinerary' && (
              <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6 py-2">
                {pkg.itinerary?.map((day, index) => (
                  <div key={index} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-sm" />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-slate-800">
                          DAY {day.dayNumber}: Stay in {day.stayLocation}
                        </h4>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold uppercase">
                          {day.mealPlan || 'No meal'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {day.description}
                      </p>
                      
                      {day.sightseeingPoints && day.sightseeingPoints.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {day.sightseeingPoints.map((pt, pIdx) => (
                            <div key={pIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex gap-2.5">
                              {pt.image && (
                                <img
                                  src={pt.image}
                                  alt={pt.name}
                                  className="w-12 h-12 rounded object-cover shadow-sm bg-white"
                                />
                              )}
                              <div className="min-w-0">
                                <span className="block text-[11px] font-bold text-slate-850 truncate">{pt.name}</span>
                                <span className="block text-[9px] text-slate-450 font-semibold line-clamp-2 leading-relaxed">
                                  {pt.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'vehicles' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Daily Costs</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                        <th className="px-4 py-3">Vehicle Type</th>
                        <th className="px-4 py-3">Model Details</th>
                        <th className="px-4 py-3 text-right">B2B Cost</th>
                        <th className="px-4 py-3 text-right">B2C Cost</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {pkg.vehicles?.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="px-4 py-3 text-slate-800 font-bold">{v.vehicleType}</td>
                          <td className="px-4 py-3 text-slate-500 font-semibold">{v.vehicleModel}</td>
                          <td className="px-4 py-3 text-right text-slate-700 font-bold">₹{v.b2bCost?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-700 font-extrabold">₹{v.b2cCost?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${v.availability === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700'}`}>
                              {v.availability}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked Bookings Log</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                        <th className="px-4 py-3">Booking ID</th>
                        <th className="px-4 py-3">Customer Details</th>
                        <th className="px-4 py-3 text-center">Travelers</th>
                        <th className="px-4 py-3 text-right">Total Paid</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {bookingsHistory.map((b, idx) => {
                        const colors = {
                          Confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                          Completed: 'bg-blue-50 text-blue-700 border border-blue-100',
                          Cancelled: 'bg-rose-50 text-rose-700 border border-rose-100'
                        };
                        return (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="px-4 py-3 font-mono font-bold text-slate-500">{b.id}</td>
                            <td className="px-4 py-3">
                              <span className="block font-bold text-slate-800">{b.customer}</span>
                              <span className="block text-[10px] text-slate-400 font-semibold">{b.mobile}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-650 font-bold">{b.travelers} Guests</td>
                            <td className="px-4 py-3 text-right text-slate-800 font-extrabold">₹{b.amount?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${colors[b.status] || 'bg-slate-50'}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Statistics charts, Pricing breakdown, inclusions checklist */}
        <div className="lg:col-span-3 space-y-6">
          {/* Package Performance analytics */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bookings Performance</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyStatsData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', padding: '10px' }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 'bold', fontSize: '10px' }}
                    itemStyle={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '11px' }}
                  />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-50 pt-4">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Bookings</span>
                <span className="text-base font-extrabold text-slate-800">{pkg.bookings || 0}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Revenue</span>
                <span className="text-base font-extrabold text-slate-800">₹{(pkg.revenueGenerated || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Pricing detail sheets */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seasonal Pricing Matrix</h3>
            <div className="space-y-3 font-semibold text-xs text-slate-650">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-850 font-bold">Standard B2C Base</span>
                <span className="text-slate-900 font-extrabold">₹{pkg.b2cPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-850 font-bold">Standard B2B Base</span>
                <span className="text-slate-900 font-extrabold">₹{pkg.b2bPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Peak Season Price</span>
                <span className="text-slate-800 font-bold">₹{pkg.peakPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Off-Season Price</span>
                <span className="text-slate-800 font-bold">₹{pkg.offPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Child Price (w/o bed)</span>
                <span className="text-slate-800 font-bold">₹{pkg.childPrice?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                <span>Offer Discount</span>
                <span className="text-emerald-600 font-bold">-{pkg.discount}% OFF</span>
              </div>
              <div className="flex justify-between items-center font-extrabold text-sm text-slate-850 border-t border-slate-100 pt-3">
                <span>Offer Booking Price</span>
                <span className="text-blue-650">₹{pkg.offerPrice?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Inclusions Exclusions check list */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inclusions & Exclusions</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-emerald-650 uppercase tracking-wider mb-2">Package Inclusions</span>
                <div className="space-y-1.5">
                  {pkg.inclusions?.map((inc, idx) => (
                    <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-650">
                      <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-50 pt-3">
                <span className="block text-[10px] font-bold text-red-650 uppercase tracking-wider mb-2">Package Exclusions</span>
                <div className="space-y-1.5">
                  {pkg.exclusions?.map((exc, idx) => (
                    <div key={idx} className="flex gap-2 text-xs font-semibold text-slate-650">
                      <XCircle size={13} className="text-rose-450 flex-shrink-0 mt-0.5" />
                      <span>{exc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =========================================================================
// SUB-COMPONENT: ADD / EDIT PACKAGE WIZARD FORM
// =========================================================================
function WizardForm({ pkg, onBack, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const isEditMode = !!pkg;

  const [formData, setFormData] = useState({
    title: '',
    packageId: '',
    category: 'Sightseeing',
    region: 'North Sikkim',
    destinations: [],
    shortDescription: '',
    highlights: '',
    coverPhoto: '',
    galleryPhotos: [],
    nightsCount: 3,
    daysCount: 4,
    mealPlan: 'MAP',
    pickupLocation: 'Gangtok',
    dropLocation: 'Gangtok',
    tourType: 'Custom',
    isPrivate: true,
    itinerary: [],
    vehicles: [],
    inclusions: [],
    exclusions: [],
    b2cPrice: 0,
    b2bPrice: 0,
    childPrice: 0,
    extraPersonPrice: 0,
    peakPrice: 0,
    midPrice: 0,
    offPrice: 0,
    discount: 0,
    offerPrice: 0,
    tax: 5,
    status: 'Active',
    createdBy: 'Super Admin',
    remarks: ''
  });

  // Populate data if editing
  useEffect(() => {
    if (pkg) {
      setFormData({
        ...formData,
        ...pkg
      });
    }
  }, [pkg]);

  // Handle dynamic itinerary day array expansion based on daysCount
  useEffect(() => {
    const dCount = Number(formData.daysCount) || 1;
    let list = [...formData.itinerary];
    if (list.length < dCount) {
      while (list.length < dCount) {
        const dNum = list.length + 1;
        list.push({
          dayNumber: dNum,
          stayLocation: '',
          mealPlan: formData.mealPlan,
          description: '',
          sightseeingPoints: []
        });
      }
    } else if (list.length > dCount) {
      list = list.slice(0, dCount);
    }
    setFormData(prev => ({ ...prev, itinerary: list }));
  }, [formData.daysCount]);

  // Autocalculate offerPrice and seasonal pricing defaults when prices change
  useEffect(() => {
    const b2c = Number(formData.b2cPrice) || 0;
    const discount = Number(formData.discount) || 0;
    const offerPrice = Math.round(b2c * (1 - discount / 100));
    
    // Auto-fill defaults for seasonal prices if they are 0
    setFormData(prev => ({
      ...prev,
      offerPrice,
      peakPrice: prev.peakPrice || Math.round(b2c * 1.25),
      midPrice: prev.midPrice || b2c,
      offPrice: prev.offPrice || Math.round(b2c * 0.8)
    }));
  }, [formData.b2cPrice, formData.discount]);

  // Steps Details List
  const stepTitles = [
    'Basic Package Details',
    'Duration & Travel Details',
    'Day-Wise Itinerary Builder',
    'Vehicle Cost Specifications',
    'Inclusions List',
    'Exclusions List',
    'Pricing Sheet Configuration',
    'Final Review & Save'
  ];

  // Inclusions preset tags
  const inclusionPresets = [
    'Premium Accommodation', 'Standard Homestay Stay', 'Breakfast Daily', 'Breakfast & Dinner (MAP)', 'All Meals (AP)',
    'Private Sedan Car', 'Shared SUV Transport', 'Dedicated English Guide', 'Sightseeing Entry Passes', 
    'Restricted Area Permits', 'Driver Allowances & Tolls', 'Welcome Drink on Arrival'
  ];

  // Exclusions preset tags
  const exclusionPresets = [
    'Airfare / Train ticket costing', 'Lunch meals', 'Zero Point excursion charges', 'Nathula Pass permission surcharge',
    'Personal porter services', 'Laundry, drinks & mini bar', 'Travel and health insurance', 'Tips & gratuity to driver'
  ];

  const handleStepJump = (stepNum) => {
    // Basic verification: don't let jump ahead without typing fields
    if (stepNum > currentStep && !formData.title && currentStep === 1) {
      alert('Please fill the Package Title before moving forward.');
      return;
    }
    setCurrentStep(stepNum);
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.title) {
      alert('Package Title is required.');
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSubmit(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack();
    }
  };

  // Helper arrays update
  const handleCommaInput = (field, textValue) => {
    const list = textValue.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: list }));
  };

  const togglePresetItem = (field, item) => {
    let list = [...formData[field]];
    if (list.includes(item)) {
      list = list.filter(i => i !== item);
    } else {
      list.push(item);
    }
    setFormData(prev => ({ ...prev, [field]: list }));
  };

  // Itinerary helper update
  const updateItineraryDay = (dayIdx, updates) => {
    const list = [...formData.itinerary];
    list[dayIdx] = {
      ...list[dayIdx],
      ...updates
    };
    setFormData(prev => ({ ...prev, itinerary: list }));
  };

  const addSightseeingPoint = (dayIdx) => {
    const list = [...formData.itinerary];
    if (!list[dayIdx].sightseeingPoints) {
      list[dayIdx].sightseeingPoints = [];
    }
    list[dayIdx].sightseeingPoints.push({ name: '', description: '', image: '' });
    setFormData(prev => ({ ...prev, itinerary: list }));
  };

  const removeSightseeingPoint = (dayIdx, ptIdx) => {
    const list = [...formData.itinerary];
    list[dayIdx].sightseeingPoints.splice(ptIdx, 1);
    setFormData(prev => ({ ...prev, itinerary: list }));
  };

  const updateSightseeingPoint = (dayIdx, ptIdx, updates) => {
    const list = [...formData.itinerary];
    list[dayIdx].sightseeingPoints[ptIdx] = {
      ...list[dayIdx].sightseeingPoints[ptIdx],
      ...updates
    };
    setFormData(prev => ({ ...prev, itinerary: list }));
  };

  // Vehicle helpers update
  const addVehicleRow = () => {
    const list = [...formData.vehicles];
    list.push({ vehicleType: 'SUV', vehicleModel: '', b2bCost: 0, b2cCost: 0, availability: 'Available' });
    setFormData(prev => ({ ...prev, vehicles: list }));
  };

  const removeVehicleRow = (idx) => {
    const list = [...formData.vehicles];
    list.splice(idx, 1);
    setFormData(prev => ({ ...prev, vehicles: list }));
  };

  const updateVehicleRow = (idx, updates) => {
    const list = [...formData.vehicles];
    list[idx] = {
      ...list[idx],
      ...updates
    };
    setFormData(prev => ({ ...prev, vehicles: list }));
  };

  return (
    <motion.div
      key="wizard"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Top Breadcrumb details */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2.5 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            {isEditMode ? 'Modify Tour Package' : 'Create Sightseeing Package'}
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Step {currentStep} of {totalSteps} — {stepTitles[currentStep - 1]}
          </p>
        </div>
      </div>

      {/* Progress navigation bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {stepTitles.map((t, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
              <button
                key={idx}
                onClick={() => handleStepJump(stepNum)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow shadow-blue-500/20' : isCompleted ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20 border border-current text-[10px] font-extrabold">
                  {stepNum}
                </span>
                {t.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steps Editor Layout */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 1: General Package Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Package Title*</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Gangtok & North Sikkim Honeymoon Special"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Package Code ID (Auto-Generated if Blank)</label>
                <input
                  type="text"
                  value={formData.packageId}
                  onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                  placeholder="e.g. PKG-2001"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tour Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                >
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Leisure">Leisure</option>
                  <option value="Pilgrimage">Pilgrimage</option>
                  <option value="Honeymoon">Honeymoon</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Operational Region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                >
                  {regionsList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Destinations (Comma separated list)</label>
                <input
                  type="text"
                  value={formData.destinations.join(', ')}
                  onChange={(e) => handleCommaInput('destinations', e.target.value)}
                  placeholder="e.g. Gangtok, Lachen, Lachung, Gurudongmar"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Short Overview Description</label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="Summarize the core elements of the package tour..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Highlights (List format remarks, semicolon separated)</label>
                <textarea
                  rows={2}
                  value={formData.highlights}
                  onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                  placeholder="e.g. Sunrise at Tiger Hill; Gurudongmar high glacial lake tour; Rumtek heritage monastery..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Cover Image Photo URL</label>
                <input
                  type="text"
                  value={formData.coverPhoto}
                  onChange={(e) => setFormData({ ...formData, coverPhoto: e.target.value })}
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Gallery Photo URLs (Comma separated)</label>
                <input
                  type="text"
                  value={formData.galleryPhotos.join(', ')}
                  onChange={(e) => handleCommaInput('galleryPhotos', e.target.value)}
                  placeholder="Image URL 1, Image URL 2..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 2: Duration, Travel & Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nights Count*</label>
                <input
                  type="number"
                  value={formData.nightsCount}
                  onChange={(e) => setFormData({ ...formData, nightsCount: Number(e.target.value), daysCount: Number(e.target.value) + 1 })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Days Count*</label>
                <input
                  type="number"
                  value={formData.daysCount}
                  onChange={(e) => setFormData({ ...formData, daysCount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Standard Meal Plan Included</label>
                <select
                  value={formData.mealPlan}
                  onChange={(e) => setFormData({ ...formData, mealPlan: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                >
                  <option value="EP">EP (Room Only)</option>
                  <option value="CP">CP (Room + Breakfast)</option>
                  <option value="MAP">MAP (Room + Breakfast + Dinner)</option>
                  <option value="AP">AP (Room + All Meals)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Pickup Starting Point</label>
                <input
                  type="text"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  placeholder="e.g. Bagdogra Airport (IXB)"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Drop Return Point</label>
                <input
                  type="text"
                  value={formData.dropLocation}
                  onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                  placeholder="e.g. NJP Railway Station"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tour Scheduling Type</label>
                <select
                  value={formData.tourType}
                  onChange={(e) => setFormData({ ...formData, tourType: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                >
                  <option value="Custom">Customizable (Private Tour)</option>
                  <option value="Group">Fixed Group Tour (Shared Vehicle)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="isPrivate" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Private vehicle reserved for clients
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 3: Day-Wise Itinerary Builder</h3>
            <div className="space-y-4">
              {formData.itinerary.map((day, dIdx) => (
                <div key={dIdx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-650 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                      DAY {day.dayNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={day.mealPlan}
                        onChange={(e) => updateItineraryDay(dIdx, { mealPlan: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold focus:outline-none"
                      >
                        <option value="Breakfast">Breakfast Included</option>
                        <option value="MAP">MAP (Breakfast & Dinner)</option>
                        <option value="AP">AP (All Meals)</option>
                        <option value="None">No Meals</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Stay Destination Location</label>
                      <input
                        type="text"
                        value={day.stayLocation}
                        onChange={(e) => updateItineraryDay(dIdx, { stayLocation: e.target.value })}
                        placeholder="e.g. Lachen Hotel / Gangtok Hotel"
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Day description details</label>
                      <input
                        type="text"
                        value={day.description}
                        onChange={(e) => updateItineraryDay(dIdx, { description: e.target.value })}
                        placeholder="e.g. Travel to Gangtok via waterfall points and register hotel..."
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sightseeing points list */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Sightseeing Excursion Points</span>
                      <button
                        type="button"
                        onClick={() => addSightseeingPoint(dIdx)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={11} className="stroke-[2.5]" /> Add Point
                      </button>
                    </div>

                    <div className="space-y-2">
                      {day.sightseeingPoints?.map((pt, ptIdx) => (
                        <div key={ptIdx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start relative group">
                          <button
                            type="button"
                            onClick={() => removeSightseeingPoint(dIdx, ptIdx)}
                            className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <X size={12} className="stroke-[2.5]" />
                          </button>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pr-6">
                            <input
                              type="text"
                              value={pt.name}
                              onChange={(e) => updateSightseeingPoint(dIdx, ptIdx, { name: e.target.value })}
                              placeholder="Point Name (e.g. Batasia Loop)"
                              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                            <input
                              type="text"
                              value={pt.description}
                              onChange={(e) => updateSightseeingPoint(dIdx, ptIdx, { description: e.target.value })}
                              placeholder="Description"
                              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                            <input
                              type="text"
                              value={pt.image}
                              onChange={(e) => updateSightseeingPoint(dIdx, ptIdx, { image: e.target.value })}
                              placeholder="Photo URL"
                              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Section 4: Vehicle Daily Pricing Grid</h3>
              <button
                type="button"
                onClick={addVehicleRow}
                className="px-3 py-1.5 bg-slate-900 text-white font-bold text-[10px] rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={11} className="stroke-[2.5]" /> Add Vehicle Specs
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-550 border-b border-slate-100">
                    <th className="px-4 py-3">Vehicle Type</th>
                    <th className="px-4 py-3">Model Details</th>
                    <th className="px-4 py-3">B2B Daily Cost</th>
                    <th className="px-4 py-3">B2C Daily Cost</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {formData.vehicles.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/20">
                      <td className="px-4 py-2">
                        <select
                          value={v.vehicleType}
                          onChange={(e) => updateVehicleRow(idx, { vehicleType: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                        >
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="SUV Luxury">SUV Luxury</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Traveller">Tempo Traveller</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={v.vehicleModel}
                          onChange={(e) => updateVehicleRow(idx, { vehicleModel: e.target.value })}
                          placeholder="e.g. Innova Crysta / Dzire"
                          className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={v.b2bCost}
                          onChange={(e) => updateVehicleRow(idx, { b2bCost: Number(e.target.value) })}
                          className="w-24 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={v.b2cCost}
                          onChange={(e) => updateVehicleRow(idx, { b2cCost: Number(e.target.value) })}
                          className="w-24 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={v.availability}
                          onChange={(e) => updateVehicleRow(idx, { availability: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                        >
                          <option value="Available">Available</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeVehicleRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} className="stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.vehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-400 font-semibold">
                        No vehicle costs defined. Click "Add Vehicle" to create daily cost matrix.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 5: Select Package Inclusions</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {inclusionPresets.map(preset => {
                const isSelected = formData.inclusions.includes(preset);
                return (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => togglePresetItem('inclusions', preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected ? 'bg-emerald-50 border-emerald-250 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'}`}
                  >
                    {isSelected ? '✓ ' : '+ '} {preset}
                  </button>
                );
              })}
            </div>
            
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Custom Write-in Inclusions (Comma separated)</label>
              <input
                type="text"
                placeholder="Type additional inclusions, separated by commas..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                      const items = e.target.value.split(',').map(i => i.trim()).filter(Boolean);
                      setFormData(prev => ({
                        ...prev,
                        inclusions: [...new Set([...prev.inclusions, ...items])]
                      }));
                      e.target.value = '';
                    }
                  }
                }}
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400"
              />
              <span className="text-[10px] text-slate-400 font-semibold">Type custom items and press [Enter] to insert them above.</span>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 6: Select Package Exclusions</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {exclusionPresets.map(preset => {
                const isSelected = formData.exclusions.includes(preset);
                return (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => togglePresetItem('exclusions', preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected ? 'bg-rose-50 border-rose-250 text-rose-700 shadow-sm' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'}`}
                  >
                    {isSelected ? '✗ ' : '+ '} {preset}
                  </button>
                );
              })}
            </div>
            
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Custom Write-in Exclusions (Comma separated)</label>
              <input
                type="text"
                placeholder="Type additional exclusions, separated by commas..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.target.value.trim()) {
                      const items = e.target.value.split(',').map(i => i.trim()).filter(Boolean);
                      setFormData(prev => ({
                        ...prev,
                        exclusions: [...new Set([...prev.exclusions, ...items])]
                      }));
                      e.target.value = '';
                    }
                  }
                }}
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400"
              />
              <span className="text-[10px] text-slate-400 font-semibold">Type custom items and press [Enter] to insert them above.</span>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 7: Package Pricing Sheets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">B2C Standard Base Price (₹)*</label>
                <input
                  type="number"
                  value={formData.b2cPrice}
                  onChange={(e) => setFormData({ ...formData, b2cPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">B2B Agent Base Price (₹)*</label>
                <input
                  type="number"
                  value={formData.b2bPrice}
                  onChange={(e) => setFormData({ ...formData, b2bPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Extra Person Rate (₹)</label>
                <input
                  type="number"
                  value={formData.extraPersonPrice}
                  onChange={(e) => setFormData({ ...formData, extraPersonPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Child Rate (no bed) (₹)</label>
                <input
                  type="number"
                  value={formData.childPrice}
                  onChange={(e) => setFormData({ ...formData, childPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tax Percentage (%)</label>
                <input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Peak-Season Price (₹)</label>
                <input
                  type="number"
                  value={formData.peakPrice}
                  onChange={(e) => setFormData({ ...formData, peakPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Off-Season Price (₹)</label>
                <input
                  type="number"
                  value={formData.offPrice}
                  onChange={(e) => setFormData({ ...formData, offPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col justify-end gap-1.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold text-blue-500 uppercase">Offer booking rate (Calculated)</span>
                <span className="text-lg font-extrabold text-blue-750">₹{formData.offerPrice?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Section 8: Final Configuration Audit & Save</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Package Author Name</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  placeholder="e.g. Super Admin"
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Publishing status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none transition-colors"
                >
                  <option value="Active">Active (Publish Online)</option>
                  <option value="Draft">Draft (Offline Edit Mode)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">System Audit Notes</label>
                <textarea
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Record why this change was made or author remarks log..."
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-100 focus:border-slate-200 rounded-xl focus:outline-none placeholder-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 mt-4">
              <Info size={16} className="text-slate-450 mt-0.5" />
              <div className="text-xs text-slate-500 leading-relaxed font-semibold">
                <span className="font-bold text-slate-700 block">Delete Validation Rule Warning</span>
                Once published as "Active", any booking transactions generated referencing this package block it from being deleted. Verify pricing grids thoroughly.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Buttons bar */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          onClick={handleBack}
          className="px-4 py-2.5 bg-white border border-slate-150 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          {currentStep === 1 ? 'Cancel' : 'Back Step'}
        </button>

        <button
          onClick={handleNext}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {currentStep === totalSteps ? (isEditMode ? 'Update Package' : 'Publish Package') : 'Next Step'}
        </button>
      </div>
    </motion.div>
  );
}

// =========================================================================
// SUB-COMPONENT: ITINERARY PRINT PREVIEW
// =========================================================================
function ItineraryPreview({ pkg, onBack }) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white border border-slate-100 rounded-2xl p-6 shadow-md max-w-3xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0"
    >
      {/* Header controls bar (hidden in print) */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
        <button
          onClick={onBack}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft size={13} className="stroke-[2.5]" />
          Return to Details
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Printer size={13} className="stroke-[2.5]" />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Voucher Voucher Layout */}
      <div className="space-y-6">
        {/* Banner with Title overlay */}
        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] border border-slate-100 shadow-inner bg-slate-100">
          <img
            src={pkg.coverPhoto || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'}
            alt={pkg.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent flex flex-col justify-end p-6">
            <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded w-fit mb-1.5 tracking-wider uppercase">
              {pkg.category} Package Voucher
            </span>
            <h2 className="text-white text-lg sm:text-xl font-extrabold tracking-tight">
              {pkg.title}
            </h2>
            <p className="text-slate-350 text-[10px] font-semibold mt-1">
              Tour Code: {pkg.packageId} • Duration: {pkg.nightsCount} Nights / {pkg.daysCount} Days
            </p>
          </div>
        </div>

        {/* Short Summary details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl text-xs font-semibold text-slate-650">
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Starting Pickup</span>
            <span className="text-slate-800 font-bold">{pkg.pickupLocation}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Return Drop</span>
            <span className="text-slate-800 font-bold">{pkg.dropLocation}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Meal Plan</span>
            <span className="text-slate-850 font-bold">{pkg.mealPlan} Plan</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase">Tour Nature</span>
            <span className="text-slate-850 font-bold">{pkg.tourType} {pkg.isPrivate ? '(Private)' : '(Shared)'}</span>
          </div>
        </div>

        {/* Itinerary timeline segment */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 pb-2">
            Detailed Day-Wise Itinerary Plan
          </h3>
          <div className="space-y-4 pl-3">
            {pkg.itinerary?.map((day, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-850">
                  <span>DAY {day.dayNumber} — Stay in {day.stayLocation}</span>
                  <span className="text-[9px] font-bold text-slate-400">Meals: {day.mealPlan}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {day.description}
                </p>
                {day.sightseeingPoints && day.sightseeingPoints.length > 0 && (
                  <div className="text-[10px] text-blue-600 font-bold flex gap-1.5 flex-wrap pt-0.5">
                    Sightseeing: {day.sightseeingPoints.map(p => p.name).join(' • ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vehicles Matrix details */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100 pb-2">
            Approved Vehicle pricing matrix
          </h3>
          <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                  <th className="px-4 py-2.5">Vehicle category</th>
                  <th className="px-4 py-2.5">Model Specification</th>
                  <th className="px-4 py-2.5 text-right">Standard cost (B2C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                {pkg.vehicles?.map((v, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 font-bold text-slate-800">{v.vehicleType}</td>
                    <td className="px-4 py-2">{v.vehicleModel}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800">₹{v.b2cCost?.toLocaleString()} / Day</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inclusions Exclusions checklists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-emerald-650 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Service Inclusions
            </h4>
            <div className="space-y-1">
              {pkg.inclusions?.map((inc, index) => (
                <div key={index} className="flex gap-2 text-xs font-medium text-slate-650">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{inc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-rose-650 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Service Exclusions
            </h4>
            <div className="space-y-1">
              {pkg.exclusions?.map((exc, index) => (
                <div key={index} className="flex gap-2 text-xs font-medium text-slate-650">
                  <span className="text-rose-400 font-bold">✗</span>
                  <span>{exc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Standard Terms and Conditions */}
        <div className="border-t border-slate-100 pt-5 space-y-2 text-[10px] leading-relaxed text-slate-400 font-medium">
          <span className="font-bold text-slate-500 uppercase tracking-wider block text-[9px]">
            General Tour Terms & Policy
          </span>
          <p>
            1. All high-altitude permits (such as Nathula Pass, Gurudongmar Lake) are subject to weather permits and availability clearance by the Army.
          </p>
          <p>
            2. Cancellation charges follow standard package slabs: 30 days prior - 15%, 15-29 days - 50%, less than 15 days - 100% loss.
          </p>
          <p>
            3. Meal plan inclusions begin with dinner on arrival night and conclude with breakfast on departure morning unless specified otherwise.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Simple local Info icon component since it is needed
function Info({ size = 16, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
