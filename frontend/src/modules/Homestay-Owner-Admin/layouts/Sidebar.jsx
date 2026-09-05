import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  LayoutDashboard, 
  Calendar,
  Wallet, 
  Home, 
  Users, 
  FileText,
  DollarSign,
  LogOut,
  CalendarCheck
} from 'lucide-react';
import { logout } from '../store/homestayOwnerAuthSlice.js';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/homestay-owner/dashboard' },
    { name: 'Availability Schedule', icon: Calendar, path: '/homestay-owner/availability' },
    { name: 'Revenue', icon: Wallet, path: '/homestay-owner/revenue' },
    { name: 'Inventory', icon: Home, path: '/homestay-owner/inventory' },
    { name: 'Guests', icon: Users, path: '/homestay-owner/guests' },
  ];

  const bookingsItems = [
    { name: 'Manage Bookings', icon: CalendarCheck, path: '/homestay-owner/bookings/manage' },
    { name: 'Booking Requests', icon: FileText, path: '/homestay-owner/bookings/requests' },
  ];

  const bottomItems = [
    { name: 'Manage Payments', icon: DollarSign, path: '/homestay-owner/settings/payments' },
  ];

  const handleNavigation = (path) => {
    if (
      path === '/homestay-owner/dashboard' || 
      path === '/homestay-owner/revenue' ||
      path === '/homestay-owner/inventory' ||
      path === '/homestay-owner/guests' ||
      path === '/homestay-owner/availability' ||
      path.startsWith('/homestay-owner/bookings') ||
      path === '/homestay-owner/settings/payments' ||
      path === '/homestay-owner/profile'
    ) {
      navigate(path);
    } else {
      alert(`${path.replace('/homestay-owner/', '').toUpperCase()} module will be integrated soon.`);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 border-b border-slate-50">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-black text-xl tracking-tighter uppercase font-sans">Wow</span>
            <span className="text-slate-800 font-extrabold text-sm tracking-widest uppercase font-sans">Gateways</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            Management Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = 
            location.pathname === item.path || 
            (item.path === '/homestay-owner/inventory' && location.pathname.startsWith('/homestay-owner/inventory')) ||
            (item.path === '/homestay-owner/guests' && location.pathname.startsWith('/homestay-owner/guests')) ||
            (item.path === '/homestay-owner/availability' && location.pathname.startsWith('/homestay-owner/availability'));
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${
                isActive
                  ? 'text-rose-600 bg-rose-50/50 border-l-4 border-rose-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-55'
              }`}
            >
              <item.icon size={17} className={isActive ? 'text-rose-600 stroke-[2.5]' : 'text-slate-400 stroke-[2]'} />
              <span>{item.name}</span>
            </button>
          );
        })}

        {/* Bookings Section Header */}
        <div className="pt-4 pb-1.5 px-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Bookings
          </span>
        </div>

        {/* Bookings Submenu */}
        {bookingsItems.map((item) => {
          const isActive = 
            location.pathname === item.path || 
            (item.path === '/homestay-owner/bookings/manage' && (location.pathname === '/homestay-owner/bookings' || location.pathname.startsWith('/homestay-owner/bookings/manage'))) ||
            (item.path === '/homestay-owner/bookings/requests' && location.pathname.startsWith('/homestay-owner/bookings/requests'));
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${
                isActive
                  ? 'text-rose-600 bg-rose-50/50 border-l-4 border-rose-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-55'
              }`}
            >
              <item.icon size={17} className={isActive ? 'text-rose-600 stroke-[2.5]' : 'text-slate-400 stroke-[2]'} />
              <span>{item.name}</span>
            </button>
          );
        })}

      </nav>

      {/* Bottom Footer Items */}
      <div className="p-4 border-t border-slate-50 space-y-1.5">
        {bottomItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.path)}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-55 transition-all border-none bg-transparent cursor-pointer"
          >
            <item.icon size={17} className="text-slate-400 stroke-[2]" />
            <span>{item.name}</span>
          </button>
        ))}
        
        {/* Logout */}
        <button
          onClick={() => dispatch(logout())}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-all border-none bg-transparent cursor-pointer"
        >
          <LogOut size={17} className="text-rose-600 stroke-[2]" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
