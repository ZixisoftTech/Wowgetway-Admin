import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';

export default function BookingRequests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  // Booking requests mock database matching screenshot exactly
  const [requests, setRequests] = useState([
    {
      id: 'BR-2505-00024',
      qtnId: 'QTN-2505-00123',
      source: 'Admin / WoW Gateways',
      sourceType: 'admin',
      guestName: 'Amit Sharma',
      phone: '+91 98765 43210',
      email: 'amit@gmail.com',
      checkIn: '20 May 2024',
      checkOut: '22 May 2024',
      roomDetails: 'Deluxe Room x 2 Rooms',
      guestsCount: '2 Adults, 1 Child',
      totalAmount: '₹ 6,720',
      advance: '₹ 2,016',
      requestedOnDate: '09 May 2024',
      requestedOnTime: '10:30 AM',
      status: 'Pending'
    },
    {
      id: 'BR-2505-00023',
      qtnId: 'QTN-2505-00122',
      source: 'Guest',
      sourceType: 'guest',
      guestName: 'Priya Singh',
      phone: '+91 87654 32109',
      email: 'priya.singh@gmail.com',
      checkIn: '18 May 2024',
      checkOut: '20 May 2024',
      roomDetails: 'Super Deluxe x 1 Room',
      guestsCount: '2 Adults',
      totalAmount: '₹ 4,200',
      advance: '₹ 1,260',
      requestedOnDate: '09 May 2024',
      requestedOnTime: '09:15 AM',
      status: 'Pending'
    },
    {
      id: 'BR-2505-00022',
      qtnId: 'QTN-2505-00121',
      source: 'Travel Agency',
      sourceType: 'agent',
      guestName: 'Travel World Pvt. Ltd.',
      phone: '+91 98123 45678',
      email: 'bookings@travelworld.com',
      checkIn: '25 May 2024',
      checkOut: '28 May 2024',
      roomDetails: 'Deluxe Room x 3 Rooms',
      guestsCount: '6 Adults, 2 Children',
      totalAmount: '₹ 12,600',
      advance: '₹ 3,780',
      requestedOnDate: '08 May 2024',
      requestedOnTime: '06:45 PM',
      status: 'Pending'
    }
  ]);

  const handleDeleteRequest = (id) => {
    if (confirm(`Are you sure you want to delete request ${id}?`)) {
      setRequests(prev => prev.filter(r => r.id !== id));
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
                        onClick={() => handleDeleteRequest(req.id)}
                        className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1 shadow-sm"
                      >
                        <Trash2 size={11} />
                        <span>Delete</span>
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
