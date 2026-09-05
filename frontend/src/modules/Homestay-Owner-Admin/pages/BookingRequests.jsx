import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  FileText,
  User,
  Briefcase,
  Layers,
  ChevronDown,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  XCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function BookingRequests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get(getApiUrl('/api/homestay-owner/bookings?status=all'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.bookings) {
        // Filter pending / hold requests
        const pendingBookings = res.data.bookings.filter(b => b.bookingStatus === 'Pending' || b.bookingStatus === 'Hold');
        
        const mapped = pendingBookings.map(b => {
          const checkInStr = b.checkInDate ? new Date(b.checkInDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          const checkOutStr = b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          const reqDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
          const reqTime = b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          const isAgent = b.bookingMode === 'Travel Agent' || (b.bookingType && b.bookingType.toLowerCase().includes('agent'));
          const isDirect = b.source === 'Public Availability Booking Link' || b.source === 'Public Availability Link';

          const totAdults = b.guests?.adults || b.bookedRooms?.reduce((acc, r) => acc + (Number(r.adults) || 2), 0) || 2;
          const totChildren = (b.guests?.children !== undefined && b.guests.children > 0)
            ? b.guests.children 
            : (b.bookedRooms?.reduce((acc, r) => acc + (Number(r.child5_9) || 0) + (Number(r.child0_4) || 0), 0) || 0);
          const guestsText = `${totAdults} Adults${totChildren > 0 ? `, ${totChildren} Child` : ''}`;

          return {
            id: b.bookingId,
            dbId: b._id,
            qtnId: b.advancePayment?.transactionId ? `UTR: ${b.advancePayment.transactionId}` : `ID: ${b.bookingId}`,
            source: isDirect ? (isAgent ? 'Travel Agent (Link)' : 'Guest (Public Link)') : (b.source || 'Direct Website'),
            sourceType: isAgent ? 'agent' : 'guest',
            guestName: b.customer?.name || 'Guest',
            phone: b.customer?.mobile || '',
            email: b.customer?.email || '',
            checkIn: checkInStr,
            checkOut: checkOutStr,
            roomDetails: b.bookedRooms?.length ? b.bookedRooms.map(r => `Room ${r.roomNumber} (${r.categoryName || 'Standard'})`).join(', ') : 'Standard Room',
            guestsCount: guestsText,
            totalAmount: `₹ ${Number(b.pricing?.finalAmount || b.amount || 0).toLocaleString()}`,
            advance: `₹ ${Number(b.advancePayment?.amount || b.pricing?.paidAmount || 0).toLocaleString()}`,
            requestedOnDate: reqDate,
            requestedOnTime: reqTime,
            status: b.bookingStatus,
            paymentProof: b.advancePayment?.proofUrl || b.paymentScreenshot || ''
          };
        });

        setRequests(mapped);
      }
    } catch (err) {
      console.error('Failed to load booking requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRejectRequest = async (id, dbId) => {
    const result = await Swal.fire({
      title: `Reject Request #${id}?`,
      text: 'This will cancel the booking request and release the dates on your availability calendar immediately.',
      input: 'text',
      inputPlaceholder: 'Reason for rejection (e.g., Invalid payment screenshot)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reject Request',
      cancelButtonText: 'Keep Request',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!result.isConfirmed) return;

    try {
      const token = getAuthToken();
      const res = await axios.patch(
        getApiUrl(`/api/homestay-owner/bookings/${dbId || id}/reject-request`),
        { reason: result.value || 'Payment proof rejected by owner' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        Swal.fire({
          icon: 'info',
          title: 'Request Rejected',
          text: 'The booking was cancelled and the dates have been reopened on the calendar.',
          confirmButtonColor: '#be123c'
        });
        fetchRequests();
      }
    } catch (err) {
      console.error('Failed to reject request:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to reject booking request.'
      });
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'all') return true;
    return r.sourceType === activeTab;
  });

  return (
    <div className="space-y-6 font-sans pb-12 select-none">
      
      {/* Top Breadcrumb */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <button 
          onClick={() => navigate(-1)}
          className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
        >
          <ArrowLeft size={10} className="stroke-[3]" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span>Dashboard</span>
        <span>/</span>
        <span>My Homestays</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Booking Requests</span>
      </div>

      {/* Header Title Section */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Booking Requests</h1>
          <p className="text-[10px] font-bold text-slate-400">
            All pending booking requests from guests and travel agencies
          </p>
        </div>

        <button 
          onClick={() => alert('Refreshing lists...')}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw size={12} className="text-slate-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Requests */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Requests</span>
            <span className="text-xl font-black text-slate-800 leading-none block">24</span>
            <span className="text-[8px] text-slate-400 font-semibold block leading-none mt-0.5">Pending Requests</span>
          </div>
        </div>

        {/* Card 2: From Admin */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">From Admin</span>
            <span className="text-xl font-black text-slate-800 leading-none block">8</span>
            <span className="text-[8px] text-slate-400 font-semibold block leading-none mt-0.5">Requests</span>
          </div>
        </div>

        {/* Card 3: From Guests */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <User size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">From Guests</span>
            <span className="text-xl font-black text-slate-800 leading-none block">10</span>
            <span className="text-[8px] text-slate-400 font-semibold block leading-none mt-0.5">Requests</span>
          </div>
        </div>

        {/* Card 4: From Travel Agencies */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Travel Agencies</span>
            <span className="text-xl font-black text-slate-800 leading-none block">6</span>
            <span className="text-[8px] text-slate-400 font-semibold block leading-none mt-0.5">Requests</span>
          </div>
        </div>
      </div>

      {/* TABS SEGMENT */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border-none cursor-pointer transition-all ${
            activeTab === 'all' ? 'bg-rose-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          All Requests (24)
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border-none cursor-pointer transition-all ${
            activeTab === 'admin' ? 'bg-rose-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          From Admin / WoW Gateways (8)
        </button>
        <button
          onClick={() => setActiveTab('guest')}
          className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border-none cursor-pointer transition-all ${
            activeTab === 'guest' ? 'bg-rose-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          From Guests (10)
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border-none cursor-pointer transition-all ${
            activeTab === 'agent' ? 'bg-rose-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          From Travel Agencies (6)
        </button>
      </div>

      {/* FILTER & SORT ACTION BAR */}
      <div className="flex justify-end gap-3 items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-1.5 border border-slate-205 rounded-xl px-3.5 py-2 bg-white">
          <span>Sort by:</span>
          <select className="font-bold text-slate-800 focus:outline-none border-none cursor-pointer text-[10px] p-0">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <button className="px-4 py-2 border border-slate-205 hover:bg-slate-50 rounded-xl cursor-pointer bg-white flex items-center gap-1">
          <Filter size={11} className="text-slate-400" />
          <span>Filter</span>
        </button>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="py-4.5 px-6">Booking ID</th>
                <th className="py-4.5 px-6">Source</th>
                <th className="py-4.5 px-6">Guest / Agency Details</th>
                <th className="py-4.5 px-6">Check-in / Check-out</th>
                <th className="py-4.5 px-6">Rooms & Guests</th>
                <th className="py-4.5 px-6">Amount</th>
                <th className="py-4.5 px-6">Requested On</th>
                <th className="py-4.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/10">
                  <td className="py-5 px-6">
                    <span className="block font-black text-slate-800">{req.id}</span>
                    <span className="block text-[8px] text-slate-400 font-mono mt-0.5 leading-none">ID: {req.qtnId}</span>
                  </td>
                  
                  <td className="py-5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      req.sourceType === 'admin' 
                        ? 'bg-sky-50 text-sky-700' 
                        : req.sourceType === 'guest' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {req.source}
                    </span>
                  </td>

                  <td className="py-5 px-6">
                    <span className="block font-black text-slate-800">{req.guestName}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 leading-none">{req.phone}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 leading-none">{req.email}</span>
                  </td>

                  <td className="py-5 px-6">
                    <span className="block font-black text-slate-800">📅 {req.checkIn}</span>
                    <span className="block text-slate-400 font-bold mt-0.5 text-[10px]">↓ {req.checkOut}</span>
                  </td>

                  <td className="py-5 px-6">
                    <span className="block font-extrabold text-slate-800">{req.roomDetails}</span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 leading-none">{req.guestsCount}</span>
                  </td>

                  <td className="py-5 px-6">
                    <span className="block font-black text-slate-800">{req.totalAmount}</span>
                    <span className="block text-[8px] text-rose-700 font-bold mt-0.5 leading-none">Advance: {req.advance}</span>
                  </td>

                  <td className="py-5 px-6">
                    <span className="block font-black text-slate-800">{req.requestedOnDate}</span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-0.5 leading-none">{req.requestedOnTime}</span>
                  </td>

                  <td className="py-5 px-6 text-center">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      <button
                        onClick={() => navigate(`/homestay-owner/bookings/requests/${req.id}`)}
                        className="px-3.5 py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1 shadow-sm"
                      >
                        <Eye size={11} className="text-slate-400" />
                        <span>View</span>
                      </button>
                      
                      <button
                        onClick={() => handleRejectRequest(req.id, req.dbId)}
                        className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1 shadow-sm"
                      >
                        <XCircle size={11} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
