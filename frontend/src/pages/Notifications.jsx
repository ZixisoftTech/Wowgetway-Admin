import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Check, 
  Trash2, 
  Info, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  SlidersHorizontal 
} from 'lucide-react';

const initialNotifications = [
  { id: '1', title: 'New Booking Request', body: 'Booking BKG-2910 has been received for Mountain View Homestay (Amit Saxena).', type: 'booking', read: false, time: '10 mins ago' },
  { id: '2', title: 'Payout Scheduled', body: 'Payout of ₹ 5,400 is pending settlement for Rose Petals Villa.', type: 'payment', read: false, time: '1 hour ago' },
  { id: '3', title: 'Security Flag Triggered', body: 'Failed login attempt detected on Super Admin node from IP 192.168.10.23.', type: 'security', read: true, time: '1 day ago' },
  { id: '4', title: 'System Backup Complete', body: 'Daily automated backup succeeded. 1.2 GB compressed archive uploaded to AWS S3.', type: 'system', read: true, time: '1 day ago' },
  { id: '5', title: 'Homestay Inactivated', body: 'Rose Petals Villa was deactivated due to expired safety certificates.', type: 'booking', read: true, time: '2 days ago' }
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filterType, setFilterType] = useState('All');

  const handleMarkAsRead = (id) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) return { ...n, read: true };
      return n;
    }));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAll = () => {
    if (confirm('Delete all alerts permanently?')) {
      setNotifications([]);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'All') return true;
    if (filterType === 'Unread') return !n.read;
    return n.type === filterType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Bell size={22} />
            </span>
            System Notifications
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Stay up to date with new bookings transactions, operator audits, host status updates, and security logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Check size={13} />
            Mark All Read
          </button>
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Trash2 size={13} />
            Clear All
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pl-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mt-0.5">
          <SlidersHorizontal size={11} />
          Filter:
        </span>
        {[
          { id: 'All', label: 'All Alerts' },
          { id: 'Unread', label: 'Unread' },
          { id: 'booking', label: 'Bookings' },
          { id: 'payment', label: 'Payouts' },
          { id: 'security', label: 'Security Logs' },
          { id: 'system', label: 'System' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterType(cat.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              filterType === cat.id
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Alert Feed List */}
      <div className="space-y-4 max-w-3xl">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 font-semibold"
            >
              <div className="flex flex-col items-center gap-3">
                <Bell size={36} className="text-slate-200" />
                <span>You have no notifications in this category.</span>
              </div>
            </motion.div>
          ) : (
            filteredNotifications.map(notif => {
              const Icon = notif.type === 'booking' ? Calendar : notif.type === 'security' ? ShieldAlert : notif.type === 'payment' ? Info : AlertTriangle;
              const colorClass = notif.type === 'booking' ? 'bg-blue-50 text-blue-600 border-blue-100' : notif.type === 'security' ? 'bg-rose-50 text-rose-600 border-rose-100' : notif.type === 'payment' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100';

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-4 transition-all ${
                    notif.read ? 'border-slate-100 opacity-75' : 'border-blue-150 shadow-[0_4px_12px_rgba(59,130,246,0.02)]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border ${colorClass} flex-shrink-0`}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 leading-snug flex items-center gap-2">
                        {notif.title}
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">{notif.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg border border-slate-200/60 transition-colors cursor-pointer"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      title="Delete notification"
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg border border-slate-200/60 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
