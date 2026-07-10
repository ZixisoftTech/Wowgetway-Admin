import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, required: true },
  bookingType: { 
    type: String, 
    enum: ['Homestay Booking', 'Hotel Booking', 'Ride Booking', 'Sightseeing Booking', 'Tour Package Booking'], 
    required: true 
  },
  bookingStatus: { 
    type: String, 
    enum: ['Confirmed', 'Pending', 'Upcoming', 'Checked In', 'Checked Out', 'Completed', 'Cancelled', 'No Show'], 
    default: 'Pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Pending', 'Refunded'], 
    default: 'Pending' 
  },
  amount: { type: Number, required: true },
  isRepeatCustomer: { type: Boolean, default: false },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  bookingDate: { type: Date, default: Date.now },
  bookingSource: { type: String, default: 'Direct Website' },

  customer: {
    customerId: { type: String, default: '' },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsApp: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    registrationDate: { type: Date, default: Date.now }
  },

  guests: {
    total: { type: Number, default: 1 },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 }
  },

  propertyDetails: {
    propertyId: { type: String, default: '' },
    propertyName: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    location: { type: String, default: '' },
    roomCategory: { type: String, default: '' },
    roomNumber: { type: String, default: '' },
    mealPlan: { type: String, default: '' },
    season: { type: String, default: '' }
  },

  rideDetails: {
    rideId: { type: String, default: '' },
    driverName: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    pickup: { type: String, default: '' },
    drop: { type: String, default: '' },
    travelDate: { type: Date, default: null }
  },

  sightseeingDetails: {
    packageName: { type: String, default: '' },
    destination: { type: String, default: '' },
    duration: { type: String, default: '' },
    guideAssigned: { type: String, default: '' }
  },

  timeline: [{
    activity: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'System' }
  }],

  pricing: {
    bookingAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    convenienceFee: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 }
  },

  paymentDetails: {
    method: { type: String, default: 'UPI' },
    transactionId: { type: String, default: '' },
    paymentDate: { type: Date, default: null },
    paymentStatus: { type: String, default: 'Pending' }
  },

  createdBy: { type: String, default: 'Super Admin' },
  updatedBy: { type: String, default: 'Super Admin' }
});

const EmployeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  aadharNo: {
    type: String,
    required: true
  },
  panNo: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  avatar: {
    type: String,
    default: ''
  },
  // Salary details
  monthlySalary: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    default: 0
  },
  hra: {
    type: Number,
    default: 0
  },
  da: {
    type: Number,
    default: 0
  },
  specialAllowance: {
    type: Number,
    default: 0
  },
  otherAllowance: {
    type: Number,
    default: 0
  },
  pfContribution: {
    type: Number,
    default: 0
  },
  esiContribution: {
    type: Number,
    default: 0
  },
  // Address details
  tempAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },
  permAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },
  // Bank details
  bank: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    upiId: { type: String, default: '' }
  },
  // Documents (URLs/filenames)
  documents: {
    aadharFront: { type: String, default: '' },
    aadharBack: { type: String, default: '' },
    panFront: { type: String, default: '' },
    panBack: { type: String, default: '' },
    drivingLicense: { type: String, default: '' },
    voterId: { type: String, default: '' },
    profilePhoto: { type: String, default: '' }
  },
  createdBy: {
    type: String,
    default: 'Rahul Sharma'
  },
  updatedBy: {
    type: String,
    default: 'Rahul Sharma'
  },
  bookingsCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  department: {
    type: String,
    default: 'Operations'
  },
  roleAssignedDate: {
    type: Date,
    default: Date.now
  },
  roleNotes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  permissions: [{
    module: { type: String, required: true },
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const HomestaySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Homestay', 'Hotel', 'Resort', 'Villa', 'Cottage'], required: true },
  ownerType: { type: String, default: 'Individual' },
  ownerName: { type: String, required: true },
  ownerMobile: { type: String, required: true },
  address: { type: String, default: '' },
  mapLink: { type: String, default: '' },
  region: { type: String, default: '' },
  city: { type: String, default: '' },
  description: { type: String, maxLength: 1000, default: '' },
  amenities: [{ type: String }],
  images: [{ type: String }],
  seasons: [{
    seasonName: { type: String, enum: ['Peak Season', 'Mid Season', 'Off Season'] },
    fromDate: { type: Date },
    toDate: { type: Date }
  }],
  rooms: [{
    roomType: { type: String, enum: ['Standard', 'Deluxe', 'Super Deluxe', 'Premium', 'Family Suite'] },
    totalRooms: { type: Number, default: 1 },
    extraPersonAllowed: { type: Number, default: 0 },
    roomNumbers: [{ type: String }],
    photos: [{ type: String }],
    description: { type: String, default: '' }
  }],
  roomStatuses: [{
    roomNumber: { type: String },
    status: { type: String, enum: ['Available', 'Occupied', 'Blocked', 'Maintenance'], default: 'Available' }
  }],
  rates: [{
    roomCategory: { type: String },
    occupancy: { type: String, enum: ['Double Occupancy', 'Triple Occupancy', 'Four Occupancy'] },
    season: { type: String, enum: ['Peak Season', 'Mid Season', 'Off Season'] },
    planRates: {
      AP: { b2bRate: Number, b2cRate: Number, b2bExtraPerson: Number, b2cExtraPerson: Number, b2bChild: Number, b2cChild: Number },
      MAP: { b2bRate: Number, b2cRate: Number, b2bExtraPerson: Number, b2cExtraPerson: Number, b2bChild: Number, b2cChild: Number },
      CP: { b2bRate: Number, b2cRate: Number, b2bExtraPerson: Number, b2cExtraPerson: Number, b2bChild: Number, b2cChild: Number },
      EP: { b2bRate: Number, b2cRate: Number, b2bExtraPerson: Number, b2cExtraPerson: Number, b2bChild: Number, b2cChild: Number }
    },
    createdBy: { type: String, default: 'Super Admin' },
    createdDate: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['Active', 'Inactive', 'Draft', 'Pending Approval', 'Blocked'], default: 'Draft' },
  bookings: { type: Number, default: 0 },
  occupancyRate: { type: Number, default: 0 },
  revenueGenerated: { type: Number, default: 0 },
  averageRating: { type: Number, default: 4.5 },
  createdAt: { type: Date, default: Date.now }
});

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'On Leave', 'Sick Leave', 'Work From Home', 'Late'],
    required: true
  },
  loginTime: {
    type: String,
    default: ''
  },
  logoutTime: {
    type: String,
    default: ''
  },
  workingHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one attendance record per employee per date
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const SalarySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  monthlySalary: {
    type: Number,
    required: true
  },
  basicSalary: {
    type: Number,
    default: 0
  },
  hra: {
    type: Number,
    default: 0
  },
  da: {
    type: Number,
    default: 0
  },
  specialAllowance: {
    type: Number,
    default: 0
  },
  otherAllowance: {
    type: Number,
    default: 0
  },
  // Deductions
  pfDeduction: {
    type: Number,
    default: 0
  },
  esiDeduction: {
    type: Number,
    default: 0
  },
  taxDeduction: {
    type: Number,
    default: 0
  },
  advanceDeduction: {
    type: Number,
    default: 0
  },
  penaltyDeduction: {
    type: Number,
    default: 0
  },
  otherDeduction: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  grossSalary: {
    type: Number,
    required: true
  },
  netSalary: {
    type: Number,
    required: true
  },
  // Payment Info
  paymentMode: {
    type: String,
    enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'],
    default: 'Bank Transfer'
  },
  transactionId: {
    type: String,
    default: ''
  },
  referenceNumber: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: Date,
    default: null
  },
  paymentTime: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid', 'Failed', 'Hold'],
    default: 'Pending'
  },
  updatedBy: {
    type: String,
    default: 'Rahul Sharma'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate salary entries for the same month & year per employee
SalarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const HomestayOwnerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  whatsApp: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  // KYC Documents
  aadharNo: {
    type: String,
    default: ''
  },
  panNo: {
    type: String,
    default: ''
  },
  voterId: {
    type: String,
    default: ''
  },
  tradeLicense: {
    type: String,
    default: ''
  },
  // Upload URLs
  aadharFront: {
    type: String,
    default: ''
  },
  aadharBack: {
    type: String,
    default: ''
  },
  panFront: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  tradeLicenseDoc: {
    type: String,
    default: ''
  },
  // Addresses
  tempAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },
  permAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },
  // Bank Details
  bankName: {
    type: String,
    default: ''
  },
  accountNumber: {
    type: String,
    default: ''
  },
  ifscCode: {
    type: String,
    default: ''
  },
  upiId: {
    type: String,
    default: ''
  },
  // Verification Badges
  status: {
    type: String,
    enum: ['Active', 'Pending Verification', 'Inactive', 'Deleted'],
    default: 'Pending Verification'
  },
  encryptedPasswordCopy: {
    type: String,
    default: ''
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: String,
    default: ''
  },
  aadharVerified: {
    type: Boolean,
    default: false
  },
  panVerified: {
    type: Boolean,
    default: false
  },
  bankVerified: {
    type: Boolean,
    default: false
  },
  // Property linking list
  properties: [{
    propertyName: { type: String, default: '' },
    location: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    bookings: { type: Number, default: 0 }
  }],
  createdBy: {
    type: String,
    default: 'Rahul Sharma'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginDate: {
    type: String,
    default: ''
  },
  lastLoginTime: {
    type: String,
    default: ''
  },
  lastLoginIp: {
    type: String,
    default: ''
  },
  resetPasswordOtp: {
    type: String,
    default: ''
  },
  resetPasswordOtpExpires: {
    type: Date,
    default: null
  }
});

const RideSchema = new mongoose.Schema({
  guest: {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: '' },
    photo: { type: String, default: '' },
    verificationStatus: { type: String, enum: ['Verified', 'Pending', 'Unverified'], default: 'Verified' }
  },
  driver: {
    name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    photo: { type: String, default: '' },
    rating: { type: Number, default: 5.0 },
    status: { type: String, enum: ['Active', 'On Ride', 'Offline', 'Inactive'], default: 'Active' }
  },
  vehicle: {
    vehicleNumber: { type: String, default: '' },
    vehicleType: { type: String, default: '' },
    model: { type: String, default: '' },
    image: { type: String, default: '' }
  },
  pickupAddress: { type: String, required: true },
  dropAddress: { type: String, required: true },
  distance: { type: Number, default: 0 },
  duration: { type: String, default: '' },
  eta: { type: String, default: '' },
  rideType: { type: String, enum: ['SUV', 'Sedan', 'Hatchback', 'Shared'], default: 'Sedan' },
  fareBreakdown: {
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    waitingCharges: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalFare: { type: Number, required: true }
  },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending' },
  paymentMode: { type: String, enum: ['UPI', 'Cash', 'Card', 'Wallet'], default: 'UPI' },
  transactionId: { type: String, default: '' },
  paymentDate: { type: Date, default: null },
  status: { type: String, enum: ['Ongoing', 'Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
  timeline: [{
    event: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    description: { type: String, default: '' }
  }],
  createdAt: { type: Date, default: Date.now }
});

const RiderSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fatherName: { type: String, default: '' },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsApp: { type: String, default: '' },
  dob: { type: Date, default: null },
  gender: { type: String, default: 'Male' },
  emergencyContact: { type: String, default: '' },
  
  // KYC Info
  aadharNo: { type: String, default: '' },
  panNo: { type: String, default: '' },
  drivingLicenseNo: { type: String, default: '' },
  licenseExpiryDate: { type: Date, default: null },
  
  // Vehicle Info
  vehicle: {
    vehicleType: { type: String, default: 'Sedan' },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    color: { type: String, default: '' },
    fuelType: { type: String, default: 'Petrol' },
    seatingCapacity: { type: Number, default: 4 }
  },

  // Document Verification
  documents: {
    profilePhoto: { type: String, default: '' },
    drivingLicense: { type: String, default: 'Verified' },
    rcBook: { type: String, default: 'Verified' },
    insurance: { type: String, default: 'Verified' },
    pollutionCertificate: { type: String, default: 'Verified' },
    aadharFront: { type: String, default: 'Verified' },
    aadharBack: { type: String, default: 'Verified' },
    panCard: { type: String, default: 'Verified' }
  },

  // Address
  tempAddress: {
    line1: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },
  permAddress: {
    line1: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },

  // Bank Info
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  upiId: { type: String, default: '' },

  // Metadata
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended', 'Pending Verification'], default: 'Active' },
  availability: { type: String, enum: ['Available', 'On Trip', 'Offline', 'Busy'], default: 'Available' },
  rating: { type: Number, default: 5.0 },
  joinedDate: { type: Date, default: Date.now },
  
  // Stats
  performance: {
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5.0 },
    completionRate: { type: Number, default: 100 },
    totalEarnings: { type: Number, default: 0 },
    monthlyEarnings: { type: Number, default: 0 }
  },

  // Ride History
  rideHistory: [{
    rideId: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    guest: { type: String, default: '' },
    pickup: { type: String, default: '' },
    drop: { type: String, default: '' },
    fare: { type: Number, default: 0 },
    status: { type: String, enum: ['Completed', 'Cancelled'], default: 'Completed' }
  }]
});

export const Booking = mongoose.model('Booking', BookingSchema);
export const Employee = mongoose.model('Employee', EmployeeSchema);
export const Role = mongoose.model('Role', RoleSchema);
export const Homestay = mongoose.model('Homestay', HomestaySchema);
export const Attendance = mongoose.model('Attendance', AttendanceSchema);
export const Salary = mongoose.model('Salary', SalarySchema);
export const HomestayOwner = mongoose.model('HomestayOwner', HomestayOwnerSchema);
export const Ride = mongoose.model('Ride', RideSchema);
export const Rider = mongoose.model('Rider', RiderSchema);

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  whatsApp: { type: String, default: '' },
  password: { type: String, default: '' },
  photo: { type: String, default: '' },
  
  // Address info
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pinCode: { type: String, default: '' }
  },

  // Account Settings & Type
  status: { type: String, enum: ['Active', 'Inactive', 'Blocked', 'Deleted'], default: 'Active' },
  userType: { type: String, enum: ['Regular User', 'Frequent Traveller', 'VIP User', 'Corporate User'], default: 'Regular User' },
  registrationDate: { type: Date, default: Date.now },
  
  // Spend & Booking metrics
  totalBookings: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  upcomingBookings: { type: Number, default: 0 },
  cancelledBookings: { type: Number, default: 0 },
  averageDailyUsage: { type: String, default: '0 mins / day' },

  // Activity logs
  activity: {
    recentLogins: [{ type: Date }],
    lastBooking: { type: Date, default: null },
    lastPayment: { type: Date, default: null },
    lastAppActivity: { type: Date, default: null }
  },

  // Booking history log
  bookings: [{
    bookingId: { type: String, required: true },
    bookingType: { type: String, enum: ['Homestay', 'Hotel', 'Ride', 'Sightseeing', 'Tour Package'], required: true },
    property: { type: String, default: '' },
    location: { type: String, default: '' },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['Completed', 'Upcoming', 'Rescheduled', 'Cancelled'], default: 'Completed' }
  }],

  // Payments History log
  payments: [{
    transactionId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'UPI' },
    status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' }
  }]
});

export const User = mongoose.model('User', UserSchema);

const TourPackageSchema = new mongoose.Schema({
  packageId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  destinations: [{ type: String }],
  coverPhoto: { type: String, default: '' },
  galleryPhotos: [{ type: String }],
  category: { type: String, default: 'Sightseeing' },
  region: { type: String, default: '' },
  tags: [{ type: String }],
  shortDescription: { type: String, default: '' },
  highlights: { type: String, default: '' },
  
  nightsCount: { type: Number, default: 0 },
  daysCount: { type: Number, default: 0 },
  mealPlan: { type: String, default: 'EP' },
  startDate: { type: Date, default: Date.now },
  pickupLocation: { type: String, default: '' },
  dropLocation: { type: String, default: '' },
  tourType: { type: String, default: 'Group' },
  isPrivate: { type: Boolean, default: false },

  itinerary: [{
    dayNumber: { type: Number, required: true },
    date: { type: Date, default: null },
    mealPlan: { type: String, default: '' },
    stayLocation: { type: String, default: '' },
    description: { type: String, default: '' },
    sightseeingPoints: [{
      name: { type: String, default: '' },
      description: { type: String, default: '' },
      image: { type: String, default: '' }
    }]
  }],

  vehicles: [{
    vehicleType: { type: String, default: '' },
    vehicleModel: { type: String, default: '' },
    b2bCost: { type: Number, default: 0 },
    b2cCost: { type: Number, default: 0 },
    availability: { type: String, enum: ['Available', 'Unavailable'], default: 'Available' }
  }],

  inclusions: [{ type: String }],
  exclusions: [{ type: String }],

  b2bPrice: { type: Number, default: 0 },
  b2cPrice: { type: Number, default: 0 },
  childPrice: { type: Number, default: 0 },
  extraPersonPrice: { type: Number, default: 0 },
  peakPrice: { type: Number, default: 0 },
  midPrice: { type: Number, default: 0 },
  offPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  offerPrice: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },

  bookings: { type: Number, default: 0 },
  completedTours: { type: Number, default: 0 },
  upcomingTours: { type: Number, default: 0 },
  cancelledTours: { type: Number, default: 0 },
  revenueGenerated: { type: Number, default: 0 },
  averageRating: { type: Number, default: 5.0 },
  status: { type: String, enum: ['Draft', 'Active', 'Inactive', 'Archived'], default: 'Active' },

  createdBy: { type: String, default: 'Super Admin' },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  remarks: { type: String, default: '' }
});

export const TourPackage = mongoose.model('TourPackage', TourPackageSchema);

const AdminSchema = new mongoose.Schema({
  name: { type: String, default: 'Super Admin' },
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'Super Admin' },
  status: { type: String, default: 'Active' },
  profilePhoto: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },
  lastLogin: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model('Admin', AdminSchema);

const PasswordResetSchema = new mongoose.Schema({
  adminId: { type: String, required: true }, // admin email or ID
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);

const SmtpSettingsSchema = new mongoose.Schema({
  host: { type: String, default: 'smtp.gmail.com' },
  port: { type: Number, default: 465 },
  email: { type: String, default: 'Chetanprajapat007@gmail.com' },
  appPassword: { type: String, default: 'rmbxpgfuiayhpyrg' },
  secure: { type: Boolean, default: true },
  senderName: { type: String, default: 'Wow Gateways Support' },
  enabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'System' }
});

export const SmtpSettings = mongoose.model('SmtpSettings', SmtpSettingsSchema);

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  expiry: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: 'Super Admin' },
  updatedBy: { type: String, default: 'Super Admin' }
});

export const Coupon = mongoose.model('Coupon', CouponSchema);

const ActivityLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true }, // e.g. CREATE, UPDATE, DELETE
  module: { type: String, required: true }, // e.g. Staff Management, Manage Bookings
  details: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
});

const StateCitySchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  cities: [CitySchema]
});

export const StateCity = mongoose.model('StateCity', StateCitySchema);

// Global Settings Module New Schemas
const NewStateSchema = new mongoose.Schema({
  stateName: { type: String, required: true, unique: true },
  stateImage: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  deletedReason: { type: String, default: '' }
}, { timestamps: true });

const NewCitySchema = new mongoose.Schema({
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'NewState', required: true },
  cityName: { type: String, required: true },
  cityImage: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  deletedReason: { type: String, default: '' }
}, { timestamps: true });

// Compound index for cityName unique within same state
NewCitySchema.index({ stateId: 1, cityName: 1 }, { unique: true });

const NewAmenitySchema = new mongoose.Schema({
  amenityName: { type: String, required: true, unique: true },
  amenityIcon: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  deletedReason: { type: String, default: '' }
}, { timestamps: true });

const NewRoomTypeSchema = new mongoose.Schema({
  roomTypeName: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  deleted: { type: Boolean, default: false },
  deletedBy: { type: String, default: null },
  deletedAt: { type: Date, default: null },
  deletedReason: { type: String, default: '' }
}, { timestamps: true });

export const NewState = mongoose.model('NewState', NewStateSchema, 'states');
export const NewCity = mongoose.model('NewCity', NewCitySchema, 'cities');
export const NewAmenity = mongoose.model('NewAmenity', NewAmenitySchema, 'amenities');
export const NewRoomType = mongoose.model('NewRoomType', NewRoomTypeSchema, 'roomTypes');

// --- NORMALIZED PROPERTY WIZARD SCHEMAS ---

const PropertySchema = new mongoose.Schema({
  propertyId: { type: String, required: true, unique: true }, // WG-PROP-000001
  name: { type: String, default: '' },
  type: { type: String, default: '' },
  category: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomestayOwner', required: true },
  ownerName: { type: String, default: '' },
  ownerMobile: { type: String, default: '' },
  ownerEmail: { type: String, default: '' },
  website: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  country: { type: String, default: 'India' },
  state: { type: String, default: '' },
  city: { type: String, default: '' },
  address: { type: String, default: '' },
  googleMapUrl: { type: String, default: '' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Draft', 'Submitted For Review', 'Changes Requested', 'Approved', 'Rejected', 'Published', 'Inactive', 'Deleted'], 
    default: 'Draft' 
  },
  currentStep: { type: Number, default: 1 },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  deletedReason: { type: String, default: '' }
}, { timestamps: true });

// Ensure unique property name per owner
PropertySchema.index({ ownerId: 1, name: 1 }, { unique: true });

const PropertyGallerySchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
  coverImage: { type: String, required: true },
  images: [{
    url: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['Lobby', 'Rooms', 'Restaurant', 'Reception', 'Bathroom', 'Balcony', 'Kitchen', 'Amenities', 'Garden', 'Parking', 'Swimming Pool', 'Conference Hall', 'Others'], 
      required: true 
    },
    order: { type: Number, default: 0 }
  }]
}, { timestamps: true });

const PropertyRoomsSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  roomCategoryName: { type: String, required: true },
  roomType: { type: String, required: true }, // from Global Settings NewRoomType
  numberOfRooms: { type: Number, required: true, min: 1 },
  roomNumbers: [{ type: String, required: true }],
  maxOccupancyAdults: { type: Number, required: true, min: 1 },
  maxOccupancyChildren: { type: Number, default: 0 },
  extraPersonAllowed: { type: Number, default: 0 },
  roomSize: { type: Number, required: true },
  bedType: { type: String, required: true },
  description: { type: String, default: '' },
  images: [{ type: String }],
  amenityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewAmenity' }]
}, { timestamps: true });

const PropertyAmenitiesSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
  amenityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewAmenity' }]
}, { timestamps: true });

const PropertySeasonSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  roomCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyRooms', required: true },
  seasons: {
    peak: [{ start: { type: Date }, end: { type: Date } }],
    mid: [{ start: { type: Date }, end: { type: Date } }],
    off: [{ start: { type: Date }, end: { type: Date } }]
  }
}, { timestamps: true });

const PropertyPricingSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  roomCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyRooms', required: true },
  seasonType: { type: String, enum: ['peak', 'mid', 'off'], required: true },
  mealPlan: { type: String, enum: ['EP', 'CP', 'MAP', 'AP'], required: true },
  b2bRate: { type: Number, required: true, min: 0 },
  b2cRate: { type: Number, required: true, min: 0 },
  extraAdultB2B: { type: Number, default: 0 },
  extraAdultB2C: { type: Number, default: 0 },
  childB2B: { type: Number, default: 0 },
  childB2C: { type: Number, default: 0 },
  taxInclusive: { type: Boolean, default: false },
  weekendPrice: { type: Number },
  festivalPrice: { type: Number }
}, { timestamps: true });

const PropertyApprovalSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  status: { type: String, enum: ['Pending Review', 'Approved', 'Changes Requested', 'Rejected'], default: 'Pending Review' },
  comments: [{
    step: { type: Number },
    field: { type: String },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  reviewedBy: { type: String },
  reviewedAt: { type: Date }
}, { timestamps: true });

const PropertyAuditLogSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  action: { type: String, required: true }, // CREATE, EDIT, PUBLISH, APPROVAL, REJECT, REQUEST_CHANGES
  user: { type: String, required: true },
  role: { type: String, required: true },
  ip: { type: String, default: '' },
  browser: { type: String, default: '' },
  previousValue: { type: String, default: '' },
  newValue: { type: String, default: '' }
}, { timestamps: true });

export const Property = mongoose.model('Property', PropertySchema, 'properties');
export const PropertyGallery = mongoose.model('PropertyGallery', PropertyGallerySchema, 'propertyGallery');
export const PropertyRooms = mongoose.model('PropertyRooms', PropertyRoomsSchema, 'propertyRooms');
export const PropertyAmenities = mongoose.model('PropertyAmenities', PropertyAmenitiesSchema, 'propertyAmenities');
export const PropertySeason = mongoose.model('PropertySeason', PropertySeasonSchema, 'propertySeason');
export const PropertyPricing = mongoose.model('PropertyPricing', PropertyPricingSchema, 'propertyPricing');
export const PropertyApproval = mongoose.model('PropertyApproval', PropertyApprovalSchema, 'propertyApproval');
export const PropertyAuditLog = mongoose.model('PropertyAuditLog', PropertyAuditLogSchema, 'propertyAuditLogs');





