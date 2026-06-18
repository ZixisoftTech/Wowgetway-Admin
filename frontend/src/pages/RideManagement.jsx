import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Route,
  MapPin,
  Star,
  ChevronRight,
  Info,
  PhoneCall,
  Send,
  Share2,
  Car
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';

const API_RIDES_URL = 'https://wow-getway-api.onrender.com/api/dashboard/rides';

export default function RideManagement() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'details'
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rideTypeFilter, setRideTypeFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  
  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetRideId, setTargetRideId] = useState(null);

  // 1. Fetch Rides List
  const { data: ridesList = [], isLoading: listLoading } = useQuery({
    queryKey: ['ridesList', searchQuery, statusFilter, rideTypeFilter, paymentStatusFilter],
    queryFn: async () => {
      const response = await axios.get(API_RIDES_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          rideType: rideTypeFilter,
          paymentStatus: paymentStatusFilter
        }
      });
      return response.data;
    }
  });

  // 2. Fetch Stats
  const { data: stats = { totalRidesToday: 0, ongoingRides: 0, upcomingRides: 0, completedRides: 0, cancelledRides: 0, totalRevenueToday: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['ridesStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDES_URL}/stats`);
      return response.data;
    }
  });

  // 3. Fetch Single Ride Details
  const { data: rideDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['rideDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDES_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId && viewMode === 'details'
  });

  // 4. Fetch Drivers List (for allocation modal)
  const { data: driversList = [] } = useQuery({
    queryKey: ['driversListSimple'],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDES_URL}/drivers`);
      return response.data;
    }
  });

  // 5. Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_RIDES_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ridesList']);
      queryClient.invalidateQueries(['ridesStats']);
      if (selectedId) {
        queryClient.invalidateQueries(['rideDetails', selectedId]);
      }
      setAssignModalOpen(false);
      setTargetRideId(null);
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update ride operational state.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_RIDES_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ridesList']);
      queryClient.invalidateQueries(['ridesStats']);
      setViewMode('list');
      setSelectedId(null);
      alert('Ride removed from operational desk.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete ride.');
    }
  });

  const handleAssignDriver = (rideId) => {
    setTargetRideId(rideId);
    setAssignModalOpen(true);
  };

  const handleConfirmDriverAllocation = (driverId) => {
    updateMutation.mutate({
      id: targetRideId || selectedId,
      updatedData: { assignDriverId: driverId }
    });
  };

  const handleCancelRide = (rideId) => {
    if (window.confirm('Are you sure you want to cancel this ride request?')) {
      updateMutation.mutate({
        id: rideId,
        updatedData: { status: 'Cancelled' }
      });
    }
  };

  const handleMarkCompleted = (rideId) => {
    if (window.confirm('Are you sure you want to mark this ride as completed?')) {
      updateMutation.mutate({
        id: rideId,
        updatedData: { status: 'Completed' }
      });
    }
  };

  const handleShareTrackingLink = (id) => {
    const link = `https://wowgateways.resorts/tracking/ride/${id}`;
    navigator.clipboard.writeText(link);
    alert(`Live Uber-style tracking link copied to clipboard:\n${link}`);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Upcoming':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Completed':
        return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const getPaymentStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const layoutVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. LIST & DASHBOARD VIEW */}
      {viewMode === 'list' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                <Route className="text-sky-600 w-6 h-6 stroke-[2.5]" />
                <span>Ride Management</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Dispatch operations desk: track guest transports, live vehicle routes, and driver logs.
              </p>
            </div>
          </div>

          {/* Top KPI Metrics Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              title="Total Rides Today"
              value={stats.totalRidesToday}
              icon={Route}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-600"
              bgColor="bg-[#edf4ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Ongoing Trips"
              value={stats.ongoingRides}
              icon={Clock}
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-650"
              bgColor="bg-[#ecfbf3]"
              loading={statsLoading}
            />
            <MetricCard
              title="Upcoming Scheduled"
              value={stats.upcomingRides}
              icon={Calendar}
              iconBgColor="bg-sky-500/10"
              iconColor="text-sky-655"
              bgColor="bg-[#f0f9ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Completed Rides"
              value={stats.completedRides}
              icon={CheckCircle}
              iconBgColor="bg-purple-500/10"
              iconColor="text-purple-650"
              bgColor="bg-[#f8f0ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Cancelled Trips"
              value={stats.cancelledRides}
              icon={XCircle}
              iconBgColor="bg-rose-500/10"
              iconColor="text-rose-650"
              bgColor="bg-[#fff5f5]"
              loading={statsLoading}
            />
            <MetricCard
              title="Total Fare Today"
              value={`₹${stats.totalRevenueToday?.toLocaleString('en-IN')}`}
              icon={DollarSign}
              iconBgColor="bg-orange-500/10"
              iconColor="text-orange-650"
              bgColor="bg-[#fff8f0]"
              loading={statsLoading}
            />
          </div>

          {/* Filters card */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-4">
            {/* Status tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
              {['All', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Inputs & Dropdowns filter row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search box */}
              <div className="relative w-full md:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Ride ID, guest, driver, vehicle..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-755 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Multi selects filters */}
              <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-start md:justify-end">
                <div className="space-y-0.5 flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Ride Type</span>
                  <select
                    value={rideTypeFilter}
                    onChange={(e) => setRideTypeFilter(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="All">All Types</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Shared">Shared Shuttle</option>
                  </select>
                </div>

                <div className="space-y-0.5 flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Payment Status</span>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="All">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-5">Ride ID</th>
                    <th className="py-4 px-5">Guest Profile</th>
                    <th className="py-4 px-5">Assigned Driver</th>
                    <th className="py-4 px-5">Vehicle Specs</th>
                    <th className="py-4 px-5">Route Coordinates</th>
                    <th className="py-4 px-5 text-right">Fare</th>
                    <th className="py-4 px-5 text-center">Payment</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
                        </div>
                      </td>
                    </tr>
                  ) : ridesList.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-450 font-medium">
                        No active dispatch logs found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    ridesList.map((ride) => (
                      <tr key={ride._id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4 px-5 font-mono text-[10px] text-slate-400">#{ride._id}</td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-150 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                              {ride.guest.photo ? (
                                <img src={ride.guest.photo} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <User size={14} className="text-slate-450" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{ride.guest.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{ride.guest.mobile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          {ride.driver ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-100 flex-shrink-0">
                                <img src={ride.driver.photo} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 block">{ride.driver.name}</span>
                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                  <Star size={9} className="text-amber-450 fill-amber-450" />
                                  <span>{ride.driver.rating}</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-slate-650">
                            <div className="font-bold">{ride.vehicle.model}</div>
                            <div className="text-[10px] font-mono text-slate-450 uppercase">{ride.vehicle.vehicleNumber}</div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-[10px] text-slate-500 font-medium max-w-xs space-y-0.5">
                            <div className="truncate"><span className="text-emerald-600 font-bold">Pick:</span> {ride.pickupAddress}</div>
                            <div className="truncate"><span className="text-rose-600 font-bold">Drop:</span> {ride.dropAddress}</div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right font-mono text-slate-850">
                          ₹{ride.fareBreakdown.finalFare?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getPaymentStatusBadgeStyle(ride.paymentStatus)}`}>
                            {ride.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeStyle(ride.status)}`}>
                            {ride.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedId(ride._id); setViewMode('details'); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                            
                            {!ride.driver && ride.status === 'Upcoming' && (
                              <button
                                onClick={() => handleAssignDriver(ride._id)}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Assign Driver"
                              >
                                <Plus size={14} />
                              </button>
                            )}

                            {(ride.status === 'Ongoing' || ride.status === 'Upcoming') && (
                              <button
                                onClick={() => handleCancelRide(ride._id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancel Ride"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50/50 border-t border-slate-100 px-5 py-4.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {ridesList.length} dispatch logs</span>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {listLoading ? (
              <div className="py-12 text-center text-slate-400">Loading mobile dispatch feed...</div>
            ) : ridesList.length === 0 ? (
              <div className="py-12 text-center text-slate-450 font-medium">No rides dispatch logs found matching filters.</div>
            ) : (
              ridesList.map((ride) => (
                <div key={ride._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-slate-450">#{ride._id}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeStyle(ride.status)}`}>
                      {ride.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-50 py-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Guest</span>
                      <span className="text-xs font-bold text-slate-800 block truncate">{ride.guest.name}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Driver</span>
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {ride.driver ? ride.driver.name : 'Unassigned'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fare sum</span>
                      <span className="text-xs font-bold text-slate-800 block font-mono">₹{ride.fareBreakdown.finalFare}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle</span>
                      <span className="text-xs font-bold text-slate-800 block font-mono truncate">{ride.vehicle.vehicleNumber}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedId(ride._id); setViewMode('details'); }}
                      className="flex-1 py-2 bg-blue-50 text-blue-650 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
                    >
                      View Details
                    </button>
                    {!ride.driver && ride.status === 'Upcoming' && (
                      <button
                        onClick={() => handleAssignDriver(ride._id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </motion.div>
      )}

      {/* 2. RIDE DETAILS VIEW */}
      {viewMode === 'details' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header section with back navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setViewMode('list'); setSelectedId(null); }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                  <span>Ride Dispatch Profile</span>
                  <span className="font-mono text-sm text-slate-400">#{rideDetails?._id}</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                  <span>Type: {rideDetails?.rideType}</span>
                  <span>•</span>
                  <span>Booked: {rideDetails?.createdAt ? new Date(rideDetails.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </p>
              </div>
            </div>

            {/* Badges and action links */}
            {rideDetails && (
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 ${getStatusBadgeStyle(rideDetails.status)}`}>
                  <span className="w-1.5 h-1.5 bg-current rounded-full" />
                  <span>{rideDetails.status}</span>
                </span>
                
                {rideDetails.driver && (
                  <>
                    <a 
                      href={`tel:${rideDetails.driver.mobile}`}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition-all"
                    >
                      <PhoneCall size={11} />
                      <span>Call Driver</span>
                    </a>
                    <a 
                      href={`https://wa.me/${rideDetails.driver.mobile.replace(/\+/g, '').replace(/ /g, '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:bg-emerald-100/50 transition-all"
                    >
                      <Send size={11} className="rotate-45" />
                      <span>WhatsApp</span>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {detailsLoading ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-slate-450">Loading ride dispatch profile files...</span>
            </div>
          ) : !rideDetails ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-rose-500">Ride profile not found.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Guest, Driver, and Vehicle Cards (lg:col-span-3) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Guest Profile Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                    <User size={13} className="text-indigo-500" />
                    <span>Guest Information</span>
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-150 flex-shrink-0 bg-slate-50 flex items-center justify-center">
                      {rideDetails.guest.photo ? (
                        <img src={rideDetails.guest.photo} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs leading-none">{rideDetails.guest.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold mt-1.5 inline-block ${
                        rideDetails.guest.verificationStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {rideDetails.guest.verificationStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] font-semibold text-slate-600 border-t border-slate-50 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile</span>
                      <span>{rideDetails.guest.mobile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email</span>
                      <span className="truncate max-w-[140px]" title={rideDetails.guest.email}>{rideDetails.guest.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Driver Profile Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                    <Car size={13} className="text-indigo-500" />
                    <span>Driver Information</span>
                  </h3>

                  {rideDetails.driver ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-150 flex-shrink-0">
                          <img src={rideDetails.driver.photo} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs leading-none">{rideDetails.driver.name}</h4>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded">
                              <Star size={9} className="text-amber-450 fill-amber-450" />
                              <span>{rideDetails.driver.rating}</span>
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              rideDetails.driver.status === 'On Ride' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : rideDetails.driver.status === 'Active'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-50 text-slate-450'
                            }`}>
                              {rideDetails.driver.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-[11px] font-semibold text-slate-600 border-t border-slate-50 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mobile</span>
                          <span>{rideDetails.driver.mobile}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400">
                      <p className="text-xs font-semibold mb-3">No driver assigned to this trip.</p>
                      <button
                        onClick={() => handleAssignDriver(rideDetails._id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                      >
                        Assign Driver Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Vehicle Specs Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                    <Info size={13} className="text-indigo-500" />
                    <span>Vehicle Details</span>
                  </h3>

                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-150 bg-slate-50 flex-shrink-0 flex items-center justify-center">
                      {rideDetails.vehicle.image ? (
                        <img src={rideDetails.vehicle.image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Car size={24} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs leading-none">{rideDetails.vehicle.model}</h4>
                      <span className="text-[10px] text-slate-450 block pt-1 font-semibold">Type: {rideDetails.vehicle.vehicleType}</span>
                    </div>
                  </div>

                  {/* Physical License Plate look */}
                  <div className="bg-amber-450 border border-slate-700 text-slate-900 px-3 py-1.5 rounded-md font-mono font-bold text-center text-xs tracking-widest uppercase shadow-sm">
                    {rideDetails.vehicle.vehicleNumber}
                  </div>
                </div>

              </div>

              {/* CENTER COLUMN: Live Route Tracking Map, Route Summary, Timeline (lg:col-span-6) */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Live Route Tracking Card with Animated Map */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                      <MapPin size={13} className="text-indigo-500 animate-bounce" />
                      <span>Live Route Dispatch Map</span>
                    </h3>
                    {rideDetails.status === 'Ongoing' && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Tracking Live</span>
                      </span>
                    )}
                  </div>

                  {/* SVG Map visualization container */}
                  <div className="h-64 bg-[#f8fafc] border-b border-slate-50 relative flex items-center justify-center overflow-hidden">
                    {/* Grids and roads decoration */}
                    <svg className="absolute inset-0 w-full h-full text-slate-200/50" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      {/* Stylized simulated city roads */}
                      <path d="M 0 80 Q 200 40 400 120 T 800 160" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 100 0 V 300" fill="none" stroke="currentColor" strokeWidth="4" />
                      <path d="M 0 180 H 800" fill="none" stroke="currentColor" strokeWidth="4" />
                      <path d="M 320 0 V 300" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>

                    {/* Animated SVG Route Line */}
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M 80 180 C 150 120, 280 240, 360 80" 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                        strokeDasharray="8 6"
                        className="animate-[dash_20s_linear_infinite]"
                        style={{
                          animation: 'dash 1.5s linear infinite'
                        }}
                      />
                      <style>{`
                        @keyframes dash {
                          to {
                            stroke-dashoffset: -28;
                          }
                        }
                        @keyframes pulse-pin {
                          0%, 100% { transform: scale(1); opacity: 1; }
                          50% { transform: scale(1.25); opacity: 0.5; }
                        }
                      `}</style>
                    </svg>

                    {/* Pickup Marker */}
                    <div className="absolute left-[70px] top-[160px] z-10 flex flex-col items-center">
                      <div className="relative">
                        <span className="absolute -inset-1 bg-emerald-500 rounded-full animate-ping opacity-75" />
                        <div className="w-5 h-5 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white shadow shadow-emerald-200">
                          <span className="text-[9px] font-bold">A</span>
                        </div>
                      </div>
                      <span className="bg-slate-900/80 backdrop-blur-xs text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow mt-1">Pickup</span>
                    </div>

                    {/* Drop Marker */}
                    <div className="absolute left-[350px] top-[60px] z-10 flex flex-col items-center">
                      <div className="relative">
                        <span className="absolute -inset-1 bg-rose-500 rounded-full animate-ping opacity-75" />
                        <div className="w-5 h-5 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center text-white shadow shadow-rose-200">
                          <span className="text-[9px] font-bold">B</span>
                        </div>
                      </div>
                      <span className="bg-slate-900/80 backdrop-blur-xs text-[8px] font-bold text-white px-1.5 py-0.5 rounded shadow mt-1">Drop</span>
                    </div>

                    {/* Pulsing Driver Position (Visible if assigned and not completed/cancelled) */}
                    {rideDetails.driver && rideDetails.status === 'Ongoing' && (
                      <div 
                        className="absolute z-20 flex flex-col items-center transition-all duration-1000"
                        style={{
                          left: '210px',
                          top: '150px'
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg shadow-blue-200 animate-[bounce_2s_infinite]">
                          <img src={rideDetails.driver.photo} className="w-full h-full rounded-full object-cover" alt="" />
                        </div>
                        <div className="bg-blue-600 text-[8px] font-bold text-white px-1 py-0.5 rounded shadow mt-0.5 flex items-center gap-0.5 uppercase tracking-wide">
                          <Car size={8} />
                          <span>Amit</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Route Summary Details Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650">
                    Route Summary
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span>Pickup Point</span>
                      </div>
                      <p className="text-xs font-bold text-slate-750">{rideDetails.pickupAddress}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                        <span>Destination Drop</span>
                      </div>
                      <p className="text-xs font-bold text-slate-755">{rideDetails.dropAddress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-slate-50 pt-3.5 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Est. Distance</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">{rideDetails.distance} KM</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                      <span className="text-xs font-bold text-slate-800 block mt-0.5">{rideDetails.duration}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current ETA</span>
                      <span className="text-xs font-bold text-blue-650 block mt-0.5">{rideDetails.eta}</span>
                    </div>
                  </div>
                </div>

                {/* Ride Timeline Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650">
                    Dispatch Timeline Logs
                  </h3>

                  <div className="relative border-l border-slate-100 pl-5.5 space-y-4 ml-1.5">
                    {rideDetails.timeline.map((step, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[27.5px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-white" />
                        <div className="flex justify-between items-start gap-2">
                          <div className="text-[10px] font-bold text-slate-800">{step.event}</div>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium pt-0.5">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Fare Breakdown, Payment Info, and Quick Actions (lg:col-span-3) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Fare Breakdown Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                    <FileText size={13} className="text-indigo-500" />
                    <span>Fare Summary Slip</span>
                  </h3>

                  <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Base Fare</span>
                      <span>₹{rideDetails.fareBreakdown.baseFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance Fare</span>
                      <span>₹{rideDetails.fareBreakdown.distanceFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extra/Toll Charges</span>
                      <span>₹{rideDetails.fareBreakdown.extraCharges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Waiting Charges</span>
                      <span>₹{rideDetails.fareBreakdown.waitingCharges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxes</span>
                      <span>₹{rideDetails.fareBreakdown.tax}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Discount Coupon</span>
                      <span>-₹{rideDetails.fareBreakdown.discount}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-100 pt-3.5 font-bold text-slate-800 text-sm">
                      <span>Total Fare</span>
                      <span className="font-mono text-blue-600">₹{rideDetails.fareBreakdown.finalFare}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                    <CreditCard size={13} className="text-indigo-500" />
                    <span>Payment Coordinates</span>
                  </h3>

                  <div className="space-y-3.5 text-xs font-semibold text-slate-655">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Method</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span>{rideDetails.paymentMode}</span>
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-400">Payment Status</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getPaymentStatusBadgeStyle(rideDetails.paymentStatus)}`}>
                        {rideDetails.paymentStatus}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-400">Transaction ID</span>
                      <span className="font-mono text-[10px] text-slate-800">{rideDetails.transactionId || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-400">Payment Date</span>
                      <span className="text-slate-700">
                        {rideDetails.paymentDate ? new Date(rideDetails.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Dispatch Actions Card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-655">
                    Operational actions
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleShareTrackingLink(rideDetails._id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Share2 size={13} />
                      <span>Share Live Tracking Link</span>
                    </button>

                    <button
                      onClick={() => handleAssignDriver(rideDetails._id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-55 text-indigo-700 hover:bg-indigo-100/60 border border-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <User size={13} />
                      <span>{rideDetails.driver ? 'Reallocate New Driver' : 'Assign Driver'}</span>
                    </button>

                    {rideDetails.status === 'Ongoing' && (
                      <button
                        onClick={() => handleMarkCompleted(rideDetails._id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-150"
                      >
                        <CheckCircle size={13} />
                        <span>Mark Trip Completed</span>
                      </button>
                    )}

                    {(rideDetails.status === 'Ongoing' || rideDetails.status === 'Upcoming') && (
                      <button
                        onClick={() => handleCancelRide(rideDetails._id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>Cancel Ride Request</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* 3. ASSIGN DRIVER MODAL OVERLAY */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Assign Dispatch Driver</h3>
                <p className="text-[10px] text-slate-400 font-medium">Select from available operations transport pool.</p>
              </div>
              <button 
                onClick={() => { setAssignModalOpen(false); setTargetRideId(null); }}
                className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[350px] overflow-y-auto space-y-2.5">
              {driversList.map((driver) => {
                const isBusy = driver.status === 'On Ride';
                const isOffline = driver.status === 'Offline' || driver.status === 'Inactive';
                return (
                  <div 
                    key={driver._id} 
                    className={`flex items-center justify-between p-3 border rounded-2xl transition-all ${
                      isOffline 
                        ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                        : 'bg-white border-slate-150 hover:border-blue-400 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0">
                        <img src={driver.photo} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">{driver.name}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-slate-450 font-bold flex items-center gap-0.5 bg-slate-55/40 px-1 py-0.5 rounded">
                            <Star size={8} className="text-amber-450 fill-amber-450" />
                            <span>{driver.rating}</span>
                          </span>
                          <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                            isBusy ? 'bg-amber-50 text-amber-700' : isOffline ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {driver.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isOffline}
                      onClick={() => handleConfirmDriverAllocation(driver._id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all cursor-pointer ${
                        isBusy 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs' 
                          : isOffline 
                          ? 'bg-slate-100 text-slate-400 pointer-events-none'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {isBusy ? 'Override' : 'Allocate'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
