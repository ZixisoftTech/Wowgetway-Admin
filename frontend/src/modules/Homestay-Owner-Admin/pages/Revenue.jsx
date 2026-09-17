import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft,
  CircleDollarSign,
  TrendingUp,
  Download,
  Calendar,
  ChevronDown,
  Building2,
  RefreshCw,
  Printer,
  CheckCircle2,
  CheckCircle,
  Clock,
  Search,
  FileText,
  Receipt,
  Eye,
  CreditCard,
  Wallet,
  Phone,
  MessageSquare,
  X,
  ExternalLink,
  CalendarCheck,
  CalendarDays,
  AlertCircle,
  Filter,
  Trash2,
  Ban,
  Check,
  BedDouble,
  Edit3,
  AlertTriangle
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getAuthToken = () => {
  return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
};

export default function Revenue() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('analytics'); // 'analytics' | 'payments'
  const [activeChartTab, setActiveChartTab] = useState('Day-wise');
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [properties, setProperties] = useState([]);
  const [propertyBreakdown, setPropertyBreakdown] = useState([]);

  // Month & Year & Day selectors
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear()); // 2026
  const [selectedDay, setSelectedDay] = useState('all'); // 'all' or 1..31
  const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' or 1..4
  const [revenueTimeframe, setRevenueTimeframe] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const monthsList = [
    { value: 1, name: 'January', short: 'Jan' },
    { value: 2, name: 'February', short: 'Feb' },
    { value: 3, name: 'March', short: 'Mar' },
    { value: 4, name: 'April', short: 'Apr' },
    { value: 5, name: 'May', short: 'May' },
    { value: 6, name: 'June', short: 'Jun' },
    { value: 7, name: 'July', short: 'Jul' },
    { value: 8, name: 'August', short: 'Aug' },
    { value: 9, name: 'September', short: 'Sep' },
    { value: 10, name: 'October', short: 'Oct' },
    { value: 11, name: 'November', short: 'Nov' },
    { value: 12, name: 'December', short: 'Dec' }
  ];

  const currentYear = now.getFullYear();
  const yearsList = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysList = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

  // Search and filter states for booking tables (matching Manage Bookings)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('');
  const [appliedDateFilters, setAppliedDateFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: ''
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [viewTableMode, setViewTableMode] = useState('bookings'); // 'bookings' | 'periods'

  // Summary state
  const [summary, setSummary] = useState({
    today: 0,
    todayChange: '+0.0',
    todayPositive: true,
    thisWeek: 0,
    weekChange: '+0.0',
    weekPositive: true,
    thisMonth: 0,
    monthChange: '+0.0',
    monthPositive: true,
    totalRevenue: 0,
    dateRange: 'All Time'
  });

  const [dailyDetails, setDailyDetails] = useState([]);
  const [chartPoints, setChartPoints] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Reschedule Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleCheckIn, setRescheduleCheckIn] = useState('');
  const [rescheduleCheckOut, setRescheduleCheckOut] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Edit Booking Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editAddOns, setEditAddOns] = useState(0);
  const [editAddOnsRemark, setEditAddOnsRemark] = useState('');
  const [editSpecialRequests, setEditSpecialRequests] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Cancel Booking Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('Guest requested cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const toInputDateString = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // 1. Reschedule Handlers
  const handleOpenReschedule = (b) => {
    const raw = b.rawBooking || b;
    setRescheduleBooking(raw);
    setRescheduleCheckIn(toInputDateString(raw.checkInDate || raw.rawCheckIn || b.checkInDate));
    setRescheduleCheckOut(toInputDateString(raw.checkOutDate || raw.rawCheckOut || b.checkOutDate));
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking) return;
    const bookingId = rescheduleBooking._id || rescheduleBooking.id || rescheduleBooking.dbId;

    if (!rescheduleCheckIn || !rescheduleCheckOut) {
      Swal.fire({ icon: 'warning', title: 'Dates Required', text: 'Please select both check-in and check-out dates.' });
      return;
    }

    if (new Date(rescheduleCheckIn) >= new Date(rescheduleCheckOut)) {
      Swal.fire({ icon: 'warning', title: 'Invalid Dates', text: 'Check-out date must be after check-in date.' });
      return;
    }

    try {
      setRescheduleSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/reschedule`), {
        checkIn: rescheduleCheckIn,
        checkOut: rescheduleCheckOut
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Rescheduled!',
          text: 'The stay dates have been updated successfully.',
          timer: 1600,
          showConfirmButton: false
        });
        setIsRescheduleModalOpen(false);
        fetchRevenueData();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId || selectedBooking.dbId === bookingId)) {
          setSelectedBooking({
            ...selectedBooking,
            checkInDate: rescheduleCheckIn,
            checkOutDate: rescheduleCheckOut,
            rawCheckIn: rescheduleCheckIn,
            rawCheckOut: rescheduleCheckOut
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Reschedule Failed',
        text: err.response?.data?.message || 'Could not reschedule stay. Room might be booked on selected dates.'
      });
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // 2. Record Payment Handlers
  const handleOpenPayment = (b) => {
    const raw = b.rawBooking || b;
    setPaymentBooking(raw);
    const pend = Number(raw.pricing?.pendingAmount !== undefined ? raw.pricing.pendingAmount : (raw.pendingAmount !== undefined ? raw.pendingAmount : Math.max(0, (raw.pricing?.finalAmount || raw.totalAmount || 0) - (raw.pricing?.paidAmount || raw.paidAmount || 0))));
    setPaymentAmount(pend > 0 ? pend : '');
    setPaymentMethod(raw.paymentMethod || raw.paymentMode || 'UPI');
    setPaymentTransactionId('');
    setPaymentRemark('Settlement payment');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentBooking) return;
    const bookingId = paymentBooking._id || paymentBooking.id || paymentBooking.dbId;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid payment amount.' });
      return;
    }

    try {
      setPaymentSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/payment`), {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionId: paymentTransactionId,
        remark: paymentRemark
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Recorded!',
          text: `Payment of ₹${Number(paymentAmount).toLocaleString()} recorded.`,
          timer: 1600,
          showConfirmButton: false
        });
        setIsPaymentModalOpen(false);
        fetchRevenueData();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId || selectedBooking.dbId === bookingId)) {
          const oldPaid = Number(selectedBooking.pricing?.paidAmount ?? selectedBooking.paidAmount ?? 0);
          const newPaid = oldPaid + Number(paymentAmount);
          const totalAmt = Number(selectedBooking.pricing?.finalAmount ?? selectedBooking.totalAmount ?? 0);
          const newPend = Math.max(0, totalAmt - newPaid);
          setSelectedBooking({
            ...selectedBooking,
            pricing: {
              ...selectedBooking.pricing,
              paidAmount: newPaid,
              pendingAmount: newPend
            },
            paidAmount: newPaid,
            pendingAmount: newPend,
            paymentStatus: newPend === 0 ? 'Completed' : 'Partial'
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: err.response?.data?.message || 'Failed to record payment.'
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // 3. Edit Booking Info Handlers
  const handleOpenEdit = (b) => {
    const raw = b.rawBooking || b;
    setEditBooking(raw);
    setEditGuestName(raw.customer?.name || raw.guestName || '');
    setEditGuestPhone(raw.customer?.mobile || raw.phone || '');
    setEditGuestEmail(raw.customer?.email || raw.email || '');
    setEditAddOns(Number(raw.pricing?.addOns ?? raw.addOns ?? 0));
    setEditAddOnsRemark(raw.pricing?.addOnsRemark || '');
    setEditSpecialRequests(raw.specialRequests || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editBooking) return;
    const bookingId = editBooking._id || editBooking.id || editBooking.dbId;

    try {
      setEditSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}`), {
        guestName: editGuestName,
        guestPhone: editGuestPhone,
        guestEmail: editGuestEmail,
        addOns: Number(editAddOns || 0),
        addOnsRemark: editAddOnsRemark,
        specialRequests: editSpecialRequests
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Updated',
          text: 'Guest details and add-ons saved successfully.',
          timer: 1500,
          showConfirmButton: false
        });
        setIsEditModalOpen(false);
        fetchRevenueData();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId || selectedBooking.dbId === bookingId)) {
          setSelectedBooking({
            ...selectedBooking,
            customer: {
              ...selectedBooking.customer,
              name: editGuestName,
              mobile: editGuestPhone,
              email: editGuestEmail
            },
            guestName: editGuestName,
            phone: editGuestPhone,
            email: editGuestEmail,
            pricing: {
              ...selectedBooking.pricing,
              addOns: Number(editAddOns || 0),
              addOnsRemark: editAddOnsRemark
            },
            addOns: Number(editAddOns || 0),
            specialRequests: editSpecialRequests
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to update booking.'
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // 4. Cancel Booking Handlers
  const handleOpenCancel = (b) => {
    const raw = b.rawBooking || b;
    setCancelBooking(raw);
    setCancelReason('Guest requested cancellation');
    setCancelNotes('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelBooking) return;
    const bookingId = cancelBooking._id || cancelBooking.id || cancelBooking.dbId;

    try {
      setCancelSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/cancel`), {
        reason: cancelReason,
        notes: cancelNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Cancelled',
          text: 'The booking has been marked as cancelled.',
          timer: 1600,
          showConfirmButton: false
        });
        setIsCancelModalOpen(false);
        fetchRevenueData();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId || selectedBooking.dbId === bookingId)) {
          setSelectedBooking({ ...selectedBooking, bookingStatus: 'Cancelled' });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Cancellation Failed',
        text: err.response?.data?.message || 'Could not cancel booking.'
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedDateFilters({
      startDate: startDateFilter,
      endDate: endDateFilter,
      month: selectedMonthFilter,
      year: selectedYearFilter
    });
  };

  const handleClearFilter = () => {
    setActiveStatusTab('all');
    setSearchQuery('');
    setSelectedPropertyId('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setSelectedMonthFilter('');
    setSelectedYearFilter('');
    setAppliedDateFilters({
      startDate: '',
      endDate: '',
      month: '',
      year: ''
    });
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(dateVal);
    }
  };

  const handleConfirmHold = async (b) => {
    const bookingId = b._id || b.id;
    try {
      const result = await Swal.fire({
        title: 'Confirm Booking?',
        text: `Convert Hold booking ${b.bookingId || ''} to Confirmed?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Confirm It!'
      });

      if (!result.isConfirmed) return;

      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/confirm-hold`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Booking Confirmed!',
          text: 'The booking has been successfully confirmed.',
          timer: 1500,
          showConfirmButton: false
        });
        fetchRevenueData();
        if (selectedBooking && (selectedBooking._id === bookingId || selectedBooking.id === bookingId)) {
          setSelectedBooking({ ...selectedBooking, bookingStatus: 'Confirmed' });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Confirmation Failed',
        text: err.response?.data?.message || 'Failed to confirm hold booking.'
      });
    }
  };

  const handleRemoveHold = async (b) => {
    const bookingId = b._id || b.id;
    try {
      const result = await Swal.fire({
        title: 'Remove Hold?',
        text: `Are you sure you want to remove hold for ${b.bookingId || ''}? Dates will be released.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, Remove Hold!'
      });

      if (!result.isConfirmed) return;

      const token = getAuthToken();
      const res = await axios.delete(getApiUrl(`/api/homestay-owner/bookings/${bookingId}/hold`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Hold Removed',
          text: 'The hold booking has been removed.',
          timer: 1500,
          showConfirmButton: false
        });
        setSelectedBooking(null);
        fetchRevenueData();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.response?.data?.message || 'Failed to remove hold.'
      });
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [selectedPropertyId, activeChartTab, selectedMonth, selectedYear, selectedDay, selectedWeek]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        propertyId: selectedPropertyId,
        timeframe: activeChartTab,
        year: String(selectedYear),
        month: String(selectedMonth),
        day: String(selectedDay),
        week: String(selectedWeek)
      });
      const res = await axios.get(getApiUrl(`/api/homestay-owner/revenue?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.properties) setProperties(res.data.properties);
        if (res.data.propertyBreakdown) setPropertyBreakdown(res.data.propertyBreakdown);
        if (res.data.detailsTable) setDailyDetails(res.data.detailsTable);
        if (res.data.chartPoints) setChartPoints(res.data.chartPoints);
        if (res.data.transactions) setTransactions(res.data.transactions);
        if (res.data.revenueTimeframe) setRevenueTimeframe(res.data.revenueTimeframe);
      }
    } catch (err) {
      console.error('Failed to load revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  // Build SVG path strings from chartPoints (Smooth Bezier Spline)
  const getSvgPaths = () => {
    if (!chartPoints || chartPoints.length === 0) {
      return { linePath: '', areaPath: '', validPoints: [] };
    }

    const count = chartPoints.length;
    const maxVal = revenueTimeframe?.niceMax || Math.max(...chartPoints.map(p => Number(p.value) || 0), 1000);

    const validPoints = chartPoints.map((pt, idx) => {
      const x = (typeof pt.x === 'number' && !isNaN(pt.x)) ? pt.x : (count > 1 ? Math.round(50 + (idx / (count - 1)) * 430) : 260);
      const y = (typeof pt.y === 'number' && !isNaN(pt.y)) ? pt.y : Math.max(20, Math.min(145, Math.round(145 - ((Number(pt.value) || 0) / maxVal) * 120)));
      return { ...pt, x, y };
    });

    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];

    if (validPoints.length === 1) {
      return { linePath: `M ${first.x} ${first.y}`, areaPath: '', validPoints };
    }

    let linePath = `M ${first.x} ${first.y}`;
    for (let i = 0; i < validPoints.length - 1; i++) {
      const p0 = validPoints[i === 0 ? 0 : i - 1];
      const p1 = validPoints[i];
      const p2 = validPoints[i + 1];
      const p3 = validPoints[i + 2 < validPoints.length ? i + 2 : i + 1];

      const cp1x = Math.round(p1.x + (p2.x - p0.x) / 6);
      const cp1y = Math.round(p1.y + (p2.y - p0.y) / 6);
      const cp2x = Math.round(p2.x - (p3.x - p1.x) / 6);
      const cp2y = Math.round(p2.y - (p3.y - p1.y) / 6);

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const areaPath = `${linePath} L ${last.x} 150 L ${first.x} 150 Z`;

    return { linePath, areaPath, validPoints };
  };

  const { linePath, areaPath, validPoints = [] } = getSvgPaths();

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    // 1. Status Filter Tab
    if (activeStatusTab !== 'all') {
      const bStatus = (t.bookingStatus || '').toLowerCase();
      const tab = activeStatusTab.toLowerCase();
      if (tab === 'hold' || tab === 'on hold') {
        if (bStatus !== 'hold' && bStatus !== 'on hold') return false;
      } else if (bStatus !== tab) {
        return false;
      }
    }

    // 2. Property Filter
    if (selectedPropertyId !== 'all') {
      const propMatch = properties.find(p => String(p.id || p._id) === String(selectedPropertyId))?.name;
      const tPropId = String(t.propertyId || '');
      const tPropName = (t.propertyName || '').toLowerCase();
      if (propMatch) {
        if (!tPropName.includes(propMatch.toLowerCase()) && tPropId !== String(selectedPropertyId)) {
          return false;
        }
      } else if (tPropId !== String(selectedPropertyId)) {
        return false;
      }
    }

    // 3. Payment Status Filter (if set in payments tab)
    if (paymentStatusFilter !== 'all') {
      if (paymentStatusFilter === 'completed' && t.paymentStatus !== 'Completed') return false;
      if (paymentStatusFilter === 'partial' && t.paymentStatus !== 'Partial') return false;
      if (paymentStatusFilter === 'pending' && t.paymentStatus !== 'Pending') return false;
    }

    // 4. Payment Mode Filter
    if (paymentModeFilter !== 'all') {
      if (t.paymentMode?.toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
    }

    // 5. Search query (guest name, phone, booking ID, property, room)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = t.guestName?.toLowerCase().includes(q) || t.customer?.name?.toLowerCase().includes(q);
      const matchPhone = t.phone?.toLowerCase().includes(q) || t.customer?.mobile?.includes(q);
      const matchBookingId = t.bookingId?.toLowerCase().includes(q);
      const matchProp = t.propertyName?.toLowerCase().includes(q);
      const matchRoom = String(t.roomNumber || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchBookingId && !matchProp && !matchRoom) {
        return false;
      }
    }

    // 6. Date Range Filter (Applied)
    if (appliedDateFilters.startDate && appliedDateFilters.endDate) {
      const start = new Date(appliedDateFilters.startDate);
      const end = new Date(appliedDateFilters.endDate);
      end.setHours(23, 59, 59, 999);
      const checkIn = new Date(t.rawCheckIn || t.checkInDate);
      const checkOut = new Date(t.rawCheckOut || t.checkOutDate);
      if (checkIn > end || checkOut < start) return false;
    } else if (appliedDateFilters.startDate) {
      const start = new Date(appliedDateFilters.startDate);
      const checkOut = new Date(t.rawCheckOut || t.checkOutDate);
      if (checkOut < start) return false;
    } else if (appliedDateFilters.endDate) {
      const end = new Date(appliedDateFilters.endDate);
      end.setHours(23, 59, 59, 999);
      const checkIn = new Date(t.rawCheckIn || t.checkInDate);
      if (checkIn > end) return false;
    }

    // 7. Month & Year Filter (Applied)
    if (appliedDateFilters.year || appliedDateFilters.month) {
      const checkIn = new Date(t.rawCheckIn || t.checkInDate);
      if (appliedDateFilters.year && checkIn.getFullYear() !== Number(appliedDateFilters.year)) {
        return false;
      }
      if (appliedDateFilters.month && (checkIn.getMonth() + 1) !== Number(appliedDateFilters.month)) {
        return false;
      }
    }

    return true;
  });

  // Financial calculations for Payments tab
  const totalBilled = filteredTransactions.reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);
  const totalCollected = filteredTransactions.reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);
  const totalPending = filteredTransactions.reduce((acc, t) => acc + (Number(t.pendingAmount) || 0), 0);
  const completedCount = filteredTransactions.filter(t => t.paymentStatus === 'Completed').length;

  return (
    <div className="space-y-6 select-none font-sans pb-12 print:p-0">
      
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-6 rounded-3xl shadow-sm gap-4 print:hidden">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent border-none cursor-pointer hover:text-slate-600 mb-1 p-0"
          >
            <ArrowLeft size={12} className="stroke-[2.5]" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Financial Ledger & Revenue Hub
          </h1>
          <p className="text-[10px] font-semibold text-slate-400">
            Track performance analytics, booking-wise transaction records, and payment settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Property Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
            <Building2 size={14} className="text-rose-700" />
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="text-xs font-black text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="all">All Homestays (Consolidated)</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchRevenueData()}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm shadow-rose-100"
          >
            <Download size={13} className="stroke-[3]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs Switcher */}
      <div className="flex border-b border-slate-200 bg-white p-2 px-6 rounded-2xl shadow-xs gap-3 print:hidden">
        <button
          onClick={() => setActiveMainTab('analytics')}
          className={`pb-3 pt-2 px-4 text-xs font-black transition-all border-none bg-transparent cursor-pointer relative flex items-center gap-2 ${
            activeMainTab === 'analytics'
              ? 'text-rose-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp size={15} />
          <span>Revenue Analytics & Performance</span>
          {activeMainTab === 'analytics' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full"></span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('payments')}
          className={`pb-3 pt-2 px-4 text-xs font-black transition-all border-none bg-transparent cursor-pointer relative flex items-center gap-2 ${
            activeMainTab === 'payments'
              ? 'text-rose-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet size={15} />
          <span>Booking Payments & Transactions</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-50 text-rose-600 font-extrabold">
            {transactions.length}
          </span>
          {activeMainTab === 'payments' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full"></span>
          )}
        </button>
      </div>

      {/* TAB 1: REVENUE ANALYTICS & OVERVIEW */}
      {activeMainTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Today's Revenue */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Today's Revenue
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.today || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.todayPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.todayPositive ? `↑ ${summary.todayChange}% vs yesterday` : `${summary.todayChange}% vs yesterday`}
                </span>
              </div>
            </div>

            {/* This Week */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  This Week
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.thisWeek || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.weekPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.weekPositive ? `↑ ${summary.weekChange}% vs last week` : `${summary.weekChange}% vs last week`}
                </span>
              </div>
            </div>

            {/* This Month */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  This Month
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.thisMonth || 0).toLocaleString()}
                </span>
                <span className={`block text-[8px] font-bold mt-1 ${summary.monthPositive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {summary.monthPositive ? `↑ ${summary.monthChange}% vs last month` : `${summary.monthChange}% vs last month`}
                </span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg shadow-sm">
                <CircleDollarSign size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Total Revenue
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {Number(summary.totalRevenue || 0).toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-slate-400">
                  {summary.dateRange || 'Cumulative Gross'}
                </span>
              </div>
            </div>
          </div>

          {/* PROPERTY-WISE BREAKDOWN (Visible when viewing All Homestays) */}
          {selectedPropertyId === 'all' && propertyBreakdown.length > 0 && (
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Building2 size={16} className="text-rose-700" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Homestay Properties Revenue Breakdown
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propertyBreakdown.map((pb) => (
                  <div 
                    key={pb.id}
                    onClick={() => setSelectedPropertyId(pb.id)}
                    className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-rose-200 hover:bg-rose-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 group-hover:text-rose-600 transition-colors">
                          {pb.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                          {pb.bookingsCount || 0} Bookings Recorded
                        </span>
                      </div>
                      <span className="text-sm font-black font-mono text-slate-800 group-hover:text-rose-600">
                        ₹ {Number(pb.revenue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                  {activeChartTab === 'Weekly' ? 'Revenue Overview (Weekly)' : 
                   activeChartTab === 'Day-wise' ? 'DAY-WISE REVENUE PERFORMANCE CURVE' :
                   activeChartTab === 'Monthly' ? 'MONTHLY REVENUE PERFORMANCE CURVE' :
                   'YEARLY REVENUE PERFORMANCE CURVE'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs sm:text-sm font-black text-rose-600 tracking-tight leading-tight font-mono">
                    {revenueTimeframe?.periodSubtitle || (
                      activeChartTab === 'Day-wise' ? `₹ ${Number(summary.today || 0).toLocaleString()} TODAY'S EARNINGS` :
                      activeChartTab === 'Monthly' ? `₹ ${Number(summary.thisMonth || 0).toLocaleString()} TOTAL EARNINGS (${selectedYear})` :
                      `₹ ${Number(summary.totalRevenue || 0).toLocaleString()}`
                    )}
                  </span>
                </div>
              </div>

              {/* Timeframe Selector & Badge */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {activeChartTab === 'Weekly' && (
                  <div className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs font-mono">
                    {revenueTimeframe?.periodTotalFormatted || "₹0"}
                  </div>
                )}
                <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 border border-slate-200">
                  {['Day-wise', 'Weekly', 'Monthly', 'Yearly'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveChartTab(tab);
                        setSelectedDay('all');
                        setSelectedWeek('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${
                        activeChartTab === tab
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600 bg-transparent'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Bar: Aligned to the RIGHT side and strictly on ONE row */}
            <div className="px-6 flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 flex-nowrap overflow-x-auto no-scrollbar">
              {/* 1. Day-wise Tab Filter: Calendar Date Picker Only */}
              {activeChartTab === 'Day-wise' && (
                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                  <Calendar size={13} className="text-rose-600 shrink-0" />
                  <input
                    type="date"
                    value={`${selectedYear}-${String(selectedMonth === 'all' ? 1 : selectedMonth).padStart(2, '0')}-${selectedDay !== 'all' ? String(selectedDay).padStart(2, '0') : '01'}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        setSelectedYear(y);
                        setSelectedMonth(m);
                        setSelectedDay(d);
                      }
                    }}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* 2. Weekly Tab Filters: Select Month, Year, Week in one row */}
              {activeChartTab === 'Weekly' && (
                <>
                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <Calendar size={13} className="text-rose-600 shrink-0" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <Clock size={13} className="text-rose-600 shrink-0" />
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="all">All 4 Weeks</option>
                      <option value="1">Week 1 (1–7)</option>
                      <option value="2">Week 2 (8–14)</option>
                      <option value="3">Week 3 (15–21)</option>
                      <option value="4">Week 4 (22–{daysInSelectedMonth})</option>
                    </select>
                  </div>
                </>
              )}

              {/* 3. Monthly Tab Filters: Select Month & Year */}
              {activeChartTab === 'Monthly' && (
                <>
                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <Calendar size={13} className="text-rose-600 shrink-0" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Months</option>
                      {monthsList.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* 4. Yearly Tab Filters: Select Year Dropdown */}
              {activeChartTab === 'Yearly' && (
                <>
                  <div className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all shrink-0">
                    <Calendar size={13} className="text-rose-600 shrink-0" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* SVG Line Chart */}
            <div className="p-6 pt-2">
              <div className="relative h-64 w-full border border-slate-100 rounded-2xl p-4 flex items-end bg-slate-50/20 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full p-2 overflow-visible" viewBox="0 0 520 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                      <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y-Axis scale and horizontal grid lines */}
                  {(revenueTimeframe?.ySteps || [80000, 60000, 40000, 20000, 0]).map((stepVal, sIdx) => {
                    const stepY = Math.round(25 + (sIdx / 4) * 120);
                    const stepLabel = stepVal >= 1000 ? `₹${Math.round(stepVal / 1000)}K` : `₹${stepVal}`;
                    return (
                      <g key={sIdx}>
                        <text
                          x="42"
                          y={stepY + 3}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="8"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                        >
                          {stepLabel}
                        </text>
                        <line
                          x1="48"
                          y1={stepY}
                          x2="500"
                          y2={stepY}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                      </g>
                    );
                  })}

                  {/* Area path */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#revGrad)" />
                  )}

                  {/* Main Line path */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#d31e1e"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Hover vertical dashed guideline */}
                  {hoveredPoint !== null && validPoints[hoveredPoint] && (
                    <line
                      x1={validPoints[hoveredPoint].x}
                      y1={25}
                      x2={validPoints[hoveredPoint].x}
                      y2={150}
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                  )}

                  {/* Data Points with interactive badges */}
                  {validPoints.map((pt, index) => {
                    const isSelected = (activeChartTab === 'Day-wise' && selectedDay !== 'all' && pt.day === Number(selectedDay)) ||
                                       (activeChartTab === 'Weekly' && selectedWeek !== 'all' && pt.weekNum === Number(selectedWeek));
                    const isFaded = (activeChartTab === 'Day-wise' && selectedDay !== 'all' && pt.day !== Number(selectedDay)) ||
                                    (activeChartTab === 'Weekly' && selectedWeek !== 'all' && pt.weekNum !== Number(selectedWeek));
                    const val = Number(pt.value || 0);
                    const isHovered = hoveredPoint === index;
                    const showBadge = (val > 0) || isSelected || isHovered;
                    const isDenseZero = activeChartTab === 'Day-wise' && val === 0 && !isSelected && !isHovered;

                    const labelText = `₹${val.toLocaleString()}`;
                    const badgeWidth = Math.max(46, labelText.length * 6.5 + 8);

                    return (
                      <g 
                        key={index}
                        opacity={isFaded ? 0.35 : 1}
                        className="cursor-pointer transition-opacity duration-200"
                        onMouseEnter={() => setHoveredPoint(index)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        onClick={() => {
                          if (activeChartTab === 'Day-wise' && pt.day) {
                            setSelectedDay(selectedDay === String(pt.day) ? 'all' : String(pt.day));
                          } else if (activeChartTab === 'Weekly' && pt.weekNum) {
                            setSelectedWeek(selectedWeek === String(pt.weekNum) ? 'all' : String(pt.weekNum));
                          }
                        }}
                      >
                        {/* Circle Node: Subtle small dot for 0-value days; prominent circle for active/hovered */}
                        {isDenseZero ? (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="2.5"
                            fill="#fda4af"
                            className="transition-all hover:r-4"
                          />
                        ) : (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected || isHovered ? "5.5" : "4"}
                            fill="#ffffff"
                            stroke="#d31e1e"
                            strokeWidth={isSelected || isHovered ? "3" : "2.5"}
                            className="transition-all"
                          />
                        )}

                        {/* Red Badge above Node */}
                        {showBadge && (
                          <g className="animate-in fade-in zoom-in-95 duration-150">
                            <rect
                              x={pt.x - (badgeWidth / 2)}
                              y={pt.y - 25}
                              width={badgeWidth}
                              height="17"
                              rx="4"
                              fill="#d31e1e"
                            />
                            <polygon
                              points={`${pt.x - 3.5},${pt.y - 8} ${pt.x + 3.5},${pt.y - 8} ${pt.x},${pt.y - 4.5}`}
                              fill="#d31e1e"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 13.5}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="8"
                              fontWeight="800"
                              fontFamily="ui-monospace, monospace"
                            >
                              {labelText}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* X Axis Labels along bottom */}
                <div className="absolute bottom-1 inset-x-0 pl-12 pr-4 flex justify-between text-[9px] font-bold text-slate-400 pointer-events-none">
                  {validPoints.map((pt, i) => {
                    const isDayWiseDense = activeChartTab === 'Day-wise' && validPoints.length > 15;
                    const showLabel = !isDayWiseDense || (i % 2 === 0) || pt.isToday || (Number(pt.value) > 0) || (hoveredPoint === i);

                    if (!showLabel) {
                      return <span key={i} className="opacity-0">.</span>;
                    }

                    return (
                      <span
                        key={i}
                        className={`transition-colors text-center ${
                          pt.isToday || pt.isSelectedDay || hoveredPoint === i
                            ? 'text-rose-600 font-black'
                            : 'text-slate-400'
                        }`}
                      >
                        {activeChartTab === 'Weekly' ? `${pt.label} (${pt.subLabel})` : pt.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FILTER & TABS CARD (Exact match to Manage Bookings) */}
          <div className="bg-white border border-slate-100 p-5 sm:p-6 rounded-3xl shadow-sm space-y-5">
            {/* Row 1: Status Tabs, Property Selector, Search & Refresh in ONE SINGLE ROW */}
            <div className="flex items-center justify-between gap-2 flex-nowrap w-full overflow-x-auto pb-1 sm:pb-0">
              {/* Status Capsule Tabs */}
              <div className="bg-slate-100/70 p-1 rounded-xl flex items-center gap-0.5 border border-slate-200/50 flex-nowrap shrink-0">
                {[
                  { id: 'all', label: 'All Bookings' },
                  { id: 'Confirmed', label: 'Confirmed' },
                  { id: 'Hold', label: 'On Hold' },
                  { id: 'Checked In', label: 'Checked In' },
                  { id: 'Checked Out', label: 'Checked Out' },
                  { id: 'Cancelled', label: 'Cancelled' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveStatusTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap ${
                      activeStatusTab === tab.id
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Right Side: Compact Property Selector, Search & Refresh */}
              <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                {/* Compact Property Selector Dropdown */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl shadow-2xs shrink-0 max-w-[140px]">
                  <Building2 size={12} className="text-rose-600 shrink-0" />
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer truncate"
                  >
                    <option value="all">All Homestays</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Compact Search Input */}
                <div className="relative w-36 sm:w-44 lg:w-52 shrink-0">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search guest / ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-rose-400"
                  />
                </div>

                {/* Compact Refresh Button */}
                <button
                  onClick={() => fetchRevenueData()}
                  className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200/80 transition-colors cursor-pointer shrink-0"
                  title="Refresh List"
                >
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Row 2: Filter by Date Range OR Filter by Month & Year */}
            <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 xl:gap-8 flex-1">
                {/* Filter by Date Range */}
                <div className="space-y-1.5 flex-1 w-full">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <Calendar size={13} className="text-rose-600" />
                    <span>Filter by Date Range</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">From Date</span>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">To Date</span>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* OR text */}
                <div className="hidden md:flex items-center justify-center pt-5">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-widest">OR</span>
                </div>

                {/* Filter by Month & Year */}
                <div className="space-y-1.5 flex-1 w-full">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                    <span>Filter by Month & Year</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Select Month</span>
                      <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                      >
                        <option value="">Select month</option>
                        {monthsList.map((m) => (
                          <option key={m.value} value={m.value}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Select Year</span>
                      <select
                        value={selectedYearFilter}
                        onChange={(e) => setSelectedYearFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-400 cursor-pointer"
                      >
                        <option value="">Select year</option>
                        {yearsList.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2 xl:pt-5 self-end xl:self-center">
                <button
                  onClick={handleApplyFilter}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-200 transition-colors border-none cursor-pointer"
                >
                  <Filter size={13} />
                  <span>Apply Filter</span>
                </button>
                <button
                  onClick={handleClearFilter}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* BOOKING-WISE TRANSACTION TABLE (Below Chart) */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
            <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight">
                  {activeStatusTab === 'all' ? 'All Bookings Ledger' : `${activeStatusTab} Bookings Ledger`} ({filteredTransactions.length})
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Detailed financial transactions mapped to individual guest bookings. Click view icon for full booking operations drawer.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setViewTableMode(viewTableMode === 'bookings' ? 'periods' : 'bookings')}
                  className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Filter size={12} />
                  <span>{viewTableMode === 'bookings' ? 'View Periods' : 'View Bookings'}</span>
                </button>
              </div>
            </div>

            {/* Table Rendering */}
            {viewTableMode === 'bookings' ? (
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Booking ID</th>
                      <th className="pb-3 px-3">Guest</th>
                      <th className="pb-3 px-3">Property & Room</th>
                      <th className="pb-3 px-3">Dates (In - Out)</th>
                      <th className="pb-3 px-3 text-right">Total Bill</th>
                      <th className="pb-3 px-3 text-right">Collected</th>
                      <th className="pb-3 px-3 text-right">Pending</th>
                      <th className="pb-3 px-3 text-center">Mode</th>
                      <th className="pb-3 px-3 text-center">Status</th>
                      <th className="pb-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-bold text-xs">
                          No transactions found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id || t.bookingId} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-[11px] font-extrabold text-slate-800">
                            {t.bookingId}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-extrabold text-slate-800">{t.guestName}</div>
                            <div className="text-[10px] text-slate-400">{t.phone}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800">{t.propertyName}</div>
                            <div className="text-[10px] text-rose-600 font-extrabold">{t.roomNumber} ({t.roomType})</div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                            {formatDateDisplay(t.checkInDate)} → {formatDateDisplay(t.checkOutDate)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                            ₹ {Number(t.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                            ₹ {Number(t.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                            ₹ {Number(t.pendingAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                              {t.paymentMode || 'UPI'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-block ${
                              t.bookingStatus === 'Confirmed'
                                ? 'bg-[#dcfce7] text-[#16a34a]'
                                : t.bookingStatus === 'Hold'
                                ? 'bg-[#fef9c3] text-[#ca8a04]'
                                : t.bookingStatus === 'Checked In'
                                ? 'bg-[#e0e7ff] text-[#4f46e5]'
                                : t.bookingStatus === 'Checked Out'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-[#ffe4e6] text-[#e11d48]'
                            }`}>
                              {t.bookingStatus === 'Hold' ? 'HOLD' : (t.bookingStatus || 'Confirmed')}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Full Booking Operations Drawer */}
                              <button
                                onClick={() => setSelectedBooking(t.rawBooking || t)}
                                className="w-7 h-7 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                title="View Details (Booking Drawer)"
                              >
                                <Eye size={12} />
                              </button>

                              {/* Quick Tax Invoice Navigation */}
                              <button
                                onClick={() => {
                                  const id = t.dbId || t.id || t.rawBooking?._id || t.rawBooking?.id;
                                  navigate(`/homestay-owner/bookings/invoice/${id}`);
                                }}
                                className="w-7 h-7 rounded-full bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                title="Tax Invoice"
                              >
                                <FileText size={12} />
                              </button>

                              {/* If Hold, Quick Confirm Button */}
                              {t.bookingStatus === 'Hold' && (
                                <button
                                  onClick={() => handleConfirmHold(t.rawBooking || t)}
                                  className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                  title="Confirm Hold Booking"
                                >
                                  <CheckCircle size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Period Itemized Table fallback */
              <div className="overflow-x-auto px-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-3">Date / Period</th>
                      <th className="pb-3 px-3">Day / Timeframe</th>
                      <th className="pb-3 px-3 text-center">Bookings</th>
                      <th className="pb-3 px-3 text-right">Base Tariff</th>
                      <th className="pb-3 px-3 text-right">Add-ons</th>
                      <th className="pb-3 px-3 text-right">Taxes</th>
                      <th className="pb-3 px-3 text-right">Total Revenue</th>
                      <th className="pb-3 px-3 text-right">Collected</th>
                      <th className="pb-3 px-3 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {dailyDetails.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {row.date || row.period}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={row.isBold ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                            {row.day}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-600">{row.bookings}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.baseTariff || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.addOns || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">₹ {(row.tax || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">{row.revenue}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">{row.collected || '₹ 0'}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700">{row.pending || '₹ 0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKING PAYMENTS & TRANSACTIONS */}
      {activeMainTab === 'payments' && (
        <div className="space-y-6">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Billed */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shadow-sm">
                <Receipt size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Total Gross Billed
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  ₹ {totalBilled.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-slate-400">
                  {filteredTransactions.length} Total Bookings
                </span>
              </div>
            </div>

            {/* Collected */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-sm">
                <CheckCircle2 size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Collected / Received
                </span>
                <span className="block text-xl font-black text-emerald-600 tracking-tight mt-1.5 font-mono">
                  ₹ {totalCollected.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-emerald-600">
                  {totalBilled > 0 ? `${Math.round((totalCollected / totalBilled) * 100)}% Collection Rate` : '0%'}
                </span>
              </div>
            </div>

            {/* Pending Dues */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shadow-sm">
                <Clock size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Pending Receivables
                </span>
                <span className="block text-xl font-black text-rose-600 tracking-tight mt-1.5 font-mono">
                  ₹ {totalPending.toLocaleString()}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-rose-400">
                  Outstanding Balance
                </span>
              </div>
            </div>

            {/* Completed Settlements */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                <CreditCard size={18} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Settled In Full
                </span>
                <span className="block text-xl font-black text-slate-800 tracking-tight mt-1.5 font-mono">
                  {completedCount} / {filteredTransactions.length}
                </span>
                <span className="block text-[8px] font-bold mt-1 text-indigo-600">
                  Fully Paid Bookings
                </span>
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search guest, phone, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-rose-500"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Status' },
                { id: 'completed', label: 'Paid / Completed' },
                { id: 'partial', label: 'Partial Paid' },
                { id: 'pending', label: 'Pending Dues' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setPaymentStatusFilter(pill.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                    paymentStatusFilter === pill.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              {/* Mode Filter Dropdown */}
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Detailed Payment Transactions Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden space-y-4">
            <div className="p-6 pb-0 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Booking Payment Transactions ({filteredTransactions.length})
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                Sorted by most recent
              </span>
            </div>

            <div className="overflow-x-auto px-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-3">Transaction / Booking ID</th>
                    <th className="pb-3 px-3">Guest Details</th>
                    <th className="pb-3 px-3">Property & Room</th>
                    <th className="pb-3 px-3">Dates</th>
                    <th className="pb-3 px-3 text-center">Payment Mode</th>
                    <th className="pb-3 px-3 text-right">Billed Amount</th>
                    <th className="pb-3 px-3 text-right">Collected</th>
                    <th className="pb-3 px-3 text-right">Pending</th>
                    <th className="pb-3 px-3 text-center">Payment Status</th>
                    <th className="pb-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-bold text-xs">
                        No transactions recorded for this criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id || t.bookingId} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[11px] font-extrabold text-slate-800 block">
                            {t.bookingId}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {t.bookingDate || 'Recent'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-800">{t.guestName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{t.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{t.propertyName}</div>
                          <div className="text-[10px] text-rose-600 font-extrabold">{t.roomNumber} ({t.roomType})</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                          {t.checkInDate} → {t.checkOutDate}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-black uppercase tracking-wider">
                            {t.paymentMode || 'UPI'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                          ₹ {Number(t.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                          ₹ {Number(t.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                          ₹ {Number(t.pendingAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            t.paymentStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.paymentStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.paymentStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedBooking(t.rawBooking || t)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Show Booking Operations Drawer"
                            >
                              <Eye size={12} className="stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${t.dbId || t.id}`)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Confirmation Slip"
                            >
                              <Receipt size={12} />
                            </button>
                            <button
                              onClick={() => navigate(`/homestay-owner/bookings/invoice/${t.dbId || t.id}`)}
                              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Tax Invoice"
                            >
                              <FileText size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FULL BOOKING OPERATIONS & LEDGER DRAWER (Same as Manage Bookings) */}
      {(selectedBooking || selectedBookingModal) && (() => {
        const b = selectedBooking || selectedBookingModal;
        const raw = b.rawBooking || b;
        const bId = raw.bookingId || raw._id || b.bookingId || b.id;
        const dbId = raw._id || raw.id || b.dbId || b.id;
        const guestName = raw.customer?.name || b.guestName || 'Guest';
        const guestPhone = raw.customer?.mobile || b.phone || '';
        const guestEmail = raw.customer?.email || b.email || '';
        const propName = raw.propertyId?.name || b.propertyName || 'Homestay';
        const roomInfo = raw.roomDetails?.roomNumber 
          ? `${raw.roomDetails.roomNumber} (${raw.roomDetails.categoryName || 'Room'})`
          : (b.roomNumber ? `${b.roomNumber} (${b.roomType || 'Room'})` : (b.roomType || 'Standard Room'));
        const checkIn = raw.checkInDate || b.checkInDate;
        const checkOut = raw.checkOutDate || b.checkOutDate;
        const basePrice = raw.pricing?.basePrice ?? b.baseTariff ?? 0;
        const taxes = raw.pricing?.tax ?? b.tax ?? 0;
        const addOns = raw.pricing?.addOns ?? b.addOns ?? 0;
        const totalBill = raw.pricing?.finalAmount ?? b.totalAmount ?? raw.amount ?? 0;
        const paidAmt = raw.pricing?.paidAmount ?? b.paidAmount ?? 0;
        const pendAmt = raw.pricing?.pendingAmount ?? b.pendingAmount ?? Math.max(0, totalBill - paidAmt);
        const status = raw.bookingStatus || b.bookingStatus || 'Confirmed';
        const pHistory = raw.paymentHistory || b.paymentHistory || [];
        const specRequests = raw.specialRequests || b.specialRequests || '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                    Booking Operations &amp; Ledger
                  </span>
                  <h2 className="text-base font-black text-slate-800 tracking-tight mt-0.5">
                    {bId}
                  </h2>
                </div>
                <button 
                  onClick={() => { setSelectedBooking(null); setSelectedBookingModal(null); }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Guest Summary Card */}
              <div className="flex items-center gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-lg border border-white shadow-xs">
                  {guestName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-slate-800 truncate">{guestName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-semibold">
                    <span>{guestPhone || 'No phone'}</span>
                    {guestEmail && <span>• {guestEmail}</span>}
                  </div>
                </div>

                {guestPhone && (
                  <div className="flex items-center gap-1.5">
                    <a 
                      href={`tel:${guestPhone}`}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-rose-600 flex items-center justify-center hover:bg-rose-50"
                      title="Call"
                    >
                      <Phone size={13} className="stroke-[2.5]" />
                    </a>
                    <a 
                      href={`https://wa.me/${guestPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-50"
                      title="WhatsApp"
                    >
                      <MessageSquare size={13} className="stroke-[2.5]" />
                    </a>
                  </div>
                )}
              </div>

              {/* Room & Stay Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Property &amp; Room</span>
                  <span className="font-bold text-slate-800 block mt-1">{propName}</span>
                  <span className="text-[11px] font-extrabold text-rose-600 block mt-0.5">
                    {roomInfo}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Stay Schedule</span>
                  <span className="font-bold text-slate-800 block mt-1 font-mono text-[11px]">
                    Check-in: {formatDateDisplay(checkIn)}
                  </span>
                  <span className="font-bold text-slate-800 block mt-0.5 font-mono text-[11px]">
                    Check-out: {formatDateDisplay(checkOut)}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Financial Breakdown</span>
                <div className="flex justify-between text-slate-600">
                  <span>Base Room Tariff:</span>
                  <span className="font-mono font-bold">₹{Number(basePrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes &amp; Fees:</span>
                  <span className="font-mono font-bold">₹{Number(taxes).toLocaleString()}</span>
                </div>
                {addOns > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Add-ons:</span>
                    <span className="font-mono font-bold">₹{Number(addOns).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-800 font-black">
                  <span>Total Bill:</span>
                  <span className="text-sm font-mono">₹{Number(totalBill).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid / Collected:</span>
                  <span className="font-mono">₹{Number(paidAmt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Balance Pending:</span>
                  <span className="font-mono">₹{Number(pendAmt).toLocaleString()}</span>
                </div>
              </div>

              {/* Payment History */}
              {pHistory && pHistory.length > 0 && (
                <div className="border border-slate-100 p-4 rounded-2xl bg-white space-y-2">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment Transactions</span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {pHistory.map((ph, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">₹{Number(ph.amount).toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400">
                            {ph.method} • {formatDateDisplay(ph.date)} {ph.remark ? `(${ph.remark})` : ''}
                          </span>
                        </div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase">
                          Settled
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {specRequests && (
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs">
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Special Requests</span>
                  <p className="text-slate-700 mt-1">{specRequests}</p>
                </div>
              )}

              {/* Operations Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Operations &amp; Actions</span>
                
                {/* If Hold Booking: Confirm and Remove Hold */}
                {status === 'Hold' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleConfirmHold(raw)}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      <span>Confirm Booking</span>
                    </button>
                    <button
                      onClick={() => handleRemoveHold(raw)}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Remove Hold</span>
                    </button>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleOpenReschedule(raw)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                  >
                    <CalendarDays size={13} />
                    <span>Reschedule</span>
                  </button>

                  <button
                    onClick={() => handleOpenPayment(raw)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                  >
                    <CreditCard size={13} />
                    <span>Record Pay</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(raw)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer border-none"
                  >
                    <Edit3 size={13} />
                    <span>Edit Info</span>
                  </button>
                </div>

                {/* Printable Documents Row */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigate(`/homestay-owner/bookings/confirmation-slip/${dbId}`);
                    }}
                    className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                  >
                    <Receipt size={12} />
                    <span>Slip</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate(`/homestay-owner/bookings/quotation/${dbId}`);
                    }}
                    className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                  >
                    <FileText size={12} />
                    <span>Quotation</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate(`/homestay-owner/bookings/invoice/${dbId}`);
                    }}
                    className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer bg-white"
                  >
                    <FileText size={12} />
                    <span>Tax Invoice</span>
                  </button>
                </div>

                {/* Cancel Booking button */}
                {status !== 'Cancelled' && (
                  <button
                    onClick={() => handleOpenCancel(raw)}
                    className="w-full py-2.5 mt-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ban size={13} />
                    <span>Cancel This Booking</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. RESCHEDULE MODAL */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Reschedule Stay Dates</h3>
              <button onClick={() => setIsRescheduleModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">New Check-In Date</label>
                <input
                  type="date"
                  value={rescheduleCheckIn}
                  onChange={(e) => setRescheduleCheckIn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">New Check-Out Date</label>
                <input
                  type="date"
                  value={rescheduleCheckOut}
                  onChange={(e) => setRescheduleCheckOut(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {rescheduleSubmitting ? 'Updating...' : 'Save Dates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Record Guest Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Transaction Reference ID (Optional)</label>
                <input
                  type="text"
                  value={paymentTransactionId}
                  onChange={(e) => setPaymentTransactionId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. UPI-123456789"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Remark (Optional)</label>
                <input
                  type="text"
                  value={paymentRemark}
                  onChange={(e) => setPaymentRemark(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Check-in advance"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {paymentSubmitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT BOOKING DETAILS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800">Edit Guest &amp; Booking Info</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Guest Name</label>
                <input
                  type="text"
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={editGuestPhone}
                    onChange={(e) => setEditGuestPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Email (Optional)</label>
                  <input
                    type="email"
                    value={editGuestEmail}
                    onChange={(e) => setEditGuestEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Add-ons Amount (₹)</label>
                  <input
                    type="number"
                    value={editAddOns}
                    onChange={(e) => setEditAddOns(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Add-ons Remark</label>
                  <input
                    type="text"
                    value={editAddOnsRemark}
                    onChange={(e) => setEditAddOnsRemark(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Extra mattress"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Special Requests / Notes</label>
                <textarea
                  value={editSpecialRequests}
                  onChange={(e) => setEditSpecialRequests(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
                  placeholder="Any special notes or preferences"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {editSubmitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CANCEL BOOKING MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                <span>Cancel Reservation</span>
              </h3>
              <button onClick={() => setIsCancelModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer border-none bg-transparent">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Are you sure you want to cancel booking <strong className="text-slate-800">{cancelBooking?.bookingId}</strong>? This will release reserved dates on the calendar.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Cancellation Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="Guest requested cancellation">Guest requested cancellation</option>
                  <option value="Change of dates/plans">Change of dates/plans</option>
                  <option value="Payment not received">Payment not received</option>
                  <option value="Property maintenance">Property maintenance</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Internal Notes (Optional)</label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
                  placeholder="Reason or guest feedback..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer border-none"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-6 gap-3 print:hidden">
        <div className="space-y-1 text-center sm:text-left">
          <span className="block text-slate-707 font-extrabold text-[11px]">WOW Gateways</span>
          <span>© 2024 WOW Gateways. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Privacy Policy</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Terms of Service</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
