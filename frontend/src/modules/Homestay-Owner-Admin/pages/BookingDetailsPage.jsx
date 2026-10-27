import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  FileText, 
  Receipt, 
  Printer, 
  RefreshCw, 
  ExternalLink, 
  Edit3, 
  Ban, 
  MessageSquare, 
  AlertTriangle,
  CalendarClock,
  Trash2,
  X,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Tag
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('token') || localStorage.getItem('superAdminToken');
};

export default function BookingDetailsPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Operation Modal states
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleIn, setRescheduleIn] = useState('');
  const [rescheduleOut, setRescheduleOut] = useState('');

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payTxId, setPayTxId] = useState('');
  const [payRemark, setPayRemark] = useState('Settlement payment');

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBooking = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/homestay-owner/bookings/${bookingId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = res.data?.booking || res.data;
      if (data) {
        setBooking(data);
      } else {
        setError('Booking not found.');
      }
    } catch (err) {
      console.error('Failed to load booking details:', err);
      setError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Booking Details...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4 my-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Booking Record Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Could not find booking with the provided identifier.'}</p>
        <button
          onClick={() => navigate('/homestay-owner/bookings/manage')}
          className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase rounded-xl cursor-pointer transition-colors"
        >
          Return to Manage Bookings
        </button>
      </div>
    );
  }

  const bookingMongoId = booking._id || booking.dbId || booking.id;
  const bookingCode = booking.bookingId || (bookingMongoId ? `#${String(bookingMongoId).slice(-6)}` : 'BOOKING');
  const guestName = booking.customer?.name || booking.name || booking.guestDetails?.fullName || 'Guest';
  const guestPhone = booking.customer?.mobile || booking.customer?.phone || booking.phone || '';
  const guestEmail = booking.customer?.email || booking.email || '';
  const guestAddress = booking.customer?.address || '';
  const guestInitial = guestName ? guestName.charAt(0).toUpperCase() : 'G';

  const propName = booking.propertyId?.name || booking.propertyName || booking.propertyDetails?.propertyName || 'Homestay Sanctuary';
  const propLocation = booking.propertyId?.location || booking.propertyId?.city || booking.propertyDetails?.location || 'Manali, Himachal Pradesh';
  const propAddress = booking.propertyId?.address || [booking.propertyId?.city, booking.propertyId?.state].filter(Boolean).join(', ') || '';

  // Dates formatting
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return 'Pending';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toInputDate = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      return dateVal.slice(0, 10);
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const checkInDisplay = formatDateDisplay(booking.checkInDate || booking.rawCheckIn || booking.checkIn);
  const checkOutDisplay = formatDateDisplay(booking.checkOutDate || booking.rawCheckOut || booking.checkOut);

  const checkInObj = new Date(booking.checkInDate || booking.rawCheckIn || booking.checkIn || Date.now());
  const checkOutObj = new Date(booking.checkOutDate || booking.rawCheckOut || booking.checkOut || Date.now());
  const nights = Math.max(1, Math.round((checkOutObj - checkInObj) / (1000 * 60 * 60 * 24)));

  // Financial Ledger calculations
  const totalBill = Number(booking.pricing?.finalAmount || booking.amount || 0);
  const paidAmount = Number(booking.pricing?.paidAmount || booking.paidAmount || 0);
  const pendingAmount = Number(
    booking.pricing?.pendingAmount !== undefined 
      ? booking.pricing.pendingAmount 
      : Math.max(0, totalBill - paidAmount)
  );

  const baseTariff = Number(booking.pricing?.basePrice || booking.pricing?.bookingAmount || booking.pricing?.roomCost || Math.round(totalBill * 0.89));
  const taxesFees = Number(booking.pricing?.tax || Math.round(baseTariff * 0.12));
  const addOns = Number(booking.pricing?.addOns || 0);
  const addOnsRemark = booking.pricing?.addOnsRemark || '';
  const discount = Number(booking.pricing?.discount || 0);

  const isHold = booking.bookingStatus === 'Hold';
  const isCancelled = booking.bookingStatus === 'Cancelled';

  // Room Allocations
  const allocatedRooms = (booking.bookedRooms && booking.bookedRooms.length > 0)
    ? booking.bookedRooms 
    : [booking.propertyDetails || { roomNumber: '101', roomCategory: 'Standard Room', mealPlan: 'EP' }];

  // Payment Transaction Records
  const transactionLedger = Array.isArray(booking.paymentHistory) && booking.paymentHistory.length > 0
    ? booking.paymentHistory
    : (paidAmount > 0 ? [{
        transactionId: booking.paymentDetails?.transactionId || `TXN-${String(bookingMongoId).slice(-6)}`,
        date: booking.paymentDetails?.paymentDate || booking.createdAt || Date.now(),
        amount: paidAmount,
        method: booking.paymentDetails?.method || 'UPI',
        status: 'Success',
        remark: 'Initial advance payment'
      }] : []);

  // 1. Confirm Hold
  const handleConfirmHold = async () => {
    try {
      const confirmResult = await Swal.fire({
        title: 'Confirm Booking?',
        text: `Convert Hold booking ${bookingCode} to Confirmed?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Confirm It!'
      });
      if (!confirmResult.isConfirmed) return;

      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/confirm-hold`), {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Booking Confirmed!', timer: 1500, showConfirmButton: false });
        fetchBooking();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Confirmation Failed', text: err.response?.data?.message || 'Could not confirm booking.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Remove Hold
  const handleRemoveHold = async () => {
    try {
      const confirmResult = await Swal.fire({
        title: 'Remove Hold?',
        text: `Are you sure you want to remove hold for ${bookingCode}? The reserved room dates will be released.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Remove Hold'
      });
      if (!confirmResult.isConfirmed) return;

      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/remove-hold`), {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Hold Removed', timer: 1500, showConfirmButton: false });
        fetchBooking();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Could not remove hold.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Reschedule Handlers
  const handleOpenReschedule = () => {
    setRescheduleIn(toInputDate(booking.checkInDate || booking.rawCheckIn || booking.checkIn));
    setRescheduleOut(toInputDate(booking.checkOutDate || booking.rawCheckOut || booking.checkOut));
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleIn || !rescheduleOut) {
      Swal.fire('Dates Required', 'Please select both check-in and check-out dates.', 'warning');
      return;
    }
    if (new Date(rescheduleIn) >= new Date(rescheduleOut)) {
      Swal.fire('Invalid Dates', 'Check-out date must be strictly after check-in date.', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/reschedule`), {
        checkInDate: rescheduleIn,
        checkIn: rescheduleIn,
        newCheckIn: rescheduleIn,
        checkOutDate: rescheduleOut,
        checkOut: rescheduleOut,
        newCheckOut: rescheduleOut
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Stay Rescheduled!', timer: 1500, showConfirmButton: false });
        setIsRescheduleOpen(false);
        fetchBooking();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Reschedule Failed', text: err.response?.data?.message || 'Room unavailable on selected dates.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Record Payment Handlers
  const handleOpenPayment = () => {
    if (pendingAmount <= 0) {
      Swal.fire('Fully Settled', 'This booking has zero outstanding balance.', 'info');
      return;
    }
    setPayAmount(pendingAmount > 0 ? pendingAmount : '');
    setPayMethod('UPI');
    setPayTxId('');
    setPayRemark('Settlement payment');
    setIsPaymentOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(payAmount);
    if (!numAmt || numAmt <= 0) {
      Swal.fire('Invalid Amount', 'Please enter a valid amount greater than zero.', 'warning');
      return;
    }

    if (numAmt > pendingAmount) {
      Swal.fire({
        icon: 'warning',
        title: 'Overpayment Not Allowed',
        text: `Cannot collect ₹${numAmt.toLocaleString()}. Maximum outstanding balance is ₹${pendingAmount.toLocaleString()}.`
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/payment`), {
        amount: numAmt,
        paymentMethod: payMethod,
        transactionId: payTxId || `TXN-${Date.now().toString().slice(-6)}`,
        remark: payRemark
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Payment Recorded!', timer: 1500, showConfirmButton: false });
        setIsPaymentOpen(false);
        fetchBooking();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Payment Failed', text: err.response?.data?.message || 'Could not record payment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Cancellation Handlers
  const handleOpenCancel = () => {
    setCancelReason('');
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      Swal.fire('Reason Required', 'Please enter a valid reason for cancellation.', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/cancel`), {
        cancellationReason: cancelReason.trim()
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Booking Cancelled', timer: 1500, showConfirmButton: false });
        setIsCancelOpen(false);
        fetchBooking();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Cancellation Failed', text: err.response?.data?.message || 'Could not cancel booking.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-24 font-sans select-none">
      
      {/* 1. TOP BREADCRUMBS & HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-bold">
            <Link to="/homestay-owner/dashboard" className="hover:text-rose-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link to="/homestay-owner/bookings/manage" className="hover:text-rose-600 transition-colors">Bookings</Link>
            <span>/</span>
            <span className="text-slate-800 font-mono font-black">{bookingCode}</span>
          </div>

          <button
            onClick={() => navigate('/homestay-owner/bookings/manage')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Bookings</span>
          </button>
        </div>

        {/* Title, Badge & Primary Meta */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-2 border-t border-slate-50">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {bookingCode}
              </h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                booking.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                booking.bookingStatus === 'Hold' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                booking.bookingStatus === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                'bg-slate-100 text-slate-700'
              }`}>
                {booking.bookingStatus}
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                booking.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                booking.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {booking.paymentStatus || 'Payment Pending'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold mt-1.5">
              <span>Created: <strong className="text-slate-700 font-mono">{formatDateDisplay(booking.createdAt || booking.bookingDate)}</strong></span>
              <span>•</span>
              <span>Source: <strong className="text-slate-700">{booking.bookingSource || 'Direct Host'}</strong></span>
              <span>•</span>
              <span>Property: <strong className="text-rose-700">{propName}</strong></span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {isHold && (
              <>
                <button
                  onClick={handleConfirmHold}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle size={14} />
                  <span>Confirm Booking</span>
                </button>
                <button
                  onClick={handleRemoveHold}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-rose-200 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Remove Hold</span>
                </button>
              </>
            )}

            {!isCancelled && (
              <>
                <button
                  onClick={handleOpenReschedule}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border-none transition-colors"
                >
                  <CalendarClock size={13} />
                  <span>Reschedule</span>
                </button>

                {pendingAmount > 0 && (
                  <button
                    onClick={handleOpenPayment}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CreditCard size={13} />
                    <span>Record Pay</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => navigate(`/homestay-owner/bookings/create?editId=${bookingMongoId}`)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border-none transition-colors"
              title="Open Booking Flow in Edit Mode"
            >
              <Edit3 size={13} />
              <span>Edit Booking</span>
            </button>

            {!isCancelled && (
              <button
                onClick={handleOpenCancel}
                disabled={actionLoading}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-rose-200 transition-colors"
              >
                <Ban size={13} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2 Cols): Guest, Units, Schedule, Documents, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* A. Guest and Contact Details Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-rose-100 text-rose-700 font-black text-xl flex items-center justify-center border border-rose-200">
                  {guestInitial}
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/homestay-owner/guests/${bookingMongoId || booking.bookingId || guestPhone}`)}
                    className="text-lg font-black text-slate-900 hover:text-rose-600 flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
                    title="Open Full Guest Profile & Stay History"
                  >
                    <span>{guestName}</span>
                    <ExternalLink size={14} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">
                    Guest Record Reference #{String(booking.customer?.customerId || bookingMongoId).slice(-6)}
                  </span>
                </div>
              </div>

              {/* Quick Communication Actions */}
              {guestPhone && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${guestPhone}`}
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Phone size={13} className="text-rose-600" />
                    <span>Call Guest</span>
                  </a>
                  <a
                    href={`https://wa.me/${guestPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <MessageSquare size={13} className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-bold text-slate-800 font-mono mt-0.5 block">{guestPhone || 'No contact number'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="font-bold text-slate-800 truncate mt-0.5 block">{guestEmail || 'No email registered'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Guest Occupancy</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {booking.guests?.adults || 2} Adults, {booking.guests?.children || 0} Children
                </span>
              </div>
            </div>

            {guestAddress && (
              <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span>Address: {guestAddress}</span>
              </div>
            )}

            {/* Special Requests */}
            {(booking.specialRequests || booking.notes) && (
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-150 text-xs space-y-1">
                <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">
                  Special Requests & Guest Remarks
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {booking.specialRequests || booking.notes}
                </p>
              </div>
            )}
          </div>

          {/* B. Property & Room Allocation Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-rose-600" />
                <span>Property & Allocated Units ({allocatedRooms.length})</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">{propLocation}</span>
            </div>

            {/* Allocated Units Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Room No.</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Meal Plan</th>
                    <th className="py-3 px-4 text-center">Guests</th>
                    <th className="py-3 px-4 text-right">Nightly Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocatedRooms.map((rm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-black text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-rose-700 border border-slate-200">
                          {rm.roomNumber || rm.room || '101'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {rm.roomCategoryName || rm.roomCategory || rm.categoryName || 'Standard Room'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md text-[10px]">
                          {rm.mealPlan || 'EP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {rm.adults || 2} Adults{rm.child5_9 > 0 ? `, ${rm.child5_9}C` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(Number(rm.roomPrice || rm.price || baseTariff / nights)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* C. Stay Schedule & Timings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-rose-600" />
              <span>Stay Schedule</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Check-In Date</span>
                <span className="font-mono font-black text-slate-900 text-base mt-0.5 block">{checkInDisplay}</span>
                <span className="text-[10px] text-slate-500 font-medium">After 02:00 PM</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Check-Out Date</span>
                <span className="font-mono font-black text-slate-900 text-base mt-0.5 block">{checkOutDisplay}</span>
                <span className="text-[10px] text-slate-500 font-medium">Before 11:00 AM</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="font-black text-rose-600 text-base mt-0.5 block">{nights} Night{nights > 1 ? 's' : ''} Stay</span>
                <span className="text-[10px] text-slate-500 font-medium">{allocatedRooms.length} Room(s) reserved</span>
              </div>
            </div>
          </div>

          {/* D. Printable Official Documents Suite */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-rose-600" />
              <span>Official Guest Documents</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${bookingMongoId}`)}
                className="p-4 bg-slate-50 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
              >
                <Receipt size={18} className="text-rose-600 mb-2" />
                <span className="block font-black text-xs text-slate-900 group-hover:text-rose-600">Confirmation Slip</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Booking voucher & check-in receipt</span>
              </button>

              <button
                onClick={() => navigate(`/homestay-owner/bookings/invoice/${bookingMongoId}`)}
                className="p-4 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
              >
                <FileText size={18} className="text-emerald-600 mb-2" />
                <span className="block font-black text-xs text-slate-900 group-hover:text-emerald-600">Tax Invoice</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Official GST itemized tax invoice</span>
              </button>

              <button
                onClick={() => navigate(`/homestay-owner/bookings/quotation/${bookingMongoId}`)}
                className="p-4 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-200 rounded-2xl text-left transition-all cursor-pointer group shadow-2xs"
              >
                <Printer size={18} className="text-amber-600 mb-2" />
                <span className="block font-black text-xs text-slate-900 group-hover:text-amber-600">Quotation</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Formal stay proposal & pricing</span>
              </button>
            </div>
          </div>

          {/* E. Payment Transaction History Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" />
                <span>Payment Transaction History</span>
              </h3>
              {pendingAmount > 0 && !isCancelled && (
                <button
                  onClick={handleOpenPayment}
                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-emerald-200 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Record Payment</span>
                </button>
              )}
            </div>

            {transactionLedger.length > 0 ? (
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactionLedger.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {tx.transactionId || `TXN-${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {formatDateDisplay(tx.date || tx.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {tx.method || tx.paymentMethod || 'UPI'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                          {tx.remark || 'Direct payment'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          ₹{Number(tx.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md text-[9px] uppercase tracking-wider">
                            {tx.status || 'Success'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                No payment transactions recorded yet.
              </div>
            )}
          </div>

          {/* F. Audit Timeline */}
          {Array.isArray(booking.timeline) && booking.timeline.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-rose-600" />
                <span>Audit Timeline & Events</span>
              </h3>

              <div className="space-y-3">
                {booking.timeline.slice().reverse().map((t, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-rose-200 pl-3.5 py-1">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 leading-snug">{t.activity}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        {new Date(t.timestamp).toLocaleString()} • {t.createdBy || 'Host'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (1 Col): Financial Breakdown & Quick Summary */}
        <div className="space-y-6">
          
          {/* Financial Breakdown Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 sticky top-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-600" />
              <span>Authoritative Financial Summary</span>
            </h3>

            <div className="space-y-2 text-xs border-b border-slate-100 pb-4">
              <div className="flex justify-between text-slate-600">
                <span>Base Tariff ({nights}N):</span>
                <span className="font-mono font-bold text-slate-800">₹{baseTariff.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & GST:</span>
                <span className="font-mono font-bold text-slate-800">₹{taxesFees.toLocaleString()}</span>
              </div>
              {addOns > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Add-ons ({addOnsRemark || 'Services'}):</span>
                  <span className="font-mono font-bold text-slate-800">+₹{addOns.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">-₹{discount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Total, Paid, Pending */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">Total Booking Amount:</span>
                <span className="font-mono text-lg font-black text-slate-900">₹{totalBill.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-600">Payments Received:</span>
                <span className="font-mono text-sm font-black text-emerald-600">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                <span className="text-xs font-black text-slate-800">Outstanding Balance:</span>
                <span className={`font-mono text-base font-black ${pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  ₹{pendingAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Operations Button */}
            {pendingAmount > 0 && !isCancelled && (
              <button
                onClick={handleOpenPayment}
                disabled={actionLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <CreditCard size={14} />
                <span>Record Payment (Max ₹{pendingAmount.toLocaleString()})</span>
              </button>
            )}

            {!isCancelled && (
              <button
                onClick={handleOpenReschedule}
                disabled={actionLoading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
              >
                <CalendarClock size={14} />
                <span>Reschedule Stay Dates</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* 3. MODALS FOR OPERATIONS */}

      {/* A. Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Reschedule Stay Dates</h3>
              <button onClick={() => setIsRescheduleOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">New Check-in Date</label>
                <input
                  type="date"
                  value={rescheduleIn}
                  onChange={(e) => setRescheduleIn(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-rose-600"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">New Check-out Date</label>
                <input
                  type="date"
                  value={rescheduleOut}
                  onChange={(e) => setRescheduleOut(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-rose-600"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Availability will be revalidated for all allocated rooms across the new dates.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer border-none"
                >
                  {actionLoading ? 'Checking...' : 'Save Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Record Guest Payment</h3>
              <button onClick={() => setIsPaymentOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">Current Outstanding:</span>
                <span className="font-black text-rose-700 font-mono text-sm">₹{pendingAmount.toLocaleString()}</span>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={pendingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black focus:outline-rose-600"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-rose-600 bg-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Transaction Ref / ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/123456"
                  value={payTxId}
                  onChange={(e) => setPayTxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-rose-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Remarks</label>
                <input
                  type="text"
                  value={payRemark}
                  onChange={(e) => setPayRemark(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-rose-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer border-none"
                >
                  {actionLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Cancel Booking Modal */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-rose-600">Cancel Booking</h3>
              <button onClick={() => setIsCancelOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Cancelling this booking will release the allocated rooms back to the property inventory.
              </p>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please state why this booking is being cancelled..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-rose-600"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer bg-white"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer border-none"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
