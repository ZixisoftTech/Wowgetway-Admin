import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft,
  CalendarCheck,
  Calendar,
  Search,
  Building2,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  CreditCard,
  Receipt,
  FileText,
  Phone,
  MessageSquare,
  AlertTriangle,
  X,
  CalendarDays,
  DollarSign,
  ChevronDown,
  User,
  BedDouble,
  ExternalLink,
  Ban
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function ManageBookings() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedCount: 0,
    holdCount: 0,
    checkedInCount: 0,
    checkedOutCount: 0,
    cancelledCount: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalPending: 0
  });

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Reschedule Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleCheckIn, setRescheduleCheckIn] = useState('');
  const [rescheduleCheckOut, setRescheduleCheckOut] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Edit Booking Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editAddOns, setEditAddOns] = useState(0);
  const [editAddOnsRemark, setEditAddOnsRemark] = useState('');
  const [editSpecialRequests, setEditSpecialRequests] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Cancel Booking Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Guest requested cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [selectedPropertyId, activeStatusTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      let url = `/api/homestay-owner/bookings?propertyId=${selectedPropertyId}`;
      if (activeStatusTab !== 'all') url += `&status=${activeStatusTab}`;
      if (startDateFilter && endDateFilter) url += `&startDate=${startDateFilter}&endDate=${endDateFilter}`;

      const res = await axios.get(getApiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.properties) setProperties(res.data.properties);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper date formatter
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(dateVal);
    }
  };

  const toInputDateString = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // 1. Confirm Hold Booking
  const handleConfirmHold = async (b) => {
    const bookingId = b._id || b.id;
    try {
      const result = await Swal.fire({
        title: 'Confirm Booking?',
        text: `Convert Hold booking ${b.bookingId || ''} to Confirmed?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Confirm It!'
      });

      if (!result.isConfirmed) return;

      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/confirm-hold`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Confirmed!',
          text: 'The booking has been successfully confirmed.',
          timer: 1500,
          showConfirmButton: false
        });
        fetchBookings();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          setSelectedBooking({ ...selectedBooking, bookingStatus: 'Confirmed' });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Confirmation Failed',
        text: err.response?.data?.message || 'Failed to confirm hold booking.'
      });
    }
  };

  // 2. Remove Hold
  const handleRemoveHold = async (b) => {
    const bookingId = b._id || b.id;
    try {
      const result = await Swal.fire({
        title: 'Remove Hold?',
        text: `Are you sure you want to remove hold for ${b.bookingId || ''}? Dates will be released.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Remove Hold'
      });

      if (!result.isConfirmed) return;

      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/remove-hold`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Hold Removed',
          timer: 1500,
          showConfirmButton: false
        });
        fetchBookings();
        setSelectedBooking(null);
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to remove hold.'
      });
    }
  };

  // 3. Open Reschedule Modal
  const handleOpenReschedule = (b) => {
    setRescheduleBooking(b);
    setRescheduleCheckIn(toInputDateString(b.checkInDate));
    setRescheduleCheckOut(toInputDateString(b.checkOutDate));
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking) return;
    const bookingId = rescheduleBooking._id || rescheduleBooking.id;

    if (!rescheduleCheckIn || !rescheduleCheckOut) {
      Swal.fire({ icon: 'warning', title: 'Dates Required', text: 'Please select both check-in and check-out dates.' });
      return;
    }

    if (new Date(rescheduleCheckIn) >= new Date(rescheduleCheckOut)) {
      Swal.fire({ icon: 'warning', title: 'Invalid Dates', text: 'Check-out date must be after check-in date.' });
      return;
    }

    try {
      setRescheduleSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/reschedule`), {
        checkIn: rescheduleCheckIn,
        checkOut: rescheduleCheckOut
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Rescheduled!',
          text: 'The stay dates have been updated successfully.',
          timer: 1600,
          showConfirmButton: false
        });
        setIsRescheduleModalOpen(false);
        fetchBookings();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          setSelectedBooking({
            ...selectedBooking,
            checkInDate: rescheduleCheckIn,
            checkOutDate: rescheduleCheckOut
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Reschedule Failed',
        text: err.response?.data?.message || 'Could not reschedule stay. Room might be booked on selected dates.'
      });
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // 4. Open Record Payment Modal
  const handleOpenPayment = (b) => {
    setPaymentBooking(b);
    const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, (b.pricing?.finalAmount || 0) - (b.pricing?.paidAmount || 0)));
    setPaymentAmount(pend > 0 ? pend : '');
    setPaymentMethod(b.paymentMethod || 'UPI');
    setPaymentTransactionId('');
    setPaymentRemark('Settlement payment');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentBooking) return;
    const bookingId = paymentBooking._id || paymentBooking.id;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid payment amount.' });
      return;
    }

    try {
      setPaymentSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/payment`), {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionId: paymentTransactionId,
        remark: paymentRemark
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Recorded!',
          text: `Payment of ₹${Number(paymentAmount).toLocaleString()} recorded.`,
          timer: 1600,
          showConfirmButton: false
        });
        setIsPaymentModalOpen(false);
        fetchBookings();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          const oldPaid = Number(selectedBooking.pricing?.paidAmount || 0);
          const newPaid = oldPaid + Number(paymentAmount);
          const totalAmt = Number(selectedBooking.pricing?.finalAmount || 0);
          const newPend = Math.max(0, totalAmt - newPaid);
          setSelectedBooking({
            ...selectedBooking,
            pricing: {
              ...selectedBooking.pricing,
              paidAmount: newPaid,
              pendingAmount: newPend
            },
            paymentStatus: newPend === 0 ? 'Completed' : 'Partial'
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: err.response?.data?.message || 'Failed to record payment.'
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // 5. Open Edit Booking Modal
  const handleOpenEdit = (b) => {
    setEditBooking(b);
    setEditGuestName(b.customer?.name || '');
    setEditGuestPhone(b.customer?.mobile || '');
    setEditGuestEmail(b.customer?.email || '');
    setEditAddOns(b.pricing?.addOns || 0);
    setEditAddOnsRemark(b.pricing?.addOnsRemark || '');
    setEditSpecialRequests(b.specialRequests || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editBooking) return;
    const bookingId = editBooking._id || editBooking.id;

    try {
      setEditSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}`), {
        guestName: editGuestName,
        guestPhone: editGuestPhone,
        guestEmail: editGuestEmail,
        addOns: Number(editAddOns || 0),
        addOnsRemark: editAddOnsRemark,
        specialRequests: editSpecialRequests
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Updated',
          text: 'Guest details and add-ons saved successfully.',
          timer: 1500,
          showConfirmButton: false
        });
        setIsEditModalOpen(false);
        fetchBookings();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          setSelectedBooking({
            ...selectedBooking,
            customer: {
              ...selectedBooking.customer,
              name: editGuestName,
              mobile: editGuestPhone,
              email: editGuestEmail
            },
            pricing: {
              ...selectedBooking.pricing,
              addOns: Number(editAddOns || 0),
              addOnsRemark: editAddOnsRemark
            },
            specialRequests: editSpecialRequests
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to update booking.'
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // 6. Open Cancel Booking Modal
  const handleOpenCancel = (b) => {
    setCancelBooking(b);
    setCancelReason('Guest requested cancellation');
    setCancelNotes('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelBooking) return;
    const bookingId = cancelBooking._id || cancelBooking.id;

    try {
      setCancelSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/cancel`), {
        reason: cancelReason,
        notes: cancelNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Cancelled',
          text: 'The booking has been marked as cancelled.',
          timer: 1600,
          showConfirmButton: false
        });
        setIsCancelModalOpen(false);
        fetchBookings();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          setSelectedBooking({ ...selectedBooking, bookingStatus: 'Cancelled' });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cancellation Failed',
        text: err.response?.data?.message || 'Could not cancel booking.'
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Search filter
  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = b.customer?.name?.toLowerCase().includes(q);
    const matchPhone = b.customer?.mobile?.includes(q);
    const matchId = b.bookingId?.toLowerCase().includes(q);
    const matchProp = b.propertyId?.name?.toLowerCase().includes(q);
    const matchRoom = b.roomDetails?.roomNumber?.toLowerCase().includes(q);
    return matchName || matchPhone || matchId || matchProp || matchRoom;
  });

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
              <CalendarCheck size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                Manage Bookings & Reservations
              </h1>
              <p className="text-[10px] font-semibold text-slate-400">
                Full lifecycle management: confirm hold, reschedule, collect payments, edit details, and invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Property Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
            <Building2 size={14} className="text-rose-700" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Homestays (Consolidated)</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/homestay-owner/availability')}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <Calendar size={13} />
            <span>Calendar Grid</span>
          </button>

          <button
            onClick={() => navigate('/homestay-owner/bookings/create')}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Bookings */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Bookings</span>
          <span className="text-xl font-black text-slate-800 block mt-1 font-mono">{stats.totalBookings}</span>
        </div>

        {/* Confirmed */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider">Confirmed</span>
          <span className="text-xl font-black text-emerald-600 block mt-1 font-mono">{stats.confirmedCount}</span>
        </div>

        {/* Hold */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider">On Hold</span>
          <span className="text-xl font-black text-amber-600 block mt-1 font-mono">{stats.holdCount}</span>
        </div>

        {/* Checked In */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider">Checked In</span>
          <span className="text-xl font-black text-indigo-600 block mt-1 font-mono">{stats.checkedInCount}</span>
        </div>

        {/* Revenue Billed */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Billed</span>
          <span className="text-lg font-black text-slate-800 block mt-1 font-mono">₹{stats.totalRevenue.toLocaleString()}</span>
        </div>

        {/* Pending */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <span className="block text-[9px] font-black text-rose-600 uppercase tracking-wider">Pending Dues</span>
          <span className="text-lg font-black text-rose-600 block mt-1 font-mono">₹{stats.totalPending.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5">
          {/* Status Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'Confirmed', label: 'Confirmed' },
              { id: 'Hold', label: 'On Hold' },
              { id: 'Checked In', label: 'Checked In' },
              { id: 'Checked Out', label: 'Checked Out' },
              { id: 'Cancelled', label: 'Cancelled' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                  activeStatusTab === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh & Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest, phone, room, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-rose-500"
              />
            </div>

            <button
              onClick={() => fetchBookings()}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Data Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
        <div className="p-6 pb-0 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              All Bookings Records ({filteredBookings.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">
              Click "View" to open full booking drawer with PMS actions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto px-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Booking ID</th>
                <th className="pb-3 px-3">Guest Information</th>
                <th className="pb-3 px-3">Property & Room</th>
                <th className="pb-3 px-3">Stay Dates</th>
                <th className="pb-3 px-3 text-right">Total Bill</th>
                <th className="pb-3 px-3 text-right">Paid</th>
                <th className="pb-3 px-3 text-right">Balance</th>
                <th className="pb-3 px-3 text-center">Status</th>
                <th className="pb-3 px-3 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-bold text-xs">
                    {loading ? 'Loading bookings...' : 'No reservations found matching the filters.'}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const amt = Number(b.pricing?.finalAmount || b.amount || 0);
                  const paid = Number(b.pricing?.paidAmount || 0);
                  const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, amt - paid));

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Booking ID */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-[11px] font-extrabold text-slate-800 block">
                          {b.bookingId || b._id?.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          {formatDateDisplay(b.createdAt)}
                        </span>
                      </td>

                      {/* Guest Info */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-800">{b.customer?.name || 'Guest'}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{b.customer?.mobile || 'No mobile'}</span>
                          {b.customer?.mobile && (
                            <div className="flex items-center gap-1">
                              <a 
                                href={`tel:${b.customer.mobile}`}
                                className="w-5 h-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"
                                title="Call Guest"
                              >
                                <Phone size={10} />
                              </a>
                              <a 
                                href={`https://wa.me/${b.customer.mobile.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                                title="WhatsApp Guest"
                              >
                                <MessageSquare size={10} />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Property & Room */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-800">{b.propertyId?.name || 'Homestay'}</div>
                        <div className="text-[10px] text-rose-600 font-extrabold">
                          {b.roomDetails?.roomNumber || 'Room'} • {b.roomDetails?.categoryName || 'Standard'}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                        <div>In: {formatDateDisplay(b.checkInDate)}</div>
                        <div className="text-slate-400">Out: {formatDateDisplay(b.checkOutDate)}</div>
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                        ₹{amt.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        ₹{paid.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                        ₹{pend.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider inline-block ${
                          b.bookingStatus === 'Confirmed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : b.bookingStatus === 'Hold'
                            ? 'bg-amber-50 text-amber-700'
                            : b.bookingStatus === 'Checked In'
                            ? 'bg-indigo-50 text-indigo-700'
                            : b.bookingStatus === 'Checked Out'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {b.bookingStatus}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail button */}
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="View Full Booking Drawer"
                          >
                            <Eye size={12} className="stroke-[2.5]" />
                          </button>

                          {/* If Hold, Quick Confirm Button */}
                          {b.bookingStatus === 'Hold' && (
                            <button
                              onClick={() => handleConfirmHold(b)}
                              className="p-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title="Confirm Hold Booking"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}

                          {/* Reschedule Button */}
                          {b.bookingStatus !== 'Cancelled' && b.bookingStatus !== 'Checked Out' && (
                            <button
                              onClick={() => handleOpenReschedule(b)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Reschedule Stay Dates"
                            >
                              <CalendarDays size={12} />
                            </button>
                          )}

                          {/* Record Payment Button */}
                          {pend > 0 && b.bookingStatus !== 'Cancelled' && (
                            <button
                              onClick={() => handleOpenPayment(b)}
                              className="p-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                              title="Record Payment"
                            >
                              <CreditCard size={12} />
                            </button>
                          )}

                          {/* Confirmation Slip */}
                          <button
                            onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${b._id}`)}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Confirmation Slip"
                          >
                            <Receipt size={12} />
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

      {/* FULL BOOKING DETAILS DRAWER / MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                  Booking Operations & Ledger
                </span>
                <h2 className="text-base font-black text-slate-800 tracking-tight mt-0.5">
                  {selectedBooking.bookingId || selectedBooking._id}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Guest Summary Card */}
            <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-lg border border-white shadow-xs">
                {selectedBooking.customer?.name ? selectedBooking.customer.name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-800 truncate">{selectedBooking.customer?.name || 'Guest'}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold">
                  <span>{selectedBooking.customer?.mobile || 'No phone'}</span>
                  {selectedBooking.customer?.email && <span>• {selectedBooking.customer.email}</span>}
                </div>
              </div>

              {selectedBooking.customer?.mobile && (
                <div className="flex items-center gap-1.5">
                  <a 
                    href={`tel:${selectedBooking.customer.mobile}`}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                    title="Call"
                  >
                    <Phone size={13} className="stroke-[2.5]" />
                  </a>
                  <a 
                    href={`https://wa.me/${selectedBooking.customer.mobile.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-50"
                    title="WhatsApp"
                  >
                    <MessageSquare size={13} className="stroke-[2.5]" />
                  </a>
                </div>
              )}
            </div>

            {/* Room & Stay Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Property & Room</span>
                <span className="font-bold text-slate-800 block mt-1">{selectedBooking.propertyId?.name || 'Homestay'}</span>
                <span className="text-[11px] font-extrabold text-rose-600 block mt-0.5">
                  {selectedBooking.roomDetails?.roomNumber || 'Room'} ({selectedBooking.roomDetails?.categoryName || 'Standard'})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Stay Schedule</span>
                <span className="font-bold text-slate-800 block mt-1 font-mono text-[11px]">
                  Check-in: {formatDateDisplay(selectedBooking.checkInDate)}
                </span>
                <span className="font-bold text-slate-800 block mt-0.5 font-mono text-[11px]">
                  Check-out: {formatDateDisplay(selectedBooking.checkOutDate)}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Financial Breakdown</span>
              <div className="flex justify-between text-slate-600">
                <span>Base Room Tariff:</span>
                <span className="font-mono font-bold">₹{Number(selectedBooking.pricing?.basePrice || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Fees:</span>
                <span className="font-mono font-bold">₹{Number(selectedBooking.pricing?.tax || 0).toLocaleString()}</span>
              </div>
              {selectedBooking.pricing?.addOns > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Add-ons ({selectedBooking.pricing.addOnsRemark || 'Extras'}):</span>
                  <span className="font-mono font-bold">₹{Number(selectedBooking.pricing.addOns).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-800 font-black">
                <span>Total Bill:</span>
                <span className="text-sm font-mono">₹{Number(selectedBooking.pricing?.finalAmount || selectedBooking.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid / Collected:</span>
                <span className="font-mono">₹{Number(selectedBooking.pricing?.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Balance Pending:</span>
                <span className="font-mono">
                  ₹{Number(selectedBooking.pricing?.pendingAmount !== undefined ? selectedBooking.pricing.pendingAmount : Math.max(0, (selectedBooking.pricing?.finalAmount || 0) - (selectedBooking.pricing?.paidAmount || 0))).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment History */}
            {selectedBooking.paymentHistory && selectedBooking.paymentHistory.length > 0 && (
              <div className="border border-slate-100 p-4 rounded-2xl bg-white space-y-2">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment Transactions</span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {selectedBooking.paymentHistory.map((ph, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">₹{Number(ph.amount).toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400">
                          {ph.method} • {formatDateDisplay(ph.date)} {ph.remark ? `(${ph.remark})` : ''}
                        </span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase">
                        Settled
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Requests */}
            {selectedBooking.specialRequests && (
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs">
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Special Requests</span>
                <p className="text-slate-700 mt-1">{selectedBooking.specialRequests}</p>
              </div>
            )}

            {/* Operations Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Operations & Actions</span>
              
              {/* If Hold Booking: Confirm and Remove Hold */}
              {selectedBooking.bookingStatus === 'Hold' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleConfirmHold(selectedBooking)}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    onClick={() => handleRemoveHold(selectedBooking)}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Remove Hold</span>
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleOpenReschedule(selectedBooking)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                >
                  <CalendarDays size={13} />
                  <span>Reschedule</span>
                </button>

                <button
                  onClick={() => handleOpenPayment(selectedBooking)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                >
                  <CreditCard size={13} />
                  <span>Record Pay</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(selectedBooking)}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                >
                  <Edit3 size={13} />
                  <span>Edit Info</span>
                </button>
              </div>

              {/* Printable Documents Row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${selectedBooking._id}`)}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <Receipt size={12} />
                  <span>Slip</span>
                </button>

                <button
                  onClick={() => navigate(`/homestay-owner/bookings/quotation/${selectedBooking._id}`)}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <FileText size={12} />
                  <span>Quotation</span>
                </button>

                <button
                  onClick={() => navigate(`/homestay-owner/bookings/invoice/${selectedBooking._id}`)}
                  className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                >
                  <FileText size={12} />
                  <span>Tax Invoice</span>
                </button>
              </div>

              {/* Cancel Booking button */}
              {selectedBooking.bookingStatus !== 'Cancelled' && (
                <button
                  onClick={() => handleOpenCancel(selectedBooking)}
                  className="w-full py-2.5 mt-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Ban size={13} />
                  <span>Cancel This Booking</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. RESCHEDULE MODAL */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Reschedule Stay Dates</h3>
              <button onClick={() => setIsRescheduleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">New Check-In Date</label>
                <input
                  type="date"
                  value={rescheduleCheckIn}
                  onChange={(e) => setRescheduleCheckIn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">New Check-Out Date</label>
                <input
                  type="date"
                  value={rescheduleCheckOut}
                  onChange={(e) => setRescheduleCheckOut(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {rescheduleSubmitting ? 'Updating...' : 'Save Dates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Record Guest Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Transaction Reference ID (Optional)</label>
                <input
                  type="text"
                  value={paymentTransactionId}
                  onChange={(e) => setPaymentTransactionId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. UPI-123456789"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Remark (Optional)</label>
                <input
                  type="text"
                  value={paymentRemark}
                  onChange={(e) => setPaymentRemark(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Check-in advance"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {paymentSubmitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT BOOKING DETAILS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Edit Guest & Booking Info</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Guest Name</label>
                <input
                  type="text"
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={editGuestPhone}
                    onChange={(e) => setEditGuestPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Email (Optional)</label>
                  <input
                    type="email"
                    value={editGuestEmail}
                    onChange={(e) => setEditGuestEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Add-ons Amount (₹)</label>
                  <input
                    type="number"
                    value={editAddOns}
                    onChange={(e) => setEditAddOns(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Add-ons Remark</label>
                  <input
                    type="text"
                    value={editAddOnsRemark}
                    onChange={(e) => setEditAddOnsRemark(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Extra mattress"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Special Requests / Notes</label>
                <textarea
                  value={editSpecialRequests}
                  onChange={(e) => setEditSpecialRequests(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
                  placeholder="Any special notes or preferences"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {editSubmitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CANCEL BOOKING MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                <span>Cancel Reservation</span>
              </h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Are you sure you want to cancel booking <strong className="text-slate-800">{cancelBooking?.bookingId}</strong>? This will release reserved dates on the calendar.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="Guest requested cancellation">Guest requested cancellation</option>
                  <option value="Change of dates/plans">Change of dates/plans</option>
                  <option value="Payment not received">Payment not received</option>
                  <option value="Property maintenance">Property maintenance</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Internal Notes (Optional)</label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
                  placeholder="Reason or guest feedback..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-6 gap-3">
        <div className="space-y-1 text-center sm:text-left">
          <span className="block text-slate-707 font-extrabold text-[11px]">WOW Gateways</span>
          <span>© 2024 WOW Gateways. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Privacy Policy</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Terms of Service</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
