import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, 
  User, 
  Users,
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Plus, 
  Minus, 
  Info, 
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  X,
  Building2,
  BedDouble,
  Receipt,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function CreateBookingFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  // Property selection
  const [propertiesList, setPropertiesList] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Tab State: 'Guest' vs 'Travel Agent'
  const [bookingMode, setBookingMode] = useState('Guest');

  // Guest Details State
  const [guestName, setGuestName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Total Number of Rooms Required (1-5) - Default to 1 Room
  const [roomCount, setRoomCount] = useState(1);

  // Dynamic Room Guest Configurations: array of { id, adults, child5_9, child0_4, expanded }
  const [roomsConfig, setRoomsConfig] = useState([
    { id: 1, adults: 2, child5_9: 0, child0_4: 0, expanded: true }
  ]);

  // Stay Dates
  const now = new Date();
  const defaultInStr = now.toISOString().split('T')[0];
  const nextDay = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const defaultOutStr = nextDay.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(defaultInStr);
  const [checkOutDate, setCheckOutDate] = useState(defaultOutStr);

  // Room Allocations: array of { roomIndex: 0, categoryId: '', categoryName: '', roomNumber: '', mealPlan: 'EP', price: 0 }
  const [selectedRooms, setSelectedRooms] = useState([]);

  // Modal: Select Rooms & Dates
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Pricing Summary
  const [totalCost, setTotalCost] = useState(3000);
  const [totalTax, setTotalTax] = useState(360);
  const [addOns, setAddOns] = useState(0);
  const [addOnsRemark, setAddOnsRemark] = useState('');
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [tempAddonRemark, setTempAddonRemark] = useState('');
  const [tempAddonAmount, setTempAddonAmount] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [isCustomPriceEdited, setIsCustomPriceEdited] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  // Initialize from Query Params (e.g. from calendar cell click)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pId = searchParams.get('propertyId');
    const qRoom = searchParams.get('room');
    const qCatId = searchParams.get('roomCategoryId');
    const qIn = searchParams.get('checkIn');
    const qOut = searchParams.get('checkOut');

    if (pId) {
      setSelectedPropertyId(pId);
      localStorage.setItem('wow_homestay_selected_property', pId);
    } else {
      const saved = localStorage.getItem('wow_homestay_selected_property');
      if (saved) setSelectedPropertyId(saved);
    }

    if (qIn) {
      setCheckInDate(qIn);
      if (qOut) {
        setCheckOutDate(qOut);
      } else {
        const nextD = new Date(new Date(qIn).getTime() + 2 * 24 * 60 * 60 * 1000);
        setCheckOutDate(nextD.toISOString().split('T')[0]);
      }
    }

    // Default pre-select the room directly if passed from calendar
    if (qRoom) {
      setSelectedRooms([{
        roomIndex: 0,
        categoryId: qCatId || 'standard_room',
        categoryName: 'Selected Room',
        roomNumber: String(qRoom),
        mealPlan: 'EP',
        price: 3000
      }]);
    }
  }, [location.search]);

  // Fetch available rooms whenever property or stay dates change
  useEffect(() => {
    if (selectedPropertyId && checkInDate && checkOutDate) {
      fetchAvailableRooms(checkInDate, checkOutDate, selectedPropertyId);
    }
  }, [selectedPropertyId, checkInDate, checkOutDate]);

  // Auto-enrich room details once availableCategories are loaded
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const qRoom = searchParams.get('room');
    const qCatId = searchParams.get('roomCategoryId');

    if (qRoom && availableCategories.length > 0) {
      const cat = availableCategories.find(c => 
        (qCatId && String(c.categoryId) === String(qCatId)) ||
        (c.availableRooms && c.availableRooms.includes(String(qRoom)))
      ) || availableCategories[0];

      if (cat) {
        setSelectedRooms([{
          roomIndex: 0,
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          roomNumber: String(qRoom),
          mealPlan: 'EP',
          price: cat.basePrice || cat.price || 3000
        }]);
      }
    }
  }, [availableCategories]);

  // Load Owner Properties
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          navigate('/homestay-owner/login');
          return;
        }

        const res = await axios.get(getApiUrl('/api/homestay-owner/properties'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        const list = res.data || [];
        setPropertiesList(list);

        if (list.length > 0) {
          const searchParams = new URLSearchParams(window.location.search);
          const pIdFromUrl = searchParams.get('propertyId');
          let current = null;

          if (pIdFromUrl) {
            current = list.find(p => String(p._id) === String(pIdFromUrl));
          }
          if (!current) {
            const savedId = selectedPropertyId || localStorage.getItem('wow_homestay_selected_property');
            current = list.find(p => String(p._id) === String(savedId));
          }
          if (!current) current = list[0];

          setSelectedPropertyId(current._id);
          setSelectedProperty(current);
          localStorage.setItem('wow_homestay_selected_property', current._id);
        }
      } catch (err) {
        console.error('Error loading properties:', err);
      }
    };
    loadProperties();
  }, []);

  // Switch Homestay handler
  const handlePropertyChange = (newPropId) => {
    const prop = propertiesList.find(p => String(p._id) === String(newPropId));
    if (!prop) return;
    setSelectedPropertyId(prop._id);
    setSelectedProperty(prop);
    setSelectedRooms([]); // Reset selected rooms since rooms belong to property
    localStorage.setItem('wow_homestay_selected_property', prop._id);
    navigate(`?propertyId=${prop._id}`, { replace: true });
    fetchAvailableRooms(checkInDate, checkOutDate, prop._id);
  };

  // Synchronize dynamic Room Details cards when roomCount changes
  const handleRoomCountChange = (newCount) => {
    setRoomCount(newCount);
    setRoomsConfig(prev => {
      const updated = [];
      for (let i = 1; i <= newCount; i++) {
        const existing = prev.find(r => r.id === i);
        if (existing) {
          updated.push(existing);
        } else {
          updated.push({ id: i, adults: 2, child5_9: 0, child0_4: 0, expanded: true });
        }
      }
      return updated;
    });

    // Also adjust selectedRooms array if count decreased
    setSelectedRooms(prev => prev.slice(0, newCount));
  };

  // Adjust adult/child counters for a room
  const updateGuestCount = (roomId, field, delta) => {
    setRoomsConfig(prev => prev.map(r => {
      if (r.id === roomId) {
        const minVal = field === 'adults' ? 1 : 0;
        const currentVal = r[field] || 0;
        return { ...r, [field]: Math.max(minVal, currentVal + delta) };
      }
      return r;
    }));
  };

  // Toggle room accordion
  const toggleRoomExpand = (roomId) => {
    setRoomsConfig(prev => prev.map(r => r.id === roomId ? { ...r, expanded: !r.expanded } : r));
  };

  // Fetch Available Rooms for date range
  const fetchAvailableRooms = async (inD = checkInDate, outD = checkOutDate, propId = selectedPropertyId) => {
    if (!propId || !inD || !outD) return;
    try {
      setLoadingRooms(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl('/api/homestay-owner/bookings/available-rooms'), {
        params: {
          propertyId: propId,
          checkIn: inD,
          checkOut: outD
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setAvailableCategories(res.data.availableCategories || []);
    } catch (err) {
      console.error('Error querying available rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Open Room Selection Modal
  const handleOpenRoomModal = () => {
    setIsRoomModalOpen(true);
    fetchAvailableRooms(checkInDate, checkOutDate, selectedPropertyId);
  };

  // Re-fetch rooms when dates change inside the modal
  const handleDatesChangeInModal = (inD, outD) => {
    setCheckInDate(inD);
    setCheckOutDate(outD);
    if (new Date(inD) < new Date(outD)) {
      fetchAvailableRooms(inD, outD, selectedPropertyId);
    }
  };

  // Select room category and room number for a room slot
  const handleSelectRoomForSlot = (roomIndex, category, roomNo) => {
    setSelectedRooms(prev => {
      const updated = [...prev];
      if (!category || !roomNo) {
        updated[roomIndex] = null;
      } else {
        updated[roomIndex] = {
          roomIndex,
          categoryId: category.categoryId,
          categoryName: category.categoryName,
          roomNumber: roomNo,
          mealPlan: updated[roomIndex]?.mealPlan || 'EP',
          price: 3000
        };
      }
      return updated;
    });
  };

  // Change meal plan for a room slot
  const handleMealPlanChange = (roomIndex, plan) => {
    setSelectedRooms(prev => {
      const updated = [...prev];
      if (updated[roomIndex]) {
        updated[roomIndex].mealPlan = plan;
      }
      return updated;
    });
  };

  // Calculate dynamic price from backend
  const calculatePricing = async () => {
    if (!selectedPropertyId || !selectedRooms.length) return;
    try {
      const token = getAuthToken();
      const payloadRooms = selectedRooms.map((sr, idx) => {
        const cfg = roomsConfig[idx] || { adults: 2, child5_9: 0, child0_4: 0 };
        return {
          categoryId: sr.categoryId,
          roomNumber: sr.roomNumber,
          adults: cfg.adults,
          child5_9: cfg.child5_9,
          child0_4: cfg.child0_4,
          mealPlan: sr.mealPlan
        };
      });

      const res = await axios.post(getApiUrl('/api/homestay-owner/bookings/calculate-price'), {
        propertyId: selectedPropertyId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        bookingType: bookingMode === 'Travel Agent' ? 'agent' : 'guest',
        rooms: payloadRooms
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!isCustomPriceEdited) {
        setTotalCost(res.data.roomCost || 6000);
        setTotalTax(res.data.tax || 720);
      }
    } catch (err) {
      console.error('Error calculating pricing:', err);
    }
  };

  // When room selection is applied
  const handleApplyRoomSelection = () => {
    // Check that all required rooms have been allocated
    if (selectedRooms.length < roomCount || selectedRooms.some(r => !r || !r.roomNumber)) {
      Swal.fire('Incomplete Selection', `Please select a room for all ${roomCount} requested rooms.`, 'warning');
      return;
    }
    setIsRoomModalOpen(false);
    calculatePricing();
  };

  // Recalculate price when dependencies change
  useEffect(() => {
    if (selectedRooms.length === roomCount && selectedRooms.every(r => r && r.roomNumber)) {
      calculatePricing();
    }
  }, [selectedRooms, roomsConfig, bookingMode]);

  // Derived Pricing Math
  const finalCost = useMemo(() => {
    const cost = Math.max(0, Number(totalCost) || 0);
    const tax = Math.max(0, Number(totalTax) || 0);
    const addons = Math.max(0, Number(addOns) || 0);
    return cost + tax + addons;
  }, [totalCost, totalTax, addOns]);

  const balanceAmount = useMemo(() => {
    const advance = Math.max(0, Number(advanceAmount) || 0);
    return Math.max(0, finalCost - advance);
  }, [finalCost, advanceAmount]);

  // Create Booking Submission
  const handleSubmitBooking = async (isHold = false) => {
    // 1. Validation
    if (!guestName.trim()) {
      Swal.fire('Validation Error', 'Guest Name is required.', 'warning');
      return;
    }
    const cleanMobile = guestMobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      Swal.fire('Validation Error', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }
    if (selectedRooms.length < roomCount || selectedRooms.some(r => !r || !r.roomNumber)) {
      Swal.fire('Rooms Not Selected', 'Please click "Select Rooms & Dates" to pick available rooms before creating the booking.', 'warning');
      return;
    }

    // Check duplicate room numbers
    const roomNos = selectedRooms.map(r => r.roomNumber);
    if (new Set(roomNos).size !== roomNos.length) {
      Swal.fire('Duplicate Room', 'You cannot select the same room number multiple times.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = getAuthToken();

      const bookingPayload = {
        propertyId: selectedPropertyId,
        customer: {
          name: guestName.trim(),
          mobile: `${phoneCountryCode} ${cleanMobile}`,
          email: guestEmail
        },
        checkInDate,
        checkOutDate,
        bookingMode,
        isHold,
        rooms: selectedRooms.map((sr, idx) => {
          const cfg = roomsConfig[idx] || { adults: 2, child5_9: 0, child0_4: 0 };
          return {
            roomCategoryId: sr.categoryId,
            roomCategoryName: sr.categoryName,
            roomNumber: sr.roomNumber,
            adults: cfg.adults,
            child5_9: cfg.child5_9,
            child0_4: cfg.child0_4,
            mealPlan: sr.mealPlan,
            roomPrice: Math.round(totalCost / roomCount)
          };
        }),
        pricing: {
          roomCost: totalCost,
          tax: totalTax,
          addOns,
          addOnsRemark,
          finalAmount: finalCost,
          advanceAmount: Number(advanceAmount) || 0,
          balanceAmount
        },
        advanceAmount: Number(advanceAmount) || 0
      };

      const res = await axios.post(getApiUrl('/api/homestay-owner/bookings'), bookingPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const savedBooking = res.data.booking;
      setCreatedBooking(savedBooking);

      Swal.fire({
        icon: 'success',
        title: isHold ? 'Booking Placed on Hold!' : 'Booking Created Successfully!',
        html: `
          <div class="text-xs space-y-1">
            <p><strong>Booking Ref:</strong> ${savedBooking.bookingId}</p>
            <p><strong>Guest:</strong> ${savedBooking.customer.name}</p>
            <p><strong>Rooms:</strong> ${savedBooking.bookedRooms.map(r => r.roomNumber).join(', ')}</p>
            <p><strong>Final Amount:</strong> ₹${savedBooking.amount.toLocaleString()}</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'View in Calendar',
        cancelButtonText: 'Create Another',
        confirmButtonColor: '#e11d48'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(`/homestay-owner/availability?propertyId=${selectedPropertyId}`);
        } else {
          // Reset for new booking
          setGuestName('');
          setGuestMobile('');
          setSelectedRooms([]);
          setCreatedBooking(null);
        }
      });

    } catch (err) {
      console.error('Error creating booking:', err);
      const errMsg = err.response?.data?.message || 'Failed to create booking.';
      Swal.fire({
        icon: 'error',
        title: 'Booking Failed',
        text: errMsg
      });
    } finally {
      setSubmitting(false);
    }
  };

  const propertyDisplayName = selectedProperty?.name || 'Panchpokhari Homestay';

  return (
    <div className="space-y-6 font-sans pb-16 select-none max-w-7xl mx-auto">
      
      {/* 1. TOP BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button 
            onClick={() => navigate(-1)}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
          >
            <ArrowLeft size={10} className="stroke-[3]" />
            <span>Back</span>
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer p-0 text-[10px] font-black uppercase text-slate-400"
          >
            Dashboard
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/homestay-owner/inventory')}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer p-0 text-[10px] font-black uppercase text-slate-400"
          >
            My Homestays
          </button>
          <span>/</span>
          <span className="text-slate-700 font-black">{propertyDisplayName}</span>
          <span>/</span>
          <span className="text-rose-700 font-extrabold">Create Booking</span>
        </div>

        {/* Property Switcher if owner has multiple homestays */}
        {propertiesList.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 size={12} className="text-slate-400" />
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => {
                const p = propertiesList.find(item => item._id === e.target.value);
                setSelectedPropertyId(e.target.value);
                setSelectedProperty(p);
                setSelectedRooms([]);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {propertiesList.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. HEADER & SEGMENT TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Create Booking</h1>
        </div>
        
        {/* For Guest vs For Travel Agent Tabs matching screenshot */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-xs border border-slate-200/50">
          <button
            type="button"
            onClick={() => setBookingMode('Guest')}
            className={`px-4 py-2 text-xs font-black rounded-lg cursor-pointer border-none transition-all flex items-center gap-1.5 ${
              bookingMode === 'Guest' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 bg-transparent hover:text-slate-800'
            }`}
          >
            <User size={13} className="stroke-[2.5]" />
            <span>For Guest</span>
          </button>
          <button
            type="button"
            onClick={() => setBookingMode('Travel Agent')}
            className={`px-4 py-2 text-xs font-black rounded-lg cursor-pointer border-none transition-all flex items-center gap-1.5 ${
              bookingMode === 'Travel Agent' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 bg-transparent hover:text-slate-800'
            }`}
          >
            <Building2 size={13} className="stroke-[2.5]" />
            <span>For Travel Agent</span>
          </button>
        </div>
      </div>

      {/* HOMESTAY / PROPERTY SELECTOR CARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-black shadow-xs shrink-0">
            <Building2 size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Active Homestay / Property
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {selectedProperty?.name || 'Select Homestay'}
              </h2>
              {selectedProperty?.status && (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                  selectedProperty.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedProperty.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {selectedProperty?.city ? `${selectedProperty.city}, ${selectedProperty.state}` : ''}
              {selectedProperty?.rooms ? ` • ${selectedProperty.rooms} Rooms Configured` : ''}
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
          <label className="text-[11px] font-black text-slate-500 uppercase shrink-0">Switch Homestay:</label>
          <select
            value={selectedPropertyId || ''}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-black py-1.5 px-3 rounded-lg focus:outline-none focus:border-rose-500 cursor-pointer w-full md:w-64"
          >
            {propertiesList.map(p => (
              <option key={p._id} value={p._id}>
                {p.name || p.propertyId} ({p.city || 'Homestay'}) {p.rooms ? `• ${p.rooms} Rms` : ''} - {p.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (Form & Dynamic Rooms) */}
        <div className="lg:col-span-8 space-y-6">

          {/* CARD 1: GUEST DETAILS */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <User size={15} className="stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">Guest Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Guest Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Guest Name *</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                />
              </div>

              {/* Guest Mobile */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Guest Mobile Number *</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="+91">+91</option>
                      <option value="+977">+977</option>
                    </select>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={guestMobile}
                    onChange={(e) => setGuestMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter mobile number"
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Total Rooms Required Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Number of Rooms Required *</label>
              <div className="relative">
                <select
                  value={roomCount}
                  onChange={(e) => handleRoomCountChange(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 cursor-pointer appearance-none"
                >
                  <option value={1}>1 Room</option>
                  <option value={2}>2 Rooms</option>
                  <option value={3}>3 Rooms</option>
                  <option value={4}>4 Rooms</option>
                  <option value={5}>5 Rooms</option>
                </select>
                <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Notice banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-xs font-medium flex items-center gap-2">
              <Info size={14} className="text-slate-400 shrink-0" />
              <span>Add guest details, select number of rooms and click on "Select Rooms & Dates" to continue.</span>
            </div>
          </div>

          {/* DYNAMIC ROOM DETAILS ACCORDION CARDS */}
          <div className="space-y-4">
            {roomsConfig.map((room) => (
              <div key={room.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden transition-all">
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleRoomExpand(room.id)}
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <BedDouble size={15} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase">Room {room.id} Details</span>
                      {selectedRooms[room.id - 1] && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Allocated: {selectedRooms[room.id - 1].roomNumber} ({selectedRooms[room.id - 1].categoryName})
                        </span>
                      )}
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 bg-transparent border-none p-1">
                    {room.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Accordion Content */}
                {room.expanded && (
                  <div className="p-6 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Adults */}
                    <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col justify-between items-center space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                        Total Adults (10+ Years) *
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'adults', -1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Minus size={12} className="text-slate-700" />
                        </button>
                        <span className="text-sm font-black text-slate-900 w-4 text-center">{room.adults}</span>
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'adults', 1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Plus size={12} className="text-slate-700" />
                        </button>
                      </div>
                    </div>

                    {/* Child 5-9 Years */}
                    <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col justify-between items-center space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                        Total Child (5-9 Years) *
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'child5_9', -1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Minus size={12} className="text-slate-700" />
                        </button>
                        <span className="text-sm font-black text-slate-900 w-4 text-center">{room.child5_9}</span>
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'child5_9', 1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Plus size={12} className="text-slate-700" />
                        </button>
                      </div>
                    </div>

                    {/* Child 0-4 Years */}
                    <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col justify-between items-center space-y-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">
                        Total Child (0-4 Years)
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'child0_4', -1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Minus size={12} className="text-slate-700" />
                        </button>
                        <span className="text-sm font-black text-slate-900 w-4 text-center">{room.child0_4}</span>
                        <button
                          type="button"
                          onClick={() => updateGuestCount(room.id, 'child0_4', 1)}
                          className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-xs"
                        >
                          <Plus size={12} className="text-slate-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* SELECT ROOMS & DATES BANNER matching screenshot */}
          <div className="border-2 border-dashed border-rose-300 bg-rose-50/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all hover:bg-rose-50/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
                <CalendarIcon size={22} className="stroke-[2.5]" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-rose-700 leading-tight">Select Rooms & Dates</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {selectedRooms.length > 0 
                    ? `Selected: ${selectedRooms.map(r => r.roomNumber).join(', ')} (${checkInDate} to ${checkOutDate})`
                    : 'Choose available rooms and select check-in & check-out dates'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenRoomModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <CalendarIcon size={14} />
              <span>{selectedRooms.length > 0 ? 'Change Rooms & Dates' : 'Select Rooms & Dates'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: PRICING SUMMARY */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <CreditCard size={15} className="stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">Pricing Summary</h3>
            </div>

            {/* Price breakdown rows */}
            <div className="space-y-4 text-xs font-semibold text-slate-600">
              {/* Total Cost (Editable) */}
              <div className="flex justify-between items-center">
                <span className="text-slate-700 font-bold">Total Cost (Editable) *</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={totalCost}
                    onChange={(e) => {
                      setIsCustomPriceEdited(true);
                      setTotalCost(Math.max(0, parseInt(e.target.value, 10) || 0));
                    }}
                    className="w-24 text-right font-mono font-black text-slate-900 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Total Tax (Editable) */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-slate-700 font-bold">
                  <span>Total Tax (Editable) *</span>
                  <Info size={11} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={totalTax}
                    onChange={(e) => {
                      setIsCustomPriceEdited(true);
                      setTotalTax(Math.max(0, parseInt(e.target.value, 10) || 0));
                    }}
                    className="w-24 text-right font-mono font-bold text-slate-900 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Add-ons with Remark and Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-slate-700 font-bold">
                    <span>Add-ons</span>
                    <Info size={11} className="text-slate-400" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setTempAddonRemark(addOnsRemark);
                      setTempAddonAmount(addOns > 0 ? String(addOns) : '');
                      setIsAddonModalOpen(true);
                    }}
                    className="text-rose-600 hover:text-rose-700 bg-transparent border-none cursor-pointer font-bold text-xs flex items-center gap-1"
                  >
                    <Plus size={11} className="stroke-[3]" />
                    <span>{addOns > 0 ? `₹${addOns.toLocaleString()}` : '+ Add Add-ons'}</span>
                  </button>
                </div>
                {addOns > 0 && (
                  <div className="flex justify-between items-center text-[10px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <span className="font-semibold truncate max-w-[170px]">
                      {addOnsRemark ? `Remark: ${addOnsRemark}` : 'Extra Services / Add-on'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTempAddonRemark(addOnsRemark);
                          setTempAddonAmount(String(addOns));
                          setIsAddonModalOpen(true);
                        }}
                        className="text-slate-500 hover:text-slate-800 p-0 border-none bg-transparent cursor-pointer font-bold text-[9px]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddOns(0); setAddOnsRemark(''); }}
                        className="text-rose-500 hover:text-rose-700 p-0 border-none bg-transparent cursor-pointer font-bold text-[9px]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Cost */}
              <div className="border-t border-slate-100 pt-3.5 flex justify-between items-baseline">
                <span className="text-sm font-black text-rose-700">Final Cost</span>
                <span className="text-2xl font-black text-rose-700 font-mono">
                  ₹ {finalCost.toLocaleString()}
                </span>
              </div>

              {/* Advance Amount Received Input */}
              <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Advance Amount Received
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    max={finalCost}
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Balance Amount */}
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Balance Amount</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  ₹ {balanceAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Create Booking (Primary Red) */}
              <button
                type="button"
                onClick={() => handleSubmitBooking(false)}
                disabled={submitting}
                className="w-full py-4 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 size={15} className="stroke-[2.5]" />
                <span>{submitting ? 'Creating Booking...' : 'Create Booking'}</span>
              </button>

              {/* Hold Booking (Secondary White) */}
              <button
                type="button"
                onClick={() => handleSubmitBooking(true)}
                disabled={submitting}
                className="w-full py-3.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer bg-white flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Clock size={14} className="stroke-[2.5]" />
                <span>Hold Booking</span>
              </button>
            </div>

            {/* Helper Action Buttons matching screenshot */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
              <button 
                type="button"
                onClick={() => {
                  if (createdBooking) {
                    navigate(`/homestay-owner/bookings/confirmation-slip/${createdBooking._id}`);
                  } else {
                    Swal.fire('Info', 'Create a booking first to view confirmation slip.', 'info');
                  }
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center gap-1"
                title="View Confirmation Slip"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase">Slip</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (createdBooking) {
                    navigate(`/homestay-owner/bookings/invoice/${createdBooking._id}`);
                  } else {
                    Swal.fire('Info', 'Create a booking first to generate invoice.', 'info');
                  }
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center gap-1"
                title="View & Download Tax Invoice"
              >
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Receipt size={13} className="stroke-[2.5]" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase">Invoice</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (createdBooking) {
                    navigate(`/homestay-owner/bookings/quotation/${createdBooking._id}`);
                  } else {
                    Swal.fire('Info', 'Create a booking first to generate quotation.', 'info');
                  }
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center gap-1"
                title="View Booking Quotation"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileText size={13} className="stroke-[2.5]" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase">Quotation</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* 4. SELECT ROOMS & DATES MODAL */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <CalendarIcon size={16} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Select Rooms & Dates</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Choose dates and pick available rooms for {roomCount} room(s).</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRoomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Check-in Date *</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => handleDatesChangeInModal(e.target.value, checkOutDate)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Check-out Date *</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => handleDatesChangeInModal(checkInDate, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Active Homestay Indicator & Switcher inside modal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">
                  Allocating for: <strong className="text-slate-900">{selectedProperty?.name || 'Selected Homestay'}</strong> {selectedProperty?.city ? `(${selectedProperty.city})` : ''}
                </span>
              </div>
              {propertiesList.length > 1 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Switch:</span>
                  <select
                    value={selectedPropertyId || ''}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 text-xs font-bold py-1 px-2.5 rounded-lg focus:outline-none cursor-pointer w-full sm:w-auto"
                  >
                    {propertiesList.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name || p.propertyId} {p.rooms ? `(${p.rooms} Rms)` : ''} - {p.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Empty or unavailable warning */}
            {(!availableCategories || availableCategories.length === 0 || availableCategories.every(c => c.availableCount === 0)) && !loadingRooms && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-xs">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>No rooms available in "{selectedProperty?.name}" for {checkInDate} to {checkOutDate}.</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Rooms may already be booked or blocked for these dates, or this homestay has no rooms configured. Please choose different stay dates, or switch to another homestay using the dropdown above.
                </p>
              </div>
            )}

            {/* Room Allocation Selectors for each required room */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Allocate {roomCount} Room(s)
                </h4>
                {loadingRooms && (
                  <span className="text-[10px] font-bold text-rose-600 animate-pulse">Checking live availability...</span>
                )}
              </div>

              {Array.from({ length: roomCount }).map((_, idx) => {
                const currentSlot = selectedRooms[idx] || {};
                // Determine which room numbers are already selected in OTHER slots
                const takenRoomsInOtherSlots = selectedRooms
                  .filter((sr, sIdx) => sIdx !== idx && sr && sr.roomNumber)
                  .map(sr => String(sr.roomNumber));

                return (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-black text-rose-700 uppercase">Room {idx + 1} Selection</span>
                      {currentSlot.roomNumber ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                          Selected: {currentSlot.roomNumber} ({currentSlot.categoryName})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                          Pending Selection
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Category & Available Room Selector */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Available Room *</label>
                        <select
                          value={currentSlot.categoryId && currentSlot.roomNumber ? `${currentSlot.categoryId}|${currentSlot.roomNumber}` : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              handleSelectRoomForSlot(idx, null, null);
                              return;
                            }
                            const [cId, rNo] = val.split('|');
                            const cat = availableCategories.find(c => String(c.categoryId) === String(cId));
                            if (cat) handleSelectRoomForSlot(idx, cat, rNo);
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Choose Available Room --</option>
                          {availableCategories.map(cat => (
                            <optgroup key={cat.categoryId} label={`${cat.categoryName} (${cat.availableCount} available)`}>
                              {cat.availableRooms.map(rNo => {
                                const isTakenElsewhere = takenRoomsInOtherSlots.includes(String(rNo));
                                return (
                                  <option 
                                    key={rNo} 
                                    value={`${cat.categoryId}|${rNo}`}
                                    disabled={isTakenElsewhere}
                                  >
                                    Room {rNo} {isTakenElsewhere ? '(Selected in another room)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Meal Plan */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Meal Plan</label>
                        <select
                          value={currentSlot.mealPlan || 'EP'}
                          onChange={(e) => handleMealPlanChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        >
                          <option value="EP">EP (Room Only)</option>
                          <option value="CP">CP (With Breakfast)</option>
                          <option value="MAP">MAP (Breakfast + Dinner)</option>
                          <option value="AP">AP (All Meals)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Pick Room Pills */}
                    {availableCategories && availableCategories.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                          Or Click Room To Allocate:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {availableCategories.flatMap(cat =>
                            cat.availableRooms.map(rNo => {
                              const isTakenElsewhere = takenRoomsInOtherSlots.includes(String(rNo));
                              const isSelected = String(currentSlot.roomNumber) === String(rNo) && String(currentSlot.categoryId) === String(cat.categoryId);
                              return (
                                <button
                                  key={`${cat.categoryId}-${rNo}`}
                                  type="button"
                                  disabled={isTakenElsewhere}
                                  onClick={() => handleSelectRoomForSlot(idx, cat, rNo)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600 border-none'
                                      : isTakenElsewhere
                                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through border border-slate-200'
                                      : 'bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700'
                                  }`}
                                >
                                  <span>Room {rNo}</span>
                                  <span className="text-[9px] opacity-75 font-bold">({cat.categoryName})</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRoomModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRoomSelection}
                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-md shadow-rose-200"
              >
                Apply Room Selection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dedicated Add-ons Modal (Remark & Amount) */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Add-ons & Extra Services</h4>
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Remark / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Airport Pickup, Extra Bed, Dinner"
                  value={tempAddonRemark}
                  onChange={(e) => setTempAddonRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Amount in ₹ *
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1500"
                  value={tempAddonAmount}
                  onChange={(e) => setTempAddonAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddonModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const amt = Math.max(0, parseInt(tempAddonAmount, 10) || 0);
                  setAddOns(amt);
                  setAddOnsRemark(tempAddonRemark.trim());
                  setIsAddonModalOpen(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm"
              >
                Apply Add-on
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
