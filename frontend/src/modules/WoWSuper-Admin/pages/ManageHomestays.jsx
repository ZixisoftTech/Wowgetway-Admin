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
import PropertySetupWizard from '../../Homestay-Owner-Admin/pages/PropertySetupWizard.jsx';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=400&q=80';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return getApiUrl(path);
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
      const token = localStorage.getItem('superAdminToken');
      const response = await axios.get(API_HOMESTAYS_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          type: typeFilter,
          region: regionFilter,
          ownerName: ownerFilter
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    }
  });

  // 2. Fetch KPI Stats
  const { data: stats = { totalHomestays: 0, activeHomestays: 0, totalRooms: 0, avgOccupancyRate: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['homestaysStats'],
    queryFn: async () => {
      const token = localStorage.getItem('superAdminToken');
      const response = await axios.get(`${API_HOMESTAYS_URL}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
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
        roomType: '', 
        totalRooms: '', 
        totalOccupancy: '', 
        roomNumbers: [], 
        extraPersonAllowedActive: false,
        extraPersonCapacity: '',
        extraPersonPrice: '',
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
            
            // Find another room category that has rates configured
            const existingRoomWithRates = rooms.find(r => 
              r.roomType !== room.roomType && 
              formData.rates.some(rate => rate.roomCategory === r.roomType)
            );

            plans.forEach(plan => {
              let copiedPlanRate = null;
              if (existingRoomWithRates) {
                const otherRate = formData.rates.find(rate => 
                  rate.roomCategory === existingRoomWithRates.roomType &&
                  rate.season === season.seasonName &&
                  rate.occupancy === occupancy
                );
                if (otherRate && otherRate.planRates && otherRate.planRates[plan]) {
                  copiedPlanRate = JSON.parse(JSON.stringify(otherRate.planRates[plan]));
                }
              }

              planRates[plan] = copiedPlanRate || { 
                b2bRate: '', 
                b2cRate: '', 
                b2bExtraPerson: '', 
                b2cExtraPerson: '', 
                b2bChild: '', 
                b2cChild: '' 
              };
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
    setViewMode('wizard');
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
                setSelectedId(null);
                setViewMode('wizard');
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
                            <div className="flex justify-end gap-1.5 items-center">
                              {(prop.status === 'Pending Approval' || prop.rawStatus === 'Submitted For Review') && (
                                <button
                                  onClick={() => { setSelectedId(prop._id); setViewMode('details'); }}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                                  title="Review property submission"
                                >
                                  Review
                                </button>
                              )}
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
      {/* 2. UNIFIED 8-STEP PROPERTY SETUP WIZARD (SAME AS HOMESTAY OWNER PORTAL) */}
      {(viewMode === 'add' || viewMode === 'edit' || viewMode === 'wizard') && (
        <PropertySetupWizard
          propertyId={viewMode === 'add' ? null : selectedId}
          isAdmin={true}
          onBack={() => {
            setViewMode('list');
            setSelectedId(null);
            queryClient.invalidateQueries(['homestaysList']);
            queryClient.invalidateQueries(['homestaysStats']);
          }}
        />
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
                      onClick={() => setLightboxPhoto(getImageUrl(url))}
                      className="aspect-video rounded-xl overflow-hidden border border-slate-150 bg-slate-50 cursor-zoom-in"
                    >
                      <img src={getImageUrl(url)} alt={`Gallery index ${i}`} className="w-full h-full object-cover hover:scale-105 transition-all" />
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
                  {propertyDetails.resolvedAmenities?.map((amenity) => {
                    const isImageIcon = amenity.icon && (amenity.icon.startsWith('/') || amenity.icon.startsWith('http'));
                    return (
                      <span 
                        key={amenity.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                      >
                        {isImageIcon ? (
                          <img src={getImageUrl(amenity.icon)} alt={amenity.name} className="w-3.5 h-3.5 object-contain rounded-md" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <Check size={12} className="text-emerald-500 stroke-[3.5]" />
                        )}
                        {amenity.name}
                      </span>
                    );
                  })}
                  {(!propertyDetails.resolvedAmenities || propertyDetails.resolvedAmenities.length === 0) && 
                    propertyDetails.amenities?.map((amenity) => (
                      <span 
                        key={amenity}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750"
                      >
                        <Check size={12} className="text-emerald-500 stroke-[3.5]" />
                        {amenity}
                      </span>
                    ))
                  }
                  {(!propertyDetails.amenities || propertyDetails.amenities.length === 0) && (!propertyDetails.resolvedAmenities || propertyDetails.resolvedAmenities.length === 0) && (
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
              <img src={getImageUrl(lightboxPhoto)} alt="Lightbox Preview" className="w-full h-auto max-h-[80vh] object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
