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
  CheckCircle2, 
  FileText, 
  Receipt, 
  Printer, 
  RefreshCw, 
  ExternalLink, 
  Edit3, 
  Ban, 
  MessageSquare, 
  AlertTriangle,
  CalendarClock
} from 'lucide-react';
import FullBookingDetailsModal from '../components/FullBookingDetailsModal.jsx';

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

  // Modal open states
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Booking Details...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Booking Details Unavailable</h2>
        <p className="text-xs text-slate-500">{error || 'Could not find booking with the provided identifier.'}</p>
        <button
          onClick={() => navigate('/homestay-owner/bookings/manage')}
          className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  const bId = booking.bookingId || booking._id;
  const guestName = booking.customer?.name || booking.guestName || 'Guest';
  const guestPhone = booking.customer?.mobile || booking.customer?.phone || '';
  const guestEmail = booking.customer?.email || '';
  const propName = booking.propertyId?.name || booking.propertyDetails?.propertyName || 'Homestay Sanctuary';
  
  const totalAmount = Number(booking.pricing?.finalAmount || booking.amount || 0);
  const paidAmount = Number(booking.pricing?.paidAmount || 0);
  const pendingAmount = Number(booking.pricing?.pendingAmount !== undefined ? booking.pricing.pendingAmount : Math.max(0, totalAmount - paidAmount));
  const baseTariff = Number(booking.pricing?.bookingAmount || booking.pricing?.baseRate || (totalAmount * 0.89));
  const tax = Number(booking.pricing?.tax || Math.round(baseTariff * 0.12));
  const addOns = Number(booking.pricing?.addOns || 0);
  const discount = Number(booking.pricing?.discount || 0);

  const checkInDate = new Date(booking.checkInDate || Date.now());
  const checkOutDate = new Date(booking.checkOutDate || Date.now());
  const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                Booking Details
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                booking.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                booking.bookingStatus === 'Hold' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                booking.bookingStatus === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                'bg-slate-100 text-slate-700'
              }`}>
                {booking.bookingStatus}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-mono mt-0.5">
              {bId}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ExternalLink size={13} />
            <span>Open Fast Operations Modal</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/bookings/create?editId=${booking._id || bookingId}`)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Edit3 size={13} />
            <span>Edit In Booking Wizard</span>
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Stay, Rooms, Documents, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Guest Profile Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 font-black text-lg flex items-center justify-center border border-rose-200/80">
                {guestName.charAt(0).toUpperCase()}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => navigate(`/homestay-owner/guests/${booking._id || booking.bookingId || guestPhone}`)}
                  className="text-base font-black text-slate-900 hover:text-rose-600 flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 group"
                  title="View full guest profile and stay history"
                >
                  <span>{guestName}</span>
                  <ExternalLink size={13} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                  {guestPhone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" />
                      <span>{guestPhone}</span>
                    </span>
                  )}
                  {guestEmail && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-slate-400" />
                      <span>{guestEmail}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {guestPhone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${guestPhone}`}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1"
                >
                  <Phone size={12} />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${guestPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1"
                >
                  <MessageSquare size={12} />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          {/* Stay & Room Schedule */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-rose-600" />
              <span>Stay Schedule & Room Allocation</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-in</span>
                <span className="font-black text-slate-900 block text-sm mt-0.5 font-mono">
                  {checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">After 02:00 PM</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-out</span>
                <span className="font-black text-slate-900 block text-sm mt-0.5 font-mono">
                  {checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Before 11:00 AM</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration & Guests</span>
                <span className="font-black text-rose-600 block text-sm mt-0.5">
                  {nights} Night{nights > 1 ? 's' : ''} Stay
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {booking.guests?.adults || 2} Adults, {booking.guests?.children || 0} Children
                </span>
              </div>
            </div>

            {/* Booked Rooms Table */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-2">Allocated Units:</span>
              <div className="space-y-2">
                {(booking.bookedRooms && booking.bookedRooms.length > 0 ? booking.bookedRooms : [booking.propertyDetails]).map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-800 flex items-center justify-center font-mono">
                        {r.roomNumber || '101'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">{r.roomCategoryName || r.category || 'Standard Room'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Meal Plan: {r.mealPlan || 'EP'}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      ₹{(Number(r.roomPrice || r.price || baseTariff / nights)).toLocaleString()} / night
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Official Documents Download / Print */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-rose-600" />
              <span>Official Guest Documents</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${booking._id || bookingId}`)}
                className="p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 rounded-2xl text-left transition-all cursor-pointer group"
              >
                <Receipt size={16} className="text-rose-600 mb-2" />
                <span className="block font-bold text-xs text-slate-900 group-hover:text-rose-600">Confirmation Slip</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Booking voucher & check-in info</span>
              </button>

              <button
                onClick={() => navigate(`/homestay-owner/bookings/invoice/${booking._id || bookingId}`)}
                className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-left transition-all cursor-pointer group"
              >
                <FileText size={16} className="text-emerald-600 mb-2" />
                <span className="block font-bold text-xs text-slate-900 group-hover:text-emerald-600">Tax Invoice</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">GST itemized invoice</span>
              </button>

              <button
                onClick={() => navigate(`/homestay-owner/bookings/quotation/${booking._id || bookingId}`)}
                className="p-3.5 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-200 rounded-2xl text-left transition-all cursor-pointer group"
              >
                <Printer size={16} className="text-amber-600 mb-2" />
                <span className="block font-bold text-xs text-slate-900 group-hover:text-amber-600">Quotation</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Stay estimate & proposal</span>
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          {Array.isArray(booking.timeline) && booking.timeline.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-rose-600" />
                <span>Audit Log & Timeline</span>
              </h3>

              <div className="space-y-3">
                {booking.timeline.slice().reverse().map((t, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-3 py-0.5">
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

        {/* Right Column (1 col): Financial Ledger & Quick Actions */}
        <div className="space-y-6">
          
          {/* Financial Breakdown Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-600" />
              <span>Financial Ledger</span>
            </h3>

            <div className="space-y-2 text-xs border-b border-slate-100 pb-4">
              <div className="flex justify-between text-slate-600">
                <span>Base Tariff ({nights}N):</span>
                <span className="font-mono font-bold text-slate-800">₹{baseTariff.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & GST (12%):</span>
                <span className="font-mono font-bold text-slate-800">₹{tax.toLocaleString()}</span>
              </div>
              {addOns > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Add-ons:</span>
                  <span className="font-mono font-bold text-slate-800">+₹{addOns.toLocaleString()}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{discount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Total, Paid, Pending */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">Total Payable:</span>
                <span className="font-mono text-base font-black text-slate-900">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-600">Amount Paid:</span>
                <span className="font-mono text-xs font-black text-emerald-600">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-black text-slate-800">Balance Pending:</span>
                <span className={`font-mono text-sm font-black ${pendingAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  ₹{pendingAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <CreditCard size={14} />
                <span>Record Next Payment</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-none transition-colors"
              >
                <CalendarClock size={14} />
                <span>Reschedule Stay Dates</span>
              </button>
            </div>
          </div>

          {/* Special Requests & Notes */}
          {(booking.specialRequests || booking.notes) && (
            <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs space-y-2 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Special Requests & Notes
              </span>
              <p className="text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {booking.specialRequests || booking.notes}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Embedded Full Booking Details Modal for Quick Operations */}
      <FullBookingDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        booking={booking}
        onRefresh={fetchBooking}
      />
    </div>
  );
}
