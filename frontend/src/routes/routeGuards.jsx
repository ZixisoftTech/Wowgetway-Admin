import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function SuperAdminProtectedRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.superAdminAuth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export function HomestayOwnerProtectedRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.homestayOwnerAuth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/homestay-owner/login" replace />;
}
