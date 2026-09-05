import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-55 flex print:bg-white print:block">
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
  );
}
