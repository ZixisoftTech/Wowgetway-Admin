import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Home, 
  Building, 
  CheckCircle, 
  TrendingUp, 
  ArrowLeft, 
  ArrowRight,
  Check, 
  User, 
  Users,
  Bed,
  MapPin, 
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Image,
  DollarSign,
  Clock,
  Settings,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  Camera,
  Star,
  Activity,
  Layers
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  return `${base}${path}`;
};

const API_HOMESTAYS_URL = getApiUrl('/api/dashboard/homestays-list');
const API_OWNERS_URL = getApiUrl('/api/dashboard/owners');

export default function ManageHomestays() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedId, setSelectedId] = useState(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [wizardStep, setWizardStep] = useState(1);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const handleReviewAction = async (actionStatus) => {
    if ((actionStatus === 'Rejected' || actionStatus === 'Changes Requested') && !reviewComment.trim()) {
      Swal.fire({
        title: 'Comment Required',
        text: `Please enter a comment detailing why this property is being ${actionStatus === 'Rejected' ? 'rejected' : 'sent back for changes'}.`,
        icon: 'warning',
        confirmButtonColor: '#be123c'
      });
      return;
    }

    try {
      const token = localStorage.getItem('superAdminToken');
      await axios.post(getApiUrl(`/api/admin/homestays-list/${selectedId}/review`), {
        status: actionStatus,
        comment: reviewComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        title: 'Status Updated!',
        text: `Property status has been set to "${actionStatus}".`,
        icon: 'success',
        confirmButtonColor: '#be123c'
      }).then(() => {
        setViewMode('list');
      });

      setReviewComment('');
      queryClient.invalidateQueries(['propertyDetails', selectedId]);
      queryClient.invalidateQueries(['homestaysList']);
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Review Action Failed',
        text: err.response?.data?.message || 'Could not update review status.',
        icon: 'error',
        confirmButtonColor: '#be123c'
      });
    }
  };

  // 1. Fetch Homestays List
  const { data: homestaysList = [], isLoading: listLoading } = useQuery({
    queryKey: ['homestaysList', searchQuery, statusFilter, typeFilter, regionFilter, ownerFilter],
    queryFn: async () => {
      const response = await axios.get(API_HOMESTAYS_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          type: typeFilter,
          region: regionFilter,
          ownerName: ownerFilter
        }
      });
      return response.data;
    }
  });

  // 2. Fetch KPI Stats
  const { data: stats = { totalHomestays: 0, activeHomestays: 0, totalRooms: 0, avgOccupancyRate: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['homestaysStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_HOMESTAYS_URL}/stats`);
      return response.data;
    }
  });

  // 3. Fetch Single Property Details
  const { data: propertyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['propertyDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_HOMESTAYS_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId && (viewMode === 'details' || viewMode === 'edit')
  });

  // 4. Fetch Owners list (needed for owner select dropdown)
  const { data: ownersList = [] } = useQuery({
    queryKey: ['ownersListSimple'],
    queryFn: async () => {
      const response = await axios.get(API_OWNERS_URL);
      return response.data;
    }
  });

  // Dynamic filter choices from list data
  const regionsList = useMemo(() => {
    const list = homestaysList.map(h => h.region).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [homestaysList]);

  const ownersFilterList = useMemo(() => {
    const list = homestaysList.map(h => h.ownerName).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [homestaysList]);

  // Paginated list
  const paginatedHomestays = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return homestaysList.slice(startIndex, startIndex + itemsPerPage);
  }, [homestaysList, currentPage]);

  const totalPages = Math.ceil(homestaysList.length / itemsPerPage) || 1;

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, regionFilter, ownerFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newProperty) => {
      const response = await axios.post(API_HOMESTAYS_URL, newProperty);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['homestaysList']);
      queryClient.invalidateQueries(['homestaysStats']);
      setViewMode('list');
      alert('Homestay property successfully registered.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to register homestay');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_HOMESTAYS_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['homestaysList']);
      queryClient.invalidateQueries(['homestaysStats']);
      queryClient.invalidateQueries(['propertyDetails', selectedId]);
      setViewMode('list');
      setSelectedId(null);
      alert('Property details updated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update property details');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_HOMESTAYS_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['homestaysList']);
      queryClient.invalidateQueries(['homestaysStats']);
      alert('Property record deleted successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete property record');
    }
  });

  // Immediate Room Status Mutation (Updates just roomStatuses)
  const updateRoomStatusMutation = useMutation({
    mutationFn: async ({ homestayId, roomNumber, newStatus }) => {
      // Find current details from cache to preserve other statuses
      const currentDetails = queryClient.getQueryData(['propertyDetails', homestayId]);
      if (!currentDetails) return;

      const updatedStatuses = currentDetails.roomStatuses.map(rs => {
        if (rs.roomNumber === roomNumber) {
          return { ...rs, status: newStatus };
        }
        return rs;
      });

      const response = await axios.put(`${API_HOMESTAYS_URL}/${homestayId}`, {
        roomStatuses: updatedStatuses
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['propertyDetails', selectedId]);
      queryClient.invalidateQueries(['homestaysList']);
      alert('Room status updated successfully.');
    },
    onError: (err) => {
      alert('Failed to update room status');
    }
  });

  // Form State
  const initialFormState = {
    name: '',
    type: 'Homestay',
    ownerType: 'Individual',
    ownerName: '',
    ownerMobile: '',
    address: '',
    mapLink: '',
    region: '',
    city: '',
    description: '',
    amenities: [],
    images: [],
    seasons: [
      { seasonName: 'Peak Season', fromDate: '', toDate: '' },
      { seasonName: 'Mid Season', fromDate: '', toDate: '' },
      { seasonName: 'Off Season', fromDate: '', toDate: '' }
    ],
    rooms: [
      { 
        roomType: 'Deluxe Room', 
        totalRooms: 4, 
        totalOccupancy: 8,
        roomNumbers: ['102', '103', '104', '105'], 
        extraPersonAllowedActive: true,
        extraPersonCapacity: '2 Extra Persons',
        extraPersonPrice: 50,
        photos: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600',
          'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600',
          'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?w=600'
        ], 
        description: 'Our Deluxe Room offers a perfect blend of comfort and nature. Enjoy beautiful mountain views, cozy interiors, and modern amenities for a relaxing stay. Ideal for couples and small families.' 
      }
    ],
    rates: [],
    status: 'Draft',
    bookings: 0,
    occupancyRate: 0,
    revenueGenerated: 0,
    averageRating: 4.5
  };

  const [formData, setFormData] = useState(initialFormState);
  
  // Rate matrix UI variables
  const [selectedRateSeason, setSelectedRateSeason] = useState('Peak Season');
  const [selectedRateCategory, setSelectedRateCategory] = useState('');
  const [selectedRateMealPlan, setSelectedRateMealPlan] = useState('EP');

  // Input states for photo/custom amenities
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');
  const [customAmenity, setCustomAmenity] = useState('');

  // Handle Form field edits
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Step 4: Seasons range changes
  const handleSeasonChange = (index, field, value) => {
    setFormData(prev => {
      const updatedSeasons = [...prev.seasons];
      updatedSeasons[index] = {
        ...updatedSeasons[index],
        [field]: value
      };
      return { ...prev, seasons: updatedSeasons };
    });
  };

  const addSeason = () => {
    setFormData(prev => ({
      ...prev,
      seasons: [...prev.seasons, { seasonName: 'Peak Season', fromDate: '', toDate: '' }]
    }));
  };

  const removeSeason = (index) => {
    setFormData(prev => ({
      ...prev,
      seasons: prev.seasons.filter((_, i) => i !== index)
    }));
  };

  // Step 5: Rooms config changes
  const handleRoomChange = (index, field, value) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      updatedRooms[index] = {
        ...updatedRooms[index],
        [field]: field === 'extraPersonAllowed' || field === 'totalRooms' || field === 'totalOccupancy' || field === 'extraPersonPrice'
          ? Number(value) || 0
          : value
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleTotalRoomsChange = (roomIdx, value) => {
    const val = Math.max(0, parseInt(value) || 0);
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      const currentNumbers = [...(updatedRooms[roomIdx].roomNumbers || [])];
      
      if (val > currentNumbers.length) {
        for (let i = currentNumbers.length; i < val; i++) {
          currentNumbers.push((101 + i).toString());
        }
      } else if (val < currentNumbers.length) {
        currentNumbers.splice(val);
      }
      
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        totalRooms: val,
        roomNumbers: currentNumbers
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleRoomNumberChange = (roomIdx, numIdx, value) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      const currentNumbers = [...(updatedRooms[roomIdx].roomNumbers || [])];
      currentNumbers[numIdx] = value;
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        roomNumbers: currentNumbers
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const addRoomNumber = (roomIdx) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      const currentNumbers = [...(updatedRooms[roomIdx].roomNumbers || [])];
      currentNumbers.push((101 + currentNumbers.length).toString());
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        totalRooms: currentNumbers.length,
        roomNumbers: currentNumbers
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const toggleExtraPerson = (roomIdx) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        extraPersonAllowedActive: !updatedRooms[roomIdx].extraPersonAllowedActive
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const addRoomPhoto = (roomIdx) => {
    const mockRoomPhotos = [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600',
      'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?w=600',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600'
    ];
    const randomPhoto = mockRoomPhotos[Math.floor(Math.random() * mockRoomPhotos.length)];
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      const currentPhotos = [...(updatedRooms[roomIdx].photos || [])];
      if (currentPhotos.length < 10) {
        currentPhotos.push(randomPhoto);
      }
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        photos: currentPhotos
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const removeRoomPhoto = (roomIdx, photoIdx) => {
    setFormData(prev => {
      const updatedRooms = [...prev.rooms];
      const currentPhotos = (updatedRooms[roomIdx].photos || []).filter((_, i) => i !== photoIdx);
      updatedRooms[roomIdx] = {
        ...updatedRooms[roomIdx],
        photos: currentPhotos
      };
      return { ...prev, rooms: updatedRooms };
    });
  };

  const addRoomCategory = () => {
    setFormData(prev => ({
      ...prev,
      rooms: [...prev.rooms, { 
        roomType: 'Standard', 
        totalRooms: 2, 
        totalOccupancy: 4, 
        roomNumbers: ['201', '202'], 
        extraPersonAllowedActive: false,
        extraPersonCapacity: '2 Extra Persons',
        extraPersonPrice: 0,
        photos: [], 
        description: '' 
      }]
    }));
  };

  const removeRoomCategory = (index) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  // Pre-initialize or update the rate grid based on current rooms/seasons
  const syncRateMatrix = (rooms, seasons) => {
    const occupancies = ['Double Occupancy', 'Triple Occupancy', 'Four Occupancy'];
    const plans = ['EP', 'CP', 'MAP', 'AP'];
    const newRates = [];

    rooms.forEach(room => {
      seasons.forEach(season => {
        occupancies.forEach(occupancy => {
          // Look for matching rate entry in current state
          const match = formData.rates.find(r => 
            r.roomCategory === room.roomType && 
            r.season === season.seasonName && 
            r.occupancy === occupancy
          );

          if (match) {
            newRates.push(match);
          } else {
            // Create default plan rates
            const planRates = {};
            plans.forEach(plan => {
              planRates[plan] = { b2bRate: 0, b2cRate: 0, b2bExtraPerson: 0, b2cExtraPerson: 0, b2bChild: 0, b2cChild: 0 };
            });

            newRates.push({
              roomCategory: room.roomType,
              season: season.seasonName,
              occupancy,
              planRates,
              createdBy: 'Super Admin',
              createdDate: new Date()
            });
          }
        });
      });
    });

    setFormData(prev => ({ ...prev, rates: newRates }));
  };

  // Run synchronization before navigating to Rate step
  const handleWizardNext = () => {
    if (wizardStep === 1) {
      if (!formData.name.trim()) return alert('Property name is required.');
      if (!formData.ownerName) return alert('Owner must be selected.');
      if (!formData.city.trim() || !formData.region.trim()) return alert('City and Region are required.');
    }
    if (wizardStep === 4) {
      const invalidSeasons = formData.seasons.some(s => !s.fromDate || !s.toDate);
      if (invalidSeasons) return alert('Please enter both Start and End Dates for all seasons.');
    }
    if (wizardStep === 5) {
      if (formData.rooms.length === 0) return alert('Please add at least one room category.');
      const invalidRooms = formData.rooms.some(r => r.roomNumbers.length === 0);
      if (invalidRooms) return alert('Please input at least one room number for each room category.');

      // Sync and prep rates matrix
      syncRateMatrix(formData.rooms, formData.seasons);

      // Preselect default filters for Step 6 rates matrix
      if (formData.rooms.length > 0) {
        setSelectedRateCategory(formData.rooms[0].roomType);
      }
      if (formData.seasons.length > 0) {
        setSelectedRateSeason(formData.seasons[0].seasonName);
      }
    }
    setWizardStep(prev => prev + 1);
  };

  // Rates matrix Cell Edit
  const handleRateCellChange = (occupancy, plan, field, val) => {
    setFormData(prev => {
      const updatedRates = prev.rates.map(r => {
        if (r.roomCategory === selectedRateCategory && r.season === selectedRateSeason && r.occupancy === occupancy) {
          return {
            ...r,
            planRates: {
              ...r.planRates,
              [plan]: {
                ...r.planRates[plan],
                [field]: Number(val) || 0
              }
            }
          };
        }
        return r;
      });
      return { ...prev, rates: updatedRates };
    });
  };

  // Edit action
  const handleEditClick = (prop) => {
    setSelectedId(prop._id);
    // Format dates to input strings YYYY-MM-DD
    const formattedSeasons = (prop.seasons || []).map(s => ({
      seasonName: s.seasonName,
      fromDate: s.fromDate ? new Date(s.fromDate).toISOString().split('T')[0] : '',
      toDate: s.toDate ? new Date(s.toDate).toISOString().split('T')[0] : ''
    }));

    setFormData({
      name: prop.name || '',
      type: prop.type || 'Homestay',
      ownerType: prop.ownerType || 'Individual',
      ownerName: prop.ownerName || '',
      ownerMobile: prop.ownerMobile || '',
      address: prop.address || '',
      mapLink: prop.mapLink || '',
      region: prop.region || '',
      city: prop.city || '',
      description: prop.description || '',
      amenities: prop.amenities || [],
      images: prop.images || [],
      seasons: formattedSeasons.length ? formattedSeasons : [
        { seasonName: 'Peak Season', fromDate: '', toDate: '' },
        { seasonName: 'Mid Season', fromDate: '', toDate: '' },
        { seasonName: 'Off Season', fromDate: '', toDate: '' }
      ],
      rooms: prop.rooms || [],
      rates: prop.rates || [],
      status: prop.status || 'Draft',
      bookings: prop.bookings || 0,
      occupancyRate: prop.occupancyRate || 0,
      revenueGenerated: prop.revenueGenerated || 0,
      averageRating: prop.averageRating || 4.5
    });
    setWizardStep(1);
    setViewMode('edit');
  };

  // SubmitWizard
  const handleSaveWizard = () => {
    // Validate rates: ensure rates array isn't empty
    if (formData.rates.length === 0) {
      alert('Rate matrix pricing is incomplete.');
      return;
    }

    if (viewMode === 'add') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: formData });
    }
  };

  // Format Helper for Date display
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Layout motion variants
  const pageVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-1">
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                <Home className="text-emerald-500 w-6 h-6" />
                <span>Manage Homestays</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Onboard and monitor property assets, room capacities, seasonal rates, and inventories.
              </p>
            </div>
            
            <button
              onClick={() => {
                setFormData(initialFormState);
                setSelectedId(null);
                setWizardStep(1);
                setViewMode('add');
              }}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add Property</span>
            </button>
          </div>

          {/* Top KPI Metrics Card row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <MetricCard
              title="Total Properties"
              value={stats.totalHomestays}
              icon={Home}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-600"
              bgColor="bg-[#edf4ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Active Properties"
              value={stats.activeHomestays}
              icon={CheckCircle}
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-650"
              bgColor="bg-[#ecfbf3]"
              loading={statsLoading}
            />
            <MetricCard
              title="Rooms Capacity"
              value={stats.totalRooms}
              icon={Building}
              iconBgColor="bg-indigo-500/10"
              iconColor="text-indigo-650"
              bgColor="bg-[#f8f0ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Avg Occupancy Rate"
              value={`${stats.avgOccupancyRate}%`}
              icon={TrendingUp}
              iconBgColor="bg-orange-500/10"
              iconColor="text-orange-650"
              bgColor="bg-[#fff8f0]"
              loading={statsLoading}
            />
          </div>

          {/* Filter Panels toolbar */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full lg:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, name, city, owner..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Advanced select filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending Approval">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Changes Requested">Changes Requested</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All Stay Types</option>
                    <option value="Homestay">Homestay</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Resort">Resort</option>
                    <option value="Villa">Villa</option>
                    <option value="Cottage">Cottage</option>
                  </select>
                </div>

                <div>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All Regions</option>
                    {regionsList.filter(r => r !== 'All').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="All">All Owners</option>
                    {ownersFilterList.filter(o => o !== 'All').map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Filter tags reset indicator */}
            {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All' || regionFilter !== 'All' || ownerFilter !== 'All') && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-50">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Active Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200">
                    Query: "{searchQuery}"
                    <X size={10} className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={() => setSearchQuery('')} />
                  </span>
                )}
                {statusFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200">
                    Status: {statusFilter}
                    <X size={10} className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={() => setStatusFilter('All')} />
                  </span>
                )}
                {typeFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200">
                    Type: {typeFilter}
                    <X size={10} className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={() => setTypeFilter('All')} />
                  </span>
                )}
                {regionFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200">
                    Region: {regionFilter}
                    <X size={10} className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={() => setRegionFilter('All')} />
                  </span>
                )}
                {ownerFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-750 text-[10px] font-bold rounded-lg border border-slate-200">
                    Owner: {ownerFilter}
                    <X size={10} className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={() => setOwnerFilter('All')} />
                  </span>
                )}
                <button 
                  onClick={() => {
                    setSearchQuery(''); setStatusFilter('All'); setTypeFilter('All'); setRegionFilter('All'); setOwnerFilter('All');
                  }}
                  className="text-[10px] font-bold text-red-500 hover:underline pl-1 cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table List */}
          <div className="hidden md:block bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-4.5 px-6">Property ID & Name</th>
                    <th className="py-4.5 px-6">Stay Type</th>
                    <th className="py-4.5 px-6">Linked Owner</th>
                    <th className="py-4.5 px-6">Region & City</th>
                    <th className="py-4.5 px-6 text-center">Total Rooms</th>
                    <th className="py-4.5 px-6 text-center">Starting Price (B2C)</th>
                    <th className="py-4.5 px-6 text-center">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-750">
                  {listLoading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150" />
                        </div>
                        <span className="text-xs font-bold text-slate-450 mt-2 block">Loading property assets...</span>
                      </td>
                    </tr>
                  ) : homestaysList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-450 font-medium">
                        No property records found matching active query filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedHomestays.map((prop) => {
                      const totalRooms = Array.isArray(prop.rooms) 
                        ? prop.rooms.reduce((s, r) => s + (r.totalRooms || 0), 0)
                        : (typeof prop.rooms === 'number' ? prop.rooms : 0);

                      // Get minimum B2C rate
                      let minPrice = 'N/A';
                      if (prop.rates && Array.isArray(prop.rates)) {
                        const b2cRates = prop.rates
                          .map(r => r.planRates?.EP?.b2cRate || r.planRates?.CP?.b2cRate || r.planRates?.MAP?.b2cRate || r.planRates?.AP?.b2cRate)
                          .filter(Boolean);
                        if (b2cRates.length > 0) {
                          minPrice = `₹${Math.min(...b2cRates)}`;
                        }
                      }

                      return (
                        <tr key={prop._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 font-mono">#{prop._id}</span>
                              <span className="font-extrabold text-slate-800 text-[13px]">{prop.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-bold">{prop.type}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-slate-850 font-bold flex items-center gap-1.5">
                                <User size={12} className="text-slate-400" />
                                {prop.ownerName}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 pl-4">{prop.ownerMobile}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <div className="flex flex-col">
                              <span className="font-bold">{prop.region}</span>
                              <span className="text-[10px] font-medium text-slate-450">{prop.city}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-700 font-mono">{totalRooms} Rooms</td>
                          <td className="py-4 px-6 text-center text-emerald-650 font-extrabold font-mono">{minPrice}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${
                              prop.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              prop.status === 'Inactive' ? 'bg-slate-100 text-slate-650 border border-slate-200' :
                              prop.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              prop.status === 'Pending Approval' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {prop.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => { setSelectedId(prop._id); setViewMode('details'); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="View details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleEditClick(prop)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                title="Edit property"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this property and all linked inventories?')) {
                                    deleteMutation.mutate(prop._id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete property"
                              >
                                <Trash2 size={15} />
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
          </div>

          {/* Mobile Cards fallback */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {listLoading ? (
              <div className="py-12 text-center text-slate-400">
                <span className="text-xs font-bold">Loading properties...</span>
              </div>
            ) : homestaysList.length === 0 ? (
              <div className="py-8 text-center text-slate-450 font-semibold bg-white rounded-2xl border border-slate-100">
                No properties matching filter requirements.
              </div>
            ) : (
              paginatedHomestays.map((prop) => {
                const totalRooms = Array.isArray(prop.rooms) 
                  ? prop.rooms.reduce((s, r) => s + (r.totalRooms || 0), 0)
                  : (typeof prop.rooms === 'number' ? prop.rooms : 0);

                let minPrice = 'N/A';
                if (prop.rates && Array.isArray(prop.rates)) {
                  const b2cRates = prop.rates
                    .map(r => r.planRates?.EP?.b2cRate || r.planRates?.CP?.b2cRate || r.planRates?.MAP?.b2cRate || r.planRates?.AP?.b2cRate)
                    .filter(Boolean);
                  if (b2cRates.length > 0) {
                    minPrice = `₹${Math.min(...b2cRates)}`;
                  }
                }

                return (
                  <div key={prop._id} className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">#{prop._id}</span>
                        <h4 className="font-extrabold text-slate-800 text-[14px] leading-snug">{prop.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${
                        prop.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        prop.status === 'Inactive' ? 'bg-slate-100 text-slate-650 border border-slate-200' :
                        prop.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        prop.status === 'Pending Approval' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {prop.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Stay Type</span>
                        {prop.type}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Region & City</span>
                        {prop.region}, {prop.city}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Owner</span>
                        {prop.ownerName}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Capacity & Min Rate</span>
                        {totalRooms} R | <span className="text-emerald-600 font-bold">{minPrice}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-50 justify-end">
                      <button
                        onClick={() => { setSelectedId(prop._id); setViewMode('details'); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleEditClick(prop)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this property record?')) {
                            deleteMutation.mutate(prop._id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Showing <span className="text-slate-700 font-bold">{Math.min(homestaysList.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="text-slate-700 font-bold">{Math.min(homestaysList.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="text-slate-750 font-black">{homestaysList.length}</span> properties
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 transition-colors border border-slate-150 cursor-pointer"
              >
                <ChevronLeft size={14} className="stroke-[2.5]" />
              </button>
              <span className="flex items-center px-3 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl disabled:opacity-40 disabled:hover:bg-slate-50 transition-colors border border-slate-150 cursor-pointer"
              >
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

        </motion.div>
      )}

      {/* 2. ADD & EDIT WIZARD */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header toolbar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Discard unsaved wizard changes?')) {
                    setViewMode('list');
                  }
                }}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-150"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {viewMode === 'add' ? 'Register New Homestay Asset' : `Edit: ${formData.name}`}
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Multi-Step Onboarding Form — Step {wizardStep} of 7
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Discard current form entries?')) {
                  setViewMode('list');
                }
              }}
              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Cancel Setup
            </button>
          </div>

          {/* Steps Indicator Progress row */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
            {/* Desktop step items */}
            <div className="hidden md:flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-300"
                style={{ width: `${((wizardStep - 1) / 6) * 100}%` }}
              />

              {[
                { step: 1, label: 'Basic Info' },
                { step: 2, label: 'Description' },
                { step: 3, label: 'Amenities' },
                { step: 4, label: 'Seasons' },
                { step: 5, label: 'Room Specs' },
                { step: 6, label: 'Pricing Rates' },
                { step: 7, label: 'Summary Review' }
              ].map((s) => (
                <div key={s.step} className="z-10 flex flex-col items-center gap-1.5 bg-white px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    wizardStep === s.step 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-4 ring-blue-50' 
                      : wizardStep > s.step 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {wizardStep > s.step ? <Check size={14} className="stroke-[3]" /> : s.step}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${
                    wizardStep === s.step ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile simplified progress bar */}
            <div className="flex md:hidden items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Step {wizardStep} of 7:</span>
              <div className="w-2/3 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${(wizardStep / 7) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Wizard Panels */}
          <div className="min-h-[350px]">
            {/* Step 1: Basic Information */}
            {wizardStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Form Box */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Property Identity & Location
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Property / Homestay Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="e.g. Golden Sands Retreat"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Property Type *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => handleFieldChange('type', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      >
                        <option value="Homestay">Homestay</option>
                        <option value="Hotel">Hotel</option>
                        <option value="Resort">Resort</option>
                        <option value="Villa">Villa</option>
                        <option value="Cottage">Cottage</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Owner Assignment *</label>
                      <select
                        value={formData.ownerName ? `${formData.ownerName}|${formData.ownerMobile}` : ''}
                        onChange={(e) => {
                          const [name, mobile] = e.target.value.split('|');
                          setFormData(prev => ({
                            ...prev,
                            ownerName: name || '',
                            ownerMobile: mobile || '',
                            ownerType: 'Individual'
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      >
                        <option value="">Select an Owner</option>
                        {ownersList.map(o => (
                          <option key={o._id} value={`${o.firstName} ${o.lastName}|${o.mobile}`}>
                            {o.firstName} {o.lastName} ({o.mobile})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Region *</label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) => handleFieldChange('region', e.target.value)}
                        placeholder="e.g. North Bengal"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">City / Town *</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="e.g. Alibaug"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Address Details *</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        placeholder="Complete postal address of the property..."
                        rows="3"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Google Maps Link</label>
                      <input
                        type="text"
                        value={formData.mapLink}
                        onChange={(e) => handleFieldChange('mapLink', e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Photo Upload Box */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Property Photos
                  </h3>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempPhotoUrl}
                        onChange={(e) => setTempPhotoUrl(e.target.value)}
                        placeholder="Paste image URL here..."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempPhotoUrl.trim() && !formData.images.includes(tempPhotoUrl.trim())) {
                            setFormData(prev => ({ ...prev, images: [...prev.images, tempPhotoUrl.trim()] }));
                            setTempPhotoUrl('');
                          }
                        }}
                        className="px-3 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 max-h-60 overflow-y-auto pr-1">
                      {formData.images.map((url, i) => (
                        <div key={i} className="relative aspect-video rounded-xl border border-slate-150 overflow-hidden bg-slate-50 group">
                          <img src={url} alt="Homestay thumbnail" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/85 text-white p-1 rounded-full transition-all cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {formData.images.length === 0 && (
                        <div className="col-span-2 border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center text-slate-400">
                          <Camera size={24} className="stroke-[1.5] mb-1.5 text-slate-350" />
                          <span className="text-[10px] font-bold text-slate-400">No photos added yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Description */}
            {wizardStep === 2 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl mx-auto">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  Detailed Property Description
                </h3>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    <span>Describe your property amenities and setting *</span>
                    <span>{formData.description.length} / 1000 characters</span>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value.slice(0, 1000))}
                    placeholder="Provide a welcoming description of the property, highlight local attractions, and detail policies..."
                    rows="8"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Amenities Select */}
            {wizardStep === 3 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl mx-auto">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  Configure Property Amenities
                </h3>

                <div className="space-y-4">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Select standard amenities available</label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      'Free WiFi', 'Parking', 'Room Service', 'AC', 'Swimming Pool',
                      'Heater', 'Garden', 'Restaurant', 'Bonfire', 'TV', 'Balcony'
                    ].map((amenity) => {
                      const isSelected = formData.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => {
                            setFormData(prev => {
                              const list = prev.amenities.includes(amenity)
                                ? prev.amenities.filter(a => a !== amenity)
                                : [...prev.amenities, amenity];
                              return { ...prev, amenities: list };
                            });
                          }}
                          className={`flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-750'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-350 bg-white'
                          }`}>
                            {isSelected && <Check size={10} className="stroke-[3.5]" />}
                          </div>
                          <span>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Add Custom Amenity</label>
                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="text"
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        placeholder="e.g. Guided Treks"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customAmenity.trim() && !formData.amenities.includes(customAmenity.trim())) {
                            setFormData(prev => ({ ...prev, amenities: [...prev.amenities, customAmenity.trim()] }));
                            setCustomAmenity('');
                          }
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Seasons Calendar mapping */}
            {wizardStep === 4 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Configure Seasons & Calendar Dates
                  </h3>
                  <button
                    type="button"
                    onClick={addSeason}
                    className="flex items-center gap-1 text-[11px] font-black text-blue-650 hover:underline cursor-pointer"
                  >
                    <Plus size={12} className="stroke-[2.5]" /> Add Custom Season
                  </button>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {formData.seasons.map((season, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl relative items-end">
                      <div>
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Season Name</label>
                        <select
                          value={season.seasonName}
                          onChange={(e) => handleSeasonChange(idx, 'seasonName', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                        >
                          <option value="Peak Season">Peak Season</option>
                          <option value="Mid Season">Mid Season</option>
                          <option value="Off Season">Off Season</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">From Date *</label>
                        <input
                          type="date"
                          value={season.fromDate}
                          onChange={(e) => handleSeasonChange(idx, 'fromDate', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">To Date *</label>
                        <input
                          type="date"
                          value={season.toDate}
                          onChange={(e) => handleSeasonChange(idx, 'toDate', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end items-center sm:pb-1 pb-2">
                        {formData.seasons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSeason(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {formData.seasons.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      No seasons configured. Create at least one season block.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Rooms management */}
            {wizardStep === 5 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                      Room Categories & Inventory Setup
                    </h3>
                    <button
                      type="button"
                      onClick={addRoomCategory}
                      className="flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Plus size={12} className="stroke-[2.5]" /> Add Category Class
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formData.rooms.map((room, idx) => (
                      <div key={idx} className="p-6 bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-5 relative animate-fade-in">
                        
                        {/* Delete Class Button */}
                        {formData.rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoomCategory(idx)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-red-500 cursor-pointer transition-colors p-1"
                            title="Delete room category class"
                          >
                            <X size={16} />
                          </button>
                        )}

                        {/* First Row of Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Room Class / Type *</label>
                            <select
                              value={room.roomType}
                              onChange={(e) => handleRoomChange(idx, 'roomType', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            >
                              <option value="Deluxe Room">Deluxe Room</option>
                              <option value="Standard Room">Standard Room</option>
                              <option value="Super Deluxe Room">Super Deluxe Room</option>
                              <option value="Premium Room">Premium Room</option>
                              <option value="Executive Suite">Executive Suite</option>
                              <option value="Family Cabin">Family Cabin</option>
                              <option value="Luxury Villa">Luxury Villa</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Total Number of Rooms *</label>
                            <input
                              type="number"
                              min="0"
                              value={room.totalRooms || 0}
                              onChange={(e) => handleTotalRoomsChange(idx, e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            />
                            <span className="text-[9px] text-slate-400 mt-1 block">Total units available under this category</span>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Total Occupancy *</label>
                            <input
                              type="number"
                              min="1"
                              value={room.totalOccupancy || 0}
                              onChange={(e) => handleRoomChange(idx, 'totalOccupancy', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                            />
                            <span className="text-[9px] text-slate-400 mt-1 block">Maximum guests allowed in all rooms combined</span>
                          </div>
                        </div>

                        {/* Room Numbers Section */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Room Numbers</label>
                          <span className="text-[10px] text-slate-450 block mt-0.5 font-medium">Enter specific identifiers for each individual unit.</span>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {(room.roomNumbers || []).map((num, numIdx) => (
                              <div key={numIdx} className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl flex flex-col gap-0.5 shadow-sm min-w-[80px]">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Room {numIdx + 1}</span>
                                <input
                                  type="text"
                                  value={num}
                                  onChange={(e) => handleRoomNumberChange(idx, numIdx, e.target.value)}
                                  className="w-full text-xs font-bold text-slate-750 focus:outline-none bg-transparent"
                                />
                              </div>
                            ))}

                            {/* Dotted Plus Button */}
                            <button
                              type="button"
                              onClick={() => addRoomNumber(idx)}
                              className="w-12 h-12 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all cursor-pointer bg-white"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Extra Person Allowance Sub-Card */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-750">
                              <Users size={16} className="text-rose-500" />
                              <span className="text-xs font-bold">Extra Person Allowance</span>
                            </div>
                            
                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => toggleExtraPerson(idx)}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex ${
                                room.extraPersonAllowedActive ? 'bg-rose-500 justify-end' : 'bg-slate-200 justify-start'
                              }`}
                            >
                              <motion.span layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                            </button>
                          </div>

                          {room.extraPersonAllowedActive && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50 animate-fade-in">
                              <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Capacity per room</label>
                                <select
                                  value={room.extraPersonCapacity || '2 Extra Persons'}
                                  onChange={(e) => handleRoomChange(idx, 'extraPersonCapacity', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:bg-white transition-all shadow-sm"
                                >
                                  <option value="1 Extra Person">1 Extra Person</option>
                                  <option value="2 Extra Persons">2 Extra Persons</option>
                                  <option value="3 Extra Persons">3 Extra Persons</option>
                                  <option value="4 Extra Persons">4 Extra Persons</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Price per extra person</label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-450 font-mono">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={room.extraPersonPrice || 0}
                                    onChange={(e) => handleRoomChange(idx, 'extraPersonPrice', e.target.value)}
                                    className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:outline-none focus:bg-white transition-all shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Room Gallery */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Room Gallery</label>
                          <span className="text-[10px] text-slate-450 block mt-0.5 font-medium">Upload high-quality images (up to 10). Recommended size 1200x800px.</span>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {(room.photos || []).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-200 group shadow-sm flex-shrink-0">
                                <img src={img} alt="Room" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeRoomPhoto(idx, imgIdx)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <X size={14} className="stroke-[2.5]" />
                                </button>
                              </div>
                            ))}

                            {/* Dotted Plus Photo Button */}
                            <button
                              type="button"
                              onClick={() => addRoomPhoto(idx)}
                              className="w-20 h-16 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 transition-all cursor-pointer bg-white"
                            >
                              <Plus size={14} />
                              <span className="text-[8px] font-bold uppercase mt-1">Add Photos</span>
                            </button>
                          </div>
                        </div>

                        {/* Room Description */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Room Description</label>
                          <textarea
                            maxLength={500}
                            value={room.description || ''}
                            onChange={(e) => handleRoomChange(idx, 'description', e.target.value)}
                            placeholder="Our Deluxe Room offers a perfect blend of comfort..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-755 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all min-h-[80px]"
                          />
                          <div className="text-right text-[9px] font-bold text-slate-400 tracking-wider">
                            {(room.description || '').length}/500 characters
                          </div>
                        </div>

                      </div>
                    ))}

                    {formData.rooms.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        Please configure at least one room category.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Room Rate Management Matrix */}
            {wizardStep === 6 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                  Rate Plan Matrix Setup
                </h3>

                {/* Sub-Filters for Matrix editing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Select Season</label>
                    <select
                      value={selectedRateSeason}
                      onChange={(e) => setSelectedRateSeason(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      {formData.seasons.map(s => (
                        <option key={s.seasonName} value={s.seasonName}>{s.seasonName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Select Room Class</label>
                    <select
                      value={selectedRateCategory}
                      onChange={(e) => setSelectedRateCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      {formData.rooms.map(r => (
                        <option key={r.roomType} value={r.roomType}>{r.roomType}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Select Meal Plan</label>
                    <select
                      value={selectedRateMealPlan}
                      onChange={(e) => setSelectedRateMealPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="EP">EP (Room Only)</option>
                      <option value="CP">CP (Breakfast Included)</option>
                      <option value="MAP">MAP (Breakfast & Dinner)</option>
                      <option value="AP">AP (All Meals Included)</option>
                    </select>
                  </div>
                </div>

                {/* Rate Input Matrix Grid */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full border-collapse border border-slate-150 text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
                        <th className="p-3 border-r border-slate-150">Occupancy Type</th>
                        <th className="p-3 border-r border-slate-150 text-center" colSpan="2">Base Rate (Double/Triple)</th>
                        <th className="p-3 border-r border-slate-150 text-center" colSpan="2">Extra Person Charge</th>
                        <th className="p-3 text-center" colSpan="2">Child Charge</th>
                      </tr>
                      <tr className="bg-slate-100/50 text-[9px] font-bold text-slate-450 uppercase border-b border-slate-150">
                        <th className="p-2 border-r border-slate-150"></th>
                        <th className="p-2 border-r border-slate-150 text-center">B2B Rate</th>
                        <th className="p-2 border-r border-slate-150 text-center">B2C Rate</th>
                        <th className="p-2 border-r border-slate-150 text-center">B2B Extra</th>
                        <th className="p-2 border-r border-slate-150 text-center">B2C Extra</th>
                        <th className="p-2 border-r border-slate-150 text-center">B2B Child</th>
                        <th className="p-2 text-center">B2C Child</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-bold text-slate-700">
                      {['Double Occupancy', 'Triple Occupancy', 'Four Occupancy'].map((occupancy) => {
                        // Find matching rate matrix entry
                        const rateObj = formData.rates.find(r => 
                          r.roomCategory === selectedRateCategory && 
                          r.season === selectedRateSeason && 
                          r.occupancy === occupancy
                        );

                        const planRates = rateObj?.planRates?.[selectedRateMealPlan] || {
                          b2bRate: 0, b2cRate: 0, b2bExtraPerson: 0, b2cExtraPerson: 0, b2bChild: 0, b2cChild: 0
                        };

                        return (
                          <tr key={occupancy}>
                            <td className="p-3 bg-slate-50/50 border-r border-slate-150">{occupancy}</td>
                            
                            <td className="p-2 border-r border-slate-150">
                              <input
                                type="number"
                                value={planRates.b2bRate || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2bRate', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-150">
                              <input
                                type="number"
                                value={planRates.b2cRate || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2cRate', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>

                            <td className="p-2 border-r border-slate-150">
                              <input
                                type="number"
                                value={planRates.b2bExtraPerson || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2bExtraPerson', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-150">
                              <input
                                type="number"
                                value={planRates.b2cExtraPerson || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2cExtraPerson', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>

                            <td className="p-2 border-r border-slate-150">
                              <input
                                type="number"
                                value={planRates.b2bChild || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2bChild', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={planRates.b2cChild || ''}
                                onChange={(e) => handleRateCellChange(occupancy, selectedRateMealPlan, 'b2cChild', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-750 focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 items-center p-3 bg-amber-50 rounded-xl border border-amber-100 mt-4 text-[11px] font-bold text-amber-700">
                  <AlertCircle size={14} />
                  <span>Configure all meal plan types (EP, CP, MAP, AP) for each season and room class category before saving.</span>
                </div>
              </div>
            )}

            {/* Step 7: Summary Review */}
            {wizardStep === 7 && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl mx-auto">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-blue-650 rounded-full"></span>
                  Confirm Property Details Summary
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Basic stats */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Property Name</span>
                      <span className="text-sm font-extrabold text-slate-800">{formData.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Stay Type</span>
                        <span className="text-xs font-bold text-slate-700">{formData.type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block">Linked Owner</span>
                        <span className="text-xs font-bold text-slate-700">{formData.ownerName}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Address</span>
                      <span className="text-xs font-bold text-slate-650">{formData.address || 'N/A'}, {formData.city}, {formData.region}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block">Description</span>
                      <span className="text-xs text-slate-600 block line-clamp-4 leading-relaxed">{formData.description || 'No description provided.'}</span>
                    </div>
                  </div>

                  {/* Amenities and seasons */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Amenities</span>
                      <div className="flex flex-wrap gap-1">
                        {formData.amenities.map(a => (
                          <span key={a} className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200">
                            {a}
                          </span>
                        ))}
                        {formData.amenities.length === 0 && <span className="text-xs text-slate-400">No amenities selected.</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1.5">Season Dates config</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {formData.seasons.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-bold text-slate-650 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                            <span>{s.seasonName}</span>
                            <span>{s.fromDate} to {s.toDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Configured Room Classes</span>
                      <div className="space-y-1">
                        {formData.rooms.map((r, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-bold text-slate-750 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                            <span>{r.roomType} Class</span>
                            <span className="text-slate-450">{r.totalRooms} Rooms ({r.roomNumbers.join(', ')})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Wizard Navigation Footer controls */}
          <div className="bg-slate-50 border border-slate-200 px-6 py-4.5 rounded-2xl flex items-center justify-between shadow-inner">
            <button
              disabled={wizardStep === 1}
              onClick={() => setWizardStep(prev => prev - 1)}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-250 text-slate-650 hover:bg-slate-50 font-bold rounded-xl text-xs disabled:opacity-45 cursor-pointer shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            {wizardStep < 7 ? (
              <button
                onClick={handleWizardNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-650 hover:bg-blue-750 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-blue-200"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSaveWizard}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-200"
              >
                <Check size={14} className="stroke-[3.5]" />
                <span>{viewMode === 'add' ? 'Register Property' : 'Save Modifications'}</span>
              </button>
            )}
          </div>

        </motion.div>
      )}

      {/* 3. PROPERTY DETAILS VIEW */}
      {viewMode === 'details' && selectedId && propertyDetails && (
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* Header Metadata Navigation Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-150"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">#{propertyDetails._id}</span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                  <span className="text-xs font-bold text-slate-500">{propertyDetails.type}</span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${
                    propertyDetails.status === 'Active' || propertyDetails.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    propertyDetails.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    propertyDetails.status === 'Pending Approval' || propertyDetails.status === 'Submitted For Review' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {propertyDetails.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  {propertyDetails.name}
                </h2>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEditClick(propertyDetails)}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Edit2 size={13} className="text-slate-500" />
                <span>Edit Property</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete this property and all linked datasets?')) {
                    deleteMutation.mutate(propertyDetails._id);
                    setViewMode('list');
                  }
                }}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Trash2 size={13} className="text-rose-500" />
                <span>Delete Asset</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics KPI panel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#edf4ff] p-4.5 rounded-2xl border border-blue-50/50">
              <span className="text-[9px] font-bold text-blue-650 uppercase tracking-wider block">Total Bookings</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">{propertyDetails.bookings || 0}</span>
            </div>

            <div className="bg-[#ecfbf3] p-4.5 rounded-2xl border border-emerald-50/50">
              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Occupancy Rate</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">{propertyDetails.occupancyRate || 0}%</span>
            </div>

            <div className="bg-[#f8f0ff] p-4.5 rounded-2xl border border-indigo-50/50">
              <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-wider block">Revenue Generated</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">₹{(propertyDetails.revenueGenerated || 0).toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-[#fff8f0] p-4.5 rounded-2xl border border-orange-50/50">
              <span className="text-[9px] font-bold text-orange-650 uppercase tracking-wider block">Average Rating</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono flex items-center gap-1.5 mt-1">
                <Star size={18} className="fill-orange-400 text-orange-400" />
                {propertyDetails.averageRating || 4.5}
              </span>
            </div>
          </div>

          {/* Main profile section layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Personal details card & photos */}
            <div className="space-y-6">
              
              {/* Owner Info Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Property Metadata & Owner
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Stay Type</span>
                    <span className="text-slate-800 font-extrabold">{propertyDetails.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Asset Owner</span>
                    <span className="text-slate-800 font-extrabold flex items-center gap-1 mt-0.5">
                      <User size={13} className="text-slate-400" />
                      {propertyDetails.ownerName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{propertyDetails.ownerMobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Location City</span>
                    <span className="text-slate-800 font-extrabold">{propertyDetails.city}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Region Zone</span>
                    <span className="text-slate-800 font-extrabold">{propertyDetails.region}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Google Maps Mapping</span>
                    {propertyDetails.mapLink ? (
                      <a 
                        href={propertyDetails.mapLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 font-extrabold hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <MapPin size={12} /> View on Google Maps
                      </a>
                    ) : (
                      <span className="text-slate-450">Not mapped</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos Gallery Box */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Photos Gallery
                </h3>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                  {propertyDetails.images?.map((url, i) => (
                    <div 
                      key={i} 
                      onClick={() => setLightboxPhoto(url)}
                      className="aspect-video rounded-xl overflow-hidden border border-slate-150 bg-slate-50 cursor-zoom-in"
                    >
                      <img src={url} alt={`Gallery index ${i}`} className="w-full h-full object-cover hover:scale-105 transition-all" />
                    </div>
                  ))}
                  {(!propertyDetails.images || propertyDetails.images.length === 0) && (
                    <div className="col-span-2 text-center py-6 text-xs text-slate-400 font-bold">
                      No photos registered for this property.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Column: Description & Amenities list & Seasons dates */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Description box */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  About the Property
                </h3>
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {propertyDetails.description || 'No detailed description written for this property.'}
                </p>
              </div>

              {/* Amenities Grid checklist */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Amenities & Facilities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {propertyDetails.amenities?.map((amenity) => (
                    <span 
                      key={amenity}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                    >
                      <Check size={12} className="text-emerald-500 stroke-[3.5]" />
                      {amenity}
                    </span>
                  ))}
                  {(!propertyDetails.amenities || propertyDetails.amenities.length === 0) && (
                    <span className="text-xs text-slate-400">No amenities registered.</span>
                  )}
                </div>
              </div>

              {/* Season ranges mapping */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Season Calendars Mapping
                </h3>
                <div className="space-y-2">
                  {propertyDetails.seasons?.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        {s.seasonName}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {formatDateDisplay(s.fromDate)} — {formatDateDisplay(s.toDate)}
                      </span>
                    </div>
                  ))}
                  {(!propertyDetails.seasons || propertyDetails.seasons.length === 0) && (
                    <div className="text-xs text-slate-400">No season dates mapping found.</div>
                  )}
                </div>
              </div>

              {/* Room Categories Setup list */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Room Classes Setup
                </h3>
                <div className="space-y-3">
                  {propertyDetails.rooms?.map((room, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-col sm:flex-row justify-between gap-3 text-xs font-bold">
                      <div>
                        <span className="text-slate-800 font-extrabold block">{room.roomType} Category</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Permitted Extra Guests: {room.extraPersonAllowed}</span>
                        {room.description && (
                          <span className="text-[11px] text-slate-500 block font-medium mt-1">"{room.description}"</span>
                        )}
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className="text-slate-800 font-black">{room.totalRooms} Rooms</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">#{room.roomNumbers.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Inventory Table (Live dropdown updates) */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Room Inventory Live Status
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Manage live room status availability directly.</span>
                </div>

                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Room Number</th>
                        <th className="p-3">Room Category</th>
                        <th className="p-3 text-center">Live Status</th>
                        <th className="p-3 text-right">Update Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-bold text-slate-750">
                      {/* Combine room numbers with their status */}
                      {(() => {
                        const items = [];
                        propertyDetails.rooms?.forEach(cat => {
                          cat.roomNumbers.forEach(num => {
                            // Find match in roomStatuses
                            const statusObj = propertyDetails.roomStatuses?.find(rs => rs.roomNumber === num);
                            items.push({
                              roomNumber: num,
                              category: cat.roomType,
                              status: statusObj ? statusObj.status : 'Available'
                            });
                          });
                        });

                        if (items.length === 0) {
                          return (
                            <tr>
                              <td colSpan="4" className="p-6 text-center text-slate-400">
                                No room numbers configured in database.
                              </td>
                            </tr>
                          );
                        }

                        return items.map(item => (
                          <tr key={item.roomNumber} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono">{item.roomNumber}</td>
                            <td className="p-3 text-slate-500">{item.category}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wide ${
                                item.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                item.status === 'Occupied' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                item.status === 'Blocked' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              <select
                                value={item.status}
                                onChange={(e) => {
                                  updateRoomStatusMutation.mutate({
                                    homestayId: propertyDetails._id,
                                    roomNumber: item.roomNumber,
                                    newStatus: e.target.value
                                  });
                                }}
                                className="p-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none"
                              >
                                <option value="Available">Set Available</option>
                                <option value="Occupied">Set Occupied</option>
                                <option value="Blocked">Set Blocked</option>
                                <option value="Maintenance">Set Maintenance</option>
                              </select>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Full rates matrix display */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Pricing Rates Sheets
                </h3>

                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {propertyDetails.rates && propertyDetails.rates.length > 0 ? (
                    (() => {
                      // Group rates by Category and Season
                      const grouped = {};
                      propertyDetails.rates.forEach(r => {
                        const key = `${r.roomCategory} | ${r.season}`;
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(r);
                      });

                      return Object.keys(grouped).map(key => {
                        const ratesList = grouped[key];
                        return (
                          <div key={key} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-800">{key}</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/30 text-[9px] font-extrabold text-slate-400 border-b border-slate-200">
                                    <th className="p-2">Occupancy</th>
                                    <th className="p-2">Plan</th>
                                    <th className="p-2 text-center">B2B Rate</th>
                                    <th className="p-2 text-center">B2C Rate</th>
                                    <th className="p-2 text-center">Extra B2B</th>
                                    <th className="p-2 text-center">Extra B2C</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {ratesList.map(r => (
                                    ['EP', 'CP', 'MAP', 'AP'].map(plan => {
                                      const pRates = r.planRates?.[plan] || {};
                                      return (
                                        <tr key={`${r.occupancy}-${plan}`} className="hover:bg-slate-50/50">
                                          <td className="p-2 font-bold">{r.occupancy.split(' ')[0]}</td>
                                          <td className="p-2 font-extrabold text-blue-600">{plan}</td>
                                          <td className="p-2 text-center font-mono">₹{pRates.b2bRate || 0}</td>
                                          <td className="p-2 text-center font-mono">₹{pRates.b2cRate || 0}</td>
                                          <td className="p-2 text-center font-mono text-slate-450">₹{pRates.b2bExtraPerson || 0}</td>
                                          <td className="p-2 text-center font-mono text-slate-450">₹{pRates.b2cExtraPerson || 0}</td>
                                        </tr>
                                      );
                                    })
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 font-bold">
                      No rates sheet defined for this property.
                    </div>
                  )}
                </div>
              </div>

              {/* Super Admin Review Console */}
              {propertyDetails.status !== 'Active' && propertyDetails.status !== 'Approved' ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 col-span-1 lg:col-span-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-600" />
                    <span>Super Admin Review & Verification Console</span>
                  </h3>
                  
                  <div className="space-y-3.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Review Notes / Comments (Required for Rejection or Changes Requested)</label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Provide detailed feedback on what needs to be changed, or reason for approval/rejection..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleReviewAction('Changes Requested')}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black cursor-pointer border-none uppercase tracking-wider transition-colors"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction('Rejected')}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer border-none uppercase tracking-wider transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction('Approved')}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer border-none uppercase tracking-wider transition-colors"
                    >
                      Approve (Publish Live)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm col-span-1 lg:col-span-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      <span>Property Live & Verified</span>
                    </h3>
                    <p className="text-[11px] text-emerald-600 mt-1 font-bold">This property has been approved and is now active on the customer portal.</p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">
                    Published Live
                  </span>
                </div>
              )}

            </div>
          </div>

        </motion.div>
      )}

      {/* 4. LIGHTBOX PREVIEW MODAL */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPhoto(null)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full transition-all cursor-pointer z-10"
              >
                <X size={16} />
              </button>
              <img src={lightboxPhoto} alt="Lightbox Preview" className="w-full h-auto max-h-[80vh] object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
