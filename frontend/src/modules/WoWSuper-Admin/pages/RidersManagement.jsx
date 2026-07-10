import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Check, 
  User, 
  Mail, 
  Phone, 
  Home, 
  CreditCard, 
  X,
  FileText,
  Star,
  ChevronRight,
  PhoneCall,
  Send,
  AlertTriangle,
  Award,
  ShieldCheck,
  Percent,
  Trash,
  CarFront,
  Car,
  TrendingUp,
  MapPin,
  Map,
  SlidersHorizontal,
  ChevronLeft,
  Info,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Download
} from 'lucide-react';

const API_RIDERS_URL = 'https://wow-getway-api.onrender.com/api/dashboard/riders';

const mockRidersList = [
  {
    id: 'DRV1001',
    name: 'Amit Sharma',
    email: 'amit.s@gmail.com',
    mobile: '+91 98765 43210',
    vehicle: {
      model: 'Hero Splendor +',
      vehicleNumber: 'WB74A1234',
      vehicleType: 'Bike'
    },
    status: 'Active',
    availability: 'Online',
    rating: 4.8,
    joinedDate: '15 Jan 2024'
  },
  {
    id: 'DRV1002',
    name: 'Rahul Das',
    email: 'rahul.das@email.com',
    mobile: '+91 87654 32109',
    vehicle: {
      model: 'TVS Jupiter',
      vehicleNumber: 'WB74B5678',
      vehicleType: 'Scooter'
    },
    status: 'Active',
    availability: 'Online',
    rating: 4.6,
    joinedDate: '18 Mar 2024'
  },
  {
    id: 'DRV1004',
    name: 'Pawan Chettri',
    email: 'pawan.c@email.com',
    mobile: '+91 89670 56432',
    vehicle: {
      model: 'Maruti Swift Dzire',
      vehicleNumber: 'WB74D3456',
      vehicleType: 'Sedan'
    },
    status: 'On Ride',
    availability: 'Busy',
    rating: 4.9,
    joinedDate: '20 Jun 2024'
  }
];

const singleRiderDetail = {
  id: 'DRV1001',
  name: 'Amit Sharma',
  badge: 'ACTIVE',
  role: 'Senior Tour Package Driver',
  mobile: '+91 98765 43210',
  email: 'amit.sharma@gmail.com',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  stats: {
    totalRides: '1,452',
    rating: '4.85',
    joinDate: '12 Jan 2024',
    lastActive: 'Today, 09:15 AM'
  },
  personalDetails: {
    fullName: 'Amit Sharma',
    dob: '15 Aug 1995',
    gender: 'Male',
    address: 'Pradhan Nagar, Siliguri, West Bengal - 734003'
  },
  vehicle: {
    model: 'Swift Dzire (Sedan)',
    vehicleNumber: 'WB74A1234',
    fuelType: 'Petrol + CNG',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300'
  },
  rideSummary: {
    completed: 42,
    cancelled: '4.2%',
    efficiency: '92%'
  },
  earnings: '24,850',
  documents: [
    { type: 'Driving License', reference: 'WB25 20200012345', expiry: '15 Dec 2026', status: 'Verified' },
    { type: 'Vehicle Insurance', reference: 'INS/2024/1123456', expiry: '20 Jun 2024 (Expiring)', status: 'Action Required' },
    { type: 'Registration Certificate (RC)', reference: 'WB74A1234-RC', expiry: '10 Jan 2030', status: 'Verified' }
  ],
  feedback: {
    average: '4.8',
    totalReviews: 948,
    reviews: [
      { author: 'Sneha Kapoor', rating: 5, date: '12 May 2024', comment: 'Amit was very professional and knew the local routes perfectly. The car was spotless and he was very courteous throughout the long tour.' },
      { author: 'Vikram Mehra', rating: 5, date: '08 May 2024', comment: 'Very safe driver. Reached the destination on time. Highly recommended for family trips.' }
    ]
  }
};

export default function RidersManagement() {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  let viewMode = 'list';
  if (location.pathname === '/riders/add') {
    viewMode = 'add';
  } else if (location.pathname.startsWith('/riders/edit/')) {
    viewMode = 'edit';
  } else if (id) {
    viewMode = 'details';
  }

  // Local state fallbacks
  const [riders, setRiders] = useState(mockRidersList);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('For Riders'); // 'For Riders' | 'For Parcel' | 'For Tour Packages'
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');

  // React Query Fetchers (Optional, falling back to local mocks if not available)
  const { data: serverRiders = [] } = useQuery({
    queryKey: ['serverRiders'],
    queryFn: async () => {
      const response = await axios.get(API_RIDERS_URL);
      return response.data;
    },
    retry: false
  });

  const { data: riderDetails } = useQuery({
    queryKey: ['riderDetails', id],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDERS_URL}/${id}`);
      return response.data;
    },
    enabled: !!id,
    retry: false
  });

  const mergedRiders = serverRiders.length > 0 ? serverRiders : riders;

  const getRiderName = (r) => {
    if (!r) return 'N/A';
    if (r.name) return r.name;
    return `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'N/A';
  };

  const getRiderId = (r) => {
    if (!r) return 'N/A';
    return r.id || r._id || 'N/A';
  };

  const filteredRiders = mergedRiders.filter(rider => {
    const rName = getRiderName(rider);
    const rId = getRiderId(rider);
    const rMobile = rider.mobile || '';
    
    const matchesSearch = rName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rMobile.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || rider.status === statusFilter;
    
    const vehicleType = rider.vehicle?.vehicleType || '';
    const matchesVehicle = vehicleTypeFilter === 'All' || vehicleType.toLowerCase().includes(vehicleTypeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  // Calculate totals
  const totalRidersCount = mergedRiders.length + 253; // to match 256 in mockup
  const activeRidersCount = 198;
  const busyRidersCount = 26;
  const offlineRidersCount = 28;
  const suspendedRidersCount = 4;
  const todayJoinedCount = 6;

  return (
    <div className="space-y-6 select-none animate-fade-in pb-16">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Driver Management</h1>
              {/* Breadcrumbs */}
              <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">
                Dashboard &gt; Drivers &gt; <span className="text-red-500">Manage Drivers</span>
              </p>
            </div>
            
            {/* Tabs for Dispatch types */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
              {['For Riders', 'For Parcel', 'For Tour Packages'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    activeSubTab === tab 
                      ? 'bg-white text-slate-850 shadow-sm border border-slate-205/10' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-650 flex items-center justify-center flex-shrink-0">
                <User size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Drivers</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">{totalRidersCount}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">ALL TIME</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Active Drivers</span>
                <span className="text-lg font-black text-emerald-600 block mt-0.5 font-sans leading-none">{activeRidersCount}</span>
                <span className="text-[8px] font-black text-emerald-650 uppercase tracking-widest block mt-1">77.34% OF TOTAL</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center flex-shrink-0">
                <Car size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">On Ride / Busy</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">{busyRidersCount}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">CURRENTLY ON RIDE</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Offline</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">{offlineRidersCount}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">NOT ACTIVE</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-655 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Suspended</span>
                <span className="text-lg font-black text-rose-600 block mt-0.5 font-sans leading-none">{suspendedRidersCount}</span>
                <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest block mt-1">ACTION REQUIRED</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Today Joined</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">{todayJoinedCount}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">NEW DRIVERS TODAY</span>
              </div>
            </div>

          </div>

          {/* Filters, Banner & Columns split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT 9 COLUMNS: DRIVERS TABLE */}
            <div className="lg:col-span-9 space-y-4">
              
              {/* Filter controls row */}
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="On Ride">On Ride</option>
                  </select>

                  <select
                    value={vehicleTypeFilter}
                    onChange={(e) => setVehicleTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
                  >
                    <option value="All">All Vehicle Types</option>
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Sedan">Sedan</option>
                  </select>

                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
                  >
                    <option value="All">All Availability</option>
                    <option value="Online">Online</option>
                    <option value="Busy">Busy</option>
                  </select>

                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
                  >
                    <option value="All">All Cities</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Noida">Noida</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, mobile, driver ID..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">
                      <SlidersHorizontal size={13} />
                      <span>More Filters</span>
                    </button>
                    <button
                      onClick={() => navigate('/riders/add')}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Add New Driver</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expiring Documents Banner */}
              <div className="bg-rose-50/40 border border-rose-100 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-2.5 items-start">
                  <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg mt-0.5">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">Expiring Soon</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Filter drivers by nearest driving license or vehicle insurance document expiration.</p>
                  </div>
                </div>

                <div className="flex gap-2 self-stretch sm:self-auto">
                  <button className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-rose-200 text-rose-700 text-[10px] font-black rounded-lg cursor-pointer">
                    Nearest First
                  </button>
                  <button className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-rose-200 text-rose-700 text-[10px] font-black rounded-lg cursor-pointer">
                    Within 90 Days
                  </button>
                  <button className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 text-[10px] font-black rounded-lg cursor-pointer">
                    Reset
                  </button>
                </div>
              </div>

              {/* Table Card */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-6 w-10">
                          <input type="checkbox" className="rounded border-slate-200" />
                        </th>
                        <th className="py-3 px-6">Driver Details</th>
                        <th className="py-3 px-6">Vehicle Information</th>
                        <th className="py-3 px-6">Contact</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6">Availability</th>
                        <th className="py-3 px-6">Rating</th>
                        <th className="py-3 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {filteredRiders.map(rider => {
                        const riderId = getRiderId(rider);
                        const riderName = getRiderName(rider);
                        return (
                          <tr key={riderId} className="hover:bg-slate-50/20 transition-colors">
                            <td className="py-4.5 px-6">
                              <input type="checkbox" className="rounded border-slate-200" />
                            </td>
                            
                            {/* Driver Details */}
                            <td className="py-4.5 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400 font-extrabold uppercase text-[10px]">
                                  {riderName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-800 block">{riderName}</span>
                                  <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider mt-0.5">ID: {riderId}</span>
                                </div>
                              </div>
                            </td>

                            {/* Vehicle Information */}
                            <td className="py-4.5 px-6">
                              <div className="flex items-center gap-2">
                                <Car size={13} className="text-slate-400" />
                                <div>
                                  <span className="font-bold text-slate-805 block">{rider.vehicle?.model || 'N/A'}</span>
                                  <span className="text-[9px] text-slate-450 block mt-0.5 font-bold font-mono">{rider.vehicle?.vehicleNumber || 'N/A'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="py-4.5 px-6 space-y-0.5 text-[11px]">
                              <span className="font-bold text-slate-750 block">{rider.mobile || 'N/A'}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block">{rider.email || 'N/A'}</span>
                            </td>

                            {/* Status */}
                            <td className="py-4.5 px-6">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border inline-block ${
                                rider.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {rider.status || 'Inactive'}
                              </span>
                            </td>

                            {/* Availability */}
                            <td className="py-4.5 px-6">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  rider.availability === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`} />
                                <span className="font-bold text-slate-750">{rider.availability || 'Offline'}</span>
                              </span>
                            </td>

                            {/* Rating */}
                            <td className="py-4.5 px-6">
                              <div className="flex items-center gap-1 font-bold">
                                <Star size={11} className="text-amber-500 fill-amber-500" />
                                <span>{rider.rating || '0.0'}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-4.5 px-6 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => navigate(`/riders/${riderId}`)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-all"
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => navigate(`/riders/edit/${riderId}`)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all"
                                  title="Edit Driver"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-slate-50 px-6 py-4 flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Showing 1 to {filteredRiders.length} of {filteredRiders.length} drivers</span>
                  <div className="flex items-center gap-1.5">
                    <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                      <ChevronLeft size={14} />
                    </button>
                    <button className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-blue-100">1</button>
                    <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT 3 COLUMNS: DRIVER SUMMARY DONUT CHART & SUPPORT (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Donut Chart Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2 text-center w-full">
                  Driver Summary
                </span>

                {/* SVG Donut Chart */}
                <div className="relative w-40 h-40 flex items-center justify-center mt-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Circle Background */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    {/* Segment 1: Active (77.3%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" 
                      strokeDasharray="251.2" strokeDashoffset="57" strokeLinecap="round" />
                    {/* Segment 2: Busy (10.2%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="12" 
                      strokeDasharray="251.2" strokeDashoffset="225" />
                    {/* Segment 3: Offline (10.9%) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="12" 
                      strokeDasharray="251.2" strokeDashoffset="250" />
                  </svg>
                  
                  {/* Central Text */}
                  <div className="absolute text-center">
                    <span className="text-2xl font-black text-slate-850 font-sans block leading-none">256</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mt-1">TOTAL</span>
                  </div>
                </div>

                {/* Donut Chart Legend */}
                <div className="w-full space-y-2.5 text-[10px] font-extrabold uppercase text-slate-655 pt-2 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      Active
                    </span>
                    <span className="font-mono text-slate-800">198 (77.3%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                      On Ride / Busy
                    </span>
                    <span className="font-mono text-slate-800">26 (10.2%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                      Offline
                    </span>
                    <span className="font-mono text-slate-800">28 (10.9%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                      Suspended
                    </span>
                    <span className="font-mono text-slate-800">4 (1.6%)</span>
                  </div>
                </div>
              </div>

              {/* Support Card */}
              <div className="bg-blue-50/10 border border-blue-100 p-5 rounded-2xl shadow-sm text-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm shadow-blue-50/50">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Need Help?</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">View help guide or contact support for driver onboarding issues.</p>
                </div>
                <button
                  onClick={() => alert('Opening Support Desk...')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm text-center"
                >
                  Visit Help Center
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 2. RIDER DETAILS VIEW */}
      {viewMode === 'details' && (() => {
        const displayRider = riderDetails || singleRiderDetail;
        const riderId = getRiderId(displayRider);
        const riderName = getRiderName(displayRider);
        const riderEmail = displayRider.email || 'N/A';
        const riderMobile = displayRider.mobile || 'N/A';
        const riderRole = displayRider.role || 'Senior Tour Package Driver';
        const riderBadge = displayRider.status || 'Active';
        const riderPhoto = displayRider.photo || displayRider.documents?.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';
        
        // Stats
        const totalRidesVal = displayRider.stats?.totalRides || '1,452';
        const ratingVal = displayRider.stats?.rating || displayRider.rating || '4.8';
        const joinDateVal = displayRider.stats?.joinDate || (displayRider.joinedDate ? new Date(displayRider.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '12 Jan 2024');
        const lastActiveVal = displayRider.stats?.lastActive || 'Today, 09:15 AM';

        // Personal
        const fullNameVal = displayRider.personalDetails?.fullName || riderName;
        const dobVal = displayRider.personalDetails?.dob || displayRider.dob || '15 Aug 1995';
        const genderVal = displayRider.personalDetails?.gender || displayRider.gender || 'Male';
        const addressVal = displayRider.personalDetails?.address || 
          (displayRider.permAddress ? `${displayRider.permAddress.line1 || ''}, ${displayRider.permAddress.city || ''}, ${displayRider.permAddress.state || ''} - ${displayRider.permAddress.pinCode || ''}` : 'Pradhan Nagar, Siliguri, West Bengal - 734003');

        // Vehicle
        const vModel = displayRider.vehicle?.model || 'Swift Dzire (Sedan)';
        const vNumber = displayRider.vehicle?.vehicleNumber || 'WB74A1234';
        const vFuel = displayRider.vehicle?.fuelType || 'Petrol + CNG';
        const vImage = displayRider.vehicle?.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300';

        // Docs
        const docsList = displayRider.documents && Array.isArray(displayRider.documents)
          ? displayRider.documents
          : [
              { type: 'Driving License', reference: displayRider.drivingLicenseNo || 'WB25 20200012345', expiry: '15 Dec 2026', status: displayRider.documents?.drivingLicense === 'Verified' ? 'Verified' : 'Verified' },
              { type: 'Vehicle Insurance', reference: 'INS/2024/1123456', expiry: '20 Jun 2024 (Expiring)', status: 'Action Required' },
              { type: 'Registration Certificate (RC)', reference: displayRider.vehicle?.vehicleNumber ? `${displayRider.vehicle.vehicleNumber}-RC` : 'WB74A1234-RC', expiry: '10 Jan 2030', status: displayRider.documents?.rcBook === 'Verified' ? 'Verified' : 'Verified' }
            ];

        return (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header Row */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/riders')}
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Driver Management</span>
              </button>

              <div className="relative w-72">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search riders, plates, or documents..."
                  readOnly
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <img src={riderPhoto} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md shadow-slate-100" alt="" />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-black text-slate-805 tracking-tight leading-none">{riderName}</h1>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none border ${
                      riderBadge === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {riderBadge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1.5">
                    {riderRole} • {riderId}
                  </p>
                  <div className="flex gap-2.5 text-[10px] font-semibold text-slate-500 mt-2">
                    <span className="flex items-center gap-0.5"><Phone size={10} className="text-slate-400" /> {riderMobile}</span>
                    <span className="flex items-center gap-0.5"><Mail size={10} className="text-slate-400" /> {riderEmail}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto border-t md:border-none pt-3 md:pt-0">
                <button
                  onClick={() => navigate(`/riders/edit/${riderId}`)}
                  className="flex-1 md:flex-initial px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => alert('Block rider trigger dispatched.')}
                  className="flex-1 md:flex-initial px-4 py-2 bg-slate-50 hover:bg-rose-50 border border-rose-100 text-rose-755 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  Block Driver
                </button>
                <button
                  onClick={() => alert('Assign task trigger overlay.')}
                  className="flex-1 md:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-md shadow-blue-250 transition-all cursor-pointer text-center"
                >
                  Assign Task
                </button>
              </div>
            </div>

            {/* Metric Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Rides</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">{totalRidesVal}</span>
                <span className="text-[8px] font-bold text-emerald-600 block mt-1.5 uppercase leading-none">+ 12% FROM LAST MONTH</span>
              </div>
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Avg. Rating</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none flex items-center gap-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span>{ratingVal}</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 block mt-1.5 uppercase leading-none">BASED ON 948 REVIEWS</span>
              </div>
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Join Date</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">{joinDateVal}</span>
                <span className="text-[8px] font-bold text-slate-400 block mt-1.5 uppercase leading-none">TENURED PARTNER</span>
              </div>
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">{lastActiveVal}</span>
                <span className="text-[8px] font-black text-emerald-600 block mt-1.5 uppercase leading-none">CURRENTLY ONLINE</span>
              </div>
            </div>

            {/* Sub Navigation Tabs */}
            <div className="border-b border-slate-100 pb-1 flex gap-6">
              {['Overview', 'Ride History', 'Documents (1)', 'Earnings', 'Activity Log'].map(tab => (
                <button
                  key={tab}
                  className={`pb-2.5 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                    tab === 'Overview' 
                      ? 'border-blue-600 text-slate-850' 
                      : 'border-transparent text-slate-400 hover:text-slate-655'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Dual Columns Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: INFO & VEHICLE CARD */}
              <div className="space-y-6">
                
                {/* Rider Details Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                    Rider Details
                  </span>

                  <div className="space-y-3.5 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-405">Full Name</span>
                      <span className="font-bold text-slate-850">{fullNameVal}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-405">Date of Birth</span>
                      <span className="text-slate-800">{dobVal}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-405">Gender</span>
                      <span className="text-slate-800">{genderVal}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5 items-start">
                      <span className="text-slate-450 mt-0.5">Permanent Address</span>
                      <span className="text-slate-800 text-right max-w-[240px] font-bold leading-normal">
                        {addressVal}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                    Vehicle Information
                  </span>

                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <img src={vImage} className="w-48 h-32 rounded-xl object-cover border border-slate-150 shadow-sm bg-slate-50 flex-shrink-0" alt="" />
                    
                    <div className="w-full space-y-3.5 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model</span>
                        <span className="font-bold text-slate-800">{vModel}</span>
                      </div>
                      
                      <div className="flex justify-between border-t border-slate-50 pt-2.5">
                        <span className="text-slate-400">Plate Number</span>
                        <span className="font-bold text-blue-650 font-mono">{vNumber}</span>
                      </div>

                      <div className="flex justify-between border-t border-slate-50 pt-2.5">
                        <span className="text-slate-400">Fuel Type</span>
                        <span className="text-slate-800">{vFuel}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: MAP LOCATION, RIDES & EARNINGS TREND */}
              <div className="space-y-6">
                
                {/* Mock Google Map for Rider location */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Live Location
                    </span>
                    <button 
                      onClick={() => alert('Displaying full map dispatch interface...')}
                      className="text-[9px] font-black text-blue-650 uppercase tracking-wide cursor-pointer hover:underline"
                    >
                      Expand Full Map
                    </button>
                  </div>

                  <div className="h-44 bg-[#f8fafc] relative flex items-center justify-center overflow-hidden">
                    {/* Simplistic stylized map canvas lines */}
                    <svg className="absolute inset-0 w-full h-full text-slate-200" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="#f1f5f9" />
                      <path d="M 0 100 H 600" fill="none" stroke="#cbd5e1" strokeWidth="8" />
                      <path d="M 0 100 H 600" fill="none" stroke="#ffffff" strokeWidth="4" />
                      <path d="M 300 0 V 200" fill="none" stroke="#cbd5e1" strokeWidth="8" />
                      <path d="M 300 0 V 200" fill="none" stroke="#ffffff" strokeWidth="4" />
                      <path d="M 120 40 L 400 160" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 4" />
                    </svg>

                    {/* Pin Marker */}
                    <div className="absolute left-[290px] top-[80px] z-10 animate-bounce">
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg shadow-blue-200">
                        <MapPin size={16} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ride Summary & Earnings mini trend */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Ride Summary */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ride Summary</span>
                      <span className="bg-slate-50 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">This Week</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Completed</span>
                        <span className="text-base font-black text-slate-805 block mt-1 font-sans">{displayRider.rideSummary?.completed || '42'}</span>
                        <span className="text-[7px] text-slate-400 font-bold block mt-1 uppercase">Rides</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cancelled</span>
                        <span className="text-base font-black text-rose-600 block mt-1 font-sans">{displayRider.rideSummary?.cancelled || '4.2%'}</span>
                        <span className="text-[7px] text-slate-400 font-bold block mt-1 uppercase">Rate</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">No Show</span>
                        <span className="text-base font-black text-emerald-600 block mt-1 font-sans">{displayRider.rideSummary?.efficiency || '92%'}</span>
                        <span className="text-[7px] text-slate-400 font-bold block mt-1 uppercase">Efficiency</span>
                      </div>
                    </div>
                  </div>

                  {/* Earnings Overview */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings Overview</span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        +18%
                      </span>
                    </div>

                    <div className="flex justify-between items-end pt-2 flex-1">
                      <div>
                        <span className="text-xl font-black text-slate-850 font-sans leading-none block">₹{displayRider.earnings || '24,850'}</span>
                        <span className="text-[8px] text-slate-400 font-bold block mt-1.5">TOTAL NET EARNINGS THIS MONTH</span>
                      </div>

                      {/* Miniature sparkline graph */}
                      <div className="w-20 h-10 flex items-end">
                        <svg className="w-full h-full text-blue-600" viewBox="0 0 100 40">
                          <path d="M 0 35 Q 25 10, 50 25 T 100 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* 3. DOCUMENT COMPLIANCE CHECKLIST */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="border-b border-slate-50 px-6 py-4.5 flex justify-between items-center bg-slate-50/30">
                <span className="text-xs font-black text-slate-805 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck size={14} className="text-blue-500" />
                  Document Compliance
                </span>
                <button 
                  onClick={() => alert('All uploaded documents approved successfully!')}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg cursor-pointer"
                >
                  Verify All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                      <th className="py-2.5 px-6">Document Type</th>
                      <th className="py-2.5 px-6">Reference Number</th>
                      <th className="py-2.5 px-6">Expiry Date</th>
                      <th className="py-2.5 px-6">Status</th>
                      <th className="py-2.5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {docsList.map((doc, idx) => {
                      const isExpiring = doc.status === 'Action Required';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-3.5 px-6">{doc.type}</td>
                          <td className="py-3.5 px-6 font-mono text-[10px]">{doc.reference}</td>
                          <td className={`py-3.5 px-6 font-semibold ${isExpiring ? 'text-rose-500 font-black' : 'text-slate-655'}`}>
                            {doc.expiry}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block border ${
                              doc.status === 'Verified' || doc.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex justify-center gap-2">
                              <button className="p-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer" title="View Document">
                                <Eye size={13} />
                              </button>
                              <button className="p-1 text-slate-450 hover:text-slate-655 transition-all cursor-pointer" title="Download copy">
                                <Download size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. RECENT FEEDBACK REVIEWS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Rating breakdown chart card (lg:col-span-1) */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-850 font-sans block leading-none">{ratingVal}</span>
                  <div className="flex items-center justify-center gap-0.5 mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={15} className="text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase mt-2.5 tracking-wider block">
                    Total {displayRider.feedback?.totalReviews || '948'} Ratings
                  </span>
                </div>

                {/* Star breakdown bars */}
                <div className="w-full space-y-1.5 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-550">
                    <span className="w-3">5</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-550">
                    <span className="w-3">4</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-550">
                    <span className="w-3">3</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '4%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback List (lg:col-span-2) */}
              <div className="lg:col-span-2 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">
                  Recent Feedback
                </span>

                <div className="space-y-4 divide-y divide-slate-50">
                  {(displayRider.feedback?.reviews || singleRiderDetail.feedback.reviews).map((rev, index) => (
                    <div key={index} className={`pt-3.5 ${index === 0 ? 'pt-0' : ''}`}>
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-[11px] block">{rev.author}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: rev.rating }).map((_, s) => (
                              <Star key={s} size={9} className="text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{rev.date}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-2 font-medium leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Toast Notification Alert */}
            <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-800 text-white rounded-2xl px-4.5 py-3 shadow-xl flex items-center justify-between gap-6 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-200 z-50">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-xs font-bold">Changes saved successfully.</span>
              </div>
              <button className="text-slate-400 hover:text-white cursor-pointer" onClick={() => alert('Toast closed.')}>
                <X size={14} />
              </button>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
