import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from '../modules/WoWSuper-Admin/store/dashboardSlice.js';

import Login from '../modules/WoWSuper-Admin/pages/Login.jsx';
import OwnerLogin from '../modules/Homestay-Owner-Admin/pages/Login.jsx';
import OwnerForgotPassword from '../modules/Homestay-Owner-Admin/pages/ForgotPassword.jsx';
import OwnerResetPassword from '../modules/Homestay-Owner-Admin/pages/ResetPassword.jsx';

import { getSuperAdminRoutes } from './superAdminRoutes.jsx';
import { getHomestayOwnerRoutes } from './homestayOwnerRoutes.jsx';

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

export default function AppRouter() {
  const isSuperAuthenticated = useSelector((state) => state.superAdminAuth.isAuthenticated);
  const isOwnerAuthenticated = useSelector((state) => state.homestayOwnerAuth.isAuthenticated);
  const location = useLocation();

  return (
    <>
      {isSuperAuthenticated && !location.pathname.startsWith('/homestay-owner') && <RouteTabSyncer />}
      <Routes>
        {/* Backward Compatibility Redirection */}
        <Route 
          path="/homestay-owner-login" 
          element={<Navigate to="/homestay-owner/login" replace />} 
        />

        {/* Public / Auth Routes for Homestay Owner */}
        <Route 
          path="/homestay-owner/login" 
          element={!isOwnerAuthenticated ? <OwnerLogin /> : <Navigate to="/homestay-owner/dashboard" replace />} 
        />
        <Route path="/homestay-owner/forgot-password" element={!isOwnerAuthenticated ? <OwnerLogin /> : <Navigate to="/homestay-owner/dashboard" replace />} />
        <Route path="/homestay-owner/verify-otp" element={!isOwnerAuthenticated ? <OwnerLogin /> : <Navigate to="/homestay-owner/dashboard" replace />} />
        <Route path="/homestay-owner/reset-password" element={!isOwnerAuthenticated ? <OwnerLogin /> : <Navigate to="/homestay-owner/dashboard" replace />} />

        {/* Public / Auth Routes for Super Admin */}
        <Route 
          path="/login" 
          element={!isSuperAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Modular Portal Route Trees */}
        {getHomestayOwnerRoutes()}
        {getSuperAdminRoutes()}

        {/* Global Route Redirects */}
        <Route 
          path="*" 
          element={
            <Navigate 
              to={
                location.pathname.startsWith('/homestay-owner')
                  ? (isOwnerAuthenticated ? "/homestay-owner/dashboard" : "/homestay-owner/login")
                  : (isSuperAuthenticated ? "/dashboard" : "/login")
              } 
              replace 
            />
          } 
        />
      </Routes>
    </>
  );
}
