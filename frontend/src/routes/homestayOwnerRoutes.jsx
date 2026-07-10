import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import OwnerLayout from '../modules/Homestay-Owner-Admin/layouts/AppLayout.jsx';
import OwnerDashboard from '../modules/Homestay-Owner-Admin/pages/Dashboard.jsx';
import OwnerProfile from '../modules/Homestay-Owner-Admin/pages/Profile.jsx';
import OwnerRevenue from '../modules/Homestay-Owner-Admin/pages/Revenue.jsx';
import InventoryList from '../modules/Homestay-Owner-Admin/pages/InventoryList.jsx';
import PropertySetupWizard from '../modules/Homestay-Owner-Admin/pages/PropertySetupWizard.jsx';
import PropertyDetails from '../modules/Homestay-Owner-Admin/pages/PropertyDetails.jsx';
import EditRoom from '../modules/Homestay-Owner-Admin/pages/EditRoom.jsx';
import RateChart from '../modules/Homestay-Owner-Admin/pages/RateChart.jsx';
import EditSeason from '../modules/Homestay-Owner-Admin/pages/EditSeason.jsx';
import GuestListing from '../modules/Homestay-Owner-Admin/pages/GuestListing.jsx';
import GuestDetails from '../modules/Homestay-Owner-Admin/pages/GuestDetails.jsx';
import Availability from '../modules/Homestay-Owner-Admin/pages/Availability.jsx';
import CreateBookingFlow from '../modules/Homestay-Owner-Admin/pages/CreateBookingFlow.jsx';
import BookingRequests from '../modules/Homestay-Owner-Admin/pages/BookingRequests.jsx';
import BookingRequestDetails from '../modules/Homestay-Owner-Admin/pages/BookingRequestDetails.jsx';
import BookingConfirmationSlip from '../modules/Homestay-Owner-Admin/pages/BookingConfirmationSlip.jsx';
import BookingQuotation from '../modules/Homestay-Owner-Admin/pages/BookingQuotation.jsx';
import ManagePayments from '../modules/Homestay-Owner-Admin/pages/ManagePayments.jsx';
import { HomestayOwnerProtectedRoute } from './routeGuards.jsx';

export const getHomestayOwnerRoutes = () => (
  <Route path="/homestay-owner" element={<HomestayOwnerProtectedRoute><OwnerLayout /></HomestayOwnerProtectedRoute>}>
    <Route index element={<Navigate to="/homestay-owner/dashboard" replace />} />
    <Route path="dashboard" element={<OwnerDashboard />} />
    <Route path="profile" element={<OwnerProfile />} />
    <Route path="revenue" element={<OwnerRevenue />} />
    
    {/* Booking Wizard Route */}
    <Route path="bookings/create" element={<CreateBookingFlow />} />
    
    {/* Booking Requests Routes */}
    <Route path="bookings/requests" element={<BookingRequests />} />
    <Route path="bookings/requests/:requestId" element={<BookingRequestDetails />} />
    <Route path="bookings/confirmation-slip/:requestId" element={<BookingConfirmationSlip />} />
    <Route path="bookings/quotation/:requestId" element={<BookingQuotation />} />

    {/* Settings/Payments Route */}
    <Route path="settings/payments" element={<ManagePayments />} />
    
    {/* Availability Route */}
    <Route path="availability" element={<Availability />} />
    
    {/* Guest Routes */}
    <Route path="guests" element={<GuestListing />} />
    <Route path="guests/:guestId" element={<GuestDetails />} />
    
    {/* Inventory Sub-routes */}
    <Route path="inventory" element={<InventoryList />} />
    <Route path="inventory/add-property" element={<PropertySetupWizard />} />
    <Route path="inventory/setup-property" element={<PropertySetupWizard />} />
    <Route path="inventory/property/:propertyId" element={<PropertyDetails />} />
    <Route path="inventory/property/:propertyId/edit" element={<PropertySetupWizard />} />
    <Route path="inventory/property/:propertyId/rate-chart" element={<RateChart />} />
    <Route path="inventory/property/:propertyId/edit-room" element={<EditRoom />} />
    <Route path="inventory/property/:propertyId/edit-season" element={<EditSeason />} />
    
    <Route path="*" element={<Navigate to="/homestay-owner/dashboard" replace />} />
  </Route>
);
