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
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-20 py-3.5 px-4 sm:px-6 lg:px-8 flex items-center justify-between select-none">
      {/* Mobile Menu & Optional Search or Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Header Actions (Search, Bell & Profile) */}
      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        {/* Search Input matching screenshot */}
        <div className="relative w-52 sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search homestays, owners, ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D80032]/15 focus:border-[#D80032] shadow-2xs transition-all"
          />
        </div>

        {/* Notifications Bell matching screenshot */}
        <button 
          onClick={() => handleNavClick('Notifications', '/notifications')}
          className="p-2.5 bg-slate-50/70 text-slate-500 hover:text-slate-800 border border-slate-200/80 rounded-2xl hover:bg-slate-100/70 transition-all relative shadow-2xs cursor-pointer"
          title="Notifications"
        >
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#D80032] rounded-full" />
          <Bell size={17} />
        </button>

        {/* User Profile matching screenshot avatar */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 bg-white border border-slate-200/80 p-1.5 pr-3 rounded-2xl hover:bg-slate-50 transition-all shadow-2xs focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#D80032] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              W
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-black text-slate-800 block leading-tight">
                {user?.fullName || 'Wow Gateway'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 block leading-none">
                Admin
              </span>
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-lg py-1.5 text-xs font-semibold text-slate-600 z-30">
              <button 
                onClick={() => handleNavClick('My Profile', '/profile')}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 hover:text-slate-800 border-none bg-transparent cursor-pointer font-bold"
              >
                <User size={14} className="text-slate-400" />
                My Profile
              </button>
              <button 
                onClick={() => handleNavClick('Settings', '/settings')}
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 hover:text-slate-800 border-none bg-transparent cursor-pointer font-bold"
              >
                <SettingsIcon size={14} className="text-slate-400" />
                Settings
              </button>
              <hr className="my-1.5 border-slate-100" />
              <button 
                onClick={handleLogout} 
                className="w-full text-left flex items-center gap-2 px-4 py-2.5 hover:bg-rose-50 hover:text-[#D80032] text-[#D80032] border-none bg-transparent cursor-pointer font-extrabold focus:outline-none"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
