import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  Plus,
  Search,
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

export default function GuestListing() {
  const navigate = useNavigate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const curMonthName = monthNames[new Date().getMonth()];
  const curYearStr = String(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(curMonthName);
  const [selectedYear, setSelectedYear] = useState(curYearStr);
  const [customDate, setCustomDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [properties, setProperties] = useState([]);

  // Live stats
  const [stats, setStats] = useState({
    totalGuests: 0,
    cancelledCount: 0,
    rescheduledCount: 0,
    holdCount: 0
  });

  const [bookings, setBookings] = useState([]);
  const [deleteBookingId, setDeleteBookingId] = useState(null);

  useEffect(() => {
    fetchGuestList();
  }, [selectedPropertyId]);

  const fetchGuestList = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      let queryParams = new URLSearchParams();
      if (selectedPropertyId && selectedPropertyId !== 'all') {
        queryParams.append('propertyId', selectedPropertyId);
      }
      if (filterTab === 'month') {
        queryParams.append('month', selectedMonth);
        queryParams.append('year', selectedYear);
      } else if (filterTab === 'year') {
        queryParams.append('year', selectedYear);
      } else if (filterTab === 'custom' && customDate) {
        queryParams.append('startDate', customDate);
        queryParams.append('endDate', customDate);
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const res = await axios.get(getApiUrl(`/api/homestay-owner/guests?${queryParams.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        if (res.data.properties) {
          setProperties(res.data.properties);
        }
      }
    } catch (err) {
      console.error('Failed to load guests list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchGuestList();
  };

  const handleDeleteClick = (id) => {
    setDeleteBookingId(id);
  };

  const handleConfirmDelete = () => {
    setBookings(prev => prev.filter(b => b.id !== deleteBookingId && b.dbId !== deleteBookingId));
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
        <span className="text-rose-700 font-extrabold">Guest Details & Booking History</span>
      </div>

      {/* Header card with property selector & create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Guest Details & Booking Summary</h1>
          <p className="text-[10px] font-bold text-slate-400">
            Click on any guest name or action button to view their complete stay history, lifetime spend, and reservation details.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {properties.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-205 px-3 py-2 rounded-xl shadow-sm">
              <Building2 size={13} className="text-rose-700" />
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="text-xs font-bold text-slate-707 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="all">All Properties</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => navigate('/homestay-owner/bookings/create')}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={13} />
            <span>Create Booking</span>
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-5">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
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
        <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row flex-wrap items-end sm:items-center gap-3">
          {filterTab === 'month' && (
            <div className="w-full sm:w-36 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {(filterTab === 'month' || filterTab === 'year') && (
            <div className="w-full sm:w-32 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          )}

          {filterTab === 'custom' && (
            <div className="w-full sm:w-44 space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Select Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>
          )}

          <div className="w-full sm:w-56 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Search Guest or Mobile</label>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guest..."
                className="w-full pl-8 pr-3 py-2 border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer border-none shadow-sm"
            >
              Apply Filter
            </button>
            
            <button
              type="button"
              onClick={() => { 
                setSearchTerm(''); 
                setSelectedMonth(curMonthName); 
                setSelectedYear(curYearStr); 
                setCustomDate(''); 
                fetchGuestList(); 
              }}
              className="flex-1 sm:flex-none px-3.5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer bg-white"
            >
              Reset
            </button>
          </div>
        </form>
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
            <span className="text-xl font-black text-slate-800 leading-none block">{stats.totalGuests}</span>
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
            <span className="text-xl font-black text-slate-800 leading-none block">{stats.cancelledCount}</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Stays Cancelled</span>
          </div>
        </div>

        {/* Rescheduled */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <RefreshCw size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Rescheduled</span>
            <span className="text-xl font-black text-slate-800 leading-none block">{stats.rescheduledCount}</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Adjusted Dates</span>
          </div>
        </div>

        {/* Bookings On Hold */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock size={20} className="stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Bookings On Hold</span>
            <span className="text-xl font-black text-slate-800 leading-none block">{stats.holdCount}</span>
            <span className="text-[9px] text-slate-400 font-semibold block leading-none pt-0.5">Awaiting Action</span>
          </div>
        </div>

      </div>

      {/* BOOKING SUMMARY TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <Calendar size={15} />
            <span className="text-xs font-black text-slate-800">
              Guest Records & Booking Summary 
              <span className="text-slate-400 font-bold ml-1">
                ({filterTab === 'month' ? `${selectedMonth} ${selectedYear}` : filterTab === 'year' ? selectedYear : 'Custom Range'})
              </span>
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-500">Total Records: {bookings.length}</span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2.5 text-slate-400">
            <RefreshCw size={20} className="animate-spin text-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading guest bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No guest bookings found for the selected period.</p>
            <p className="text-[10px] text-slate-400">Try changing your filters or create a new booking reservation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/20">
                  <th className="py-3 px-4.5">Booking Date</th>
                  <th className="py-3 px-4.5">Booking ID</th>
                  <th className="py-3 px-4.5">Guest Name & Number</th>
                  <th className="py-3 px-4.5">Property & Room</th>
                  <th className="py-3 px-4.5">Total Due</th>
                  <th className="py-3 px-4.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-707">
                {bookings.map((b) => (
                  <tr key={b.dbId || b.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4.5 px-4.5">
                      <span className="block font-black text-slate-800">{b.bookingDate}</span>
                      <span className="block text-[8px] text-slate-400 mt-0.5 font-bold leading-none">{b.bookingTime}</span>
                    </td>
                    <td className="py-4.5 px-4.5">
                      <button
                        onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                        className="font-black text-rose-700 hover:text-rose-800 hover:underline font-mono bg-transparent border-none cursor-pointer p-0 text-left"
                      >
                        #{String(b.id).replace(/^#/, '')}
                      </button>
                      {b.bookingsCount > 1 && (
                        <span className="block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 w-max">
                          {b.bookingsCount} Stays Consolidated
                        </span>
                      )}
                    </td>
                    <td className="py-4.5 px-4.5">
                      <button 
                        onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                        className="block font-black text-slate-800 hover:text-rose-700 text-left bg-transparent border-none cursor-pointer p-0 hover:underline"
                        title="Click to view full guest profile and stay history"
                      >
                        {b.guestName}
                      </button>
                      <span className="block text-[9px] text-slate-400 mt-0.5 leading-none">{b.phone}</span>
                    </td>
                    <td className="py-4.5 px-4.5">
                      <span className="block font-extrabold text-slate-800">{b.roomNo}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">{b.propertyName}</span>
                    </td>
                    <td className="py-4.5 px-4.5">
                      <span className="block font-black text-slate-800">{b.totalDue}</span>
                      <span className="block text-[8px] text-slate-400 mt-0.5 font-bold leading-none">{b.dueDate}</span>
                    </td>
                    <td className="py-4.5 px-4.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer border-none transition-colors"
                          title="View Guest Details & History"
                        >
                          <Eye size={12} className="stroke-[2.5]" />
                          <span>View Details</span>
                        </button>
                        {b.phone && (
                          <a
                            href={`tel:${b.phone}`}
                            className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors"
                            title="Call Guest"
                          >
                            <Phone size={12} className="stroke-[2.5]" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteClick(b.dbId || b.id)}
                          className="w-7 h-7 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer"
                          title="Delete from view"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/20">
          <span className="text-[10px] font-bold text-slate-400">
            Showing 1 to {bookings.length} of {bookings.length} entries
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteBookingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Remove Booking from List</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Are you sure you want to remove this record from the active list view?
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
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

