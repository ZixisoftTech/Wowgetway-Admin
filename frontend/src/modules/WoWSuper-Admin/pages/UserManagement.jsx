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
  Users, 
  UserCheck, 
  UserMinus, 
  CalendarClock, 
  Banknote, 
  ArrowLeft, 
  Phone, 
  Send, 
  MapPin, 
  Mail, 
  Calendar, 
  DollarSign, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Lock,
  EyeOff,
  SlidersHorizontal,
  Download,
  AlertOctagon,
  Clock,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowRight,
  UploadCloud,
  FileText,
  Trash
} from 'lucide-react';

const API_BASE_URL = (window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app') + '/api/dashboard/users';

const mockUsersList = [
  {
    _id: 'UR10254',
    fullName: 'Shruti Verma',
    email: 'shruti@gmail.com',
    mobile: '+91 98765 43210',
    whatsApp: '9876543210',
    status: 'Active',
    userType: 'Frequent Traveller',
    registrationDate: '2024-01-12T00:00:00.000Z',
    totalBookings: 23,
    totalSpend: 54650,
    rewardPoints: 297,
    lastActive: 'Today, 10:30 AM',
    online: true,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    address: {
      line1: '56/A, MG Road',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pinCode: '110001'
    }
  },
  {
    _id: 'UR10253',
    fullName: 'Rohit Sharma',
    email: 'rohit.s@gmail.com',
    mobile: '+91 87654 32109',
    whatsApp: '8765432109',
    status: 'Restricted',
    userType: 'Regular User',
    registrationDate: '2024-01-10T00:00:00.000Z',
    totalBookings: 12,
    totalSpend: 28750,
    rewardPoints: 120,
    lastActive: 'Yesterday, 07:45 PM',
    online: false,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    address: {
      line1: '12, Sector 15',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      pinCode: '201301'
    }
  },
  {
    _id: 'UR10252',
    fullName: 'Anjali Patel',
    email: 'anjali.patel@gmail.com',
    mobile: '+91 91658 41236',
    whatsApp: '9165841236',
    status: 'Active',
    userType: 'VIP User',
    registrationDate: '2024-01-09T00:00:00.000Z',
    totalBookings: 8,
    totalSpend: 16200,
    rewardPoints: 85,
    lastActive: 'Today, 09:15 AM',
    online: true,
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    address: {
      line1: 'Ground Floor, Park Avenue',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      pinCode: '700016'
    }
  },
  {
    _id: 'UR10251',
    fullName: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    mobile: '+91 90345 67812',
    whatsApp: '9034567812',
    status: 'Blocked',
    userType: 'Corporate User',
    registrationDate: '2024-01-08T00:00:00.000Z',
    totalBookings: 5,
    totalSpend: 11500,
    rewardPoints: 50,
    lastActive: '2 days ago',
    online: false,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    address: {
      line1: 'Suite 402, DLF Cyber City',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      pinCode: '122002'
    }
  }
];

const singleUserDetail = {
  _id: 'UR10254',
  fullName: 'Shruti Verma',
  email: 'shruti@gmail.com',
  mobile: '+91 98765 43210',
  whatsApp: '9876543210',
  status: 'Active',
  userType: 'Frequent Traveller',
  registrationDate: '2024-01-12T00:00:00.000Z',
  totalBookings: 23,
  totalSpend: 54650,
  rewardPoints: 297,
  lastActive: 'Today, 10:30 AM',
  online: true,
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  address: {
    line1: '56/A, MG Road',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    pinCode: '110001'
  },
  metrics: {
    totalBookings: '23',
    totalSpend: '₹54,650',
    avgBookingValue: '₹2,376',
    totalAppUsage: '18h 45m',
    avgDailyUsage: '42m',
    lastActive: 'Today, 10:30 AM'
  },
  recentSearches: [
    { title: 'Darjeeling Tour Packages', time: 'Today, 10:16 AM' },
    { title: 'Sikkim Gangtok Tour', time: 'Today, 09:40 AM' },
    { title: 'Darjeeling Homestay', time: 'Yesterday, 06:10 PM' },
    { title: 'Bagdogra to Darjeeling Cab', time: 'Yesterday, 02:15 PM' },
    { title: 'North Sikkim Tour Packages', time: '12 May 2024' }
  ],
  bookings: [
    { bookingId: 'BK12485', bookingType: 'Tour Package', property: 'Darjeeling 3 Nights / 4 Days', date: '12 Jan 2024', travelDate: '15 Jan - 18 Jan 2024', amount: '₹12,500', status: 'Completed' },
    { bookingId: 'BK12105', bookingType: 'Homestay', property: 'Sea Breeze Homestay, Goa', date: '05 Dec 2023', travelDate: '20 Dec - 23 Dec 2023', amount: '₹9,500', status: 'Completed' },
    { bookingId: 'BK11876', bookingType: 'Tour Package', property: 'Gangtok & Lachung Tour', date: '20 Nov 2023', travelDate: '28 Nov - 02 Dec 2023', amount: '₹15,800', status: 'Completed' },
    { bookingId: 'BK11021', bookingType: 'Homestay', property: 'Hilltop Haven, Shimla', date: '25 Sep 2023', travelDate: '30 Sep - 02 Oct 2023', amount: '₹6,400', status: 'Cancelled' }
  ],
  topViewedPackages: [
    { name: 'Darjeeling Tour Package', views: 'Viewed 8 times • Today, 10:15 AM', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=120' },
    { name: 'Sikkim Gangtok Tour', views: 'Viewed 5 times • Today, 09:20 AM', image: 'https://images.unsplash.com/photo-1577717900160-22f442c67cf9?w=120' },
    { name: 'North Sikkim Tour Package', views: 'Viewed 4 times • 12 May 2024', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=120' }
  ],
  activitySummary: {
    logins: 86,
    quotationsRequested: 14,
    quotationsShared: 9,
    paymentsUploaded: 7,
    tickets: 3
  },
  adminNotes: {
    content: 'Good & regular customer. Mostly books Darjeeling & Sikkim packages. Provide best offers during festive seasons. Preferred contact via WhatsApp.',
    updatedBy: 'Rahul Sharma',
    updatedAt: '12 Apr 2024, 11:20 AM'
  }
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  let viewMode = 'list';
  if (location.pathname === '/users/add') {
    viewMode = 'add';
  } else if (location.pathname.startsWith('/users/edit/')) {
    viewMode = 'edit';
  } else if (id) {
    viewMode = 'details';
  }

  // Local state fallbacks
  const [users, setUsers] = useState(mockUsersList);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [userTypeFilter, setUserTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Recently Joined');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    whatsApp: '',
    dob: '',
    gender: 'Male',
    photo: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    status: 'Active',
    userType: 'Regular User'
  });

  // Fetch Users List (falling back to mocks if server fails)
  const { data: serverUsers = [] } = useQuery({
    queryKey: ['serverUsers'],
    queryFn: async () => {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    },
    retry: false
  });

  const mergedUsers = serverUsers.length > 0 ? serverUsers : users;

  const getUserId = (u) => u.id || u._id || 'N/A';
  const getUserName = (u) => u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A';

  const filteredUsers = mergedUsers.filter(u => {
    const uName = getUserName(u);
    const uId = getUserId(u);
    const uMobile = u.mobile || '';
    const matchesSearch = uName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          uId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          uMobile.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    const matchesType = userTypeFilter === 'All' || u.userType === userTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Fetch Single User details
  const { data: userDetails } = useQuery({
    queryKey: ['userDetails', id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    },
    enabled: !!id,
    retry: false
  });

  const displayUser = userDetails || singleUserDetail;

  // Handle mutations
  const createMutation = useMutation({
    mutationFn: async (newUser) => {
      const response = await axios.post(API_BASE_URL, newUser);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['serverUsers']);
      navigate('/users');
      alert('User created successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 select-none animate-fade-in pb-16">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-808 tracking-tight">Manage Users</h1>
              <p className="text-xs text-slate-400 font-bold leading-relaxed mt-0.5">
                View, manage and control all registered travelers within the enterprise portal.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/users/add')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-black shadow-md shadow-blue-200 cursor-pointer"
            >
              <Plus size={15} />
              <span>New Booking</span>
            </button>
          </div>

          {/* Metric Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-655 flex items-center justify-center flex-shrink-0">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Users</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">1,248</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">ALL REGISTERED</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-655 flex items-center justify-center flex-shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Active Users</span>
                <span className="text-lg font-black text-emerald-600 block mt-0.5 font-sans leading-none">928</span>
                <span className="text-[8px] font-black text-emerald-650 uppercase tracking-widest block mt-1">74.36% OF TOTAL</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertOctagon size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Restricted</span>
                <span className="text-lg font-black text-amber-600 block mt-0.5 font-sans leading-none">126</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-1">10.10% OF TOTAL</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-655 flex items-center justify-center flex-shrink-0">
                <UserMinus size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Blocked</span>
                <span className="text-lg font-black text-rose-600 block mt-0.5 font-sans leading-none">194</span>
                <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest block mt-1">15.54% OF TOTAL</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-655 flex items-center justify-center flex-shrink-0">
                <UserPlus size={20} />
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">New Today</span>
                <span className="text-lg font-black text-slate-850 block mt-0.5 font-sans leading-none">18</span>
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest block mt-1">+8.2% FROM YESTERDAY</span>
              </div>
            </div>

          </div>

          {/* Filter Toolbar & Table Section */}
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Restricted">Restricted</option>
                  <option value="Blocked">Blocked</option>
                </select>

                <select
                  value={userTypeFilter}
                  onChange={(e) => setUserTypeFilter(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Users</option>
                  <option value="Frequent Traveller">Frequent Traveller</option>
                  <option value="Regular User">Regular User</option>
                  <option value="VIP User">VIP User</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-655 focus:outline-none cursor-pointer"
                >
                  <option value="Recently Joined">Sort by: Recently Joined</option>
                  <option value="Spend: High to Low">Spend: High to Low</option>
                </select>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end">
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, email..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  />
                </div>

                <button className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-105 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">
                  <SlidersHorizontal size={13} />
                  <span>Filter</span>
                </button>

                <button 
                  onClick={() => alert('Exporting all user profiles...')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#e51e25] hover:bg-red-700 text-white border border-transparent rounded-xl text-xs font-black cursor-pointer shadow-sm shadow-red-100"
                >
                  <Download size={13} />
                  <span>Export All</span>
                </button>
              </div>

            </div>

            {/* Users list table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <th className="py-3.5 px-6">User</th>
                      <th className="py-3.5 px-6">User ID</th>
                      <th className="py-3.5 px-6">Contact</th>
                      <th className="py-3.5 px-6 text-center">Total Bookings</th>
                      <th className="py-3.5 px-6 text-right">Total Spent</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                      <th className="py-3.5 px-6 text-center">Last Active</th>
                      <th className="py-3.5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredUsers.map(user => {
                      const uId = getUserId(user);
                      const uName = getUserName(user);
                      return (
                        <tr key={uId} className="hover:bg-slate-50/20 transition-colors">
                          
                          {/* User Avatar + Joined */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img 
                                src={user.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                                className="w-9 h-9 rounded-full object-cover border border-slate-100 bg-slate-50"
                                alt=""
                              />
                              <div>
                                <span className="font-extrabold text-slate-805 block">{uName}</span>
                                <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider mt-0.5">
                                  Joined {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Jan 2024'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* User ID */}
                          <td className="py-4 px-6 font-mono text-slate-450">#{uId}</td>

                          {/* Contact info */}
                          <td className="py-4 px-6 space-y-0.5 text-[11px]">
                            <span className="font-bold text-slate-750 block">{user.mobile || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">{user.email || 'N/A'}</span>
                          </td>

                          {/* Total Bookings */}
                          <td className="py-4 px-6 text-center font-sans font-bold text-slate-805">
                            {user.totalBookings || '0'}
                          </td>

                          {/* Total Spent */}
                          <td className="py-4 px-6 text-right font-sans font-extrabold text-slate-850">
                            ₹{(user.totalSpend || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block border ${
                              user.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : user.status === 'Restricted'
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-rose-50 text-rose-705 border-rose-100'
                            }`}>
                              {user.status || 'Active'}
                            </span>
                          </td>

                          {/* Last Active */}
                          <td className="py-4 px-6 text-center space-y-0.5">
                            <span className="font-bold text-slate-700 block">{user.lastActive || 'Today, 10:30 AM'}</span>
                            <span className="flex items-center justify-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${user.online !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                {user.online !== false ? 'Online' : 'Offline'}
                              </span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-center">
                            <div className="relative inline-block">
                              <button
                                onClick={() => navigate(`/users/${uId}`)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-655 uppercase tracking-wide cursor-pointer transition-all"
                              >
                                <span>View Details</span>
                                <ChevronRight size={12} />
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
                <span>Showing 1 to {filteredUsers.length} of {filteredUsers.length} entries</span>
                <div className="flex items-center gap-1.5">
                  <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                    <ChevronLeft size={14} />
                  </button>
                  <button className="w-7 h-7 bg-red-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-red-100">1</button>
                  <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50" disabled>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Policy Guidelines row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            
            <div className="bg-emerald-50/20 border border-emerald-100/50 p-4.5 rounded-2xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-emerald-805 uppercase tracking-wider">Active</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                  User can access and use all app features without limitations.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/20 border border-amber-100/50 p-4.5 rounded-2xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-amber-805 uppercase tracking-wider">Restricted</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                  Limited access applied for a period of time due to policy violations.
                </p>
              </div>
            </div>

            <div className="bg-rose-50/20 border border-rose-100/50 p-4.5 rounded-2xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-655 flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserMinus size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-rose-805 uppercase tracking-wider">Blocked</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-1">
                  User is blocked and cannot access the app. Requires manual review.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. ADD USER VIEW */}
      {viewMode === 'add' && (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer transition-all shadow-sm"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-808 tracking-tight">Add New User</h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">
                Manage Users &gt; <span className="text-red-500">Add New User</span>
              </p>
            </div>
          </div>

          {/* Form Personal Info Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <UserPlus size={16} className="text-red-550" />
              <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 text-xs font-bold text-slate-700">
              
              <div className="space-y-2">
                <label className="text-slate-500">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">User ID</label>
                <input
                  type="text"
                  readOnly
                  placeholder="# Auto generated"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">Phone Number <span className="text-red-500">*</span></label>
                <div className="flex gap-1">
                  <select className="px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none">
                    <option>+91 (IN)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">WhatsApp Number</label>
                <div className="flex gap-1">
                  <select className="px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none">
                    <option>+91 (IN)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Enter WhatsApp number"
                    value={formData.whatsApp}
                    onChange={(e) => setFormData({...formData, whatsApp: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-slate-500">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-4">
                <label className="text-slate-500">Address</label>
                <textarea
                  rows={2}
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">City</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">State</label>
                <input
                  type="text"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">PIN Code</label>
                <input
                  type="text"
                  placeholder="Enter PIN code"
                  value={formData.pinCode}
                  onChange={(e) => setFormData({...formData, pinCode: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-500">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="India">India</option>
                  <option value="Nepal">Nepal</option>
                </select>
              </div>

            </div>

          </div>

          {/* Photograph Upload Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Upload Photograph (Optional)
            </span>

            <div className="border-2 border-dashed border-slate-200 hover:border-slate-350 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/30">
              <UploadCloud size={32} className="text-slate-400 mb-2" />
              <span className="text-xs font-black text-slate-700 block">Upload User Photograph</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">PNG, JPG or JPEG (Max. 2MB)</span>
              
              <button
                type="button"
                className="mt-4 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-655 uppercase tracking-wide cursor-pointer transition-all"
              >
                Choose File
              </button>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-6 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-black text-slate-600 uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <span>Save & Next</span>
              <ArrowRight size={14} />
            </button>
          </div>

        </form>
      )}

      {/* 3. PROFILE DETAILS VIEW */}
      {viewMode === 'details' && (() => {
        return (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/users')}
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>User Details</span>
              </button>

              <p className="text-[10px] text-slate-455 font-extrabold uppercase tracking-wide">
                MANAGE USERS &gt; <span className="text-red-500">USER DETAILS</span>
              </p>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <img src={displayUser.photo} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md shadow-slate-100" alt="" />
                
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-black text-slate-850 tracking-tight leading-none">{getUserName(displayUser)}</h1>
                    <span className="bg-emerald-50 text-emerald-750 border border-emerald-105 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none">
                      Active User
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1.5">
                    {displayUser.userType || 'Frequent Traveller'} • ID: {getUserId(displayUser)}
                  </p>
                  <div className="flex gap-2.5 text-[10px] font-semibold text-slate-500 mt-2">
                    <span className="flex items-center gap-0.5"><Phone size={10} className="text-slate-404" /> {displayUser.mobile}</span>
                    <span className="flex items-center gap-0.5"><Mail size={10} className="text-slate-404" /> {displayUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="flex items-center gap-2 self-stretch md:self-auto border-t md:border-none pt-3 md:pt-0">
                <button
                  onClick={() => alert('Restricting user accounts...')}
                  className="flex-1 md:flex-initial px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  Restrict User
                </button>
                <button
                  onClick={() => alert('Blocking user account...')}
                  className="flex-1 md:flex-initial px-4 py-2 bg-slate-50 hover:bg-rose-50 border border-rose-100 text-rose-700 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center"
                >
                  Block User
                </button>
                <button
                  onClick={() => navigate(`/users/edit/${getUserId(displayUser)}`)}
                  className="flex-1 md:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-705 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-md shadow-blue-250 transition-all cursor-pointer text-center"
                >
                  Edit User
                </button>
              </div>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Bookings</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">{displayUser.totalBookings || '23'}</span>
              </div>
              
              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Spent</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">₹{(displayUser.totalSpend || 54650).toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Avg. Booking Value</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">₹2,376</span>
              </div>

              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total App Usage</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">18h 45m</span>
              </div>

              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Avg Daily Usage</span>
                <span className="text-base font-black text-slate-850 block mt-1 leading-none">42m</span>
              </div>

              <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="text-base font-black text-emerald-600 block mt-1 leading-none flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </span>
              </div>
            </div>

            {/* Sub Nav Tabs */}
            <div className="border-b border-slate-100 pb-1 flex gap-6">
              {['Overview', 'Bookings', 'Activity & Usage', 'Searches', 'Notes & Logs'].map(tab => (
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

            {/* Dual Column Content Block */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Usage Analytics bar chart card */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Usage Analytics
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide">Online</span>
                  </div>

                  <div className="flex gap-6 text-[10px] font-semibold text-slate-500 py-1">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Total Time</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">18h 45m</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase block">Daily Avg.</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">42m</span>
                    </div>
                  </div>

                  {/* SVG Bar Chart */}
                  <div className="h-28 flex items-end justify-between pt-4">
                    {[
                      { day: 'Mon', val: 30 },
                      { day: 'Tue', val: 50 },
                      { day: 'Wed', val: 40 },
                      { day: 'Thu', val: 65 },
                      { day: 'Fri', val: 45 },
                      { day: 'Sat', val: 80 },
                      { day: 'Sun', val: 70 }
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                        <div className="w-3.5 bg-blue-100 hover:bg-blue-600 rounded-t-md transition-all cursor-pointer relative group" style={{ height: `${bar.val * 0.9}px` }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {bar.val}m
                          </span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending & Service Analytics (Pie & Util) */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                    Spending & Service Analytics
                  </span>

                  <div className="flex gap-4 items-center">
                    
                    {/* SVG Pie Donut Chart */}
                    <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="10" 
                          strokeDasharray="238.6" strokeDashoffset="52" strokeLinecap="round" />
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="10" 
                          strokeDasharray="238.6" strokeDashoffset="210" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-xs font-black text-slate-805 block">₹54.6k</span>
                        <span className="text-[7px] text-slate-400 font-bold block uppercase tracking-wide">SPENT</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="w-full space-y-2 text-[9px] font-bold text-slate-500 uppercase">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          Tour Packages
                        </span>
                        <span className="font-mono text-slate-800">78%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          Homestays
                        </span>
                        <span className="font-mono text-slate-800">22%</span>
                      </div>
                    </div>

                  </div>

                  {/* Horizontal utilization progress bars */}
                  <div className="space-y-3 pt-2 text-[10px] font-semibold text-slate-655">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Tour Packages Utilization</span>
                        <span className="font-bold">18 Booked</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '78%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Homestays Utilization</span>
                        <span className="font-bold">5 Used</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '22%' }} />
                      </div>
                    </div>
                  </div>

                </div>

                {/* User Status Details */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 text-xs font-semibold text-slate-700">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                    User Status Info
                  </span>

                  <div className="space-y-3.5">
                    <div className="flex justify-between">
                      <span className="text-slate-458">Status Since</span>
                      <span className="font-bold text-slate-850">12 Jan 2024</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-458">Last Login</span>
                      <span className="text-slate-800">Today, 10:30 AM</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-458">Login Device</span>
                      <span className="text-slate-800">iPhone 13 (iOS)</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-50 pt-2.5">
                      <span className="text-slate-458">App Version</span>
                      <span className="text-slate-805">2.4.3</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => alert('Opening full authentication audit logs...')}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer text-center"
                  >
                    View Login History
                  </button>
                </div>

                {/* Status & Security checklist row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className="text-[7px] text-slate-400 font-bold block uppercase tracking-wider">User Risk Status</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">Safe</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <span className="text-[7px] text-slate-400 font-bold block uppercase tracking-wider">Account Security</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">Verified</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Recent Searches */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Recent Searches
                    </span>
                    <button className="text-[9px] font-black text-blue-650 uppercase tracking-wide cursor-pointer hover:underline">
                      View All
                    </button>
                  </div>

                  <div className="space-y-3 font-semibold text-xs text-slate-700">
                    {singleUserDetail.recentSearches.map((sea, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-slate-800">{sea.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{sea.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking History Table */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Booking History
                    </span>
                    <button className="text-[9px] font-black text-blue-650 uppercase tracking-wide cursor-pointer hover:underline">
                      View All Bookings
                    </button>
                  </div>

                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                          <th className="py-2.5 px-4">Booking ID</th>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4">Destination / Property</th>
                          <th className="py-2.5 px-4">Travel Date</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {singleUserDetail.bookings.map((bk, i) => (
                          <tr key={i} className="hover:bg-slate-50/10">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{bk.bookingId}</td>
                            <td className="py-3 px-4 text-[10px] uppercase font-bold text-slate-500">{bk.bookingType}</td>
                            <td className="py-3 px-4 text-slate-800">{bk.property}</td>
                            <td className="py-3 px-4 text-slate-450 font-medium">{bk.travelDate}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-800">{bk.amount}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block border ${
                                bk.status === 'Completed' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-rose-50 text-rose-705 border-rose-100'
                              }`}>
                                {bk.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Viewed Packages & Activity grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Top Viewed Packages */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Top Viewed Packages
                      </span>
                      <button className="text-[9px] font-black text-blue-650 uppercase tracking-wide cursor-pointer hover:underline">
                        View All
                      </button>
                    </div>

                    <div className="space-y-3">
                      {singleUserDetail.topViewedPackages.map((pack, i) => (
                        <div key={i} className="flex gap-2.5 items-center">
                          <img src={pack.image} className="w-10 h-10 rounded-lg object-cover border border-slate-100 bg-slate-50" alt="" />
                          <div>
                            <span className="font-extrabold text-xs text-slate-805 block">{pack.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{pack.views}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Summary */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2.5">
                      Activity Summary
                    </span>

                    <div className="grid grid-cols-2 gap-3 text-center text-xs font-semibold text-slate-655">
                      
                      <div className="bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase block">Total Logins</span>
                        <span className="text-base font-black text-slate-850 block mt-1 leading-none">86</span>
                      </div>

                      <div className="bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase block">Quotation Requests</span>
                        <span className="text-base font-black text-slate-850 block mt-1 leading-none">14</span>
                      </div>

                      <div className="bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase block">Payment Uploads</span>
                        <span className="text-base font-black text-slate-850 block mt-1 leading-none">7</span>
                      </div>

                      <div className="bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                        <span className="text-[8px] font-black text-slate-400 uppercase block">Support Tickets</span>
                        <span className="text-base font-black text-rose-600 block mt-1 leading-none">3</span>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Admin Notes */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Admin Notes
                    </span>
                    <button className="text-[9px] font-black text-blue-650 uppercase tracking-wide cursor-pointer hover:underline">
                      Edit Note
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-650 leading-relaxed font-semibold italic">
                    "{singleUserDetail.adminNotes.content}"
                  </p>

                  <div className="text-[9px] text-slate-400 font-bold border-t border-slate-50 pt-2 flex justify-between">
                    <span>Written by {singleUserDetail.adminNotes.updatedBy}</span>
                    <span>Last updated {singleUserDetail.adminNotes.updatedAt}</span>
                  </div>
                </div>

                {/* Bottom Delete User Box */}
                <div className="bg-rose-50/20 border border-rose-100 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex gap-2.5 items-start">
                    <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg mt-0.5">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">Danger Zone</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Deleting the user account is irreversible and removes all loyalty records.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 self-stretch sm:self-auto">
                    <button 
                      onClick={() => alert('Sending notification memo...')}
                      className="flex-1 sm:flex-initial px-4.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      Send Memo
                    </button>
                    <button 
                      onClick={() => alert('Deleting user profile trigger...')}
                      className="flex-1 sm:flex-initial px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all shadow-sm shadow-rose-100"
                    >
                      Delete User
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}
