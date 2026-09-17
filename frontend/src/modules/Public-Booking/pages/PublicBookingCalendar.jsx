import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Calendar as CalendarIcon, 
  User, 
  Users, 
  Briefcase, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  BedDouble, 
  Receipt, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  Printer, 
  Download, 
  FileText, 
  Sparkles,
  RefreshCw,
  Home,
  CreditCard,
  Upload,
  Copy,
  QrCode,
  ArrowRight,
  X,
  Camera,
  Search,
  Wifi,
  Car,
  Utensils,
  Mountain,
  Flame,
  Waves,
  Coffee,
  Tag
} from 'lucide-react';
import { generatePdfFromElement } from '../../../utils/pdfExporter';

const getApiUrl = (path) => {
  const base = window.location.hostname === 'localhost' ? 'http://localhost:5005' : 'https://backend-sand-nine-13.vercel.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PublicBookingCalendar() {
  const { token, propertyId: paramPropertyId } = useParams();
  const [searchParams] = useSearchParams();

  // Active booking token or property identifier
  const activeToken = token || paramPropertyId;

  // Link metadata & Property state
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState(null); // 'LinkUsed' | 'NotFound' | etc.
  const [linkData, setLinkData] = useState(null);
  const [property, setProperty] = useState(null);
  const [linkType, setLinkType] = useState('guest'); // 'guest' | 'agent'
  const [paymentSettings, setPaymentSettings] = useState({
    advanceType: 'percent',
    advancePercent: 30,
    advanceAmount: 0,
    upiId: 'keshavhomestay@okicici',
    upiQrCode: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  });

  // Calendar Availability Grid state
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Date selection state
  const todayStr = now.toISOString().split('T')[0];
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(nextDayStr);

  // Interactive Range Selection on the Calendar Grid
  const [selectionRoom, setSelectionRoom] = useState(null);
  const [selectionStart, setSelectionStart] = useState(todayStr);
  const [selectionEnd, setSelectionEnd] = useState(nextDayStr);
  const [hoverDate, setHoverDate] = useState(null);

  // Available Rooms for chosen dates
  const [availableCategories, setAvailableCategories] = useState([]);
  const [fetchingAvailableRooms, setFetchingAvailableRooms] = useState(false);

  // Selected Rooms for Booking: array of { categoryId, categoryName, roomNumber, mealPlan, adults, child5_9, child0_4, price }
  const [selectedRooms, setSelectedRooms] = useState([]);

  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Advance Payment Proof state (Mandatory)
  const [transactionId, setTransactionId] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState('');
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);

  // Pricing Summary
  const [calculatedPricing, setCalculatedPricing] = useState({
    nights: 1,
    roomCost: 0,
    tax: 0,
    finalAmount: 0
  });
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  // Coupon States
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Booking Submission state
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const slipPrintRef = useRef(null);
  const calendarSectionRef = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // 1. Fetch Link Verification and Owner Payment Settings on mount
  useEffect(() => {
    const fetchLinkInfo = async () => {
      if (!activeToken) {
        setLinkError('Invalid booking link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLinkError(null);

        const res = await axios.get(getApiUrl(`/api/public/booking-link/${activeToken}`));
        if (res.data?.success) {
          setLinkData(res.data);
          setProperty(res.data.property);
          setLinkType(res.data.linkType || 'guest');
          if (res.data.paymentSettings) {
            setPaymentSettings(res.data.paymentSettings);
          }
        } else {
          setLinkError(res.data?.message || 'Invalid or expired booking link.');
        }
      } catch (err) {
        console.error('Error fetching link:', err);
        if (err.response?.status === 410 || err.response?.data?.error === 'LinkUsed') {
          setLinkError('LinkUsed');
        } else {
          setLinkError(err.response?.data?.message || 'Invalid or expired booking link.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLinkInfo();
  }, [activeToken]);

  // 2. Fetch Public Calendar Availability when property or month/year changes
  const propertyId = property?._id;
  useEffect(() => {
    if (!propertyId) return;

    const fetchCalendar = async () => {
      try {
        setCalendarLoading(true);
        const res = await axios.get(getApiUrl('/api/public/calendar-availability'), {
          params: {
            propertyId,
            month: calendarMonth,
            year: calendarYear,
            linkType
          }
        });
        if (res.data?.success) {
          setCalendarData(res.data);
        }
      } catch (err) {
        console.error('Failed to load public calendar:', err);
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchCalendar();
  }, [propertyId, calendarMonth, calendarYear, linkType]);

  // 3. Fetch Available Rooms when checkIn/checkOut change
  useEffect(() => {
    if (!propertyId || !checkInDate || !checkOutDate) return;

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (inDate >= outDate) return;

    const fetchRooms = async () => {
      try {
        setFetchingAvailableRooms(true);
        const res = await axios.get(getApiUrl('/api/public/available-rooms'), {
          params: {
            propertyId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            linkType
          }
        });
        if (res.data?.success) {
          setAvailableCategories(res.data.availableCategories || []);
          
          // Keep or auto-select a single available room
          setSelectedRooms(prev => {
            if (prev.length > 0) {
              const currentRoom = prev[0];
              const stillAvail = res.data.availableCategories?.some(c => 
                c.availableRooms?.some(rn => String(rn) === String(currentRoom.roomNumber))
              );
              if (stillAvail) return [currentRoom];
            }
            if (selectionRoom) {
              const catWithSelection = res.data.availableCategories?.find(c =>
                c.availableRooms?.some(rn => String(rn) === String(selectionRoom))
              );
              if (catWithSelection) {
                return [{
                  categoryId: catWithSelection.categoryId,
                  categoryName: catWithSelection.categoryName,
                  roomNumber: selectionRoom,
                  mealPlan: 'EP',
                  adults: 2,
                  child5_9: 0,
                  child0_4: 0,
                  price: catWithSelection.basePrice
                }];
              }
            }
            const firstWithRooms = res.data.availableCategories?.find(c => c.availableRooms?.length > 0);
            if (firstWithRooms) {
              return [{
                categoryId: firstWithRooms.categoryId,
                categoryName: firstWithRooms.categoryName,
                roomNumber: firstWithRooms.availableRooms[0],
                mealPlan: 'EP',
                adults: 2,
                child5_9: 0,
                child0_4: 0,
                price: firstWithRooms.basePrice
              }];
            }
            return [];
          });
        }
      } catch (err) {
        console.error('Failed to load available rooms:', err);
      } finally {
        setFetchingAvailableRooms(false);
      }
    };

    fetchRooms();
  }, [propertyId, checkInDate, checkOutDate, linkType]);

  // Fetch available coupons for this property and audience tier
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      if (!propertyId) return;
      try {
        const res = await axios.get(getApiUrl('/api/public/coupons/available'), {
          params: {
            propertyId,
            bookingType: linkType
          }
        });
        if (res.data?.success) {
          setAvailableCoupons(res.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching public coupons:', err);
      }
    };
    fetchAvailableCoupons();
  }, [propertyId, linkType]);

  // 4. Calculate Price whenever selected rooms, dates, or coupon changes
  useEffect(() => {
    if (!propertyId || !checkInDate || !checkOutDate || selectedRooms.length === 0) {
      setCalculatedPricing({
        nights: 1,
        roomCost: 0,
        discount: 0,
        tax: 0,
        finalAmount: 0
      });
      return;
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (inDate >= outDate) return;

    const calcPrice = async () => {
      try {
        setCalculatingPrice(true);
        const res = await axios.post(getApiUrl('/api/public/calculate-price'), {
          propertyId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          rooms: selectedRooms,
          bookingType: linkType,
          couponCode: appliedCoupon?.code || '',
          guestMobile,
          guestEmail
        });
        if (res.data) {
          setCalculatedPricing(res.data);
          if (appliedCoupon && !res.data.appliedCoupon) {
            setAppliedCoupon(null);
            setCouponError('Coupon conditions no longer met for current booking.');
            setCouponSuccess('');
          }
        }
      } catch (err) {
        console.error('Price calculation error:', err);
      } finally {
        setCalculatingPrice(false);
      }
    };

    calcPrice();
  }, [propertyId, checkInDate, checkOutDate, selectedRooms, linkType, appliedCoupon]);

  // Coupon Action Handlers
  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      setCouponSuccess('');
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError('');
      setCouponSuccess('');

      const res = await axios.post(getApiUrl('/api/public/coupons/validate'), {
        code,
        propertyId,
        subtotal: calculatedPricing.roomCost || 0,
        bookingType: linkType,
        guestMobile,
        guestEmail
      });

      if (res.data?.valid) {
        setAppliedCoupon(res.data.coupon);
        setCouponCodeInput(code);
        setCouponSuccess(`Coupon "${code}" applied! Savings: ₹${Number(res.data.discountAmount).toLocaleString()}`);
      } else {
        setCouponError(res.data?.message || 'Invalid coupon code.');
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
    setCouponSuccess('');
  };

  // Calculate Required Advance Payment from Owner Settings
  const finalTotal = calculatedPricing.finalAmount || 0;
  const advanceAmount = useMemo(() => {
    if (!finalTotal) return 0;
    if (paymentSettings.advanceType === 'fixed' && Number(paymentSettings.advanceAmount) > 0) {
      return Math.min(finalTotal, Number(paymentSettings.advanceAmount));
    }
    const pct = paymentSettings.advancePercent !== undefined ? Number(paymentSettings.advancePercent) : 30;
    return Math.round((finalTotal * pct) / 100);
  }, [finalTotal, paymentSettings]);

  const remainingBalance = Math.max(0, finalTotal - advanceAmount);

  // Month navigation for Calendar
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const getNextDayStr = (dStr) => {
    const d = new Date(dStr);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // INTERACTIVE CALENDAR CELL CLICK (Matching Availability Calendar Flow)
  const handleCalendarCellClick = (cat, roomNo, dayNum, status) => {
    if (status !== 'available') {
      Swal.fire({
        icon: 'info',
        title: 'Date Not Available',
        text: `Room ${roomNo} is ${status === 'booked' ? 'already reserved' : 'unavailable'} on Day ${dayNum}. Please choose an open green date.`,
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const clickedDateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    // Check if clicked date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(clickedDateStr);
    if (clickedDate < today) {
      Swal.fire({ icon: 'warning', title: 'Past Date', text: 'Cannot select dates in the past.', timer: 1500, showConfirmButton: false });
      return;
    }

    // If starting fresh or clicking a new selection, or clicking a different room row:
    if (!selectionStart || (selectionStart && selectionEnd) || (selectionRoom && String(selectionRoom) !== String(roomNo))) {
      setSelectionRoom(roomNo);
      setSelectionStart(clickedDateStr);
      setSelectionEnd(null);
      setHoverDate(null);
      setCheckInDate(clickedDateStr);
      // default checkout to +1 day temporarily
      const nxt = getNextDayStr(clickedDateStr);
      setCheckOutDate(nxt);

      // Select ONLY this single room when clicking on its row!
      setSelectedRooms([
        {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          roomNumber: roomNo,
          mealPlan: 'EP',
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          price: cat.basePrice
        }
      ]);
      return;
    }

    // If clicking same date again, select 1 night
    if (clickedDateStr === selectionStart) {
      const nxt = getNextDayStr(clickedDateStr);
      setSelectionEnd(nxt);
      setCheckOutDate(nxt);
      setHoverDate(null);
      return;
    }

    // Second click finishes the range
    let s = selectionStart;
    let e = clickedDateStr;
    if (clickedDateStr < selectionStart) {
      s = clickedDateStr;
      e = selectionStart;
    }

    setSelectionStart(s);
    setSelectionEnd(e);
    setCheckInDate(s);
    setCheckOutDate(e);
    setHoverDate(null);

    // Keep ONLY this single room selected
    setSelectedRooms([
      {
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        roomNumber: roomNo,
        mealPlan: 'EP',
        adults: 2,
        child5_9: 0,
        child0_4: 0,
        price: cat.basePrice
      }
    ]);
  };

  // Helper to determine cell range styling (ONLY applies to the room currently selected!)
  const getCellRangeStatus = (roomNo, dayNum) => {
    const isThisRoomSelected = selectedRooms.some(r => String(r.roomNumber) === String(roomNo)) || 
                               (selectionRoom && String(selectionRoom) === String(roomNo));
    if (!isThisRoomSelected) return 'NONE';

    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (!checkInDate) return 'NONE';

    const s = checkInDate;
    const e = checkOutDate || (hoverDate && hoverDate > s ? hoverDate : null);

    if (dateStr === s) return 'START';
    if (e && dateStr === e) return 'END';
    if (e && dateStr > s && dateStr < e) return 'IN_RANGE';

    return 'NONE';
  };

  // Handle Payment Proof Screenshot Upload (with canvas compression to avoid freezing/hangs)
  const handlePaymentProofUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please upload an image file (JPG, PNG, WebP).', confirmButtonColor: '#e11d48' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPaymentProofImage(file);
        setPaymentProofPreview(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Copy UPI ID helper
  const handleCopyUpi = () => {
    if (!paymentSettings.upiId) return;
    navigator.clipboard.writeText(paymentSettings.upiId);
    setIsCopiedUpi(true);
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  // Room Configuration helper functions
  const handleAddRoom = (cat, roomNo) => {
    const exists = selectedRooms.some(r => String(r.roomNumber) === String(roomNo));
    if (exists) {
      setSelectedRooms(selectedRooms.filter(r => String(r.roomNumber) !== String(roomNo)));
    } else {
      setSelectedRooms([
        ...selectedRooms,
        {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          roomNumber: roomNo,
          mealPlan: 'EP',
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          price: cat.basePrice,
          images: cat.images || [],
          coverImage: cat.coverImage || ''
        }
      ]);
    }
  };

  const updateRoomMealPlan = (index, mealPlan) => {
    const updated = [...selectedRooms];
    updated[index].mealPlan = mealPlan;
    setSelectedRooms(updated);
  };

  const updateRoomAdults = (index, delta) => {
    const updated = [...selectedRooms];
    const newCount = Math.max(1, Math.min(4, (updated[index].adults || 2) + delta));
    updated[index].adults = newCount;
    setSelectedRooms(updated);
  };

  const updateRoomChild = (index, delta) => {
    const updated = [...selectedRooms];
    const newCount = Math.max(0, Math.min(3, (updated[index].child5_9 || 0) + delta));
    updated[index].child5_9 = newCount;
    setSelectedRooms(updated);
  };

  // Confirm & Submit Booking Request
  const handleSubmitBookingRequest = async (e) => {
    e.preventDefault();

    if (!guestName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Name Required', text: 'Please enter primary guest name.', confirmButtonColor: '#e11d48' });
      return;
    }
    if (!guestMobile.trim() || guestMobile.length < 10) {
      Swal.fire({ icon: 'warning', title: 'Mobile Required', text: 'Please enter a valid 10-digit mobile number.', confirmButtonColor: '#e11d48' });
      return;
    }
    if (selectedRooms.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Select Rooms', text: 'Please select at least one available room.', confirmButtonColor: '#e11d48' });
      return;
    }

    // MANDATORY ADVANCE PAYMENT & PROOF VERIFICATION
    if (!transactionId.trim()) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Transaction / UTR ID Required', 
        text: 'Please enter the UPI Transaction Reference ID (UTR) of your advance payment.', 
        confirmButtonColor: '#e11d48' 
      });
      return;
    }
    if (!paymentProofPreview) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Payment Proof Required', 
        text: 'Please upload a screenshot or photo of your advance payment transaction receipt.', 
        confirmButtonColor: '#e11d48' 
      });
      return;
    }

    const confirmRes = await Swal.fire({
      title: 'Submit Booking Request?',
      html: `
        <div class="text-xs text-left space-y-2 text-slate-600">
          <p><strong>Total Amount:</strong> ₹${Number(calculatedPricing.finalAmount).toLocaleString()}</p>
          <p><strong>Advance Paid:</strong> ₹${Number(advanceAmount).toLocaleString()}</p>
          <p><strong>Transaction UTR:</strong> ${transactionId.trim()}</p>
          <p class="text-emerald-700 font-bold">Your dates will be held and blocked on the calendar immediately while the host verifies your payment receipt.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit Request',
      cancelButtonText: 'Review Details',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      setSubmittingBooking(true);
      const payload = {
        token: activeToken,
        propertyId,
        checkInDate,
        checkOutDate,
        guestName: guestName.trim(),
        guestMobile: guestMobile.trim(),
        guestEmail: guestEmail.trim(),
        selectedRooms,
        specialRequests: specialRequests.trim(),
        bookingType: linkType,
        advanceAmount,
        paymentProof: paymentProofPreview,
        transactionId: transactionId.trim(),
        couponCode: appliedCoupon?.code || ''
      };

      const res = await axios.post(getApiUrl('/api/public/create-booking'), payload);
      if (res.data?.success) {
        setSubmittedBooking(res.data.booking || {
          bookingId: res.data.bookingId,
          _id: res.data.dbId,
          customer: { name: guestName, mobile: guestMobile, email: guestEmail },
          checkInDate,
          checkOutDate,
          nights: calculatedPricing.nights,
          bookedRooms: selectedRooms,
          couponCode: appliedCoupon?.code || '',
          pricing: {
            finalAmount: calculatedPricing.finalAmount,
            paidAmount: advanceAmount,
            pendingAmount: remainingBalance,
            basePrice: calculatedPricing.roomCost,
            discount: calculatedPricing.discount || 0,
            tax: calculatedPricing.tax
          },
          advancePayment: {
            amount: advanceAmount,
            transactionId: transactionId.trim(),
            proofUrl: paymentProofPreview
          }
        });

        Swal.fire({
          icon: 'success',
          title: 'Request Submitted!',
          text: `Booking Request ${res.data.bookingId} submitted. Your dates are held and blocked on the calendar pending host verification.`,
          confirmButtonColor: '#10b981'
        });
      } else {
        throw new Error(res.data?.message || 'Failed to submit booking request.');
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
      if (err.response?.status === 410) {
        Swal.fire({
          icon: 'error',
          title: 'Link Deactivated',
          text: 'This single-use booking link has already been used.',
          confirmButtonColor: '#e11d48'
        });
        setLinkError('LinkUsed');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: err.response?.data?.message || err.message || 'Could not submit your booking request. Please try again.',
          confirmButtonColor: '#e11d48'
        });
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  // PDF Download helper for Acknowledgement Slip
  const handleDownloadPDF = async () => {
    if (!slipPrintRef.current) return;
    try {
      const filename = `Booking_Acknowledgement_${submittedBooking?.bookingId || 'Request'}.pdf`;
      await generatePdfFromElement(slipPrintRef.current, filename);
    } catch (err) {
      console.error('PDF error:', err);
      Swal.fire({
        icon: 'error',
        title: 'PDF Export Failed',
        text: 'Could not generate PDF directly. Please try again.',
        confirmButtonColor: '#e11d48'
      });
    }
  };

  // RENDER: Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <Building2 size={24} />
          </div>
          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">Loading Availability...</h2>
          <p className="text-xs text-slate-400 font-medium">Verifying link and preparing live room rates</p>
        </div>
      </div>
    );
  }

  // RENDER: Error / Deactivated Link state (Single-use safety)
  if (linkError) {
    const isUsed = linkError === 'LinkUsed';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-7 text-center shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle size={32} className="stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {isUsed ? 'Booking Link Deactivated' : 'Invalid Booking Link'}
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {isUsed
                ? 'This booking link has already been used and is now deactivated. For security and inventory freshness, each shared booking link can only be used for one booking request.'
                : 'The link you are trying to access is invalid, has expired, or the property is no longer active.'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 font-medium border border-slate-100 text-left space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info size={14} className="text-rose-600" />
              <span>Need to make a reservation?</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Please contact the homestay host directly to request a new availability booking link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate nights
  const calcNights = Math.max(1, Math.round((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))) || 1;

  const formatDateDDMMYYYY = (isoDateStr) => {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDateStr;
  };

  const fallbackPropertyImages = [
    'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
  ];

  const getImageUrl = (path) => {
    if (!path) return fallbackPropertyImages[0];
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return getApiUrl(path);
  };

  const rawImages = property?.images && property.images.length > 0 ? property.images : [];
  const displayImages = rawImages.length >= 6 
    ? rawImages 
    : [...rawImages, ...fallbackPropertyImages.slice(rawImages.length)];

  const defaultAmenities = [
    { name: 'WiFi', icon: Wifi, color: 'text-sky-500' },
    { name: 'Parking', icon: Car, color: 'text-rose-500' },
    { name: 'Home Food', icon: Utensils, color: 'text-amber-600' },
    { name: 'Mountain View', icon: Mountain, color: 'text-emerald-600' },
    { name: 'Bonfire', icon: Flame, color: 'text-orange-500' }
  ];

  const displayAmenities = (property?.amenities && property.amenities.length > 0)
    ? property.amenities.map(a => {
        const name = typeof a === 'string' ? a : (a.name || 'Amenity');
        const n = name.toLowerCase();
        if (n.includes('wifi') || n.includes('internet')) return { name, icon: Wifi, color: 'text-sky-500' };
        if (n.includes('park')) return { name, icon: Car, color: 'text-rose-500' };
        if (n.includes('food') || n.includes('restaurant') || n.includes('dining') || n.includes('kitchen')) return { name, icon: Utensils, color: 'text-amber-600' };
        if (n.includes('mountain') || n.includes('view') || n.includes('garden') || n.includes('nature')) return { name, icon: Mountain, color: 'text-emerald-600' };
        if (n.includes('bonfire') || n.includes('fire') || n.includes('heater')) return { name, icon: Flame, color: 'text-orange-500' };
        if (n.includes('pool') || n.includes('swim')) return { name, icon: Waves, color: 'text-cyan-500' };
        if (n.includes('breakfast') || n.includes('coffee') || n.includes('tea')) return { name, icon: Coffee, color: 'text-amber-700' };
        return { name, icon: CheckCircle2, color: 'text-emerald-500' };
      })
    : defaultAmenities;

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans text-slate-900 pb-20 select-none">
      {/* PUBLIC NAVBAR (NO SIDEBAR, NO OWNER CONTROLS) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900">WoW Gateway</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">Direct</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 leading-none">Instant Room Reservation</p>
            </div>
          </div>

          {/* Dedicated Rate Badge */}
          <div className="flex items-center gap-2">
            {linkType === 'agent' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 shadow-xs">
                <Briefcase size={13} className="stroke-[2.5]" />
                <span className="text-[11px] font-black uppercase tracking-wider">Travel Agent Portal • B2B Rates</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                <User size={13} className="stroke-[2.5]" />
                <span className="text-[11px] font-black uppercase tracking-wider">Guest Direct Booking • B2C Rates</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SUCCESS CONFIRMATION VIEW (If booking request submitted) */}
      {submittedBooking ? (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 size={36} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Booking Request Submitted • Pending Host Verification
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Thank You, {submittedBooking.customer?.name}!
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Your booking request at <strong className="text-slate-800">{property?.name}</strong> has been submitted.
              </p>
            </div>

            {/* Dates Blocked Guarantee Card */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-900 text-left flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-black uppercase tracking-wide text-emerald-800">Your Dates Are Reserved & Blocked</p>
                <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                  Your selected rooms ({selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ')}) are now held and blocked on the calendar so no one else can book them while the host verifies your advance payment.
                </p>
              </div>
            </div>

            {/* Booking Details Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Booking Reference</span>
                  <span className="text-base font-black text-rose-600">{submittedBooking.bookingId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Stay Cost</span>
                  <span className="text-base font-black text-slate-900">₹{Number(submittedBooking.pricing?.finalAmount || calculatedPricing.finalAmount).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-In</span>
                  <span className="font-bold text-slate-800">{checkInDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Check-Out</span>
                  <span className="font-bold text-slate-800">{checkOutDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nights</span>
                  <span className="font-bold text-slate-800">{calcNights} Night(s)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rooms</span>
                  <span className="font-bold text-slate-800">{selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ')}</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Advance Paid</span>
                  <span className="font-bold text-emerald-700">₹{Number(advanceAmount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Transaction UTR</span>
                  <span className="font-mono font-bold text-slate-800">{transactionId}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance Due at Check-In</span>
                  <span className="font-bold text-rose-700">₹{Number(remainingBalance).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <FileText size={15} />
                <span>View Acknowledgement Slip</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* MAIN BOOKING CONTENT */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* PROPERTY HERO & HIGHLIGHTS CARD */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            {/* Top Sub-container: Featured Photo, Property Info, and Stay Dates Selector */}
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
              
              {/* Left Sub-container: Featured Photo + Property Details */}
              <div className="flex flex-col sm:flex-row gap-5 flex-1 items-start">
                {/* Featured Photo with [📷 View Photos (N)] badge */}
                <div 
                  onClick={() => setLightboxIndex(0)}
                  className="relative w-full sm:w-64 md:w-72 h-48 sm:h-52 rounded-2xl overflow-hidden border border-slate-150 shrink-0 bg-slate-100 cursor-pointer group shadow-xs"
                >
                  <img 
                    src={getImageUrl(displayImages[0])} 
                    alt={property?.name || 'Property'} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm group-hover:bg-black/90 transition-colors">
                    <Camera size={13} />
                    <span>View Photos ({displayImages.length})</span>
                  </div>
                </div>

                {/* Property Details */}
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {property?.name || 'Homestay Property'}
                    </h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      linkType === 'agent' 
                        ? 'bg-sky-50 text-sky-700 border-sky-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {linkType === 'agent' ? 'B2B WHOLESALE RATES' : 'STANDARD DIRECT RATES'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                    <MapPin size={14} className="text-rose-600 shrink-0" />
                    <span>{[property?.address, property?.city, property?.state].filter(Boolean).join(', ')}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                    <span>Check-in: <strong className="text-slate-800 font-black">{property?.checkInTime || '12:00 PM'}</strong></span>
                    <span>Check-out: <strong className="text-slate-800 font-black">{property?.checkOutTime || '11:00 AM'}</strong></span>
                    <span>Advance Required: <strong className="text-rose-600 font-black">{paymentSettings.advanceType === 'fixed' ? `₹${paymentSettings.advanceAmount} Flat` : `${paymentSettings.advancePercent || 30}% of Total`}</strong></span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-3">
                    {property?.description || `${property?.name || 'This homestay'} is a cozy and peaceful property nestled in the lap of nature, offering stunning mountain views, comfortable rooms and warm hospitality. Perfect for families, couples and solo travellers looking for a relaxing getaway.`}
                  </p>

                  {/* Property Amenities */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-black text-slate-800 block">Property Amenities</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {displayAmenities.map((amenity, aIdx) => {
                        const IconComp = amenity.icon;
                        return (
                          <div key={aIdx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                            <IconComp size={14} className={amenity.color || 'text-slate-600'} />
                            <span>{amenity.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sub-container: SELECT STAY DATES Card */}
              <div className="w-full lg:w-80 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shrink-0 space-y-3.5 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  SELECT STAY DATES
                </span>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CHECK IN</label>
                    <div className="relative bg-white border border-slate-200 rounded-xl px-2.5 py-2 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
                      <span className="text-[11px] font-bold text-slate-800 font-mono">
                        {formatDateDDMMYYYY(checkInDate)}
                      </span>
                      <CalendarIcon size={13} className="text-slate-400 shrink-0 ml-1 pointer-events-none" />
                      <input
                        type="date"
                        min={todayStr}
                        value={checkInDate}
                        onChange={(e) => {
                          setCheckInDate(e.target.value);
                          setSelectionStart(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="col-span-5 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CHECK OUT</label>
                    <div className="relative bg-white border border-slate-200 rounded-xl px-2.5 py-2 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
                      <span className="text-[11px] font-bold text-slate-800 font-mono">
                        {formatDateDDMMYYYY(checkOutDate)}
                      </span>
                      <CalendarIcon size={13} className="text-slate-400 shrink-0 ml-1 pointer-events-none" />
                      <input
                        type="date"
                        min={checkInDate || todayStr}
                        value={checkOutDate}
                        onChange={(e) => {
                          setCheckOutDate(e.target.value);
                          setSelectionEnd(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1 text-center">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">DURATION</label>
                    <div className="bg-rose-50 border border-rose-150 text-rose-700 py-2 rounded-xl text-xs font-black">
                      {calcNights}N
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    calendarSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 bg-[#D80032] hover:bg-[#b00028] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-sm shadow-rose-200 tracking-wide"
                >
                  <Search size={14} className="stroke-[2.5]" />
                  <span>Check Availability</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Thumbnail Gallery Strip (6 items) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
              {displayImages.slice(0, 6).map((img, idx) => {
                const isLast = idx === 5 && displayImages.length > 6;
                const extraCount = displayImages.length - 6;
                return (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative h-20 sm:h-24 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100 cursor-pointer group shadow-2xs"
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isLast ? (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-2xs flex flex-col items-center justify-center text-white text-center p-1 group-hover:bg-black/75 transition-colors">
                        <span className="text-sm font-black leading-none">+{extraCount + 1}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">More Photos</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* INTERACTIVE CALENDAR AVAILABILITY SECTION (Requirement 4) */}
          <div ref={calendarSectionRef} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-rose-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Select Dates from Calendar</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Click your <strong className="text-emerald-700">Check-In</strong> date, then click your <strong className="text-emerald-700">Check-Out</strong> date on any available room row below.
                </p>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 cursor-pointer border-none bg-transparent"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black text-slate-800 px-2 min-w-[110px] text-center">
                    {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 cursor-pointer border-none bg-transparent"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Legend */}
                <div className="hidden lg:flex items-center gap-3 text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span>Unavailable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Table */}
            {calendarLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading room schedule...</span>
              </div>
            ) : calendarData?.categories?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No room categories configured for this property.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-10 w-44">Room</th>
                      {Array.from({ length: calendarData?.daysInMonth || 30 }, (_, i) => i + 1).map((d) => (
                        <th key={d} className="py-2 px-1 text-center min-w-[28px]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calendarData?.categories?.map((cat) => (
                      <React.Fragment key={cat.categoryId}>
                        {/* Category Header Row */}
                        <tr className="bg-slate-50/70 text-[11px] font-bold text-slate-700">
                          <td colSpan={(calendarData?.daysInMonth || 30) + 1} className="py-2 px-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                                  <img 
                                    src={(cat.images && cat.images.length > 0) ? getImageUrl(cat.images[0]) : (cat.coverImage ? getImageUrl(cat.coverImage) : fallbackPropertyImages[1])} 
                                    alt={cat.categoryName} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = fallbackPropertyImages[1]; }}
                                  />
                                </div>
                                <BedDouble size={14} className="text-rose-600 shrink-0" />
                                <span>{cat.categoryName} ({cat.roomType})</span>
                              </div>
                              <span className="text-[10px] font-black text-slate-500">
                                {linkType === 'agent' ? 'B2B Partner Rate: ' : 'B2C Tariff: '} 
                                <strong className="text-slate-900">₹{Number(cat.basePrice).toLocaleString()}/night</strong>
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Room Rows */}
                        {cat.rooms?.map((rm) => (
                          <tr key={rm.roomNumber} className="hover:bg-slate-50/40">
                            <td className="py-2 px-3 sticky left-0 bg-white z-10 font-bold text-slate-800 text-xs whitespace-nowrap shadow-xs">
                              Room {rm.roomNumber}
                            </td>
                            {rm.days?.map((dayObj) => {
                              const isAvail = dayObj.status === 'available';
                              const isBooked = dayObj.status === 'booked';
                              const rangeStatus = getCellRangeStatus(rm.roomNumber, dayObj.day);

                              return (
                                <td 
                                  key={dayObj.day} 
                                  onClick={() => handleCalendarCellClick(cat, rm.roomNumber, dayObj.day, dayObj.status)}
                                  onMouseEnter={() => {
                                    if (selectionStart && !selectionEnd) {
                                      const hoverStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                                      setHoverDate(hoverStr);
                                    }
                                  }}
                                  className="py-1.5 px-0.5 text-center cursor-pointer select-none"
                                  title={`Day ${dayObj.day}: ${dayObj.label}`}
                                >
                                  <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center text-[9px] font-black transition-all ${
                                    rangeStatus === 'START'
                                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                                      : rangeStatus === 'END'
                                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                                        : rangeStatus === 'IN_RANGE'
                                          ? 'bg-emerald-100 text-emerald-900 font-black'
                                          : isAvail 
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white' 
                                            : isBooked 
                                              ? 'bg-rose-100 text-rose-700 cursor-not-allowed opacity-90' 
                                              : 'bg-slate-200 text-slate-600 cursor-not-allowed opacity-70'
                                  }`}>
                                    {rangeStatus === 'START' ? 'IN' : rangeStatus === 'END' ? 'OUT' : isAvail ? '✓' : isBooked ? 'R' : '—'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ROOM SELECTION & BOOKING CONFIGURATION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Room Selector, Occupancy, Guest Details, and Payment Proof */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* AVAILABLE ROOMS FOR SELECTED DATES */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Available Rooms</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Select rooms for stay from <strong>{checkInDate}</strong> to <strong>{checkOutDate}</strong> ({calcNights} Night{calcNights > 1 ? 's' : ''})
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                    {selectedRooms.length} Selected
                  </span>
                </div>

                {fetchingAvailableRooms ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Checking room availability for selected dates...</span>
                  </div>
                ) : availableCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-rose-600 font-bold bg-rose-50/50 rounded-2xl p-4">
                    No rooms available for the selected dates. Please adjust your stay dates on the calendar above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableCategories.map((cat, catIdx) => {
                      const catImage = (cat.images && cat.images.length > 0) 
                        ? getImageUrl(cat.images[0]) 
                        : (cat.coverImage ? getImageUrl(cat.coverImage) : fallbackPropertyImages[(catIdx + 1) % fallbackPropertyImages.length]);

                      return (
                        <div 
                          key={cat.categoryId} 
                          className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            {/* Room Photo Thumbnail */}
                            <div className="w-full sm:w-44 h-32 sm:h-32 rounded-xl overflow-hidden relative shrink-0 border border-slate-200/80 bg-slate-100 group">
                              <img 
                                src={catImage} 
                                alt={cat.categoryName} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                onError={(e) => { e.currentTarget.src = fallbackPropertyImages[1]; }}
                              />
                              {cat.images && cat.images.length > 1 && (
                                <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                                  +{cat.images.length} Photos
                                </span>
                              )}
                            </div>

                            {/* Room Info & Rates */}
                            <div className="flex-1 w-full space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-900">{cat.categoryName}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                      {cat.roomType}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mt-1">
                                    {cat.bedType} • Max {cat.maxAdults} Adults, {cat.maxChildren} Child {cat.roomSize ? `• ${cat.roomSize} sq.ft` : ''}
                                  </p>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] font-black uppercase tracking-wider block text-slate-400">
                                    {linkType === 'agent' ? 'B2B Partner Rate' : 'Direct Guest Tariff'}
                                  </span>
                                  <span className="text-base font-black text-slate-900">
                                    ₹{Number(cat.basePrice).toLocaleString()}
                                    <span className="text-xs font-semibold text-slate-400"> /night</span>
                                  </span>
                                </div>
                              </div>

                              {/* Room Numbers Buttons */}
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                  Available Room Numbers ({cat.availableCount} open):
                                </span>
                                {cat.availableRooms?.length === 0 ? (
                                  <span className="text-xs text-rose-500 font-semibold italic">Sold out for these dates</span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {cat.availableRooms.map((roomNo) => {
                                      const isSelected = selectedRooms.some(r => String(r.roomNumber) === String(roomNo));
                                      return (
                                        <button
                                          key={roomNo}
                                          type="button"
                                          onClick={() => handleAddRoom(cat, roomNo)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
                                            isSelected 
                                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          {isSelected ? <Check size={12} className="stroke-[3]" /> : <Plus size={12} />}
                                          <span>Room {roomNo}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ROOM OCCUPANCY & MEAL PLAN CUSTOMIZATION */}
              {selectedRooms.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Room Configuration & Meal Plans</h3>
                    <p className="text-xs text-slate-400 font-medium">Customize guests & dining plan for each selected room</p>
                  </div>

                  <div className="space-y-3">
                    {selectedRooms.map((rm, idx) => (
                      <div key={rm.roomNumber} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                              <img 
                                src={(rm.images && rm.images[0]) ? getImageUrl(rm.images[0]) : (rm.coverImage ? getImageUrl(rm.coverImage) : fallbackPropertyImages[1])} 
                                alt={rm.categoryName} 
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = fallbackPropertyImages[1]; }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-900">
                              Room {rm.roomNumber} — {rm.categoryName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedRooms(selectedRooms.filter((_, i) => i !== idx))}
                            className="text-xs text-rose-600 font-bold hover:underline cursor-pointer border-none bg-transparent"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Meal Plan */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Meal Plan</label>
                            <select
                              value={rm.mealPlan || 'EP'}
                              onChange={(e) => updateRoomMealPlan(idx, e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                            >
                              <option value="EP">EP — Room Only</option>
                              <option value="CP">CP — Breakfast (+₹500)</option>
                              <option value="MAP">MAP — Breakfast & Dinner (+₹800)</option>
                              <option value="AP">AP — All Meals (+₹1,200)</option>
                            </select>
                          </div>

                          {/* Adults */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Adults</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1">
                              <button
                                type="button"
                                onClick={() => updateRoomAdults(idx, -1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer border-none"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="flex-1 text-center font-bold text-xs">{rm.adults || 2}</span>
                              <button
                                type="button"
                                onClick={() => updateRoomAdults(idx, 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer border-none"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Child (5-9) */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1">Child (5-9 yrs)</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1">
                              <button
                                type="button"
                                onClick={() => updateRoomChild(idx, -1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer border-none"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="flex-1 text-center font-bold text-xs">{rm.child5_9 || 0}</span>
                              <button
                                type="button"
                                onClick={() => updateRoomChild(idx, 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer border-none"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GUEST DETAILS FORM */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Guest Contact Information</h3>
                  <p className="text-xs text-slate-400 font-medium">Your contact details for reservation verification & stay check-in</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mobile Number <span className="text-rose-600">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="9876543210"
                        value={guestMobile}
                        onChange={(e) => setGuestMobile(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Special Requests / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any arrival time notes, dietary preferences, or bedding arrangements..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-rose-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ADVANCE PAYMENT & PROOF UPLOAD (MANDATORY REQUIREMENTS 1 & 3) */}
              <div className="bg-white border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Advance Payment & Verification Proof</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Pay the required advance to secure your booking. Once submitted, your dates are blocked and held.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                    Mandatory Advance
                  </span>
                </div>

                {/* Advance Amount Highlight Box */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      Advance Required ({paymentSettings.advanceType === 'fixed' ? 'Fixed Fee' : `${paymentSettings.advancePercent || 30}% of Total`})
                    </span>
                    <span className="text-2xl font-black text-emerald-700">₹{Number(advanceAmount).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-600 font-semibold sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Remaining at Check-in</span>
                    <span className="font-bold text-slate-800">₹{Number(remainingBalance).toLocaleString()}</span>
                  </div>
                </div>

                {/* Host Payment Details: UPI & Bank */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* UPI Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                        <QrCode size={15} className="text-rose-600" />
                        <span>Pay via UPI / QR</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">GPay / PhonePe / Paytm</span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800 truncate select-all">
                        {paymentSettings.upiId || 'keshavhomestay@okicici'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer border-none shrink-0"
                      >
                        {isCopiedUpi ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopiedUpi ? 'Copied' : 'Copy UPI'}</span>
                      </button>
                    </div>

                    {/* QR Code display */}
                    <div className="text-center pt-1">
                      {paymentSettings.upiQrCode ? (
                        <img src={paymentSettings.upiQrCode} alt="Host UPI QR" className="w-36 h-36 mx-auto object-contain rounded-xl border border-slate-200 p-1 bg-white" />
                      ) : (
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${paymentSettings.upiId || 'keshavhomestay@okicici'}&pn=${encodeURIComponent(property?.name || 'Homestay')}&am=${advanceAmount}&cu=INR`)}`} 
                          alt="Host UPI QR" 
                          className="w-32 h-32 mx-auto object-contain rounded-xl border border-slate-200 p-1 bg-white" 
                        />
                      )}
                      <span className="block text-[10px] text-slate-400 font-semibold mt-1">Scan using any UPI App</span>
                    </div>
                  </div>

                  {/* Bank Transfer Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                    <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <Building2 size={15} className="text-rose-600" />
                      <span>Direct Bank Transfer</span>
                    </span>

                    <div className="space-y-1.5 pt-1 text-[11px]">
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-400 font-medium">Account Name:</span>
                        <span className="font-bold text-slate-800">{paymentSettings.accountHolderName || property?.name || 'Homestay Account'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-400 font-medium">Bank Name:</span>
                        <span className="font-bold text-slate-800">{paymentSettings.bankName || 'HDFC Bank'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-400 font-medium">Account Number:</span>
                        <span className="font-mono font-bold text-slate-800">{paymentSettings.accountNumber || '5010 1234 5678 90'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1">
                        <span className="text-slate-400 font-medium">IFSC Code:</span>
                        <span className="font-mono font-bold text-slate-800">{paymentSettings.ifscCode || 'HDFC0001234'}</span>
                      </div>
                      {paymentSettings.branch && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Branch:</span>
                          <span className="font-bold text-slate-800">{paymentSettings.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mandatory Proof & Transaction Input */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      UPI Reference / Transaction UTR ID <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12-digit UTR: 423589123456 or Bank Ref ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Upload Payment Proof / Screenshot <span className="text-rose-600">*</span>
                    </label>

                    {paymentProofPreview ? (
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={paymentProofPreview} alt="Proof" className="w-14 h-14 object-cover rounded-xl border border-emerald-300" />
                          <div>
                            <span className="text-xs font-black text-emerald-900 block flex items-center gap-1">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>Payment Proof Attached</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">{paymentProofImage?.name || 'screenshot.png'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProofImage(null);
                            setPaymentProofPreview('');
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer border-none bg-transparent"
                          title="Remove"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/20">
                        <Upload size={24} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Click to upload payment screenshot</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP up to 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Right 1 Col: Summary & SUBMIT BOOKING REQUEST */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 sticky top-20">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Booking Summary</h3>
                  <span className="text-[10px] font-bold text-slate-400">Advance required to block dates</span>
                </div>

                {/* Stay Info */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Dates:</span>
                    <span className="font-bold text-slate-800">{checkInDate} to {checkOutDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Duration:</span>
                    <span className="font-bold text-slate-800">{calcNights} Night(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Rooms:</span>
                    <span className="font-bold text-rose-600">
                      {selectedRooms.length ? `${selectedRooms.length} Room(s)` : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Pricing Tier:</span>
                    <span className="font-bold text-slate-800">
                      {linkType === 'agent' ? 'B2B Partner' : 'B2C Direct'}
                    </span>
                  </div>
                </div>

                {/* Coupon / Promo Code Section */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Tag size={13} className="text-rose-600" />
                      <span>Promo / Coupon Code</span>
                    </span>
                    {appliedCoupon && (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Code Applied
                      </span>
                    )}
                  </div>

                  {/* Input Form */}
                  {appliedCoupon ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-mono font-black text-xs text-emerald-950 uppercase block">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold block">
                            {appliedCoupon.discountType === 'percentage'
                              ? `${appliedCoupon.discountValue}% OFF`
                              : `₹${Number(appliedCoupon.discountValue).toLocaleString()} Flat OFF`}
                            {calculatedPricing.discount > 0 && ` (Saved ₹${Number(calculatedPricing.discount).toLocaleString()})`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-[10px] font-bold cursor-pointer transition-all shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="ENTER CODE"
                          value={couponCodeInput}
                          onChange={(e) => {
                            setCouponCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                            if (couponError) setCouponError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          className="flex-1 min-w-0 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          disabled={validatingCoupon || !couponCodeInput.trim() || selectedRooms.length === 0}
                          onClick={() => handleApplyCoupon()}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shrink-0"
                        >
                          {validatingCoupon ? <RefreshCw size={12} className="animate-spin" /> : 'Apply'}
                        </button>
                      </div>

                      {couponError && (
                        <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1 animate-in fade-in">
                          <AlertCircle size={11} className="shrink-0" />
                          <span>{couponError}</span>
                        </div>
                      )}
                      {couponSuccess && (
                        <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 size={11} className="shrink-0" />
                          <span>{couponSuccess}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Available Public Offers Clickable Chips */}
                  {!appliedCoupon && availableCoupons.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Available Offers
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                        {availableCoupons.map((c) => (
                          <div
                            key={c._id || c.code}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50/50 border border-dashed border-slate-200 hover:border-rose-300 flex items-center justify-between gap-2 transition-all group"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-[11px] text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {c.code}
                                </span>
                                <span className="text-[10px] font-black text-rose-600">
                                  {c.discountType === 'percentage'
                                    ? `${c.discountValue}% OFF`
                                    : `₹${c.discountValue} OFF`}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5">
                                {c.minCartAmount > 0 ? `On bookings ₹${c.minCartAmount.toLocaleString()}+` : 'No minimum booking'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon(c.code)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-xs transition-all shrink-0"
                            >
                              Apply
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bill Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Room Tariff & Meals:</span>
                    <span className="font-bold text-slate-800">₹{Number(calculatedPricing.roomCost).toLocaleString()}</span>
                  </div>
                  {Number(calculatedPricing.discount) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-black">
                      <span className="flex items-center gap-1">
                        <Tag size={12} />
                        <span>Discount ({appliedCoupon?.code || 'COUPON'}):</span>
                      </span>
                      <span>-₹{Number(calculatedPricing.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">GST / Taxes (12%):</span>
                    <span className="font-bold text-slate-800">₹{Number(calculatedPricing.tax).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Total Stay Cost:</span>
                    <span className="text-slate-900 text-base">₹{Number(calculatedPricing.finalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-emerald-700 pt-1">
                    <span>Advance to Pay Now:</span>
                    <span className="text-sm">₹{Number(advanceAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Due at Check-in:</span>
                    <span>₹{Number(remainingBalance).toLocaleString()}</span>
                  </div>
                </div>

                {/* CONFIRM & SUBMIT REQUEST BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submittingBooking || selectedRooms.length === 0}
                    onClick={handleSubmitBookingRequest}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer border-none shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
                  >
                    {submittingBooking ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} className="stroke-[2.5]" />
                        <span>Submit Booking Request</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dates Blocked Notice */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                    <span>Instant Room Hold</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Submitting this request immediately reserves and blocks your dates on the calendar. The host will verify your payment receipt and confirm.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </main>
      )}

      {/* CONFIRMATION / ACKNOWLEDGEMENT SLIP MODAL */}
      {showSlipModal && submittedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-rose-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Booking Request Acknowledgement</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none shadow-xs"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSlipModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border-none"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Slip Printable Content */}
            <div ref={slipPrintRef} className="p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl space-y-6 text-slate-900 text-xs">
              
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">{property?.name}</h2>
                  <p className="text-[11px] text-slate-500 font-medium">{property?.address}, {property?.city}, {property?.state}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    Pending Verification
                  </span>
                  <span className="block font-mono text-xs font-black text-rose-600 mt-1">{submittedBooking.bookingId}</span>
                </div>
              </div>

              {/* Guest & Stay Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Guest Information</span>
                  <p className="font-bold text-slate-900">{submittedBooking.customer?.name}</p>
                  <p className="text-slate-600 font-medium">{submittedBooking.customer?.mobile}</p>
                  {submittedBooking.customer?.email && <p className="text-slate-600 font-medium">{submittedBooking.customer?.email}</p>}
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Stay Dates</span>
                  <p className="font-bold text-slate-900">Check-in: {checkInDate}</p>
                  <p className="font-bold text-slate-900">Check-out: {checkOutDate}</p>
                  <p className="text-slate-600 font-medium">{calcNights} Night(s)</p>
                </div>
              </div>

              {/* Room Breakdown Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2">Room</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Meal Plan</th>
                    <th className="py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedRooms.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 font-bold text-slate-800">Room {r.roomNumber}</td>
                      <td className="py-2">{r.categoryName}</td>
                      <td className="py-2">{r.mealPlan || 'EP'}</td>
                      <td className="py-2 text-right font-bold">₹{Number(r.price * calcNights).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Advance Payment Details */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Room Tariff:</span>
                  <span className="font-bold">₹{Number(calculatedPricing.roomCost).toLocaleString()}</span>
                </div>
                {Number(calculatedPricing.discount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount ({appliedCoupon?.code || submittedBooking.couponCode || 'Coupon'}):</span>
                    <span>-₹{Number(calculatedPricing.discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Total Stay Cost:</span>
                  <span className="font-bold">₹{Number(calculatedPricing.finalAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Advance Paid:</span>
                  <span>₹{Number(advanceAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transaction UTR:</span>
                  <span className="font-mono font-bold">{transactionId}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-slate-100">
                  <span>Balance Due at Check-in:</span>
                  <span>₹{Number(remainingBalance).toLocaleString()}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 text-center">
                Your dates are held and blocked on the availability schedule. The homestay host will verify your payment receipt and confirm your stay.
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Photo {lightboxIndex + 1} of {displayImages.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="text-white/80 hover:text-white cursor-pointer bg-transparent border-none p-1 transition-colors"
              >
                <X size={26} />
              </button>
            </div>

            <div className="relative w-full flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
                }}
                className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 cursor-pointer transition-all"
              >
                <ChevronLeft size={22} />
              </button>

              <img 
                src={getImageUrl(displayImages[lightboxIndex])} 
                alt={`Photo ${lightboxIndex + 1}`} 
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl" 
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 cursor-pointer transition-all"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
