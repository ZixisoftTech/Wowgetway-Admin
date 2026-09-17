import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  XCircle, 
  Calendar, 
  Edit, 
  MessageSquare, 
  Users, 
  Baby, 
  Home, 
  DollarSign, 
  CheckCircle,
  FileText,
  Clock,
  Printer,
  Save,
  RefreshCw,
  Award,
  History,
  Phone,
  Eye,
  CheckCircle2,
  Building2
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function GuestDetails() {
  const navigate = useNavigate();
  const { guestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Guest & booking details state
  const [guest, setGuest] = useState({
    id: guestId || 'HB4243',
    dbId: '',
    name: 'Priya Mehta',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    phone: '+91 9876543210',
    email: '',
    adults: 2,
    child5_9: 1,
    child0_4: 0,
    rooms: [{ name: 'Deluxe Room', type: 'Standard Room', number: '203' }],
    checkInDate: 'Apr 20, 2026',
    checkInTime: '02:00 PM',
    checkOutDate: 'Apr 23, 2026',
    checkOutTime: '11:00 AM',
    totalAmount: '₹ 8,700',
    totalAmountRaw: 8700,
    advanceReceived: '₹ 7,000',
    advanceReceivedRaw: 7000,
    totalDue: '₹ 1,700',
    totalDueRaw: 1700,
    bookingStatus: 'Confirmed',
    propertyName: 'Panchpokhari Homestay'
  });

  const [guestProfile, setGuestProfile] = useState({
    name: 'Priya Mehta',
    phone: '+91 9876543210',
    email: '',
    repeatGuest: false,
    totalLifetimeSpend: 8700,
    lifetimeBookings: 1,
    completedStays: 0,
    cancelledStays: 0
  });

  const [bookingHistory, setBookingHistory] = useState([]);
  const [note, setNote] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    fetchGuestData();
  }, [guestId]);

  const fetchGuestData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl(`/api/homestay-owner/guests/${guestId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        const b = res.data.currentBooking;
        const gp = res.data.guestProfile;
        const hist = res.data.history || [];

        const totalAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const paidAmt = Number(b.pricing?.paidAmount || 0);
        const pendAmt = b.pricing?.pendingAmount !== undefined ? Number(b.pricing.pendingAmount) : Math.max(0, totalAmt - paidAmt);

        const checkInD = new Date(b.checkInDate || Date.now());
        const checkOutD = new Date(b.checkOutDate || Date.now());

        const roomsArr = b.bookedRooms && b.bookedRooms.length > 0 
          ? b.bookedRooms.map(r => ({
              name: r.roomType || 'Deluxe Room',
              type: 'Allocated Unit',
              number: r.roomNumber || '101'
            }))
          : [{
              name: b.propertyDetails?.roomType || 'Deluxe Room',
              type: 'Allocated Unit',
              number: b.propertyDetails?.roomNumber || '101'
            }];

        setGuest({
          id: b.bookingId || String(b._id),
          dbId: String(b._id),
          name: gp?.name || b.customer?.name || 'Guest',
          photo: gp?.photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
          phone: gp?.phone || b.customer?.mobile || b.customer?.phone || '',
          email: gp?.email || b.customer?.email || '',
          adults: b.guests?.adults || b.occupancy?.adults || 2,
          child5_9: b.guests?.children || b.occupancy?.children5To9 || 0,
          child0_4: b.guests?.infants || b.occupancy?.infants || 0,
          rooms: roomsArr,
          checkInDate: checkInD.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          checkInTime: checkInD.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          checkOutDate: checkOutD.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          checkOutTime: checkOutD.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          totalAmount: `₹ ${totalAmt.toLocaleString()}`,
          totalAmountRaw: totalAmt,
          advanceReceived: `₹ ${paidAmt.toLocaleString()}`,
          advanceReceivedRaw: paidAmt,
          totalDue: `₹ ${pendAmt.toLocaleString()}`,
          totalDueRaw: pendAmt,
          bookingStatus: b.bookingStatus || 'Confirmed',
          propertyName: b.propertyId?.name || b.propertyDetails?.propertyName || 'Homestay Sanctuary'
        });

        if (gp) {
          setGuestProfile(gp);
        }

        setBookingHistory(hist);
        setNote(b.specialRequests || b.notes || '');
      }
    } catch (err) {
      console.error('Failed to load guest data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    try {
      setSavingNote(true);
      const token = getAuthToken();
      await axios.patch(getApiUrl(`/api/homestay-owner/guests/${guestId}/notes`), {
        note: note.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancelBooking = () => {
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    try {
      setActionLoading(true);
      const token = getAuthToken();
      const targetId = guest.dbId || guest.id;
      await axios.post(getApiUrl(`/api/homestay-owner/bookings/${targetId}/cancel`), {
        reason: 'Cancelled by Host via Guest Details'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsCancelModalOpen(false);
      alert('Booking cancelled successfully!');
      fetchGuestData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectBalance = async () => {
    if (guest.totalDueRaw <= 0) {
      alert('Balance is already fully settled for this booking!');
      return;
    }

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const targetId = guest.dbId || guest.id;
      await axios.post(getApiUrl(`/api/homestay-owner/bookings/${targetId}/payment`), {
        amount: guest.totalDueRaw,
        paymentMethod: 'Cash / UPI Settlement',
        remark: 'Settled at Check-in / Property'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Balance collected and recorded successfully!');
      fetchGuestData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record balance collection.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOutGuest = async () => {
    try {
      setActionLoading(true);
      const token = getAuthToken();
      const targetId = guest.dbId || guest.id;
      await axios.post(getApiUrl(`/api/homestay-owner/bookings/${targetId}/checkout`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Guest ${guest.name} checked out successfully!`);
      fetchGuestData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to check out guest.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={24} className="animate-spin text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Loading guest profile & booking history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
      {/* Top Header Card */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate('/homestay-owner/guests')}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back to Guests</span>
        </button>
        <span>/</span>
        <span>Dashboard</span>
        <span>/</span>
        <span>Guest Details & Summary</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">{guest.name}</span>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-4.5">
          <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-rose-100 shadow-sm flex-shrink-0">
            <img src={guest.photo} alt={guest.name} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 leading-none">{guest.name}</h2>
              {guestProfile.repeatGuest && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-black uppercase rounded-full flex items-center gap-1">
                  <Award size={10} />
                  <span>Repeat Guest</span>
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                guest.bookingStatus === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                guest.bookingStatus === 'Checked Out' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {guest.bookingStatus}
              </span>
            </div>

            <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono">
              Active Booking: #{guest.id} • {guest.propertyName}
            </span>

            <div className="flex flex-wrap items-center gap-3 mt-1">
              {guest.phone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 font-mono font-extrabold">{guest.phone}</span>
                  <a 
                    href={`https://wa.me/${guest.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="w-5.5 h-5.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare size={10} className="stroke-[3]" />
                  </a>
                  <a 
                    href={`tel:${guest.phone}`}
                    className="w-5.5 h-5.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full flex items-center justify-center transition-colors"
                    title="Call Guest"
                  >
                    <Phone size={10} className="stroke-[3]" />
                  </a>
                </div>
              )}
              {guest.email && (
                <span className="text-[10px] text-slate-400 font-medium">✉️ {guest.email}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {guest.bookingStatus !== 'Cancelled' && guest.bookingStatus !== 'Checked Out' && (
            <button
              onClick={handleCancelBooking}
              className="flex-1 md:flex-none px-4 py-2.5 border border-rose-600 hover:bg-rose-50/20 text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <XCircle size={13} />
              <span>Cancel Booking</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/homestay-owner/bookings/invoice/${guest.dbId || guest.id}`)}
            className="flex-1 md:flex-none px-4 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Printer size={13} className="text-slate-400" />
            <span>Tax Invoice</span>
          </button>

          <button
            onClick={() => navigate(`/homestay-owner/bookings/quotation/${guest.dbId || guest.id}`)}
            className="w-full md:w-auto px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Eye size={13} />
            <span>View Quotation</span>
          </button>
        </div>
      </div>

      {/* LIFETIME GUEST SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1.5">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Lifetime Bookings</span>
          <span className="text-2xl font-black text-slate-800 leading-none block">{guestProfile.lifetimeBookings}</span>
          <span className="text-[9px] text-slate-400 font-semibold block">Across All Homestays</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1.5">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Completed Stays</span>
          <span className="text-2xl font-black text-emerald-600 leading-none block">{guestProfile.completedStays}</span>
          <span className="text-[9px] text-slate-400 font-semibold block">Past Visits Fulfilled</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1.5">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Cancelled Reservations</span>
          <span className="text-2xl font-black text-rose-600 leading-none block">{guestProfile.cancelledStays}</span>
          <span className="text-[9px] text-slate-400 font-semibold block">Stays Voided</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1.5">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Lifetime Spend</span>
          <span className="text-2xl font-black text-rose-700 leading-none block font-mono">
            ₹ {guestProfile.totalLifetimeSpend.toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold block">Total Revenue Earned</span>
        </div>
      </div>

      {/* Current Stay Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5.5">
        {/* Total Adults */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-rose-700 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Adults</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">10+ Years</span>
            <span className="text-3xl font-black text-rose-700 leading-none block">{guest.adults}</span>
          </div>
        </div>

        {/* Total Child 5-9 */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Baby size={16} className="text-amber-500 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Child</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">5-9 Years</span>
            <span className="text-3xl font-black text-amber-500 leading-none block">{guest.child5_9}</span>
          </div>
        </div>

        {/* Total Child 0-4 */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Baby size={16} className="text-emerald-500 stroke-[2.2]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Infants</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block leading-none">0-4 Years</span>
            <span className="text-3xl font-black text-emerald-500 leading-none block">{guest.child0_4}</span>
          </div>
        </div>

        {/* Room Details list */}
        <div className="lg:col-span-3 bg-white border border-slate-100 p-5.5 rounded-2xl shadow-sm space-y-4.5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Room Details</span>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[8px] font-black uppercase rounded">
              Rooms: {guest.rooms.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {guest.rooms.map((room, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                <div className="flex items-center gap-2">
                  <Home size={13} className="text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-black text-slate-800 leading-none">{room.name}</span>
                    <span className="block text-[8px] text-slate-400 font-bold">{room.type}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-800 font-mono">{room.number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Check-In / Out Details & Payment row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5.5 items-start">
        {/* Check in / Check out */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-5.5">
          {/* Check-in */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Calendar size={14} className="text-rose-700" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-In</span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800 block">{guest.checkInDate}</span>
              <span className="text-[10px] font-semibold text-slate-400 block font-mono">⏰ {guest.checkInTime}</span>
            </div>
          </div>

          {/* Check-out */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4.5">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <Calendar size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-Out</span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-black text-slate-800 block">{guest.checkOutDate}</span>
              <span className="text-[10px] font-semibold text-slate-400 block font-mono">⏰ {guest.checkOutTime}</span>
            </div>
          </div>
        </div>

        {/* Payment details grid */}
        <div className="lg:col-span-6 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5.5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <DollarSign size={14} className="text-rose-700" />
            <span>Active Stay Billing</span>
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Amount</span>
              <span className="text-sm font-black text-slate-707 block mt-1.5 leading-none font-mono">{guest.totalAmount}</span>
            </div>
            <div className="p-3 bg-emerald-50/20 border border-emerald-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Advance Paid</span>
              <span className="text-sm font-black text-emerald-600 block mt-1.5 leading-none font-mono">{guest.advanceReceived}</span>
            </div>
            <div className="p-3 bg-rose-50/20 border border-rose-150 rounded-xl text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Due</span>
              <span className="text-sm font-black text-rose-700 block mt-1.5 leading-none font-mono">{guest.totalDue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Comments card */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <FileText size={14} className="text-slate-400" />
            <span>Guest Preferences & Special Requests Notes</span>
          </h3>
          {noteSuccess && (
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Note saved to booking!</span>
            </span>
          )}
        </div>

        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the guest's stay preferences, room requirements, or special requests..."
          className="w-full px-4 py-3 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none focus:border-rose-500"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSaveNote}
            disabled={savingNote}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
          >
            {savingNote ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC COMPONENT 2: GUEST BOOKING HISTORY & LIFETIME SUMMARY TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <History size={16} className="text-rose-700 stroke-[2.2]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Guest All Booking History & Summary
            </h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase">
            Total {bookingHistory.length} Reservation{bookingHistory.length > 1 ? 's' : ''} on record
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="py-3 px-4.5">Booking Ref</th>
                <th className="py-3 px-4.5">Homestay Property</th>
                <th className="py-3 px-4.5">Stay Period</th>
                <th className="py-3 px-4.5">Room(s)</th>
                <th className="py-3 px-4.5 text-right">Total Amount</th>
                <th className="py-3 px-4.5 text-right">Paid</th>
                <th className="py-3 px-4.5 text-right">Pending</th>
                <th className="py-3 px-4.5 text-center">Status</th>
                <th className="py-3 px-4.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {bookingHistory.map((hb) => (
                <tr key={hb.dbId || hb.id} className={`hover:bg-slate-50/30 transition-colors ${hb.isCurrent ? 'bg-rose-50/15' : ''}`}>
                  <td className="py-4 px-4.5">
                    <span className="font-mono font-black text-slate-800 block">#{hb.id}</span>
                    {hb.isCurrent && (
                      <span className="text-[8px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.2 rounded uppercase inline-block mt-0.5">
                        Viewing Now
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4.5 font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-slate-400" />
                      <span>{hb.propertyName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4.5">
                    <span className="block font-extrabold text-slate-800">{hb.checkIn} → {hb.checkOut}</span>
                    <span className="block text-[8px] text-slate-400 mt-0.5">Booked on {hb.createdAt}</span>
                  </td>
                  <td className="py-4 px-4.5 font-bold text-slate-600">{hb.rooms}</td>
                  <td className="py-4 px-4.5 text-right font-mono font-bold text-slate-800">
                    ₹ {hb.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4.5 text-right font-mono text-emerald-600 font-bold">
                    ₹ {hb.paidAmount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4.5 text-right font-mono text-rose-700 font-bold">
                    ₹ {hb.pendingAmount.toLocaleString()}
                  </td>
                  <td className="py-4 px-4.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      hb.bookingStatus === 'Cancelled' ? 'bg-rose-50 text-rose-700' :
                      hb.bookingStatus === 'Checked Out' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {hb.bookingStatus}
                    </span>
                  </td>
                  <td className="py-4 px-4.5 text-center">
                    {!hb.isCurrent ? (
                      <button
                        onClick={() => navigate(`/homestay-owner/guests/${hb.dbId || hb.id}`)}
                        className="px-2.5 py-1 bg-white border border-slate-205 hover:bg-slate-50 text-slate-707 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-all"
                        title="View this stay details"
                      >
                        Switch Stay
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Actions Row */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-wrap gap-2.5">
        <button
          onClick={handleCollectBalance}
          disabled={actionLoading || guest.totalDueRaw <= 0}
          className="px-5 py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
        >
          <CheckCircle size={13} />
          <span>{guest.totalDueRaw > 0 ? `Collect Balance (${guest.totalDue})` : 'Balance Fully Paid'}</span>
        </button>
        
        {guest.bookingStatus !== 'Checked Out' && guest.bookingStatus !== 'Cancelled' && (
          <button
            onClick={handleCheckOutGuest}
            disabled={actionLoading}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 transition-all"
          >
            <XCircle size={13} />
            <span>Check Out Guest</span>
          </button>
        )}

        <button
          onClick={() => navigate(`/homestay-owner/bookings/invoice/${guest.dbId || guest.id}`)}
          className="px-5 py-3 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5 transition-all"
        >
          <Printer size={13} className="text-slate-400" />
          <span>Print Receipt / Invoice</span>
        </button>
      </div>

      {/* Cancel Booking Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cancel Booking</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Are you sure you want to cancel booking #{guest.id} for guest {guest.name}? This action will mark the booking as cancelled and release room allocation.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

