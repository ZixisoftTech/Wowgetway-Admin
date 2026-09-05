import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft,
  Info,
  Calendar,
  User,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Printer,
  Receipt,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Maximize2
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function BookingRequestDetails() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  const fetchBookingDetails = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/homestay-owner/bookings/${requestId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data?.booking || res.data;
      if (data) {
        setBooking(data);
      } else {
        setError('Booking request not found.');
      }
    } catch (err) {
      console.error('Error loading booking request:', err);
      setError(err.response?.data?.message || 'Failed to load booking request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [requestId]);

  // Calculate stay duration
  const getNights = () => {
    if (!booking?.checkInDate || !booking?.checkOutDate) return 1;
    const start = new Date(booking.checkInDate);
    const end = new Date(booking.checkOutDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const handleConfirmSettle = async () => {
    const advAmount = Number(booking?.advancePayment?.amount || booking?.pricing?.paidAmount || 0);
    const result = await Swal.fire({
      title: 'Confirm & Settle Booking?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p>You are verifying the advance payment for booking <b>#${booking?.bookingId}</b>.</p>
          <div class="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-800 font-bold">
            Advance Amount: ₹${advAmount.toLocaleString()}
          </div>
          <p class="text-slate-500">This will mark the booking as <b>Confirmed</b> and preserve the room block on your calendar.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm & Settle',
      cancelButtonText: 'Review Later',
      confirmButtonColor: '#be123c',
      cancelButtonColor: '#64748b'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const bookingKey = booking?._id || booking?.bookingId || requestId;
      const res = await axios.patch(
        getApiUrl(`/api/homestay-owner/bookings/${bookingKey}/verify-request`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Booking Confirmed!',
          text: 'Advance payment verified and booking has been confirmed successfully.',
          confirmButtonColor: '#be123c'
        });
        navigate(`/homestay-owner/bookings/confirmation-slip/${booking?.bookingId || requestId}`);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Verification Failed',
        text: err.response?.data?.message || 'Failed to verify booking request.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    const result = await Swal.fire({
      title: 'Reject Booking Request?',
      text: 'Are you sure you want to reject this request? The room and dates will immediately be unblocked and re-opened for other guests.',
      input: 'text',
      inputPlaceholder: 'Reason for rejection (e.g., Payment screenshot invalid, UTR not received)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject & Release Dates',
      cancelButtonText: 'Keep Request',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const bookingKey = booking?._id || booking?.bookingId || requestId;
      const res = await axios.patch(
        getApiUrl(`/api/homestay-owner/bookings/${bookingKey}/reject-request`),
        { reason: result.value || 'Payment proof rejected by owner' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        await Swal.fire({
          icon: 'info',
          title: 'Request Rejected',
          text: 'Booking has been cancelled and dates have been released on the calendar.',
          confirmButtonColor: '#be123c'
        });
        navigate('/homestay-owner/bookings/requests');
      }
    } catch (err) {
      console.error('Rejection failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to reject booking request.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw size={28} className="animate-spin text-rose-700" />
        <span className="text-xs font-bold text-slate-500">Loading booking request details...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle size={36} className="text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Booking Request Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Could not find the requested booking.'}</p>
        <button
          onClick={() => navigate('/homestay-owner/bookings/requests')}
          className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold"
        >
          Back to Booking Requests
        </button>
      </div>
    );
  }

  const finalAmount = Number(booking.pricing?.finalAmount || booking.amount || 0);
  const advPaid = Number(booking.advancePayment?.amount || booking.pricing?.paidAmount || 0);
  const pendingAmt = Number(booking.pricing?.pendingAmount || Math.max(0, finalAmount - advPaid));
  const advPercentage = booking.advancePayment?.percentage 
    ? `${booking.advancePayment.percentage}%` 
    : (finalAmount > 0 ? `${Math.round((advPaid / finalAmount) * 100)}%` : '30%');
  const remPercentage = finalAmount > 0 ? `${Math.round((pendingAmt / finalAmount) * 100)}%` : '70%';

  const checkInFormatted = booking.checkInDate 
    ? new Date(booking.checkInDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) 
    : 'N/A';
  const checkOutFormatted = booking.checkOutDate 
    ? new Date(booking.checkOutDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) 
    : 'N/A';
  const requestedOnFormatted = booking.createdAt 
    ? new Date(booking.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : 'N/A';

  const paymentScreenshotUrl = booking.advancePayment?.proofUrl || booking.paymentScreenshot;
  const transactionUtr = booking.advancePayment?.transactionId || booking.paymentDetails?.transactionId;
  const isPending = booking.bookingStatus === 'Pending' || booking.bookingStatus === 'Hold';
  const isConfirmed = booking.bookingStatus === 'Confirmed';
  const isCancelled = booking.bookingStatus === 'Cancelled';

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate('/homestay-owner/bookings/requests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Booking Requests</span>
        </button>
      </div>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
              Booking Request Details
            </h1>
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg ${
              isConfirmed 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : isCancelled 
                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              {booking.bookingStatus}
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400">
            Booking Reference #{booking.bookingId} • Channel: {booking.source || 'Public Availability Link'}
          </p>
        </div>

        {/* Status quick info */}
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-bold">
              <Clock size={12} className="animate-pulse" />
              Dates Held Awaiting Approval
            </span>
          )}
          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold">
              <ShieldCheck size={12} />
              Confirmed & Calendar Blocked
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold">
              <XCircle size={12} />
              Cancelled • Dates Available
            </span>
          )}
        </div>
      </div>

      {/* Alert banner depending on state */}
      {isPending && (
        <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-[10px] font-bold flex items-start gap-3 shadow-sm">
          <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="block font-black uppercase tracking-wider">
              Pending Booking Request — Advance Payment Verification Needed
            </span>
            <p className="text-amber-700/90 font-medium leading-relaxed">
              The guest has submitted advance payment details and proof of transfer. 
              The selected rooms and dates are <b>held and blocked</b> on your availability calendar.
              Please verify the UTR / payment proof below and click <b>"Confirm & Settle Booking"</b> to confirm, 
              or <b>"Reject Request"</b> to immediately release the rooms back for other bookings.
            </p>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-[10px] font-bold flex items-start gap-3 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="block font-black uppercase tracking-wider">
              Booking Request Verified & Confirmed
            </span>
            <p className="text-emerald-700/90 font-medium leading-relaxed">
              This booking is active and confirmed. The advance payment has been recorded and room dates are locked.
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-[10px] font-bold flex items-start gap-3 shadow-sm">
          <XCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="block font-black uppercase tracking-wider">
              Booking Request Rejected / Cancelled
            </span>
            <p className="text-rose-700/90 font-medium leading-relaxed">
              This request was cancelled. The room inventory and calendar dates are completely free and available.
            </p>
          </div>
        </div>
      )}

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column (Info sheets) */}
        <div className="space-y-6">
          
          {/* Booking Information */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <FileText size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Booking Information</span>
              <span className={`ml-auto px-2.5 py-1 text-[8px] font-black uppercase rounded-lg ${
                isConfirmed ? 'bg-emerald-50 text-emerald-600' : isCancelled ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {booking.bookingStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Booking ID</span>
                <span className="text-slate-800 font-extrabold block mt-1 font-mono">{booking.bookingId}</span>
                {transactionUtr && (
                  <span className="text-[8px] text-rose-700 font-bold block mt-0.5 font-mono">
                    UTR: {transactionUtr}
                  </span>
                )}
              </div>
              
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Channel / Source</span>
                <span className="text-rose-700 font-black block mt-1">
                  {booking.source || 'Public Link'}
                </span>
                <span className="text-[8px] text-slate-400 font-bold block mt-0.5 uppercase">
                  Mode: {booking.bookingMode || booking.bookingType || 'Guest'}
                </span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Requested On</span>
                <span className="text-slate-800 font-extrabold block mt-1">{requestedOnFormatted}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Requested By</span>
                <span className="text-slate-800 font-extrabold block mt-1">
                  {booking.customer?.name || 'Direct Guest'}
                </span>
              </div>
            </div>
          </div>

          {/* Guest Details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <User size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Guest Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Guest Name</span>
                <span className="text-slate-800 font-extrabold block mt-1">{booking.customer?.name || 'N/A'}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Mobile Number</span>
                <span className="text-slate-800 font-extrabold block mt-1">{booking.customer?.mobile || 'N/A'}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Email Address</span>
                <span className="text-slate-800 font-extrabold block mt-1 truncate">{booking.customer?.email || 'N/A'}</span>
              </div>
            </div>

            {booking.customer?.city && (
              <div className="pt-2 border-t border-slate-50">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Location / City</span>
                <span className="text-slate-700 font-bold block mt-0.5">{booking.customer.city}</span>
              </div>
            )}
          </div>

          {/* Stay Details */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <Calendar size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Stay & Room Details</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500 pb-3 border-b border-slate-50">
              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-In</span>
                <span className="text-slate-800 font-extrabold block mt-1">{checkInFormatted}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-Out</span>
                <span className="text-slate-800 font-extrabold block mt-1">{checkOutFormatted}</span>
              </div>

              <div>
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Duration</span>
                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black uppercase rounded mt-1.5 inline-block">
                  {getNights()} {getNights() === 1 ? 'Night' : 'Nights'}
                </span>
              </div>
            </div>

            {/* Booked Rooms List */}
            <div className="space-y-2">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Booked Rooms</span>
              <div className="space-y-2">
                {booking.bookedRooms?.map((room, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800 block">
                        Room {room.roomNumber} • {room.categoryName || 'Standard Room'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                        {room.adults || 2} Adults{room.child5_9 > 0 ? `, ${room.child5_9} ${room.child5_9 === 1 ? 'Child' : 'Children'} (5-9y)` : ''}{room.child0_4 > 0 ? `, ${room.child0_4} Infant` : ''}{room.extraBed ? ` + 1 Extra Bed` : ''}
                      </span>
                    </div>
                    {room.mealPlan && (
                      <span className="px-2 py-1 bg-white text-rose-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase">
                        {room.mealPlan}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Payment Sheet & Proof) */}
        <div className="space-y-6">
          
          {/* Payment Summary */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <DollarSign size={16} className="text-rose-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Breakdown</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <span className="block text-[7px] font-black text-slate-400 uppercase">Total Amount</span>
                <span className="text-xs font-black text-slate-800 block mt-1 font-mono">
                  ₹ {finalAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                <span className="block text-[7px] font-black text-emerald-800 uppercase">Advance Paid</span>
                <span className="text-xs font-black text-emerald-700 block mt-1 font-mono">
                  ₹ {advPaid.toLocaleString()}
                </span>
                <span className="text-[7px] text-emerald-600 font-bold">({advPercentage})</span>
              </div>

              <div className="p-3 bg-rose-50/40 border border-rose-200 rounded-xl">
                <span className="block text-[7px] font-black text-rose-800 uppercase">Remaining Due</span>
                <span className="text-xs font-black text-rose-700 block mt-1 font-mono">
                  ₹ {pendingAmt.toLocaleString()}
                </span>
                <span className="text-[7px] text-rose-500 font-bold">({remPercentage})</span>
              </div>

              <div className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl flex flex-col justify-center items-center">
                <span className="block text-[7px] font-black text-amber-800 uppercase">Payment Status</span>
                <span className="text-[9px] font-black text-amber-600 block mt-1">
                  {booking.paymentStatus || 'Pending'}
                </span>
                <span className="text-[7px] text-amber-500 font-bold">
                  {isConfirmed ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>

            {/* Transaction / UTR Info Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                  Transaction Reference (UTR / UPI Ref)
                </span>
                <span className="text-xs font-black text-slate-800 font-mono select-all">
                  {transactionUtr || 'No UTR provided'}
                </span>
              </div>
              <span className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg self-start sm:self-center ${
                transactionUtr ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {transactionUtr ? 'UTR Captured' : 'Missing'}
              </span>
            </div>
          </div>

          {/* Payment Proof (Advance Paid Screenshot) Card */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-rose-700" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Payment Proof Screenshot
                </span>
              </div>
              {paymentScreenshotUrl && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="text-[9px] font-bold text-rose-700 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  <Maximize2 size={11} />
                  <span>Enlarge Preview</span>
                </button>
              )}
            </div>

            {paymentScreenshotUrl ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-2.5 space-y-2">
                <div 
                  onClick={() => setShowImageModal(true)}
                  className="h-64 rounded-xl overflow-hidden shadow-inner bg-slate-900/5 border border-slate-200 relative group cursor-pointer flex items-center justify-center"
                >
                  <img 
                    src={paymentScreenshotUrl} 
                    alt="Payment Proof Screenshot" 
                    className="w-full h-full object-contain transition group-hover:scale-[1.02]" 
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                    <Maximize2 size={16} />
                    <span>Click to Zoom</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-1.5 pt-1">
                  <span className="text-[9px] font-bold text-slate-500 font-mono truncate max-w-[200px]">
                    Uploaded by Guest / Agent
                  </span>
                  <a 
                    href={paymentScreenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-black text-rose-700 uppercase tracking-wider hover:underline flex items-center gap-1"
                  >
                    <span>Open Full Image</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
                <AlertTriangle size={24} className="text-amber-400 mx-auto" />
                <span className="block text-xs font-bold text-slate-600">No Payment Screenshot Uploaded</span>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  The guest did not attach a payment screenshot. Please verify via bank statement or UTR directly.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Action panel at the bottom */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left generate PDF / documents buttons */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate(`/homestay-owner/bookings/quotation/${booking.bookingId || requestId}`)}
            className="flex-1 md:flex-none px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FileText size={13} className="text-slate-400" />
            <span>Generate Quotation</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${booking.bookingId || requestId}`)}
            className="flex-1 md:flex-none px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer size={13} className="text-slate-400" />
            <span>Generate Slip</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/bookings/invoice/${booking.bookingId || requestId}`)}
            className="flex-1 md:flex-none px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Receipt size={13} className="text-rose-600" />
            <span>Tax Invoice</span>
          </button>
        </div>

        {/* Right Cancel/Confirm buttons */}
        <div className="flex gap-2.5 w-full md:w-auto">
          {isPending && (
            <>
              <button
                disabled={actionLoading}
                onClick={handleCancelRequest}
                className="flex-1 md:flex-none px-5 py-3 border border-rose-600 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={14} />
                <span>{actionLoading ? 'Processing...' : 'Reject Request'}</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={handleConfirmSettle}
                className="flex-1 md:flex-none px-5 py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>{actionLoading ? 'Processing...' : 'Confirm & Settle Booking'}</span>
              </button>
            </>
          )}

          {isConfirmed && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold">
              <CheckCircle2 size={14} />
              <span>Booking already confirmed</span>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold">
              <XCircle size={14} />
              <span>Booking Request Cancelled</span>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {showImageModal && paymentScreenshotUrl && (
        <div 
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-slate-800">Payment Screenshot Preview</span>
                <span className="text-[9px] font-mono text-slate-400 block">UTR: {transactionUtr || 'N/A'}</span>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-800 text-xs font-bold rounded-lg border border-slate-200"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-auto max-h-[75vh] p-2 flex items-center justify-center bg-slate-950/5">
              <img 
                src={paymentScreenshotUrl} 
                alt="Enlarged Payment Screenshot" 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
