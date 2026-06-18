import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Car
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';

const API_RIDERS_URL = 'https://wow-getway-api.onrender.com/api/dashboard/riders';

const safeFormatDate = (dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', options);
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

  const [localSelectedId, setLocalSelectedId] = useState('DR1025');
  const selectedId = id || localSelectedId;

  const [loadedRiderId, setLoadedRiderId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [activePreviewDoc, setActivePreviewDoc] = useState(null);

  // 1. Fetch Riders List
  const { data: ridersList = [], isLoading: listLoading } = useQuery({
    queryKey: ['ridersList', searchQuery, statusFilter, availabilityFilter, vehicleTypeFilter, ratingFilter, locationFilter],
    queryFn: async () => {
      const response = await axios.get(API_RIDERS_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          availability: availabilityFilter,
          vehicleType: vehicleTypeFilter,
          rating: ratingFilter,
          location: locationFilter
        }
      });
      return response.data;
    }
  });

  // 2. Fetch Stats
  const { data: stats = { totalRiders: 0, activeRiders: 0, availableRiders: 0, onTripRiders: 0, inactiveRiders: 0, totalEarningsThisMonth: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['ridersStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDERS_URL}/stats`);
      return response.data;
    }
  });

  // 3. Fetch Single Rider Details
  const { data: riderDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['riderDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_RIDERS_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId
  });

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: async (newRider) => {
      const response = await axios.post(API_RIDERS_URL, newRider);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ridersList']);
      queryClient.invalidateQueries(['ridersStats']);
      navigate('/riders');
      alert('Rider registered successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to register rider');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_RIDERS_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ridersList']);
      queryClient.invalidateQueries(['ridersStats']);
      queryClient.invalidateQueries(['riderDetails', selectedId]);
      navigate('/riders');
      alert('Rider details updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update rider settings');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_RIDERS_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ridersList']);
      queryClient.invalidateQueries(['ridersStats']);
      setLocalSelectedId('DR1025');
      navigate('/riders');
      alert('Rider profile deleted successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete rider');
    }
  });

  // Form handling state
  const initialFormState = {
    firstName: '',
    lastName: '',
    fatherName: '',
    email: '',
    mobile: '',
    whatsApp: '',
    dob: '',
    gender: 'Male',
    emergencyContact: '',
    aadharNo: '',
    panNo: '',
    drivingLicenseNo: '',
    licenseExpiryDate: '',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: '',
      model: '',
      vehicleNumber: '',
      color: '',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    tempAddress: { line1: '', city: '', state: '', pinCode: '' },
    permAddress: { line1: '', city: '', state: '', pinCode: '' },
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    status: 'Active',
    availability: 'Available'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [sameAsTempAddress, setSameAsTempAddress] = useState(false);

  const handleAddClick = () => {
    navigate('/riders/add');
  };

  const handleEditClick = (rider) => {
    navigate(`/riders/edit/${rider._id}`);
  };

  useEffect(() => {
    if (viewMode === 'edit' && riderDetails && loadedRiderId !== selectedId) {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      };

      setFormData({
        firstName: riderDetails.firstName || '',
        lastName: riderDetails.lastName || '',
        fatherName: riderDetails.fatherName || '',
        email: riderDetails.email || '',
        mobile: riderDetails.mobile || '',
        whatsApp: riderDetails.whatsApp || '',
        dob: formatDate(riderDetails.dob),
        gender: riderDetails.gender || 'Male',
        emergencyContact: riderDetails.emergencyContact || '',
        aadharNo: riderDetails.aadharNo || '',
        panNo: riderDetails.panNo || '',
        drivingLicenseNo: riderDetails.drivingLicenseNo || '',
        licenseExpiryDate: formatDate(riderDetails.licenseExpiryDate),
        vehicle: {
          vehicleType: riderDetails.vehicle?.vehicleType || 'Sedan (4 Seater)',
          brand: riderDetails.vehicle?.brand || '',
          model: riderDetails.vehicle?.model || '',
          vehicleNumber: riderDetails.vehicle?.vehicleNumber || '',
          color: riderDetails.vehicle?.color || '',
          fuelType: riderDetails.vehicle?.fuelType || 'Petrol',
          seatingCapacity: riderDetails.vehicle?.seatingCapacity || 4
        },
        tempAddress: {
          line1: riderDetails.tempAddress?.line1 || '',
          city: riderDetails.tempAddress?.city || '',
          state: riderDetails.tempAddress?.state || '',
          pinCode: riderDetails.tempAddress?.pinCode || ''
        },
        permAddress: {
          line1: riderDetails.permAddress?.line1 || '',
          city: riderDetails.permAddress?.city || '',
          state: riderDetails.permAddress?.state || '',
          pinCode: riderDetails.permAddress?.pinCode || ''
        },
        bankName: riderDetails.bankName || '',
        accountNumber: riderDetails.accountNumber || '',
        ifscCode: riderDetails.ifscCode || '',
        upiId: riderDetails.upiId || '',
        status: riderDetails.status || 'Active',
        availability: riderDetails.availability || 'Available'
      });
      setSameAsTempAddress(false);
      setLoadedRiderId(selectedId);
    } else if (viewMode === 'add' && loadedRiderId !== 'new') {
      setFormData(initialFormState);
      setSameAsTempAddress(false);
      setLoadedRiderId('new');
    } else if (viewMode === 'list' && loadedRiderId !== null) {
      setLoadedRiderId(null);
    }
  }, [viewMode, riderDetails, selectedId, loadedRiderId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => {
      const parentObj = { ...prev[parent], [field]: value };
      
      // Address linking logic
      let updatedPermAddress = prev.permAddress;
      if (parent === 'tempAddress' && sameAsTempAddress) {
        updatedPermAddress = { ...prev.tempAddress, [field]: value };
      }

      return {
        ...prev,
        [parent]: parentObj,
        permAddress: updatedPermAddress
      };
    });
  };

  const handleSameAddressToggle = (checked) => {
    setSameAsTempAddress(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permAddress: { ...prev.tempAddress }
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (viewMode === 'add') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: formData });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to permanently delete this rider profile?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    updateMutation.mutate({
      id,
      updatedData: { status: newStatus }
    });
  };

  const handleAvailabilityChange = (id, newAvailability) => {
    updateMutation.mutate({
      id,
      updatedData: { availability: newAvailability }
    });
  };

  const handleVerifyDocument = (docName, status) => {
    if (!riderDetails) return;
    const updatedDocs = { ...riderDetails.documents, [docName]: status };
    updateMutation.mutate({
      id: selectedId,
      updatedData: { documents: updatedDocs }
    });
  };

  const handlePreviewDocument = (docKey, label, status) => {
    if (!riderDetails) return;
    let docValue = '';
    
    if (docKey === 'drivingLicense') {
      docValue = riderDetails.drivingLicenseNo || 'DL-122020000456';
    } else if (docKey === 'aadharFront' || docKey === 'aadharBack') {
      docValue = riderDetails.aadharNo || '1234-5678-9012';
    } else if (docKey === 'panCard') {
      docValue = riderDetails.panNo || 'ABCDE1234F';
    } else if (docKey === 'rcBook') {
      docValue = riderDetails.vehicle?.vehicleNumber || 'DL3CAB3456';
    } else if (docKey === 'insurance') {
      docValue = 'INS-7789012-POL';
    } else {
      docValue = 'N/A';
    }

    setActivePreviewDoc({
      key: docKey,
      label,
      status,
      value: docValue
    });
  };

  // Badge Color Styles
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Inactive':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      case 'Suspended':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'Pending Verification':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const getAvailabilityBadgeStyle = (avail) => {
    switch (avail) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'On Trip':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Offline':
        return 'bg-slate-50 text-slate-400 border border-slate-100';
      case 'Busy':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const getDocumentStatusStyle = (status) => {
    switch (status) {
      case 'Verified':
        return 'bg-emerald-50 text-emerald-700';
      case 'Pending':
        return 'bg-amber-50 text-amber-700';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-50 text-slate-500';
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
                <User className="text-teal-600 w-6 h-6 stroke-[2.5]" />
                <span>Manage Riders</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                View and manage all registered drivers who provide rides to your guests.
              </p>
            </div>
            
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add New Rider</span>
            </button>
          </div>

          {/* Quick filter row to match screenshot exactly */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Driver Name, Phone, or Vehicle Number..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-755 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
              <button
                onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                className={`px-4 py-2.5 bg-white border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  showFiltersDropdown ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FilterTriangle className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>

              {/* Quick status shortcut pills */}
              <div className="flex items-center gap-1.5 bg-slate-100/60 p-1 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => { setStatusFilter('All'); setAvailabilityFilter('All'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'All' && availabilityFilter === 'All'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/40'
                  }`}
                >
                  All Riders
                </button>
                <button
                  onClick={() => { setStatusFilter('Active'); setAvailabilityFilter('All'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'Active' && availabilityFilter === 'All'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-200/40'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => { setStatusFilter('Inactive'); setAvailabilityFilter('All'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'Inactive'
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-200/40'
                  }`}
                >
                  Inactive
                </button>
                <button
                  onClick={() => { setStatusFilter('All'); setAvailabilityFilter('On Trip'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    availabilityFilter === 'On Trip'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-200/40'
                  }`}
                >
                  On Trip
                </button>
                <button
                  onClick={() => { setStatusFilter('All'); setAvailabilityFilter('Available'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    availabilityFilter === 'Available'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-650 hover:bg-slate-200/40'
                  }`}
                >
                  Available
                </button>
              </div>
            </div>
          </div>

          {/* Advanced filters dropdown */}
          {showFiltersDropdown && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Pending Verification">Pending Verification</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Availability</label>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Availabilities</option>
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Offline">Offline</option>
                  <option value="Busy">Busy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Type</label>
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Vehicles</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Shared">Shared Shuttle</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rating (Minimum)</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Ratings</option>
                  <option value="4.5">★ 4.5 & Above</option>
                  <option value="4.0">★ 4.0 & Above</option>
                  <option value="3.5">★ 3.5 & Above</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                    <th className="py-4 px-4 pl-6">Rider ID</th>
                    <th className="py-4 px-4">Profile Photo</th>
                    <th className="py-4 px-4">Rider Name</th>
                    <th className="py-4 px-4">Joining Date</th>
                    <th className="py-4 px-4">Mobile Number</th>
                    <th className="py-4 px-4">WhatsApp Number</th>
                    <th className="py-4 px-4">Vehicle Type</th>
                    <th className="py-4 px-4">Vehicle Number</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Availability</th>
                    <th className="py-4 px-4">Rating</th>
                    <th className="py-4 px-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-450">
                        <div className="flex justify-center gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
                        </div>
                      </td>
                    </tr>
                  ) : ridersList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-450 font-medium">
                        No fleet riders found matching filters.
                      </td>
                    </tr>
                  ) : (
                    ridersList.map((rider) => {
                      const isSelected = selectedId === rider._id;
                      return (
                        <tr 
                          key={rider._id} 
                          onClick={() => setLocalSelectedId(rider._id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/20 hover:bg-blue-50/35' : 'hover:bg-slate-50/40'
                          }`}
                        >
                          <td className="py-3.5 px-4 pl-6 font-mono text-[10px] text-slate-450 font-bold">#{rider._id}</td>
                          <td className="py-3.5 px-4">
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-150 flex-shrink-0 bg-slate-100 shadow-sm">
                              <img src={rider.documents?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} className="w-full h-full object-cover" alt="" />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-800">{rider.firstName} {rider.lastName}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">
                            {safeFormatDate(rider.joinedDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <a 
                              href={`tel:${rider.mobile}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-655 hover:text-blue-600 flex items-center gap-1"
                            >
                              <Phone size={12} className="text-slate-400" />
                              <span>{rider.mobile}</span>
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            <a 
                              href={`https://wa.me/${rider.whatsApp?.replace(/\+/g, '').replace(/ /g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-655 hover:text-emerald-600 flex items-center gap-1"
                            >
                              <Send size={12} className="text-slate-450 rotate-45" />
                              <span>{rider.whatsApp}</span>
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-750">{rider.vehicle?.brand} {rider.vehicle?.model}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{rider.vehicle?.vehicleType}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono uppercase text-[10px] text-slate-600 font-bold">{rider.vehicle?.vehicleNumber}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeStyle(rider.status)}`}>
                              {rider.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getAvailabilityBadgeStyle(rider.availability)}`}>
                              {rider.availability}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] text-slate-655 font-bold flex items-center gap-0.5">
                              <Star size={10} className="text-amber-450 fill-amber-450" />
                              <span>{rider.rating}</span>
                              <span className="text-slate-400 font-medium">({rider.performance?.totalRides || 0})</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => { setLocalSelectedId(rider._id); navigate(`/riders/${rider._id}`); }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => handleEditClick(rider)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Rider"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(rider._id, rider.status === 'Active' ? 'Inactive' : 'Active')}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title={rider.status === 'Active' ? 'Deactivate' : 'Activate'}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(rider._id)}
                                className="p-1.5 bg-rose-55 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Delete Profile"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50/50 border-t border-slate-100 px-5 py-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Showing {ridersList.length} riders</span>
            </div>
          </div>

          {/* Double panel section at the bottom to match screenshot exactly */}
          {riderDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
              
              {/* Left Panel: Rider Details */}
              <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Rider Details</span>
                  </h3>
                  <button 
                    onClick={() => navigate(`/riders/${selectedId}`)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    <span>Back to Riders List</span>
                    <ChevronRight size={10} className="rotate-180" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pb-4 border-b border-slate-50">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50">
                    <img src={riderDetails.documents?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="text-center sm:text-left space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-base font-bold text-slate-800">{riderDetails.firstName} {riderDetails.lastName}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeStyle(riderDetails.status)}`}>
                        {riderDetails.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Rider ID: <span className="text-slate-800">#{riderDetails._id}</span>
                      <span className="mx-2">•</span>
                      Joined on {safeFormatDate(riderDetails.joinedDate)}
                    </p>
                    <div className="flex justify-center sm:justify-start gap-2 pt-1">
                      <button
                        onClick={() => handleEditClick(riderDetails)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Edit2 size={10} />
                        <span>Edit Rider</span>
                      </button>
                      <a
                        href={`https://wa.me/${riderDetails.whatsApp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Send size={10} className="rotate-45" />
                        <span>Send Message</span>
                      </a>
                      <button
                        onClick={() => handleStatusChange(riderDetails._id, riderDetails.status === 'Active' ? 'Inactive' : 'Active')}
                        className={`px-3.5 py-1.5 border rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          riderDetails.status === 'Active' 
                            ? 'border-rose-100 text-rose-700 bg-rose-50/30 hover:bg-rose-50' 
                            : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {riderDetails.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub info grids */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contact Information</span>
                    <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-slate-400" />
                        <span>{riderDetails.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Send size={11} className="text-slate-400 rotate-45" />
                        <span>{riderDetails.whatsApp}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail size={11} className="text-slate-400" />
                        <span className="truncate" title={riderDetails.email}>{riderDetails.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Home size={11} className="text-slate-400" />
                        <span className="truncate">{riderDetails.tempAddress?.line1 || 'N/A'}, {riderDetails.tempAddress?.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-slate-55/60 pt-4 sm:pt-0 sm:pl-5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Vehicle Information</span>
                    <div className="space-y-1.5 text-[11px] font-semibold text-slate-750">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle Type:</span>
                        <span>{riderDetails.vehicle.vehicleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span>{riderDetails.vehicle.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle No.:</span>
                        <span className="font-mono uppercase">{riderDetails.vehicle.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fuel Type:</span>
                        <span>{riderDetails.vehicle.fuelType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-slate-55/60 pt-4 sm:pt-0 sm:pl-5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Documents</span>
                    <div className="space-y-1.5 text-[10px] font-bold">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Driving License</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${getDocumentStatusStyle(riderDetails.documents?.drivingLicense)}`}>
                          {riderDetails.documents?.drivingLicense}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">RC Book</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${getDocumentStatusStyle(riderDetails.documents?.rcBook)}`}>
                          {riderDetails.documents?.rcBook}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Insurance</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] ${getDocumentStatusStyle(riderDetails.documents?.insurance)}`}>
                          {riderDetails.documents?.insurance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance indicators */}
                <div className="border-t border-slate-50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Rides</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5">{riderDetails.performance?.totalRides || 0}</span>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Earnings</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5 font-mono">₹{riderDetails.performance?.totalEarnings?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Average Rating</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5 font-mono">★ {riderDetails.rating} / 5</span>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
                    <span className="text-sm font-black text-emerald-650 block mt-0.5 font-mono">{riderDetails.performance?.completionRate}%</span>
                  </div>
                </div>

              </div>

              {/* Right Panel: Recent Ride History */}
              <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recent Ride History
                  </h3>
                  <button 
                    onClick={() => navigate(`/riders/${selectedId}`)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    <span>View All</span>
                    <ChevronRight size={10} />
                  </button>
                </div>

                <div className="overflow-x-auto flex-1 min-h-[220px]">
                  <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5">Ride ID</th>
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Route</th>
                        <th className="py-2.5 text-right">Fare</th>
                        <th className="py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/60 font-medium">
                      {riderDetails.rideHistory?.slice(0, 4).map((hist, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="py-3 font-mono text-[9px] text-slate-400">#{hist.rideId}</td>
                          <td className="py-3 text-slate-500">{safeFormatDate(hist.date, {day: 'numeric', month: 'short'})}</td>
                          <td className="py-3 text-slate-700 max-w-[120px] truncate" title={`${hist.pickup} → ${hist.drop}`}>
                            {hist.pickup} → {hist.drop}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-800">₹{hist.fare}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              hist.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {hist.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </motion.div>
      )}

      {/* 2. FORM VIEW (ADD / EDIT) */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/riders')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                {viewMode === 'add' ? 'Register Fleet Rider' : 'Edit Rider Coordinates'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Onboard drivers, assign vehicles, establish KYC checklists, and document payment cards.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pb-24">
            
            {/* Grid of Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              
              {/* Section 1: Personal Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                  <User size={13} className="text-indigo-500" />
                  <span>Personal Information</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="e.g. Kumar"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Father's Name</label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => handleInputChange('fatherName', e.target.value)}
                      placeholder="e.g. Madan Lal"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="ramesh@gmail.com"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      placeholder="+91 9988776655"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Number</label>
                    <input
                      type="text"
                      value={formData.whatsApp}
                      onChange={(e) => handleInputChange('whatsApp', e.target.value)}
                      placeholder="9988776655"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Emergency Phone</label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="+91 9988776611"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: KYC Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-indigo-500" />
                  <span>KYC Information</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aadhaar Card No. *</label>
                    <input
                      type="text"
                      required
                      value={formData.aadharNo}
                      onChange={(e) => handleInputChange('aadharNo', e.target.value)}
                      placeholder="1234-5678-9012"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PAN Card No. *</label>
                    <input
                      type="text"
                      required
                      value={formData.panNo}
                      onChange={(e) => handleInputChange('panNo', e.target.value)}
                      placeholder="ABCDE1234F"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Driving License No. *</label>
                    <input
                      type="text"
                      required
                      value={formData.drivingLicenseNo}
                      onChange={(e) => handleInputChange('drivingLicenseNo', e.target.value)}
                      placeholder="DL-122020000456"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">License Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.licenseExpiryDate}
                      onChange={(e) => handleInputChange('licenseExpiryDate', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Vehicle Information */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                  <Car size={13} className="text-indigo-500" />
                  <span>Vehicle Specifications</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Vehicle Type *</label>
                    <select
                      value={formData.vehicle.vehicleType}
                      onChange={(e) => handleNestedInputChange('vehicle', 'vehicleType', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="Sedan (4 Seater)">Sedan (4 Seater)</option>
                      <option value="SUV (6 Seater)">SUV (6 Seater)</option>
                      <option value="Hatchback (4 Seater)">Hatchback (4 Seater)</option>
                      <option value="Shared (12 Seater)">Shared Shuttle (12 Seater)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Brand Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.vehicle.brand}
                      onChange={(e) => handleNestedInputChange('vehicle', 'brand', e.target.value)}
                      placeholder="e.g. Maruti Suzuki"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Model Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.vehicle.model}
                      onChange={(e) => handleNestedInputChange('vehicle', 'model', e.target.value)}
                      placeholder="Dzire"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Plate Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.vehicle.vehicleNumber}
                      onChange={(e) => handleNestedInputChange('vehicle', 'vehicleNumber', e.target.value)}
                      placeholder="DL3CAB3456"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Color</label>
                    <input
                      type="text"
                      value={formData.vehicle.color}
                      onChange={(e) => handleNestedInputChange('vehicle', 'color', e.target.value)}
                      placeholder="White"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fuel Type</label>
                    <select
                      value={formData.vehicle.fuelType}
                      onChange={(e) => handleNestedInputChange('vehicle', 'fuelType', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="CNG">CNG</option>
                      <option value="EV">EV / Electric</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Seats Capacity</label>
                    <input
                      type="number"
                      value={formData.vehicle.seatingCapacity}
                      onChange={(e) => handleNestedInputChange('vehicle', 'seatingCapacity', Number(e.target.value) || 4)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Address Coordinates */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Home size={13} className="text-indigo-500" />
                    <span>Address Coordinates</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="same-address"
                      checked={sameAsTempAddress}
                      onChange={(e) => handleSameAddressToggle(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-100" 
                    />
                    <label htmlFor="same-address" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Same as temp</label>
                  </div>
                </h3>

                {/* Temporary address */}
                <div className="space-y-3">
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">Temporary Residence</span>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={formData.tempAddress.line1}
                      onChange={(e) => handleNestedInputChange('tempAddress', 'line1', e.target.value)}
                      placeholder="e.g. 56/A, MG Road"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.tempAddress.city}
                        onChange={(e) => handleNestedInputChange('tempAddress', 'city', e.target.value)}
                        placeholder="New Delhi"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">State *</label>
                      <input
                        type="text"
                        required
                        value={formData.tempAddress.state}
                        onChange={(e) => handleNestedInputChange('tempAddress', 'state', e.target.value)}
                        placeholder="Delhi"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">Pincode *</label>
                      <input
                        type="text"
                        required
                        value={formData.tempAddress.pinCode}
                        onChange={(e) => handleNestedInputChange('tempAddress', 'pinCode', e.target.value)}
                        placeholder="110001"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent address */}
                <div className="space-y-3 border-t border-slate-50 pt-3.5">
                  <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-widest block">Permanent Residence</span>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      disabled={sameAsTempAddress}
                      value={formData.permAddress.line1}
                      onChange={(e) => handleNestedInputChange('permAddress', 'line1', e.target.value)}
                      placeholder="e.g. 56/A, MG Road"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 disabled:opacity-45"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">City *</label>
                      <input
                        type="text"
                        required
                        disabled={sameAsTempAddress}
                        value={formData.permAddress.city}
                        onChange={(e) => handleNestedInputChange('permAddress', 'city', e.target.value)}
                        placeholder="New Delhi"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 disabled:opacity-45"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">State *</label>
                      <input
                        type="text"
                        required
                        disabled={sameAsTempAddress}
                        value={formData.permAddress.state}
                        onChange={(e) => handleNestedInputChange('permAddress', 'state', e.target.value)}
                        placeholder="Delhi"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 disabled:opacity-45"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-405 uppercase tracking-wider">Pincode *</label>
                      <input
                        type="text"
                        required
                        disabled={sameAsTempAddress}
                        value={formData.permAddress.pinCode}
                        onChange={(e) => handleNestedInputChange('permAddress', 'pinCode', e.target.value)}
                        placeholder="110001"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755 disabled:opacity-45"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Bank Details */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-indigo-500" />
                  <span>Bank Credentials</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder="e.g. ICICI Bank"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      placeholder="0029381290345"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.ifscCode}
                      onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                      placeholder="ICIC0000045"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPI ID</label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => handleInputChange('upiId', e.target.value)}
                      placeholder="ramesh@okicici"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Documents Mock URLs */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                  <FileText size={13} className="text-indigo-500" />
                  <span>Profile Photo URL</span>
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Profile Picture URL</label>
                  <input
                    type="text"
                    value={formData.documents?.profilePhoto}
                    onChange={(e) => handleNestedInputChange('documents', 'profilePhoto', e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-755"
                  />
                </div>
              </div>

            </div>

            {/* Sticky Actions Footer */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-slate-100 px-6 py-4.5 flex justify-end gap-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
              <button
                type="button"
                onClick={() => navigate('/riders')}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-100"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>Save Rider Coordinates</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* 3. PREMIUM DETAILS VIEW */}
      {viewMode === 'details' && (
        <motion.div variants={layoutVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/riders')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl bg-white border border-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
                Rider Fleet Profile
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Onboard status, ratings metrics, document checklist logs, and history sheets.
              </p>
            </div>
          </div>

          {detailsLoading ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-slate-400">Loading rider profile...</span>
            </div>
          ) : !riderDetails ? (
            <div className="py-24 text-center">
              <span className="text-xs font-bold text-rose-500">Rider profile not found.</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Premium profile Header */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-6 -mt-6 opacity-40" />
                
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-150 shadow-sm relative z-10 flex-shrink-0 bg-slate-50">
                  <img src={riderDetails.documents?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} className="w-full h-full object-cover" alt="" />
                </div>

                <div className="text-center md:text-left space-y-1.5 z-10 flex-1">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <h3 className="text-lg font-black text-slate-850">
                      {riderDetails.firstName} {riderDetails.lastName}
                    </h3>
                    <div className="flex gap-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeStyle(riderDetails.status)}`}>
                        {riderDetails.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getAvailabilityBadgeStyle(riderDetails.availability)}`}>
                        {riderDetails.availability}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-455 font-semibold flex items-center justify-center md:justify-start gap-1">
                    <Star size={12} className="text-amber-450 fill-amber-450" />
                    <span className="text-slate-800 font-bold">{riderDetails.rating}</span>
                    <span className="text-slate-400">• Joined {safeFormatDate(riderDetails.joinedDate)}</span>
                  </div>

                  <div className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    Rider ID: <span className="text-slate-800">#{riderDetails._id}</span>
                  </div>

                  <div className="z-10 flex gap-2">
                    <button
                      onClick={() => handleEditClick(riderDetails)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 cursor-pointer"
                    >
                      <Edit2 size={11} />
                      <span>Edit Settings</span>
                    </button>
                    <button
                      onClick={() => handleDelete(riderDetails._id)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Delete Profile</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Column Profile details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                
                {/* Left Column: Personal, Contacts, Vehicle (lg:col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Personal info */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                      <User size={13} className="text-indigo-500" />
                      <span>Personal Profile</span>
                    </h4>

                    <div className="space-y-3.5 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Father's Name</span>
                        <span>{riderDetails.fatherName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gender</span>
                        <span>{riderDetails.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Birth</span>
                        <span>{safeFormatDate(riderDetails.dob)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Contact</span>
                        <span>{riderDetails.emergencyContact || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-655 flex items-center gap-1.5">
                      <Phone size={13} className="text-indigo-500" />
                      <span>Contact Details</span>
                    </h4>

                    <div className="space-y-3 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile</span>
                        <span>{riderDetails.mobile}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">WhatsApp</span>
                        <span>{riderDetails.whatsApp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email</span>
                        <span className="truncate max-w-[170px]">{riderDetails.email}</span>
                      </div>
                      <div className="border-t border-slate-50 pt-2.5 space-y-1">
                        <span className="text-slate-400 block text-[10px] font-black uppercase">Temporary Address</span>
                        <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
                          {riderDetails.tempAddress?.line1}, {riderDetails.tempAddress?.city}, {riderDetails.tempAddress?.state} - {riderDetails.tempAddress?.pinCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle specs */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-655 flex items-center gap-1.5">
                      <Car size={13} className="text-indigo-500" />
                      <span>Vehicle Information</span>
                    </h4>

                    <div className="space-y-3 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle Type</span>
                        <span>{riderDetails.vehicle.vehicleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Brand & Model</span>
                        <span>{riderDetails.vehicle.brand} {riderDetails.vehicle.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle Plate No.</span>
                        <span className="font-mono uppercase text-slate-850">{riderDetails.vehicle.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fuel Type</span>
                        <span>{riderDetails.vehicle.fuelType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Seating Capacity</span>
                        <span>{riderDetails.vehicle.seatingCapacity} Seater</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Center Column: Document Checklist, Bank Details, Quick Operations (lg:col-span-5) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Document verifications */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-indigo-500" />
                      <span>Document Checklist Verifications</span>
                    </h4>

                    <div className="space-y-3.5 text-xs font-bold">
                      {Object.keys(riderDetails.documents || {}).map((doc) => {
                        if (doc === 'profilePhoto') return null;
                        const status = riderDetails.documents[doc];
                        const label = doc.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        
                        return (
                          <div key={doc} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-slate-700 capitalize">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] tracking-wide ${getDocumentStatusStyle(status)}`}>
                                {status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handlePreviewDocument(doc, label, status)}
                                className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-all cursor-pointer flex items-center justify-center"
                                title="Preview Document"
                              >
                                <Eye size={12} />
                              </button>
                              <select
                                value={status}
                                onChange={(e) => handleVerifyDocument(doc, e.target.value)}
                                className="p-1 text-[9px] bg-white border border-slate-200 rounded-md text-slate-705"
                              >
                                <option value="Verified">Verify</option>
                                <option value="Pending">Pending</option>
                                <option value="Rejected">Reject</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bank info */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-655 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-indigo-500" />
                      <span>Bank Coordinates</span>
                    </h4>

                    <div className="space-y-3 text-xs font-semibold text-slate-705">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank Name</span>
                        <span>{riderDetails.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account No.</span>
                        <span className="font-mono text-slate-850">{riderDetails.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">IFSC Code</span>
                        <span className="font-mono uppercase">{riderDetails.ifscCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">UPI ID</span>
                        <span>{riderDetails.upiId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Operations actions */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650">
                      Operational Dispatch Actions
                    </h4>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${riderDetails.mobile}`}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          <PhoneCall size={12} />
                          <span>Call Rider</span>
                        </a>
                        <a
                          href={`https://wa.me/${riderDetails.whatsApp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100/50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all"
                        >
                          <Send size={12} className="rotate-45" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleStatusChange(riderDetails._id, riderDetails.status === 'Active' ? 'Inactive' : 'Active')}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            riderDetails.status === 'Active'
                              ? 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {riderDetails.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleStatusChange(riderDetails._id, riderDetails.status === 'Suspended' ? 'Active' : 'Suspended')}
                          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            riderDetails.status === 'Suspended'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 border-rose-100 text-rose-750 hover:bg-rose-100'
                          }`}
                        >
                          {riderDetails.status === 'Suspended' ? 'Revoke Suspend' : 'Suspend Rider'}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          alert('Redirecting to Ride Dispatch Panel to assign trips...');
                          window.location.reload();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-150 cursor-pointer"
                      >
                        <Award size={13} />
                        <span>Assign Ride Dispatch Trip</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right Column: Performance Specs & Recent History Table (lg:col-span-3 or rather 3-col grids) */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Performance stats */}
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650 flex items-center gap-1.5">
                      <Award size={13} className="text-indigo-500" />
                      <span>Performance Metrics</span>
                    </h4>

                    <div className="space-y-4 text-xs font-semibold text-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5 bg-slate-50 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block uppercase">Completed</span>
                          <span className="text-sm font-black text-slate-800">{riderDetails.performance?.completedRides || 0}</span>
                        </div>
                        <div className="space-y-0.5 bg-slate-50 p-2 rounded-lg text-center">
                          <span className="text-[9px] text-slate-400 block uppercase">Cancelled</span>
                          <span className="text-sm font-black text-rose-650">{riderDetails.performance?.cancelledRides || 0}</span>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-slate-50 pt-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Completion Rate</span>
                          <span className="font-mono text-emerald-650 font-bold">{riderDetails.performance?.completionRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${riderDetails.performance?.completionRate}%` }} />
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-slate-50 pt-3.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Revenue Earnings</span>
                          <span className="font-mono font-bold text-slate-850">₹{riderDetails.performance?.totalEarnings?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monthly Earnings</span>
                          <span className="font-mono font-bold text-blue-600">₹{riderDetails.performance?.monthlyEarnings?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Ride History Table block below */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-805 border-b border-slate-50 pb-2.5 uppercase tracking-widest text-indigo-650">
                  Detailed Trip History Logs
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100 text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Ride ID</th>
                        <th className="py-2.5 px-4">Trip Date</th>
                        <th className="py-2.5 px-4">Passenger</th>
                        <th className="py-2.5 px-4">Pickup Address</th>
                        <th className="py-2.5 px-4">Drop Address</th>
                        <th className="py-2.5 px-4 text-right">Fare Slip</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {riderDetails.rideHistory?.map((hist, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">#{hist.rideId}</td>
                          <td className="py-3 px-4 text-slate-500">{safeFormatDate(hist.date)}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{hist.guest}</td>
                          <td className="py-3 px-4 text-slate-550 max-w-xs truncate" title={hist.pickup}>{hist.pickup}</td>
                          <td className="py-3 px-4 text-slate-550 max-w-xs truncate" title={hist.drop}>{hist.drop}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-850">₹{hist.fare}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              hist.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {hist.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}

      {/* Document Preview Modal */}
      {activePreviewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden flex flex-col transform transition-all scale-100">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Document Preview: {activePreviewDoc.label}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Verify the validity and authenticity of the rider's credential documents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewDoc(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Styled Mock Document Card */}
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden h-44 flex flex-col justify-between border border-slate-800">
                {/* Chip and Logo */}
                <div className="flex justify-between items-start">
                  <div className="w-10 h-7 bg-amber-450/80 rounded-md border border-amber-300/30 flex items-center justify-center opacity-80">
                    <div className="grid grid-cols-3 gap-0.5 w-6 h-4 border border-slate-800/40 rounded-sm bg-amber-200/40" />
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black tracking-widest text-slate-300 block uppercase">WOW GATEWAYS</span>
                    <span className="text-[7px] font-bold text-teal-400 uppercase tracking-wider block">FLEET PARTNER</span>
                  </div>
                </div>

                {/* Document details in card format */}
                <div className="space-y-0.5">
                  <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Document No / ID</div>
                  <div className="text-sm font-mono tracking-widest font-bold text-white uppercase">
                    {activePreviewDoc.value}
                  </div>
                </div>

                {/* Footer of card */}
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[7px] text-slate-400 uppercase font-semibold">Rider Name</div>
                    <div className="text-xs font-bold text-slate-100">
                      {riderDetails?.firstName} {riderDetails?.lastName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activePreviewDoc.status === 'Verified' ? 'bg-emerald-400' : activePreviewDoc.status === 'Pending' ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-200">
                      {activePreviewDoc.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-400">Document Type:</span>
                  <span className="font-bold text-slate-800 capitalize">{activePreviewDoc.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-400">Current Verification:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    activePreviewDoc.status === 'Verified' ? 'bg-emerald-50 text-emerald-700' : activePreviewDoc.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {activePreviewDoc.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleVerifyDocument(activePreviewDoc.key, 'Verified');
                  setActivePreviewDoc(prev => ({ ...prev, status: 'Verified' }));
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100 flex items-center gap-1 cursor-pointer"
              >
                <Check size={12} />
                <span>Approve Document</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleVerifyDocument(activePreviewDoc.key, 'Rejected');
                  setActivePreviewDoc(prev => ({ ...prev, status: 'Rejected' }));
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-100 flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponents definitions for simplicity
function FilterTriangle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.2 0-2.4 0.6-3.1 1.6L3.2 12.3c-0.7 0.9-0.7 2.2 0 3.1l5.7 7.7C9.6 23.4 10.8 24 12 24s2.4-0.6 3.1-1.6l5.7-7.7c0.7-0.9 0.7-2.2 0-3.1l-5.7-7.7C14.4 3.6 13.2 3 12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6" />
    </svg>
  );
}
