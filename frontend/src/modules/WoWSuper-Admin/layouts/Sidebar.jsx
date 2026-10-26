import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Home, 
  UserCheck, 
  Calendar, 
  Users, 
  CreditCard, 
  Wallet, 
  Clock, 
  Settings, 
  Trash2, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  Headphones, 
  LogOut, 
  X 
} from 'lucide-react';
import { setActiveTab, setSidebarOpen } from '../store/dashboardSlice.js';
import { logout } from '../store/superAdminAuthSlice.js';

const menuItems = [
  { name: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
  { name: 'Homestays / Hotels', icon: Home, path: '/homestays' },
  { name: 'Homestay Owners', icon: UserCheck, path: '/homestay-owners' },
  { name: 'Bookings', icon: Calendar, path: '/bookings' },
  { name: 'Guests', icon: Users, path: '/users' },
  { name: 'Subscriptions', icon: CreditCard, path: '/subscription-plans' },
  { name: 'Payments', icon: Wallet, path: '/payments' },
  { name: 'Reports', icon: Clock, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
  { name: 'Recycle Bin', icon: Trash2, path: '/recycle-bin' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  
  const activeTab = useSelector((state) => state.dashboard.activeTab);
  const sidebarOpen = useSelector((state) => state.dashboard.sidebarOpen);

  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/settings/')) {
      setGlobalSettingsOpen(true);
    }
  }, [location.pathname]);

  const handleNavClick = (tabName, path) => {
    dispatch(setActiveTab(tabName));
    dispatch(setSidebarOpen(false)); // Auto-close drawer on mobile
    navigate(path);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 py-6 px-4">
      {/* Brand Header matching screenshot */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black tracking-wider text-slate-900">
              WOW
            </span>
            <span className="text-base font-black tracking-wider text-[#D80032]">
              GATEWAYS
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block -mt-1">
            Homestay Management
          </span>
        </div>
        {/* Mobile close button */}
        <button 
          onClick={() => dispatch(setSidebarOpen(false))}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path)) || 
            activeTab === item.name;

          return (
            <React.Fragment key={item.name}>
              <button
                type="button"
                onClick={() => handleNavClick(item.name, item.path)}
                className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left text-xs tracking-wide transition-all duration-200 border-none cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0F3] text-[#D80032] font-black before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#D80032] before:rounded-r'
                    : 'bg-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <IconComponent 
                  size={16} 
                  className={`transition-colors stroke-[2.2] ${
                    isActive ? 'text-[#D80032]' : 'text-slate-400'
                  }`} 
                />
                <span className="truncate">{item.name}</span>
              </button>

              {/* Insert Global Settings expandable menu right after Settings */}
              {item.name === 'Settings' && (
                <div className="space-y-1 my-1">
                  <button
                    type="button"
                    onClick={() => setGlobalSettingsOpen(!globalSettingsOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Folder size={15} className="text-amber-500" />
                      <span className="text-[11px] font-bold">Global Master Settings</span>
                    </div>
                    {globalSettingsOpen ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                  </button>
                  
                  {globalSettingsOpen && (
                    <div className="pl-4 space-y-1 border-l border-slate-100 ml-6 mt-1 mb-2">
                      {[
                        { name: 'Staff Management', path: '/staff-management' },
                        { name: 'Manage Roles', path: '/roles' },
                        { name: 'State Management', path: '/settings/states' },
                        { name: 'City Management', path: '/settings/cities' },
                        { name: 'Amenities Management', path: '/settings/amenities' },
                        { name: 'Room Types Management', path: '/settings/room-types' }
                      ].map(sub => {
                        const isSubActive = location.pathname === sub.path || activeTab === sub.name;
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => handleNavClick(sub.name, sub.path)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[11px] font-bold transition-all duration-150 border-none bg-transparent cursor-pointer ${
                              isSubActive
                                ? 'bg-rose-50 text-[#D80032] font-black'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-[#D80032]' : 'bg-slate-300'}`} />
                            <span className="truncate">{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom Help Card & Logout Button matching screenshot */}
      <div className="mt-auto pt-4 space-y-3">
        <a
          href="mailto:support@wowgateways.com"
          className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-100 rounded-2xl flex items-center justify-between transition-colors no-underline group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-slate-700 flex items-center justify-center border border-slate-100 shadow-2xs">
              <Headphones size={15} />
            </div>
            <div>
              <span className="text-[11px] font-black text-slate-800 block leading-tight">Need Help?</span>
              <span className="text-[10px] font-semibold text-slate-400 block">Contact Support</span>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </a>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-[#D80032] hover:bg-[#B00028] text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-xs transition-all cursor-pointer border-none"
        >
          <LogOut size={14} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 w-64 h-screen bg-white z-40 shadow-2xl transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
