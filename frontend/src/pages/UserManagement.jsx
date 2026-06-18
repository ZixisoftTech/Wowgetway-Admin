import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import MetricCard from '../components/widgets/MetricCard.jsx';

const API_BASE_URL = 'https://wow-getway-api.onrender.com/api/dashboard/users';

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
    viewMode = 'profile';
  }

  const selectedId = id || null;
  const [loadedUserId, setLoadedUserId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const itemsPerPage = 6;

  // 1. Fetch User Stats
  const { data: stats = { totalUsers: 0, activeUsers: 0, blockedUsers: 0, newRegistrationsThisMonth: 0, totalBookings: 0, totalRevenueGenerated: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data;
    }
  });

  // 2. Fetch Users List
  const { data: usersList = [], isLoading: listLoading } = useQuery({
    queryKey: ['usersList', searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      const response = await axios.get(API_BASE_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          userType: typeFilter
        }
      });
      return response.data;
    }
  });

  // 3. Fetch Single User Details
  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['userDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId && (viewMode === 'profile' || viewMode === 'edit')
  });

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: async (newUser) => {
      const response = await axios.post(API_BASE_URL, newUser);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      queryClient.invalidateQueries(['userStats']);
      navigate('/users');
      alert('User profile created successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to create user profile');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_BASE_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      queryClient.invalidateQueries(['userStats']);
      queryClient.invalidateQueries(['userDetails', selectedId]);
      navigate('/users');
      alert('User profile updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update user profile');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      queryClient.invalidateQueries(['userStats']);
      navigate('/users');
      alert('User profile deleted successfully (marked as Deleted).');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete user profile');
    }
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, blockStatus }) => {
      const response = await axios.put(`${API_BASE_URL}/${id}`, { status: blockStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      queryClient.invalidateQueries(['userStats']);
      queryClient.invalidateQueries(['userDetails', selectedId]);
      alert('User account status updated.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  });

  // Pagination Helper
  const paginatedUsers = usersList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(usersList.length / itemsPerPage);

  const handleEditClick = (user) => {
    navigate(`/users/edit/${user._id}`);
  };

  const handleViewClick = (user) => {
    navigate(`/users/${user._id}`);
  };

  const handleBlockToggle = (user) => {
    const nextStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
    const msg = user.status === 'Blocked' ? 'Unblock this user account?' : 'Block this user account?';
    if (window.confirm(msg)) {
      blockMutation.mutate({ id: user._id, blockStatus: nextStatus });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user profile?')) {
      deleteMutation.mutate(id);
    }
  };

  // Form State and Helpers
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    whatsApp: '',
    password: '',
    confirmPassword: '',
    photo: '',
    address: { line1: '', line2: '', city: '', state: '', country: 'India', pinCode: '' },
    status: 'Active',
    userType: 'Regular User'
  });

  const [sameAsContact, setSameAsContact] = useState(false);

  React.useEffect(() => {
    if (viewMode === 'add' && loadedUserId !== 'new') {
      setFormData({
        fullName: '',
        email: '',
        mobile: '',
        whatsApp: '',
        password: '',
        confirmPassword: '',
        photo: '',
        address: { line1: '', line2: '', city: '', state: '', country: 'India', pinCode: '' },
        status: 'Active',
        userType: 'Regular User'
      });
      setSameAsContact(false);
      setLoadedUserId('new');
    } else if (viewMode === 'edit' && userDetails && loadedUserId !== selectedId) {
      setFormData({
        fullName: userDetails.fullName || '',
        email: userDetails.email || '',
        mobile: userDetails.mobile || '',
        whatsApp: userDetails.whatsApp || '',
        password: userDetails.password || '',
        confirmPassword: userDetails.password || '',
        photo: userDetails.photo || '',
        address: userDetails.address || { line1: '', line2: '', city: '', state: '', country: 'India', pinCode: '' },
        status: userDetails.status || 'Active',
        userType: userDetails.userType || 'Regular User'
      });
      setSameAsContact(userDetails.mobile === userDetails.whatsApp);
      setLoadedUserId(selectedId);
    } else if (viewMode === 'list' && loadedUserId !== null) {
      setLoadedUserId(null);
    }
  }, [viewMode, userDetails, selectedId, loadedUserId]);

  const handleFormChange = (section, field, val) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: val
        }
      }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [field]: val };
        if (field === 'mobile' && sameAsContact) {
          next.whatsApp = val;
        }
        return next;
      });
    }
  };

  const handleSameContactToggle = (e) => {
    const checked = e.target.checked;
    setSameAsContact(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        whatsApp: prev.mobile
      }));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    const { confirmPassword, ...payload } = formData;
    if (viewMode === 'add') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: payload });
    }
  };

  const handleExportProfile = (user) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `profile_${user.fullName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper for status badge rendering
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full">● Active</span>;
      case 'Inactive':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-full">● Inactive</span>;
      case 'Blocked':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-full">● Blocked</span>;
      case 'Deleted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-full">● Deleted</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ========================================== */}
      {/* 1. LIST & DASHBOARD VIEW */}
      {/* ========================================== */}
      {viewMode === 'list' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Top Dashboard KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            <MetricCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              subtext="Registered clients"
              icon={Users}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-600"
              bgColor="bg-[#edf4ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Active Users"
              value={stats.activeUsers.toLocaleString()}
              subtext="Currently enabled"
              icon={UserCheck}
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-600"
              bgColor="bg-[#ecfbf3]"
              loading={statsLoading}
            />
            <MetricCard
              title="Blocked Users"
              value={stats.blockedUsers.toLocaleString()}
              subtext="Access suspended"
              icon={UserMinus}
              iconBgColor="bg-rose-500/10"
              iconColor="text-rose-650"
              bgColor="bg-[#fff0f4]"
              loading={statsLoading}
            />
            <MetricCard
              title="New Registrations"
              value={stats.newRegistrationsThisMonth}
              subtext="Joined this month"
              icon={Calendar}
              iconBgColor="bg-purple-500/10"
              iconColor="text-purple-650"
              bgColor="bg-[#f8f0ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Total Bookings"
              value={stats.totalBookings.toLocaleString()}
              subtext="Homestays / Hotels / Rides"
              icon={CalendarClock}
              iconBgColor="bg-orange-500/10"
              iconColor="text-orange-650"
              bgColor="bg-[#fff8f0]"
              loading={statsLoading}
            />
            <MetricCard
              title="Total Revenue"
              value={`₹ ${stats.totalRevenueGenerated.toLocaleString()}`}
              subtext="Spend aggregated"
              icon={Banknote}
              iconBgColor="bg-sky-500/10"
              iconColor="text-sky-650"
              bgColor="bg-[#edf9ff]"
              loading={statsLoading}
            />
          </div>

          {/* Manage Users Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Manage Users</h2>
              <p className="text-xs text-slate-400 font-bold leading-relaxed mt-0.5">
                View and manage all registered customers.
              </p>
            </div>
            <button
              onClick={() => navigate('/users/add')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-655 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 text-xs font-bold tracking-wide transition-all cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Add New User</span>
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" size={16} />
              <input
                type="text"
                placeholder="Search by User ID, Name, Phone or Email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            {/* Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 px-3 py-2 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-600 px-3 py-2 focus:outline-none"
                >
                  <option value="All">All Types</option>
                  <option value="Regular User">Regular User</option>
                  <option value="Frequent Traveller">Frequent Traveller</option>
                  <option value="VIP User">VIP User</option>
                  <option value="Corporate User">Corporate User</option>
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            {listLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">Loading user records...</div>
            ) : paginatedUsers.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">No matching user records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                      <th className="py-4 px-6">User ID</th>
                      <th className="py-4 px-4">Full Name</th>
                      <th className="py-4 px-4">Contact No.</th>
                      <th className="py-4 px-4 text-center">WhatsApp</th>
                      <th className="py-4 px-4">Email & Password</th>
                      <th className="py-4 px-4">City</th>
                      <th className="py-4 px-4 text-center">Reg. Date</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {paginatedUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-400">#{user._id}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={user.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                              alt={user.fullName} 
                              className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 shadow-sm"
                            />
                            <div>
                              <div className="font-extrabold text-slate-800">{user.fullName}</div>
                              <div className="text-[10px] font-bold text-slate-400">Joined: {new Date(user.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-400" />
                              <span>{user.mobile}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-1 rounded-md border border-emerald-100 shadow-sm">
                              <Send size={10} className="fill-emerald-600 stroke-none" />
                              Verified
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-slate-500 font-medium">
                              <Mail size={11} className="text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                            <span className="text-[10px] font-bold tracking-widest text-slate-300">••••••••</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">{user.address?.city || 'N/A'}</td>
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {new Date(user.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 text-center">{getStatusBadge(user.status)}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewClick(user)}
                              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors border border-slate-150 cursor-pointer"
                              title="View Profile"
                            >
                              <Eye size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-650 hover:text-indigo-600 rounded-lg transition-colors border border-slate-150 cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => handleBlockToggle(user)}
                              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                                user.status === 'Blocked' 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-150' 
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-150'
                              }`}
                              title={user.status === 'Blocked' ? 'Unblock User' : 'Block User'}
                            >
                              <UserMinus size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
                              className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors border border-slate-150 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={14} className="stroke-[2.5]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Cards Stack View */}
          <div className="md:hidden space-y-4">
            {listLoading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">Loading user profiles...</div>
            ) : paginatedUsers.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">No matching user records.</div>
            ) : (
              paginatedUsers.map((user) => (
                <div key={user._id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                        alt={user.fullName} 
                        className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{user.fullName}</h4>
                        <span className="text-[10px] text-slate-400 font-bold block">ID: #{user._id}</span>
                      </div>
                    </div>
                    {getStatusBadge(user.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-b border-slate-50 py-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mobile</span>
                      <span className="text-slate-700 font-bold">{user.mobile}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Bookings</span>
                      <span className="text-slate-700 font-bold">{user.totalBookings} Completed</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => handleViewClick(user)}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-150 rounded-xl transition-all text-center cursor-pointer"
                    >
                      View Details
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 bg-slate-50 text-slate-600 border border-slate-150 rounded-lg cursor-pointer"
                      >
                        <Edit2 size={13} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="p-2 bg-slate-50 text-rose-600 border border-slate-150 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={13} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Row */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-1">
              <span className="text-xs text-slate-400 font-bold">
                Showing {Math.min(usersList.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(usersList.length, currentPage * itemsPerPage)} of {usersList.length} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-slate-150 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={16} className="stroke-[2.5]" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page 
                        ? 'bg-blue-650 text-white shadow-md shadow-blue-200' 
                        : 'bg-white border border-slate-150 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-slate-150 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

        </motion.div>
      )}

      {/* ========================================== */}
      {/* 2. ADD / EDIT USER FORM PAGE */}
      {/* ========================================== */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/users')}
              className="p-2.5 bg-white border border-slate-155 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} className="stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {viewMode === 'add' ? 'Add New User' : 'Edit User Profile'}
              </h2>
              <p className="text-xs text-slate-400 font-bold leading-relaxed mt-0.5">
                {viewMode === 'add' ? 'Register and configure a new customer account.' : `Modify details for User ID: #${selectedId}`}
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form Column (Sections 1 & 3 & 4) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section 1: Personal Information */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-650 rounded-full"></span>
                    Section 1: Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => handleFormChange(null, 'fullName', e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleFormChange(null, 'email', e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={formData.mobile}
                        onChange={(e) => handleFormChange(null, 'mobile', e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">WhatsApp Number</label>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAsContact}
                            onChange={handleSameContactToggle}
                            className="rounded border-slate-300 text-blue-650 focus:ring-blue-650"
                          />
                          Same as mobile
                        </label>
                      </div>
                      <input
                        type="text"
                        required
                        disabled={sameAsContact}
                        value={formData.whatsApp}
                        onChange={(e) => handleFormChange(null, 'whatsApp', e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={viewMode === 'add'}
                          value={formData.password}
                          onChange={(e) => handleFormChange(null, 'password', e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Confirm Password</label>
                      <input
                        type="password"
                        required={viewMode === 'add'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleFormChange(null, 'confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Address Information */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-650 rounded-full"></span>
                    Section 2: Address Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.address.line1}
                        onChange={(e) => handleFormChange('address', 'line1', e.target.value)}
                        placeholder="Street address, P.O. box, company name"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        value={formData.address.line2}
                        onChange={(e) => handleFormChange('address', 'line2', e.target.value)}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">City</label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => handleFormChange('address', 'city', e.target.value)}
                        placeholder="City"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">State / Province</label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => handleFormChange('address', 'state', e.target.value)}
                        placeholder="State / Province"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => handleFormChange('address', 'country', e.target.value)}
                        placeholder="Country"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Pin / Zip Code</label>
                      <input
                        type="text"
                        value={formData.address.pinCode}
                        onChange={(e) => handleFormChange('address', 'pinCode', e.target.value)}
                        placeholder="Pin / Zip Code"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Sidebar Form Column */}
              <div className="space-y-6">
                
                {/* Profile Photo Uploader */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block self-start">Profile Photo</label>
                  
                  <div className="w-28 h-28 rounded-full border-2 border-slate-150 shadow-sm relative overflow-hidden bg-slate-50 flex items-center justify-center">
                    {formData.photo ? (
                      <img src={formData.photo} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserPlus size={36} className="text-slate-300" />
                    )}
                  </div>
                  
                  <div className="w-full">
                    <input
                      type="text"
                      value={formData.photo}
                      onChange={(e) => handleFormChange(null, 'photo', e.target.value)}
                      placeholder="Photo URL (e.g. https://...)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-155 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">Paste a public image address to update user photo</span>
                  </div>
                </div>

                {/* Section 3: Account Settings */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-650 rounded-full"></span>
                    Section 3: Account Settings
                  </h3>
                  
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Account Status</label>
                    <div className="flex flex-col gap-2">
                      {['Active', 'Inactive', 'Blocked'].map((status) => (
                        <label 
                          key={status} 
                          className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                            formData.status === status
                              ? 'bg-blue-50/50 border-blue-500 text-blue-700 shadow-sm'
                              : 'bg-slate-50 border-slate-150 hover:bg-slate-100/50 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            checked={formData.status === status}
                            onChange={() => handleFormChange(null, 'status', status)}
                            className="text-blue-650 focus:ring-blue-650 border-slate-300"
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 4: User Type */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-650 rounded-full"></span>
                    Section 4: User Type
                  </h3>
                  
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">User Privilege Tier</label>
                    <div className="flex flex-col gap-2">
                      {['Regular User', 'Frequent Traveller', 'VIP User', 'Corporate User'].map((tier) => (
                        <label 
                          key={tier} 
                          className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl cursor-pointer text-xs font-bold transition-all ${
                            formData.userType === tier
                              ? 'bg-blue-50/50 border-blue-500 text-blue-700 shadow-sm'
                              : 'bg-slate-50 border-slate-155 hover:bg-slate-100/50 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="userType"
                            checked={formData.userType === tier}
                            onChange={() => handleFormChange(null, 'userType', tier)}
                            className="text-blue-650 focus:ring-blue-650 border-slate-300"
                          />
                          <span>{tier}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 z-35 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-white/85 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold tracking-wide transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-655 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-100 text-xs font-bold tracking-wide transition-colors cursor-pointer"
              >
                {viewMode === 'add' ? 'Save Changes' : 'Update Profile'}
              </button>
            </div>

          </form>
        </motion.div>
      )}

      {/* ========================================== */}
      {/* 3. USER PROFILE DETAILS VIEW */}
      {/* ========================================== */}
      {viewMode === 'profile' && userDetails && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-55 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/users')}
                className="p-2.5 bg-white border border-slate-155 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft size={16} className="stroke-[2.5]" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">User Details</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Profile metadata, history and loyalty metrics</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleEditClick(userDetails)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-650 hover:text-indigo-650 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Edit2 size={13} className="stroke-[2.5]" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => handleBlockToggle(userDetails)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  userDetails.status === 'Blocked' 
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' 
                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                }`}
              >
                <UserMinus size={13} className="stroke-[2.5]" />
                <span>{userDetails.status === 'Blocked' ? 'Unblock User' : 'Block User'}</span>
              </button>
              <button
                onClick={() => handleExportProfile(userDetails)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <ExternalLink size={13} className="stroke-[2.5]" />
                <span>Export Profile</span>
              </button>
              <button
                onClick={() => handleDelete(userDetails._id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Profile Header Banner */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img 
                src={userDetails.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt={userDetails.fullName} 
                className="w-[75px] h-[75px] rounded-full object-cover border-4 border-slate-50 shadow-md"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{userDetails.fullName}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-extrabold border border-blue-100 uppercase tracking-wider">
                    {userDetails.userType}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <span>User ID: #{userDetails._id}</span>
                  <span>•</span>
                  <span>Joined: {new Date(userDetails.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="pt-0.5 flex items-center gap-2 text-xs font-bold">
                  <span className="text-slate-400">Account status:</span>
                  {getStatusBadge(userDetails.status)}
                </div>
              </div>
            </div>
            
            {/* Overview KPI Mini Card row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 border border-slate-100 rounded-xl p-4 md:w-auto w-full">
              <div className="text-center px-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Spent</span>
                <span className="text-sm font-black text-slate-800 block">₹ {userDetails.totalSpend.toLocaleString()}</span>
              </div>
              <div className="text-center px-2.5 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Bookings</span>
                <span className="text-sm font-black text-slate-800 block">{userDetails.totalBookings}</span>
              </div>
              <div className="text-center px-2.5 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reward Points</span>
                <span className="text-sm font-black text-slate-800 block flex items-center justify-center gap-0.5 text-blue-600">
                  <Award size={13} className="text-blue-500" />
                  {userDetails.rewardPoints}
                </span>
              </div>
              <div className="text-center px-2.5 border-l border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Cancelled</span>
                <span className="text-sm font-black text-rose-600 block">{userDetails.cancelledBookings}</span>
              </div>
            </div>
          </div>

          {/* Profile Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Personal Contact Details Card */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3">Personal Details</h4>
                
                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Email Address</span>
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      {userDetails.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Mobile Number</span>
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {userDetails.mobile}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">WhatsApp Link</span>
                    <a 
                      href={`https://wa.me/${userDetails.whatsApp}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1.5"
                    >
                      <Send size={13} className="fill-emerald-600 stroke-none" />
                      {userDetails.whatsApp}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Registered Address</span>
                    <div className="text-slate-700 flex items-start gap-1.5 leading-relaxed">
                      <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div>{userDetails.address?.line1 || 'N/A'}</div>
                        {userDetails.address?.line2 && <div>{userDetails.address.line2}</div>}
                        <div>{userDetails.address?.city || 'N/A'}, {userDetails.address?.state || ''}</div>
                        <div>{userDetails.address?.country || 'India'} - {userDetails.address?.pinCode || ''}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Activity log & Quick Actions widget */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3">User App Activity</h4>
                
                <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">App Usage Index:</span>
                    <span className="text-slate-800 font-extrabold">{userDetails.averageDailyUsage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Last Booking:</span>
                    <span className="text-slate-800">
                      {userDetails.activity?.lastBooking 
                        ? new Date(userDetails.activity.lastBooking).toLocaleDateString('en-IN') 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Last Payment:</span>
                    <span className="text-slate-800">
                      {userDetails.activity?.lastPayment 
                        ? new Date(userDetails.activity.lastPayment).toLocaleDateString('en-IN') 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Last Activity:</span>
                    <span className="text-slate-800">
                      {userDetails.activity?.lastAppActivity 
                        ? new Date(userDetails.activity.lastAppActivity).toLocaleDateString('en-IN') 
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Columns: Charts & Logs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Engagement Overview & spend Charts */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3">Engagement Overview</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Spend Area Chart */}
                  <div className="h-[200px] flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Spending History</span>
                    <div className="flex-1 w-full text-[10px] mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={[
                            { name: 'Jan', value: 4500 },
                            { name: 'Feb', value: 12500 },
                            { name: 'Mar', value: 8000 },
                            { name: 'Apr', value: 19500 },
                            { name: 'May', value: userDetails.totalSpend }
                          ]} 
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#spendGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Booking Types Distribution Pie Chart */}
                  <div className="h-[200px] flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Booking Types Share</span>
                    <div className="flex-1 w-full text-[10px] mt-2 flex items-center justify-between">
                      <div className="w-[120px] h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Homestays', value: 5 },
                                { name: 'Hotels', value: 2 },
                                { name: 'Rides', value: 3 },
                                { name: 'Sightseeing', value: 1 }
                              ]}
                              innerRadius={25}
                              outerRadius={45}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#2563EB" />
                              <Cell fill="#10B981" />
                              <Cell fill="#F59E0B" />
                              <Cell fill="#8B5CF6" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend */}
                      <div className="space-y-1 text-[10px] font-bold text-slate-550 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 block"></span>
                          <span>Homestays</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                          <span>Hotels</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 block"></span>
                          <span>Rides</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-50 block"></span>
                          <span>Sightseeing</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Booking History logs Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Booking History</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{userDetails.bookings?.length || 0} Booking records</span>
                </div>
                
                {userDetails.bookings && userDetails.bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Booking ID</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Property & Loc</th>
                          <th className="py-3 px-4">Check-In / Out</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                        {userDetails.bookings.map((b, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-bold text-slate-400">{b.bookingId}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                b.bookingType === 'Homestay' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                b.bookingType === 'Hotel' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                b.bookingType === 'Ride' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                'bg-purple-50 border-purple-100 text-purple-600'
                              }`}>
                                {b.bookingType}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-800 font-bold">{b.property}</div>
                              <div className="text-[10px] text-slate-400">{b.location}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {new Date(b.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(b.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-800">₹{b.amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                b.status === 'Upcoming' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                b.status === 'Rescheduled' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs font-bold text-slate-400">No booking history recorded.</div>
                )}
              </div>

              {/* Payment history list */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Transaction History</h4>
                  <span className="text-[10px] text-slate-400 font-bold">{userDetails.payments?.length || 0} Transactions</span>
                </div>
                
                {userDetails.payments && userDetails.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Transaction ID</th>
                          <th className="py-3 px-4">Settled Date</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                        {userDetails.payments.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.transactionId}</td>
                            <td className="py-3 px-4 font-bold text-slate-400">
                              {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-600">{p.paymentMethod}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-800">₹{p.amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                p.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs font-bold text-slate-400">No payment transaction records.</div>
                )}
              </div>

            </div>

          </div>

        </motion.div>
      )}
    </div>
  );
}
