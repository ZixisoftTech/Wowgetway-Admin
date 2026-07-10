import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import AppLayout from '../modules/WoWSuper-Admin/layouts/AppLayout.jsx';
import Dashboard from '../modules/WoWSuper-Admin/pages/Dashboard.jsx';
import StaffManagement from '../modules/WoWSuper-Admin/pages/StaffManagement.jsx';
import ManageRoles from '../modules/WoWSuper-Admin/pages/ManageRoles.jsx';
import AttendanceManagement from '../modules/WoWSuper-Admin/pages/AttendanceManagement.jsx';
import SalaryManagement from '../modules/WoWSuper-Admin/pages/SalaryManagement.jsx';
import HomestayOwnersManagement from '../modules/WoWSuper-Admin/pages/HomestayOwnersManagement.jsx';
import ManageHomestays from '../modules/WoWSuper-Admin/pages/ManageHomestays.jsx';
import ManageBookings from '../modules/WoWSuper-Admin/pages/ManageBookings.jsx';
import RideManagement from '../modules/WoWSuper-Admin/pages/RideManagement.jsx';
import RidersManagement from '../modules/WoWSuper-Admin/pages/RidersManagement.jsx';
import UserManagement from '../modules/WoWSuper-Admin/pages/UserManagement.jsx';
import ManageSightseeing from '../modules/WoWSuper-Admin/pages/ManageSightseeing.jsx';
import ManageCoupons from '../modules/WoWSuper-Admin/pages/ManageCoupons.jsx';
import PaymentsManagement from '../modules/WoWSuper-Admin/pages/PaymentsManagement.jsx';
import Reports from '../modules/WoWSuper-Admin/pages/Reports.jsx';
import Settings from '../modules/WoWSuper-Admin/pages/Settings.jsx';
import StateManagement from '../modules/WoWSuper-Admin/pages/StateManagement.jsx';
import CityManagement from '../modules/WoWSuper-Admin/pages/CityManagement.jsx';
import AmenitiesManagement from '../modules/WoWSuper-Admin/pages/AmenitiesManagement.jsx';
import RoomTypesManagement from '../modules/WoWSuper-Admin/pages/RoomTypesManagement.jsx';
import Notifications from '../modules/WoWSuper-Admin/pages/Notifications.jsx';
import Profile from '../modules/WoWSuper-Admin/pages/Profile.jsx';
import RecycleBin from '../modules/WoWSuper-Admin/pages/RecycleBin.jsx';
import WebApps from '../modules/WoWSuper-Admin/pages/WebApps.jsx';

import { SuperAdminProtectedRoute } from './routeGuards.jsx';

export const getSuperAdminRoutes = () => (
  <Route path="/" element={<SuperAdminProtectedRoute><AppLayout /></SuperAdminProtectedRoute>}>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="staff-management" element={<StaffManagement />} />
    <Route path="roles" element={<ManageRoles />} />
    <Route path="attendance" element={<AttendanceManagement />} />
    <Route path="salary" element={<SalaryManagement />} />
    <Route path="homestay-owners" element={<HomestayOwnersManagement />} />
    <Route path="homestay-owners/add" element={<HomestayOwnersManagement />} />
    <Route path="homestay-owners/:id" element={<HomestayOwnersManagement />} />
    <Route path="homestay-owners/edit/:id" element={<HomestayOwnersManagement />} />
    <Route path="homestays" element={<ManageHomestays />} />
    <Route path="bookings" element={<ManageBookings />} />
    <Route path="rides" element={<RideManagement />} />
    <Route path="sightseeing" element={<ManageSightseeing />} />
    <Route path="coupons" element={<ManageCoupons />} />
    <Route path="payments" element={<PaymentsManagement />} />
    <Route path="reports" element={<Reports />} />
    <Route path="settings" element={<Settings />} />
    <Route path="settings/states" element={<StateManagement />} />
    <Route path="settings/cities" element={<CityManagement />} />
    <Route path="settings/amenities" element={<AmenitiesManagement />} />
    <Route path="settings/room-types" element={<RoomTypesManagement />} />
    <Route path="notifications" element={<Notifications />} />
    <Route path="profile" element={<Profile />} />
    <Route path="recycle-bin" element={<RecycleBin />} />
    <Route path="web-apps" element={<WebApps />} />
    
    <Route path="riders" element={<RidersManagement />} />
    <Route path="riders/add" element={<RidersManagement />} />
    <Route path="riders/:id" element={<RidersManagement />} />
    <Route path="riders/edit/:id" element={<RidersManagement />} />

    <Route path="users" element={<UserManagement />} />
    <Route path="users/add" element={<UserManagement />} />
    <Route path="users/:id" element={<UserManagement />} />
    <Route path="users/edit/:id" element={<UserManagement />} />
  </Route>
);
