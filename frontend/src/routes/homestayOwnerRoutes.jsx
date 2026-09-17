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
import BookingTaxInvoice from '../modules/Homestay-Owner-Admin/pages/BookingTaxInvoice.jsx';
import ManageBookings from '../modules/Homestay-Owner-Admin/pages/ManageBookings.jsx';
import ManagePayments from '../modules/Homestay-Owner-Admin/pages/ManagePayments.jsx';
import ComingSoon from '../modules/Homestay-Owner-Admin/pages/ComingSoon.jsx';
import Coupons from '../modules/Homestay-Owner-Admin/pages/Coupons.jsx';
import StaffManagement from '../modules/Homestay-Owner-Admin/pages/StaffManagement.jsx';
import Notifications from '../modules/Homestay-Owner-Admin/pages/Notifications.jsx';
import ManageSubscription from '../modules/Homestay-Owner-Admin/pages/ManageSubscription.jsx';
import { HomestayOwnerProtectedRoute } from './routeGuards.jsx';

export const getHomestayOwnerRoutes = () => (
  <Route path="/homestay-owner" element={<HomestayOwnerProtectedRoute><OwnerLayout /></HomestayOwnerProtectedRoute>}>
    <Route index element={<Navigate to="/homestay-owner/dashboard" replace />} />
    <Route path="dashboard" element={<OwnerDashboard />} />
    <Route path="profile" element={<OwnerProfile />} />
    <Route path="revenue" element={<OwnerRevenue />} />
    
    {/* Manage Bookings Routes */}
    <Route path="bookings/manage" element={<ManageBookings />} />
    <Route path="bookings" element={<Navigate to="/homestay-owner/bookings/manage" replace />} />

    {/* Booking Wizard Route */}
    <Route path="bookings/create" element={<CreateBookingFlow />} />
    
    {/* Booking Requests Routes */}
    <Route path="bookings/requests" element={<BookingRequests />} />
    <Route path="bookings/requests/:requestId" element={<BookingRequestDetails />} />
    <Route path="bookings/confirmation-slip/:requestId" element={<BookingConfirmationSlip />} />
    <Route path="bookings/:requestId/confirmation-slip" element={<BookingConfirmationSlip />} />
    <Route path="bookings/quotation/:requestId" element={<BookingQuotation />} />
    <Route path="bookings/:requestId/quotation" element={<BookingQuotation />} />
    <Route path="bookings/invoice/:requestId" element={<BookingTaxInvoice />} />
    <Route path="bookings/:requestId/invoice" element={<BookingTaxInvoice />} />

    {/* Settings/Payments Route */}
    <Route path="settings/payments" element={<ManagePayments />} />
    
    {/* Availability Route */}
    <Route path="availability" element={<Availability />} />
    
    {/* Guest Routes */}
    <Route path="guests" element={<GuestListing />} />
    <Route path="guests/:guestId" element={<GuestDetails />} />
    
    {/* Other Routes */}
    <Route path="staff" element={<StaffManagement />} />
    <Route path="notifications" element={<Notifications />} />
    <Route path="signatures-stamps" element={<ComingSoon title="Signatures / Stamps / Logo" />} />
    <Route path="coupons" element={<Coupons />} />
    <Route path="subscription" element={<ManageSubscription />} />

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
