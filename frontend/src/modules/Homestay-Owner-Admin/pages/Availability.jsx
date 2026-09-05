import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft,
  Share2,
  Calendar,
  Plus,
  Lock,
  RefreshCw,
  Home,
  CheckCircle,
  Clock,
  X,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Info,
  Building2,
  Copy,
  AlertTriangle,
  Check,
  BedDouble,
  FileText,
  Receipt,
  CreditCard,
  Printer,
  Edit3,
  Trash2,
  Send,
  ExternalLink,
  DollarSign,
  CalendarDays,
  CalendarClock,
  UserCheck,
  Ban,
  Mail,
  Download,
  User,
  Briefcase,
  ShieldCheck
} from 'lucide-react';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Availability() {
  const navigate = useNavigate();
  const location = useLocation();

  const getAuthToken = () => {
    return localStorage.getItem('homestayOwnerToken') || localStorage.getItem('superAdminToken');
  };

  // Date, viewMode and filter states
  const now = new Date();
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'weekly' | 'today'
  const [currentDate, setCurrentDate] = useState(todayDateString);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [roomTypeFilter, setRoomTypeFilter] = useState('All');

  // Interactive Range Selection on the Calendar
  const [selectionRoom, setSelectionRoom] = useState(null);
  const [selectionCategory, setSelectionCategory] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Property selection state
  const [propertiesList, setPropertiesList] = useState([]);
  const [currentPropertyId, setCurrentPropertyId] = useState(null);

  // Calendar data from backend
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal / Drawer states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStage, setShareStage] = useState('select'); // 'select' | 'ready'
  const [shareLinkType, setShareLinkType] = useState('guest'); // 'guest' | 'agent'
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Reschedule Stay Modal state
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleCheckIn, setRescheduleCheckIn] = useState('');
  const [rescheduleCheckOut, setRescheduleCheckOut] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Record / Update Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Cancel Booking Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Guest requested cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Edit Booking Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editAddOns, setEditAddOns] = useState(0);
  const [editAddOnsRemark, setEditAddOnsRemark] = useState('');
  const [editSpecialRequests, setEditSpecialRequests] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Tax Invoice Modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Block Dates modal form state
  const [blockCategory, setBlockCategory] = useState('');
  const [blockRoomNo, setBlockRoomNo] = useState('');
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('Maintenance');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Date Formatting Helpers
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  };

  const formatFullDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
  };

  const getNextDayStr = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Selection state helper for calendar cells
  const getCellSelectionState = (roomNo, dateStr) => {
    if (selectionRoom !== roomNo || !selectionStart) return 'NONE';

    let start = selectionStart;
    let end = selectionEnd;

    if (!end && hoverDate && hoverDate !== start) {
      if (hoverDate > start) {
        end = hoverDate;
      } else {
        start = hoverDate;
        end = selectionStart;
      }
    }

    if (!end) {
      return dateStr === start ? 'SINGLE' : 'NONE';
    }

    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;

    if (dateStr === actualStart && dateStr === actualEnd) return 'SINGLE';
    if (dateStr === actualStart) return 'START';
    if (dateStr === actualEnd) return 'END';
    if (dateStr > actualStart && dateStr < actualEnd) return 'BETWEEN';
    return 'NONE';
  };

  const handleCellMouseEnter = (roomNo, dateStr) => {
    if (selectionRoom === roomNo && selectionStart && !selectionEnd) {
      setHoverDate(dateStr);
    }
  };

  // Available cell click handler (Start & End Date Range Selection)
  const handleAvailableCellClick = (cat, roomNo, d) => {
    const clickedDate = d.dateString;

    // If starting fresh or clicking a different room:
    if (selectionRoom !== roomNo || !selectionStart || (selectionStart && selectionEnd)) {
      setSelectionRoom(roomNo);
      setSelectionCategory(cat);
      setSelectionStart(clickedDate);
      setSelectionEnd(null);
      setHoverDate(null);
      return;
    }

    // If clicking same date again, select next day as checkout (1 night stay)
    if (clickedDate === selectionStart) {
      setSelectionEnd(getNextDayStr(clickedDate));
      setHoverDate(null);
      return;
    }

    let s = selectionStart;
    let e = clickedDate;
    if (clickedDate < selectionStart) {
      s = clickedDate;
      e = selectionStart;
    }

    // Check if intermediate nights are free
    const roomMatrix = availabilityData?.matrix?.[roomNo] || {};
    let hasObstacle = false;
    const [sY, sM, sD] = s.split('-').map(Number);
    const [eY, eM, eD] = e.split('-').map(Number);
    let curD = new Date(sY, sM - 1, sD);
    const endD = new Date(eY, eM - 1, eD);

    while (curD < endD) {
      const curStr = `${curD.getFullYear()}-${String(curD.getMonth() + 1).padStart(2, '0')}-${String(curD.getDate()).padStart(2, '0')}`;
      const cellStatus = roomMatrix[curStr]?.status;
      if (cellStatus && cellStatus !== 'AVAILABLE') {
        hasObstacle = true;
        break;
      }
      curD.setDate(curD.getDate() + 1);
    }

    if (hasObstacle) {
      Swal.fire({
        icon: 'warning',
        title: 'Dates Unavailable',
        text: `Some dates between ${s} and ${e} are already booked or blocked for Room ${roomNo}. Please select a contiguous available range.`,
        timer: 2500,
        showConfirmButton: false
      });
      setSelectionStart(clickedDate);
      setSelectionEnd(null);
      setHoverDate(null);
      return;
    }

    setSelectionStart(s);
    setSelectionEnd(e);
    setHoverDate(null);
  };

  const handleClearSelection = () => {
    setSelectionRoom(null);
    setSelectionCategory(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setHoverDate(null);
  };

  const handleCreateBookingFromSelection = () => {
    if (!selectionRoom || !selectionStart) return;
    const checkOut = selectionEnd || getNextDayStr(selectionStart);
    navigate(`/homestay-owner/bookings/create?propertyId=${currentPropertyId}&room=${encodeURIComponent(selectionRoom)}&checkIn=${selectionStart}&checkOut=${checkOut}&roomCategoryId=${selectionCategory?.categoryId || ''}`);
  };

  const handleBlockFromSelection = () => {
    if (!selectionRoom || !selectionStart) return;
    setBlockRoomNo(selectionRoom);
    if (selectionCategory?.categoryId) {
      setBlockCategory(selectionCategory.categoryId);
    }
    setBlockStartDate(selectionStart);
    setBlockEndDate(selectionEnd || selectionStart);
    setIsBlockModalOpen(true);
  };

  const selectedNights = useMemo(() => {
    if (!selectionStart) return 1;
    if (!selectionEnd) return 1;
    const [sY, sM, sD] = selectionStart.split('-').map(Number);
    const [eY, eM, eD] = selectionEnd.split('-').map(Number);
    const startObj = new Date(sY, sM - 1, sD);
    const endObj = new Date(eY, eM - 1, eD);
    const diffMs = endObj - startObj;
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  }, [selectionStart, selectionEnd]);

  // Initialize query parameters or localStorage if available
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pId = searchParams.get('propertyId');
    if (pId) {
      setCurrentPropertyId(pId);
      localStorage.setItem('wow_homestay_selected_property', pId);
    } else {
      const saved = localStorage.getItem('wow_homestay_selected_property');
      if (saved) {
        setCurrentPropertyId(saved);
      }
    }
  }, [location.search]);

  // Handler for changing active homestay property
  const handlePropertyChange = (newPropId) => {
    setCurrentPropertyId(newPropId);
    localStorage.setItem('wow_homestay_selected_property', newPropId);
    navigate(`?propertyId=${newPropId}`, { replace: true });
    handleClearSelection();
  };

  // Fetch Availability Matrix from backend
  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        navigate('/homestay-owner/login');
        return;
      }

      const params = {
        view: viewMode,
        roomType: roomTypeFilter
      };

      if (viewMode === 'monthly') {
        params.month = selectedMonth;
        params.year = selectedYear;
      } else {
        params.startDate = currentDate;
      }

      if (currentPropertyId) {
        params.propertyId = currentPropertyId;
      }

      const res = await axios.get(getApiUrl('/api/homestay-owner/availability'), {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      setAvailabilityData(res.data);
      if (res.data.property && !currentPropertyId) {
        setCurrentPropertyId(res.data.property.id);
        localStorage.setItem('wow_homestay_selected_property', res.data.property.id);
      }
      if (res.data.allProperties) {
        setPropertiesList(res.data.allProperties);
      }

      // Pre-fill block modal defaults if rooms available
      if (res.data.categories && res.data.categories.length > 0) {
        const firstCat = res.data.categories[0];
        setBlockCategory(firstCat.categoryId);
        if (firstCat.roomNumbers && firstCat.roomNumbers.length > 0) {
          setBlockRoomNo(firstCat.roomNumbers[0]);
        }
      }

      // Default block date range
      const defStart = viewMode === 'monthly' ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01` : currentDate;
      setBlockStartDate(defStart);
      setBlockEndDate(defStart);

    } catch (err) {
      console.error('Failed to load availability calendar:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Auth issue
      } else {
        Swal.fire('Error', 'Unable to load room availability from server.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [viewMode, currentDate, selectedMonth, selectedYear, roomTypeFilter, currentPropertyId]);

  // Navigation handlers for Today, Weekly, Monthly
  const handlePrev = () => {
    handleClearSelection();
    if (viewMode === 'today') {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 1);
      setCurrentDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else if (viewMode === 'weekly') {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - 7);
      setCurrentDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    }
  };

  const handleNext = () => {
    handleClearSelection();
    if (viewMode === 'today') {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + 1);
      setCurrentDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else if (viewMode === 'weekly') {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + 7);
      setCurrentDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    }
  };

  const handleGoToToday = () => {
    handleClearSelection();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setCurrentDate(todayStr);
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  const handleViewModeChange = (mode) => {
    handleClearSelection();
    setViewMode(mode);
    if (mode === 'monthly') {
      const [y, m] = currentDate.split('-').map(Number);
      if (y && m) {
        setSelectedMonth(m);
        setSelectedYear(y);
      }
    }
  };

  // Dynamic room numbers for block modal category selection
  const blockAvailableRooms = useMemo(() => {
    if (!availabilityData?.categories) return [];
    const cat = availabilityData.categories.find(c => c.categoryId === blockCategory);
    return cat ? cat.roomNumbers : [];
  }, [availabilityData, blockCategory]);

  const handleBlockCategoryChange = (catId) => {
    setBlockCategory(catId);
    const cat = availabilityData?.categories?.find(c => c.categoryId === catId);
    if (cat && cat.roomNumbers?.length > 0) {
      setBlockRoomNo(cat.roomNumbers[0]);
    } else {
      setBlockRoomNo('');
    }
  };

  // Block dates submission
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (!currentPropertyId || !blockRoomNo || !blockStartDate || !blockEndDate) {
      Swal.fire('Validation Error', 'Please select a room and a valid date range.', 'warning');
      return;
    }

    try {
      setBlockSubmitting(true);
      const token = getAuthToken();
      await axios.post(getApiUrl('/api/homestay-owner/block-dates'), {
        propertyId: currentPropertyId,
        roomCategoryId: blockCategory,
        roomNumber: blockRoomNo,
        startDate: blockStartDate,
        endDate: blockEndDate,
        reason: blockReason,
        notes: blockNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsBlockModalOpen(false);
      setBlockNotes('');
      Swal.fire({
        icon: 'success',
        title: 'Dates Blocked',
        text: `Room ${blockRoomNo} has been blocked from ${blockStartDate} to ${blockEndDate}.`,
        timer: 2000,
        showConfirmButton: false
      });
      fetchAvailability();
    } catch (err) {
      console.error('Error blocking room:', err);
      const errMsg = err.response?.data?.message || 'Failed to block room dates.';
      Swal.fire('Conflict Error', errMsg, 'error');
    } finally {
      setBlockSubmitting(false);
    }
  };

  // Unblock dates submission
  const handleUnblockSubmit = async () => {
    if (!selectedBlock?.blockId) return;
    try {
      const token = getAuthToken();
      await axios.delete(getApiUrl(`/api/homestay-owner/block-dates/${selectedBlock.blockId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedBlock(null);
      Swal.fire({
        icon: 'success',
        title: 'Room Unblocked',
        text: `Room ${selectedBlock.roomNo} is now open for bookings.`,
        timer: 1800,
        showConfirmButton: false
      });
      fetchAvailability();
    } catch (err) {
      console.error('Error unblocking room:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to unblock room.', 'error');
    }
  };

  // Cell click handler for bookings, blocks, and available rooms
  const handleCellClick = async (roomNo, dayInfo, cell) => {
    if (!cell) return;

    if (cell.status === 'BOOKED' || cell.status === 'HOLD' || cell.bookingStatus === 'Pending') {
      const isHold = cell.status === 'HOLD' || cell.bookingStatus === 'Hold' || cell.bookingStatus === 'Pending';
      const initialBooking = {
        id: cell.bookingId,
        dbId: cell.dbId,
        guestName: cell.guestName,
        roomNo,
        phone: cell.phone || 'Not provided',
        email: cell.email || '',
        checkIn: cell.checkIn ? new Date(cell.checkIn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
        checkOut: cell.checkOut ? new Date(cell.checkOut).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
        rawCheckIn: cell.checkIn ? cell.checkIn.split('T')[0] : '',
        rawCheckOut: cell.checkOut ? cell.checkOut.split('T')[0] : '',
        status: isHold ? 'Hold' : (cell.bookingStatus || 'Confirmed'),
        bookingStatus: isHold ? 'Hold' : (cell.bookingStatus || 'Confirmed'),
        paymentStatus: cell.paymentStatus || (isHold ? 'Unpaid' : 'Partial'),
        totalAmount: cell.totalAmount || 0,
        paidAmount: cell.paidAmount || 0,
        pendingAmount: cell.pendingAmount || 0,
        addOns: cell.addOns || 0,
        addOnsRemark: cell.addOnsRemark || '',
        specialRequests: cell.specialRequests || cell.notes || '',
        notes: cell.notes || cell.specialRequests || '',
        bookedRooms: cell.bookedRooms || [{ roomNumber: roomNo }],
        propertyDetails: cell.propertyDetails || availabilityData?.property || {},
        paymentHistory: cell.paymentHistory || [],
        timeline: cell.timeline || []
      };
      setSelectedBooking(initialBooking);

      // Asynchronously fetch complete fresh booking details from server
      if (cell.dbId || cell.bookingId) {
        try {
          const token = getAuthToken();
          const res = await axios.get(getApiUrl(`/api/homestay-owner/bookings/${cell.dbId || cell.bookingId}`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.booking || res.data) {
            const b = res.data.booking || res.data;
            const finalCheckIn = b.checkInDate || b.dates?.checkIn;
            const finalCheckOut = b.checkOutDate || b.dates?.checkOut;
            const totalAmt = Number(b.pricing?.finalAmount || b.amount || b.pricing?.totalAmount || cell.totalAmount || 0);
            const paidAmt = Number(b.pricing?.paidAmount || b.pricing?.advancePaid || cell.paidAmount || 0);
            const pendAmt = b.pricing?.pendingAmount !== undefined ? Number(b.pricing.pendingAmount) : Math.max(0, totalAmt - paidAmt);
            const taxAmt = Number(b.pricing?.tax || 0);
            const addOnsAmt = Number(b.pricing?.addOns || 0);
            const baseTariffAmt = Number(b.pricing?.bookingAmount || b.pricing?.baseRate || b.pricing?.baseTariff || Math.max(0, totalAmt - taxAmt - addOnsAmt));

            setSelectedBooking({
              id: b.bookingId,
              dbId: b._id,
              guestName: b.customer?.name || b.guestDetails?.fullName || cell.guestName,
              phone: b.customer?.mobile || b.customer?.phone || b.guestDetails?.phone || cell.phone || 'Not provided',
              email: b.customer?.email || b.guestDetails?.email || cell.email || '',
              roomNo: b.bookedRooms?.map(r => r.roomNumber).join(', ') || roomNo,
              bookedRooms: b.bookedRooms || [{ roomNumber: roomNo }],
              checkIn: finalCheckIn ? new Date(finalCheckIn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : cell.checkIn,
              checkOut: finalCheckOut ? new Date(finalCheckOut).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : cell.checkOut,
              rawCheckIn: finalCheckIn ? String(finalCheckIn).split('T')[0] : cell.rawCheckIn,
              rawCheckOut: finalCheckOut ? String(finalCheckOut).split('T')[0] : cell.rawCheckOut,
              status: b.bookingStatus,
              bookingStatus: b.bookingStatus,
              paymentStatus: b.paymentStatus,
              totalAmount: totalAmt,
              paidAmount: paidAmt,
              pendingAmount: pendAmt,
              baseTariff: baseTariffAmt,
              tax: taxAmt,
              addOns: addOnsAmt,
              addOnsRemark: b.pricing?.addOnsRemark || cell.addOnsRemark || '',
              mealPlan: b.bookedRooms?.[0]?.mealPlan || b.mealPlan || 'EP',
              specialRequests: b.specialRequests || b.notes || cell.specialRequests || cell.notes || '',
              notes: b.notes || b.specialRequests || cell.notes || cell.specialRequests || '',
              propertyDetails: b.propertyId || availabilityData?.property || {},
              paymentHistory: b.paymentHistory || cell.paymentHistory || [],
              timeline: b.timeline || cell.timeline || []
            });
          }
        } catch (fetchErr) {
          console.error('Error fetching full booking record:', fetchErr);
        }
      }
    } else if (cell.status === 'BLOCKED' || cell.status === 'BLOCKED_BY_OWNER') {
      setSelectedBlock({
        blockId: cell.blockId,
        roomNo,
        reason: cell.reason || 'Maintenance',
        notes: cell.notes || '',
        date: dayInfo.dateString,
        blockedBy: cell.blockedBy || 'Owner'
      });
    } else if (cell.status === 'AVAILABLE') {
      // Direct jump to booking wizard pre-filling this room and date
      const dObj = new Date(dayInfo.dateString);
      dObj.setDate(dObj.getDate() + 1);
      const nextDay = dObj.toISOString().split('T')[0];
      navigate(`/homestay-owner/bookings/create?propertyId=${currentPropertyId}&room=${encodeURIComponent(roomNo)}&checkIn=${dayInfo.dateString}&checkOut=${nextDay}`);
    }
  };

  // 1. Confirm Hold Booking
  const handleConfirmHold = async () => {
    if (!selectedBooking?.dbId && !selectedBooking?.id) return;
    const result = await Swal.fire({
      title: 'Confirm Booking?',
      text: `Are you sure you want to convert Hold #${selectedBooking.id} to Confirmed?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Confirm Booking'
    });

    if (!result.isConfirmed) return;

    try {
      const token = getAuthToken();
      await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}/confirm-hold`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Booking Confirmed',
        text: 'Hold status has been upgraded to Confirmed.',
        timer: 2000,
        showConfirmButton: false
      });
      setSelectedBooking(prev => prev ? { ...prev, status: 'Confirmed', bookingStatus: 'Confirmed' } : null);
      fetchAvailability();
    } catch (err) {
      console.error('Error confirming hold:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to confirm hold booking.', 'error');
    }
  };

  // 2. Remove Hold Booking
  const handleRemoveHold = async () => {
    if (!selectedBooking?.dbId && !selectedBooking?.id) return;
    const result = await Swal.fire({
      title: 'Remove Hold?',
      text: `Are you sure you want to release the hold for Room ${selectedBooking.roomNo}? This will immediately free up the room on the calendar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Remove Hold'
    });

    if (!result.isConfirmed) return;

    try {
      const token = getAuthToken();
      await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}/remove-hold`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Hold Removed',
        text: `Room ${selectedBooking.roomNo} is now open for bookings.`,
        timer: 2000,
        showConfirmButton: false
      });
      setSelectedBooking(null);
      fetchAvailability();
    } catch (err) {
      console.error('Error removing hold:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to remove hold.', 'error');
    }
  };

  // 3. Reschedule Stay
  const handleOpenRescheduleModal = () => {
    setRescheduleCheckIn(selectedBooking?.rawCheckIn || '');
    setRescheduleCheckOut(selectedBooking?.rawCheckOut || '');
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleCheckIn || !rescheduleCheckOut) {
      Swal.fire('Validation', 'Please select both check-in and check-out dates.', 'warning');
      return;
    }
    if (rescheduleCheckIn >= rescheduleCheckOut) {
      Swal.fire('Validation', 'Check-out date must be strictly after check-in date.', 'warning');
      return;
    }

    try {
      setRescheduleSubmitting(true);
      const token = getAuthToken();
      await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}/reschedule`), {
        newCheckIn: rescheduleCheckIn,
        newCheckOut: rescheduleCheckOut
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsRescheduleModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Stay Rescheduled',
        text: `Booking moved to ${rescheduleCheckIn} → ${rescheduleCheckOut}.`,
        timer: 2200,
        showConfirmButton: false
      });
      setSelectedBooking(prev => prev ? {
        ...prev,
        checkIn: new Date(rescheduleCheckIn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        checkOut: new Date(rescheduleCheckOut).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        rawCheckIn: rescheduleCheckIn,
        rawCheckOut: rescheduleCheckOut
      } : null);
      fetchAvailability();
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      Swal.fire('Conflict / Error', err.response?.data?.message || 'Failed to reschedule booking dates.', 'error');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // 4. Record Next Payment Installment
  const handleOpenPaymentModal = () => {
    setPaymentAmount(selectedBooking?.pendingAmount ? String(selectedBooking.pendingAmount) : '');
    setPaymentMethod('UPI');
    setPaymentTransactionId('');
    setPaymentRemark('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      Swal.fire('Validation', 'Please enter a valid payment amount in ₹.', 'warning');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}/payment`), {
        amount: amt,
        method: paymentMethod,
        transactionId: paymentTransactionId,
        remark: paymentRemark
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updated = res.data?.booking;
      setIsPaymentModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Payment Recorded',
        text: `Successfully recorded installment of ₹${amt.toLocaleString()}.`,
        timer: 2000,
        showConfirmButton: false
      });

      if (updated) {
        setSelectedBooking(prev => ({
          ...prev,
          paidAmount: updated.pricing?.advancePaid || (prev.paidAmount + amt),
          pendingAmount: updated.pricing?.pendingAmount ?? Math.max(0, prev.pendingAmount - amt),
          paymentStatus: updated.paymentStatus || (updated.pricing?.pendingAmount === 0 ? 'Paid' : 'Partial'),
          paymentHistory: updated.paymentHistory || prev.paymentHistory
        }));
      }
      fetchAvailability();
    } catch (err) {
      console.error('Error recording payment:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to record payment.', 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // 5. Cancel Booking
  const handleOpenCancelModal = () => {
    setCancelReason('Guest requested cancellation');
    setCancelNotes('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setCancelSubmitting(true);
      const token = getAuthToken();
      await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}/cancel`), {
        reason: cancelReason,
        notes: cancelNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsCancelModalOpen(false);
      setSelectedBooking(null);
      Swal.fire({
        icon: 'success',
        title: 'Booking Cancelled',
        text: 'The booking has been cancelled and rooms are now open.',
        timer: 2000,
        showConfirmButton: false
      });
      fetchAvailability();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to cancel booking.', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // 6. Edit Booking Details (Guest & Add-ons Remark)
  const handleOpenEditModal = () => {
    setEditGuestName(selectedBooking?.guestName || '');
    setEditGuestPhone(selectedBooking?.phone === 'Not provided' ? '' : selectedBooking?.phone || '');
    setEditGuestEmail(selectedBooking?.email || '');
    setEditAddOns(selectedBooking?.addOns || 0);
    setEditAddOnsRemark(selectedBooking?.addOnsRemark || '');
    setEditSpecialRequests(selectedBooking?.specialRequests || selectedBooking?.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditSubmitting(true);
      const token = getAuthToken();
      const res = await axios.patch(getApiUrl(`/api/homestay-owner/bookings/${selectedBooking.dbId || selectedBooking.id}`), {
        customer: {
          name: editGuestName,
          mobile: editGuestPhone,
          email: editGuestEmail
        },
        guestDetails: {
          fullName: editGuestName,
          phone: editGuestPhone,
          email: editGuestEmail
        },
        pricing: {
          addOns: Number(editAddOns) || 0,
          addOnsRemark: editAddOnsRemark
        },
        specialRequests: editSpecialRequests,
        notes: editSpecialRequests
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updated = res.data?.booking || res.data;
      setIsEditModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Booking Updated',
        text: 'Guest details and add-ons have been saved.',
        timer: 2000,
        showConfirmButton: false
      });

      if (updated) {
        setSelectedBooking(prev => {
          if (!prev) return null;
          const newTotal = Number(updated.pricing?.finalAmount || updated.amount || prev.totalAmount || 0);
          const newPaid = Number(updated.pricing?.paidAmount || prev.paidAmount || 0);
          const newPending = updated.pricing?.pendingAmount !== undefined ? Number(updated.pricing.pendingAmount) : Math.max(0, newTotal - newPaid);
          const newTax = Number(updated.pricing?.tax || prev.tax || 0);
          const newAddOns = updated.pricing?.addOns !== undefined ? Number(updated.pricing.addOns) : Number(editAddOns);
          const reqVal = updated.specialRequests !== undefined ? updated.specialRequests : (updated.notes !== undefined ? updated.notes : editSpecialRequests);

          return {
            ...prev,
            guestName: updated.customer?.name || updated.guestDetails?.fullName || editGuestName,
            phone: updated.customer?.mobile || updated.customer?.phone || updated.guestDetails?.phone || editGuestPhone,
            email: updated.customer?.email !== undefined ? updated.customer.email : (updated.guestDetails?.email || editGuestEmail),
            addOns: newAddOns,
            addOnsRemark: updated.pricing?.addOnsRemark ?? editAddOnsRemark,
            specialRequests: reqVal,
            notes: reqVal,
            totalAmount: newTotal,
            paidAmount: newPaid,
            pendingAmount: newPending,
            baseTariff: Math.max(0, newTotal - newTax - newAddOns),
            tax: newTax
          };
        });
      }
      fetchAvailability();
    } catch (err) {
      console.error('Error updating booking:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to update booking.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // 7. WhatsApp Share from Drawer
  const handleWhatsAppShareFromDrawer = () => {
    if (!selectedBooking) return;
    const rawPhone = (selectedBooking.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const propName = propertyName || 'our Homestay';
    const isHold = selectedBooking.bookingStatus === 'Hold';

    const msg = isHold
      ? `Namaste ${selectedBooking.guestName}! 🙏\n\nYour tentative reservation at *${propName}* is ON HOLD.\n\n📋 Ref: #${selectedBooking.id}\n📅 Check-In: ${selectedBooking.checkIn}\n📅 Check-Out: ${selectedBooking.checkOut}\n🛏️ Room: ${selectedBooking.roomNo}\n💰 Total Amount: ₹${Number(selectedBooking.totalAmount).toLocaleString()}\n\nPlease confirm with payment to secure your room.`
      : `Namaste ${selectedBooking.guestName}! 🙏\n\nYour booking at *${propName}* is CONFIRMED!\n\n📋 Booking Ref: #${selectedBooking.id}\n📅 Check-In: ${selectedBooking.checkIn}\n📅 Check-Out: ${selectedBooking.checkOut}\n🛏️ Room: ${selectedBooking.roomNo}\n💰 Total: ₹${Number(selectedBooking.totalAmount).toLocaleString()}\n💳 Paid: ₹${Number(selectedBooking.paidAmount).toLocaleString()}\n⏳ Balance Due: ₹${Number(selectedBooking.pendingAmount).toLocaleString()}\n\nView confirmation slip: ${window.location.origin}/homestay-owner/bookings/confirmation-slip/${selectedBooking.dbId || selectedBooking.id}\n\nWe look forward to hosting you!`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Share availability generator handler
  const handleGenerateShareLink = async (linkType) => {
    if (!currentPropertyId) {
      Swal.fire({
        icon: 'warning',
        title: 'No Property Selected',
        text: 'Please select a property first.',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    try {
      setIsGeneratingLink(true);
      const token = getAuthToken();
      const res = await axios.post(
        getApiUrl('/api/homestay-owner/share-link'),
        { propertyId: currentPropertyId, linkType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success && res.data?.token) {
        const fullUrl = `${window.location.origin}/book/${res.data.token}`;
        setGeneratedShareLink(fullUrl);
        setShareLinkType(linkType);
        setShareStage('ready');
      } else {
        throw new Error(res.data?.message || 'Failed to generate link');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Generate Link',
        text: err.response?.data?.message || err.message || 'Could not generate share link.',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!generatedShareLink) return;
    navigator.clipboard.writeText(generatedShareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const propertyName = availabilityData?.property?.name || 'My Homestay';
  const days = availabilityData?.days || [];
  const categories = availabilityData?.categories || [];
  const matrix = availabilityData?.matrix || {};
  const todaySummary = availabilityData?.todaySummary || {
    dateString: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    blockedRooms: 0,
    availablePercent: 0,
    occupiedPercent: 0,
    blockedPercent: 0
  };

  return (
    <div className="space-y-6 select-none font-sans pb-16">
      
      {/* 1. TOP BREADCRUMB & PROPERTY SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 text-[10px] font-black uppercase text-slate-400"
          >
            <ArrowLeft size={11} className="stroke-[3]" />
            <span>Back</span>
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/homestay-owner/dashboard')}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer p-0 text-[10px] font-black uppercase text-slate-400"
          >
            Dashboard
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/homestay-owner/inventory')}
            className="hover:text-slate-600 bg-transparent border-none cursor-pointer p-0 text-[10px] font-black uppercase text-slate-400"
          >
            My Homestays
          </button>
          <span>/</span>
          <span className="text-slate-700 font-black">{propertyName}</span>
          <span>/</span>
          <span className="text-rose-700 font-extrabold">Room Availability</span>
        </div>

        {/* Property Context Switcher (if multiple properties exist) */}
        {propertiesList.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 size={12} className="text-slate-400" />
            <select
              value={currentPropertyId || ''}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {propertiesList.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.city || 'Homestay'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Room Availability / Calendar</h1>
          <p className="text-xs font-semibold text-slate-400">
            Check and manage room availability for your homestay.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Share Availability Button */}
          <button
            onClick={() => {
              setShareStage('select');
              setGeneratedShareLink('');
              setIsCopied(false);
              setIsShareModalOpen(true);
            }}
            className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-2.5 shadow-sm transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Share2 size={13} className="stroke-[2.5]" />
            </div>
            <div className="text-left">
              <span className="block font-black leading-none text-rose-700">Share Availability</span>
              <span className="block text-[8px] text-slate-400 font-bold leading-none mt-0.5">Share calendar link with guests</span>
            </div>
            <ChevronRight size={13} className="text-slate-400 ml-1" />
          </button>

          {/* Go to Today Button */}
          <button
            onClick={handleGoToToday}
            className="px-4.5 py-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Calendar size={13} className="text-rose-600" />
            <span>Go to Today</span>
          </button>
        </div>
      </div>

      {/* 3. FILTER CONTROL BAR */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {/* Select Homestay */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 size={11} className="text-rose-600" />
              <span>Select Homestay</span>
            </label>
            <select
              value={currentPropertyId || ''}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
            >
              {propertiesList.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name || p.propertyId} {p.roomCount ? `(${p.roomCount} Rooms)` : ''} - {p.status}
                </option>
              ))}
            </select>
          </div>

          {/* Month / Date Selector based on viewMode */}
          {viewMode === 'monthly' ? (
            <>
              {/* Select Month */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Month</label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Select Year */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{viewMode === 'today' ? 'Selected Day' : 'Week Starting From'}</span>
                <span className="text-rose-600 font-bold capitalize">{viewMode} View</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    handleClearSelection();
                    setCurrentDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Room Type */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Type</label>
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
            >
              <option value="All">All Room Types</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryName}>
                  {cat.categoryName} ({cat.numberOfRooms} Rooms)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="px-5 py-2.5 border-2 border-rose-600 hover:bg-rose-50 text-rose-700 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Lock size={12} className="stroke-[2.5]" />
            <span>Block Dates</span>
          </button>
          
          <button
            onClick={() => navigate(`/homestay-owner/bookings/create?propertyId=${currentPropertyId}`)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center gap-1.5 shadow-md shadow-rose-200 transition-all"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>CREATE BOOKING</span>
          </button>
        </div>
      </div>

      {/* 4. CALENDAR PMS GRID CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header Controller Bar with Prev/Next, Date Display, and View Mode Switcher */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50/70">
          {/* Left: Navigation Controls */}
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handlePrev}
              className="p-2 hover:bg-slate-200 rounded-xl cursor-pointer bg-white border border-slate-200 text-slate-700 transition-all shadow-xs"
              title={viewMode === 'today' ? 'Previous Day' : viewMode === 'weekly' ? 'Previous Week' : 'Previous Month'}
            >
              <ChevronLeft size={16} className="stroke-[2.5]" />
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <Calendar size={16} className="text-rose-600" />
              <div className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {viewMode === 'today' ? (
                  <div className="flex items-center gap-2">
                    <span>{formatFullDateDisplay(currentDate)}</span>
                    {currentDate === todayDateString && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded uppercase">
                        Today
                      </span>
                    )}
                  </div>
                ) : viewMode === 'weekly' ? (
                  <span>
                    {formatDateDisplay(availabilityData?.startDate || currentDate)} - {formatDateDisplay(availabilityData?.endDate || currentDate)}, {availabilityData?.year || selectedYear}
                  </span>
                ) : (
                  <span>
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                )}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleNext}
              className="p-2 hover:bg-slate-200 rounded-xl cursor-pointer bg-white border border-slate-200 text-slate-700 transition-all shadow-xs"
              title={viewMode === 'today' ? 'Next Day' : viewMode === 'weekly' ? 'Next Week' : 'Next Month'}
            >
              <ChevronRight size={16} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Right: View Mode Segmented Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => handleViewModeChange('today')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'today'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <span>Today</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('weekly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'weekly'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <span>Weekly</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                  viewMode === 'monthly'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                <span>Monthly</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid / Board viewport */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-rose-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading dynamic room availability...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <BedDouble size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-black text-slate-800">No rooms found for "{propertyName}"</p>
                <p className="text-xs text-slate-400">Select another homestay using the dropdown above or switch below:</p>
              </div>
              {propertiesList.filter(p => p._id !== currentPropertyId && (p.roomCount > 0 || p.rooms > 0)).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {propertiesList
                    .filter(p => p._id !== currentPropertyId && (p.roomCount > 0 || p.rooms > 0))
                    .map(p => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handlePropertyChange(p._id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black rounded-xl border border-rose-200 cursor-pointer shadow-xs transition-all"
                      >
                        Switch to {p.name} ({p.roomCount || p.rooms} Rooms)
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : viewMode === 'today' ? (
            /* Dedicated Day View Board */
            <div className="p-6 space-y-6">
              {categories.map(cat => (
                <div key={cat.categoryId} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    <BedDouble size={16} className="text-rose-600" />
                    <span>{cat.categoryName}</span>
                    <span className="text-slate-400 font-bold">({cat.roomNumbers?.length || cat.numberOfRooms} Rooms)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cat.roomNumbers.map(roomNo => {
                      const dateStr = days[0]?.dateString || currentDate;
                      const cell = (matrix[roomNo] && matrix[roomNo][dateStr]) || { status: 'AVAILABLE' };

                      if (cell.status === 'HOLD' || cell.bookingStatus === 'Hold' || cell.bookingStatus === 'Pending') {
                        return (
                          <div 
                            key={roomNo}
                            onClick={() => handleCellClick(roomNo, days[0], cell)}
                            className="bg-amber-50/90 border border-amber-300 hover:border-amber-500 rounded-2xl p-4.5 cursor-pointer shadow-xs transition-all space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-amber-600 text-white font-black text-xs rounded-lg">
                                  Room {roomNo}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[9px] rounded uppercase border border-amber-300">
                                  On Hold
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-800">#{cell.bookingId}</span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900">{cell.guestName}</h4>
                              <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                                <Phone size={11} />
                                <span>{cell.phone || 'No phone'}</span>
                              </p>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 pt-2 border-t border-amber-200">
                              <span>In: {formatDateDisplay(cell.checkIn?.split('T')[0])}</span>
                              <span>Out: {formatDateDisplay(cell.checkOut?.split('T')[0])}</span>
                            </div>

                            <div className="flex justify-between items-center pt-1 text-[10px] font-black text-amber-800">
                              <span>Total: ₹{(cell.totalAmount || 0).toLocaleString()}</span>
                              <span className="underline">Hold Options →</span>
                            </div>
                          </div>
                        );
                      }

                      if (cell.status === 'BOOKED') {
                        return (
                          <div 
                            key={roomNo}
                            onClick={() => handleCellClick(roomNo, days[0], cell)}
                            className="bg-sky-50/70 border border-sky-200 hover:border-sky-400 rounded-2xl p-4.5 cursor-pointer shadow-xs transition-all space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-sky-600 text-white font-black text-xs rounded-lg">
                                  Room {roomNo}
                                </span>
                                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-black text-[9px] rounded uppercase">
                                  Booked
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-sky-700">#{cell.bookingId}</span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900">{cell.guestName}</h4>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <Phone size={11} />
                                <span>{cell.phone || 'No phone'}</span>
                              </p>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 pt-2 border-t border-sky-100">
                              <span>In: {formatDateDisplay(cell.checkIn?.split('T')[0])}</span>
                              <span>Out: {formatDateDisplay(cell.checkOut?.split('T')[0])}</span>
                            </div>

                            <div className="flex justify-between items-center pt-1 text-[10px] font-black text-sky-800">
                              <span>Total: ₹{(cell.totalAmount || 0).toLocaleString()}</span>
                              <span className="underline">Details & Actions →</span>
                            </div>
                          </div>
                        );
                      }

                      if (cell.status === 'BLOCKED' || cell.status === 'BLOCKED_BY_OWNER') {
                        return (
                          <div 
                            key={roomNo}
                            onClick={() => handleCellClick(roomNo, days[0], cell)}
                            className="bg-rose-50/70 border border-rose-200 hover:border-rose-400 rounded-2xl p-4.5 cursor-pointer shadow-xs transition-all space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-xs rounded-lg">
                                  Room {roomNo}
                                </span>
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[9px] rounded uppercase">
                                  Blocked
                                </span>
                              </div>
                              <Lock size={14} className="text-rose-600" />
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-slate-900">Reason: {cell.reason}</h4>
                              <p className="text-xs text-slate-500 font-medium truncate">
                                {cell.notes || `Blocked by ${cell.blockedBy || 'Owner'}`}
                              </p>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-rose-100">
                              <span className="text-[10px] font-black text-rose-700 uppercase">Click to Unblock →</span>
                            </div>
                          </div>
                        );
                      }

                      // Available
                      return (
                        <div 
                          key={roomNo}
                          className="bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 rounded-2xl p-4.5 shadow-xs transition-all space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg">
                                Room {roomNo}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] rounded uppercase">
                                Available
                              </span>
                            </div>
                            <CheckCircle size={14} className="text-emerald-600" />
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-sm font-black text-slate-800">Open for Booking</h4>
                            <p className="text-xs text-slate-400 font-medium">Ready for guest check-in</p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                            <button
                              type="button"
                              onClick={() => {
                                const nextDay = getNextDayStr(dateStr);
                                navigate(`/homestay-owner/bookings/create?propertyId=${currentPropertyId}&room=${encodeURIComponent(roomNo)}&checkIn=${dateStr}&checkOut=${nextDay}&roomCategoryId=${cat.categoryId}`);
                              }}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-xs cursor-pointer border-none transition-all text-center"
                            >
                              + Book Today
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBlockCategory(cat.categoryId);
                                setBlockRoomNo(roomNo);
                                setBlockStartDate(dateStr);
                                setBlockEndDate(dateStr);
                                setIsBlockModalOpen(true);
                              }}
                              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black text-xs uppercase rounded-xl shadow-xs cursor-pointer transition-all"
                              title="Block Room"
                            >
                              <Lock size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Multi-Day Calendar Table (Weekly & Monthly Views) */
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 border-r border-slate-200 w-44 sticky left-0 bg-slate-50 z-10">Date</th>
                  {days.map(d => {
                    const isToday = (
                      now.getDate() === d.day &&
                      (now.getMonth() + 1) === selectedMonth &&
                      now.getFullYear() === selectedYear
                    );
                    return (
                      <th 
                        key={d.dateString || d.day} 
                        className={`py-2 px-1 text-center border-r border-slate-200 w-16 leading-tight select-none ${
                          d.isSunday ? 'text-rose-600 bg-rose-50/20' : ''
                        } ${isToday ? 'ring-2 ring-inset ring-rose-500 bg-rose-50/40' : ''}`}
                      >
                        <span className={`block text-[8px] font-bold uppercase ${d.isSunday ? 'text-rose-600 font-black' : 'text-slate-400'}`}>
                          {d.name}
                        </span>
                        <span className={`block text-xs font-black ${d.isSunday ? 'text-rose-600' : 'text-slate-800'}`}>
                          {d.dayString}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  return (
                    <React.Fragment key={cat.categoryId}>
                      {/* Category Divider Header row */}
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                        <td colSpan={days.length + 1} className="py-2.5 px-4 sticky left-0 z-10 bg-slate-100">
                          <div className="flex items-center gap-2">
                            <BedDouble size={14} className="text-slate-600" />
                            <span>{cat.categoryName}</span>
                            <span className="text-slate-400 font-bold font-sans">({cat.roomNumbers?.length || cat.numberOfRooms} Rooms)</span>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Individual Room Rows */}
                      {cat.roomNumbers.map((roomNo) => (
                        <tr key={roomNo} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4 border-r border-slate-200 font-extrabold text-slate-900 text-xs sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {roomNo}
                          </td>
                          
                          {/* Day Cell blocks */}
                          {days.map((d) => {
                            const dateStr = d.dateString;
                            const cell = (matrix[roomNo] && matrix[roomNo][dateStr]) || { status: 'AVAILABLE' };

                            if (cell.status === 'HOLD' || cell.bookingStatus === 'Hold' || cell.bookingStatus === 'Pending') {
                              return (
                                <td 
                                  key={d.dateString || d.day}
                                  onClick={() => handleCellClick(roomNo, d, cell)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center"
                                  title={`Hold Booking: ${cell.guestName} (#${cell.bookingId})`}
                                >
                                  <div className="h-9 rounded-lg bg-amber-100 border border-amber-400 px-1.5 flex flex-col justify-center text-[9px] font-bold text-amber-900 leading-tight truncate shadow-xs hover:border-amber-500">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="block font-black truncate">{cell.guestName}</span>
                                      <span className="px-1 py-0.2 bg-amber-600 text-white rounded text-[7px] font-black shrink-0">HOLD</span>
                                    </div>
                                    <span className="block text-[7px] text-amber-800 font-semibold truncate">#{cell.bookingId}</span>
                                  </div>
                                </td>
                              );
                            }

                            if (cell.status === 'BOOKED') {
                              return (
                                <td 
                                  key={d.dateString || d.day}
                                  onClick={() => handleCellClick(roomNo, d, cell)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center"
                                  title={`Booked: ${cell.guestName} (#${cell.bookingId})`}
                                >
                                  <div className="h-9 rounded-lg bg-sky-100 border border-sky-300 px-1.5 flex flex-col justify-center text-[9px] font-bold text-sky-800 leading-tight truncate shadow-xs hover:border-sky-400">
                                    <span className="block font-black truncate">{cell.guestName}</span>
                                    <span className="block text-[7px] text-sky-600 font-bold truncate">#{cell.bookingId}</span>
                                  </div>
                                </td>
                              );
                            }

                            if (cell.status === 'BLOCKED') {
                              return (
                                <td 
                                  key={d.dateString || d.day}
                                  onClick={() => handleCellClick(roomNo, d, cell)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center"
                                  title={`Blocked: ${cell.reason}`}
                                >
                                  <div className="h-9 rounded-lg bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border-none shadow-xs">
                                    Blocked
                                  </div>
                                </td>
                              );
                            }

                            if (cell.status === 'BLOCKED_BY_OWNER') {
                              return (
                                <td 
                                  key={d.dateString || d.day}
                                  onClick={() => handleCellClick(roomNo, d, cell)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center"
                                  title={`Blocked by Owner: ${cell.reason}`}
                                >
                                  <div className="h-9 rounded-lg bg-amber-500 text-white font-black text-[9px] flex items-center justify-center border-none shadow-xs">
                                    Blocked
                                  </div>
                                </td>
                              );
                            }

                            // Available Cell with Interactive Range Selection
                            const selState = getCellSelectionState(roomNo, dateStr);

                            if (selState === 'START') {
                              return (
                                <td
                                  key={d.dateString || d.day}
                                  onClick={() => handleAvailableCellClick(cat, roomNo, d)}
                                  onMouseEnter={() => handleCellMouseEnter(roomNo, dateStr)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center h-11 bg-rose-50"
                                  title={`Check-in: ${dateStr}`}
                                >
                                  <div className="w-full h-9 rounded-lg bg-rose-600 text-white flex flex-col items-center justify-center shadow-md font-black text-[9px] leading-tight">
                                    <span>IN</span>
                                    <span className="text-[7px] font-bold opacity-90">{d.dayString}</span>
                                  </div>
                                </td>
                              );
                            }

                            if (selState === 'END') {
                              return (
                                <td
                                  key={d.dateString || d.day}
                                  onClick={() => handleAvailableCellClick(cat, roomNo, d)}
                                  onMouseEnter={() => handleCellMouseEnter(roomNo, dateStr)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center h-11 bg-rose-50"
                                  title={`Check-out: ${dateStr}`}
                                >
                                  <div className="w-full h-9 rounded-lg bg-rose-700 text-white flex flex-col items-center justify-center shadow-md font-black text-[9px] leading-tight">
                                    <span>OUT</span>
                                    <span className="text-[7px] font-bold opacity-90">{d.dayString}</span>
                                  </div>
                                </td>
                              );
                            }

                            if (selState === 'BETWEEN') {
                              return (
                                <td
                                  key={d.dateString || d.day}
                                  onClick={() => handleAvailableCellClick(cat, roomNo, d)}
                                  onMouseEnter={() => handleCellMouseEnter(roomNo, dateStr)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center h-11 bg-rose-50/70"
                                  title={`Selected: ${dateStr}`}
                                >
                                  <div className="w-full h-9 bg-rose-100 border-y-2 border-dashed border-rose-400 flex items-center justify-center text-rose-700 font-extrabold text-[8px]">
                                    ●
                                  </div>
                                </td>
                              );
                            }

                            if (selState === 'SINGLE') {
                              return (
                                <td
                                  key={d.dateString || d.day}
                                  onClick={() => handleAvailableCellClick(cat, roomNo, d)}
                                  onMouseEnter={() => handleCellMouseEnter(roomNo, dateStr)}
                                  className="p-1 border-r border-slate-100 cursor-pointer text-center h-11 bg-rose-50"
                                  title={`Check-in: ${dateStr} (Click check-out date)`}
                                >
                                  <div className="w-full h-9 rounded-lg bg-rose-600 text-white flex flex-col items-center justify-center shadow-md font-black text-[9px] leading-tight ring-2 ring-rose-300">
                                    <span>IN</span>
                                    <span className="text-[7px] font-bold opacity-90">{d.dayString}</span>
                                  </div>
                                </td>
                              );
                            }

                            // Regular available cell
                            return (
                              <td 
                                key={d.dateString || d.day}
                                onClick={() => handleAvailableCellClick(cat, roomNo, d)}
                                onMouseEnter={() => handleCellMouseEnter(roomNo, dateStr)}
                                className="p-1 border-r border-slate-100 cursor-pointer text-center bg-emerald-50/30 hover:bg-rose-50/60 transition-colors h-11 group"
                                title="Available - Click to select booking range"
                              >
                                <div className="w-full h-full rounded-md border border-dashed border-emerald-200/50 group-hover:border-rose-400 group-hover:bg-rose-50/40 transition-all flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-slate-300 group-hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    +
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 5. LEGEND COLOR GUIDES */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center gap-5 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 block" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 block text-white text-[7px] font-black flex items-center justify-center">IN</span>
            <span>Selected Check-In / Out</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-300 block" />
            <span>Booked / Confirmed</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 block" />
            <span className="text-amber-900 font-bold">On Hold</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 block" />
            <span>Blocked (Unavailable)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 block" />
            <span>Blocked by Owner</span>
          </div>
        </div>
      </div>

      {/* Floating PMS Action Bar for Date Range Selection */}
      {selectionRoom && selectionStart && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 sm:gap-6 min-w-[320px] max-w-[95vw]">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-rose-600/30 border border-rose-500/50 rounded-xl text-rose-300 font-black text-xs">
              Room {selectionRoom}
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>{formatDateDisplay(selectionStart)}</span>
                <span className="text-rose-400">→</span>
                <span className={selectionEnd ? 'text-white' : 'text-slate-400 italic'}>
                  {selectionEnd ? formatDateDisplay(selectionEnd) : 'Click Check-out Date'}
                </span>
                {selectionEnd && (
                  <span className="ml-2 px-2 py-0.5 bg-slate-800 text-amber-300 rounded text-[10px] font-bold">
                    {selectedNights} Night{selectedNights > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {selectionCategory?.categoryName || 'Room'} • {selectionEnd ? 'Ready to book or block' : 'Select end date on the calendar'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBlockFromSelection}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              <Lock size={12} className="text-rose-400" />
              <span>Block Dates</span>
            </button>

            <button
              type="button"
              onClick={handleCreateBookingFromSelection}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-md shadow-rose-900/40 transition-all"
            >
              <Plus size={13} className="stroke-[3]" />
              <span>CREATE BOOKING</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl cursor-pointer border border-slate-700 transition-all"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 6. TODAY'S SUMMARY BLOCKS */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
          Today's Summary <span className="text-slate-400 font-bold">({todaySummary.dateString})</span>
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Rooms */}
          <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Rooms</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black rounded uppercase">All Room Types</span>
            </div>
            <span className="text-4xl font-black text-slate-900 leading-none">{todaySummary.totalRooms}</span>
          </div>

          {/* Available Rooms */}
          <div className="bg-white border-l-4 border-l-emerald-600 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Available Rooms</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase">
                {todaySummary.availablePercent}%
              </span>
            </div>
            <span className="text-4xl font-black text-slate-900 leading-none">{todaySummary.availableRooms}</span>
          </div>

          {/* Occupied Rooms */}
          <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Occupied Rooms</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded uppercase">
                {todaySummary.occupiedPercent}%
              </span>
            </div>
            <span className="text-4xl font-black text-slate-900 leading-none">{todaySummary.occupiedRooms}</span>
          </div>

          {/* Blocked Rooms */}
          <div className="bg-white border-l-4 border-l-rose-600 border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Blocked Rooms</span>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-black rounded uppercase">
                {todaySummary.blockedPercent}%
              </span>
            </div>
            <span className="text-4xl font-black text-slate-900 leading-none">{todaySummary.blockedRooms}</span>
          </div>
        </div>
      </div>

      {/* 7. BOOKING DETAIL SIDE DRAWER */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white border-l border-slate-200 w-full max-w-lg h-full p-6 shadow-2xl space-y-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Booking Information</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedBooking.bookingStatus === 'Hold'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : selectedBooking.bookingStatus === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {selectedBooking.bookingStatus === 'Hold' ? 'On Hold' : selectedBooking.bookingStatus || 'Confirmed'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Hold Warning Banner if on Hold */}
              {selectedBooking.bookingStatus === 'Hold' && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-amber-900 leading-snug">This booking is currently on Hold</p>
                    <p className="text-[11px] text-amber-700 leading-snug">
                      You can confirm it, edit details, or remove the hold to immediately release this room on the calendar.
                    </p>
                  </div>
                </div>
              )}

              {/* Guest Information Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{selectedBooking.guestName}</h3>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5 font-mono">
                      Booking Ref: #{selectedBooking.id}
                    </span>
                  </div>
                  <button
                    onClick={handleWhatsAppShareFromDrawer}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer border-none shadow-xs"
                    title="Send WhatsApp Message"
                  >
                    <Send size={10} />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Phone size={12} className="text-slate-400" />
                    <span>{selectedBooking.phone}</span>
                  </div>
                  {selectedBooking.email && (
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Mail size={12} className="text-slate-400" />
                      <span>{selectedBooking.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stay Schedule Dates */}
              <div className="grid grid-cols-2 gap-3 border border-slate-100 p-4 rounded-2xl bg-white">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-In</span>
                  <span className="block text-xs font-black text-slate-900 mt-1">{selectedBooking.checkIn}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Check-Out</span>
                  <span className="block text-xs font-black text-slate-900 mt-1">{selectedBooking.checkOut}</span>
                </div>
              </div>

              {/* Room details */}
              <div className="border border-slate-100 p-4 rounded-2xl bg-white space-y-1.5">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Allocation</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 font-black rounded-lg text-xs border border-rose-200">
                    Room {selectedBooking.roomNo}
                  </span>
                  {selectedBooking.bookedRooms?.length > 1 && selectedBooking.bookedRooms.map(r => (
                    r.roomNumber !== selectedBooking.roomNo && (
                      <span key={r.roomNumber} className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        Room {r.roomNumber}
                      </span>
                    )
                  ))}
                </div>
              </div>

              {/* Special Requests / Notes */}
              {(selectedBooking.specialRequests || selectedBooking.notes) && (
                <div className="border border-amber-200/80 bg-amber-50/60 p-4 rounded-2xl space-y-1">
                  <span className="block text-[9px] font-black text-amber-800 uppercase tracking-wider">
                    Special Requests / Notes
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedBooking.specialRequests || selectedBooking.notes}
                  </p>
                </div>
              )}

              {/* Itemized Financial Breakdown */}
              <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Financial Breakdown</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    selectedBooking.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedBooking.paymentStatus === 'Partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Room Tariff:</span>
                    <span className="font-bold text-slate-800">
                      ₹ {(selectedBooking.baseTariff || (selectedBooking.totalAmount - (selectedBooking.tax || 0) - (selectedBooking.addOns || 0))).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>GST / Taxes:</span>
                    <span className="font-bold text-slate-800">₹ {(selectedBooking.tax || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span>Add-ons:</span>
                      {selectedBooking.addOnsRemark && (
                        <span className="block text-[10px] text-slate-400 font-bold">
                          Remark: {selectedBooking.addOnsRemark}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">
                      ₹ {(selectedBooking.addOns || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-black">
                    <span>Total Amount:</span>
                    <span className="font-mono text-sm text-rose-700">₹ {Number(selectedBooking.totalAmount || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Advance / Paid:</span>
                    <span className="font-mono">₹ {Number(selectedBooking.paidAmount || 0).toLocaleString()}</span>
                  </div>

                  <div className={`flex justify-between p-2 rounded-xl font-black ${
                    Number(selectedBooking.pendingAmount) > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    <span>Balance Pending:</span>
                    <span className="font-mono text-sm">₹ {Number(selectedBooking.pendingAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Installments History */}
              {selectedBooking.paymentHistory && selectedBooking.paymentHistory.length > 0 && (
                <div className="border border-slate-100 p-4 rounded-2xl bg-white space-y-2">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment History</span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {selectedBooking.paymentHistory.map((ph, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">₹ {Number(ph.amount).toLocaleString()}</span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {ph.method} • {new Date(ph.date).toLocaleDateString()} {ph.remark ? `(${ph.remark})` : ''}
                          </span>
                        </div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase">
                          Recorded
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="space-y-2 pt-1">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Booking Actions</span>

                {/* If Hold Booking: Confirm, Remove Hold, Edit Details */}
                {selectedBooking.bookingStatus === 'Hold' ? (
                  <div className="space-y-2">
                    <button
                      onClick={handleConfirmHold}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle size={15} />
                      <span>Confirm Booking</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleOpenEditModal}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Edit3 size={13} />
                        <span>Edit Details</span>
                      </button>

                      <button
                        onClick={handleRemoveHold}
                        className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Trash2 size={13} />
                        <span>Remove Hold</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/homestay-owner/bookings/quotation/${selectedBooking.dbId || selectedBooking.id}`)}
                        className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                      >
                        <FileText size={12} className="text-slate-400" />
                        <span>Quotation</span>
                      </button>

                      <button
                        onClick={handleWhatsAppShareFromDrawer}
                        className="py-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                      >
                        <Share2 size={12} />
                        <span>Share WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Confirmed / Active Booking Actions */
                  <div className="space-y-2">
                    {/* Primary Operations: Reschedule & Record Next Payment */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleOpenRescheduleModal}
                        className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CalendarClock size={13} />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={handleOpenPaymentModal}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CreditCard size={13} />
                        <span>Record Payment</span>
                      </button>
                    </div>

                    {/* Edit and Cancel Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleOpenEditModal}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border-none flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Edit3 size={13} />
                        <span>Edit Details</span>
                      </button>

                      <button
                        onClick={handleOpenCancelModal}
                        className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Ban size={13} />
                        <span>Cancel Booking</span>
                      </button>
                    </div>

                    {/* Document Slips: Confirmation Slip, Invoice, Quotation */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/homestay-owner/bookings/confirmation-slip/${selectedBooking.dbId || selectedBooking.id}`)}
                        className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 cursor-pointer bg-white"
                        title="View Confirmation Slip"
                      >
                        <CheckCircle size={13} className="text-emerald-600" />
                        <span>Slip</span>
                      </button>

                      <button
                        onClick={() => navigate(`/homestay-owner/bookings/invoice/${selectedBooking.dbId || selectedBooking.id}`)}
                        className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 cursor-pointer bg-white"
                        title="View & Print Payment Invoice"
                      >
                        <Receipt size={13} className="text-rose-600" />
                        <span>Invoice</span>
                      </button>

                      <button
                        onClick={() => navigate(`/homestay-owner/bookings/quotation/${selectedBooking.dbId || selectedBooking.id}`)}
                        className="py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 cursor-pointer bg-white"
                        title="View Quotation"
                      >
                        <FileText size={13} className="text-blue-600" />
                        <span>Quotation</span>
                      </button>
                    </div>

                    {/* WhatsApp Send Confirmation */}
                    <button
                      onClick={handleWhatsAppShareFromDrawer}
                      className="w-full py-2.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer bg-white transition-all"
                    >
                      <Share2 size={13} />
                      <span>Send Confirmation via WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer bg-white transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. UNBLOCK CONFIRMATION MODAL */}
      {selectedBlock && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Lock size={18} />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">Room Block Information</h4>
            </div>
            
            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl">
              <div><strong className="text-slate-900">Room:</strong> {selectedBlock.roomNo}</div>
              <div><strong className="text-slate-900">Date:</strong> {selectedBlock.date}</div>
              <div><strong className="text-slate-900">Reason:</strong> {selectedBlock.reason}</div>
              <div><strong className="text-slate-900">Blocked By:</strong> {selectedBlock.blockedBy}</div>
              {selectedBlock.notes && (
                <div><strong className="text-slate-900">Notes:</strong> {selectedBlock.notes}</div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUnblockSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm"
              >
                Unblock Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BLOCK DATES MODAL */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBlockSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-rose-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Block Room Dates</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsBlockModalOpen(false)} 
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Category</label>
                <select
                  value={blockCategory}
                  onChange={(e) => handleBlockCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Room Number *</label>
                <select
                  value={blockRoomNo}
                  onChange={(e) => setBlockRoomNo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {blockAvailableRooms.map(rNo => (
                    <option key={rNo} value={rNo}>{rNo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Date *</label>
                <input
                  type="date"
                  required
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Date *</label>
                <input
                  type="date"
                  required
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Block Reason *</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="Maintenance">Maintenance / Repair</option>
                <option value="Owner Use">Owner Personal Use</option>
                <option value="Renovation">Renovation</option>
                <option value="Temporary Closure">Temporary Closure</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Notes (Optional)</label>
              <textarea
                rows={2}
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
                placeholder="Details about reason..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={blockSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {blockSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Block Dates</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10. SHARE AVAILABILITY MODAL (COMPACT HEIGHT) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Share2 size={14} className="stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {shareStage === 'select' ? 'Share Availability Link' : 'Booking Link Ready'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {shareStage === 'select'
                    ? 'Generate a booking link for a guest or travel agent with live availability.'
                    : 'Your single-use link has been generated. Share it for instant booking.'}
                </p>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(false)} 
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors border-none bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body with clean scroll */}
            <div className="overflow-y-auto py-3 space-y-3 text-xs pr-0.5">

              {/* STAGE 1: CHOOSE LINK TYPE (GUEST vs TRAVEL AGENT) */}
              {shareStage === 'select' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: For Guests */}
                    <div className="border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl p-3 flex flex-col justify-between transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <User size={16} className="stroke-[2.5]" />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            B2C Rates
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">For Guests</h4>
                          <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5">
                            Displays regular direct guest rates. Single-use, instant booking without login.
                          </p>
                        </div>
                        <ul className="text-[10px] text-slate-500 font-medium space-y-0.5">
                          <li className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-600 shrink-0 stroke-[3]" />
                            <span>Live room availability</span>
                          </li>
                          <li className="flex items-center gap-1">
                            <Check size={11} className="text-emerald-600 shrink-0 stroke-[3]" />
                            <span>Standard B2C pricing</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingLink}
                        onClick={() => handleGenerateShareLink('guest')}
                        className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-[11px] uppercase tracking-wider rounded-lg cursor-pointer border-none shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isGeneratingLink ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <>
                            <span>Generate Guest Link</span>
                            <ChevronRight size={12} className="stroke-[2.5]" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option 2: For Travel Agents */}
                    <div className="border border-sky-200 bg-sky-50/40 hover:bg-sky-50/80 rounded-xl p-3 flex flex-col justify-between transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                            <Briefcase size={16} className="stroke-[2.5]" />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                            B2B Rates
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">For Travel Agents</h4>
                          <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5">
                            Displays wholesale B2B partner rates. Ideal for booking agents and travel partners.
                          </p>
                        </div>
                        <ul className="text-[10px] text-slate-500 font-medium space-y-0.5">
                          <li className="flex items-center gap-1">
                            <Check size={11} className="text-sky-600 shrink-0 stroke-[3]" />
                            <span>Live room availability</span>
                          </li>
                          <li className="flex items-center gap-1">
                            <Check size={11} className="text-sky-600 shrink-0 stroke-[3]" />
                            <span>Wholesale B2B partner rates</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingLink}
                        onClick={() => handleGenerateShareLink('agent')}
                        className="mt-3 w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-black text-[11px] uppercase tracking-wider rounded-lg cursor-pointer border-none shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isGeneratingLink ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <>
                            <span>Generate Agent Link</span>
                            <ChevronRight size={12} className="stroke-[2.5]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck size={13} className="text-slate-400 shrink-0" />
                    <span>Public links hide all owner controls, admin sidebars, and guest private details.</span>
                  </div>
                </div>
              )}

              {/* STAGE 2: GENERATED LINK SCREEN (COMPACT) */}
              {shareStage === 'ready' && (
                <div className="space-y-2.5">
                  {/* Header status badge */}
                  <div className="text-center py-1 space-y-1">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                      <CheckCircle size={20} className="stroke-[2.5]" />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Your link is ready to share</h4>
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        shareLinkType === 'agent' 
                          ? 'bg-sky-100 text-sky-800 border-sky-300' 
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {shareLinkType === 'agent' ? 'YOUR TRAVEL AGENT LINK • B2B RATES' : 'YOUR GUEST LINK • B2C RATES'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium">
                      Recipients can view real-time availability and book with instant confirmation.
                    </p>
                  </div>

                  {/* Link Box */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedShareLink}
                      onClick={(e) => e.target.select()}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none select-all"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border-none shadow-xs transition-all"
                      >
                        {isCopied ? <Check size={12} className="stroke-[3]" /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(generatedShareLink, '_blank')}
                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-black text-white font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border-none shadow-xs transition-all"
                      >
                        <ExternalLink size={12} />
                        <span>Open Link</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes List */}
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-[11px]">
                    <div className="flex items-center gap-1 text-amber-900 font-bold text-xs">
                      <Info size={12} className="shrink-0 text-amber-700" />
                      <span>Important Information</span>
                    </div>
                    <ul className="space-y-0.5 text-slate-700 text-[10px] font-medium list-disc pl-3.5 leading-tight">
                      <li><strong>Single-use link:</strong> Only one booking can be made. Deactivated automatically after submission.</li>
                      <li><strong>Live Availability:</strong> Real-time synchronization with your property schedule.</li>
                      <li><strong>No Login Required:</strong> Direct booking without requiring guest account.</li>
                      <li><strong>Advance Payment:</strong> Guest will pay the configured advance and upload payment proof.</li>
                      <li><strong>Rate Visibility:</strong> {shareLinkType === 'agent' ? 'Exclusive B2B wholesale rates only.' : 'Standard B2C direct guest rates only.'}</li>
                    </ul>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0">
              {shareStage === 'ready' ? (
                <button
                  type="button"
                  onClick={() => {
                    setShareStage('select');
                    setGeneratedShareLink('');
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-lg text-xs uppercase cursor-pointer bg-white transition-colors"
                >
                  Back
                </button>
              ) : <div></div>}
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg text-xs uppercase cursor-pointer border-none shadow-xs transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 11. RESCHEDULE STAY MODAL */}
      {isRescheduleModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRescheduleSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} className="text-rose-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Reschedule Stay</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRescheduleModalOpen(false)} 
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Guest:</span>
                <span className="font-bold text-slate-800">{selectedBooking.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Allocated Room:</span>
                <span className="font-bold text-rose-700">Room {selectedBooking.roomNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Current Stay:</span>
                <span className="font-semibold text-slate-700">{selectedBooking.checkIn} → {selectedBooking.checkOut}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">New Check-In *</label>
                <input
                  type="date"
                  required
                  value={rescheduleCheckIn}
                  onChange={(e) => setRescheduleCheckIn(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">New Check-Out *</label>
                <input
                  type="date"
                  required
                  value={rescheduleCheckOut}
                  onChange={(e) => setRescheduleCheckOut(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              Note: The room calendar will verify room availability on the new dates before confirming.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rescheduleSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {rescheduleSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Reschedule</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 12. RECORD / UPDATE NEXT PAYMENT MODAL */}
      {isPaymentModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePaymentSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Update / Record Next Payment</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Financial Status Banner */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <div>
                <span className="text-[9px] text-slate-400 font-black uppercase block">Total</span>
                <span className="text-xs font-black text-slate-800">₹{Number(selectedBooking.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-emerald-600 font-black uppercase block">Paid So Far</span>
                <span className="text-xs font-black text-emerald-700">₹{Number(selectedBooking.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-rose-600 font-black uppercase block">Balance Due</span>
                <span className="text-xs font-black text-rose-700">₹{Number(selectedBooking.pendingAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Installment Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                max={Number(selectedBooking.pendingAmount || selectedBooking.totalAmount || 999999)}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount in ₹"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment Mode *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="UPI">UPI (GPay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash on Arrival</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Txn Ref / ID (Optional)</label>
                <input
                  type="text"
                  value={paymentTransactionId}
                  onChange={(e) => setPaymentTransactionId(e.target.value)}
                  placeholder="e.g. UPI Ref #..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Installment Remark (Optional)</label>
              <input
                type="text"
                value={paymentRemark}
                onChange={(e) => setPaymentRemark(e.target.value)}
                placeholder="e.g. 2nd advance installment, Check-in settlement"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {paymentSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Record Payment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 13. CANCEL BOOKING MODAL */}
      {isCancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCancelSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ban size={16} className="text-rose-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Cancel Booking</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCancelModalOpen(false)} 
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-bold">Are you sure you want to cancel booking #{selectedBooking.id}?</p>
              <p className="text-[11px] text-rose-700">
                This will mark the reservation as Cancelled and immediately restore Room {selectedBooking.roomNo} to available inventory on the calendar.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Reason for Cancellation *</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="Guest requested cancellation">Guest requested cancellation</option>
                <option value="Guest did not show up (No-show)">Guest did not show up (No-show)</option>
                <option value="Payment overdue / not received">Payment overdue / not received</option>
                <option value="Double booking / emergency">Double booking / emergency</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cancellation Notes (Optional)</label>
              <textarea
                rows={2}
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={cancelSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {cancelSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 14. EDIT BOOKING MODAL */}
      {isEditModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-slate-800" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Edit Booking Details</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)} 
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Primary Guest Name *</label>
              <input
                type="text"
                required
                value={editGuestName}
                onChange={(e) => setEditGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={editGuestPhone}
                  onChange={(e) => setEditGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={editGuestEmail}
                  onChange={(e) => setEditGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Add-ons Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editAddOns}
                  onChange={(e) => setEditAddOns(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Add-ons Remark</label>
                <input
                  type="text"
                  value={editAddOnsRemark}
                  onChange={(e) => setEditAddOnsRemark(e.target.value)}
                  placeholder="e.g. Airport Pickup, Extra Bed"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Special Requests / Notes</label>
              <textarea
                rows={2}
                value={editSpecialRequests}
                onChange={(e) => setEditSpecialRequests(e.target.value)}
                placeholder="Early check-in, ground floor room..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                {editSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 15. PAYMENT TAX INVOICE MODAL */}
      {isInvoiceModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-auto print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Header with Homestay & Actions */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt size={20} className="text-rose-600" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tax Invoice / Receipt</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">{propertyName}</p>
                <p className="text-[10px] text-slate-400">
                  {[selectedBooking.propertyDetails?.address, selectedBooking.propertyDetails?.city, selectedBooking.propertyDetails?.state].filter(Boolean).join(', ') || 'Himachal Pradesh, India'}
                </p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-sm transition-all"
                >
                  <Printer size={13} />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer border-none"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Invoice Meta details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Invoice No:</span>
                <span className="font-mono font-black text-slate-900">INV-{selectedBooking.id?.replace(/[^0-9]/g, '') || '01001'}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Booking Reference:</span>
                <span className="font-bold text-rose-700">#{selectedBooking.id}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Invoice Date:</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Billed To:</span>
                <span className="font-bold text-slate-900">{selectedBooking.guestName}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Contact Phone:</span>
                <span className="font-semibold text-slate-700">{selectedBooking.phone}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Stay Period:</span>
                <span className="font-semibold text-slate-700">{selectedBooking.checkIn} → {selectedBooking.checkOut}</span>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Room</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">Homestay Room Accommodation</span>
                      <span className="text-[10px] text-slate-400">{selectedBooking.checkIn} to {selectedBooking.checkOut}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">Room {selectedBooking.roomNo}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹ {(selectedBooking.baseTariff || (selectedBooking.totalAmount - (selectedBooking.tax || 0) - (selectedBooking.addOns || 0))).toLocaleString()}
                    </td>
                  </tr>

                  {Number(selectedBooking.addOns) > 0 && (
                    <tr>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">Add-on Services</span>
                        <span className="text-[10px] text-slate-500">{selectedBooking.addOnsRemark || 'Extra Amenities / Food'}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">-</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹ {Number(selectedBooking.addOns).toLocaleString()}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">GST / Taxes</span>
                      <span className="text-[10px] text-slate-400">Applicable hospitality taxes</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">-</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹ {Number(selectedBooking.tax || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total, Paid, and Balance rows */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Grand Total:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">₹ {Number(selectedBooking.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Total Payments Received:</span>
                  <span className="font-mono">₹ {Number(selectedBooking.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between p-2.5 rounded-xl font-black ${
                  Number(selectedBooking.pendingAmount) > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800'
                }`}>
                  <span>Balance Due:</span>
                  <span className="font-mono text-base">₹ {Number(selectedBooking.pendingAmount || 0).toLocaleString()}/-</span>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400 font-medium space-y-0.5">
              <p>Thank you for choosing {propertyName}. This is an official computer-generated receipt.</p>
              <p>© {new Date().getFullYear()} {propertyName}. All rights reserved.</p>
            </div>

            {/* Print & Close bar */}
            <div className="flex justify-end gap-2.5 pt-2 print:hidden">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer bg-white"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
