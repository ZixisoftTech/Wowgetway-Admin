import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, ChevronDown, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { toggleSidebar, setActiveTab } from '../store/dashboardSlice.js';
import { logout } from '../store/superAdminAuthSlice.js';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const user = useSelector((state) => state.superAdminAuth.user);

  const handleNavClick = (tabName, path) => {
    dispatch(setActiveTab(tabName));
    setProfileDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 z-20 py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center select-none">
      {/* Welcome Title */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-none">
              Welcome back, {user?.fullName || 'Rahul Sharma'}!
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Here's what's happening with your business today.
            </p>
          </div>
        </div>
        
        {/* Mobile-only notifications & profile shortcut */}
        <div className="flex sm:hidden items-center gap-2">
          <button 
            onClick={() => handleNavClick('Notifications')}
            className="p-2 text-slate-400 hover:text-slate-650 rounded-xl hover:bg-slate-100 transition-colors relative"
          >
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
            <Bell size={18} />
          </button>
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
            alt={user?.fullName || 'Rahul Sharma'}
            className="w-8 h-8 rounded-full border border-slate-200 object-cover cursor-pointer"
            onClick={() => handleNavClick('Profile')}
          />
        </div>
      </div>

      {/* Header Actions (Search & Profiles) */}
      <div className="hidden sm:flex items-center gap-4 w-full sm:w-auto justify-end">
        {/* Search Input */}
        <div className="relative w-64">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
          />
        </div>

        {/* Notifications */}
        <button 
          onClick={() => handleNavClick('Notifications')}
          className="p-2.5 bg-white text-slate-400 hover:text-slate-655 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all relative shadow-sm"
        >
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <Bell size={18} />
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3.5 bg-white border border-slate-200 p-1.5 pr-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:outline-none"
          >
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
              alt={user?.fullName || 'Rahul Sharma'}
              className="w-8 h-8 rounded-lg border border-slate-100 object-cover"
            />
            <span className="text-xs font-bold text-slate-700">{user?.fullName || 'Rahul Sharma'}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 text-xs font-semibold text-slate-600 z-30">
              <button 
                onClick={() => handleNavClick('My Profile', '/profile')}
                className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-slate-50 hover:text-slate-800"
              >
                <User size={13} className="text-slate-400" />
                My Profile
              </button>
              <button 
                onClick={() => handleNavClick('Settings', '/settings')}
                className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-slate-50 hover:text-slate-800"
              >
                <SettingsIcon size={13} className="text-slate-400" />
                Settings
              </button>
              <hr className="my-1.5 border-slate-100" />
              <button 
                onClick={handleLogout} 
                className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-red-50 hover:text-red-600 text-red-500 focus:outline-none"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
