import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function SuperAdminProtectedRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.superAdminAuth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export function HomestayOwnerProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.homestayOwnerAuth);

  if (!isAuthenticated) {
    return <Navigate to="/homestay-owner/login" replace />;
  }

  // Check subscription status
  const sub = user?.subscription;
  const isExpired = sub && (sub.status === 'Expired' || (sub.expiresAt && new Date(sub.expiresAt) < new Date()));
  const isNone = !sub || sub.status === 'None';

  // Allow access to subscription page and profile even if expired/none
  const isSubscriptionRoute = location.pathname === '/homestay-owner/subscription' || 
                              location.pathname.startsWith('/homestay-owner/subscription') ||
                              location.pathname === '/homestay-owner/profile';

  if ((isExpired || isNone) && !isSubscriptionRoute) {
    return <Navigate to="/homestay-owner/subscription" replace />;
  }

  return children;
}

