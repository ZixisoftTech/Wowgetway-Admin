import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Mail, ChevronDown, LogOut, User } from 'lucide-react';
import { logout } from '../store/homestayOwnerAuthSlice.js';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const user = useSelector((state) => state.homestayOwnerAuth.user);

  const handleLogout = () => {
    dispatch(logout());
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
      <div className="flex items-center gap-4">
        {/* Bell Alert */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border-none bg-transparent cursor-pointer relative">
          <Bell size={17} className="stroke-[2]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-600 rounded-full border border-white"></span>
        </button>

        {/* Mail Icon */}
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border-none bg-transparent cursor-pointer">
          <Mail size={17} className="stroke-[2]" />
        </button>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 bg-transparent border-none cursor-pointer focus:outline-none text-left"
          >
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-extrabold text-slate-800 leading-none">
                {user?.fullName || 'Keshav'}
              </span>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Owner
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
