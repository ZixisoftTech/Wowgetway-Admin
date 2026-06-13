import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { store } from './store/index.js';
import { setActiveTab } from './store/dashboardSlice.js';
import AppLayout from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StaffManagement from './pages/StaffManagement.jsx';
import ManageRoles from './pages/ManageRoles.jsx';
import AttendanceManagement from './pages/AttendanceManagement.jsx';
import SalaryManagement from './pages/SalaryManagement.jsx';
import HomestayOwnersManagement from './pages/HomestayOwnersManagement.jsx';
import ManageHomestays from './pages/ManageHomestays.jsx';
import ManageBookings from './pages/ManageBookings.jsx';
import RideManagement from './pages/RideManagement.jsx';
import RidersManagement from './pages/RidersManagement.jsx';
import UserManagement from './pages/UserManagement.jsx';
import ManageSightseeing from './pages/ManageSightseeing.jsx';
import ManageCoupons from './pages/ManageCoupons.jsx';
import PaymentsManagement from './pages/PaymentsManagement.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import RecycleBin from './pages/RecycleBin.jsx';
import WebApps from './pages/WebApps.jsx';
import Login from './pages/Login.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Sync router path with Redux activeTab
function RouteTabSyncer() {
  const location = useLocation();
  const dispatch = useDispatch();
  
  useEffect(() => {
    const path = location.pathname;
    const pathToTab = {
      '/dashboard': 'Dashboard',
      '/staff-management': 'Staff Management',
      '/roles': 'Manage Roles',
      '/attendance': 'Attendance Management',
      '/salary': 'Salary Management',
      '/homestay-owners': 'Manage Homestay Owners',
      '/homestays': 'Manage Homestays',
      '/bookings': 'Manage Bookings',
      '/sightseeing': 'Manage Sightseeing',
      '/payments': 'B2B Hotel / Homestay Payment',
      '/users': 'Manage Users',
      '/riders': 'Manage Riders',
      '/rides': 'Manage Rides',
      '/web-apps': 'Homestay / Hotel Web Apps',
      '/coupons': 'Manage Coupons',
      '/recycle-bin': 'Recycle Bin',
    };
    
    let matchedTab = null;
    for (const [p, tab] of Object.entries(pathToTab)) {
      if (path === p || path.startsWith(p + '/')) {
        matchedTab = tab;
        break;
      }
    }
    
    if (matchedTab) {
      dispatch(setActiveTab(matchedTab));
    }
  }, [location.pathname, dispatch]);
  
  return null;
}

function AppContent() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <>
      {isAuthenticated && <RouteTabSyncer />}
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
        
        {/* Main Dashboard Layout wrapper */}
        <Route path="/" element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="roles" element={<ManageRoles />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="salary" element={<SalaryManagement />} />
          <Route path="homestay-owners" element={<HomestayOwnersManagement />} />
          <Route path="homestays" element={<ManageHomestays />} />
          <Route path="bookings" element={<ManageBookings />} />
          <Route path="rides" element={<RideManagement />} />
          <Route path="sightseeing" element={<ManageSightseeing />} />
          <Route path="coupons" element={<ManageCoupons />} />
          <Route path="payments" element={<PaymentsManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="recycle-bin" element={<RecycleBin />} />
          <Route path="web-apps" element={<WebApps />} />
          
          {/* Sub-routes for Riders */}
          <Route path="riders" element={<RidersManagement />} />
          <Route path="riders/add" element={<RidersManagement />} />
          <Route path="riders/:id" element={<RidersManagement />} />
          <Route path="riders/edit/:id" element={<RidersManagement />} />

          {/* Sub-routes for Users */}
          <Route path="users" element={<UserManagement />} />
          <Route path="users/add" element={<UserManagement />} />
          <Route path="users/:id" element={<UserManagement />} />
          <Route path="users/edit/:id" element={<UserManagement />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        
        {/* Global Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
