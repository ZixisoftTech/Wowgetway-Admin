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
  AlertTriangle,
  Bed,
  Users,
  Lock,
  Copy,
  Send
} from 'lucide-react';
import MetricCard from '../components/widgets/MetricCard.jsx';

const API_BOOKINGS_URL = 'https://wow-getway-api.onrender.com/api/dashboard/bookings-list';
const API_HOMESTAYS_URL = 'https://wow-getway-api.onrender.com/api/dashboard/homestays-list';

export default function ManageBookings() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'details'
  const [selectedId, setSelectedId] = useState(null);
  
  // Wizard Redesign state variables
  const [wizardStep, setWizardStep] = useState(1);

  // Cab Tour Package selection states
  const [selectedCabTourPlan, setSelectedCabTourPlan] = useState(null);
  const [cabB2BCost, setCabB2BCost] = useState(48500);
  const [cabMarginType, setCabMarginType] = useState('percent'); // 'percent' | 'amount'
  const [cabMarginValue, setCabMarginValue] = useState(10);
  const [cabAdvanceRequired, setCabAdvanceRequired] = useState(15000);
  const [cabAdditionalNotes, setCabAdditionalNotes] = useState('');
  
  // Cab Cars List & Count
  const [cabNumberofCars, setCabNumberofCars] = useState(1);
  const [cabCarsList, setCabCarsList] = useState([
    { id: 1, type: 'SUV (Innova/Crysta)', model: 'Toyota Innova' },
    { id: 2, type: 'Sedan (Swift Dzire/Etios)', model: 'Toyota Innova' },
    { id: 3, type: 'Sedan (Swift Dzire/Etios)', model: 'Toyota Innova' },
    { id: 4, type: 'Sedan (Swift Dzire/Etios)', model: 'Toyota Innova' },
    { id: 5, type: 'Sedan (Swift Dzire/Etios)', model: 'Toyota Innova' }
  ]);
  
  // Driver Allocation states
  const [selectedDriverCarType, setSelectedDriverCarType] = useState('Four Seater');
  const [activeDriverTab, setActiveDriverTab] = useState(1);
  const [cabDriversList, setCabDriversList] = useState([
    { id: 1, name: 'Amit Tamang', phone: '98765 43210', whatsapp: '98765 43210', email: 'amit@gmail.com', carType: 'Four Seater', carModel: 'Toyota Innova Crysta', totalCost: 15000, advancePaid: 5000, collectionFromGuest: 10000, days: [1, 2, 3], saved: true },
    { id: 2, name: 'Dawa Lepcha', phone: '87654 32109', whatsapp: '87654 32109', email: 'dawa@gmail.com', carType: 'Twelve Seater', carModel: 'Force Traveller 12 Seater', totalCost: 20000, advancePaid: 8000, collectionFromGuest: 12000, days: [4, 5], saved: true }
  ]);
  const [driverAssignmentSkipped, setDriverAssignmentSkipped] = useState(false);
  
  // Invoice states
  const [invoiceNotes, setInvoiceNotes] = useState('Please note that remaining balance amount must be settled before check-in or trip start.');

  const updateCabCarItem = (index, field, value) => {
    setCabCarsList(prev => prev.map((car, idx) => idx === index ? { ...car, [field]: value } : car));
  };
  
  const handleCabCarsCountChange = (count) => {
    setCabNumberofCars(count);
  };

  // Number to Words in Indian System
  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
    const g = ['', 'Thousand ', 'Lakh ', 'Crore '];
    
    let n = ('000000000' + num).substr(-9);
    let word = '';
    
    let crores = parseInt(n.substr(0, 2));
    let lakhs = parseInt(n.substr(2, 2));
    let thousands = parseInt(n.substr(4, 2));
    let hundreds = parseInt(n.substr(6, 1));
    let tens = parseInt(n.substr(7, 2));
    
    if (crores > 0) {
      word += (crores < 20 ? a[crores] : b[Math.floor(crores / 10)] + a[crores % 10]) + 'Crore ';
    }
    if (lakhs > 0) {
      word += (lakhs < 20 ? a[lakhs] : b[Math.floor(lakhs / 10)] + a[lakhs % 10]) + 'Lakh ';
    }
    if (thousands > 0) {
      word += (thousands < 20 ? a[thousands] : b[Math.floor(thousands / 10)] + a[thousands % 10]) + 'Thousand ';
    }
    if (hundreds > 0) {
      word += a[hundreds] + 'Hundred ';
    }
    if (tens > 0) {
      if (tens < 20) word += a[tens];
      else word += b[Math.floor(tens / 10)] + a[tens % 10];
    }
    return word.trim() + ' Rupees Only';
  };
  const [roomsList, setRoomsList] = useState([
    { id: 1, adults: 2, child5_9: 0, child0_4: 0 }
  ]);
  const [itineraryList, setItineraryList] = useState([
    { id: 1, destination: '', checkInDate: '', checkOutDate: '' }
  ]);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [sameAsPhone, setSameAsPhone] = useState(false);

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

    // Initialize Redesigned Wizard states
    setRoomsList([
      { id: 1, adults: booking.guests?.adults || 2, child5_9: booking.guests?.children || 0, child0_4: 0 }
    ]);
    setItineraryList([
      {
        id: 1,
        destination: booking.propertyDetails?.location || booking.sightseeingDetails?.destination || '',
        checkInDate: booking.checkInDate ? new Date(booking.checkInDate).toISOString().split('T')[0] : '',
        checkOutDate: booking.checkOutDate ? new Date(booking.checkOutDate).toISOString().split('T')[0] : ''
      }
    ]);
    setSameAsPhone(booking.customer?.mobile === booking.customer?.whatsApp);
    setWizardStep(1);
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

  // Redesigned Wizard Helper states & functions
  useEffect(() => {
    const totalAdults = roomsList.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren = roomsList.reduce((sum, r) => sum + (r.child5_9 || 0) + (r.child0_4 || 0), 0);
    const totalGuests = totalAdults + totalChildren;
    
    setFormData(prev => ({
      ...prev,
      guests: {
        total: totalGuests,
        adults: totalAdults,
        children: totalChildren
      }
    }));
  }, [roomsList]);

  useEffect(() => {
    if (itineraryList && itineraryList.length > 0) {
      const first = itineraryList[0];
      setFormData(prev => ({
        ...prev,
        checkInDate: first.checkInDate || prev.checkInDate,
        checkOutDate: first.checkOutDate || prev.checkOutDate,
        propertyDetails: {
          ...prev.propertyDetails,
          location: first.destination || prev.propertyDetails.location
        },
        sightseeingDetails: {
          ...prev.sightseeingDetails,
          destination: first.destination || prev.sightseeingDetails.destination
        }
      }));
    }
  }, [itineraryList]);

  useEffect(() => {
    if (sameAsPhone && formData.customer?.mobile) {
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          whatsApp: prev.customer.mobile
        }
      }));
    }
  }, [sameAsPhone, formData.customer?.mobile]);

  const updateRoomCount = (roomId, field, direction) => {
    setRoomsList(prev => prev.map(r => {
      if (r.id === roomId) {
        const val = r[field] || 0;
        const newVal = direction === 'add' ? val + 1 : Math.max(0, val - 1);
        if (field === 'adults' && r.id === 1) {
          return { ...r, [field]: Math.max(1, newVal) };
        }
        return { ...r, [field]: newVal };
      }
      return r;
    }));
  };

  const addAnotherRoom = () => {
    setRoomsList(prev => [
      ...prev,
      { id: Date.now(), adults: 2, child5_9: 0, child0_4: 0 }
    ]);
  };

  const deleteRoom = (roomId) => {
    if (roomsList.length > 1) {
      setRoomsList(prev => prev.filter(r => r.id !== roomId));
    }
  };

  const updateItineraryItem = (id, field, value) => {
    setItineraryList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addAnotherItineraryItem = () => {
    setItineraryList(prev => [
      ...prev,
      { id: Date.now(), destination: '', checkInDate: '', checkOutDate: '' }
    ]);
  };

  const deleteItineraryItem = (id) => {
    if (itineraryList.length > 1) {
      setItineraryList(prev => prev.filter(item => item.id !== id));
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.customer?.name?.trim()) {
        alert('Guest Full Name is required.');
        return false;
      }
      if (!formData.customer?.mobile?.trim()) {
        alert('Contact Number is required.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') {
        if (!formData.propertyDetails?.propertyId) {
          alert('Please select a property allocation.');
          return false;
        }
      } else if (formData.bookingType === 'Ride Booking') {
        // Bypass pickup/drop checking for Ride Booking during wizard navigation
        return true;
      } else {
        if (!formData.sightseeingDetails?.packageName?.trim()) {
          alert('Package Name is required.');
          return false;
        }
      }
      return true;
    }
    if (step === 4) {
      if (formData.bookingType === 'Ride Booking') {
        // Bypass base amount > 0 checking for Ride Booking
        return true;
      }
      if (formData.pricing?.bookingAmount <= 0) {
        alert('Please enter base booking amount.');
        return false;
      }
      return true;
    }
    return true;
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
                  setRoomsList([{ id: 1, adults: 2, child5_9: 0, child0_4: 0 }]);
                  setItineraryList([{ id: 1, destination: '', checkInDate: '', checkOutDate: '' }]);
                  setSameAsPhone(false);
                  setWizardStep(1);
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-[1400px] mx-auto pb-32 select-none">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Discard form entries and go back?')) {
                    setViewMode('list');
                    setSelectedId(null);
                  }
                }}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-655 flex items-center justify-center cursor-pointer transition-all shadow-sm"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Create New Booking</h1>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">
                  Dashboard &gt; Bookings &gt; <span className="text-red-500">Create New Booking</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alert('Draft saved successfully.')}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <FileText size={14} className="text-slate-500" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('list'); setSelectedId(null); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Layers size={14} className="text-slate-500" />
                <span>View All Bookings</span>
              </button>
            </div>
          </div>

          {/* Stepper Progress Journey */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between px-2 max-w-3xl mx-auto">
              {(formData.bookingType === 'Ride Booking'
                ? [
                    { step: 1, label: 'Guest Details' },
                    { step: 2, label: 'Select Plan' },
                    { step: 3, label: 'Review & Pricing' },
                    { step: 4, label: 'Quotation' },
                    { step: 5, label: 'Assign Driver' },
                    { step: 6, label: 'Invoice' }
                  ]
                : [
                    { step: 1, label: 'Requirements' },
                    { step: 2, label: 'Selection' },
                    { step: 3, label: 'Add-ons' },
                    { step: 4, label: 'Payment' },
                    { step: 5, label: 'Confirm' }
                  ]
              ).map((s, idx, arr) => (
                <React.Fragment key={s.step}>
                  <div className="flex flex-col items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (s.step < wizardStep) {
                          setWizardStep(s.step);
                        } else {
                          let canGo = true;
                          for (let i = 1; i < s.step; i++) {
                            if (!validateStep(i)) {
                              canGo = false;
                              break;
                            }
                          }
                          if (canGo) setWizardStep(s.step);
                        }
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                        wizardStep === s.step
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-105'
                          : wizardStep > s.step
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-50 border border-slate-200 text-slate-450 hover:bg-slate-100'
                      }`}
                    >
                      {wizardStep > s.step ? <Check size={14} className="stroke-[3.5]" /> : s.step}
                    </button>
                    <span className={`text-[10px] font-black uppercase tracking-wide transition-colors ${
                      wizardStep === s.step ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition-colors duration-300 ${
                      wizardStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form Fields (Step based) */}
              <div className="lg:col-span-8 space-y-6">
                           {/* STEP 1: REQUIREMENTS */}
                {wizardStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    
                    {/* Guest Details */}
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Users size={16} className="text-blue-600" />
                        <span>Guest Details</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 text-xs font-bold text-slate-700">
                        <div>
                          <label className="text-slate-500 block mb-1">Guest Name <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              required
                              value={formData.customer?.name}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customer: { ...prev.customer, name: e.target.value }
                              }))}
                              placeholder="Enter full name"
                              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-500 block mb-1">Contact Number <span className="text-red-500">*</span></label>
                          <div className="flex gap-1.5">
                            <select
                              value={phoneCountryCode}
                              onChange={(e) => setPhoneCountryCode(e.target.value)}
                              className="w-20 px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none"
                            >
                              <option value="+91">+91 (IN)</option>
                            </select>
                            <input
                              type="tel"
                              required
                              value={formData.customer?.mobile}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  customer: { 
                                    ...prev.customer, 
                                    mobile: val, 
                                    whatsApp: sameAsPhone ? val : prev.customer.whatsApp 
                                  }
                                }));
                              }}
                              placeholder="98765 43210"
                              className="flex-1 px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-500 block mb-1">Email ID <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              required
                              value={formData.customer?.email}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customer: { ...prev.customer, email: e.target.value }
                              }))}
                              placeholder="example@email.com"
                              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-slate-500">WhatsApp Number</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sameAsPhone}
                                onChange={(e) => setSameAsPhone(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 border-slate-200 h-3.5 w-3.5"
                              />
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Same as phone</span>
                            </label>
                          </div>
                          <div className="flex gap-1.5">
                            <select
                              value={whatsappCountryCode}
                              onChange={(e) => setWhatsappCountryCode(e.target.value)}
                              disabled={sameAsPhone}
                              className="w-20 px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none disabled:opacity-60"
                            >
                              <option value="+91">+91 (IN)</option>
                            </select>
                            <input
                              type="tel"
                              disabled={sameAsPhone}
                              value={formData.customer?.whatsApp}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                customer: { ...prev.customer, whatsApp: e.target.value }
                              }))}
                              placeholder="WhatsApp number"
                              className="flex-1 px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-slate-500 block mb-1">Communication Address <span className="text-red-500">*</span></label>
                          <textarea
                            required
                            value={formData.customer?.address}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              customer: { ...prev.customer, address: e.target.value }
                            }))}
                            placeholder="Street name, landmark, city, state and zip code"
                            rows="2"
                            className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Booking Category */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 pl-1 uppercase tracking-wider">
                        <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                        <span>Booking Category</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { id: 'Homestay Booking', title: 'Homestay / Hotel', desc: 'Book luxury homestays, premium resorts, hotels and private villas.', icon: Home },
                          { id: 'Ride Booking', title: 'Cab Booking', desc: 'Book private cabs, airport transfers, and local transport vehicles.', icon: Car },
                          { id: 'Tour Package Booking', title: 'Tour Packages', desc: 'Curated full tour itineraries including sightseeing and activities.', icon: MapPin }
                        ].map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = formData.bookingType === cat.id || 
                                             (cat.id === 'Homestay Booking' && formData.bookingType === 'Hotel Booking') ||
                                             (cat.id === 'Tour Package Booking' && formData.bookingType === 'Sightseeing Booking');
                          return (
                            <div
                              key={cat.id}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, bookingType: cat.id }));
                              }}
                              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-44 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/10'
                                  : 'border-slate-200 hover:bg-slate-50 bg-white'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <Icon size={20} />
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 mb-1">{cat.title}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">{cat.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sub-selector for Homestay vs Hotel */}
                      {(formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mt-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bookingType: 'Homestay Booking' }))}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              formData.bookingType === 'Homestay Booking' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            🏡 Homestay Booking
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bookingType: 'Hotel Booking' }))}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              formData.bookingType === 'Hotel Booking' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            🏢 Hotel Booking
                          </button>
                        </div>
                      )}

                      {/* Sub-selector for Tour vs Sightseeing */}
                      {(formData.bookingType === 'Tour Package Booking' || formData.bookingType === 'Sightseeing Booking') && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mt-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bookingType: 'Tour Package Booking' }))}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              formData.bookingType === 'Tour Package Booking' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            🗺 Tour Package
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, bookingType: 'Sightseeing Booking' }))}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              formData.bookingType === 'Sightseeing Booking' ? 'bg-white text-slate-850 shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            📸 Local Sightseeing
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Stay Requirements */}
                    {(formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') && (
                      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                          <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <Users size={16} className="text-blue-600" />
                            <span>Stay Requirements</span>
                          </h3>
                          <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider">
                            Total Capacity: {formData.guests?.total || 0} Pax
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
                          {[
                            { label: 'Total Adults', field: 'adults' },
                            { label: 'Child (5-9Y)', field: 'child5_9' },
                            { label: 'Child (0-4Y)', field: 'child0_4' },
                            { label: 'Total Rooms', isRoomsCount: true }
                          ].map((countItem, idx) => {
                            let value = 0;
                            if (countItem.isRoomsCount) {
                              value = roomsList.length;
                            } else {
                              value = roomsList.reduce((sum, r) => sum + (r[countItem.field] || 0), 0);
                            }
                            return (
                              <div key={idx} className="space-y-1">
                                <label className="text-slate-555 block mb-0.5">{countItem.label}</label>
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (countItem.isRoomsCount) {
                                        deleteRoom(roomsList[roomsList.length - 1]?.id);
                                      } else {
                                        updateRoomCount(roomsList[0]?.id, countItem.field, 'sub');
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="font-extrabold text-slate-800 text-sm">{value}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (countItem.isRoomsCount) {
                                        addAnotherRoom();
                                      } else {
                                        updateRoomCount(roomsList[0]?.id, countItem.field, 'add');
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Room Assignments breakdown list */}
                        <div className="pt-2">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Room Assignments</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            {roomsList.map((room, roomIdx) => (
                              <div key={room.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <Bed size={14} className="text-blue-600" />
                                    Room {roomIdx + 1}
                                  </span>
                                  {roomsList.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => deleteRoom(room.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-500">
                                  <div className="bg-white p-2 rounded-xl border border-slate-150">
                                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">AD</span>
                                    <div className="flex justify-between items-center gap-1 mt-1">
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'adults', 'sub')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">-</button>
                                      <span className="text-xs font-extrabold text-slate-855">{room.adults}</span>
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'adults', 'add')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">+</button>
                                    </div>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-slate-150">
                                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">C (5-9)</span>
                                    <div className="flex justify-between items-center gap-1 mt-1">
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'child5_9', 'sub')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">-</button>
                                      <span className="text-xs font-extrabold text-slate-855">{room.child5_9}</span>
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'child5_9', 'add')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">+</button>
                                    </div>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-slate-150">
                                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase mb-0.5">C (0-4)</span>
                                    <div className="flex justify-between items-center gap-1 mt-1">
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'child0_4', 'sub')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">-</button>
                                      <span className="text-xs font-extrabold text-slate-855">{room.child0_4}</span>
                                      <button type="button" onClick={() => updateRoomCount(room.id, 'child0_4', 'add')} className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-1">+</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={addAnotherRoom}
                            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-455 hover:text-blue-600 hover:border-blue-600 font-bold transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer bg-white"
                          >
                            <Plus size={14} className="stroke-[3]" />
                            <span>Add Another Room</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cab Booking Details */}
                    {formData.bookingType === 'Ride Booking' && (
                      <>
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                          <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-55 pb-3 uppercase tracking-wider">
                            <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                            <span>Cab Booking Details</span>
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-bold text-slate-700">
                            {/* Total Heads */}
                            <div className="flex flex-col justify-between">
                              <label className="text-slate-555 block mb-1">Total Heads *</label>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ 
                                    ...prev, 
                                    guests: { ...prev.guests, total: Math.max(1, (prev.guests?.total || 1) - 1) } 
                                  }))}
                                  className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 text-sm cursor-pointer shadow-sm"
                                >
                                  −
                                </button>
                                <span className="w-10 text-center text-sm font-black text-slate-800">
                                  {formData.guests?.total || 4}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ 
                                    ...prev, 
                                    guests: { ...prev.guests, total: (prev.guests?.total || 1) + 1 } 
                                  }))}
                                  className="w-8.5 h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 text-sm cursor-pointer shadow-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Number of Cars */}
                            <div>
                              <label className="text-slate-555 block mb-1">Number of Cars *</label>
                              <select
                                value={cabNumberofCars}
                                onChange={(e) => setCabNumberofCars(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-707"
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Car Details blocks */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {Array.from({ length: cabNumberofCars }).map((_, idx) => {
                              const carIdx = idx + 1;
                              const carDetails = cabCarsList[idx] || { type: 'Sedan (Swift Dzire/Etios)', model: 'Toyota Innova' };
                              return (
                                <div key={idx} className="border border-slate-200 p-4.5 rounded-2xl bg-white space-y-3 shadow-sm">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    🚙 Car {carIdx} Details
                                  </h4>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Car Type *</label>
                                      <select
                                        value={carDetails.type}
                                        onChange={(e) => updateCabCarItem(idx, 'type', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                                      >
                                        <option value="Sedan (Swift Dzire/Etios)">Sedan (Swift Dzire/Etios)</option>
                                        <option value="SUV (Innova/Crysta)">SUV (Innova/Crysta)</option>
                                        <option value="Twelve Seater">Twelve Seater</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Car Model *</label>
                                      <select
                                        value={carDetails.model}
                                        onChange={(e) => updateCabCarItem(idx, 'model', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                                      >
                                        <option value="Toyota Innova">Toyota Innova</option>
                                        <option value="Toyota Innova Crysta">Toyota Innova Crysta</option>
                                        <option value="Maruti Swift Dzire">Maruti Swift Dzire</option>
                                        <option value="Force Traveller 12 Seater">Force Traveller 12 Seater</option>
                                        <option value="Mahindra Scorpio">Mahindra Scorpio</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Select Car Plan */}
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                          <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-55 pb-3 uppercase tracking-wider">
                            <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                            <span>Select Car Plan</span>
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div
                              onClick={() => setWizardStep(2)}
                              className="p-5 rounded-2xl border-2 border-slate-205 hover:border-blue-600 hover:bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between group bg-white shadow-sm"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-base">
                                  📄
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 group-hover:text-blue-650 transition-colors">Choose Plan</h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Select from your existing cab plans and packages.</p>
                                </div>
                              </div>
                              <span className="text-slate-400 group-hover:translate-x-1 transition-transform font-bold">➔</span>
                            </div>

                            <div
                              onClick={() => {
                                alert('Create New Plan flow triggered. Proceeding to configure pricing...');
                                setWizardStep(3);
                              }}
                              className="p-5 rounded-2xl border-2 border-slate-205 hover:border-blue-600 hover:bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between group bg-white shadow-sm"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-655 flex items-center justify-center font-bold text-base">
                                  ➕
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 group-hover:text-blue-650 transition-colors">Create New Plan</h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Create a new cab plan tailored for this booking.</p>
                                </div>
                              </div>
                              <span className="text-slate-400 group-hover:translate-x-1 transition-transform font-bold">➔</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Itinerary & Destinations (For Non-Ride bookings) */}
                    {formData.bookingType !== 'Ride Booking' && (
                      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                          <MapPin size={16} className="text-blue-600" />
                          <span>Itinerary & Destinations</span>
                        </h3>

                        <div className="space-y-4 relative">
                          {itineraryList.length > 1 && (
                            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-dashed border-l border-slate-200 z-0"></div>
                          )}

                          {itineraryList.map((item, index) => (
                            <div key={item.id} className="relative z-10 bg-slate-50/50 p-4.5 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-start">
                              <div className="w-8 h-8 rounded-full bg-blue-650 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-xs font-bold text-slate-700">
                                <div>
                                  <label className="text-slate-500 block mb-1">Location / Destination</label>
                                  <div className="relative">
                                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      required
                                      value={item.destination}
                                      onChange={(e) => updateItineraryItem(item.id, 'destination', e.target.value)}
                                      placeholder="e.g. Manali, Himachal"
                                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-707"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-slate-500 block mb-1">Check-in Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={item.checkInDate}
                                    onChange={(e) => updateItineraryItem(item.id, 'checkInDate', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-707"
                                  />
                                </div>

                                <div>
                                  <label className="text-slate-550 block mb-1">Check-out Date</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      required
                                      value={item.checkOutDate}
                                      onChange={(e) => updateItineraryItem(item.id, 'checkOutDate', e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-707"
                                    />
                                    {itineraryList.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => deleteItineraryItem(item.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-200 bg-white"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addAnotherItineraryItem}
                          className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-455 hover:text-blue-600 hover:border-blue-600 font-bold transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer bg-white"
                        >
                          <Plus size={14} className="stroke-[3]" />
                          <span>Add Another Location</span>
                        </button>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* STEP 2: SELECTION */}
                {wizardStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                      <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                        Select Item Allocation
                      </h3>

                      {/* Homestay/Hotel allocation */}
                      {(formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Select Property Allocation *</label>
                            <select
                              required
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
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                            >
                              <option value="">-- Choose Property --</option>
                              {homestaysList.map(h => (
                                <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Room Category</label>
                            <select
                              value={formData.propertyDetails?.roomCategory}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                propertyDetails: { ...prev.propertyDetails, roomCategory: e.target.value }
                              }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                            >
                              <option value="Standard">Standard Class</option>
                              <option value="Premium">Premium Class</option>
                              <option value="Deluxe">Deluxe Class</option>
                              <option value="Super Deluxe">Super Deluxe Class</option>
                              <option value="Suite">Suite Luxury</option>
                              <option value="Penthouse">Penthouse Suite</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Room Allocation Number</label>
                            <input
                              type="text"
                              value={formData.propertyDetails?.roomNumber}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                propertyDetails: { ...prev.propertyDetails, roomNumber: e.target.value }
                              }))}
                              placeholder="e.g. 201, Cabin 4"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                            />
                          </div>
                        </div>
                      )}

                      {/* Ride Allocation */}
                      {formData.bookingType === 'Ride Booking' && (
                        <div className="space-y-6">
                          {/* Filter row */}
                          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4.5 text-xs font-bold text-slate-707">
                            <div>
                              <label className="text-slate-500 block mb-1">Package Type</label>
                              <select className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none">
                                <option value="Sikkim package">Sikkim package</option>
                                <option value="Darjeeling package">Darjeeling package</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-500 block mb-1">Search Package</label>
                              <input type="text" placeholder="Search packages..." className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-semibold text-slate-707 focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-slate-500 block mb-1">Sort By</label>
                              <select className="w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-bold text-slate-707 focus:outline-none">
                                <option value="newest">Newest to Oldest</option>
                                <option value="oldest">Oldest to Newest</option>
                              </select>
                            </div>
                          </div>

                          {/* Package List Table */}
                          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-4 space-y-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pl-2 border-b border-slate-55 pb-2.5">
                              Choose Cab TOUR Plan v1
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-bold text-slate-707">
                                <thead>
                                  <tr className="border-b border-slate-150 text-slate-400 font-black text-[9px] uppercase tracking-wider bg-slate-50/50">
                                    <th className="py-2.5 px-4">Package ID</th>
                                    <th className="py-2.5 px-4">Package Name</th>
                                    <th className="py-2.5 px-4">Destinations</th>
                                    <th className="py-2.5 px-4">Duration</th>
                                    <th className="py-2.5 px-4">Meal Plan</th>
                                    <th className="py-2.5 px-4">Created Date</th>
                                    <th className="py-2.5 px-4">Price / Person</th>
                                    <th className="py-2.5 px-4 text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { id: 'PKG001', name: 'Sikkim Hidden Trails', destinations: 'Gangtok, Lachung, Pelling', duration: '4 Nights / 5 Days', meal: 'MAP (Half Board)', date: '10 May 2025', price: 12500, img: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=150' },
                                    { id: 'PKG002', name: 'Darjeeling Scenic Beauty', destinations: 'Darjeeling, Kalimpong', duration: '3 Nights / 4 Days', meal: 'CP (Breakfast)', date: '12 May 2025', price: 9500, img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150' }
                                  ].map((pkg) => {
                                    const isSelected = selectedCabTourPlan?.id === pkg.id;
                                    return (
                                      <tr key={pkg.id} className={`border-b border-slate-100 transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50/20'}`}>
                                        <td className="py-3 px-4 text-rose-505 font-mono">{pkg.id}</td>
                                        <td className="py-3 px-4 flex items-center gap-3">
                                          <img src={pkg.img} alt={pkg.name} className="w-12 h-9 object-cover rounded-lg border border-slate-200 shrink-0" />
                                          <span className="text-slate-805 font-black">{pkg.name}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 font-semibold">{pkg.destinations}</td>
                                        <td className="py-3 px-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-650 rounded text-[9px] font-black">{pkg.duration}</span></td>
                                        <td className="py-3 px-4 text-slate-600">{pkg.meal}</td>
                                        <td className="py-3 px-4 text-slate-500">{pkg.date}</td>
                                        <td className="py-3 px-4 font-mono font-extrabold text-slate-800">₹ {pkg.price.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-center">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedCabTourPlan(pkg)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-707 hover:bg-slate-50'
                                            }`}
                                          >
                                            {isSelected ? '✓ Selected' : 'Select'}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination and Confirm */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3.5 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Showing 1 to 2 of 2 entries</span>
                              <button
                                type="button"
                                disabled={!selectedCabTourPlan}
                                onClick={() => {
                                  // Auto fill travel dates & route based on plan
                                  setFormData(prev => ({
                                    ...prev,
                                    rideDetails: {
                                      ...prev.rideDetails,
                                      pickup: 'Bagdogra Airport',
                                      drop: 'Gangtok',
                                      travelDate: '2025-05-20'
                                    }
                                  }));
                                  setWizardStep(3);
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 border-none"
                              >
                                <span>Confirm Selected Plan</span>
                                <span>➔</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tour Package allocation */}
                      {(formData.bookingType === 'Tour Package Booking' || formData.bookingType === 'Sightseeing Booking') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Package / Sightseeing Name *</label>
                            <input
                              type="text"
                              required
                              value={formData.sightseeingDetails?.packageName}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sightseeingDetails: { ...prev.sightseeingDetails, packageName: e.target.value }
                              }))}
                              placeholder="e.g. Manali Scenic Sightseeing Guide"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Assigned Tour Guide</label>
                            <input
                              type="text"
                              value={formData.sightseeingDetails?.guideAssigned}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sightseeingDetails: { ...prev.sightseeingDetails, guideAssigned: e.target.value }
                              }))}
                              placeholder="Guide Name"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Package Duration</label>
                            <select
                              value={formData.sightseeingDetails?.duration}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sightseeingDetails: { ...prev.sightseeingDetails, duration: e.target.value }
                              }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                            >
                              <option value="Half Day">Half Day (4 Hours)</option>
                              <option value="Full Day">Full Day Tour</option>
                              <option value="2 Days / 1 Night">2 Days / 1 Night</option>
                              <option value="3 Days / 2 Nights">3 Days / 2 Nights</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: TOUR PACKAGE COMMERCIALS & SUMMARY / ADD-ONS */}
                {wizardStep === 3 && (
                  formData.bookingType === 'Ride Booking' ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      {/* Header bar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setWizardStep(2)}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-205 bg-white flex items-center justify-center"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base font-black text-slate-800">Review & Pricing</h2>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Dashboard &gt; Bookings &gt; Create New Booking &gt; Review & Pricing
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          className="px-4 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm bg-white hover:bg-slate-50 cursor-pointer"
                        >
                          View All Bookings
                        </button>
                      </div>

                      {/* Top Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
                        {/* Guests Card */}
                        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
                          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-lg shadow-sm">
                            👥
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Total Heads</p>
                            <h4 className="text-sm font-black text-slate-800 mt-0.5">{formData.guests?.total || 8} Guests</h4>
                          </div>
                        </div>

                        {/* B2B Cost Card */}
                        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4.5">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shadow-sm">
                              💳
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Total Car B2B Cost</p>
                              <h4 className="text-sm font-black text-slate-800 mt-0.5">₹ {cabB2BCost?.toLocaleString()}</h4>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newCost = prompt('Enter Total Car B2B Cost (₹):', cabB2BCost);
                              if (newCost && !isNaN(newCost)) {
                                setCabB2BCost(Number(newCost));
                              }
                            }}
                            className="text-[10px] text-blue-600 font-black flex items-center gap-1 hover:underline cursor-pointer border border-blue-100 px-2 py-1 rounded-lg bg-blue-50/50"
                          >
                            ✏️ Editable
                          </button>
                        </div>

                        {/* Selected Plan Card */}
                        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4.5">
                          <div className="w-11 h-11 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-lg shadow-sm">
                            📅
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Car Plan Selected</p>
                            <h4 className="text-sm font-black text-slate-800 mt-0.5">Sikkim Hidden Trails</h4>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">4 Nights / 5 Days</span>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <div>
                          <h3 className="text-sm font-black text-slate-855">Vehicle Details</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Cars and vehicle details for this booking.
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-bold text-slate-707">
                            <thead>
                              <tr className="border-b border-slate-150 text-slate-400 font-black text-[9px] uppercase tracking-wider bg-slate-50/50">
                                <th className="py-2.5 px-4">Car No.</th>
                                <th className="py-2.5 px-4">Car Type</th>
                                <th className="py-2.5 px-4">Car Model</th>
                                <th className="py-2.5 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cabCarsList.slice(0, cabNumberofCars).map((car, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/20">
                                  <td className="py-3.5 px-4 flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-black">🚗</span>
                                    {idx + 1}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-800 font-black">{car.type === 'Sedan (Swift Dzire/Etios)' ? 'Four Seater' : car.type === 'SUV (Innova/Crysta)' ? 'Four Seater' : car.type}</td>
                                  <td className="py-3.5 px-4 text-slate-500 font-semibold">{car.model === 'Toyota Innova' ? 'Toyota Innova Crysta' : car.model === 'Maruti Swift Dzire' ? 'Force Traveller 12 Seater' : car.model}</td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100">INCLUDED</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Car Plan Itinerary */}
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                          <div>
                            <h3 className="text-sm font-black text-slate-855">Car Plan Itinerary (Summary)</h3>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Only car plan details are included. Hotel stay, meals & sightseeing are not part of this booking.</p>
                          </div>
                          <span className="text-[10px] text-blue-650 font-black hover:underline cursor-pointer flex items-center gap-1.5">
                            <Eye size={12} />
                            <span>View Full Itinerary</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 pt-2">
                          {[
                            { day: 'Day 1', title: 'Bagdogra Airport', desc: 'Pickup & Transfer', metric: '125 km / 4 hrs' },
                            { day: 'Day 2', title: 'Gangtok Local', desc: 'Local Sightseeing', metric: '80 km / 8 hrs' },
                            { day: 'Day 3', title: 'Transfer to Lachung', desc: 'Gangtok → Lachung', metric: '120 km / 5 hrs' },
                            { day: 'Day 4', title: 'Transfer to Pelling', desc: 'Lachung → Pelling', metric: '140 km / 6 hrs' },
                            { day: 'Day 5', title: 'Drop', desc: 'Pelling → Bagdogra', metric: '115 km / 4 hrs' }
                          ].map((item, idx) => (
                            <div key={idx} className="border border-slate-200 p-4 rounded-2xl bg-white shadow-sm flex flex-col justify-between min-h-[110px]">
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.day}</span>
                                <h4 className="text-xs font-black text-slate-805 mt-1 leading-snug">{item.title}</h4>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{item.desc}</p>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-55 border border-slate-150 px-2 py-0.5 rounded-md mt-3 block w-fit font-bold">{item.metric}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-center pt-2">
                          <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Total Duration: 4 Nights / 5 Days
                          </span>
                        </div>
                      </div>

                      {/* Pricing & Margin Details */}
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <div>
                          <h3 className="text-sm font-black text-slate-850">Pricing & Margin Details</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Add margin to calculate final amount for this booking.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                          <div className="md:col-span-2 space-y-4 border-r border-slate-100 pr-6">
                            <div>
                              <label className="text-[9px] text-slate-450 font-black uppercase tracking-wider block mb-1">Total Car Cost (B2B)</label>
                              <div className="relative w-full">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                <input
                                  type="number"
                                  value={cabB2BCost}
                                  onChange={(e) => setCabB2BCost(Number(e.target.value))}
                                  className="w-full pl-8 pr-8 py-2 bg-slate-55 border border-slate-205 rounded-xl text-xs font-black text-slate-705 focus:outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">✏️</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-455 font-black uppercase tracking-wider block mb-1.5">Add Margin</label>
                              <p className="text-[10px] text-slate-400 font-bold mb-2">Choose how you want to add margin.</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div
                                  onClick={() => setCabMarginType('percent')}
                                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center relative ${
                                    cabMarginType === 'percent' ? 'border-blue-600 bg-blue-50/10' : 'border-slate-205 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <span className="text-lg font-black block text-rose-500 font-bold">%</span>
                                    <span className="text-[10px] text-slate-805 font-extrabold">Percentage (%)</span>
                                  </div>
                                  <div className="absolute top-3 right-3">
                                    <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                                      cabMarginType === 'percent' ? 'border-blue-600 bg-blue-600 text-white font-extrabold' : 'border-slate-300'
                                    }`}>
                                      {cabMarginType === 'percent' && <span className="text-[8px]">✓</span>}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  onClick={() => setCabMarginType('amount')}
                                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center relative ${
                                    cabMarginType === 'amount' ? 'border-blue-600 bg-blue-50/10' : 'border-slate-205 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div>
                                    <span className="text-lg font-black block text-blue-600 font-bold">₹</span>
                                    <span className="text-[10px] text-slate-805 font-extrabold">Amount (₹)</span>
                                  </div>
                                  <div className="absolute top-3 right-3">
                                    <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                                      cabMarginType === 'amount' ? 'border-blue-600 bg-blue-600 text-white font-extrabold' : 'border-slate-300'
                                    }`}>
                                      {cabMarginType === 'amount' && <span className="text-[8px]">✓</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3.5 relative">
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                                  {cabMarginType === 'percent' ? '%' : '₹'}
                                </span>
                                <input
                                  type="number"
                                  value={cabMarginValue}
                                  onChange={(e) => setCabMarginValue(Number(e.target.value))}
                                  className="w-full pr-8 pl-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/40 border border-slate-150 rounded-3xl p-6 flex flex-col justify-between min-h-[200px] shadow-sm">
                            <div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Margin Amount</p>
                              <h4 className="text-base font-black text-slate-800 mt-1 font-mono">
                                ₹ {(() => {
                                  const amt = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                  return amt?.toLocaleString();
                                })()}
                              </h4>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Final Amount (B2C)</p>
                              <h3 className="text-2xl font-black text-rose-500 mt-1 font-mono leading-none">
                                ₹ {(() => {
                                  const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                  return (cabB2BCost + margin)?.toLocaleString();
                                })()}
                              </h3>
                              <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-2.5 leading-snug">
                                Amount in Words:
                                <span className="text-slate-855 font-black block mt-0.5 normal-case font-sans">
                                  {(() => {
                                    const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                    return numberToWords(cabB2BCost + margin);
                                  })()}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Advance & Notes Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Advance to Confirm Booking */}
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                          <div>
                            <h3 className="text-sm font-black text-slate-855">Advance to Confirm Booking</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Collect advance from guest to confirm this booking.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[9px] text-slate-455 font-black uppercase tracking-wider block mb-1">Advance Required (₹)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                <input
                                  type="number"
                                  value={cabAdvanceRequired}
                                  onChange={(e) => setCabAdvanceRequired(Number(e.target.value))}
                                  className="w-full pl-8 pr-4 py-2 bg-slate-55 border border-slate-205 rounded-xl text-xs font-black text-slate-705 focus:outline-none"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">This amount will be collected from guest now.</p>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-150 p-4.5 rounded-2xl flex gap-3 text-xs font-bold text-slate-655 items-start">
                              <span className="text-base leading-none">ℹ️</span>
                              <div>
                                <h5 className="font-black text-slate-805 text-[10px] uppercase tracking-wider leading-none">Note</h5>
                                <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">
                                  You can collect advance from the guest to confirm the booking. Remaining amount can be collected later before the trip.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Notes (Optional) */}
                        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                          <div>
                            <h3 className="text-sm font-black text-slate-855">Additional Notes (Optional)</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Add any notes or special instructions for this booking.
                            </p>
                          </div>

                          <div className="pt-2">
                            <textarea
                              value={cabAdditionalNotes}
                              onChange={(e) => setCabAdditionalNotes(e.target.value)}
                              placeholder="Type your notes here..."
                              rows="5"
                              className="w-full px-4 py-3 bg-slate-55 border border-slate-205 rounded-2xl text-xs font-semibold text-slate-707 focus:outline-none focus:border-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sticky Bottom Actions */}
                      <div className="flex justify-between items-center bg-white border border-slate-105 px-6 py-4.5 rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Compute and sync final price
                            const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                            const finalPrice = cabB2BCost + margin;
                            setFormData(prev => ({
                              ...prev,
                              pricing: {
                                ...prev.pricing,
                                bookingAmount: finalPrice,
                                advanceAmount: cabAdvanceRequired
                              }
                            }));
                            setWizardStep(4);
                          }}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <span>Next: Guest Details</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                          Select Special Options & Add-ons
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking') && (
                            <div>
                              <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Meal Plan Package</label>
                              <select
                                value={formData.propertyDetails?.mealPlan}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  propertyDetails: { ...prev.propertyDetails, mealPlan: e.target.value }
                                }))}
                                className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                              >
                                <option value="EP">EP - Room Only (European Plan)</option>
                                <option value="CP">CP - Breakfast Included (Continental Plan)</option>
                                <option value="MAP">MAP - Breakfast & Lunch/Dinner (Modified AP)</option>
                                <option value="AP">AP - All Meals Included (American Plan)</option>
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-455 uppercase block mb-1">Season Rate Class</label>
                            <select
                              value={formData.propertyDetails?.season}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                propertyDetails: { ...prev.propertyDetails, season: e.target.value }
                              }))}
                              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl text-xs font-bold text-slate-707"
                            >
                              <option value="Off Season">Off Season (Lowest rates)</option>
                              <option value="Mid Season">Mid Season (Medium rates)</option>
                              <option value="Peak Season">Peak Season (Premium rates)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                )}

                {/* STEP 4: PAYMENT & TOUR PREVIEW */}
                {wizardStep === 4 && (
                  formData.bookingType === 'Ride Booking' ? (
<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      {/* Cab Quotation Details Page */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setWizardStep(3)}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-205 bg-white flex items-center justify-center"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                              <h2 className="text-sm font-black text-slate-800">Cab Booking Quotation</h2>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-650 rounded-md text-[9px] font-black uppercase tracking-wider">Admin View</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Dashboard &gt; Bookings &gt; Create New Booking &gt; Quotation
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert('Quotation PDF generated and download triggered.')}
                          className="px-4.5 py-2.5 bg-blue-55 hover:bg-blue-105 border border-blue-205 text-blue-655 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Download Quotation</span>
                        </button>
                      </div>

                      {/* Top Row: Guest Details & Summary Metrics */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Guest Details */}
                        <div className="lg:col-span-8">
                          {/* Quotation ID & Guest Details sheet */}
                          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase tracking-widest">Quotation Identifier</span>
                                <h3 className="text-sm font-black text-rose-500 flex items-center gap-1.5 font-mono mt-0.5">
                                  QB2505200127
                                  <span className="text-slate-455 hover:text-slate-600 text-xs cursor-pointer flex items-center gap-1" onClick={() => {
                                    navigator.clipboard.writeText('QB2505200127');
                                    alert('Quotation ID copied!');
                                  }}>
                                    <Copy size={11} />
                                  </span>
                                </h3>
                              </div>
                              <div className="text-right">
                                <span className="block text-[8px] text-slate-455 uppercase tracking-widest">Created On</span>
                                <p className="text-[10px] font-extrabold text-slate-650 mt-0.5">20 May 2025, 11:30 AM</p>
                              </div>
                            </div>

                            <div className="space-y-3.5 text-xs font-bold text-slate-705">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 border-b border-slate-50 pb-2">
                                <User size={13} className="text-blue-650" />
                                <span>Guest Details</span>
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Name</span>
                                  <p className="text-slate-800">{formData.customer?.name || 'Rahul Sharma'}</p>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Number</span>
                                  <p className="text-slate-800">+91 {formData.customer?.mobile || '98765 43210'}</p>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">WhatsApp Number</span>
                                  <p className="text-slate-800">+91 {formData.customer?.whatsApp || formData.customer?.mobile || '98765 43210'}</p>
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Address</span>
                                  <p className="text-slate-800 leading-relaxed">{formData.customer?.address || '123, MG Road, Gangtok, Sikkim - 737101'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Summary Metrics */}
                        <div className="lg:col-span-4">
                          <div className="bg-white border border-slate-105 p-5 rounded-3xl shadow-sm space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Summary Metrics</h4>
                            <div className="space-y-4 text-xs font-bold text-slate-650">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">👥</div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">Total Heads</p>
                                  <p className="text-slate-800 font-black mt-0.5">{formData.guests?.total || 8} Guests</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">🚗</div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">Total Cars</p>
                                  <p className="text-slate-800 font-black mt-0.5">{cabNumberofCars} Cars</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-base shrink-0">📋</div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-extrabold uppercase">Booking Type</p>
                                  <p className="text-slate-800 font-black mt-0.5">Cab Booking</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Car Details table */}
                      {/* Car Details table */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-3">
                              <Car size={13} className="text-blue-655" />
                              <span>Car Details</span>
                            </h4>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-bold text-slate-707">
                                <thead>
                                  <tr className="border-b border-slate-150 text-slate-400 font-black text-[9px] uppercase tracking-wider bg-slate-50/50">
                                    <th className="py-2.5 px-4">Car No.</th>
                                    <th className="py-2.5 px-4">Car Type</th>
                                    <th className="py-2.5 px-4">Car Model</th>
                                    <th className="py-2.5 px-4">Included In Plan</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cabCarsList.slice(0, cabNumberofCars).map((car, idx) => (
                                    <tr key={idx} className="border-b border-slate-100">
                                      <td className="py-3.5 px-4 flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-black">🚗</span>
                                        {idx + 1}
                                      </td>
                                      <td className="py-3.5 px-4 text-slate-805">{car.type === 'Sedan (Swift Dzire/Etios)' ? 'Four Seater' : car.type === 'SUV (Innova/Crysta)' ? 'Four Seater' : car.type}</td>
                                      <td className="py-3.5 px-4 text-slate-500">{car.model === 'Toyota Innova' ? 'Toyota Innova Crysta' : car.model === 'Maruti Swift Dzire' ? 'Force Traveller 12 Seater' : car.model}</td>
                                      <td className="py-3.5 px-4">
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wider">Included</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                      {/* Day-wise itinerary details */}
                      {/* Day-wise itinerary details */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Compass size={13} className="text-blue-600" />
                                <span>Car Plan Itinerary (Full Plan)</span>
                              </h4>
                              <span className="text-[9px] text-blue-650 bg-blue-50 border border-blue-150 px-3 py-1 rounded-full uppercase tracking-wider font-black">Total Duration: 4 Nights / 5 Days</span>
                            </div>

                            <div className="relative border-l border-slate-150 pl-5.5 ml-3 space-y-7 pt-2">
                              {[
                                { day: 'Day 1', title: 'Bagdogra Airport to Gangtok Transfer', desc: 'Pickup from Bagdogra Airport and transfer to Gangtok hotel. Scenic route alongside Teesta river.', metric: '125 km | 4 hrs' },
                                { day: 'Day 2', title: 'Gangtok Full Day Local Sightseeing', desc: 'Visit Tsomgo Lake, Baba Mandir and local viewpoints in Gangtok. Permits will be handled by driver.', metric: '80 km | 8 hrs' },
                                { day: 'Day 3', title: 'Gangtok to Lachung Offbeat Transfer', desc: 'Transfer to Lachung. Stop at Butterfly Waterfall, Bhim Nala Falls and scenic points on the way.', metric: '120 km | 5 hrs' },
                                { day: 'Day 4', title: 'Lachung Sightseeing & Transfer to Pelling', desc: 'Explore Yumthang Valley (Valley of Flowers) and transfer to Pelling via Ravangla.', metric: '140 km | 6 hrs' },
                                { day: 'Day 5', title: 'Pelling to Bagdogra Drop Transfer', desc: 'Drop transfer back to Bagdogra Airport / NJP Railway Station for return journey.', metric: '115 km | 4 hrs' }
                              ].map((item, idx) => (
                                <div key={idx} className="relative">
                                  <span className="absolute -left-[30px] top-0 w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center font-sans text-[9px] font-black shadow-sm shadow-blue-100">
                                    {idx + 1}
                                  </span>
                                  <div className="space-y-1">
                                    <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-455 uppercase font-black tracking-wider">{item.day}</span>
                                    <h5 className="text-xs font-black text-slate-805 mt-1 leading-snug">{item.title}</h5>
                                    <p className="text-[10px] text-slate-455 font-bold leading-relaxed">{item.desc}</p>
                                    <span className="text-[9px] font-mono text-slate-500 font-bold bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md inline-block mt-1">{item.metric}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                      {/* Payment & Bank wire transfers section */}
                      {/* Payment & Bank wire transfers section */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Column 1: Payment details card */}
                            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[220px]">
                              <div className="space-y-3.5">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
                                  💳 Payment Details
                                </h5>
                                <div className="space-y-2 text-xs font-bold text-slate-655">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span>TOTAL AMOUNT (B2C)</span>
                                    <span className="font-mono text-slate-800">
                                      ₹ {(() => {
                                        const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                        return (cabB2BCost + margin)?.toLocaleString();
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-rose-500 font-extrabold bg-rose-55/40 p-2 rounded-xl border border-rose-100">
                                    <span>ADVANCE REQUIRED</span>
                                    <span className="font-mono text-sm font-black">₹ {cabAdvanceRequired?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span>REMAINING BALANCE</span>
                                    <span className="font-mono text-slate-800">
                                      ₹ {(() => {
                                        const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                        return (cabB2BCost + margin - cabAdvanceRequired)?.toLocaleString();
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[8px] text-slate-400 font-semibold leading-relaxed border-t border-slate-50 pt-3">
                                * inclusive of all permit fees, driver allowance, fuel charges & local tolls.
                              </p>
                            </div>

                            {/* Column 2: Bank details card */}
                            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3.5 min-h-[220px]">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
                                🏦 Bank Wire Details
                              </h5>
                              <div className="space-y-2 text-[10px] font-bold text-slate-700">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">BANK NAME</span>
                                  <span className="text-slate-855">HDFC Bank</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ACCOUNT HOLDER</span>
                                  <span className="text-slate-855">WOW GETAWAYS</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ACCOUNT NO.</span>
                                  <span className="text-slate-855 font-mono">50200012345678</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">IFSC CODE</span>
                                  <span className="text-slate-855 font-mono">HDFC0001234</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">BRANCH</span>
                                  <span className="text-slate-855">Gangtok, Sikkim</span>
                                </div>
                              </div>
                            </div>

                            {/* Column 3: UPI payments card */}
                            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3.5 min-h-[220px] flex flex-col justify-between">
                              <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
                                  📱 Scan UPI QR Code
                                </h5>
                                <div className="flex justify-between items-center pt-2 gap-3">
                                  <div className="text-[10px] font-bold text-slate-700 space-y-1">
                                    <span className="text-slate-400 block text-[8px]">UPI ID</span>
                                    <span className="text-slate-800 font-mono">wowgetaways@ybl</span>
                                    <span className="text-slate-400 block text-[8px] pt-1">OR MERCHANT NAME</span>
                                    <span className="text-slate-855">WOW GETAWAYS</span>
                                  </div>
                                  <div className="w-18 h-18 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=wowgetaways@ybl%26pn=WOW%20GETAWAYS%2520Sikkim%26am=5000.00%26cu=INR" alt="UPI QR" className="w-full h-full p-1" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                      {/* Direct click sharing actions */}
                      {/* Direct click sharing actions */}
                          <div className="bg-slate-50 border border-slate-150 p-5.5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🔗</span>
                              <div>
                                <h5 className="text-[10px] font-black text-slate-805 uppercase tracking-wider">Share Quotation</h5>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Share this cab quotation directly with your guest</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => alert('Quotation link sent to Gmail successfully.')}
                                className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                📧 Share via Gmail
                              </button>
                              <button
                                type="button"
                                onClick={() => alert('Quotation link sent to WhatsApp successfully.')}
                                className="flex-1 sm:flex-none px-4 py-2 border border-[#25d366] bg-[#25d366]/5 hover:bg-[#25d366]/10 text-[#25d366] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                💬 Share via WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(window.location.href);
                                  alert('Quotation link copied to clipboard.');
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 border border-blue-200 bg-blue-50/30 hover:bg-blue-50/60 text-blue-650 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                🔗 Copy Link
                              </button>
                            </div>
                          </div>

                      {/* Yellow alert warning note */}
                      {/* Yellow alert warning note */}
                          <div className="bg-yellow-50/50 border border-yellow-250 p-4.5 rounded-3xl text-xs font-bold text-yellow-808 flex gap-3 shadow-sm items-start">
                            <span className="text-base leading-none">⚠️</span>
                            <div>
                              <h6 className="font-black uppercase tracking-wider text-[10px] leading-none">Disclaimer & Important Notice</h6>
                              <p className="text-[10px] text-yellow-750 font-semibold mt-1.5 leading-relaxed">
                                This is only a quotation and not a confirmed booking. Room availability, car allocation and package rates are subject to change until the required advance payment is received. Remaining balance amount must be settled before the trip starts.
                              </p>
                            </div>
                          </div>

{/* Sticky Bottom Actions */}
                      <div className="flex justify-between items-center bg-white border border-slate-105 px-6 py-4.5 rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="px-5 py-2.5 border border-slate-205 hover:bg-slate-55 text-slate-707 font-bold rounded-xl text-xs transition-colors cursor-pointer bg-white"
                        >
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              alert('Quotation saved successfully.');
                              setWizardStep(6);
                            }}
                            className="px-5 py-2.5 border border-slate-205 hover:bg-slate-55 text-slate-707 font-bold rounded-xl text-xs transition-colors cursor-pointer bg-white"
                          >
                            Skip Driver Assignment
                          </button>
                          <button
                            type="button"
                            onClick={() => setWizardStep(5)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5 border-none"
                          >
                            <span>Assign Driver & Settle Booking</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>

                  ) : (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                          Pricing Summary
                        </h3>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Base Booking Amount *</label>
                              <input
                                type="number"
                                required
                                value={formData.pricing?.bookingAmount || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  pricing: { ...prev.pricing, bookingAmount: Number(e.target.value) || 0 }
                                }))}
                                className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
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
                                className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10px] font-extrabold text-slate-400">
                            <div>
                              Tax (12% Auto)
                              <span className="text-slate-850 font-bold block py-2.5 pl-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs mt-1">₹{formData.pricing?.tax}</span>
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
                                className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 mt-1 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Paid Amount *</label>
                              <input
                                type="number"
                                required
                                value={formData.pricing?.paidAmount || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  pricing: { ...prev.pricing, paidAmount: Number(e.target.value) || 0 }
                                }))}
                                className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
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
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-800">Final Calculated Price:</span>
                            <span className="text-lg font-black text-slate-900 font-mono">₹{formData.amount?.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold text-rose-500 font-mono">
                            <span>Pending Due:</span>
                            <span>₹{formData.pricing?.pendingAmount?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-3 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                          Payment Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Payment Method</label>
                            <select
                              value={formData.paymentDetails?.method}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                paymentDetails: { ...prev.paymentDetails, method: e.target.value }
                              }))}
                              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                            >
                              <option value="UPI">UPI / QR Transfer</option>
                              <option value="Card">Credit / Debit Card</option>
                              <option value="Bank Transfer">Bank Wire Transfer</option>
                              <option value="Cash">Cash payment</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Transaction reference ID</label>
                            <input
                              type="text"
                              value={formData.paymentDetails?.transactionId}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                paymentDetails: { ...prev.paymentDetails, transactionId: e.target.value }
                              }))}
                              placeholder="e.g. TXN1002345"
                              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-semibold text-slate-707 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Payment Received Date</label>
                            <input
                              type="date"
                              value={formData.paymentDetails?.paymentDate}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                paymentDetails: { ...prev.paymentDetails, paymentDate: e.target.value }
                              }))}
                              className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-semibold text-slate-707 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                )}

                {/* STEP 5: CONFIRMATION & WORKFLOW */}
                {wizardStep === 5 && (
                  formData.bookingType === 'Ride Booking' ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setWizardStep(4)}
                            className="p-2 hover:bg-slate-105 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-205 bg-white flex items-center justify-center"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <div>
                            <h2 className="text-base font-black text-slate-800">Assign Drivers / Settle Booking</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Dashboard &gt; Bookings &gt; Create New Cab Booking &gt; Settle
                            </p>
                          </div>
                        </div>
                        <span className="px-3.5 py-2 bg-blue-50 text-blue-650 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-150">
                          QUOTATION ID: QB2505200127
                        </span>
                      </div>

                      {/* Top Summary Bar */}
                      <div className="bg-white border border-slate-100 p-4.5 rounded-3xl shadow-sm grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs font-bold text-slate-705">
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase">Guest Name</span>
                          <span className="text-slate-800 font-extrabold block mt-0.5">{formData.customer?.name || 'Rahul Sharma'}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase">Total Guests</span>
                          <span className="text-slate-800 font-extrabold block mt-0.5">{formData.guests?.total || 8} People</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase">Total Cars</span>
                          <span className="text-slate-800 font-extrabold block mt-0.5">{cabNumberofCars} Vehicles</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase">Booking Type</span>
                          <span className="text-slate-800 font-extrabold block mt-0.5">Cab Booking</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase">Total (B2B)</span>
                          <span className="text-slate-800 font-extrabold block mt-0.5 font-mono">₹ {cabB2BCost?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 uppercase text-rose-500">Total (B2C)</span>
                          <span className="text-rose-500 font-black block mt-0.5 font-mono">
                            ₹ {(() => {
                              const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                              return (cabB2BCost + margin)?.toLocaleString();
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Main Form */}
                        <div className="lg:col-span-8 space-y-6">
                          {/* 1. Select Car Type */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
                              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                              1. Select Car Type
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div
                                onClick={() => setSelectedDriverCarType('Four Seater')}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                                  selectedDriverCarType === 'Four Seater' ? 'border-blue-600 bg-blue-50/10' : 'border-slate-205 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">🚗</span>
                                  <div>
                                    <span className="text-xs font-black block text-slate-800">Four Seater</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Swift Dzire / Toyota Innova</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-650 rounded text-[8px] font-black uppercase tracking-wider">1 Car Required</span>
                                </div>
                              </div>

                              <div
                                onClick={() => setSelectedDriverCarType('Twelve Seater')}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                                  selectedDriverCarType === 'Twelve Seater' ? 'border-blue-600 bg-blue-50/10' : 'border-slate-205 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">🚐</span>
                                  <div>
                                    <span className="text-xs font-black block text-slate-800">Twelve Seater</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Force Traveller</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-650 rounded text-[8px] font-black uppercase tracking-wider">1 Car Required</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Driver Scheduling */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                                2. Driver Scheduling & Working Days
                              </h3>
                              <span className="text-[9px] bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-black uppercase tracking-wider">Total Drivers: 2</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Driver 1 Calendar */}
                              <div className="border border-slate-200 p-4.5 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🗓️ Driver 1 Working Days</h4>
                                  <span className="text-[9px] text-blue-650 font-black uppercase">Active</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold">Select days for this driver.</p>
                                <div className="flex flex-wrap gap-2 pt-1.5">
                                  {[1, 2, 3, 4, 5].map(d => {
                                    const active = [1, 2, 3].includes(d);
                                    return (
                                      <div
                                        key={d}
                                        className={`w-9 h-9 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm ${
                                          active ? 'bg-blue-600 border-blue-655 text-white font-extrabold' : 'bg-slate-50 border-slate-200 text-slate-400 font-bold'
                                        }`}
                                      >
                                        <span className="text-[8px] font-black leading-none">D{d}</span>
                                        <span className="text-[8px] scale-90 mt-0.5 leading-none">May {19+d}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <span className="block text-[8px] text-blue-655 font-black uppercase tracking-wider pt-1.5">Selected Days: Day 1, Day 2, Day 3</span>
                              </div>

                              {/* Driver 2 Calendar */}
                              <div className="border border-slate-200 p-4.5 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🗓️ Driver 2 Working Days</h4>
                                  <span className="text-[9px] text-blue-650 font-black uppercase">Active</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold">Select days for this driver.</p>
                                <div className="flex flex-wrap gap-2 pt-1.5">
                                  {[1, 2, 3, 4, 5].map(d => {
                                    const active = [4, 5].includes(d);
                                    const disabled = [1, 2, 3].includes(d);
                                    return (
                                      <div
                                        key={d}
                                        className={`w-9 h-9 rounded-xl border flex flex-col items-center justify-center transition-all relative ${
                                          disabled ? 'bg-slate-100 border-slate-150 text-slate-355 cursor-not-allowed font-medium' :
                                          active ? 'bg-blue-600 border-blue-655 text-white font-extrabold cursor-pointer shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 font-bold cursor-pointer'
                                        }`}
                                      >
                                        {disabled && <Lock size={8} className="absolute top-1 right-1 text-slate-400" />}
                                        <span className="text-[8px] font-black leading-none">D{d}</span>
                                        <span className="text-[8px] scale-90 mt-0.5 leading-none">May {19+d}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <span className="block text-[8px] text-blue-655 font-black uppercase tracking-wider pt-1.5">Selected Days: Day 4, Day 5</span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Driver Details Tab */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
                              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                              3. Driver Profile Details
                            </h3>

                            {/* Driver Tab Selectors */}
                            <div className="flex border-b border-slate-100">
                              <button
                                type="button"
                                onClick={() => setActiveDriverTab(1)}
                                className={`px-5 py-2 font-black text-xs transition-colors border-b-2 -mb-px ${
                                  activeDriverTab === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                Driver 1 Details
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveDriverTab(2)}
                                className={`px-5 py-2 font-black text-xs transition-colors border-b-2 -mb-px ${
                                  activeDriverTab === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                Driver 2 Details
                              </button>
                            </div>

                            {/* Active Tab Form Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 pt-2 text-xs font-bold text-slate-700">
                              <div>
                                <label className="text-slate-555 block mb-1">Driver Name *</label>
                                <input
                                  type="text"
                                  value={cabDriversList[activeDriverTab - 1]?.name || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, name: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl font-bold text-slate-705 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-slate-555 block mb-1">Phone Number *</label>
                                <input
                                  type="text"
                                  value={cabDriversList[activeDriverTab - 1]?.phone || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, phone: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl font-semibold text-slate-705 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-slate-555 block mb-1">WhatsApp Number *</label>
                                <input
                                  type="text"
                                  value={cabDriversList[activeDriverTab - 1]?.whatsapp || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, whatsapp: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl font-semibold text-slate-705 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-slate-555 block mb-1">Email</label>
                                <input
                                  type="email"
                                  value={cabDriversList[activeDriverTab - 1]?.email || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, email: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-205 rounded-xl font-semibold text-slate-705 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-slate-400 block mb-1 uppercase text-[9px] font-black">Car Type *</label>
                                <select
                                  value={cabDriversList[activeDriverTab - 1]?.carType || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, carType: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                                >
                                  <option value="Four Seater">Four Seater</option>
                                  <option value="Twelve Seater">Twelve Seater</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-slate-400 block mb-1 uppercase text-[9px] font-black">Car Model *</label>
                                <select
                                  value={cabDriversList[activeDriverTab - 1]?.carModel || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, carModel: val } : d));
                                  }}
                                  className="w-full px-3.5 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                                >
                                  <option value="Toyota Innova Crysta">Toyota Innova Crysta</option>
                                  <option value="Maruti Swift Dzire">Maruti Swift Dzire</option>
                                  <option value="Force Traveller 12 Seater">Force Traveller 12 Seater</option>
                                </select>
                              </div>
                            </div>

                            {/* Drivers financials row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase">
                              <div>
                                <label className="block mb-1">Total Cost for Days</label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={cabDriversList[activeDriverTab - 1]?.totalCost || 0}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { 
                                        ...d, 
                                        totalCost: val,
                                        collectionFromGuest: val - d.advancePaid
                                      } : d));
                                    }}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-707 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block mb-1">Advance Paid</label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={cabDriversList[activeDriverTab - 1]?.advancePaid || 0}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { 
                                        ...d, 
                                        advancePaid: val,
                                        collectionFromGuest: d.totalCost - val
                                      } : d));
                                    }}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-707 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block mb-1">Collection from Guest</label>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                                  <input
                                    type="number"
                                    disabled
                                    value={cabDriversList[activeDriverTab - 1]?.collectionFromGuest || 0}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-105 border border-slate-200 rounded-xl text-xs font-black text-slate-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCabDriversList(prev => prev.map(d => d.id === activeDriverTab ? { ...d, saved: true } : d));
                                  alert(`Driver ${activeDriverTab} details saved successfully!`);
                                }}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-sm animate-none"
                              >
                                Save Driver {activeDriverTab} Details
                              </button>
                            </div>
                          </div>

                          {/* 4. Saved Drivers Overview */}
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
                              <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                              4. Saved Drivers Overview
                            </h3>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-bold text-slate-707 text-nowrap">
                                <thead>
                                  <tr className="border-b border-slate-150 text-slate-400 font-black text-[9px] uppercase tracking-wider bg-slate-50/50">
                                    <th className="py-2.5 px-4">Driver Details</th>
                                    <th className="py-2.5 px-4">Phone Number</th>
                                    <th className="py-2.5 px-4">Assigned Days</th>
                                    <th className="py-2.5 px-4">Car Type</th>
                                    <th className="py-2.5 px-4 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cabDriversList.map((driver) => (
                                    <tr key={driver.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                                      <td className="py-3 px-4 flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-[10px]">
                                          {driver.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                          <p className="font-extrabold text-slate-800 leading-snug">{driver.name}</p>
                                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{driver.carModel}</p>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-slate-500 font-semibold">{driver.phone}</td>
                                      <td className="py-3 px-4">
                                        <div className="flex gap-1">
                                          {driver.days.map(d => (
                                            <span key={d} className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[8px] text-blue-600 font-black">Day {d}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-500 border border-rose-100 rounded text-[9px] font-black uppercase tracking-wider">{driver.carType}</span>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex justify-center items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => alert(`Itinerary tracking link sent to ${driver.name} via WhatsApp.`)}
                                            className="p-1.5 text-[#25d366] hover:bg-emerald-50 border border-slate-105 bg-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center animate-none"
                                            title="Send Link via WhatsApp"
                                          >
                                            <Send size={11} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(`https://wowgetaways.com/track/trip/QB2505200127?driver=${driver.id}`);
                                              alert('Tracking link copied to clipboard!');
                                            }}
                                            className="p-1.5 text-blue-600 hover:bg-blue-55 border border-slate-105 bg-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center animate-none"
                                            title="Copy Link"
                                          >
                                            <Copy size={11} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCabDriversList(prev => prev.filter(d => d.id !== driver.id));
                                              alert('Driver assignment removed.');
                                            }}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-slate-105 bg-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center animate-none"
                                            title="Remove Driver"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Right Summary column */}
                        <div className="lg:col-span-4 space-y-6">
                          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 border-b border-slate-50 pb-2.5 flex items-center gap-2">
                              🔴 Settlement Summary
                            </h3>

                            <div className="space-y-4 text-xs font-bold text-slate-655">
                              {/* Driver status indicators */}
                              {cabDriversList.map(driver => (
                                <div key={driver.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                                  <div>
                                    <p className="font-extrabold text-slate-800">{driver.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Days: {driver.days.map(d => `Day ${d}`).join(', ')}</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-100">
                                    <CheckCircle size={10} />
                                    <span>SAVED</span>
                                  </span>
                                </div>
                              ))}

                              {/* Accounting details */}
                              <div className="border-t border-slate-100 pt-3.5 space-y-2">
                                <div className="flex justify-between">
                                  <span>Total B2B Amount</span>
                                  <span className="text-slate-800 font-mono font-extrabold">₹ {cabB2BCost?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total B2C Amount</span>
                                  <span className="text-slate-800 font-mono font-extrabold">
                                    ₹ {(() => {
                                      const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                      return (cabB2BCost + margin)?.toLocaleString();
                                    })()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-rose-500 font-extrabold bg-rose-50/40 p-2.5 rounded-xl border border-rose-100 text-[10px]">
                                  <span>REQUIRED ADVANCE PAYMENT</span>
                                  <span className="font-mono text-sm font-black">₹ {cabAdvanceRequired?.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="bg-blue-50/50 border border-blue-150 p-4.5 rounded-2xl flex gap-2.5 text-[10px] text-slate-600 font-bold">
                                <span className="text-base leading-none">ℹ️</span>
                                <p className="leading-relaxed mt-0.5">
                                  Clicking 'Done & Settle' will lock these assignments and generate the final trip vouchers.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sticky Bottom Actions */}
                      <div className="flex justify-between items-center bg-white border border-slate-100 px-6 py-4.5 rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        <button
                          type="button"
                          onClick={() => setWizardStep(4)}
                          className="px-5 py-2.5 border border-slate-205 hover:bg-slate-50 text-slate-707 font-bold rounded-xl text-xs transition-colors cursor-pointer bg-white"
                        >
                          Back
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Final Amount Payable (B2B):</span>
                          <span className="text-sm font-black font-mono text-slate-800 pr-3">₹ {cabB2BCost?.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              // Submit form and save drivers
                              e.preventDefault();
                              const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                              const finalPrice = cabB2BCost + margin;
                              
                              // Build finalized booking package
                              const payload = {
                                ...formData,
                                amount: finalPrice,
                                bookingStatus: 'Confirmed',
                                paymentStatus: 'Paid',
                                pricing: {
                                  ...formData.pricing,
                                  bookingAmount: finalPrice,
                                  paidAmount: cabAdvanceRequired,
                                  pendingAmount: finalPrice - cabAdvanceRequired,
                                  advanceAmount: cabAdvanceRequired
                                },
                                rideDetails: {
                                  ...formData.rideDetails,
                                  rideId: 'QB2505200127',
                                  driverName: cabDriversList[0]?.name || 'Amit Tamang',
                                  vehicle: cabDriversList[0]?.carModel || 'Toyota Innova Crysta',
                                  pickup: 'Bagdogra Airport',
                                  drop: 'Gangtok'
                                }
                              };

                              if (viewMode === 'add') {
                                createMutation.mutate(payload);
                              } else {
                                updateMutation.mutate({ id: selectedId, updatedData: payload });
                              }
                              // Complete wizard: go to Step 6 / Invoice
                              setWizardStep(6);
                            }}
                            className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm flex items-center gap-1.5 border-none"
                          >
                            <CheckCircle size={13} />
                            <span>Done & Settle Booking</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-805 border-b border-slate-50 pb-3 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
                          Review & Confirm Booking Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-650 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                          <div className="space-y-1.5">
                            <p className="font-extrabold text-[9px] text-slate-400 uppercase">Customer Profile</p>
                            <p className="font-bold text-slate-850 text-sm">{formData.customer?.name}</p>
                            <p>{formData.customer?.email}</p>
                            <p>Contact: {formData.customer?.mobile}</p>
                            <p>Address: {formData.customer?.address}</p>
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-extrabold text-[9px] text-slate-400 uppercase">Booking Specification</p>
                            <p className="font-bold text-slate-850">{formData.bookingType}</p>
                            <p>Guests Count: {formData.guests?.total} Pax</p>
                            <p>Check-in: {formData.checkInDate || 'Not selected'}</p>
                            <p>Check-out: {formData.checkOutDate || 'Not selected'}</p>
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-extrabold text-[9px] text-slate-400 uppercase">Allocation details</p>
                            {formData.bookingType === 'Homestay Booking' || formData.bookingType === 'Hotel Booking' ? (
                              <>
                                <p className="font-bold text-slate-800">{formData.propertyDetails?.propertyName || 'No property chosen'}</p>
                                <p>Room Class: {formData.propertyDetails?.roomCategory} (No: {formData.propertyDetails?.roomNumber || 'N/A'})</p>
                              </>
                            ) : formData.bookingType === 'Ride Booking' ? (
                              <>
                                <p className="font-bold text-slate-800">Pickup: {formData.rideDetails?.pickup} → Drop: {formData.rideDetails?.drop}</p>
                                <p>Driver: {formData.rideDetails?.driverName || 'Unassigned'} ({formData.rideDetails?.vehicle || 'N/A'})</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-slate-800">Package: {formData.sightseeingDetails?.packageName}</p>
                                <p>Guide Assigned: {formData.sightseeingDetails?.guideAssigned || 'N/A'} (Duration: {formData.sightseeingDetails?.duration})</p>
                              </>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-extrabold text-[9px] text-slate-400 uppercase">Transaction Sheet</p>
                            <p className="font-bold text-slate-855 text-sm">Total Cost: ₹{formData.amount?.toLocaleString()}</p>
                            <p className="text-emerald-600 font-bold">Paid: ₹{formData.pricing?.paidAmount?.toLocaleString()}</p>
                            <p className="text-rose-500 font-bold">Due Pending: ₹{formData.pricing?.pendingAmount?.toLocaleString()}</p>
                            <p>Method: {formData.paymentDetails?.method} (Txn: {formData.paymentDetails?.transactionId || 'None'})</p>
                          </div>
                        </div>
                      </div>

                      {/* Workflow status boxes */}
                      <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-slate-808 border-b border-slate-50 pb-3 flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                          Workflow Statuses
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">Booking Status</label>
                            <select
                              value={formData.bookingStatus}
                              onChange={(e) => setFormData(prev => ({ ...prev, bookingStatus: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
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
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-707 focus:outline-none"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Partial">Partial</option>
                              <option value="Paid">Paid</option>
                              <option value="Refunded">Refunded</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                )}

                {/* STEP 6: INVOICE */}
                {wizardStep === 6 && (
                  formData.bookingType === 'Ride Booking' ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      {/* Cab Invoice Header */}
                      <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
                        <div>
                          <h2 className="text-sm font-black text-slate-800">Invoice Overview</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Managing your booking transactions efficiently.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-4 py-2 border border-slate-200 text-slate-707 font-bold rounded-xl text-xs bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer animate-none"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer animate-none"
                          >
                            Save Invoice
                          </button>
                        </div>
                      </div>

                      {/* Main Invoice Card */}
                      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-6 space-y-6">
                        {/* Banner line */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">W</span>
                            <div>
                              <h3 className="text-xs font-black text-slate-800">WowGateways</h3>
                              <p className="text-[9px] text-slate-400 font-semibold">Your Gateway to Amazing Journeys</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-800">Invoice No. <span className="font-mono">INV-2505-0001</span></p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Invoice Date: 20 May 2025</p>
                          </div>
                        </div>

                        {/* Details Grid & Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-3.5 border-r border-slate-100 pr-6 text-xs font-bold text-slate-707">
                            <h4 className="text-[10px] font-black text-slate-455 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                              👤 Guest Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Phone Number</span>
                                <p className="text-slate-800">+91 {formData.customer?.mobile || '98765 43210'}</p>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Address</span>
                                <p className="text-slate-800 leading-relaxed">{formData.customer?.address || 'Upper Sichey Road, Near TV Tower, Gangtok, Sikkim - 737101, India'}</p>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">WhatsApp Number</span>
                                <p className="text-slate-800">+91 {formData.customer?.whatsApp || formData.customer?.mobile || '98765 43210'}</p>
                              </div>
                              <div>
                                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Booking Type</span>
                                <p className="text-slate-800">Cab Booking</p>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Email Address</span>
                                <p className="text-slate-800">{formData.customer?.email || 'rahul.sharma@gmail.com'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 justify-center">
                            <button
                              type="button"
                              onClick={() => alert('Sending tracking link...')}
                              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-sm flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <span>Share via App</span>
                              <span>➔</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Link copied to clipboard!');
                              }}
                              className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
                            >
                              <span>📋 Copy Link</span>
                            </button>
                          </div>
                        </div>

                        {/* Invoice Summary Table */}
                        <div className="border-t border-slate-100 pt-6 space-y-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            📊 Invoice Summary
                          </h4>

                          <div className="overflow-hidden border border-slate-200 rounded-2xl">
                            <table className="w-full text-left text-xs font-bold text-slate-707">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                  <th className="py-2.5 px-4.5">Description</th>
                                  <th className="py-2.5 px-4.5 text-right">Amount (₹)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150">
                                <tr className="hover:bg-slate-50/30 transition-colors">
                                  <td className="py-3 px-4.5 text-slate-800">Total Cost</td>
                                  <td className="py-3 px-4.5 text-right font-mono">
                                    ₹ {(() => {
                                      const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                      return (cabB2BCost + margin)?.toLocaleString();
                                    })()}.00
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-50/30 transition-colors text-slate-500">
                                  <td className="py-3 px-4.5">Tax &amp; Other Charges (GST 5%)</td>
                                  <td className="py-3 px-4.5 text-right font-mono">
                                    ₹ {(() => {
                                      const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                      const total = cabB2BCost + margin;
                                      return Math.round(total * 0.05)?.toLocaleString();
                                    })()}.00
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-50/30 transition-colors text-rose-505">
                                  <td className="py-3 px-4.5">Discount</td>
                                  <td className="py-3 px-4.5 text-right font-mono">- ₹ 1,000.00</td>
                                </tr>
                                <tr className="bg-blue-50/10 font-black text-slate-800">
                                  <td className="py-3.5 px-4.5 text-sm">Final Amount</td>
                                  <td className="py-3.5 px-4.5 text-right font-mono text-sm text-blue-650">
                                    ₹ {(() => {
                                      const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                      const total = cabB2BCost + margin;
                                      const gst = Math.round(total * 0.05);
                                      return (total + gst - 1000)?.toLocaleString();
                                    })()}.00
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-55/30 transition-colors text-slate-500">
                                  <td className="py-3 px-4.5">Advance Paid</td>
                                  <td className="py-3 px-4.5 text-right font-mono">₹ {cabAdvanceRequired?.toLocaleString()}.00</td>
                                </tr>
                                <tr className="bg-emerald-50/20 font-black text-emerald-800">
                                  <td className="py-3.5 px-4.5 text-xs">Balance Amount</td>
                                  <td className="py-3.5 px-4.5 text-right font-mono text-xs text-emerald-600">
                                    ₹ {(() => {
                                      const margin = cabMarginType === 'percent' ? Math.round(cabB2BCost * cabMarginValue / 100) : cabMarginValue;
                                      const total = cabB2BCost + margin;
                                      const gst = Math.round(total * 0.05);
                                      return (total + gst - 1000 - cabAdvanceRequired)?.toLocaleString();
                                    })()}.00
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Note block */}
                        <div className="border-t border-slate-100 pt-6 space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            📝 Note (Optional)
                          </h4>
                          <textarea
                            rows="2"
                            value={invoiceNotes}
                            onChange={(e) => setInvoiceNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-55 border border-slate-205 rounded-2xl text-xs font-semibold text-slate-705 focus:outline-none leading-relaxed"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : null
                )}

              </div>

              {/* Right Column: Summary & Property Highlights */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                
                {/* Booking Summary Card */}
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-10">
                    <Compass size={160} />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider mb-6 flex items-center justify-between">
                    <span>Booking Summary</span>
                    <Info size={15} className="opacity-60" />
                  </h4>
                  
                  <div className="space-y-3.5 relative z-10 text-xs">
                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-white/80" />
                        <span className="font-bold">Total Guests</span>
                      </div>
                      <span className="font-extrabold">{String(formData.guests?.total || 0).padStart(2, '0')} Pax</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <p className="text-[9px] uppercase opacity-70 font-black mb-0.5">Adults</p>
                        <p className="text-base font-black">{String(formData.guests?.adults || 0).padStart(2, '0')}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <p className="text-[9px] uppercase opacity-70 font-black mb-0.5">Children</p>
                        <p className="text-base font-black">{String(formData.guests?.children || 0).padStart(2, '0')}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Bed size={14} className="text-white/80" />
                        <span className="font-bold">Rooms Booked</span>
                      </div>
                      <span className="font-extrabold">{String(roomsList.length).padStart(2, '0')} Units</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-white/80" />
                        <span className="font-bold">Destinations</span>
                      </div>
                      <span className="font-extrabold truncate max-w-[120px] text-right">
                        {String(itineraryList.map(i => i.destination).filter(Boolean).length).padStart(2, '0')} Cities
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/20 mt-4.5 pt-4 text-center">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/70 uppercase tracking-widest">
                      <CheckCircle2 size={12} className="text-white/80" />
                      Draft saved automatically
                    </span>
                  </div>
                </div>

                {/* Property Highlights */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Highlights</h5>
                  
                  {formData.propertyDetails?.propertyId ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-lg">
                          🏡
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-850">{formData.propertyDetails?.propertyName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{formData.propertyDetails?.location}</p>
                          <p className="text-[10px] text-blue-600 font-bold mt-1">₹{formData.pricing?.bookingAmount?.toLocaleString()} Base Cost</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-455 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        "Selected standard rate package. Automatic 12% GST invoice will generate on final checkout receipt."
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs font-semibold text-slate-700">
                      <div className="flex gap-3 items-center">
                        <img 
                          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-50" 
                          src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=120"
                          alt="Luxury Mountain Villa"
                        />
                        <div>
                          <p className="font-extrabold text-slate-805 font-sans leading-none">Luxury Mountain Villa</p>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-1">4.8 ★ Premium Selection</p>
                          <p className="text-[10px] text-blue-600 font-black mt-1">₹12,500 / night</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-455 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                        "Perfect for large families, includes breakfast and guided trekking tours."
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Sticky Actions Footer */}
            {!(formData.bookingType === 'Ride Booking' && wizardStep >= 3) && (
              <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 bg-white border-t border-slate-150 px-6 py-4.5 flex items-center justify-between z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <Info size={14} className="text-slate-455" />
                  <span>Please ensure all mandatory fields (*) are filled before proceeding.</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep > 1) {
                        setWizardStep(prev => prev - 1);
                      } else {
                        if (window.confirm('Discard form entries and go back?')) {
                          setViewMode('list');
                          setSelectedId(null);
                        }
                      }
                    }}
                    className="px-5 py-2.5 bg-white border border-slate-205 text-slate-650 hover:bg-slate-50 font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    {wizardStep > 1 ? 'Back' : 'Cancel'}
                  </button>

                  {wizardStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep(wizardStep)) {
                          setWizardStep(prev => prev + 1);
                        }
                      }}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-blue-200 transition-colors border-none"
                    >
                      <span>Proceed to Next Step</span>
                      <ChevronRight size={13} className="stroke-[3.5]" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-100 transition-colors border-none"
                    >
                      <Check size={14} className="stroke-[3.5]" />
                      <span>{viewMode === 'add' ? 'Register Booking' : 'Modify Record'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </form>

        </motion.div>
      )}

      {/* 3. BOOKING DETAILS PROFILE VIEW */}
      {viewMode === 'details' && selectedId && bookingDetails && (
        bookingDetails.bookingType === 'Ride Booking' ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Cab Invoice Header */}
            <div className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 hover:bg-slate-105 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-150 flex items-center justify-center bg-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-sm font-black text-slate-800">Invoice Overview</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Managing your booking transactions efficiently.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-202 text-slate-707 font-bold rounded-xl text-xs bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                >
                  Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => alert('Voucher downloaded.')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer animate-none border-none"
                >
                  Download Invoice
                </button>
              </div>
            </div>

            {/* Main Invoice Card */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-6 space-y-6">
              {/* Banner line */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">W</span>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">WowGateways</h3>
                    <p className="text-[9px] text-slate-400 font-semibold">Your Gateway to Amazing Journeys</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-800">Invoice No. <span className="font-mono">INV-2505-0001</span></p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Invoice Date: 20 May 2025</p>
                </div>
              </div>

              {/* Details Grid & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3.5 border-r border-slate-100 pr-6 text-xs font-bold text-slate-707">
                  <h4 className="text-[10px] font-black text-slate-455 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    👤 Guest Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Phone Number</span>
                      <p className="text-slate-800">+91 {bookingDetails.customer?.mobile || '98765 43210'}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Address</span>
                      <p className="text-slate-800 leading-relaxed">{bookingDetails.customer?.address || 'Upper Sichey Road, Near TV Tower, Gangtok, Sikkim - 737101, India'}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">WhatsApp Number</span>
                      <p className="text-slate-800">+91 {bookingDetails.customer?.whatsApp || bookingDetails.customer?.mobile || '98765 43210'}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Booking Type</span>
                      <p className="text-slate-800">Cab Booking</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Guest Email Address</span>
                      <p className="text-slate-800">{bookingDetails.customer?.email || 'rahul.sharma@gmail.com'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => alert('Sending tracking link...')}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-sm flex items-center justify-between cursor-pointer transition-colors border-none"
                  >
                    <span>Share via App</span>
                    <span>➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-707 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
                  >
                    <span>📋 Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Invoice Summary Table */}
              <div className="border-t border-slate-100 pt-6 space-y-3.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  📊 Invoice Summary
                </h4>

                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs font-bold text-slate-707">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                        <th className="py-2.5 px-4.5">Description</th>
                        <th className="py-2.5 px-4.5 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-4.5 text-slate-800">Total Cost</td>
                        <td className="py-3 px-4.5 text-right font-mono">
                          ₹ {bookingDetails.pricing?.bookingAmount?.toLocaleString() || bookingDetails.amount?.toLocaleString()}.00
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/30 transition-colors text-slate-500">
                        <td className="py-3 px-4.5">Tax &amp; Other Charges (GST 5%)</td>
                        <td className="py-3 px-4.5 text-right font-mono">
                          ₹ {Math.round((bookingDetails.pricing?.bookingAmount || bookingDetails.amount || 0) * 0.05)?.toLocaleString()}.00
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/30 transition-colors text-rose-500">
                        <td className="py-3 px-4.5">Discount</td>
                        <td className="py-3 px-4.5 text-right font-mono">- ₹ 1,000.00</td>
                      </tr>
                      <tr className="bg-blue-50/10 font-black text-slate-800">
                        <td className="py-3.5 px-4.5 text-sm">Final Amount</td>
                        <td className="py-3.5 px-4.5 text-right font-mono text-sm text-blue-650">
                          ₹ {(() => {
                            const total = bookingDetails.pricing?.bookingAmount || bookingDetails.amount || 0;
                            const gst = Math.round(total * 0.05);
                            return (total + gst - 1000)?.toLocaleString();
                          })()}.00
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-55/30 transition-colors text-slate-500">
                        <td className="py-3 px-4.5">Advance Paid</td>
                        <td className="py-3 px-4.5 text-right font-mono">₹ {bookingDetails.pricing?.paidAmount?.toLocaleString() || bookingDetails.pricing?.advanceAmount?.toLocaleString() || '0'}.00</td>
                      </tr>
                      <tr className="bg-emerald-50/20 font-black text-emerald-800">
                        <td className="py-3.5 px-4.5 text-xs">Balance Amount</td>
                        <td className="py-3.5 px-4.5 text-right font-mono text-xs text-emerald-600">
                          ₹ {(() => {
                            const total = bookingDetails.pricing?.bookingAmount || bookingDetails.amount || 0;
                            const gst = Math.round(total * 0.05);
                            const adv = bookingDetails.pricing?.paidAmount || bookingDetails.pricing?.advanceAmount || 0;
                            return (total + gst - 1000 - adv)?.toLocaleString();
                          })()}.00
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Note block */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  📝 Note (Optional)
                </h4>
                <p className="text-xs font-bold text-slate-707 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                  {bookingDetails.pricing?.notes || invoiceNotes}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (

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

        )
      )}
    </div>
  );
}
