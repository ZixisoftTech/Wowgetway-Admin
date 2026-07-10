import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Download,
  Phone,
  MessageSquare,
  Trash2,
  Users,
  XCircle,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus
} from 'lucide-react';

export default function GuestListing() {
  const navigate = useNavigate();
  
  // State for active filter tab: 'month', 'year', 'custom'
  const [filterTab, setFilterTab] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('May');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Confirmation modal state
  const [deleteBookingId, setDeleteBookingId] = useState(null);

  // Mock guest bookings database matching the screenshot exactly
  const [bookings, setBookings] = useState([
    {
      id: 'HB5243',
      bookingDate: 'May 20, 2024',
      bookingTime: '10:30 AM',
      guestName: 'Priya Mehta',
      phone: '+91 9876543210',
      roomNo: 'Room 203',
      totalDue: '₹ 4,500',
      dueDate: 'Due on May 23, 2024'
    },
    {
      id: 'HB5180',
      bookingDate: 'May 18, 2024',
      bookingTime: '02:15 PM',
      guestName: 'Rahul Sharma',
      phone: '+91 9876541234',
      roomNo: 'Room 101',
      totalDue: '₹ 3,200',
      dueDate: 'Due on May 20, 2024'
    },
    {
      id: 'HB5175',
      bookingDate: 'May 17, 2024',
      bookingTime: '11:45 AM',
      guestName: 'Ankit Verma',
      phone: '+91 9876509876',
      roomNo: 'Room 105',
      totalDue: '₹ 2,800',
      dueDate: 'Due on May 18, 2024'
    },
    {
      id: 'HB5159',
      bookingDate: 'May 15, 2024',
      bookingTime: '03:20 PM',
      guestName: 'Jyoti Singh',
      phone: '+91 9876512345',
      roomNo: 'Room 102',
      totalDue: '₹ 1,600',
      dueDate: 'Due on May 14, 2024'
    },
    {
      id: 'HB5121',
      bookingDate: 'May 14, 2024',
      bookingTime: '09:10 AM',
      guestName: 'Neha Gupta',
      phone: '+91 9876521234',
      roomNo: 'Room 202',
      totalDue: '₹ 3,750',
      dueDate: 'Due on May 11, 2024'
    },
    {
      id: 'HB5073',
      bookingDate: 'May 12, 2024',
      bookingTime: '05:40 PM',
      guestName: 'Vinay Patel',
      phone: '+91 9876598765',
      roomNo: 'Room 202',
      totalDue: '₹ 2,100',
      dueDate: 'Due on May 08, 2024'
    }
  ]);

  const handleDeleteClick = (id) => {
    setDeleteBookingId(id);
  };

  const handleConfirmDelete = () => {
    setBookings(prev => prev.filter(b => b.id !== deleteBookingId));
    setDeleteBookingId(null);
  };

  return (
    <div className="space-y-6 select-none font-sans pb-12">
      
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
        <span>Panchpokhari Homestay</span>
        <span>/</span>
        <span className="text-rose-700 font-extrabold">Guest Details</span>
      </div>

      {/* Header card with create button */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Guest Details</h1>
          <p className="text-[10px] font-bold text-slate-400">
            View and manage all guest bookings and details.
          </p>
        </div>
        
        <button
          onClick={() => navigate('/homestay-owner/bookings/create')}
          className="px-5 py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={13} />
          <span>Create Booking</span>
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5">
        {/* Filter Tabs */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFilterTab('month')}
            className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              filterTab === 'month' 
                ? 'border-rose-700 bg-rose-50/15 text-rose-700 shadow-sm' 
                : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
            }`}
          >
            <Calendar size={12} className="stroke-[2.5]" />
            <span>By Month</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('year')}
            className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              filterTab === 'year' 
                ? 'border-rose-700 bg-rose-50/15 text-rose-700 shadow-sm' 
                : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
            }`}
          >
            <Calendar size={12} className="stroke-[2.5]" />
            <span>By Year</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('custom')}
            className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              filterTab === 'custom' 
                ? 'border-rose-700 bg-rose-50/15 text-rose-700 shadow-sm' 
                : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
            }`}
          >
            <Calendar size={12} className="stroke-[2.5]" />
            <span>By Custom Date</span>
          </button>
        </div>

        {/* Inputs row */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          {filterTab === 'month' && (
            <div className="w-full sm:w-44 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              >
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
              </select>
            </div>
          )}

          {(filterTab === 'month' || filterTab === 'year') && (
            <div className="w-full sm:w-44 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          )}

          {filterTab === 'custom' && (
            <div className="w-full sm:w-48 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Select Custom Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
            <button
              type="button"
              className="flex-1 sm:flex-none px-5 py-2.5 border border-rose-700 hover:bg-rose-50/10 text-rose-707 text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer bg-white"
            >
              Apply Filter
            </button>
            
            <button
              type="button"
              className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer bg-white flex items-center justify-center gap-1.5"
            >
              <Download size={13} className="text-slate-400" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Guests */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <Users size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Total Guests</span>
            <span className="text-xl font-black text-slate-800 leading-none block">43</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">All Bookings</span>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <XCircle size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Cancelled</span>
            <span className="text-xl font-black text-slate-800 leading-none block">3</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Bookings</span>
          </div>
        </div>

        {/* Rescheduled */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <RefreshCw size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Rescheduled</span>
            <span className="text-xl font-black text-slate-800 leading-none block">0</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Bookings</span>
          </div>
        </div>

        {/* Bookings On Hold */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Bookings On Hold</span>
            <span className="text-xl font-black text-slate-800 leading-none block">5</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Bookings</span>
          </div>
        </div>

      </div>

      {/* BOOKING SUMMARY TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <Calendar size={15} />
            <span className="text-xs font-black text-slate-800">Booking Summary <span className="text-slate-400 font-bold">({selectedMonth} {selectedYear})</span></span>
          </div>
          <span className="text-[10px] font-black text-slate-500">Total Records: {bookings.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/20">
                <th className="py-3 px-4.5">Booking Date</th>
                <th className="py-3 px-4.5">Booking ID</th>
                <th className="py-3 px-4.5">Guest Name & Number</th>
                <th className="py-3 px-4.5">Room No.</th>
                <th className="py-3 px-4.5">Total Due</th>
                <th className="py-3 px-4.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/10 transition-colors">
                  <td className="py-4.5 px-4.5">
                    <span className="block font-black text-slate-800">{b.bookingDate}</span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-bold leading-none">{b.bookingTime}</span>
                  </td>
                  <td className="py-4.5 px-4.5 font-black text-slate-800 font-mono">#{b.id}</td>
                  <td className="py-4.5 px-4.5">
                    <button 
                      onClick={() => navigate(`/homestay-owner/guests/${b.id}`)}
                      className="block font-black text-slate-800 hover:text-rose-700 text-left bg-transparent border-none cursor-pointer p-0"
                    >
                      {b.guestName}
                    </button>
                    <span className="block text-[9px] text-slate-400 mt-0.5 leading-none">{b.phone}</span>
                  </td>
                  <td className="py-4.5 px-4.5 text-slate-707 font-extrabold">{b.roomNo}</td>
                  <td className="py-4.5 px-4.5">
                    <span className="block font-black text-slate-800">{b.totalDue}</span>
                    <span className="block text-[8px] text-slate-400 mt-0.5 font-bold leading-none">{b.dueDate}</span>
                  </td>
                  <td className="py-4.5 px-4.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={`tel:${b.phone}`}
                        className="w-7.5 h-7.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors"
                        title="Call Guest"
                      >
                        <Phone size={13} className="stroke-[2.5]" />
                      </a>
                      <a
                        href={`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-7.5 h-7.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors"
                        title="WhatsApp Guest"
                      >
                        <MessageSquare size={13} className="stroke-[2.5]" />
                      </a>
                      <button
                        onClick={() => handleDeleteClick(b.id)}
                        className="w-7.5 h-7.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                        title="Delete Booking"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info/Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/20">
          <span className="text-[10px] font-bold text-slate-400">
            Showing 1 to {bookings.length} of {bookings.length} entries
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Rows per page</span>
              <select className="px-2 py-1 border border-slate-205 rounded-lg text-[10px] font-bold">
                <option value="10">10</option>
                <option value="25">25</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-400 rounded-lg cursor-pointer bg-white" disabled>
                <ChevronLeft size={12} />
              </button>
              <button className="w-6 h-6 bg-rose-700 text-white font-bold text-[10px] rounded-lg flex items-center justify-center">
                1
              </button>
              <button className="w-6 h-6 bg-transparent text-slate-600 hover:bg-slate-50 font-bold text-[10px] rounded-lg flex items-center justify-center">
                2
              </button>
              <button className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-400 rounded-lg cursor-pointer bg-white">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteBookingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Delete Booking</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Are you sure you want to delete booking #{deleteBookingId}? This action will permanently remove it from guest logs.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteBookingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer border-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
