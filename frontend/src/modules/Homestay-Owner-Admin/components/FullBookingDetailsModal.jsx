import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  X, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Trash2, 
  CalendarDays, 
  CreditCard, 
  Edit3, 
  Receipt, 
  FileText, 
  Ban, 
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function FullBookingDetailsModal({
  booking: initialBooking,
  isOpen,
  onClose,
  onRefresh
}) {
  const navigate = useNavigate();
  const [booking, setBooking] = useState(initialBooking || null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Sub-modal states
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

  const getAuthToken = () => {
    return localStorage.getItem('superAdminToken') || localStorage.getItem('token') || localStorage.getItem('homestayOwnerToken');
  };

  // Fetch complete authoritative booking record if needed
  useEffect(() => {
    if (!isOpen || !initialBooking) return;
    setBooking(initialBooking);

    const bId = initialBooking._id || initialBooking.dbId || initialBooking.id || initialBooking.bookingId;
    if (!bId) return;

    const fetchFullBooking = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        const res = await axios.get(getApiUrl(`/api/homestay-owner/bookings/${bId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data?.booking) {
          setBooking(res.data.booking);
        } else if (res.data) {
          setBooking(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch detailed booking, using initial:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFullBooking();
  }, [isOpen, initialBooking]);

  if (!isOpen || !booking) return null;

  const bookingMongoId = booking._id || booking.dbId || booking.id;
  const bookingCode = booking.bookingId || (bookingMongoId ? `#${String(bookingMongoId).slice(-6)}` : 'BOOKING');
  const guestName = booking.customer?.name || booking.name || booking.guestDetails?.fullName || 'Guest';
  const guestPhone = booking.customer?.mobile || booking.customer?.phone || booking.phone || '';
  const guestEmail = booking.customer?.email || booking.email || '';
  const guestInitial = guestName ? guestName.charAt(0).toUpperCase() : 'G';

  const propName = booking.propertyId?.name || booking.propertyName || booking.propertyDetails?.propertyName || 'Homestay';
  
  // Format rooms & categories
  let roomDisplay = '';
  if (booking.bookedRooms && booking.bookedRooms.length > 0) {
    const rNumbers = booking.bookedRooms.map(r => r.roomNumber).join(', ');
    const rCat = booking.bookedRooms[0]?.roomCategoryName || booking.bookedRooms[0]?.categoryName || 'Standard';
    roomDisplay = `${rNumbers} (${rCat})`;
  } else if (booking.room || booking.roomNumber) {
    roomDisplay = `${booking.room || booking.roomNumber} (${booking.roomType || 'Standard'})`;
  } else if (booking.propertyDetails?.roomNumber) {
    roomDisplay = `${booking.propertyDetails.roomNumber} (${booking.propertyDetails.roomCategory || 'Standard'})`;
  } else {
    roomDisplay = 'Room (Standard)';
  }

  // Format dates
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

  // Financial Breakdown calculations
  const baseTariff = Number(booking.pricing?.basePrice || booking.pricing?.bookingAmount || booking.pricing?.roomCost || booking.amount || 0);
  const taxesFees = Number(booking.pricing?.tax || 0);
  const addOns = Number(booking.pricing?.addOns || 0);
  const addOnsRemark = booking.pricing?.addOnsRemark || '';
  const discount = Number(booking.pricing?.discount || 0);
  const totalBill = Number(booking.pricing?.finalAmount || booking.amount || (baseTariff + taxesFees + addOns - discount));
  const paidAmount = Number(booking.pricing?.paidAmount || booking.paidAmount || 0);
  const pendingAmount = Number(
    booking.pricing?.pendingAmount !== undefined 
      ? booking.pricing.pendingAmount 
      : Math.max(0, totalBill - paidAmount)
  );

  const isHold = booking.bookingStatus === 'Hold';
  const isCancelled = booking.bookingStatus === 'Cancelled';

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
        setBooking(prev => ({ ...prev, bookingStatus: 'Confirmed' }));
        if (onRefresh) onRefresh();
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
        text: `Are you sure you want to remove hold for ${bookingCode}? The reserved dates will be released.`,
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
        onClose();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Could not remove hold.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Reschedule
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
        const updatedBooking = res.data.booking;
        setBooking(prev => ({
          ...prev,
          ...(updatedBooking || {}),
          checkInDate: rescheduleIn,
          checkOutDate: rescheduleOut
        }));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Reschedule Failed', text: err.response?.data?.message || 'Room unavailable on selected dates.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Record Payment
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
      Swal.fire('Invalid Amount', 'Please enter a valid payment amount greater than zero.', 'warning');
      return;
    }

    if (numAmt > pendingAmount) {
      Swal.fire({
        icon: 'warning',
        title: 'Overpayment Not Allowed',
        text: `Cannot collect ₹${numAmt.toLocaleString()}. The maximum collectible remaining balance is ₹${pendingAmount.toLocaleString()}.`
      });
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/payment`), {
        amount: numAmt,
        paymentMethod: payMethod,
        transactionId: payTxId,
        remark: payRemark
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: 'Payment Recorded!', timer: 1500, showConfirmButton: false });
        setIsPaymentOpen(false);
        const newPaid = paidAmount + numAmt;
        const newPending = Math.max(0, totalBill - newPaid);
        setBooking(prev => ({
          ...prev,
          paymentStatus: newPending <= 0 ? 'Paid' : 'Partial',
          pricing: {
            ...prev.pricing,
            paidAmount: newPaid,
            pendingAmount: newPending
          }
        }));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Payment Failed', text: err.response?.data?.message || 'Could not record payment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Edit Info -> Opens CreateBookingFlow in edit mode
  const handleOpenEdit = () => {
    onClose();
    navigate(`/homestay-owner/bookings/create?editId=${bookingMongoId}`);
  };

  // 6. Cancellation with mandatory reason
  const handleOpenCancel = () => {
    setCancelReason('');
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason || !cancelReason.trim()) {
      Swal.fire('Reason Required', 'Please provide a non-empty cancellation reason.', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingMongoId}/cancel`), {
        reason: cancelReason.trim()
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Cancelled',
          text: 'Booking status updated to Cancelled and room has been released.',
          timer: 1600,
          showConfirmButton: false
        });
        setIsCancelOpen(false);
        setBooking(prev => ({ ...prev, bookingStatus: 'Cancelled' }));
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Cancellation Failed', text: err.response?.data?.message || 'Could not cancel booking.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] max-w-xl w-full p-6 shadow-2xl space-y-4.5 border border-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Header Card: Avatar, Name, Phone, Direct Links, Close */}
        <div className="flex justify-between items-center bg-slate-50/80 p-3.5 rounded-2xl border border-slate-150">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 font-black text-lg flex items-center justify-center border border-rose-200/60 shadow-xs shrink-0">
              {guestInitial}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/homestay-owner/guests/${bookingMongoId || booking.bookingId || guestPhone}`);
                }}
                className="text-sm font-black text-slate-800 hover:text-rose-600 truncate tracking-tight bg-transparent border-none cursor-pointer p-0 text-left flex items-center gap-1 group"
                title="View Guest Profile & Lifetime History"
              >
                <span>{guestName}</span>
                <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500" />
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-0.5">
                <span>{guestPhone || 'No contact number'}</span>
                {guestEmail && <span className="truncate hidden sm:inline">• {guestEmail}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {guestPhone && (
              <>
                <a 
                  href={`tel:${guestPhone}`}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-xs"
                  title="Call Guest"
                >
                  <Phone size={13} className="stroke-[2.5]" />
                </a>
                <a 
                  href={`https://wa.me/${guestPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 transition-colors shadow-xs"
                  title="WhatsApp Guest"
                >
                  <MessageSquare size={13} className="stroke-[2.5]" />
                </a>
              </>
            )}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 cursor-pointer bg-white border border-slate-200 flex items-center justify-center transition-colors ml-1"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Property & Stay Schedule Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-150 space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Property & Room
            </span>
            <span className="font-black text-slate-900 block text-xs truncate">
              {propName}
            </span>
            <span className="text-[11px] font-black text-rose-600 block">
              {roomDisplay}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-150 space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Stay Schedule
            </span>
            <div className="font-bold text-slate-700 space-y-0.5 font-mono text-[11px]">
              <div>Check-in: <strong className="text-slate-900">{checkInDisplay}</strong></div>
              <div>Check-out: <strong className="text-slate-900">{checkOutDisplay}</strong></div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-150 space-y-2 text-xs">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            Financial Breakdown
          </span>

          <div className="flex justify-between text-slate-600 font-semibold">
            <span>Base Room Tariff:</span>
            <span className="font-mono font-bold text-slate-800">₹{baseTariff.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-slate-600 font-semibold">
            <span>Taxes & Fees:</span>
            <span className="font-mono font-bold text-slate-800">₹{taxesFees.toLocaleString()}</span>
          </div>

          {addOns > 0 && (
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Add-ons ({addOnsRemark || 'Extra Services'}):</span>
              <span className="font-mono font-bold text-slate-800">₹{addOns.toLocaleString()}</span>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Coupon Discount:</span>
              <span className="font-mono font-bold">-₹{discount.toLocaleString()}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-black">
            <span className="text-xs">Total Bill:</span>
            <span className="text-base font-mono">₹{totalBill.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-emerald-700 font-bold">
            <span>Paid / Collected:</span>
            <span className="font-mono">₹{paidAmount.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-rose-700 font-bold">
            <span>Balance Pending:</span>
            <span className="font-mono">₹{pendingAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment History (if any) */}
        {booking.paymentHistory && booking.paymentHistory.length > 0 && (
          <div className="border border-slate-150 p-3.5 rounded-2xl bg-white space-y-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
              Payment Transactions
            </span>
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {booking.paymentHistory.map((ph, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100 font-medium">
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

        {/* Special Requests (if any) */}
        {booking.specialRequests && (
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs">
            <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">Special Requests</span>
            <p className="text-slate-700 mt-0.5">{booking.specialRequests}</p>
          </div>
        )}

        {/* Operations & Actions matching screenshot */}
        <div className="space-y-2 pt-1 border-t border-slate-150">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
            Operations & Actions
          </span>

          {/* If Hold Booking: Confirm Booking & Remove Hold buttons */}
          {isHold && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleConfirmHold}
                disabled={actionLoading}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle size={14} className="stroke-[2.5]" />
                <span>Confirm Booking</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveHold}
                disabled={actionLoading}
                className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Remove Hold</span>
              </button>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleOpenReschedule}
              disabled={actionLoading || isCancelled}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
            >
              <CalendarDays size={13} />
              <span>Reschedule</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPayment}
              disabled={actionLoading || isCancelled}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
            >
              <CreditCard size={13} />
              <span>Record Pay</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEdit}
              disabled={actionLoading}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
            >
              <Edit3 size={13} />
              <span>Edit Info</span>
            </button>
          </div>

          {/* Document Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/homestay-owner/bookings/confirmation-slip/${bookingMongoId}`);
              }}
              className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-xs transition-colors"
            >
              <Receipt size={13} />
              <span>Slip</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/homestay-owner/bookings/quotation/${bookingMongoId}`);
              }}
              className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-xs transition-colors"
            >
              <FileText size={13} />
              <span>Quotation</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/homestay-owner/bookings/invoice/${bookingMongoId}`);
              }}
              className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-xs transition-colors"
            >
              <FileText size={13} />
              <span>Tax Invoice</span>
            </button>
          </div>

          {/* Cancel Booking Button */}
          {!isCancelled ? (
            <button
              type="button"
              onClick={handleOpenCancel}
              disabled={actionLoading}
              className="w-full py-3 mt-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Ban size={14} className="stroke-[2.5]" />
              <span>CANCEL THIS BOOKING</span>
            </button>
          ) : (
            <div className="w-full py-2.5 mt-1 bg-slate-100 text-slate-500 font-bold text-center rounded-xl text-xs border border-slate-200">
              Booking Cancelled {booking.cancellationReason ? `(${booking.cancellationReason})` : ''}
            </div>
          )}
        </div>

      </div>

      {/* RESCHEDULE SUB-MODAL */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-900">Reschedule Stay Dates</h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Check-in Date</label>
                <input
                  type="date"
                  value={rescheduleIn}
                  onChange={(e) => setRescheduleIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Check-out Date</label>
                <input
                  type="date"
                  value={rescheduleOut}
                  onChange={(e) => setRescheduleOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm Dates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT SUB-MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900">Record Payment</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                Due: ₹{pendingAmount.toLocaleString()}
              </span>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount (₹)</label>
                  <span className="text-[10px] text-slate-400 font-medium">Max: ₹{pendingAmount.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  max={pendingAmount}
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  placeholder={`Max ₹${pendingAmount}`}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Transaction Ref / ID</label>
                <input
                  type="text"
                  value={payTxId}
                  onChange={(e) => setPayTxId(e.target.value)}
                  placeholder="Optional reference"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING SUB-MODAL WITH MANDATORY REASON */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div>
              <h3 className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                <Ban size={15} />
                <span>Cancel Reservation</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Please enter a cancellation reason. The reserved room and dates will be released.
              </p>
            </div>
            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                  Cancellation Reason <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Guest requested cancellation / Emergency travel change"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold cursor-pointer border-none"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
