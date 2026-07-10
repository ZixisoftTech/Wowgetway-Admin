import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  CircleDollarSign, 
  UserCheck, 
  Home, 
  CalendarClock, 
  MapPin, 
  CreditCard, 
  Contact, 
  CarFront, 
  Route, 
  Globe, 
  TicketPercent, 
  Trash2,
  X,
  CalendarDays,
  Folder,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { setActiveTab, setSidebarOpen } from '../store/dashboardSlice.js';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-550', path: '/dashboard' },
  { name: 'Staff Management', icon: Users, color: 'text-emerald-500', path: '/staff-management' },
  { name: 'Manage Roles', icon: ShieldCheck, color: 'text-indigo-500', path: '/roles' },
  { name: 'Attendance Management', icon: CalendarDays, color: 'text-sky-500', path: '/attendance' },
  { name: 'Salary Management', icon: CircleDollarSign, color: 'text-rose-500', path: '/salary' },
  { name: 'Manage Homestay Owners', icon: UserCheck, color: 'text-sky-500', path: '/homestay-owners' },
  { name: 'Manage Homestays', icon: Home, color: 'text-green-500', path: '/homestays' },
  { name: 'Manage Bookings', icon: CalendarClock, color: 'text-blue-500', path: '/bookings' },
  { name: 'Manage Sightseeing', icon: MapPin, color: 'text-purple-500', path: '/sightseeing' },
  { name: 'B2B Hotel / Homestay Payment', icon: CreditCard, color: 'text-amber-500', path: '/payments' },
  { name: 'Manage Users', icon: Contact, color: 'text-orange-500', path: '/users' },
  { name: 'Manage Riders', icon: CarFront, color: 'text-teal-500', path: '/riders' },
  { name: 'Manage Rides', icon: Route, color: 'text-sky-600', path: '/rides' },
  { name: 'Homestay / Hotel Web Apps', icon: Globe, color: 'text-violet-500', path: '/web-apps' },
  { name: 'Manage Coupons', icon: TicketPercent, color: 'text-pink-500', path: '/coupons' },
  { name: 'Recycle Bin', icon: Trash2, color: 'text-slate-500', path: '/recycle-bin' },
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 py-6 px-4">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="WOW Gateways Logo" className="h-10 object-contain" />
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
        {menuItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.name;
          return (
            <React.Fragment key={item.name}>
              <button
                type="button"
                onClick={() => handleNavClick(item.name, item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-200 border-none bg-transparent cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <IconComponent 
                  size={16} 
                  className={`transition-colors stroke-[2.2] ${
                    isActive ? 'text-blue-600' : item.color
                  }`} 
                />
                <span className="truncate">{item.name}</span>
              </button>

              {/* Insert Global Settings expandable menu right after Manage Coupons (index 14) */}
              {index === 14 && (
                <div className="space-y-1 my-1">
                  <button
                    type="button"
                    onClick={() => setGlobalSettingsOpen(!globalSettingsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-none bg-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Folder 
                        size={16} 
                        className="transition-colors stroke-[2.2] text-amber-600" 
                      />
                      <span>Global Settings</span>
                    </div>
                    {globalSettingsOpen ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                  </button>
                  
                  {globalSettingsOpen && (
                    <div className="pl-4 space-y-1 border-l border-slate-100 ml-6 mt-1 mb-2">
                      {[
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
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[11px] font-bold transition-all duration-150 border-none bg-transparent cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-50/60 text-blue-600 font-extrabold'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-500' : 'bg-slate-350'}`} />
                            <span>{sub.name}</span>
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
