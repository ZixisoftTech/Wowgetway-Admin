import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Bell, 
  Check, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  SlidersHorizontal,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Unread' | 'booking' | 'confirmation' | 'cancellation'

  const fetchNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await axios.get(getApiUrl('/api/homestay-owner/notifications'), {
        headers: { Authorization: `Bearer ${token}` },
        params: { filter: filterType, limit: 100 }
      });
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    const token = getAuthToken();
    try {
      await axios.patch(getApiUrl(`/api/homestay-owner/notifications/${id}/read`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = getAuthToken();
    try {
      await axios.patch(getApiUrl('/api/homestay-owner/notifications/read-all'), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const token = getAuthToken();
    try {
      await axios.delete(getApiUrl(`/api/homestay-owner/notifications/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications permanently?')) return;
    const token = getAuthToken();
    try {
      await axios.delete(getApiUrl('/api/homestay-owner/notifications/clear-all'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleItemClick = (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif._id);
    }

    if (notif.type === 'booking' || notif.type === 'confirmation' || notif.type === 'rejection') {
      navigate('/homestay-owner/bookings/requests');
    } else if (notif.type === 'cancellation') {
      navigate('/homestay-owner/bookings/manage');
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking':
        return <Calendar size={18} className="text-amber-600" />;
      case 'confirmation':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'rejection':
      case 'cancellation':
        return <XCircle size={18} className="text-rose-600" />;
      case 'payment':
        return <CreditCard size={18} className="text-violet-600" />;
      default:
        return <AlertCircle size={18} className="text-blue-600" />;
    }
  };

  const getNotifBadgeBg = (type) => {
    switch (type) {
      case 'booking':
        return 'bg-amber-50 border-amber-100';
      case 'confirmation':
        return 'bg-emerald-50 border-emerald-100';
      case 'rejection':
      case 'cancellation':
        return 'bg-rose-50 border-rose-100';
      case 'payment':
        return 'bg-violet-50 border-violet-100';
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  // Metric counts
  const totalCount = notifications.length;
  const bookingCount = notifications.filter(n => n.type === 'booking').length;
  const cancelCount = notifications.filter(n => n.type === 'cancellation' || n.type === 'rejection').length;

  return (
    <div className="space-y-6 pb-12 select-none animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Other</span>
            <span>/</span>
            <span className="text-[#D80032]">Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-rose-50 text-[#D80032] rounded-2xl">
              <Bell size={22} className="stroke-[2.5]" />
            </span>
            Activity & Booking Notifications
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time alerts for public link bookings, customer requests, confirmations, and cancellations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchNotifications}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer bg-white flex items-center justify-center transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : 'text-slate-500'} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm"
            >
              <Check size={14} className="stroke-[2.5]" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-100 shadow-sm"
            >
              <Trash2 size={14} className="stroke-[2.5]" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#D80032] flex items-center justify-center shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Alerts</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Unread Alerts</span>
            <span className="text-xl font-black text-rose-600 leading-tight">{unreadCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Booking Requests</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{bookingCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
            <XCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Cancellations</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{cancelCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
          <SlidersHorizontal size={12} />
          Filter:
        </span>
        {[
          { id: 'All', label: 'All Alerts' },
          { id: 'Unread', label: `Unread (${unreadCount})` },
          { id: 'booking', label: 'Booking Requests' },
          { id: 'confirmation', label: 'Confirmations' },
          { id: 'cancellation', label: 'Cancellations / Rejections' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
              filterType === tab.id
                ? 'bg-[#D80032] text-white border-[#D80032] shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Listing */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-rose-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-700 m-0">No notifications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filterType === 'All'
                ? 'You do not have any alerts at the moment. New booking activities will appear here in real-time.'
                : `No notifications match the "${filterType}" filter.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                  !n.read ? 'bg-rose-50/20' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${getNotifBadgeBg(n.type)}`}>
                    {getNotifIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className={`text-sm m-0 ${!n.read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#D80032] shrink-0" />
                      )}
                      {n.bookingId && (
                        <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-[#D80032] text-[10px] font-black rounded-lg">
                          {n.bookingId}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 m-0 leading-relaxed max-w-2xl">
                      {n.message}
                    </p>

                    {n.metadata?.guestName && (
                      <p className="text-[11px] text-slate-400 font-semibold m-0 mt-1">
                        Guest: <span className="text-slate-700">{n.metadata.guestName}</span>
                        {n.metadata.amount && ` • Amount: ₹${Number(n.metadata.amount).toLocaleString()}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n._id, e)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Mark as read"
                    >
                      <Check size={13} />
                      <span className="hidden sm:inline">Mark Read</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDelete(n._id, e)}
                    className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                    title="Delete alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
