import React from 'react';
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
  CalendarDays
} from 'lucide-react';
import { setActiveTab, setSidebarOpen } from '../../store/dashboardSlice.js';

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
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.name, item.path)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-xs font-semibold tracking-wide transition-all duration-200 ${
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
