import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { logout } from '../store/homestayOwnerAuthSlice.js';

export default function AppLayout({ children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.homestayOwnerAuth.user);
  const isImpersonated = user?.isImpersonated || (typeof window !== 'undefined' && localStorage.getItem('isImpersonated') === 'true');

  const handleReturnToSuperAdmin = () => {
    localStorage.removeItem('isImpersonated');
    localStorage.removeItem('homestayOwnerToken');
    localStorage.removeItem('homestayOwnerUser');
    dispatch(logout());
    window.location.href = '/homestay-owners';
  };

  return (
    <div className="min-h-screen bg-slate-55 flex flex-col print:bg-white print:block">
      {/* Impersonation Banner for Super Admin */}
      {isImpersonated && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-50 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-100 flex-shrink-0 animate-pulse" />
            <span>
              Super Admin Impersonation Active: You are managing homestay as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
            </span>
          </div>
          <button 
            onClick={handleReturnToSuperAdmin}
            className="bg-slate-900 hover:bg-slate-950 text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ml-auto"
            title="Exit homestay owner view and return to Super Admin portal"
          >
            <ArrowLeft size={13} />
            <span>Return to Super Admin</span>
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <div className="print:hidden">
          <Sidebar />
        </div>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col lg:pl-64 print:pl-0 print:m-0 print:w-full min-w-0">
          <div className="print:hidden">
            <Header />
          </div>
          
          {/* Dynamic Inner Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible overflow-y-auto">
            <div className="max-w-[1600px] mx-auto print:max-w-none print:w-full">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
