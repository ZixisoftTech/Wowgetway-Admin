import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-55 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header />
        
        {/* Dynamic Inner Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
