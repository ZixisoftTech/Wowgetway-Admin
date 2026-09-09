import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar,
  Phone,
  Trash2,
  Users,
  XCircle,
  RefreshCw,
  Clock,
  Eye,
  Search,
  ChevronDown
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
  const [selectedMonth, setSelectedMonth] = useState(curMonthName);
  const [selectedYear, setSelectedYear] = useState(curYearStr);
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

  const fetchGuestList = async (overrideMonth, overrideYear, overrideSearch) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      let queryParams = new URLSearchParams();
      
      const m = overrideMonth !== undefined ? overrideMonth : selectedMonth;
      const y = overrideYear !== undefined ? overrideYear : selectedYear;
      const s = overrideSearch !== undefined ? overrideSearch : searchTerm;

      if (selectedPropertyId && selectedPropertyId !== 'all') {
        queryParams.append('propertyId', selectedPropertyId);
      }
      if (m) queryParams.append('month', m);
      if (y) queryParams.append('year', y);
      if (s) queryParams.append('search', s);

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
    if (e) e.preventDefault();
    fetchGuestList();
  };

  const handleReset = () => {
    setSelectedMonth(curMonthName);
    setSelectedYear(curYearStr);
    setSearchTerm('');
    fetchGuestList(curMonthName, curYearStr, '');
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
      {/* Top Filter Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end gap-3.5">
          {/* Month */}
          <div className="w-full sm:w-auto flex-1 min-w-[150px] max-w-[200px]">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
              MONTH
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 shadow-sm cursor-pointer"
              >
                {monthNames.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Year */}
          <div className="w-full sm:w-auto min-w-[110px] max-w-[140px]">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
              YEAR
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 shadow-sm cursor-pointer"
              >
                {['2024', '2025', '2026', '2027', '2028'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Search Guest or Mobile */}
          <div className="w-full sm:w-auto flex-1 min-w-[240px] max-w-sm">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
              SEARCH GUEST OR MOBILE
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search guest..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 shadow-sm"
              />
            </div>
          </div>

          {/* Property Filter if multiple properties exist */}
          {properties.length > 1 && (
            <div className="w-full sm:w-auto min-w-[160px] max-w-[200px]">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block">
                HOMESTAY
              </label>
              <div className="relative">
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 pr-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 shadow-sm cursor-pointer"
                >
                  <option value="all">All Homestays</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1 sm:pt-0">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#D80032] hover:bg-[#b00028] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer border-none"
            >
              APPLY FILTER
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
            >
              RESET
            </button>
          </div>
        </form>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL GUESTS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#E11D48]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL GUESTS</div>
            <div className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.totalGuests}</div>
            <div className="text-[11px] font-medium text-slate-400">All Bookings</div>
          </div>
        </div>

        {/* CANCELLED */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#E11D48]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CANCELLED</div>
            <div className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.cancelledCount}</div>
            <div className="text-[11px] font-medium text-slate-400">Stays Cancelled</div>
          </div>
        </div>

        {/* RESCHEDULED */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RESCHEDULED</div>
            <div className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.rescheduledCount}</div>
            <div className="text-[11px] font-medium text-slate-400">Adjusted Dates</div>
          </div>
        </div>

        {/* BOOKINGS ON HOLD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BOOKINGS ON HOLD</div>
            <div className="text-2xl font-black text-slate-800 leading-tight mt-0.5">{stats.holdCount}</div>
            <div className="text-[11px] font-medium text-slate-400">Awaiting Action</div>
          </div>
        </div>
      </div>

      {/* Guest Records & Booking Summary Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-100/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#D80032]" />
            <h2 className="text-base font-bold text-slate-900">
              Guest Records & Booking Summary <span className="text-slate-500 font-medium">({selectedMonth} {selectedYear})</span>
            </h2>
          </div>
          <div className="text-xs font-bold text-slate-500">
            Total Records: {bookings.length}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D80032]" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading guest bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-700">No guest bookings found for the selected period.</p>
            <p className="text-xs text-slate-400">Try changing your filters or selecting a different month/year.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2 sm:px-3 font-bold whitespace-nowrap">BOOKING DATE</th>
                  <th className="py-3 px-2 sm:px-3 font-bold whitespace-nowrap">BOOKING ID</th>
                  <th className="py-3 px-2 sm:px-3 font-bold">GUEST NAME & NUMBER</th>
                  <th className="py-3 px-2 sm:px-3 font-bold">PROPERTY & ROOM</th>
                  <th className="py-3 px-2 sm:px-3 font-bold whitespace-nowrap">TOTAL DUE</th>
                  <th className="py-3 px-2 sm:px-3 font-bold text-center whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {bookings.map((b) => {
                  const cleanPhone = String(b.phone || '').replace(/[^0-9]/g, '');
                  const displayDue = b.totalDue ? b.totalDue.replace('₹ ', '₹') : '₹0';

                  return (
                    <tr key={b.dbId || b.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Booking Date */}
                      <td className="py-3.5 px-2 sm:px-3 whitespace-nowrap">
                        <span className="block font-bold text-xs text-slate-900 leading-tight">
                          {b.bookingDate}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                          {b.bookingTime}
                        </span>
                      </td>

                      {/* Booking ID */}
                      <td className="py-3.5 px-2 sm:px-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                          className="font-extrabold text-xs text-[#E11D48] hover:underline font-mono bg-transparent border-none cursor-pointer p-0 text-left tracking-wide"
                        >
                          #{String(b.id).replace(/^#/, '')}
                        </button>
                        {b.bookingsCount > 1 && (
                          <span className="block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5 w-max leading-none">
                            {b.bookingsCount} Stays Consolidated
                          </span>
                        )}
                      </td>

                      {/* Guest Name & Number */}
                      <td className="py-3.5 px-2 sm:px-3">
                        <button 
                          onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                          className="block font-bold text-xs text-slate-900 hover:text-rose-600 text-left bg-transparent border-none cursor-pointer p-0 capitalize leading-tight truncate max-w-[130px] lg:max-w-[180px]"
                          title={b.guestName}
                        >
                          {b.guestName}
                        </button>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-none whitespace-nowrap">
                          {b.phone ? (b.phone.startsWith('+') ? b.phone : `+${b.phone}`) : 'N/A'}
                        </span>
                      </td>

                      {/* Property & Room */}
                      <td className="py-3.5 px-2 sm:px-3">
                        <span className="block font-bold text-xs text-slate-900 leading-tight truncate max-w-[140px] lg:max-w-[200px]" title={b.roomNo}>
                          {b.roomNo}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-none truncate max-w-[140px] lg:max-w-[200px]" title={b.propertyName}>
                          {b.propertyName}
                        </span>
                      </td>

                      {/* Total Due */}
                      <td className="py-3.5 px-2 sm:px-3 whitespace-nowrap">
                        <span className="block font-bold text-xs text-slate-900 leading-tight">
                          {displayDue}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                          {b.dueDate}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-2 sm:px-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          {/* View Details Pill */}
                          <button
                            onClick={() => navigate(`/homestay-owner/guests/${b.dbId || b.id}`)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-[#E11D48] rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border-none cursor-pointer transition-colors shrink-0"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                            <span>VIEW DETAILS</span>
                          </button>

                          {/* Phone button */}
                          {cleanPhone ? (
                            <a
                              href={`tel:${b.phone}`}
                              className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm transition-colors shrink-0"
                              title={`Call ${b.guestName}`}
                            >
                              <Phone className="w-3 h-3 stroke-[2.5]" />
                            </a>
                          ) : (
                            <button
                              disabled
                              className="w-7 h-7 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center cursor-not-allowed border-none shrink-0"
                            >
                              <Phone className="w-3 h-3" />
                            </button>
                          )}

                          {/* WhatsApp button */}
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm transition-colors shrink-0"
                              title={`Chat on WhatsApp with ${b.guestName}`}
                            >
                              <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                              </svg>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="w-7 h-7 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center cursor-not-allowed border-none shrink-0"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                              </svg>
                            </button>
                          )}

                          {/* Delete circle */}
                          <button
                            onClick={() => handleDeleteClick(b.dbId || b.id)}
                            className="w-7 h-7 rounded-full bg-white hover:bg-rose-50 border border-rose-100 text-[#E11D48] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                            title="Delete record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteBookingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Remove Booking from List</h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Are you sure you want to remove this record from the active list view?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteBookingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none"
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


