import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Bell, 
  Mail, 
  ChevronDown, 
  LogOut, 
  User, 
  Check, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { logout } from '../store/homestayOwnerAuthSlice.js';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const user = useSelector((state) => state.homestayOwnerAuth.user);

  // Fetch notifications
  const fetchNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoadingNotifs(true);
      const res = await axios.get(getApiUrl('/api/homestay-owner/notifications'), {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 }
      });
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif._id);
    }
    setNotifDropdownOpen(false);

    if (notif.type === 'booking' || notif.type === 'confirmation' || notif.type === 'rejection') {
      navigate('/homestay-owner/bookings/requests');
    } else if (notif.type === 'cancellation') {
      navigate('/homestay-owner/bookings/manage');
    } else {
      navigate('/homestay-owner/notifications');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking':
        return <Calendar size={14} className="text-amber-600" />;
      case 'confirmation':
        return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'rejection':
      case 'cancellation':
        return <XCircle size={14} className="text-rose-600" />;
      default:
        return <AlertCircle size={14} className="text-blue-600" />;
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
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 z-20 py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center select-none">
      {/* Search Input */}
      <div className="relative w-72">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={15} />
        </span>
        <input
          type="text"
          placeholder="Search properties..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-150 rounded-2xl text-xs font-semibold text-slate-707 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition-colors shadow-sm"
        />
      </div>

      {/* Right Side Widgets */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Bell Alert & Interactive Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className={`p-2 rounded-xl transition-all border-none cursor-pointer relative ${
              notifDropdownOpen ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100 bg-transparent'
            }`}
            title="Notifications"
          >
            <Bell size={17} className="stroke-[2]" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-[#D80032] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-300 rounded-full border border-white"></span>
            )}
          </button>

          {/* Notifications Dropdown Modal */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
              {/* Dropdown Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 m-0">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 border-none bg-transparent cursor-pointer"
                  >
                    <Check size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 m-0">No notifications yet</p>
                    <p className="text-[10px] text-slate-400 mt-1 m-0">
                      You'll receive alerts for bookings, confirmations, and cancellations here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                        !n.read ? 'bg-rose-50/30' : 'bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl border shrink-0 ${getNotifBadgeBg(n.type)}`}>
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold m-0 truncate ${!n.read ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        {n.bookingId && (
                          <span className="inline-block mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                            {n.bookingId}
                          </span>
                        )}
                      </div>
                      {!n.read && (
                        <span 
                          onClick={(e) => handleMarkAsRead(n._id, e)}
                          title="Mark as read"
                          className="absolute right-3 top-3 w-2 h-2 bg-rose-600 rounded-full hover:scale-125 transition-transform"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 text-center">
                <button
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    navigate('/homestay-owner/notifications');
                  }}
                  className="text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5 w-full py-1 border-none bg-transparent cursor-pointer"
                >
                  <span>View All Notifications</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mail Icon */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border-none bg-transparent cursor-pointer">
          <Mail size={17} className="stroke-[2]" />
        </button>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 bg-transparent border-none cursor-pointer focus:outline-none text-left"
          >
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-extrabold text-slate-800 leading-none">
                {user?.fullName || user?.firstName || 'Keshav'}
              </span>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {user?.isStaff ? (user?.role || 'Staff') : 'Owner'}
              </span>
            </div>
            
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
                }}
              />
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-48 bg-white border border-slate-100 rounded-2xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-50">
                <span className="block text-xs font-black text-slate-700 truncate">{user?.email || 'owner@homestay.com'}</span>
                {user?.isStaff && (
                  <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                    Staff ({user.role})
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('/homestay-owner/profile');
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-slate-650 hover:bg-slate-50 text-xs font-bold text-left border-none bg-transparent cursor-pointer"
              >
                <User size={14} className="text-slate-400" />
                <span>My Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50/50 text-xs font-bold text-left border-none bg-transparent cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
