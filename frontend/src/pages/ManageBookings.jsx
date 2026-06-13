import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Check, 
  User, 
  Mail, 
  Phone, 
  Home, 
  CreditCard, 
  X,
  FileText,
  BookOpen,
  Printer,
  Download,
  Share2,
  CalendarCheck,
  MapPin,
  Car,
  Compass,
  DollarSign as MoneyIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';

const API_BOOKINGS_URL = 'http://localhost:5005/api/dashboard/bookings-list';
const API_HOMESTAYS_URL = 'http://localhost:5005/api/dashboard/homestays-list';

export default function ManageBookings() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedId, setSelectedId] = useState(null);
  
  // Advanced Filter parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [payStatusFilter, setPayStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // 1. Fetch Bookings List
  const { data: bookingsList = [], isLoading: listLoading } = useQuery({
    queryKey: ['bookingsList', searchQuery, statusFilter, typeFilter, payStatusFilter, propertyFilter, regionFilter, startDateFilter, endDateFilter],
    queryFn: async () => {
      const response = await axios.get(API_BOOKINGS_URL, {
        params: {
          search: searchQuery,
          status: statusFilter,
          type: typeFilter,
          paymentStatus: payStatusFilter,
          property: propertyFilter,
          region: regionFilter,
          startDate: startDateFilter,
          endDate: endDateFilter
        }
      });
      return response.data;
    }
  });

  // 2. Fetch Booking KPI Stats
  const { data: stats = { totalBookings: 0, confirmedBookings: 0, pendingBookings: 0, cancelledCompletedBookings: 0 }, isLoading: statsLoading } = useQuery({
    queryKey: ['bookingsStats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BOOKINGS_URL}/stats`);
      return response.data;
    }
  });

  // 3. Fetch Single Booking Details
  const { data: bookingDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['bookingDetails', selectedId],
    queryFn: async () => {
      const response = await axios.get(`${API_BOOKINGS_URL}/${selectedId}`);
      return response.data;
    },
    enabled: !!selectedId && (viewMode === 'details' || viewMode === 'edit')
  });

  // 4. Fetch Homestays (for drop selectors)
  const { data: homestaysList = [] } = useQuery({
    queryKey: ['homestaysListSimple'],
    queryFn: async () => {
      const response = await axios.get(API_HOMESTAYS_URL);
      return response.data;
    }
  });

  // Dynamic filter lists derived from data
  const propertyFiltersList = useMemo(() => {
    const names = bookingsList.map(b => b.propertyDetails?.propertyName || b.sightseeingDetails?.packageName).filter(Boolean);
    return ['All', ...new Set(names)];
  }, [bookingsList]);

  const regionFiltersList = useMemo(() => {
    const regions = bookingsList.map(b => b.propertyDetails?.location?.split(',')[1]?.trim() || b.sightseeingDetails?.destination).filter(Boolean);
    return ['All', ...new Set(regions)];
  }, [bookingsList]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return bookingsList.slice(startIndex, startIndex + itemsPerPage);
  }, [bookingsList, currentPage]);

  const totalPages = Math.ceil(bookingsList.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, payStatusFilter, propertyFilter, regionFilter, startDateFilter, endDateFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newBooking) => {
      const response = await axios.post(API_BOOKINGS_URL, newBooking);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingsList']);
      queryClient.invalidateQueries(['bookingsStats']);
      setViewMode('list');
      alert('Booking transaction successfully generated.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to create booking');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updatedData }) => {
      const response = await axios.put(`${API_BOOKINGS_URL}/${id}`, updatedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingsList']);
      queryClient.invalidateQueries(['bookingsStats']);
      queryClient.invalidateQueries(['bookingDetails', selectedId]);
      setViewMode('list');
      setSelectedId(null);
      alert('Booking record details modified.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to update booking details');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.delete(`${API_BOOKINGS_URL}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingsList']);
      queryClient.invalidateQueries(['bookingsStats']);
      alert('Booking file successfully deleted from database.');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to delete booking');
    }
  });

  // Booking history logs of same customer
  const sameCustomerHistory = useMemo(() => {
    if (!bookingDetails) return [];
    return bookingsList.filter(b => 
      b._id !== bookingDetails._id && 
      (b.customer?.email === bookingDetails.customer?.email || b.customer?.mobile === bookingDetails.customer?.mobile)
    );
  }, [bookingDetails, bookingsList]);

  // Form State Setup
  const initialFormState = {
    bookingType: 'Homestay Booking',
    bookingStatus: 'Pending',
    paymentStatus: 'Pending',
    amount: 0,
    checkInDate: '',
    checkOutDate: '',
    bookingDate: new Date().toISOString().split('T')[0],
    bookingSource: 'Super Admin Portal',
    customer: {
      name: '',
      email: '',
      mobile: '',
      whatsApp: '',
      address: '',
      registrationDate: new Date().toISOString().split('T')[0]
    },
    guests: { total: 1, adults: 1, children: 0 },
    pricing: {
      bookingAmount: 0,
      discount: 0,
      tax: 0,
      convenienceFee: 120,
      paidAmount: 0,
      pendingAmount: 0,
      refundAmount: 0,
      finalAmount: 0
    },
    paymentDetails: {
      method: 'UPI',
      transactionId: '',
      paymentDate: '',
      paymentStatus: 'Pending'
    },
    propertyDetails: {
      propertyId: '',
      propertyName: '',
      ownerName: '',
      location: '',
      roomCategory: 'Standard',
      roomNumber: '',
      mealPlan: 'EP',
      season: 'Off Season'
    },
    rideDetails: {
      rideId: '',
      driverName: '',
      vehicle: '',
      pickup: '',
      drop: '',
      travelDate: ''
    },
    sightseeingDetails: {
      packageName: '',
      destination: '',
      duration: 'Full Day',
      guideAssigned: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Auto-calculate final/pending sums on form edits
  useEffect(() => {
    const bookingAmount = Number(formData.pricing?.bookingAmount) || 0;
    const discount = Number(formData.pricing?.discount) || 0;
    const convenienceFee = Number(formData.pricing?.convenienceFee) || 0;
    const tax = Math.round((bookingAmount - discount) * 0.12);
    const finalAmount = bookingAmount - discount + tax + convenienceFee;
    const paidAmount = Number(formData.pricing?.paidAmount) || 0;
    const refundAmount = Number(formData.pricing?.refundAmount) || 0;
    const pendingAmount = finalAmount - paidAmount - refundAmount;

    setFormData(prev => ({
      ...prev,
      amount: finalAmount,
      pricing: {
        ...prev.pricing,
        tax,
        finalAmount,
        pendingAmount
      }
    }));
  }, [formData.pricing?.bookingAmount, formData.pricing?.discount, formData.pricing?.convenienceFee, formData.pricing?.paidAmount, formData.pricing?.refundAmount]);

  // Edit action prefill
  const handleEditClick = (booking) => {
    setSelectedId(booking._id);
    setFormData({
      bookingType: booking.bookingType || 'Homestay Booking',
      bookingStatus: booking.bookingStatus || 'Pending',
      paymentStatus: booking.paymentStatus || 'Pending',
      amount: booking.amount || 0,
      checkInDate: booking.checkInDate ? new Date(booking.checkInDate).toISOString().split('T')[0] : '',
      checkOutDate: booking.checkOutDate ? new Date(booking.checkOutDate).toISOString().split('T')[0] : '',
      bookingDate: booking.bookingDate ? new Date(booking.bookingDate).toISOString().split('T')[0] : '',
      bookingSource: booking.bookingSource || 'Super Admin Portal',
      customer: {
        name: booking.customer?.name || '',
        email: booking.customer?.email || '',
        mobile: booking.customer?.mobile || '',
        whatsApp: booking.customer?.whatsApp || '',
        address: booking.customer?.address || '',
        registrationDate: booking.customer?.registrationDate ? new Date(booking.customer?.registrationDate).toISOString().split('T')[0] : ''
      },
      guests: {
        total: booking.guests?.total || 1,
        adults: booking.guests?.adults || 1,
        children: booking.guests?.children || 0
      },
      pricing: {
        bookingAmount: booking.pricing?.bookingAmount || 0,
        discount: booking.pricing?.discount || 0,
        tax: booking.pricing?.tax || 0,
        convenienceFee: booking.pricing?.convenienceFee || 120,
        paidAmount: booking.pricing?.paidAmount || 0,
        pendingAmount: booking.pricing?.pendingAmount || 0,
        refundAmount: booking.pricing?.refundAmount || 0,
        finalAmount: booking.pricing?.finalAmount || 0
      },
      paymentDetails: {
        method: booking.paymentDetails?.method || 'UPI',
        transactionId: booking.paymentDetails?.transactionId || '',
        paymentDate: booking.paymentDetails?.paymentDate ? new Date(booking.paymentDetails?.paymentDate).toISOString().split('T')[0] : '',
        paymentStatus: booking.paymentDetails?.paymentStatus || 'Pending'
      },
      propertyDetails: {
        propertyId: booking.propertyDetails?.propertyId || '',
        propertyName: booking.propertyDetails?.propertyName || '',
        ownerName: booking.propertyDetails?.ownerName || '',
        location: booking.propertyDetails?.location || '',
        roomCategory: booking.propertyDetails?.roomCategory || 'Standard',
        roomNumber: booking.propertyDetails?.roomNumber || '',
        mealPlan: booking.propertyDetails?.mealPlan || 'EP',
        season: booking.propertyDetails?.season || 'Off Season'
      },
      rideDetails: {
        rideId: booking.rideDetails?.rideId || '',
        driverName: booking.rideDetails?.driverName || '',
        vehicle: booking.rideDetails?.vehicle || '',
        pickup: booking.rideDetails?.pickup || '',
        drop: booking.rideDetails?.drop || '',
        travelDate: booking.rideDetails?.travelDate ? new Date(booking.rideDetails?.travelDate).toISOString().split('T')[0] : ''
      },
      sightseeingDetails: {
        packageName: booking.sightseeingDetails?.packageName || '',
        destination: booking.sightseeingDetails?.destination || '',
        duration: booking.sightseeingDetails?.duration || 'Full Day',
        guideAssigned: booking.sightseeingDetails?.guideAssigned || ''
      }
    });
    setViewMode('edit');
  };

  // Submit Handler
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (viewMode === 'add') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: selectedId, updatedData: formData });
    }
  };

  // Status-driven action helpers (invoked from Quick Actions card)
  const triggerStatusAction = (newBookingStatus, newPaymentStatus = null) => {
    if (!bookingDetails) return;
    
    const patchPayload = {};
    if (newBookingStatus) patchPayload.bookingStatus = newBookingStatus;
    if (newPaymentStatus) patchPayload.paymentStatus = newPaymentStatus;

    // Handle checkin checkout rules in payload setup
    if (newBookingStatus === 'Checked Out' || newBookingStatus === 'Completed') {
      if (bookingDetails.bookingStatus !== 'Checked In') {
        alert('Workflow Constraint: Check-Out can only occur if the status is currently Checked In.');
        return;
      }
    }

    updateMutation.mutate({ id: bookingDetails._id, updatedData: patchPayload });
  };

  const triggerRefundAction = () => {
    if (!bookingDetails) return;
    if ((bookingDetails.pricing?.paidAmount || 0) <= 0) {
      alert('Workflow Constraint: Refunds are only available if a payment has been received.');
      return;
    }

    const patchPayload = {
      paymentStatus: 'Refunded',
      pricing: {
        refundAmount: bookingDetails.pricing.paidAmount,
        pendingAmount: 0
      }
    };
    updateMutation.mutate({ id: bookingDetails._id, updatedData: patchPayload });
  };

  const appendTimelineActionLog = (activityName) => {
    if (!bookingDetails) return;
    const timeline = [...(bookingDetails.timeline || [])];
    timeline.push({
      activity: activityName,
      timestamp: new Date(),
      createdBy: 'Super Admin'
    });

    updateMutation.mutate({ id: bookingDetails._id, updatedData: { timeline } });
  };

  // Document generators (Simulated Downloads)
  const handleDownloadInvoice = (booking) => {
    const text = `
======================================================
              WOW GATEWAYS - BILLING INVOICE
======================================================
Invoice ID: INV-${booking.bookingId}
Booking Reference: ${booking.bookingId}
Booking Date: ${new Date(booking.bookingDate).toLocaleDateString()}
Creation Date: ${new Date(booking.createdAt).toLocaleDateString()}

CUSTOMER DETAILS:
Name: ${booking.customer?.name || 'N/A'}
Contact Mobile: ${booking.customer?.mobile || 'N/A'}
Email: ${booking.customer?.email || 'N/A'}
WhatsApp: ${booking.customer?.whatsApp || 'N/A'}
Address: ${booking.customer?.address || 'N/A'}

SERVICE DETAILS:
Booking Type: ${booking.bookingType}
Stay Dates: ${new Date(booking.checkInDate).toLocaleDateString()} to ${new Date(booking.checkOutDate).toLocaleDateString()}
Total Guests: ${booking.guests?.total || 1} (${booking.guests?.adults || 1} Adults, ${booking.guests?.children || 0} Children)

${booking.propertyDetails?.propertyName ? `Homestay Name: ${booking.propertyDetails.propertyName}
Allocated Room: ${booking.propertyDetails.roomNumber} (${booking.propertyDetails.roomCategory})
Meal Plan: ${booking.propertyDetails.mealPlan}` : ''}
${booking.rideDetails?.rideId ? `Ride Reference: ${booking.rideDetails.rideId}
Cab Driver: ${booking.rideDetails.driverName}
Vehicle Class: ${booking.rideDetails.vehicle}
Route: ${booking.rideDetails.pickup} -> ${booking.rideDetails.drop}` : ''}

PRICING BILLING SUMMARY:
Base Booking Fee: INR ${booking.pricing?.bookingAmount || 0}
Applied Discounts: INR ${booking.pricing?.discount || 0}
Service tax (12%): INR ${booking.pricing?.tax || 0}
Convenience Charge: INR ${booking.pricing?.convenienceFee || 0}
------------------------------------------------------
FINAL DUE AMOUNT: INR ${booking.pricing?.finalAmount || booking.amount}
PAID AMOUNT: INR ${booking.pricing?.paidAmount || 0}
PENDING AMOUNT: INR ${booking.pricing?.pendingAmount || 0}
REFUNDED AMOUNT: INR ${booking.pricing?.refundAmount || 0}
======================================================
`;
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Invoice-${booking.bookingId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alert('Invoice downloaded successfully.');
  };

  const handlePrintVoucher = (booking) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher - ${booking.bookingId}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; line-height: 1.6; }
            .badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 6px; }
            .badge-success { background: #d1fae5; color: #065f46; }
            .badge-warning { background: #fef3c7; color: #92400e; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 22px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .section-title { font-size: 13px; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-top: 25px; margin-bottom: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
            .details-block { padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; padding: 8px; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
            td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">WOW GATEWAYS - TRAVEL VOUCHER</div>
            <div style="font-size: 12px; font-weight: bold; color: #64748b; margin-top: 4px;">Voucher Ref: VCH-${booking.bookingId}</div>
          </div>
          
          <div class="grid">
            <div><strong>Booking ID:</strong> ${booking.bookingId}</div>
            <div><strong>Booking Type:</strong> ${booking.bookingType}</div>
            <div><strong>Check-In Date:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</div>
            <div><strong>Check-Out Date:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</div>
            <div><strong>Booking Status:</strong> <span class="badge badge-success">${booking.bookingStatus}</span></div>
            <div><strong>Payment Status:</strong> <span class="badge badge-warning">${booking.paymentStatus}</span></div>
          </div>

          <div class="section-title">Customer Details</div>
          <div class="details-block">
            <strong>Name:</strong> ${booking.customer?.name || 'N/A'}<br>
            <strong>Mobile:</strong> ${booking.customer?.mobile || 'N/A'}<br>
            <strong>Email:</strong> ${booking.customer?.email || 'N/A'}<br>
            <strong>Guests count:</strong> ${booking.guests?.total || 1} (${booking.guests?.adults || 1} Adults, ${booking.guests?.children || 0} Kids)
          </div>

          <div class="section-title">Allocation Configuration</div>
          <div class="details-block">
            ${booking.propertyDetails?.propertyName ? `
              <strong>Homestay Allocated:</strong> ${booking.propertyDetails.propertyName}<br>
              <strong>Room Class:</strong> ${booking.propertyDetails.roomCategory}<br>
              <strong>Room Number:</strong> ${booking.propertyDetails.roomNumber}<br>
              <strong>Meal Plan Plan:</strong> ${booking.propertyDetails.mealPlan}
            ` : ''}
            ${booking.rideDetails?.rideId ? `
              <strong>Ride Reference ID:</strong> ${booking.rideDetails.rideId}<br>
              <strong>Assigned Driver:</strong> ${booking.rideDetails.driverName}<br>
              <strong>Vehicle Details:</strong> ${booking.rideDetails.vehicle}<br>
              <strong>Pickup Point:</strong> ${booking.rideDetails.pickup}<br>
              <strong>Drop Point:</strong> ${booking.rideDetails.drop}
            ` : ''}
            ${booking.sightseeingDetails?.packageName ? `
              <strong>Tour Package:</strong> ${booking.sightseeingDetails.packageName}<br>
              <strong>Sightseeing Destination:</strong> ${booking.sightseeingDetails.destination}<br>
              <strong>Tour Duration:</strong> ${booking.sightseeingDetails.duration}<br>
              <strong>Guide Assigned:</strong> ${booking.sightseeingDetails.guideAssigned}
            ` : ''}
          </div>

          <div class="section-title">Charges Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Booking Amount</th>
                <th>Discount</th>
                <th>Tax (12%)</th>
                <th>Convenience Fee</th>
                <th>Amount Paid</th>
                <th>Amount Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INR ${booking.pricing?.bookingAmount || 0}</td>
                <td>INR ${booking.pricing?.discount || 0}</td>
                <td>INR ${booking.pricing?.tax || 0}</td>
                <td>INR ${booking.pricing?.convenienceFee || 0}</td>
                <td>INR ${booking.pricing?.paidAmount || 0}</td>
                <td style="color: #ef4444;">INR ${booking.pricing?.pendingAmount || 0}</td>
              </tr>
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CSV Exporter
  const handleExportCSV = () => {
    let headers = "Booking ID,Creation Date,Booking Date,Customer Name,Contact Number,Booking Type,Property / Service Name,Amount Paid,Amount Due,Payment Status,Booking Status,Created By,Updated By\n";
    let rows = bookingsList.map(b => {
      const propName = b.propertyDetails?.propertyName || b.sightseeingDetails?.packageName || b.rideDetails?.rideId || 'N/A';
      return [
        b.bookingId,
        new Date(b.createdAt).toLocaleDateString(),
        new Date(b.bookingDate).toLocaleDateString(),
        b.customer?.name || b.customerName,
        b.customer?.mobile || b.customerMobile,
        b.bookingType,
        `"${propName.replace(/"/g, '""')}"`,
        b.pricing?.paidAmount || b.amount,
        b.pricing?.pendingAmount || 0,
        b.paymentStatus,
        b.bookingStatus,
        b.createdBy,
        b.updatedBy
      ].join(",");
    }).join("\n");
    
    const element = document.createElement("a");
    const file = new Blob([headers + rows], {type: 'text/csv'});
    element.href = URL.createObjectURL(file);
    element.download = `BookingsExport-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alert('Bookings exported to CSV.');
  };

  // Status colors helper
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Upcoming': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Checked In': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'Checked Out': return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  const getPayStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Partial': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Pending': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'Refunded': return 'bg-slate-100 text-slate-700 border border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-1">
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight flex items-center gap-2">
                <BookOpen className="text-blue-500 w-6 h-6" />
                <span>Manage Bookings</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Monitor, manage, and track all booking transactions made across stays, cabs, and sightseeing guides.
              </p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Download size={13} className="text-slate-455" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => {
                  setFormData(initialFormState);
                  setSelectedId(null);
                  setViewMode('add');
                }}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Create Booking</span>
              </button>
            </div>
          </div>

          {/* KPI metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <MetricCard
              title="Total Bookings"
              value={stats.totalBookings}
              icon={BookOpen}
              iconBgColor="bg-blue-500/10"
              iconColor="text-blue-605"
              bgColor="bg-[#edf4ff]"
              loading={statsLoading}
            />
            <MetricCard
              title="Confirmed Bookings"
              value={stats.confirmedBookings}
              icon={CheckCircle}
              iconBgColor="bg-emerald-500/10"
              iconColor="text-emerald-650"
              bgColor="bg-[#ecfbf3]"
              loading={statsLoading}
            />
            <MetricCard
              title="Pending Approval"
              value={stats.pendingBookings}
              icon={Clock}
              iconBgColor="bg-amber-500/10"
              iconColor="text-amber-650"
              bgColor="bg-[#fff8f0]"
              loading={statsLoading}
            />
            <MetricCard
              title="Cancelled / Completed"
              value={stats.cancelledCompletedBookings}
              icon={XCircle}
              iconBgColor="bg-indigo-500/10"
              iconColor="text-indigo-650"
              bgColor="bg-[#f8f0ff]"
              loading={statsLoading}
            />
          </div>

          {/* Search bar & Advanced filters */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full lg:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Booking ID, Guest, Mobile, Property..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Advanced select parameters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full lg:w-auto">
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                  >
                    <option value="All">Booking Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show">No Show</option>
                  </select>
                </div>

                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                  >
                    <option value="All">Booking Type</option>
                    <option value="Homestay Booking">Homestay</option>
                    <option value="Hotel Booking">Hotel</option>
                    <option value="Ride Booking">Cab / Ride</option>
                    <option value="Sightseeing Booking">Sightseeing</option>
                    <option value="Tour Package Booking">Tour Package</option>
                  </select>
                </div>

                <div>
                  <select
                    value={payStatusFilter}
                    onChange={(e) => setPayStatusFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                  >
                    <option value="All">Payment Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                  >
                    <option value="All">Property/Service</option>
                    {propertyFiltersList.filter(p => p !== 'All').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">From</span>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="bg-transparent border-0 text-[10px] font-semibold text-slate-700 focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">To</span>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="bg-transparent border-0 text-[10px] font-semibold text-slate-700 focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters tags trigger */}
            {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All' || payStatusFilter !== 'All' || propertyFilter !== 'All' || startDateFilter || endDateFilter) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">Filters Active:</span>
                <button 
                  onClick={() => {
                    setSearchQuery(''); setStatusFilter('All'); setTypeFilter('All'); setPayStatusFilter('All');
                    setPropertyFilter('All'); setStartDateFilter(''); setEndDateFilter('');
                  }}
                  className="text-red-500 hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* Desktop Bookings list table */}
          <div className="hidden lg:block bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-4.5 px-5">ID & Type</th>
                    <th className="py-4.5 px-5">Dates (Create/Booking)</th>
                    <th className="py-4.5 px-5">Guest details</th>
                    <th className="py-4.5 px-5">Service / Allocation</th>
                    <th className="py-4.5 px-5 text-right">Paid Amount</th>
                    <th className="py-4.5 px-5 text-right">Amount Due</th>
                    <th className="py-4.5 px-5 text-center">Payment Status</th>
                    <th className="py-4.5 px-5 text-center">Booking Status</th>
                    <th className="py-4.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
                        <div className="flex justify-center gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 bg-blue-650 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-blue-650 rounded-full animate-bounce delay-75" />
                          <span className="w-1.5 h-1.5 bg-blue-650 rounded-full animate-bounce delay-150" />
                        </div>
                      </td>
                    </tr>
                  ) : bookingsList.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-450 font-semibold">
                        No booking transactions found matching active filter parameters.
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => {
                      const propName = b.propertyDetails?.propertyName || b.sightseeingDetails?.packageName || b.rideDetails?.rideId || 'N/A';
                      
                      return (
                        <tr key={b._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 font-mono">{b.bookingId}</span>
                              <span className="font-extrabold text-slate-800 text-[11px] mt-0.5">{b.bookingType}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-500 text-[11px]">
                            <div className="flex flex-col">
                              <span>B: {new Date(b.bookingDate).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">C: {new Date(b.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-bold">{b.customer?.name || b.customerName}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">{b.customer?.mobile || b.customerMobile}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-600">
                            <div className="flex flex-col max-w-[150px] truncate">
                              <span className="font-bold truncate">{propName}</span>
                              {b.propertyDetails?.roomNumber && (
                                <span className="text-[10px] text-slate-400 mt-0.5">{b.propertyDetails.roomCategory} | Room {b.propertyDetails.roomNumber}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right font-mono text-emerald-650 font-bold">
                            ₹{(b.pricing?.paidAmount || b.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5 text-right font-mono text-rose-500 font-bold">
                            ₹{(b.pricing?.pendingAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${getPayStatusBadgeStyle(b.paymentStatus)}`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wide ${getStatusBadgeStyle(b.bookingStatus)}`}>
                              {b.bookingStatus}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => { setSelectedId(b._id); setViewMode('details'); }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleEditClick(b)}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDownloadInvoice(b)}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Download Invoice"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile responsive card list fallback */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {listLoading ? (
              <div className="py-12 text-center text-slate-400">
                <span className="text-xs font-bold">Loading booking items...</span>
              </div>
            ) : bookingsList.length === 0 ? (
              <div className="py-8 text-center text-slate-450 font-semibold bg-white rounded-2xl border border-slate-100">
                No booking records matching filter criteria.
              </div>
            ) : (
              paginatedBookings.map((b) => {
                const propName = b.propertyDetails?.propertyName || b.sightseeingDetails?.packageName || b.rideDetails?.rideId || 'N/A';
                return (
                  <div key={b._id} className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">{b.bookingId}</span>
                        <h4 className="font-extrabold text-slate-800 text-[13px] leading-snug">{b.bookingType}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold tracking-wide ${getStatusBadgeStyle(b.bookingStatus)}`}>
                          {b.bookingStatus}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold tracking-wide ${getPayStatusBadgeStyle(b.paymentStatus)}`}>
                          {b.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-650 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Guest</span>
                        {b.customer?.name || b.customerName}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Service Details</span>
                        {propName}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Travel / Check-In</span>
                        {new Date(b.checkInDate).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Paid Amount</span>
                        <span className="text-emerald-600 font-bold font-mono">₹{(b.pricing?.paidAmount || b.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-50 justify-end">
                      <button
                        onClick={() => { setSelectedId(b._id); setViewMode('details'); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Open details
                      </button>
                      <button
                        onClick={() => handleEditClick(b)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Showing <span className="text-slate-700 font-bold">{Math.min(bookingsList.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
              <span className="text-slate-700 font-bold">{Math.min(bookingsList.length, currentPage * itemsPerPage)}</span> of{' '}
              <span className="text-slate-750 font-black">{bookingsList.length}</span> transactions
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl disabled:opacity-40 transition-colors border border-slate-150 cursor-pointer"
              >
                <ChevronLeft size={14} className="stroke-[2.5]" />
              </button>
              <span className="flex items-center px-3 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl disabled:opacity-40 transition-colors border border-slate-150 cursor-pointer"
              >
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

        </motion.div>
      )}

      {/* 2. FORM VIEW (ADD / EDIT BOOKING) */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Discard form entries and go back?')) {
                    setViewMode('list');
                    setSelectedId(null);
                  }
                }}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-150"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {viewMode === 'add' ? 'Generate New Booking' : `Modify Booking: ${formData.bookingId}`}
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  Register customer and service parameters to catalog transactions.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1 & 2: General Form Data */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Guest Details */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Section 1: Customer Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Customer Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer?.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, name: e.target.value }
                        }))}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={formData.customer?.email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, email: e.target.value }
                        }))}
                        placeholder="customer@domain.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Mobile Contact *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer?.mobile}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, mobile: e.target.value, whatsApp: e.target.value }
                        }))}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={formData.customer?.whatsApp}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, whatsApp: e.target.value }
                        }))}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Customer Postal Address</label>
                      <textarea
                        value={formData.customer?.address}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customer: { ...prev.customer, address: e.target.value }
                        }))}
                        rows="2"
                        placeholder="Street, City, State..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Booking & Service Type details */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Section 2: Booking Type & Service Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Booking Type Class *</label>
                      <select
                        value={formData.bookingType}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingType: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="Homestay Booking">Homestay Booking</option>
                        <option value="Hotel Booking">Hotel Booking</option>
                        <option value="Ride Booking">Ride Booking</option>
                        <option value="Sightseeing Booking">Sightseeing Booking</option>
                        <option value="Tour Package Booking">Tour Package Booking</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Scheduled Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.checkInDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">End / Checkout Date</label>
                      <input
                        type="date"
                        required
                        value={formData.checkOutDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkOutDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Dynamic sections based on booking type selection */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl mt-4">
                    
                    {/* Stay (Homestay/Hotel) details */}
                    {(formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Select Property Allocation *</label>
                          <select
                            value={formData.propertyDetails?.propertyId}
                            onChange={(e) => {
                              const match = homestaysList.find(h => h._id === e.target.value);
                              if (match) {
                                setFormData(prev => ({
                                  ...prev,
                                  propertyDetails: {
                                    ...prev.propertyDetails,
                                    propertyId: match._id,
                                    propertyName: match.name,
                                    ownerName: match.ownerName,
                                    location: `${match.city}, ${match.region}`
                                  }
                                }));
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="">-- Choose Property --</option>
                            {homestaysList.map(h => (
                              <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Room Category</label>
                          <select
                            value={formData.propertyDetails?.roomCategory}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              propertyDetails: { ...prev.propertyDetails, roomCategory: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Super Deluxe">Super Deluxe</option>
                            <option value="Premium">Premium</option>
                            <option value="Family Suite">Family Suite</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Room Number Allocation</label>
                          <input
                            type="text"
                            value={formData.propertyDetails?.roomNumber}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              propertyDetails: { ...prev.propertyDetails, roomNumber: e.target.value }
                            }))}
                            placeholder="e.g. Room 102"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Meal Plan</label>
                          <select
                            value={formData.propertyDetails?.mealPlan}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              propertyDetails: { ...prev.propertyDetails, mealPlan: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="EP">EP (Room Only)</option>
                            <option value="CP">CP (Breakfast)</option>
                            <option value="MAP">MAP (Half Board)</option>
                            <option value="AP">AP (Full Board)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Season</label>
                          <select
                            value={formData.propertyDetails?.season}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              propertyDetails: { ...prev.propertyDetails, season: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="Peak Season">Peak Season</option>
                            <option value="Mid Season">Mid Season</option>
                            <option value="Off Season">Off Season</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Ride Details class */}
                    {formData.bookingType === 'Ride Booking' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Ride ID Reference</label>
                          <input
                            type="text"
                            value={formData.rideDetails?.rideId}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              rideDetails: { ...prev.rideDetails, rideId: e.target.value }
                            }))}
                            placeholder="e.g. RD-204"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Driver Assigned</label>
                          <input
                            type="text"
                            value={formData.rideDetails?.driverName}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              rideDetails: { ...prev.rideDetails, driverName: e.target.value }
                            }))}
                            placeholder="Driver Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Vehicle Description</label>
                          <input
                            type="text"
                            value={formData.rideDetails?.vehicle}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              rideDetails: { ...prev.rideDetails, vehicle: e.target.value }
                            }))}
                            placeholder="e.g. Toyota Innova (MH-12...)"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Pickup</label>
                            <input
                              type="text"
                              value={formData.rideDetails?.pickup}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rideDetails: { ...prev.rideDetails, pickup: e.target.value }
                              }))}
                              placeholder="Pickup location"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Drop</label>
                            <input
                              type="text"
                              value={formData.rideDetails?.drop}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                rideDetails: { ...prev.rideDetails, drop: e.target.value }
                              }))}
                              placeholder="Drop location"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sightseeing details class */}
                    {(formData.bookingType === 'Sightseeing Booking' || formData.bookingType === 'Tour Package Booking') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Package Name</label>
                          <input
                            type="text"
                            value={formData.sightseeingDetails?.packageName}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              sightseeingDetails: { ...prev.sightseeingDetails, packageName: e.target.value }
                            }))}
                            placeholder="e.g. Sikkim Scenic Sunrise Package"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Assigned Tourist Guide</label>
                          <input
                            type="text"
                            value={formData.sightseeingDetails?.guideAssigned}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              sightseeingDetails: { ...prev.sightseeingDetails, guideAssigned: e.target.value }
                            }))}
                            placeholder="Guide Name"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold text-slate-450 uppercase block mb-1">Package Duration</label>
                          <select
                            value={formData.sightseeingDetails?.duration}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              sightseeingDetails: { ...prev.sightseeingDetails, duration: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                          >
                            <option value="Half Day">Half Day (4 Hours)</option>
                            <option value="Full Day Tour">Full Day Tour</option>
                            <option value="2 Days / 1 Night">2 Days / 1 Night</option>
                            <option value="3 Days / 2 Nights">3 Days / 2 Nights</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Pricing Summary & Statuses */}
              <div className="space-y-6">
                
                {/* Cost summary sheet */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Pricing Summary
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Base booking Amount *</label>
                      <input
                        type="number"
                        value={formData.pricing?.bookingAmount || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, bookingAmount: Number(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Discount Coupon Deduct</label>
                      <input
                        type="number"
                        value={formData.pricing?.discount || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, discount: Number(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold text-slate-400">
                      <div>
                        Tax (12% Auto)
                        <span className="text-slate-850 font-bold block py-2 pl-3 bg-slate-50 border border-slate-150 rounded-xl text-xs mt-1">₹{formData.pricing?.tax}</span>
                      </div>
                      <div>
                        Convenience Fee
                        <input
                          type="number"
                          value={formData.pricing?.convenienceFee}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            pricing: { ...prev.pricing, convenienceFee: Number(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Paid Amount *</label>
                      <input
                        type="number"
                        value={formData.pricing?.paidAmount || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          pricing: { ...prev.pricing, paidAmount: Number(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      />
                    </div>

                    {viewMode === 'edit' && (
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Refund Amount</label>
                        <input
                          type="number"
                          value={formData.pricing?.refundAmount || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            pricing: { ...prev.pricing, refundAmount: Number(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        />
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-800">Final Calculated Price:</span>
                      <span className="text-lg font-black text-slate-900 font-mono">₹{formData.amount?.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                      <span>Pending Due:</span>
                      <span className="font-mono">₹{formData.pricing?.pendingAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Workflow States Box */}
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                    Workflow Statuses
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Booking Status</label>
                      <select
                        value={formData.bookingStatus}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingStatus: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Checked In">Checked In</option>
                        <option value="Checked Out">Checked Out</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="No Show">No Show</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Payment Status</label>
                      <select
                        value={formData.paymentStatus}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          paymentStatus: e.target.value,
                          paymentDetails: { ...prev.paymentDetails, paymentStatus: e.target.value } 
                        }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200 px-6 py-4.5 flex items-center justify-end gap-3 z-20 shadow-md">
              <button
                type="button"
                onClick={() => { setViewMode('list'); setSelectedId(null); }}
                className="px-4.5 py-2.5 bg-white border border-slate-250 text-slate-650 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Discard Entries
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-200"
              >
                <Check size={14} className="stroke-[3.5] inline mr-1" />
                <span>{viewMode === 'add' ? 'Register Booking' : 'Modify Record'}</span>
              </button>
            </div>
          </form>

        </motion.div>
      )}

      {/* 3. BOOKING DETAILS PROFILE VIEW */}
      {viewMode === 'details' && selectedId && bookingDetails && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-150"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{bookingDetails.bookingId}</span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                  <span className="text-xs font-bold text-slate-500">{bookingDetails.bookingType}</span>
                </div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  Customer: {bookingDetails.customer?.name || bookingDetails.customerName}
                </h2>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => handlePrintVoucher(bookingDetails)}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Printer size={13} className="text-slate-500" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => handleDownloadInvoice(bookingDetails)}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download size={13} className="text-slate-500" />
                <span>Download Invoice</span>
              </button>
              {bookingDetails.bookingStatus !== 'Completed' && bookingDetails.bookingStatus !== 'Cancelled' && (
                <>
                  <button
                    onClick={() => handleEditClick(bookingDetails)}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit Booking</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Mark this booking transaction as Cancelled?')) {
                        triggerStatusAction('Cancelled');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <XCircle size={13} />
                    <span>Cancel booking</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Details sections columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Customer card & Booking info card */}
            <div className="space-y-6">
              
              {/* Customer Information Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Customer Profile
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Name & ID</span>
                    <span className="text-slate-800 font-extrabold">{bookingDetails.customer?.name || bookingDetails.customerName}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">#{bookingDetails.customer?.customerId || 'cust-101'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Contact Numbers</span>
                    <span className="text-slate-800 font-extrabold block">{bookingDetails.customer?.mobile || bookingDetails.customerMobile}</span>
                    <span className="text-[10px] text-slate-450 block mt-0.5">WhatsApp: {bookingDetails.customer?.whatsApp || bookingDetails.customerMobile}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Email Address</span>
                    <span className="text-slate-800 font-extrabold">{bookingDetails.customer?.email || bookingDetails.customerEmail || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Postal Address</span>
                    <span className="text-slate-700 font-bold leading-normal">{bookingDetails.customer?.address || 'N/A'}</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <a 
                      href={`tel:${bookingDetails.customer?.mobile || bookingDetails.customerMobile}`}
                      className="flex-1 text-center py-2 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition-colors border border-slate-200"
                    >
                      Call Customer
                    </a>
                    <a 
                      href={`https://wa.me/${(bookingDetails.customer?.whatsApp || bookingDetails.customerMobile || '').replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors border border-emerald-100"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Booking Information Card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Booking Reference Info
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold block">Reference ID</span>
                      <span className="text-slate-850 font-extrabold font-mono">{bookingDetails.bookingId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Source</span>
                      <span className="text-slate-700 font-bold">{bookingDetails.bookingSource || 'Direct Portal'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold block">Booking Date</span>
                      <span className="text-slate-700 font-bold">{new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Registry Date</span>
                      <span className="text-slate-700 font-bold">{new Date(bookingDetails.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold block">Check-In / Travel</span>
                      <span className="text-slate-700 font-bold text-blue-600">{new Date(bookingDetails.checkInDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Check-Out</span>
                      <span className="text-slate-700 font-bold text-rose-500">{new Date(bookingDetails.checkOutDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Registered Capacity</span>
                    <span className="text-slate-700 font-bold">
                      {bookingDetails.guests?.total || 1} Guests ({bookingDetails.guests?.adults || 1} Adults, {bookingDetails.guests?.children || 0} Kids)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Service details & Timeline & customer booking history */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Conditional Service details card */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Service / Allocation Details
                </h3>

                {/* Homestay or Hotel details layout */}
                {(bookingDetails.bookingType === 'Homestay Booking' || bookingDetails.bookingType === 'Hotel Booking') && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Property Name & Reference</span>
                      <span className="text-slate-800 font-extrabold text-sm">{bookingDetails.propertyDetails?.propertyName || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {bookingDetails.propertyDetails?.propertyId || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Property Owner</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.propertyDetails?.ownerName || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Location Region</span>
                      <span className="text-slate-700 font-bold">{bookingDetails.propertyDetails?.location || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-slate-400 font-bold block">Room Class</span>
                        <span className="text-slate-850 font-bold">{bookingDetails.propertyDetails?.roomCategory || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Room Number</span>
                        <span className="text-slate-850 font-bold">{bookingDetails.propertyDetails?.roomNumber || 'N/A'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Meal Plan Option</span>
                      <span className="text-slate-850 font-bold text-indigo-650">{bookingDetails.propertyDetails?.mealPlan || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Season Pricing Sheet</span>
                      <span className="text-slate-850 font-bold">{bookingDetails.propertyDetails?.season || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Cab Ride details layout */}
                {bookingDetails.bookingType === 'Ride Booking' && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Ride ID Reference</span>
                      <span className="text-slate-800 font-extrabold text-sm font-mono">{bookingDetails.rideDetails?.rideId || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Assigned Driver</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.rideDetails?.driverName || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Cab Vehicle Model</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.rideDetails?.vehicle || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Travel Date</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.rideDetails?.travelDate ? new Date(bookingDetails.rideDetails.travelDate).toLocaleDateString() : 'N/A'}</span>
                    </div>

                    <div className="col-span-2 p-3 bg-slate-50 border border-slate-150 rounded-xl grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 font-bold block">Pickup Location</span>
                        <span className="text-slate-800 font-bold">{bookingDetails.rideDetails?.pickup || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Drop Destination</span>
                        <span className="text-slate-800 font-bold">{bookingDetails.rideDetails?.drop || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sightseeing Package details layout */}
                {(bookingDetails.bookingType === 'Sightseeing Booking' || bookingDetails.bookingType === 'Tour Package Booking') && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block">Package Class Name</span>
                      <span className="text-slate-800 font-extrabold text-sm">{bookingDetails.sightseeingDetails?.packageName || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Package Destinations</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.sightseeingDetails?.destination || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Package Duration</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.sightseeingDetails?.duration || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Assigned Guide</span>
                      <span className="text-slate-800 font-bold">{bookingDetails.sightseeingDetails?.guideAssigned || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking activity timeline */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Booking Activity Audit Timeline
                </h3>

                <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-5">
                  {bookingDetails.timeline?.map((item, idx) => (
                    <div key={idx} className="relative text-xs">
                      {/* Timeline circle point */}
                      <span className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border border-white" />
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-slate-800">{item.activity}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-450 mt-0.5 block">Triggered by: {item.createdBy || 'System'}</span>
                    </div>
                  ))}

                  {(!bookingDetails.timeline || bookingDetails.timeline.length === 0) && (
                    <div className="text-xs text-slate-400 font-bold">No timeline activity log found.</div>
                  )}
                </div>
              </div>

              {/* Same customer booking history */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Customer Booking History
                </h3>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase">
                        <th className="p-2.5">Booking ID</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-center">Check-In</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {sameCustomerHistory.map(hist => (
                        <tr key={hist._id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono">{hist.bookingId}</td>
                          <td className="p-2.5">{hist.bookingType}</td>
                          <td className="p-2.5 text-center font-normal">{new Date(hist.checkInDate).toLocaleDateString()}</td>
                          <td className="p-2.5 text-right font-mono">₹{hist.amount?.toLocaleString()}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getStatusBadgeStyle(hist.bookingStatus)}`}>
                              {hist.bookingStatus}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => { setSelectedId(hist._id); }}
                              className="text-blue-600 hover:underline"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}

                      {sameCustomerHistory.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-slate-400 font-semibold">
                            No other historical booking transactions registered for this guest.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Payments summary & Payments info & quick actions panel */}
            <div className="space-y-6">
              
              {/* Payment Summary card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Pricing summary
                </h3>

                <div className="space-y-2.5 text-xs font-semibold text-slate-650">
                  <div className="flex justify-between">
                    <span>Base Fare Amount:</span>
                    <span className="font-mono text-slate-800 font-bold">₹{(bookingDetails.pricing?.bookingAmount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Discounts Deduct:</span>
                    <span className="font-mono text-slate-800 font-bold">- ₹{(bookingDetails.pricing?.discount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Service tax (12%):</span>
                    <span className="font-mono text-slate-800 font-bold">₹{(bookingDetails.pricing?.tax || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Convenience Fee:</span>
                    <span className="font-mono text-slate-800 font-bold">₹{(bookingDetails.pricing?.convenienceFee || 0).toLocaleString()}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-extrabold text-slate-800">
                    <span>Final Calculated Sum:</span>
                    <span className="font-mono text-[14px]">₹{(bookingDetails.pricing?.finalAmount || bookingDetails.amount || 0).toLocaleString()}</span>
                  </div>

                  <div className="border-t border-slate-50 pt-2 flex justify-between items-center text-xs font-bold text-emerald-650">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono">₹{(bookingDetails.pricing?.paidAmount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                    <span>Pending Balance Due:</span>
                    <span className="font-mono">₹{(bookingDetails.pricing?.pendingAmount || 0).toLocaleString()}</span>
                  </div>

                  {bookingDetails.pricing?.refundAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-slate-550 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span>Refunded Amount:</span>
                      <span className="font-mono">₹{bookingDetails.pricing.refundAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Payment Method Info
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Method Type</span>
                    <span className="text-slate-850 font-extrabold flex items-center gap-1.5 mt-0.5">
                      <CreditCard size={13} className="text-slate-400" />
                      {bookingDetails.paymentDetails?.method || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Transaction ID Reference</span>
                    <span className="text-slate-850 font-extrabold font-mono text-[11px] mt-0.5">{bookingDetails.paymentDetails?.transactionId || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold block">Payment Settlement Date</span>
                    <span className="text-slate-700 font-bold">
                      {bookingDetails.paymentDetails?.paymentDate ? new Date(bookingDetails.paymentDetails.paymentDate).toLocaleString() : 'Pending Date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel card */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
                  Quick Actions Panel
                </h3>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => appendTimelineActionLog('Confirmation Sent')}
                    className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 cursor-pointer transition-colors"
                  >
                    Send Confirmation
                  </button>

                  <button
                    onClick={() => appendTimelineActionLog('Invoice Resent')}
                    className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 cursor-pointer transition-colors"
                  >
                    Resend Invoice
                  </button>

                  {bookingDetails.bookingStatus === 'Confirmed' && (
                    <button
                      onClick={() => triggerStatusAction('Checked In')}
                      className="w-full text-center py-2 bg-indigo-50 hover:bg-indigo-150 border border-indigo-200 rounded-xl font-bold text-xs text-indigo-700 cursor-pointer transition-colors"
                    >
                      Mark Check-In
                    </button>
                  )}

                  {bookingDetails.bookingStatus === 'Checked In' && (
                    <button
                      onClick={() => triggerStatusAction('Completed')}
                      className="w-full text-center py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-xl font-bold text-xs text-emerald-700 cursor-pointer transition-colors"
                    >
                      Mark Check-Out / Complete
                    </button>
                  )}

                  {bookingDetails.paymentStatus !== 'Refunded' && (bookingDetails.pricing?.paidAmount || 0) > 0 && (
                    <button
                      onClick={triggerRefundAction}
                      className="w-full text-center py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs text-rose-700 cursor-pointer transition-colors"
                    >
                      Issue Refund
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
