import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Car,
  TrendingUp,
  Activity,
  SlidersHorizontal,
  ChevronLeft,
  RefreshCw,
  Zap,
  Map
} from 'lucide-react';

const mockRides = [
  {
    id: '#RWG12548',
    bookingTime: '10:30 AM',
    guest: {
      name: 'Keshav Sharma',
      mobile: '+91 98765 43210',
      email: 'keshav@gmail.com',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      verificationStatus: 'Verified'
    },
    driver: {
      name: 'Amit Kumar',
      mobile: '+91 91234 56789',
      email: 'amit.kumar@wow.com',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      rating: 4.8,
      status: 'On Ride'
    },
    vehicle: {
      model: 'White Swift Dzire',
      vehicleNumber: 'DL 12 AB 1234',
      vehicleType: 'Sedan',
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200',
      features: 'White • Petrol • AC'
    },
    route: {
      pickup: 'Connaught Place, Delhi',
      drop: 'IGI Airport, Delhi',
      distance: '22.4 km',
      duration: '35 mins',
      eta: '14 mins',
      avgSpeed: '48 km/h',
      gpsAccuracy: 'High'
    },
    status: 'Ongoing',
    statusSubtext: 'Started 10:35 AM',
    fare: {
      baseFare: 560,
      extraDistance: 60,
      tolls: 35,
      nightCharges: 30,
      discount: 0,
      total: 685
    },
    payment: {
      method: 'UPI',
      status: 'Paid',
      transactionId: 'TXN-8271A92',
      paymentDate: 'Today, 10:35 AM'
    },
    extraDetails: {
      waitingTime: '5 mins',
      waitingCharges: 25,
      battery: '82%',
      sosStatus: 'Normal'
    },
    timeline: [
      { event: 'Ride Created', timestamp: '10:30 AM', description: 'Created by Admin' },
      { event: 'Driver Assigned', timestamp: '10:31 AM', description: 'Amit Kumar assigned to ride' },
      { event: 'Driver Arrived', timestamp: '10:35 AM', description: 'Reached pickup location' },
      { event: 'En Route', timestamp: 'LIVE', description: 'Moving towards destination' }
    ]
  },
  {
    id: '#RWG12547',
    bookingTime: '09:15 AM',
    guest: {
      name: 'Neha Gupta',
      mobile: '+91 91234 56789',
      email: 'neha.g@gmail.com',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      verificationStatus: 'Verified'
    },
    driver: {
      name: 'Ravi Singh',
      mobile: '+91 98888 77777',
      email: 'ravi.singh@wow.com',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      rating: 4.6,
      status: 'Arrived'
    },
    vehicle: {
      model: 'White WagonR',
      vehicleNumber: 'DL 10 XY 4567',
      vehicleType: 'Hatchback',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200',
      features: 'White • CNG • AC'
    },
    route: {
      pickup: 'Karol Bagh, Delhi',
      drop: 'Noida Sector 62',
      distance: '18.7 km',
      duration: '45 mins',
      eta: 'Arrived',
      avgSpeed: '38 km/h',
      gpsAccuracy: 'High'
    },
    status: 'Arrived',
    statusSubtext: 'Arrived 09:18 AM',
    fare: {
      baseFare: 480,
      extraDistance: 70,
      tolls: 0,
      nightCharges: 0,
      discount: 0,
      total: 550
    },
    payment: {
      method: 'Cash',
      status: 'Pending',
      transactionId: '',
      paymentDate: ''
    },
    extraDetails: {
      waitingTime: '8 mins',
      waitingCharges: 40,
      battery: '74%',
      sosStatus: 'Normal'
    },
    timeline: [
      { event: 'Ride Created', timestamp: '09:15 AM', description: 'Created by Guest App' },
      { event: 'Driver Assigned', timestamp: '09:16 AM', description: 'Ravi Singh assigned to ride' },
      { event: 'Driver Arrived', timestamp: '09:18 AM', description: 'Reached pickup location' }
    ]
  },
  {
    id: '#RWG12546',
    bookingTime: '11:00 AM',
    guest: {
      name: 'Rohit Verma',
      mobile: '+91 87654 32109',
      email: 'rohit@gmail.com',
      photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      verificationStatus: 'Unverified'
    },
    driver: {
      name: 'Sandeep Yadav',
      mobile: '+91 97777 66666',
      email: 'sandeep@wow.com',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      rating: 4.7,
      status: 'Active'
    },
    vehicle: {
      model: 'Black Honda Activa',
      vehicleNumber: 'DL 8S CP 9876',
      vehicleType: 'Bike',
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200',
      features: 'Black • Petrol'
    },
    route: {
      pickup: 'Lajpat Nagar, Delhi',
      drop: 'Greater Kailash, Delhi',
      distance: '7.2 km',
      duration: '15 mins',
      eta: '5 mins',
      avgSpeed: '32 km/h',
      gpsAccuracy: 'Medium'
    },
    status: 'Assigned',
    statusSubtext: 'Assigned 10:50 AM',
    fare: {
      baseFare: 210,
      extraDistance: 0,
      tolls: 0,
      nightCharges: 0,
      discount: 0,
      total: 210
    },
    payment: {
      method: 'UPI',
      status: 'Paid',
      transactionId: 'TXN-9182B12',
      paymentDate: 'Today, 10:50 AM'
    },
    extraDetails: {
      waitingTime: '0 mins',
      waitingCharges: 0,
      battery: '90%',
      sosStatus: 'Normal'
    },
    timeline: [
      { event: 'Ride Created', timestamp: '10:45 AM', description: 'Created by Guest App' },
      { event: 'Driver Assigned', timestamp: '10:50 AM', description: 'Sandeep Yadav assigned to ride' }
    ]
  }
];

export default function RideManagement() {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'details'
  const [rides, setRides] = useState(mockRides);
  const [selectedRide, setSelectedRide] = useState(mockRides[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Ongoing'); // 'Ongoing' | 'Upcoming' | 'Completed' | 'Cancelled'
  
  // Filters
  const [vehicleType, setVehicleType] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  
  const handleViewDetails = (ride) => {
    setSelectedRide(ride);
    setViewMode('details');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Arrived':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Assigned':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Completed':
        return 'bg-slate-50 text-slate-700 border-slate-100';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  // Filter rides list
  const filteredRides = rides.filter(ride => {
    const matchesSearch = ride.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ride.guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ride.driver.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'Ongoing' 
      ? (ride.status === 'Ongoing' || ride.status === 'Arrived' || ride.status === 'Assigned')
      : ride.status === activeTab;

    const matchesVehicle = vehicleType === 'All' || ride.vehicle.vehicleType === vehicleType;
    const matchesPayment = paymentStatus === 'All' || ride.payment.status === paymentStatus;

    return matchesSearch && matchesTab && matchesVehicle && matchesPayment;
  });

  return (
    <div className="space-y-6 select-none animate-fade-in pb-16">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manage Rides</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Monitor, manage and track all rides in real-time</p>
            </div>
            <button
              onClick={() => alert('Feature flag: Generate Ride request trigger.')}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-black shadow-md shadow-red-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Generate Ride</span>
            </button>
          </div>

          {/* Stats Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <Car size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Rides Today</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">128</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">ALL RIDES</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Activity size={20} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Ongoing Rides</span>
                <span className="text-lg font-black text-emerald-600 block mt-0.5 font-sans leading-none">34</span>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mt-1">● LIVE NOW</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Upcoming Rides</span>
                <span className="text-lg font-black text-blue-600 block mt-0.5 font-sans leading-none">28</span>
                <span className="text-[8px] font-bold text-blue-550 uppercase tracking-widest block mt-1">SCHEDULED</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Completed Rides</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">62</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">TODAY</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <XCircle size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cancelled Rides</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">04</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">TODAY</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 font-mono text-lg">
                ₹
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Earnings Today</span>
                <span className="text-base font-black text-slate-850 block mt-0.5 font-sans leading-none">₹62,450</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">ALL PAYMENT</span>
              </div>
            </div>

          </div>

          {/* List Card */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden space-y-4">
            
            {/* Tabs & Sort Bar */}
            <div className="border-b border-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/20">
              <div className="flex gap-4">
                {['Ongoing', 'Upcoming', 'Completed', 'Cancelled'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-1 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                      activeTab === tab 
                        ? 'border-red-600 text-slate-850' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab === 'Ongoing' ? 'Ongoing Rides' : tab === 'Upcoming' ? 'Upcoming Rides' : tab === 'Completed' ? 'Completed Rides' : 'Cancelled Rides'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-auto">
                <span>Sort By:</span>
                <select className="bg-transparent border-none text-slate-800 font-extrabold focus:outline-none cursor-pointer">
                  <option>Latest Ride</option>
                  <option>Distance</option>
                  <option>Fare</option>
                </select>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer">
                  <SlidersHorizontal size={12} />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="px-6 grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              <div className="relative col-span-1 sm:col-span-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Ride ID, Guest, Driver..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                />
              </div>

              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
              >
                <option value="All">All Vehicle Types</option>
                <option value="Sedan">Sedan</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Bike">Bike</option>
              </select>

              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
              >
                <option value="All">All Payment Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none"
              >
                <option value="All">All Locations</option>
                <option value="Delhi">Delhi</option>
                <option value="Noida">Noida</option>
              </select>

              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
                <input
                  type="text"
                  placeholder="Select Date"
                  readOnly
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:outline-none cursor-pointer"
                  onClick={() => alert('Calendar picker calendar trigger.')}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Ride ID</th>
                    <th className="py-3 px-6">Guest Details</th>
                    <th className="py-3 px-6">Driver Details</th>
                    <th className="py-3 px-6">Vehicle</th>
                    <th className="py-3 px-6">Route & Distance</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Fare Details</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6 text-center">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredRides.map(ride => (
                    <tr key={ride.id} className="hover:bg-slate-50/20 transition-colors">
                      
                      {/* Ride ID */}
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-blue-600 block">{ride.id}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{ride.bookingTime}</span>
                      </td>

                      {/* Guest details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <img src={ride.guest.photo} className="w-8 h-8 rounded-full object-cover border border-slate-100" alt="" />
                          <div>
                            <span className="font-extrabold text-slate-800 block">{ride.guest.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{ride.guest.mobile}</span>
                          </div>
                        </div>
                      </td>

                      {/* Driver details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <img src={ride.driver.photo} className="w-8 h-8 rounded-full object-cover border border-slate-100" alt="" />
                          <div>
                            <span className="font-extrabold text-slate-800 block">{ride.driver.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                              <Star size={9} className="text-amber-500 fill-amber-500" />
                              <span>{ride.driver.rating}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="py-4 px-6 space-y-1">
                        <span className="font-bold text-slate-800 block leading-none">{ride.vehicle.model}</span>
                        <span className="text-[9px] text-slate-400 font-semibold block leading-none">{ride.vehicle.vehicleNumber}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[7px] font-black uppercase tracking-wider inline-block">
                          {ride.vehicle.vehicleType}
                        </span>
                      </td>

                      {/* Route & Distance */}
                      <td className="py-4 px-6 space-y-1">
                        <div className="text-[10px] text-slate-700 font-bold flex flex-col gap-0.5">
                          <span className="truncate max-w-[130px]" title={ride.route.pickup}>{ride.route.pickup.split(',')[0]}</span>
                          <span className="text-slate-400 font-semibold">to {ride.route.drop.split(',')[0]}</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-black block mt-0.5">{ride.route.distance}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border inline-block ${getStatusBadge(ride.status)}`}>
                            {ride.status === 'Ongoing' ? '● ONGOING' : ride.status === 'Arrived' ? 'DRIVER ARRIVED' : ride.status === 'Assigned' ? 'DRIVER ASSIGNED' : ride.status}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold block">{ride.statusSubtext}</span>
                        </div>
                      </td>

                      {/* Fare */}
                      <td className="py-4 px-6 font-mono font-black text-slate-900">
                        ₹{ride.fare.total}
                      </td>

                      {/* Payment */}
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 border rounded-lg text-[8px] font-black uppercase tracking-wider inline-block ${
                          ride.payment.status === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {ride.payment.method}
                        </span>
                      </td>

                      {/* Current Status action */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-700">
                            {ride.status === 'Ongoing' ? 'En Route' : ride.status === 'Arrived' ? 'Waiting for Guest' : 'Driver Assigned'}
                          </span>
                          <button
                            onClick={() => handleViewDetails(ride)}
                            className="text-[10px] font-black text-blue-650 hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            Live Tracking <ChevronRight size={10} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                  {filteredRides.length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold">No rides found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="border-t border-slate-50 px-6 py-4.5 flex justify-between items-center text-xs font-bold text-slate-500">
              <span>Showing 1 to {filteredRides.length} of {filteredRides.length} ongoing & upcoming rides</span>
              <div className="flex items-center gap-1.5">
                <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                  <ChevronLeft size={14} />
                </button>
                <button className="w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center">1</button>
                <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. RIDE DETAILS VIEW */}
      {viewMode === 'details' && selectedRide && (
        <div className="space-y-6">
          
          {/* Back button header row */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>TravelOps Admin</span>
            </button>

            <div className="relative w-72">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                readOnly
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                  Ride Details - {selectedRide.id}
                </h1>
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 ${getStatusBadge(selectedRide.status)}`}>
                  <span className="w-1 h-1 bg-current rounded-full" />
                  <span>{selectedRide.status}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1.5 tracking-wider">
                Booking Time: Today, {selectedRide.bookingTime}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert(`Calling driver: ${selectedRide.driver.name} at ${selectedRide.driver.mobile}`)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-655 font-extrabold text-[10px] uppercase rounded-xl flex items-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <PhoneCall size={11} className="text-slate-550" />
                <span>Call Driver</span>
              </button>
              <button
                onClick={() => window.open(`https://wa.me/${selectedRide.driver.mobile.replace(/\+/g,'').replace(/ /g,'')}`)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-655 font-extrabold text-[10px] uppercase rounded-xl flex items-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Send size={11} className="text-slate-550 rotate-45" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => alert('Edit Ride dispatcher overlay.')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                Edit Ride
              </button>
            </div>
          </div>

          {/* Three Columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: GUEST, DRIVER & VEHICLE (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Guest Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    Guest Details
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Verified
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <img src={selectedRide.guest.photo} className="w-12 h-12 rounded-full object-cover border border-slate-100" alt="" />
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-none">{selectedRide.guest.name}</h4>
                    <span className="text-[10px] text-slate-450 block mt-1.5 font-bold">{selectedRide.guest.mobile}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold truncate max-w-[150px]">{selectedRide.guest.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <button className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-[10px] font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1">
                    <Phone size={10} /> Call
                  </button>
                  <button className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-[10px] font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1">
                    <Send size={10} className="rotate-45" /> WhatsApp
                  </button>
                </div>
              </div>

              {/* Driver Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    Driver Details
                  </span>
                  <span className="text-emerald-600 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                    Online
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <img src={selectedRide.driver.photo} className="w-12 h-12 rounded-full object-cover border border-slate-100" alt="" />
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-none">{selectedRide.driver.name}</h4>
                    <span className="text-[10px] text-slate-450 block mt-1.5 font-bold">{selectedRide.driver.mobile}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold flex items-center gap-0.5">
                      <Star size={9} className="text-amber-500 fill-amber-500" />
                      <span>{selectedRide.driver.rating} • Assigned</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                  <button className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-[10px] font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1">
                    <Phone size={10} /> Call
                  </button>
                  <button className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-[10px] font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1">
                    <Send size={10} className="rotate-45" /> WhatsApp
                  </button>
                </div>
              </div>

              {/* Vehicle Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                  Vehicle Details
                </span>

                <div className="flex gap-3 items-center">
                  <img src={selectedRide.vehicle.image} className="w-16 h-12 rounded-xl object-cover border border-slate-150 bg-slate-50" alt="" />
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-none">{selectedRide.vehicle.model}</h4>
                    <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded text-[7px] font-black uppercase tracking-wider inline-block mt-2">
                      {selectedRide.vehicle.vehicleType}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-450 border border-slate-700 text-slate-900 px-3 py-1.5 rounded-md font-mono font-bold text-center text-xs tracking-widest uppercase shadow-sm">
                  {selectedRide.vehicle.vehicleNumber}
                </div>

                <span className="text-[9px] text-slate-400 font-extrabold uppercase block text-center tracking-wider">{selectedRide.vehicle.features}</span>
              </div>

              {/* Ride Information Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                  Ride Information
                </span>
                
                <div className="space-y-2.5 text-[11px] font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ride ID</span>
                    <span className="font-bold text-slate-800">{selectedRide.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ride Type</span>
                    <span className="font-bold text-slate-850">Private Ride (Cab)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking Time</span>
                    <span className="font-bold text-slate-850">Today, {selectedRide.bookingTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Drop</span>
                    <span className="font-bold text-slate-850">11:05 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Distance</span>
                    <span className="font-bold text-slate-850">{selectedRide.route.distance}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* CENTER COLUMN: MAP & TIMELINE (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Map Card */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-805 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={13} className="text-blue-500 animate-bounce" />
                    <span>Live Tracking</span>
                  </h3>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide">Live</span>
                  </span>
                </div>

                {/* Google Map Mock SVG styling */}
                <div className="h-96 bg-[#eef2f6] border-b border-slate-50 relative flex items-center justify-center overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full text-slate-350" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <rect width="60" height="60" fill="#f1f5f9" />
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#mapGrid)" />
                    {/* Simulated Map Arteries and Rivers */}
                    <path d="M -50 200 C 150 120, 200 450, 600 380" fill="none" stroke="#cbd5e1" strokeWidth="24" strokeLinecap="round" />
                    <path d="M -50 200 C 150 120, 200 450, 600 380" fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" />
                    
                    <path d="M 200 -20 Q 300 240, 100 500" fill="none" stroke="#cbd5e1" strokeWidth="18" strokeLinecap="round" />
                    <path d="M 200 -20 Q 300 240, 100 500" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />

                    {/* Route Line */}
                    <path 
                      d="M 120 300 Q 250 180, 480 260" 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                    />
                    {/* Route dots */}
                    <path 
                      d="M 120 300 Q 250 180, 480 260" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      strokeDasharray="4 6"
                    />
                  </svg>

                  {/* Pickup Pin */}
                  <div className="absolute left-[105px] top-[270px] z-10 flex flex-col items-center">
                    <div className="w-6 h-6 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white font-extrabold text-[10px] shadow-md">
                      A
                    </div>
                    <span className="bg-slate-900 text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow mt-1 uppercase tracking-wide">Connaught Place</span>
                  </div>

                  {/* Drop Pin */}
                  <div className="absolute left-[460px] top-[230px] z-10 flex flex-col items-center">
                    <div className="w-6 h-6 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-white font-extrabold text-[10px] shadow-md">
                      B
                    </div>
                    <span className="bg-slate-900 text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow mt-1 uppercase tracking-wide">IGI Airport</span>
                  </div>

                  {/* Vehicle Marker Tooltip */}
                  <div className="absolute left-[260px] top-[190px] z-20 flex flex-col items-center animate-bounce">
                    <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-1.5 min-w-[90px]">
                      <img src={selectedRide.driver.photo} className="w-5 h-5 rounded-full object-cover" alt="" />
                      <div className="leading-none">
                        <span className="text-[8px] font-black text-slate-400 block uppercase">Amit Kumar</span>
                        <span className="text-[10px] font-extrabold text-blue-450 font-sans block mt-0.5">14 mins</span>
                      </div>
                    </div>
                    {/* Tooltip triangle */}
                    <div className="w-2.5 h-2.5 bg-slate-950 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                  </div>

                  {/* Live Tracking stats overlay */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl shadow-lg border border-slate-100 flex gap-4 text-xs font-bold text-slate-800 min-w-[240px]">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">ETA</span>
                      <span className="text-sm font-black text-slate-850 font-sans mt-0.5 block">{selectedRide.route.eta}</span>
                    </div>
                    <div className="w-px bg-slate-150"></div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Remaining</span>
                      <span className="text-sm font-black text-slate-850 font-sans mt-0.5 block">{selectedRide.route.distance}</span>
                    </div>
                    <div className="w-px bg-slate-150"></div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Speed</span>
                      <span className="text-sm font-black text-slate-850 font-sans mt-0.5 block">{selectedRide.route.avgSpeed}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Lower center side-by-side grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Timeline */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2.5">
                    Activity Timeline
                  </h3>

                  <div className="relative border-l border-slate-150 pl-5.5 space-y-4 ml-1.5">
                    {selectedRide.timeline.map((step, idx) => (
                      <div key={idx} className="relative">
                        <span className={`absolute -left-[27.5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          step.timestamp === 'LIVE' ? 'bg-emerald-500 animate-ping' : 'bg-blue-500'
                        }`} />
                        <span className={`absolute -left-[27.5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          step.timestamp === 'LIVE' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        
                        <div className="flex justify-between items-start gap-1">
                          <div className="text-[10px] font-black text-slate-800">{step.event}</div>
                          <span className={`text-[9px] font-mono font-black uppercase ${
                            step.timestamp === 'LIVE' ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {step.timestamp}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-450 font-medium pt-0.5">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Route Summary */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2.5">
                    Route Summary
                  </h3>

                  <div className="space-y-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pickup</span>
                        <span className="text-slate-800 font-bold block mt-0.5">{selectedRide.route.pickup}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 border-t border-slate-50 pt-3">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Drop</span>
                        <span className="text-slate-800 font-bold block mt-0.5">{selectedRide.route.drop}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4.5 text-center">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Distance</span>
                      <span className="text-xs font-black text-slate-850 block mt-0.5 font-sans">{selectedRide.route.distance}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Est. Time</span>
                      <span className="text-xs font-black text-slate-850 block mt-0.5 font-sans">{selectedRide.route.duration}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">GPS Accuracy</span>
                      <span className="text-xs font-black text-emerald-600 block mt-0.5 uppercase tracking-wide">High ✓</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: FARES, ACTIONS & ASSISTANCE (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Fare Breakdown */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                  Fare Breakdown
                </span>

                <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base Fare</span>
                    <span>₹{selectedRide.fare.baseFare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Included Distance (20km)</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extra Distance (2.4km)</span>
                    <span>₹{selectedRide.fare.extraDistance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tolls & Parking</span>
                    <span>₹{selectedRide.fare.tolls.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Night Charges (10%)</span>
                    <span>₹{selectedRide.fare.nightCharges.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-100 pt-3.5 font-black text-slate-800 text-sm">
                    <span>Total Fare</span>
                    <span className="font-mono text-blue-600 text-base">₹{selectedRide.fare.total.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider inline-block">
                      Paid ({selectedRide.payment.method})
                    </span>
                  </div>
                </div>
              </div>

              {/* Extra Details */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                  Extra Details
                </span>

                <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waiting Time</span>
                    <span className="font-bold text-slate-800">{selectedRide.extraDetails.waitingTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waiting Charges</span>
                    <span className="font-bold text-slate-800">₹{selectedRide.extraDetails.waitingCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Battery</span>
                    <span className="font-bold text-slate-800">{selectedRide.extraDetails.battery}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SOS Status</span>
                    <span className="font-black text-emerald-600 uppercase tracking-wider">{selectedRide.extraDetails.sosStatus}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                  Quick Actions
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <button className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-655 font-black text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                    <Map size={14} className="text-slate-500" />
                    Share Live Location
                  </button>
                  <button className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-655 font-black text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                    <RefreshCw size={14} className="text-slate-500" />
                    Re-Route Vehicle
                  </button>
                  <button className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-655 font-black text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                    <Plus size={14} className="text-slate-500" />
                    Add Charges
                  </button>
                  <button 
                    onClick={() => {
                      setRides(prev => prev.map(r => r.id === selectedRide.id ? { ...r, status: 'Completed' } : r));
                      setSelectedRide(prev => ({ ...prev, status: 'Completed' }));
                      alert('Trip marked as completed successfully!');
                    }}
                    className="p-3 bg-white hover:bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-600 font-black text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <CheckCircle size={14} className="text-emerald-500" />
                    Complete Ride
                  </button>
                </div>
              </div>

              {/* Need Assistance card */}
              <div className="bg-slate-900 border border-slate-950 p-5 rounded-2xl shadow-md text-white space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">Need Assistance?</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Contact our priority support line for immediate ride intervention.</p>
                </div>
                <button
                  onClick={() => alert('Assistance Center alert dispatched.')}
                  className="w-full py-2 bg-white hover:bg-slate-55 text-slate-900 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm text-center"
                >
                  Contact Ops HQ
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
