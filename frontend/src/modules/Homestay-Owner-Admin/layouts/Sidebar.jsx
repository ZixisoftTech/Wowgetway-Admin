import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  Home,
  LayoutDashboard, 
  Calendar,
  Wallet, 
  CalendarCheck,
  Users, 
  FileText,
  UserCog,
  Bell,
  Stamp,
  Tag,
  CreditCard,
  Crown,
  LogOut
} from 'lucide-react';
import { logout } from '../store/homestayOwnerAuthSlice.js';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Top Group: Main property management items
  const mainItems = [
    { name: 'My Homestay', icon: Home, path: '/homestay-owner/inventory' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/homestay-owner/dashboard' },
    { name: 'Calendar / Availability', icon: Calendar, path: '/homestay-owner/availability' },
    { name: 'Revenue', icon: Wallet, path: '/homestay-owner/revenue' },
  ];

  // Bookings Group
  const bookingsItems = [
    { name: 'Manage Bookings', icon: CalendarCheck, path: '/homestay-owner/bookings/manage' },
    { name: 'Guest Details', icon: Users, path: '/homestay-owner/guests' },
    { name: 'Booking Request', icon: FileText, path: '/homestay-owner/bookings/requests' },
  ];

  // Other Group
  const otherItems = [
    { name: 'Manage Staffs', icon: UserCog, path: '/homestay-owner/staff' },
    { name: 'Notifications', icon: Bell, path: '/homestay-owner/notifications' },
    { name: 'Signatures / Stamps / Logo', icon: Stamp, path: '/homestay-owner/signatures-stamps' },
    { name: 'Offers / Coupon', icon: Tag, path: '/homestay-owner/coupons' },
    { name: 'Manage Payments', icon: CreditCard, path: '/homestay-owner/settings/payments' },
    { name: 'Manage Subscription', icon: Crown, path: '/homestay-owner/subscription' },
  ];

  const isItemActive = (path) => {
    if (path === '/homestay-owner/inventory') {
      return location.pathname === '/homestay-owner/inventory' || location.pathname.startsWith('/homestay-owner/inventory');
    }
    if (path === '/homestay-owner/dashboard') {
      return location.pathname === '/homestay-owner/dashboard';
    }
    if (path === '/homestay-owner/availability') {
      return location.pathname === '/homestay-owner/availability' || location.pathname.startsWith('/homestay-owner/availability');
    }
    if (path === '/homestay-owner/revenue') {
      return location.pathname === '/homestay-owner/revenue' || location.pathname.startsWith('/homestay-owner/revenue');
    }
    if (path === '/homestay-owner/bookings/manage') {
      return (
        location.pathname === '/homestay-owner/bookings/manage' || 
        location.pathname === '/homestay-owner/bookings' || 
        (location.pathname.startsWith('/homestay-owner/bookings') && !location.pathname.includes('/requests'))
      );
    }
    if (path === '/homestay-owner/guests') {
      return location.pathname === '/homestay-owner/guests' || location.pathname.startsWith('/homestay-owner/guests');
    }
    if (path === '/homestay-owner/bookings/requests') {
      return location.pathname.startsWith('/homestay-owner/bookings/requests');
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const renderMenuItem = (item) => {
    const isActive = isItemActive(item.path);
    return (
      <button
        key={item.name}
        onClick={() => navigate(item.path)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${
          isActive
            ? 'text-[#D80032] bg-rose-50/70 shadow-2xs font-extrabold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
        }`}
      >
        <item.icon 
          size={16} 
          className={isActive ? 'text-[#D80032] stroke-[2.4]' : 'text-slate-400 stroke-[1.9]'} 
        />
        <span>{item.name}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 pb-3.5 border-b border-slate-50">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#D80032] font-black text-xl tracking-tighter uppercase font-sans">Wow</span>
            <span className="text-slate-800 font-extrabold text-sm tracking-widest uppercase font-sans">Gateways</span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Management Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {/* Main 4 items */}
        <div className="space-y-0.5">
          {mainItems.map(renderMenuItem)}
        </div>

        {/* Bookings Section */}
        <div className="pt-3 pb-1 px-3.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Bookings
          </span>
        </div>
        <div className="space-y-0.5">
          {bookingsItems.map(renderMenuItem)}
        </div>

        {/* Other Section */}
        <div className="pt-3 pb-1 px-3.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Other
          </span>
        </div>
        <div className="space-y-0.5">
          {otherItems.map(renderMenuItem)}
        </div>

        {/* System Section */}
        <div className="pt-3 pb-1 px-3.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            System
          </span>
        </div>
        <div className="space-y-0.5 pb-2">
          <button
            onClick={() => dispatch(logout())}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-[#D80032] hover:bg-rose-50/50 transition-all border-none bg-transparent cursor-pointer"
          >
            <LogOut size={16} className="text-[#D80032] stroke-[2.2]" />
            <span>Log Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
