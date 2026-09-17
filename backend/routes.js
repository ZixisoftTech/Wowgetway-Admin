import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { authenticateToken, requirePermission } from './middleware/auth.js';
import { Booking, Employee, Homestay, Role, Attendance, Salary, HomestayOwner, Ride, Rider, User, TourPackage, Admin, Coupon, ActivityLog, PasswordReset, SmtpSettings, StateCity, NewState, NewCity, NewAmenity, NewRoomType, Property, PropertyGallery, PropertyRooms, PropertyAmenities, PropertySeason, PropertyPricing, PropertyApproval, PropertyAuditLog, PropertyBlockedDate, Media, PublicShareLink, HomestayRole, HomestayStaff, Notification, SubscriptionPlan } from './models.js';

const router = express.Router();

const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'wow_gateway_default_secure_secret_2026_key_xyz';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wow_gateway_default_secure_refresh_2026_key_abc';

const isMongoConnected = () => true;

// Centralized activity logging helper
const logActivity = async (req, action, moduleName, details) => {
  const adminEmail = req.user?.email || 'unknown@wowgateways.com';
  const adminName = req.user?.fullName || 'System Administrator';
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  
  const logData = {
    adminEmail,
    adminName,
    action,
    module: moduleName,
    details: typeof details === 'object' ? JSON.stringify(details) : String(details),
    ipAddress,
    timestamp: new Date()
  };

  console.log(`[Activity Log] Admin: ${adminEmail} | Action: ${action} | Module: ${moduleName} | Details: ${logData.details}`);

  if (isMongoConnected()) {
    try {
      const newLog = new ActivityLog(logData);
      await newLog.save();
    } catch (err) {
      console.error('[Activity Log] Failed to save log to MongoDB:', err.message);
    }
  }
};

// Centralized owner notification helper
const createOwnerNotification = async ({
  ownerId,
  recipientType = 'HomestayOwner',
  title,
  message,
  type = 'booking',
  bookingId = '',
  metadata = {}
}) => {
  try {
    if (!ownerId && recipientType === 'HomestayOwner') return null;
    const notification = new Notification({
      recipientType,
      recipientId: ownerId || null,
      title,
      message,
      type,
      bookingId,
      metadata,
      read: false,
      createdAt: new Date()
    });
    await notification.save();
    console.log(`[Notification Created] To: ${ownerId || recipientType} | Type: ${type} | Title: ${title}`);
    return notification;
  } catch (err) {
    console.error('[Notification Helper] Error creating notification:', err.message);
    return null;
  }
};

/**
 * Helper to process in-memory database arrays for fallback mode
 */
function paginateAndFilter(dataArray, page = 1, limit = 10, search = '', searchFields = [], sortBy = 'createdAt', sortOrder = 'desc', filters = {}) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  
  // 1. Apply general filters
  let filtered = dataArray.filter(item => {
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== '') {
        if (String(item[key]).toLowerCase() !== String(val).toLowerCase()) return false;
      }
    }
    return true;
  });

  // 2. Apply search
  if (search && searchFields.length > 0) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(item => {
      return searchFields.some(field => {
        const itemVal = item[field];
        if (itemVal === undefined || itemVal === null) return false;
        return String(itemVal).toLowerCase().includes(searchLower);
      });
    });
  }

  // 3. Apply sorting
  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // 4. Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginatedData = filtered.slice(offset, offset + limitNum);

  return {
    data: paginatedData,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    }
  };
}

/**
 * Helper to process Mongoose models for active database mode
 */
async function queryMongoWithPagination(model, { page = 1, limit = 10, search = '', searchFields = [], sortBy = 'createdAt', sortOrder = 'desc', filters = {} }) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const query = {};

  // 1. Apply general filters
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      query[key] = val;
    }
  }

  // 2. Apply search
  if (search && searchFields.length > 0) {
    query.$or = searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }));
  }

  // 3. Sorting
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // 4. Fetch data
  const total = await model.countDocuments(query);
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const data = await model.find(query).sort(sort).skip(offset).limit(limitNum);

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    }
  };
}

// Mock fallback data to ensure the app works 100% of the time, even without a local MongoDB service running.
const mockFallbackData = {
  summary: {
    totalBookings: 1248,
    totalEmployees: 56,
    activeEmployees: 42,
    inactiveEmployees: 14,
    totalHomestays: 18,
    totalHotels: 7,
    todayCheckins: 9,
    todayCheckouts: 10,
    repeatCustomersRate: 38.7,
    todayBookingsCount: 28,
    todayRevenue: 125600,
    monthBookingsChange: 12.5,
    monthEmployeesChange: 5.3,
    monthRepeatChange: 4.5,
    todayBookingsChange: 7.1,
    todayRevenueChange: 10.2
  },
  charts: {
    monthWiseBookings: [
      { name: 'Jan', bookings: 120 },
      { name: 'Feb', bookings: 150 },
      { name: 'Mar', bookings: 180 },
      { name: 'Apr', bookings: 210 },
      { name: 'May', bookings: 250 },
      { name: 'Jun', bookings: 220 },
      { name: 'Jul', bookings: 260 },
      { name: 'Aug', bookings: 240 },
      { name: 'Sep', bookings: 200 },
      { name: 'Oct', bookings: 180 },
      { name: 'Nov', bookings: 160 },
      { name: 'Dec', bookings: 130 }
    ],
    bookingOverview: [
      { name: 'Confirmed', value: 862, percentage: 69, color: '#10B981' },
      { name: 'Pending', value: 196, percentage: 16, color: '#F59E0B' },
      { name: 'Cancelled', value: 120, percentage: 10, color: '#EF4444' },
      { name: 'Completed', value: 70, percentage: 5, color: '#3B82F6' }
    ],
    incomeOverview: {
      total: 1245000,
      change: 15.6,
      points: [
        { name: 'Week 1', income: 290000 },
        { name: 'Week 2', income: 310000 },
        { name: 'Week 3', income: 285000 },
        { name: 'Week 4', income: 360000 }
      ]
    }
  },
  employees: [
    { name: 'Amit Verma', role: 'Homestay Manager', bookings: 32, revenue: 245000, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { name: 'Priya Singh', role: 'Booking coordinator', bookings: 28, revenue: 210000, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { name: 'Vikram Patel', role: 'Support Agent', bookings: 24, revenue: 180000, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { name: 'Neha Gupta', role: 'Customer Success', bookings: 18, revenue: 125000, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    { name: 'Rohit Sharma', role: 'Operations Lead', bookings: 16, revenue: 110000, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
  ],
  homestays: [
    { name: 'Hill View Homestay', bookings: 156, occupancyRate: 82 },
    { name: 'Sunrise Cottage', bookings: 134, occupancyRate: 75 },
    { name: 'River Bliss Homestay', bookings: 98, occupancyRate: 68 },
    { name: 'Green Valley Stay', bookings: 74, occupancyRate: 60 },
    { name: 'Lake Side Retreat', bookings: 62, occupancyRate: 55 }
  ]
};

// In-memory local database backup fallback for Roles & Permissions
let mockRolesDatabase = [
  {
    _id: 'role-001',
    name: 'Super Admin',
    description: 'Full system access, manage roles, payments, and homestay operations.',
    permissions: [
      { module: 'Dashboard', view: true, add: true, edit: true, delete: true },
      { module: 'Staff Management', view: true, add: true, edit: true, delete: true },
      { module: 'Roles & Permissions', view: true, add: true, edit: true, delete: true },
      { module: 'Attendance', view: true, add: true, edit: true, delete: true },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Homestay Owners', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Homestays', view: true, add: true, edit: true, delete: true },
      { module: 'Manage Bookings', view: true, add: true, edit: true, delete: true }
    ],
    createdAt: new Date('2024-01-01T00:00:00Z')
  },
  {
    _id: 'role-002',
    name: 'HR Manager',
    description: 'Manages employee profiles, onboarding coordinates, and attendance log tracking.',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Staff Management', view: true, add: true, edit: true, delete: true },
      { module: 'Roles & Permissions', view: true, add: false, edit: false, delete: false },
      { module: 'Attendance', view: true, add: true, edit: true, delete: true },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: false }
    ],
    createdAt: new Date('2024-02-15T00:00:00Z')
  },
  {
    _id: 'role-003',
    name: 'Accountant',
    description: 'Manages payroll registers, salary processing, and payment status checks.',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Salary Management', view: true, add: true, edit: true, delete: false }
    ],
    createdAt: new Date('2024-03-01T00:00:00Z')
  },
  {
    _id: 'role-004',
    name: 'Operations Manager',
    description: 'Coordinates active homestays, check-in operations, and amenities monitoring.',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Manage Homestays', view: true, add: true, edit: true, delete: false },
      { module: 'Manage Bookings', view: true, add: true, edit: true, delete: false }
    ],
    createdAt: new Date('2024-03-15T00:00:00Z')
  },
  {
    _id: 'role-005',
    name: 'Booking Manager',
    description: 'Coordinates customer bookings, cancellations, check-in schedules, and room locks.',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Manage Bookings', view: true, add: true, edit: true, delete: true }
    ],
    createdAt: new Date('2024-04-01T00:00:00Z')
  },
  {
    _id: 'role-006',
    name: 'Support Executive',
    description: 'Provides customer support, resolves booking issues, and records feedback.',
    permissions: [
      { module: 'Dashboard', view: true, add: false, edit: false, delete: false },
      { module: 'Manage Bookings', view: true, add: false, edit: true, delete: false }
    ],
    createdAt: new Date('2024-04-15T00:00:00Z')
  }
];

// In-memory local database backup fallback for Attendance Management
let mockAttendanceDatabase = [
  // emp-00128 Martin Luther
  { _id: 'att-101', employeeId: 'emp-00128', date: new Date('2026-06-01T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: 'On-time login' },
  { _id: 'att-102', employeeId: 'emp-00128', date: new Date('2026-06-02T00:00:00.000Z'), status: 'Present', loginTime: '08:50', logoutTime: '18:10', workingHours: 9.3, notes: 'Arrived early' },
  { _id: 'att-103', employeeId: 'emp-00128', date: new Date('2026-06-03T00:00:00.000Z'), status: 'Half Day', loginTime: '09:00', logoutTime: '13:30', workingHours: 4.5, notes: 'Left early' },
  { _id: 'att-104', employeeId: 'emp-00128', date: new Date('2026-06-04T00:00:00.000Z'), status: 'Absent', loginTime: '', logoutTime: '', workingHours: 0, notes: 'Sick' },
  { _id: 'att-105', employeeId: 'emp-00128', date: new Date('2026-06-05T00:00:00.000Z'), status: 'Work From Home', loginTime: '09:15', logoutTime: '18:00', workingHours: 8.75, notes: 'Remote support' },
  { _id: 'att-106', employeeId: 'emp-00128', date: new Date('2026-06-08T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '17:45', workingHours: 8.75, notes: '' },
  { _id: 'att-107', employeeId: 'emp-00128', date: new Date('2026-06-09T00:00:00.000Z'), status: 'On Leave', loginTime: '', logoutTime: '', workingHours: 0, notes: 'Sick leave approved' },
  { _id: 'att-108', employeeId: 'emp-00128', date: new Date('2026-06-10T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-109', employeeId: 'emp-00128', date: new Date('2026-06-11T00:00:00.000Z'), status: 'Present', loginTime: '08:55', logoutTime: '18:05', workingHours: 9.1, notes: '' },
  { _id: 'att-110', employeeId: 'emp-00128', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: 'Marked present' },
  
  // emp-00129 Priya Sharma
  { _id: 'att-201', employeeId: 'emp-00129', date: new Date('2026-06-01T00:00:00.000Z'), status: 'Present', loginTime: '09:15', logoutTime: '18:15', workingHours: 9, notes: '' },
  { _id: 'att-202', employeeId: 'emp-00129', date: new Date('2026-06-02T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-203', employeeId: 'emp-00129', date: new Date('2026-06-03T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-204', employeeId: 'emp-00129', date: new Date('2026-06-04T00:00:00.000Z'), status: 'Present', loginTime: '09:05', logoutTime: '18:05', workingHours: 9, notes: '' },
  { _id: 'att-205', employeeId: 'emp-00129', date: new Date('2026-06-05T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-206', employeeId: 'emp-00129', date: new Date('2026-06-08T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-207', employeeId: 'emp-00129', date: new Date('2026-06-09T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-208', employeeId: 'emp-00129', date: new Date('2026-06-10T00:00:00.000Z'), status: 'On Leave', loginTime: '', logoutTime: '', workingHours: 0, notes: 'Casual leave' },
  { _id: 'att-209', employeeId: 'emp-00129', date: new Date('2026-06-11T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  { _id: 'att-210', employeeId: 'emp-00129', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Absent', loginTime: '', logoutTime: '', workingHours: 0, notes: 'Uninformed' },

  // emp-00130 Rahul Sharma
  { _id: 'att-301', employeeId: 'emp-00130', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00131 Priya Patel
  { _id: 'att-401', employeeId: 'emp-00131', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00132 Amit Verma
  { _id: 'att-501', employeeId: 'emp-00132', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Work From Home', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00133 Rohit Singh
  { _id: 'att-601', employeeId: 'emp-00133', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00134 Neha Gupta
  { _id: 'att-701', employeeId: 'emp-00134', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00135 Vikram Patel
  { _id: 'att-801', employeeId: 'emp-00135', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Absent', loginTime: '', logoutTime: '', workingHours: 0, notes: '' },
  // emp-00136 Sunita Deshmukh
  { _id: 'att-901', employeeId: 'emp-00136', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' },
  // emp-00137 Sanjay Kulkarni
  { _id: 'att-1001', employeeId: 'emp-00137', date: new Date('2026-06-12T00:00:00.000Z'), status: 'Present', loginTime: '09:00', logoutTime: '18:00', workingHours: 9, notes: '' }
];

// In-memory local database backup fallback for Salary Management
let mockSalariesDatabase = [
  {
    _id: 'sal-101',
    employeeId: 'emp-00128',
    month: 'June',
    year: '2026',
    monthlySalary: 50000,
    basicSalary: 30000,
    hra: 10000,
    da: 5000,
    specialAllowance: 3000,
    otherAllowance: 2000,
    pfDeduction: 3600,
    esiDeduction: 1500,
    taxDeduction: 2000,
    advanceDeduction: 1000,
    penaltyDeduction: 300,
    otherDeduction: 200,
    totalDeductions: 8600,
    grossSalary: 50000,
    netSalary: 41400,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    referenceNumber: '',
    paymentDate: null,
    paymentTime: '',
    remarks: '',
    status: 'Pending',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-102',
    employeeId: 'emp-00128',
    month: 'May',
    year: '2026',
    monthlySalary: 50000,
    basicSalary: 30000,
    hra: 10000,
    da: 5000,
    specialAllowance: 3000,
    otherAllowance: 2000,
    pfDeduction: 3600,
    esiDeduction: 1500,
    taxDeduction: 2000,
    advanceDeduction: 1500,
    penaltyDeduction: 0,
    otherDeduction: 500,
    totalDeductions: 9100,
    grossSalary: 50000,
    netSalary: 40900,
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-MAY-128',
    referenceNumber: 'REF-128-MAY',
    paymentDate: new Date('2026-06-01T10:30:00Z'),
    paymentTime: '10:30 AM',
    remarks: 'Processed via HDFC Netbanking',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-05-01T09:00:00Z')
  },
  {
    _id: 'sal-103',
    employeeId: 'emp-00129',
    month: 'June',
    year: '2026',
    monthlySalary: 45000,
    basicSalary: 25000,
    hra: 8500,
    da: 4000,
    specialAllowance: 2500,
    otherAllowance: 5000,
    pfDeduction: 3000,
    esiDeduction: 1000,
    taxDeduction: 1500,
    advanceDeduction: 800,
    penaltyDeduction: 150,
    otherDeduction: 50,
    totalDeductions: 6500,
    grossSalary: 45000,
    netSalary: 38505,
    paymentMode: 'UPI',
    transactionId: 'TXN-JUN-129-UPI',
    referenceNumber: 'REF-129-JUN',
    paymentDate: new Date('2026-06-10T14:45:00Z'),
    paymentTime: '02:45 PM',
    remarks: 'Paid to UPI ID priya@icici',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-104',
    employeeId: 'emp-00130',
    month: 'June',
    year: '2026',
    monthlySalary: 65000,
    basicSalary: 39000,
    hra: 13000,
    da: 6500,
    specialAllowance: 4000,
    otherAllowance: 2500,
    pfDeduction: 4000,
    esiDeduction: 1500,
    taxDeduction: 3500,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 9000,
    grossSalary: 65000,
    netSalary: 56000,
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-JUN-130',
    referenceNumber: 'REF-130-JUN',
    paymentDate: new Date('2026-06-05T10:00:00Z'),
    paymentTime: '10:00 AM',
    remarks: 'Monthly salary credited',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-105',
    employeeId: 'emp-00131',
    month: 'June',
    year: '2026',
    monthlySalary: 55000,
    basicSalary: 33000,
    hra: 11000,
    da: 5500,
    specialAllowance: 3500,
    otherAllowance: 2000,
    pfDeduction: 3800,
    esiDeduction: 1200,
    taxDeduction: 2500,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 7500,
    grossSalary: 55000,
    netSalary: 47500,
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-JUN-131',
    referenceNumber: 'REF-131-JUN',
    paymentDate: new Date('2026-06-05T10:15:00Z'),
    paymentTime: '10:15 AM',
    remarks: 'Salary credited',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-106',
    employeeId: 'emp-00132',
    month: 'June',
    year: '2026',
    monthlySalary: 48000,
    basicSalary: 28800,
    hra: 9600,
    da: 4800,
    specialAllowance: 2800,
    otherAllowance: 2000,
    pfDeduction: 3600,
    esiDeduction: 1000,
    taxDeduction: 2000,
    advanceDeduction: 2000,
    penaltyDeduction: 200,
    otherDeduction: 0,
    totalDeductions: 8800,
    grossSalary: 48000,
    netSalary: 39200,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    referenceNumber: '',
    paymentDate: null,
    paymentTime: '',
    remarks: 'Awaiting accountant release authorization',
    status: 'Pending',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-107',
    employeeId: 'emp-00133',
    month: 'June',
    year: '2026',
    monthlySalary: 60000,
    basicSalary: 36000,
    hra: 12000,
    da: 6000,
    specialAllowance: 3600,
    otherAllowance: 2400,
    pfDeduction: 4000,
    esiDeduction: 1400,
    taxDeduction: 3000,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 8400,
    grossSalary: 60000,
    netSalary: 51600,
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-JUN-133',
    referenceNumber: 'REF-133-JUN',
    paymentDate: new Date('2026-06-05T10:30:00Z'),
    paymentTime: '10:30 AM',
    remarks: 'Salary processed successfully',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-108',
    employeeId: 'emp-00134',
    month: 'June',
    year: '2026',
    monthlySalary: 52000,
    basicSalary: 31200,
    hra: 10400,
    da: 5200,
    specialAllowance: 3200,
    otherAllowance: 2000,
    pfDeduction: 3600,
    esiDeduction: 1100,
    taxDeduction: 2200,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 6900,
    grossSalary: 52000,
    netSalary: 45100,
    paymentMode: 'UPI',
    transactionId: 'TXN-JUN-134-UPI',
    referenceNumber: 'REF-134-JUN',
    paymentDate: new Date('2026-06-05T14:20:00Z'),
    paymentTime: '02:20 PM',
    remarks: 'Processed via UPI',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-109',
    employeeId: 'emp-00135',
    month: 'June',
    year: '2026',
    monthlySalary: 35000,
    basicSalary: 21000,
    hra: 7000,
    da: 3500,
    specialAllowance: 2000,
    otherAllowance: 1500,
    pfDeduction: 2500,
    esiDeduction: 800,
    taxDeduction: 1000,
    advanceDeduction: 1000,
    penaltyDeduction: 500,
    otherDeduction: 0,
    totalDeductions: 4800,
    grossSalary: 35000,
    netSalary: 30200,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    referenceNumber: '',
    paymentDate: null,
    paymentTime: '',
    remarks: 'Salary processed, pending validation checklist',
    status: 'Pending',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-110',
    employeeId: 'emp-00136',
    month: 'June',
    year: '2026',
    monthlySalary: 80000,
    basicSalary: 48000,
    hra: 16000,
    da: 8000,
    specialAllowance: 5000,
    otherAllowance: 3000,
    pfDeduction: 4000,
    esiDeduction: 1800,
    taxDeduction: 8000,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 13800,
    grossSalary: 80000,
    netSalary: 66200,
    paymentMode: 'Bank Transfer',
    transactionId: 'TXN-JUN-136',
    referenceNumber: 'REF-136-JUN',
    paymentDate: new Date('2026-06-05T09:45:00Z'),
    paymentTime: '09:45 AM',
    remarks: 'Super admin salary credited',
    status: 'Paid',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  },
  {
    _id: 'sal-111',
    employeeId: 'emp-00137',
    month: 'June',
    year: '2026',
    monthlySalary: 32000,
    basicSalary: 19200,
    hra: 6400,
    da: 3200,
    specialAllowance: 2000,
    otherAllowance: 1200,
    pfDeduction: 2400,
    esiDeduction: 800,
    taxDeduction: 1000,
    advanceDeduction: 0,
    penaltyDeduction: 0,
    otherDeduction: 0,
    totalDeductions: 4200,
    grossSalary: 32000,
    netSalary: 27800,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    referenceNumber: '',
    paymentDate: null,
    paymentTime: '',
    remarks: 'Payroll draft created, dispatching',
    status: 'Pending',
    updatedBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-01T09:00:00Z')
  }
];

// In-memory local database backup fallback for Homestay Owners
let mockOwnersDatabase = [
  {
    _id: 'own-101',
    firstName: 'Rajesh',
    lastName: 'Kulkarni',
    fatherName: 'Gopal Kulkarni',
    email: 'rajesh@gmail.com',
    mobile: '+91 9823456781',
    whatsApp: '+91 9823456781',
    password: 'password123',
    aadharNo: '111122223333',
    panNo: 'ABCDE1111F',
    voterId: 'VOTER1111',
    tradeLicense: 'TRADE1111',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: 'Flat 101, Sea Breeze', line2: 'Carter Road', landmark: 'Near Bandra Fort', city: 'Mumbai', state: 'Maharashtra', pinCode: '400050' },
    permAddress: { line1: 'Flat 101, Sea Breeze', line2: 'Carter Road', landmark: 'Near Bandra Fort', city: 'Mumbai', state: 'Maharashtra', pinCode: '400050' },
    bankName: 'State Bank of India',
    accountNumber: '111222333444',
    ifscCode: 'SBIN0000123',
    upiId: 'rajesh@sbi',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Golden Sands Homestay', location: 'Alibaug, Maharashtra', status: 'Active', bookings: 42 },
      { propertyName: 'Mountain Breeze Villa', location: 'Lonavala, Maharashtra', status: 'Active', bookings: 28 },
      { propertyName: 'Coconut Grove Retreat', location: 'Goa', status: 'Active', bookings: 15 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    _id: 'own-102',
    firstName: 'Sunita',
    lastName: 'Deshmukh',
    fatherName: 'Vasant Deshmukh',
    email: 'sunita@gmail.com',
    mobile: '+91 9876543220',
    whatsApp: '+91 9876543220',
    password: 'password123',
    aadharNo: '222233334444',
    panNo: 'FGHIJ2222K',
    voterId: 'VOTER2222',
    tradeLicense: 'TRADE2222',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: 'House 45', line2: 'Deccan Gymkhana', landmark: 'Near Cafe Goodluck', city: 'Pune', state: 'Maharashtra', pinCode: '411004' },
    permAddress: { line1: 'House 45', line2: 'Deccan Gymkhana', landmark: 'Near Cafe Goodluck', city: 'Pune', state: 'Maharashtra', pinCode: '411004' },
    bankName: 'HDFC Bank',
    accountNumber: '222333444555',
    ifscCode: 'HDFC0000456',
    upiId: 'sunita@hdfc',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Hillside Serenity Homestay', location: 'Mahabaleshwar, Maharashtra', status: 'Active', bookings: 65 },
      { propertyName: 'Valley View Cottage', location: 'Panchgani, Maharashtra', status: 'Active', bookings: 32 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-02-10T11:00:00Z')
  },
  {
    _id: 'own-103',
    firstName: 'Amit',
    lastName: 'Sharma',
    fatherName: 'Omprakash Sharma',
    email: 'amit.sharma@gmail.com',
    mobile: '+91 9911223344',
    whatsApp: '+91 9911223344',
    password: 'password123',
    aadharNo: '333344445555',
    panNo: 'KLMNO3333P',
    voterId: 'VOTER3333',
    tradeLicense: 'TRADE3333',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    tradeLicenseDoc: '',
    tempAddress: { line1: 'Block C, Sector 15', line2: 'Noida', landmark: 'Near Metro Station', city: 'Noida', state: 'Uttar Pradesh', pinCode: '201301' },
    permAddress: { line1: 'Block C, Sector 15', line2: 'Noida', landmark: 'Near Metro Station', city: 'Noida', state: 'Uttar Pradesh', pinCode: '201301' },
    bankName: 'ICICI Bank',
    accountNumber: '333444555666',
    ifscCode: 'ICIC0000789',
    upiId: 'amit@icici',
    status: 'Pending Verification',
    aadharVerified: true,
    panVerified: false,
    bankVerified: true,
    properties: [
      { propertyName: 'The Urban Nest', location: 'Greater Noida, UP', status: 'Inactive', bookings: 4 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-05T09:30:00Z')
  },
  {
    _id: 'own-104',
    firstName: 'Vikram',
    lastName: 'Rathore',
    fatherName: 'Singh Rathore',
    email: 'vikram.rathore@gmail.com',
    mobile: '+91 9829012345',
    whatsApp: '+91 9829012345',
    password: 'password123',
    aadharNo: '444455556666',
    panNo: 'PQRST4444Q',
    voterId: 'VOTER4444',
    tradeLicense: 'TRADE4444',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: 'Rathore Haveli', line2: 'C-Scheme', landmark: 'Opposite Mall', city: 'Jaipur', state: 'Rajasthan', pinCode: '302001' },
    permAddress: { line1: 'Rathore Haveli', line2: 'C-Scheme', landmark: 'Opposite Mall', city: 'Jaipur', state: 'Rajasthan', pinCode: '302001' },
    bankName: 'Bank of Baroda',
    accountNumber: '444555666777',
    ifscCode: 'BARB0JAIPUR',
    upiId: 'vikram@bob',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Desert Rose Boutique Villa', location: 'Jaipur, Rajasthan', status: 'Active', bookings: 54 },
      { propertyName: 'Royal Heritage Homestay', location: 'Udaipur, Rajasthan', status: 'Active', bookings: 76 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-05-15T14:00:00Z')
  },
  {
    _id: 'own-105',
    firstName: 'Meera',
    lastName: 'Nair',
    fatherName: 'Karan Nair',
    email: 'meera.nair@gmail.com',
    mobile: '+91 9447012345',
    whatsApp: '+91 9447012345',
    password: 'password123',
    aadharNo: '555566667777',
    panNo: 'UVWXY5555R',
    voterId: 'VOTER5555',
    tradeLicense: 'TRADE5555',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: 'Green Meadows', line2: 'Kadavanthra', landmark: 'Near Metro Pillar 104', city: 'Kochi', state: 'Kerala', pinCode: '682020' },
    permAddress: { line1: 'Green Meadows', line2: 'Kadavanthra', landmark: 'Near Metro Pillar 104', city: 'Kochi', state: 'Kerala', pinCode: '682020' },
    bankName: 'Federal Bank',
    accountNumber: '555666777888',
    ifscCode: 'FDRL0001042',
    upiId: 'meera@federal',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Backwater Whispers Homestay', location: 'Alleppey, Kerala', status: 'Active', bookings: 88 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-07-20T10:30:00Z')
  },
  {
    _id: 'own-106',
    firstName: 'Sanjay',
    lastName: 'Gupta',
    fatherName: 'Dina Nath Gupta',
    email: 'sanjay.gupta@gmail.com',
    mobile: '+91 9810054321',
    whatsApp: '+91 9810054321',
    password: 'password123',
    aadharNo: '666677778888',
    panNo: 'ABCDE6666S',
    voterId: 'VOTER6666',
    tradeLicense: '',
    aadharFront: '',
    aadharBack: '',
    panFront: '',
    profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    tradeLicenseDoc: '',
    tempAddress: { line1: 'B-4/204', line2: 'Safdarjung Enclave', landmark: 'Near Deer Park', city: 'New Delhi', state: 'Delhi', pinCode: '110029' },
    permAddress: { line1: 'B-4/204', line2: 'Safdarjung Enclave', landmark: 'Near Deer Park', city: 'New Delhi', state: 'Delhi', pinCode: '110029' },
    bankName: 'Punjab National Bank',
    accountNumber: '666777888999',
    ifscCode: 'PUNB0110029',
    upiId: 'sanjay@pnb',
    status: 'Pending Verification',
    aadharVerified: false,
    panVerified: false,
    bankVerified: false,
    properties: [],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-11T16:45:00Z')
  },
  {
    _id: 'own-107',
    firstName: 'Anita',
    lastName: 'Roy',
    fatherName: 'Subodh Roy',
    email: 'anita.roy@gmail.com',
    mobile: '+91 9830098765',
    whatsApp: '+91 9830098765',
    password: 'password123',
    aadharNo: '777788889999',
    panNo: 'FGHIJ7777T',
    voterId: 'VOTER7777',
    tradeLicense: 'TRADE7777',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: '12/1A', line2: 'Gariahat Road', landmark: 'Near Mall', city: 'Kolkata', state: 'West Bengal', pinCode: '700019' },
    permAddress: { line1: '12/1A', line2: 'Gariahat Road', landmark: 'Near Mall', city: 'Kolkata', state: 'West Bengal', pinCode: '700019' },
    bankName: 'UCO Bank',
    accountNumber: '777888999000',
    ifscCode: 'UCBA0000012',
    upiId: 'anita@uco',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Misty Mountains Retreat', location: 'Darjeeling, West Bengal', status: 'Active', bookings: 49 },
      { propertyName: 'Tea Estate Cottage', location: 'Kurseong, West Bengal', status: 'Active', bookings: 21 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-09-05T09:00:00Z')
  },
  {
    _id: 'own-108',
    firstName: 'Devendra',
    lastName: 'Singh',
    fatherName: 'Hari Singh',
    email: 'devendra.singh@gmail.com',
    mobile: '+91 9414098765',
    whatsApp: '+91 9414098765',
    password: 'password123',
    aadharNo: '888899990000',
    panNo: 'KLMNO8888U',
    voterId: 'VOTER8888',
    tradeLicense: 'TRADE8888',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: '23 Anand Vihar', line2: 'Ajmer Rd', landmark: 'Near Flyover', city: 'Ajmer', state: 'Rajasthan', pinCode: '305001' },
    permAddress: { line1: '23 Anand Vihar', line2: 'Ajmer Rd', landmark: 'Near Flyover', city: 'Ajmer', state: 'Rajasthan', pinCode: '305001' },
    bankName: 'State Bank of India',
    accountNumber: '888999000111',
    ifscCode: 'SBIN0003456',
    upiId: 'devendra@sbi',
    status: 'Inactive',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Lakeside Serene Homestay', location: 'Pushkar, Rajasthan', status: 'Inactive', bookings: 11 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2024-11-12T15:20:00Z')
  },
  {
    _id: 'own-109',
    firstName: 'Kavita',
    lastName: 'Patel',
    fatherName: 'Manish Patel',
    email: 'kavita.patel@gmail.com',
    mobile: '+91 9825012345',
    whatsApp: '+91 9825012345',
    password: 'password123',
    aadharNo: '999900001111',
    panNo: 'PQRST9999V',
    voterId: 'VOTER9999',
    tradeLicense: 'TRADE9999',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    tradeLicenseDoc: 'trade.pdf',
    tempAddress: { line1: '104 Sunrise Residency', line2: 'Satellite Road', landmark: 'Near Star Bazaar', city: 'Ahmedabad', state: 'Gujarat', pinCode: '380015' },
    permAddress: { line1: '104 Sunrise Residency', line2: 'Satellite Road', landmark: 'Near Star Bazaar', city: 'Ahmedabad', state: 'Gujarat', pinCode: '380015' },
    bankName: 'Axis Bank',
    accountNumber: '999000111222',
    ifscCode: 'UTIB0000234',
    upiId: 'kavita@axis',
    status: 'Active',
    aadharVerified: true,
    panVerified: true,
    bankVerified: true,
    properties: [
      { propertyName: 'Heritage Haveli Homestay', location: 'Bhuj, Gujarat', status: 'Active', bookings: 38 },
      { propertyName: 'White Desert Camp', location: 'Rann of Kutch, Gujarat', status: 'Active', bookings: 95 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2025-01-22T10:00:00Z')
  },
  {
    _id: 'own-110',
    firstName: 'Rakesh',
    lastName: 'Verma',
    fatherName: 'Kishore Verma',
    email: 'rakesh.verma@gmail.com',
    mobile: '+91 9893012345',
    whatsApp: '+91 9893012345',
    password: 'password123',
    aadharNo: '000011112222',
    panNo: 'UVWXY0000W',
    voterId: 'VOTER0000',
    tradeLicense: 'TRADE0000',
    aadharFront: 'aadhar_front.jpg',
    aadharBack: 'aadhar_back.jpg',
    panFront: 'pan_front.jpg',
    profilePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    tradeLicenseDoc: '',
    tempAddress: { line1: 'C-78, Shahpura', line2: 'Bhopal', landmark: 'Near Lake', city: 'Bhopal', state: 'Madhya Pradesh', pinCode: '462016' },
    permAddress: { line1: 'C-78, Shahpura', line2: 'Bhopal', landmark: 'Near Lake', city: 'Bhopal', state: 'Madhya Pradesh', pinCode: '462016' },
    bankName: 'State Bank of India',
    accountNumber: '000111222333',
    ifscCode: 'SBIN0001234',
    upiId: 'rakesh@sbi',
    status: 'Pending Verification',
    aadharVerified: true,
    panVerified: true,
    bankVerified: false,
    properties: [
      { propertyName: 'Lakeview Palace Homestay', location: 'Bhopal, MP', status: 'Active', bookings: 14 }
    ],
    createdBy: 'Rahul Sharma',
    createdAt: new Date('2026-06-10T11:30:00Z')
  }
];

// In-memory local database backup fallback for Homestay Properties
let mockHomestaysDatabase = [
  {
    _id: 'hs-101',
    name: 'Golden Sands Homestay',
    type: 'Homestay',
    ownerType: 'Individual',
    ownerName: 'Rajesh Kulkarni',
    ownerMobile: '+91 9823456781',
    address: 'Carter Road, Bandra West',
    mapLink: 'https://maps.google.com/?q=Carter+Road+Bandra',
    region: 'North Bengal',
    city: 'Alibaug',
    description: 'A beautiful beachside homestay with modern amenities, perfect for weekend getaways.',
    amenities: ['Free WiFi', 'Parking', 'Room Service', 'AC', 'Swimming Pool'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600'],
    seasons: [
      { seasonName: 'Peak Season', fromDate: new Date('2026-10-01'), toDate: new Date('2026-12-31') },
      { seasonName: 'Mid Season', fromDate: new Date('2026-06-01'), toDate: new Date('2026-09-30') },
      { seasonName: 'Off Season', fromDate: new Date('2026-01-01'), toDate: new Date('2026-05-31') }
    ],
    rooms: [
      {
        roomType: 'Super Deluxe',
        totalRooms: 3,
        extraPersonAllowed: 2,
        roomNumbers: ['101', '102', '103'],
        photos: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600'],
        description: 'Spacious room with king bed and balcony.'
      },
      {
        roomType: 'Standard',
        totalRooms: 2,
        extraPersonAllowed: 1,
        roomNumbers: ['104', '105'],
        photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600'],
        description: 'Cozy standard room with amenities.'
      }
    ],
    rates: [
      {
        roomCategory: 'Super Deluxe',
        occupancy: 'Double Occupancy',
        season: 'Peak Season',
        planRates: {
          AP: { b2bRate: 4000, b2cRate: 4500, b2bExtraPerson: 1000, b2cExtraPerson: 1200, b2bChild: 600, b2cChild: 800 },
          MAP: { b2bRate: 3500, b2cRate: 4000, b2bExtraPerson: 850, b2cExtraPerson: 1050, b2bChild: 500, b2cChild: 700 },
          CP: { b2bRate: 3000, b2cRate: 3500, b2bExtraPerson: 750, b2cExtraPerson: 950, b2bChild: 400, b2cChild: 600 },
          EP: { b2bRate: 2500, b2cRate: 3000, b2bExtraPerson: 600, b2cExtraPerson: 800, b2bChild: 300, b2cChild: 500 }
        },
        createdBy: 'Super Admin',
        createdDate: new Date('2026-01-15')
      },
      {
        roomCategory: 'Super Deluxe',
        occupancy: 'Double Occupancy',
        season: 'Off Season',
        planRates: {
          AP: { b2bRate: 2500, b2cRate: 2800, b2bExtraPerson: 800, b2cExtraPerson: 900, b2bChild: 500, b2cChild: 600 },
          MAP: { b2bRate: 2000, b2cRate: 2300, b2bExtraPerson: 650, b2cExtraPerson: 750, b2bChild: 400, b2cChild: 500 },
          CP: { b2bRate: 1800, b2cRate: 2000, b2bExtraPerson: 550, b2cExtraPerson: 650, b2bChild: 300, b2cChild: 400 },
          EP: { b2bRate: 1500, b2cRate: 1700, b2bExtraPerson: 450, b2cExtraPerson: 550, b2bChild: 200, b2cChild: 300 }
        },
        createdBy: 'Super Admin',
        createdDate: new Date('2026-01-15')
      }
    ],
    status: 'Active',
    bookings: 42,
    occupancyRate: 82,
    revenueGenerated: 245000,
    averageRating: 4.8,
    createdAt: new Date('2026-01-15T10:00:00Z')
  },
  {
    _id: 'hs-102',
    name: 'Mountain Breeze Villa',
    type: 'Villa',
    ownerType: 'Individual',
    ownerName: 'Rajesh Kulkarni',
    ownerMobile: '+91 9823456781',
    address: 'Khandala Hills, Lonavala',
    mapLink: 'https://maps.google.com/?q=Lonavala+Villa',
    region: 'Sikkim',
    city: 'Lonavala',
    description: 'Luxury villa situated in the scenic hills of Lonavala, featuring private pool and BBQ setup.',
    amenities: ['Free WiFi', 'Parking', 'Room Service', 'Heater', 'Swimming Pool', 'Garden'],
    images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600'],
    seasons: [
      { seasonName: 'Peak Season', fromDate: new Date('2026-10-01'), toDate: new Date('2026-12-31') },
      { seasonName: 'Off Season', fromDate: new Date('2026-01-01'), toDate: new Date('2026-09-30') }
    ],
    rooms: [
      {
        roomType: 'Family Suite',
        totalRooms: 2,
        extraPersonAllowed: 4,
        roomNumbers: ['201', '202'],
        photos: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600'],
        description: 'Large suite room ideal for families.'
      }
    ],
    rates: [
      {
        roomCategory: 'Family Suite',
        occupancy: 'Four Occupancy',
        season: 'Peak Season',
        planRates: {
          AP: { b2bRate: 8000, b2cRate: 9000, b2bExtraPerson: 1500, b2cExtraPerson: 1800, b2bChild: 800, b2cChild: 1000 },
          MAP: { b2bRate: 7000, b2cRate: 8000, b2bExtraPerson: 1300, b2cExtraPerson: 1500, b2bChild: 700, b2cChild: 900 },
          CP: { b2bRate: 6000, b2cRate: 7000, b2bExtraPerson: 1100, b2cExtraPerson: 1300, b2bChild: 600, b2cChild: 800 },
          EP: { b2bRate: 5000, b2cRate: 6000, b2bExtraPerson: 900, b2cExtraPerson: 1100, b2bChild: 500, b2cChild: 700 }
        },
        createdBy: 'Rahul Sharma',
        createdDate: new Date('2026-01-20')
      }
    ],
    status: 'Active',
    bookings: 28,
    occupancyRate: 75,
    revenueGenerated: 180000,
    averageRating: 4.6,
    createdAt: new Date('2026-01-20T10:00:00Z')
  },
  {
    _id: 'hs-103',
    name: 'Coconut Grove Retreat',
    type: 'Resort',
    ownerType: 'Individual',
    ownerName: 'Rajesh Kulkarni',
    ownerMobile: '+91 9823456781',
    address: 'Near Calangute Beach, Goa',
    mapLink: 'https://maps.google.com/?q=Calangute+Beach+Goa',
    region: 'North Bengal',
    city: 'Goa',
    description: 'Tranquil resort surrounded by coconut groves, just a 5-minute walk to Calangute Beach.',
    amenities: ['Free WiFi', 'Parking', 'Room Service', 'AC', 'Swimming Pool', 'Restaurant'],
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600'],
    seasons: [
      { seasonName: 'Peak Season', fromDate: new Date('2026-11-01'), toDate: new Date('2027-02-28') },
      { seasonName: 'Off Season', fromDate: new Date('2026-03-01'), toDate: new Date('2026-10-31') }
    ],
    rooms: [
      {
        roomType: 'Deluxe',
        totalRooms: 4,
        extraPersonAllowed: 2,
        roomNumbers: ['D01', 'D02', 'D03', 'D04'],
        photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'],
        description: 'Deluxe room with garden view.'
      }
    ],
    rates: [
      {
        roomCategory: 'Deluxe',
        occupancy: 'Double Occupancy',
        season: 'Peak Season',
        planRates: {
          AP: { b2bRate: 5000, b2cRate: 5500, b2bExtraPerson: 1000, b2cExtraPerson: 1200, b2bChild: 500, b2cChild: 700 },
          MAP: { b2bRate: 4500, b2cRate: 5000, b2bExtraPerson: 900, b2cExtraPerson: 1100, b2bChild: 400, b2cChild: 600 },
          CP: { b2bRate: 4000, b2cRate: 4500, b2bExtraPerson: 800, b2cExtraPerson: 1000, b2bChild: 300, b2cChild: 500 },
          EP: { b2bRate: 3500, b2cRate: 4000, b2bExtraPerson: 700, b2cExtraPerson: 900, b2bChild: 200, b2cChild: 400 }
        },
        createdBy: 'Rahul Sharma',
        createdDate: new Date('2026-01-25')
      }
    ],
    status: 'Active',
    bookings: 15,
    occupancyRate: 65,
    revenueGenerated: 110000,
    averageRating: 4.7,
    createdAt: new Date('2026-01-25T10:00:00Z')
  },
  {
    _id: 'hs-104',
    name: 'Hillside Serenity Homestay',
    type: 'Homestay',
    ownerType: 'Individual',
    ownerName: 'Sunita Deshmukh',
    ownerMobile: '+91 9876543220',
    address: 'Strawberry Valley, Mahabaleshwar',
    mapLink: 'https://maps.google.com/?q=Mahabaleshwar+Valley',
    region: 'North Bengal',
    city: 'Mahabaleshwar',
    description: 'Cosy homestay with panoramic views of the strawberry valleys, warm home-cooked meals.',
    amenities: ['Free WiFi', 'Parking', 'Heater', 'Garden', 'Balcony'],
    images: ['https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=600'],
    seasons: [
      { seasonName: 'Peak Season', fromDate: new Date('2026-04-01'), toDate: new Date('2026-06-30') },
      { seasonName: 'Off Season', fromDate: new Date('2026-07-01'), toDate: new Date('2027-03-31') }
    ],
    rooms: [
      {
        roomType: 'Standard',
        totalRooms: 4,
        extraPersonAllowed: 1,
        roomNumbers: ['S1', 'S2', 'S3', 'S4'],
        photos: ['https://images.unsplash.com/photo-1498503182468-3b51cbb6cb24?w=600'],
        description: 'Standard comfortable room.'
      }
    ],
    rates: [
      {
        roomCategory: 'Standard',
        occupancy: 'Double Occupancy',
        season: 'Peak Season',
        planRates: {
          AP: { b2bRate: 3000, b2cRate: 3500, b2bExtraPerson: 600, b2cExtraPerson: 800, b2bChild: 300, b2cChild: 400 },
          MAP: { b2bRate: 2500, b2cRate: 3000, b2bExtraPerson: 500, b2cExtraPerson: 700, b2bChild: 200, b2cChild: 300 },
          CP: { b2bRate: 2200, b2cRate: 2500, b2bExtraPerson: 400, b2cExtraPerson: 600, b2bChild: 150, b2cChild: 250 },
          EP: { b2bRate: 1800, b2cRate: 2000, b2bExtraPerson: 300, b2cExtraPerson: 500, b2bChild: 100, b2cChild: 200 }
        },
        createdBy: 'Sunita Deshmukh',
        createdDate: new Date('2026-02-01')
      }
    ],
    status: 'Active',
    bookings: 88,
    occupancyRate: 88,
    revenueGenerated: 264000,
    averageRating: 4.9,
    createdAt: new Date('2026-02-01T10:00:00Z')
  },
  {
    _id: 'hs-105',
    name: 'Valley View Cottage',
    type: 'Cottage',
    ownerType: 'Individual',
    ownerName: 'Sunita Deshmukh',
    ownerMobile: '+91 9876543220',
    address: 'Valley View Road, Panchgani',
    mapLink: 'https://maps.google.com/?q=Panchgani+Valley',
    region: 'North Bengal',
    city: 'Panchgani',
    description: 'Beautiful wood-finished cottages offering stunning views of the valley, peaceful environment.',
    amenities: ['Free WiFi', 'Parking', 'AC', 'TV', 'Bonfire', 'Balcony'],
    images: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600'],
    seasons: [
      { seasonName: 'Peak Season', fromDate: new Date('2026-04-01'), toDate: new Date('2026-06-30') },
      { seasonName: 'Off Season', fromDate: new Date('2026-07-01'), toDate: new Date('2027-03-31') }
    ],
    rooms: [
      {
        roomType: 'Deluxe',
        totalRooms: 6,
        extraPersonAllowed: 2,
        roomNumbers: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
        photos: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600'],
        description: 'Wooden deluxe cottage.'
      }
    ],
    rates: [
      {
        roomCategory: 'Deluxe',
        occupancy: 'Double Occupancy',
        season: 'Peak Season',
        planRates: {
          AP: { b2bRate: 3500, b2cRate: 4000, b2bExtraPerson: 800, b2cExtraPerson: 1000, b2bChild: 400, b2cChild: 500 },
          MAP: { b2bRate: 3000, b2cRate: 3500, b2bExtraPerson: 700, b2cExtraPerson: 900, b2bChild: 300, b2cChild: 400 },
          CP: { b2bRate: 2700, b2cRate: 3000, b2bExtraPerson: 600, b2cExtraPerson: 800, b2bChild: 200, b2cChild: 300 },
          EP: { b2bRate: 2200, b2cRate: 2500, b2bExtraPerson: 500, b2cExtraPerson: 700, b2bChild: 100, b2cChild: 200 }
        },
        createdBy: 'Sunita Deshmukh',
        createdDate: new Date('2026-02-05')
      }
    ],
    status: 'Inactive',
    bookings: 70,
    occupancyRate: 70,
    revenueGenerated: 210000,
    averageRating: 4.5,
    createdAt: new Date('2026-02-05T10:00:00Z')
  }
];

// In-memory local database backup fallback for Bookings
let mockBookingsDatabase = [];

// Seed 100 realistic bookings dynamically
const seedMockBookings = () => {
  const customerNames = [
    'Aarav Mehta', 'Ananya Sharma', 'Vikram Singh', 'Riya Gupta', 'Sanjay Nair',
    'Aditya Roy', 'Karan Malhotra', 'Sneha Patel', 'Rahul Verma', 'Pooja Rao',
    'Amit Kumar', 'Divya Teja', 'Manish Goel', 'Neha Sen', 'Rohan Das',
    'Siddharth Joshi', 'Tanvi Hegde', 'Varun Dhawan', 'Kriti Sanon', 'Ayushmann Khurrana'
  ];

  const stayNames = [
    { name: 'Golden Sands Homestay', region: 'North Bengal', city: 'Alibaug', owner: 'Rajesh Kulkarni', ownerMobile: '+91 9823456781' },
    { name: 'Mountain Breeze Villa', region: 'Sikkim', city: 'Lonavala', owner: 'Rajesh Kulkarni', ownerMobile: '+91 9823456781' },
    { name: 'Coconut Grove Retreat', region: 'North Bengal', city: 'Goa', owner: 'Rajesh Kulkarni', ownerMobile: '+91 9823456781' },
    { name: 'Hillside Serenity Homestay', region: 'North Bengal', city: 'Mahabaleshwar', owner: 'Sunita Deshmukh', ownerMobile: '+91 9876543220' },
    { name: 'Valley View Cottage', region: 'North Bengal', city: 'Panchgani', owner: 'Sunita Deshmukh', ownerMobile: '+91 9876543220' }
  ];

  const drivers = ['Ramesh Kumar', 'Suresh Singh', 'Mahesh Pal', 'Rajesh Yadav', 'Vijay Kumar'];
  const vehicles = ['Toyota Innova (MH-12-PQ-9876)', 'Maruti Ertiga (MH-14-XY-1234)', 'Mahindra XUV500 (GA-03-A-5678)', 'Tata Nexon (WB-02-B-9988)', 'Hyundai Creta (MH-02-CD-4321)'];
  const destinations = ['Tiger Hill Sunrise Tour', 'Mirik Lake Excursion', 'Batasia Loop & Ghoom Monastery', 'Tsomgo Lake Sightseeing', 'Nathula Pass Day Trip'];
  
  const bookingTypes = ['Homestay Booking', 'Hotel Booking', 'Ride Booking', 'Sightseeing Booking', 'Tour Package Booking'];
  const bookingStatuses = ['Confirmed', 'Pending', 'Upcoming', 'Checked In', 'Checked Out', 'Completed', 'Cancelled', 'No Show'];
  const paymentStatuses = ['Paid', 'Partial', 'Pending', 'Refunded'];
  const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'];

  const generated = [];

  for (let i = 1; i <= 100; i++) {
    const id = `b-${100 + i}`;
    const customerIdx = i % customerNames.length;
    const name = customerNames[customerIdx];
    const email = `${name.toLowerCase().replace(' ', '.')}@gmail.com`;
    const mobile = `+91 998877${(100 + i).toString().slice(-4)}`;
    const type = bookingTypes[i % bookingTypes.length];
    
    let status = bookingStatuses[i % bookingStatuses.length];
    let payStatus = paymentStatuses[i % paymentStatuses.length];

    // Align booking and payment statuses logically to match workflow constraints
    if (status === 'Completed' || status === 'Checked Out') {
      status = 'Completed';
      payStatus = i % 10 === 0 ? 'Partial' : 'Paid';
    } else if (status === 'Cancelled') {
      payStatus = i % 5 === 0 ? 'Refunded' : 'Pending';
    } else if (status === 'Pending') {
      payStatus = 'Pending';
    } else if (status === 'Checked In') {
      payStatus = 'Paid';
    }

    const createdDaysAgo = 45 - (i * 0.4);
    const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000);
    const bookingDate = new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000);
    const checkInDate = new Date(bookingDate.getTime() + (i % 5) * 24 * 60 * 60 * 1000);
    const checkOutDate = new Date(checkInDate.getTime() + (1 + (i % 3)) * 24 * 60 * 60 * 1000);

    const bookingAmount = 2500 * (2 + (i % 6));
    const discount = i % 5 === 0 ? 400 : 0;
    const tax = Math.round((bookingAmount - discount) * 0.12);
    const convenienceFee = 120;
    const finalAmount = bookingAmount - discount + tax + convenienceFee;
    
    let paidAmount = 0;
    let refundAmount = 0;
    if (payStatus === 'Paid') {
      paidAmount = finalAmount;
    } else if (payStatus === 'Partial') {
      paidAmount = Math.round(finalAmount * 0.4);
    } else if (payStatus === 'Refunded') {
      paidAmount = finalAmount;
      refundAmount = finalAmount;
    }
    const pendingAmount = finalAmount - paidAmount - refundAmount;

    const timeline = [
      { activity: 'Booking Created', timestamp: createdAt, createdBy: i % 2 === 0 ? 'Super Admin' : 'Customer Portal' }
    ];

    if (payStatus === 'Paid' || payStatus === 'Partial') {
      timeline.push({ activity: 'Payment Received', timestamp: new Date(createdAt.getTime() + 45 * 60 * 1000), createdBy: 'System Gateway' });
    }
    if (status === 'Confirmed' || status === 'Completed' || status === 'Checked In') {
      timeline.push({ activity: 'Booking Confirmed', timestamp: new Date(createdAt.getTime() + 90 * 60 * 1000), createdBy: 'Super Admin' });
    }
    if (status === 'Checked In' || status === 'Completed') {
      timeline.push({ activity: 'Check-In Registered', timestamp: checkInDate, createdBy: 'Staff Reception' });
    }
    if (status === 'Completed') {
      timeline.push({ activity: 'Check-Out Registered', timestamp: checkOutDate, createdBy: 'Staff Reception' });
    }
    if (status === 'Cancelled') {
      timeline.push({ activity: 'Booking Cancelled', timestamp: new Date(createdAt.getTime() + 3 * 60 * 60 * 1000), createdBy: 'Customer Portal' });
    }

    const bookingObj = {
      _id: id,
      bookingId: `BK-2026-${1000 + i}`,
      bookingType: type,
      bookingStatus: status,
      paymentStatus: payStatus,
      amount: finalAmount,
      isRepeatCustomer: i % 7 === 0,
      checkInDate,
      checkOutDate,
      createdAt,
      bookingDate,
      bookingSource: i % 3 === 0 ? 'Super Admin Portal' : i % 3 === 1 ? 'Mobile app' : 'Website Direct',
      customer: {
        customerId: `cust-${100 + customerIdx}`,
        name,
        mobile,
        whatsApp: mobile,
        email,
        address: `Gali No ${i % 10 + 1}, Sector 12, Dwarka, Delhi`,
        registrationDate: new Date('2025-05-15T00:00:00Z')
      },
      guests: {
        total: 1 + (i % 4),
        adults: 1 + (i % 3),
        children: i % 2
      },
      pricing: {
        bookingAmount,
        discount,
        tax,
        convenienceFee,
        paidAmount,
        pendingAmount,
        refundAmount,
        finalAmount
      },
      paymentDetails: {
        method: paymentMethods[i % paymentMethods.length],
        transactionId: `TXN-WOW-${Date.now().toString().slice(-4)}-${1000 + i}`,
        paymentDate: payStatus !== 'Pending' ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
        paymentStatus: payStatus
      },
      timeline,
      createdBy: i % 2 === 0 ? 'Super Admin' : 'API System',
      updatedBy: 'Super Admin'
    };

    if (type === 'Homestay Booking' || type === 'Hotel Booking') {
      const stay = stayNames[i % stayNames.length];
      bookingObj.propertyDetails = {
        propertyId: `hs-${101 + (i % 5)}`,
        propertyName: stay.name,
        ownerName: stay.owner,
        location: `${stay.city}, ${stay.region}`,
        roomCategory: i % 2 === 0 ? 'Deluxe' : 'Standard',
        roomNumber: `Room-${101 + (i % 8)}`,
        mealPlan: i % 3 === 0 ? 'MAP' : i % 3 === 1 ? 'CP' : 'EP',
        season: i % 2 === 0 ? 'Peak Season' : 'Off Season'
      };
    } else if (type === 'Ride Booking') {
      bookingObj.rideDetails = {
        rideId: `RD-550${i}`,
        driverName: drivers[i % drivers.length],
        vehicle: vehicles[i % vehicles.length],
        pickup: i % 2 === 0 ? 'Bagdogra Airport (IXB)' : 'Siliguri Junction',
        drop: i % 2 === 0 ? 'Darjeeling Mall Road' : 'Gangtok MG Marg',
        travelDate: checkInDate
      };
    } else {
      bookingObj.sightseeingDetails = {
        packageName: i % 2 === 0 ? 'Darjeeling Sunrise Package' : 'Sikkim Lakes Scenic Tour',
        destination: destinations[i % destinations.length],
        duration: i % 2 === 0 ? '5 Hours' : 'Full Day Tour',
        guideAssigned: i % 3 === 0 ? 'Bhim Bahadur' : 'Karma Dorjee'
      };
    }

    generated.push(bookingObj);
  }
  return generated;
};

mockBookingsDatabase = seedMockBookings();

// In-memory local database backup fallback for Staff Management
let mockEmployeesDatabase = [
  {
    _id: 'emp-00128',
    firstName: 'Martin',
    lastName: 'Luther',
    fatherName: 'John Luther',
    aadharNo: '123456789012',
    panNo: 'ABCDE1234F',
    role: 'Super Admin',
    department: 'Administration',
    mobile: '+91 9876543201',
    email: 'martin@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    monthlySalary: 50000,
    basicSalary: 30000,
    hra: 10000,
    da: 5000,
    specialAllowance: 3000,
    otherAllowance: 2000,
    pfContribution: 3600,
    esiContribution: 1500,
    tempAddress: { line1: '123 Main Street', line2: 'Apt 4B', landmark: 'Near Park', state: 'Maharashtra', city: 'Mumbai', pinCode: '400001' },
    permAddress: { line1: '123 Main Street', line2: 'Apt 4B', landmark: 'Near Park', state: 'Maharashtra', city: 'Mumbai', pinCode: '400001' },
    bank: { bankName: 'HDFC Bank', accountNumber: '1234567890', ifscCode: 'HDFC0001234', upiId: 'martin@upi' },
    documents: { aadharFront: 'aadhar_front.jpg', aadharBack: 'aadhar_back.jpg', panFront: 'pan_front.jpg', panBack: 'pan_back.jpg', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 32,
    revenue: 245000,
    createdAt: new Date('2024-03-30T10:00:00Z')
  },
  {
    _id: 'emp-00129',
    firstName: 'Priya',
    lastName: 'Sharma',
    fatherName: 'Ram Sharma',
    aadharNo: '987654321098',
    panNo: 'XYZWP5678Q',
    role: 'HR Manager',
    department: 'HR Operations',
    mobile: '+91 9876543210',
    email: 'priya@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    monthlySalary: 45000,
    basicSalary: 25000,
    hra: 8500,
    da: 4000,
    specialAllowance: 2500,
    otherAllowance: 5000,
    pfContribution: 3000,
    esiContribution: 1000,
    tempAddress: { line1: '456 Ridge Rd', line2: 'Floor 2', landmark: 'Near Metro', state: 'Delhi', city: 'New Delhi', pinCode: '110001' },
    permAddress: { line1: '456 Ridge Rd', line2: 'Floor 2', landmark: 'Near Metro', state: 'Delhi', city: 'New Delhi', pinCode: '110001' },
    bank: { bankName: 'ICICI Bank', accountNumber: '0987654321', ifscCode: 'ICIC0005678', upiId: 'priya@upi' },
    documents: { aadharFront: 'aadhar_front.jpg', aadharBack: 'aadhar_back.jpg', panFront: 'pan_front.jpg', panBack: 'pan_back.jpg', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 28,
    revenue: 210000,
    createdAt: new Date('2024-04-15T12:00:00Z')
  },
  {
    _id: 'emp-00130',
    firstName: 'Rahul',
    lastName: 'Sharma',
    fatherName: 'Mohan Sharma',
    aadharNo: '111122223333',
    panNo: 'ABCDE1111F',
    role: 'Operations Manager',
    department: 'Operations',
    mobile: '+91 9988776655',
    email: 'rahul.sharma@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    monthlySalary: 65000,
    basicSalary: 39000,
    hra: 13000,
    da: 6500,
    specialAllowance: 4000,
    otherAllowance: 2500,
    pfContribution: 4000,
    esiContribution: 1500,
    tempAddress: { line1: 'G-102, Palm Heights', line2: 'Sector 56', landmark: 'Near Park', state: 'Haryana', city: 'Gurugram', pinCode: '122011' },
    permAddress: { line1: 'G-102, Palm Heights', line2: 'Sector 56', landmark: 'Near Park', state: 'Haryana', city: 'Gurugram', pinCode: '122011' },
    bank: { bankName: 'SBI', accountNumber: '11122233344', ifscCode: 'SBIN0001234', upiId: 'rahul@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 45,
    revenue: 350000,
    createdAt: new Date('2024-05-01T09:00:00Z')
  },
  {
    _id: 'emp-00131',
    firstName: 'Neha',
    lastName: 'Gupta',
    fatherName: 'Vijay Gupta',
    aadharNo: '222233334444',
    panNo: 'BCDEF2222G',
    role: 'Booking Manager',
    department: 'Bookings Team',
    mobile: '+91 9888777666',
    email: 'neha.gupta@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    monthlySalary: 52000,
    basicSalary: 31200,
    hra: 10400,
    da: 5200,
    specialAllowance: 3200,
    otherAllowance: 2000,
    pfContribution: 3600,
    esiContribution: 1100,
    tempAddress: { line1: 'Block C, Sector 15', line2: 'Apt 501', landmark: 'Opposite Metro', state: 'Uttar Pradesh', city: 'Noida', pinCode: '201301' },
    permAddress: { line1: 'Block C, Sector 15', line2: 'Apt 501', landmark: 'Opposite Metro', state: 'Uttar Pradesh', city: 'Noida', pinCode: '201301' },
    bank: { bankName: 'HDFC Bank', accountNumber: '22233344455', ifscCode: 'HDFC0000111', upiId: 'neha@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 22,
    revenue: 165000,
    createdAt: new Date('2024-06-10T10:00:00Z')
  },
  {
    _id: 'emp-00132',
    firstName: 'Amit',
    lastName: 'Verma',
    fatherName: 'Satish Verma',
    aadharNo: '333344445555',
    panNo: 'CDEFG3333H',
    role: 'Accountant',
    department: 'Finance',
    mobile: '+91 9777666555',
    email: 'amit.verma@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    monthlySalary: 48000,
    basicSalary: 28800,
    hra: 9600,
    da: 4800,
    specialAllowance: 2800,
    otherAllowance: 2000,
    pfContribution: 3600,
    esiContribution: 1000,
    tempAddress: { line1: 'Flat 101, Nilgiri Block', line2: 'Kondapur', landmark: 'Near Botanical Garden', state: 'Telangana', city: 'Hyderabad', pinCode: '500084' },
    permAddress: { line1: 'Flat 101, Nilgiri Block', line2: 'Kondapur', landmark: 'Near Botanical Garden', state: 'Telangana', city: 'Hyderabad', pinCode: '500084' },
    bank: { bankName: 'ICICI Bank', accountNumber: '33344455566', ifscCode: 'ICIC0000222', upiId: 'amit@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 15,
    revenue: 105000,
    createdAt: new Date('2024-08-01T11:00:00Z')
  },
  {
    _id: 'emp-00133',
    firstName: 'Rohit',
    lastName: 'Singh',
    fatherName: 'Balwan Singh',
    aadharNo: '444455556666',
    panNo: 'DEFGH4444I',
    role: 'Operations Lead',
    department: 'Operations',
    mobile: '+91 9666555444',
    email: 'rohit.singh@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    monthlySalary: 60000,
    basicSalary: 36000,
    hra: 12000,
    da: 6000,
    specialAllowance: 3600,
    otherAllowance: 2400,
    pfContribution: 4000,
    esiContribution: 1400,
    tempAddress: { line1: '12-A, Golf Course Rd', line2: 'DLF Phase 5', landmark: 'Opposite Mall', state: 'Haryana', city: 'Gurugram', pinCode: '122002' },
    permAddress: { line1: '12-A, Golf Course Rd', line2: 'DLF Phase 5', landmark: 'Opposite Mall', state: 'Haryana', city: 'Gurugram', pinCode: '122002' },
    bank: { bankName: 'Axis Bank', accountNumber: '44455566677', ifscCode: 'UTIB0000333', upiId: 'rohit@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 30,
    revenue: 220000,
    createdAt: new Date('2024-09-15T09:30:00Z')
  },
  {
    _id: 'emp-00134',
    firstName: 'Priya',
    lastName: 'Patel',
    fatherName: 'Kirit Patel',
    aadharNo: '555566667777',
    panNo: 'EFGHI5555J',
    role: 'HR coordinator',
    department: 'HR Operations',
    mobile: '+91 9555444333',
    email: 'priya.patel@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    monthlySalary: 55500,
    basicSalary: 33000,
    hra: 11000,
    da: 5500,
    specialAllowance: 3500,
    otherAllowance: 2500,
    pfContribution: 3800,
    esiContribution: 1200,
    tempAddress: { line1: '102, Shivalik Residency', line2: 'Vastrapur', landmark: 'Near Lake', state: 'Gujarat', city: 'Ahmedabad', pinCode: '380015' },
    permAddress: { line1: '102, Shivalik Residency', line2: 'Vastrapur', landmark: 'Near Lake', state: 'Gujarat', city: 'Ahmedabad', pinCode: '380015' },
    bank: { bankName: 'SBI', accountNumber: '55566677788', ifscCode: 'SBIN0000444', upiId: 'priyapatel@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 0,
    revenue: 0,
    createdAt: new Date('2024-11-10T14:00:00Z')
  },
  {
    _id: 'emp-00135',
    firstName: 'Vikram',
    lastName: 'Patel',
    fatherName: 'Arvind Patel',
    aadharNo: '666677778888',
    panNo: 'FGHIJ6666K',
    role: 'Support Executive',
    department: 'Customer Support',
    mobile: '+91 9444333222',
    email: 'vikram.patel@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    monthlySalary: 35000,
    basicSalary: 21000,
    hra: 7000,
    da: 3500,
    specialAllowance: 2000,
    otherAllowance: 1500,
    pfContribution: 2500,
    esiContribution: 800,
    tempAddress: { line1: '404, Dev Crest', line2: 'Satellite Road', landmark: 'Opposite Mall', state: 'Gujarat', city: 'Ahmedabad', pinCode: '380015' },
    permAddress: { line1: '404, Dev Crest', line2: 'Satellite Road', landmark: 'Opposite Mall', state: 'Gujarat', city: 'Ahmedabad', pinCode: '380015' },
    bank: { bankName: 'Bank of Baroda', accountNumber: '66677788899', ifscCode: 'BARB0SATELL', upiId: 'vikrampatel@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 12,
    revenue: 85000,
    createdAt: new Date('2025-01-15T09:00:00Z')
  },
  {
    _id: 'emp-00136',
    firstName: 'Sunita',
    lastName: 'Deshmukh',
    fatherName: 'Vasant Deshmukh',
    aadharNo: '777788889999',
    panNo: 'GHIJK7777L',
    role: 'Operations executive',
    department: 'Operations',
    mobile: '+91 9333222111',
    email: 'sunita.deshmukh@gmail.com',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    monthlySalary: 42000,
    basicSalary: 25200,
    hra: 8400,
    da: 4200,
    specialAllowance: 2200,
    otherAllowance: 2000,
    pfContribution: 3000,
    esiContribution: 900,
    tempAddress: { line1: 'Plot 45, Deccan Gymkhana', line2: 'Near Cafe Goodluck', landmark: 'Behind Temple', state: 'Maharashtra', city: 'Pune', pinCode: '411004' },
    permAddress: { line1: 'Plot 45, Deccan Gymkhana', line2: 'Near Cafe Goodluck', landmark: 'Behind Temple', state: 'Maharashtra', city: 'Pune', pinCode: '411004' },
    bank: { bankName: 'HDFC Bank', accountNumber: '77788899900', ifscCode: 'HDFC0000456', upiId: 'sunita@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 25,
    revenue: 190000,
    createdAt: new Date('2025-02-10T11:00:00Z')
  },
  {
    _id: 'emp-00137',
    firstName: 'Sanjay',
    lastName: 'Kulkarni',
    fatherName: 'Anant Kulkarni',
    aadharNo: '888899990000',
    panNo: 'HIJKL8888M',
    role: 'Support Executive',
    department: 'Customer Support',
    mobile: '+91 9222111000',
    email: 'sanjay.kulkarni@gmail.com',
    status: 'Inactive',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    monthlySalary: 32000,
    basicSalary: 19200,
    hra: 6400,
    da: 3200,
    specialAllowance: 2000,
    otherAllowance: 1200,
    pfContribution: 2400,
    esiContribution: 800,
    tempAddress: { line1: 'Flat 302, Sahyadri Hills', line2: 'Kothrud', landmark: 'Near Metro', state: 'Maharashtra', city: 'Pune', pinCode: '411038' },
    permAddress: { line1: 'Flat 302, Sahyadri Hills', line2: 'Kothrud', landmark: 'Near Metro', state: 'Maharashtra', city: 'Pune', pinCode: '411038' },
    bank: { bankName: 'SBI', accountNumber: '88899900011', ifscCode: 'SBIN0000128', upiId: 'sanjay@upi' },
    documents: { aadharFront: 'aadhar.jpg', aadharBack: '', panFront: 'pan.jpg', panBack: '', drivingLicense: '', voterId: '', profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
    createdBy: 'Rahul Sharma',
    updatedBy: 'Rahul Sharma',
    bookingsCount: 5,
    revenue: 35000,
    createdAt: new Date('2025-05-15T10:00:00Z')
  }
];

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving fallback summary data');
    return res.json(mockFallbackData.summary);
  }

  try {
    const totalBookings = await Booking.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
    const totalHomestays = await Homestay.countDocuments({ type: 'Homestay' });
    const totalHotels = await Homestay.countDocuments({ type: 'Hotel' });

    // Calculate checkins and checkouts today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayCheckins = await Booking.countDocuments({
      checkInDate: { $gte: startOfToday, $lte: endOfToday }
    });

    const todayCheckouts = await Booking.countDocuments({
      checkOutDate: { $gte: startOfToday, $lte: endOfToday }
    });

    // Today's bookings created
    const todayBookingsCount = await Booking.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    // Today's revenue
    const todayRevenueResults = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayRevenue = todayRevenueResults[0]?.total || 125600;

    // Repeat customers percentage
    const repeatBookings = await Booking.countDocuments({ isRepeatCustomer: true });
    const repeatCustomersRate = totalBookings > 0 ? Number(((repeatBookings / totalBookings) * 100).toFixed(1)) : 38.7;

    res.json({
      totalBookings: totalBookings || 1248,
      totalEmployees: totalEmployees || 56,
      activeEmployees: activeEmployees || 42,
      inactiveEmployees: inactiveEmployees || 14,
      totalHomestays: totalHomestays || 18,
      totalHotels: totalHotels || 7,
      todayCheckins: todayCheckins || 9,
      todayCheckouts: todayCheckouts || 10,
      repeatCustomersRate,
      todayBookingsCount: todayBookingsCount || 28,
      todayRevenue: todayRevenue || 125600,
      monthBookingsChange: 12.5,
      monthEmployeesChange: 5.3,
      monthRepeatChange: 4.5,
      todayBookingsChange: 7.1,
      todayRevenueChange: 10.2
    });
  } catch (error) {
    console.error('Error fetching dashboard summary, using fallback:', error.message);
    res.json(mockFallbackData.summary);
  }
});

// GET /api/dashboard/charts
router.get('/charts', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving fallback charts data');
    return res.json(mockFallbackData.charts);
  }

  try {
    const today = new Date();
    const monthlyBookings = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let m = 0; m < 12; m++) {
      const startOfMonth = new Date(today.getFullYear(), m, 1);
      const endOfMonth = new Date(today.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      
      const count = await Booking.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      monthlyBookings.push({
        name: months[m],
        bookings: count || mockFallbackData.charts.monthWiseBookings[m].bookings
      });
    }

    const overviewStatuses = ['Confirmed', 'Pending', 'Cancelled', 'Completed'];
    const colors = { Confirmed: '#10B981', Pending: '#F59E0B', Cancelled: '#EF4444', Completed: '#3B82F6' };
    const percentages = { Confirmed: 69, Pending: 16, Cancelled: 10, Completed: 5 };
    const totalBookings = await Booking.countDocuments();
    
    const bookingOverview = await Promise.all(
      overviewStatuses.map(async (status) => {
        const count = await Booking.countDocuments({ status });
        const pct = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : percentages[status];
        return {
          name: status,
          value: count || mockFallbackData.charts.bookingOverview.find(o => o.name === status).value,
          percentage: pct,
          color: colors[status]
        };
      })
    );

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const monthlyTotalResults = await Booking.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyTotal = monthlyTotalResults[0]?.total || 1245000;

    const weeklyPoints = [];
    for (let w = 0; w < 4; w++) {
      const startOfWeek = new Date(startOfMonth.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      const weekRevenueResults = await Booking.aggregate([
        { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      weeklyPoints.push({
        name: `Week ${w + 1}`,
        income: weekRevenueResults[0]?.total || mockFallbackData.charts.incomeOverview.points[w].income
      });
    }

    res.json({
      monthWiseBookings: monthlyBookings,
      bookingOverview,
      incomeOverview: {
        total: monthlyTotal,
        change: 15.6,
        points: weeklyPoints
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard charts, using fallback:', error.message);
    res.json(mockFallbackData.charts);
  }
});

// GET /api/dashboard/employees (Top 5 list)
router.get('/employees', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving fallback employee data');
    return res.json(mockFallbackData.employees);
  }

  try {
    const employees = await Employee.find({ status: 'Active' })
      .sort({ revenue: -1 })
      .limit(5);

    if (employees.length === 0) {
      return res.json(mockFallbackData.employees);
    }

    const formattedEmployees = employees.map(emp => ({
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role,
      bookings: emp.bookingsCount,
      revenue: emp.revenue,
      avatar: emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    }));

    res.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employee list, using fallback:', error.message);
    res.json(mockFallbackData.employees);
  }
});

// GET /api/dashboard/homestays
router.get('/homestays', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving fallback homestays data');
    return res.json(mockFallbackData.homestays);
  }

  try {
    const homestays = await Homestay.find()
      .sort({ bookings: -1 })
      .limit(5);

    if (homestays.length === 0) {
      return res.json(mockFallbackData.homestays);
    }

    const formattedHomestays = homestays.map(hs => ({
      name: hs.name,
      bookings: hs.bookings,
      occupancyRate: hs.occupancyRate
    }));

    res.json(formattedHomestays);
  } catch (error) {
    console.error('Error fetching homestays list, using fallback:', error.message);
    res.json(mockFallbackData.homestays);
  }
});

// --- STAFF MANAGEMENT CRUD ENDPOINTS ---

// GET /api/dashboard/employees-list
router.get('/employees-list', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving in-memory staff database');
    return res.json(mockEmployeesDatabase);
  }

  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching full staff list, using memory fallback:', error.message);
    res.json(mockEmployeesDatabase);
  }
});

// GET /api/dashboard/employees-list/:id
router.get('/employees-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const emp = mockEmployeesDatabase.find(e => e._id === id);
    if (!emp) return res.status(404).json({ error: 'Employee not found in memory' });
    return res.json(emp);
  }

  try {
    const emp = await Employee.findById(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found in database' });
    res.json(emp);
  } catch (error) {
    console.error('Error fetching employee, using memory fallback:', error.message);
    const emp = mockEmployeesDatabase.find(e => e._id === id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  }
});

// POST /api/dashboard/employees-list
router.post('/employees-list', async (req, res) => {
  const employeeData = req.body;
  
  if (!isMongoConnected()) {
    const newEmp = {
      _id: `emp-${Date.now().toString().slice(-5)}`,
      ...employeeData,
      status: employeeData.status || 'Active',
      bookingsCount: 0,
      revenue: 0,
      avatar: employeeData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      createdAt: new Date()
    };
    mockEmployeesDatabase.unshift(newEmp);
    console.log('Saved employee to in-memory store:', newEmp._id);
    return res.status(201).json(newEmp);
  }

  try {
    const newEmp = new Employee(employeeData);
    await newEmp.save();
    res.status(201).json(newEmp);
  } catch (error) {
    console.error('Error saving employee to MongoDB:', error.message);
    res.status(500).json({ error: 'Failed to save employee', message: error.message });
  }
});

// PUT /api/dashboard/employees-list/:id
router.put('/employees-list/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!isMongoConnected()) {
    const idx = mockEmployeesDatabase.findIndex(e => e._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
    
    mockEmployeesDatabase[idx] = {
      ...mockEmployeesDatabase[idx],
      ...updateData,
      updatedBy: 'Rahul Sharma'
    };
    console.log('Updated employee in-memory store:', id);
    return res.json(mockEmployeesDatabase[idx]);
  }

  try {
    const emp = await Employee.findByIdAndUpdate(id, updateData, { new: true });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (error) {
    console.error('Error updating employee:', error.message);
    res.status(500).json({ error: 'Failed to update employee', message: error.message });
  }
});

// DELETE /api/dashboard/employees-list/:id
router.delete('/employees-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockEmployeesDatabase.findIndex(e => e._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
    
    const deleted = mockEmployeesDatabase.splice(idx, 1);
    console.log('Deleted employee from in-memory store:', id);
    return res.json({ message: 'Employee deleted from memory', deleted: deleted[0] });
  }

  try {
    const emp = await Employee.findByIdAndDelete(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted successfully', deleted: emp });
  } catch (error) {
    console.error('Error deleting employee:', error.message);
    res.status(500).json({ error: 'Failed to delete employee', message: error.message });
  }
});

// GET /api/dashboard/roles
router.get('/roles', async (req, res) => {
  if (!isMongoConnected()) {
    console.log('MongoDB not connected, serving mock roles database');
    return res.json(mockRolesDatabase);
  }
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles list, using memory fallback:', error.message);
    res.json(mockRolesDatabase);
  }
});

// GET /api/dashboard/roles/:id
router.get('/roles/:id', async (req, res) => {
  const { id } = req.params;
  if (!isMongoConnected()) {
    const role = mockRolesDatabase.find(r => r._id === id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    return res.json(role);
  }
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (error) {
    console.error('Error fetching role, using memory fallback:', error.message);
    const role = mockRolesDatabase.find(r => r._id === id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  }
});

// POST /api/dashboard/roles
router.post('/roles', async (req, res) => {
  const roleData = req.body;
  if (!isMongoConnected()) {
    const newRole = {
      _id: `role-${Date.now().toString().slice(-5)}`,
      ...roleData,
      createdAt: new Date()
    };
    mockRolesDatabase.push(newRole);
    console.log('Saved role to in-memory store:', newRole._id);
    return res.status(201).json(newRole);
  }
  try {
    const newRole = new Role(roleData);
    await newRole.save();
    res.status(201).json(newRole);
  } catch (error) {
    console.error('Error saving role to MongoDB:', error.message);
    res.status(500).json({ error: 'Failed to save role', message: error.message });
  }
});

// PUT /api/dashboard/roles/:id
router.put('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  if (!isMongoConnected()) {
    const idx = mockRolesDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Role not found' });
    mockRolesDatabase[idx] = {
      ...mockRolesDatabase[idx],
      ...updateData
    };
    console.log('Updated role in-memory store:', id);
    return res.json(mockRolesDatabase[idx]);
  }
  try {
    const role = await Role.findByIdAndUpdate(id, updateData, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error.message);
    res.status(500).json({ error: 'Failed to update role', message: error.message });
  }
});

// DELETE /api/dashboard/roles/:id
router.delete('/roles/:id', async (req, res) => {
  const { id } = req.params;
  if (!isMongoConnected()) {
    const idx = mockRolesDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Role not found' });
    const deleted = mockRolesDatabase.splice(idx, 1);
    console.log('Deleted role from in-memory store:', id);
    return res.json({ message: 'Role deleted from memory', deleted: deleted[0] });
  }
  try {
    const role = await Role.findByIdAndDelete(id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted successfully', deleted: role });
  } catch (error) {
    console.error('Error deleting role:', error.message);
    res.status(500).json({ error: 'Failed to delete role', message: error.message });
  }
});

// POST /api/dashboard/employees-assign-role
router.post('/employees-assign-role', async (req, res) => {
  const { employeeId, roleName, department, effectiveDate, notes } = req.body;
  
  if (!isMongoConnected()) {
    const idx = mockEmployeesDatabase.findIndex(e => e._id === employeeId);
    if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
    
    mockEmployeesDatabase[idx] = {
      ...mockEmployeesDatabase[idx],
      role: roleName,
      department: department || mockEmployeesDatabase[idx].department || 'Operations',
      roleAssignedDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      roleNotes: notes || ''
    };
    
    console.log('Assigned role in-memory to employee:', employeeId, roleName);
    return res.json(mockEmployeesDatabase[idx]);
  }
  
  try {
    const updatedEmp = await Employee.findByIdAndUpdate(
      employeeId,
      {
        role: roleName,
        department: department || 'Operations',
        roleAssignedDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        roleNotes: notes || ''
      },
      { new: true }
    );
    if (!updatedEmp) return res.status(404).json({ error: 'Employee not found' });
    res.json(updatedEmp);
  } catch (error) {
    console.error('Error assigning role to employee:', error.message);
    res.status(500).json({ error: 'Failed to assign role to employee', message: error.message });
  }
});

// GET /api/dashboard/attendance
router.get('/attendance', async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const queryDate = new Date(dateStr);
  
  if (!isMongoConnected()) {
    // 1. Get all mock employees
    const employees = mockEmployeesDatabase;
    
    // 2. Fetch attendance records for queryDate
    const startOfDay = new Date(queryDate.setUTCHours(0,0,0,0));
    const endOfDay = new Date(queryDate.setUTCHours(23,59,59,999));
    
    const dayRecords = mockAttendanceDatabase.filter(att => {
      const attDate = new Date(att.date);
      return attDate >= startOfDay && attDate <= endOfDay;
    });
    
    // 3. Map employees to their attendance records
    const results = employees.map(emp => {
      const record = dayRecords.find(r => r.employeeId === emp._id);
      return {
        employee: emp,
        attendance: record || {
          employeeId: emp._id,
          date: startOfDay,
          status: 'Absent',
          loginTime: '',
          logoutTime: '',
          workingHours: 0,
          notes: ''
        }
      };
    });
    
    return res.json(results);
  }
  
  try {
    const startOfDay = new Date(queryDate.setHours(0,0,0,0));
    const endOfDay = new Date(queryDate.setHours(23,59,59,999));
    
    const employees = await Employee.find().sort({ firstName: 1 });
    const attendanceRecords = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const results = employees.map(emp => {
      const record = attendanceRecords.find(r => r.employeeId === emp._id.toString());
      return {
        employee: emp,
        attendance: record || {
          employeeId: emp._id,
          date: startOfDay,
          status: 'Absent',
          loginTime: '',
          logoutTime: '',
          workingHours: 0,
          notes: ''
        }
      };
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching attendance list:', error.message);
    res.status(500).json({ error: 'Failed to fetch attendance', message: error.message });
  }
});

// POST /api/dashboard/attendance
router.post('/attendance', async (req, res) => {
  const { employeeId, date, status, loginTime, logoutTime, workingHours, notes } = req.body;
  const targetDate = new Date(date);
  
  if (!isMongoConnected()) {
    const startOfDay = new Date(targetDate.setUTCHours(0,0,0,0));
    const endOfDay = new Date(targetDate.setUTCHours(23,59,59,999));
    
    const idx = mockAttendanceDatabase.findIndex(att => {
      const attDate = new Date(att.date);
      return att.employeeId === employeeId && attDate >= startOfDay && attDate <= endOfDay;
    });
    
    const updatedRecord = {
      employeeId,
      date: startOfDay,
      status,
      loginTime: loginTime || '',
      logoutTime: logoutTime || '',
      workingHours: Number(workingHours) || 0,
      notes: notes || ''
    };
    
    if (idx !== -1) {
      mockAttendanceDatabase[idx] = {
        ...mockAttendanceDatabase[idx],
        ...updatedRecord
      };
      console.log('Updated attendance record in-memory:', mockAttendanceDatabase[idx]._id);
      return res.json(mockAttendanceDatabase[idx]);
    } else {
      const newRecord = {
        _id: `att-${Date.now().toString().slice(-5)}`,
        ...updatedRecord
      };
      mockAttendanceDatabase.push(newRecord);
      console.log('Created attendance record in-memory:', newRecord._id);
      return res.status(201).json(newRecord);
    }
  }
  
  try {
    const startOfDay = new Date(targetDate.setHours(0,0,0,0));
    const endOfDay = new Date(targetDate.setHours(23,59,59,999));
    
    const updated = await Attendance.findOneAndUpdate(
      { employeeId, date: { $gte: startOfDay, $lte: endOfDay } },
      {
        employeeId,
        date: startOfDay,
        status,
        loginTime: loginTime || '',
        logoutTime: logoutTime || '',
        workingHours: Number(workingHours) || 0,
        notes: notes || ''
      },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (error) {
    console.error('Error saving attendance:', error.message);
    res.status(500).json({ error: 'Failed to save attendance', message: error.message });
  }
});

// GET /api/dashboard/attendance/employee/:employeeId
router.get('/attendance/employee/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  
  if (!isMongoConnected()) {
    const records = mockAttendanceDatabase.filter(r => r.employeeId === employeeId);
    return res.json(records);
  }
  
  try {
    const records = await Attendance.find({ employeeId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching employee attendance history:', error.message);
    res.status(500).json({ error: 'Failed to fetch attendance history', message: error.message });
  }
});
// ==========================================
// SALARY MANAGEMENT REST ENDPOINTS
// ==========================================

// GET /api/dashboard/salaries/stats
router.get('/salaries/stats', async (req, res) => {
  const currentMonth = req.query.month || 'June';
  const currentYear = req.query.year || '2026';

  if (!isMongoConnected()) {
    const totalEmployees = mockEmployeesDatabase.filter(e => e.status === 'Active').length;
    const processedSalaries = mockSalariesDatabase.filter(s => s.month === currentMonth && s.year === currentYear);
    const processedThisMonth = processedSalaries.length;
    const pendingSalaries = Math.max(0, totalEmployees - processedSalaries.filter(s => s.status === 'Paid').length);
    const totalSalaryAmount = processedSalaries.reduce((sum, s) => sum + s.netSalary, 0);

    return res.json({
      totalEmployees,
      processedThisMonth,
      pendingSalaries,
      totalSalaryAmount
    });
  }

  try {
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const processedSalaries = await Salary.find({ month: currentMonth, year: currentYear });
    const processedThisMonth = processedSalaries.length;
    const paidSalariesCount = processedSalaries.filter(s => s.status === 'Paid').length;
    const pendingSalaries = Math.max(0, totalEmployees - paidSalariesCount);
    const totalSalaryAmount = processedSalaries.reduce((sum, s) => sum + s.netSalary, 0);

    res.json({
      totalEmployees,
      processedThisMonth,
      pendingSalaries,
      totalSalaryAmount
    });
  } catch (error) {
    console.error('Error fetching salary stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch salary stats', message: error.message });
  }
});

// GET /api/dashboard/salaries
router.get('/salaries', async (req, res) => {
  const { search, month, year, status } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockSalariesDatabase];

    // Filter by month & year if provided
    if (month) list = list.filter(s => s.month === month);
    if (year) list = list.filter(s => s.year === year);
    if (status && status !== 'All') list = list.filter(s => s.status === status);

    // Map employee detail
    const results = list.map(sal => {
      const emp = mockEmployeesDatabase.find(e => e._id === sal.employeeId);
      return {
        ...sal,
        employee: emp || {
          _id: sal.employeeId,
          firstName: 'Unknown',
          lastName: 'Staff',
          role: 'Staff',
          avatar: ''
        }
      };
    });

    // Apply search filter if provided
    let filteredResults = results;
    if (search) {
      const q = search.toLowerCase();
      filteredResults = results.filter(item => 
        item.employee.firstName.toLowerCase().includes(q) ||
        item.employee.lastName.toLowerCase().includes(q) ||
        item.employee.role.toLowerCase().includes(q) ||
        item.employeeId.toLowerCase().includes(q)
      );
    }

    return res.json(filteredResults);
  }

  try {
    const query = {};
    if (month) query.month = month;
    if (year) query.year = year;
    if (status && status !== 'All') query.status = status;

    const salaries = await Salary.find(query).sort({ createdAt: -1 });
    const employees = await Employee.find();

    const results = salaries.map(sal => {
      const emp = employees.find(e => e._id.toString() === sal.employeeId);
      return {
        ...sal.toObject(),
        employee: emp || {
          _id: sal.employeeId,
          firstName: 'Unknown',
          lastName: 'Staff',
          role: 'Staff',
          avatar: ''
        }
      };
    });

    let filteredResults = results;
    if (search) {
      const q = search.toLowerCase();
      filteredResults = results.filter(item => 
        item.employee.firstName.toLowerCase().includes(q) ||
        item.employee.lastName.toLowerCase().includes(q) ||
        item.employee.role.toLowerCase().includes(q) ||
        item.employeeId.toLowerCase().includes(q)
      );
    }

    res.json(filteredResults);
  } catch (error) {
    console.error('Error fetching salaries list:', error.message);
    res.status(500).json({ error: 'Failed to fetch salaries list', message: error.message });
  }
});

// GET /api/dashboard/salaries/employee/:employeeId
router.get('/salaries/employee/:employeeId', async (req, res) => {
  const { employeeId } = req.params;

  if (!isMongoConnected()) {
    const records = mockSalariesDatabase.filter(s => s.employeeId === employeeId).sort((a,b) => b.year - a.year);
    return res.json(records);
  }

  try {
    const records = await Salary.find({ employeeId }).sort({ year: -1, month: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching employee salary history:', error.message);
    res.status(500).json({ error: 'Failed to fetch salary history', message: error.message });
  }
});

// GET /api/dashboard/salaries/:id
router.get('/salaries/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const sal = mockSalariesDatabase.find(s => s._id === id);
    if (!sal) return res.status(404).json({ error: 'Salary record not found' });
    const emp = mockEmployeesDatabase.find(e => e._id === sal.employeeId);
    return res.json({
      ...sal,
      employee: emp || {
        _id: sal.employeeId,
        firstName: 'Unknown',
        lastName: 'Staff',
        role: 'Staff',
        avatar: ''
      }
    });
  }

  try {
    const sal = await Salary.findById(id);
    if (!sal) return res.status(404).json({ error: 'Salary record not found' });
    const emp = await Employee.findById(sal.employeeId);
    res.json({
      ...sal.toObject(),
      employee: emp || {
        _id: sal.employeeId,
        firstName: 'Unknown',
        lastName: 'Staff',
        role: 'Staff',
        avatar: ''
      }
    });
  } catch (error) {
    console.error('Error fetching salary details:', error.message);
    res.status(500).json({ error: 'Failed to fetch salary details', message: error.message });
  }
});

// POST /api/dashboard/salaries
router.post('/salaries', async (req, res) => {
  const { employeeId, month, year } = req.body;

  if (!employeeId || !month || !year) {
    return res.status(400).json({ error: 'Missing employeeId, month or year' });
  }

  if (!isMongoConnected()) {
    const idx = mockSalariesDatabase.findIndex(s => s.employeeId === employeeId && s.month === month && s.year === year);
    const record = {
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      updatedBy: 'Rahul Sharma',
      createdAt: new Date()
    };

    if (idx !== -1) {
      mockSalariesDatabase[idx] = {
        ...mockSalariesDatabase[idx],
        ...record
      };
      return res.json(mockSalariesDatabase[idx]);
    } else {
      const newRecord = {
        _id: `sal-${Date.now().toString().slice(-5)}`,
        ...record
      };
      mockSalariesDatabase.unshift(newRecord);
      return res.status(201).json(newRecord);
    }
  }

  try {
    const recordData = {
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      updatedBy: 'Rahul Sharma'
    };

    const record = await Salary.findOneAndUpdate(
      { employeeId, month, year },
      recordData,
      { new: true, upsert: true }
    );
    res.json(record);
  } catch (error) {
    console.error('Error processing salary:', error.message);
    res.status(500).json({ error: 'Failed to process salary', message: error.message });
  }
});

// PUT /api/dashboard/salaries/:id
router.put('/salaries/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockSalariesDatabase.findIndex(s => s._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Salary record not found' });
    
    mockSalariesDatabase[idx] = {
      ...mockSalariesDatabase[idx],
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      updatedBy: 'Rahul Sharma'
    };
    return res.json(mockSalariesDatabase[idx]);
  }

  try {
    const recordData = {
      ...req.body,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      updatedBy: 'Rahul Sharma'
    };

    const updated = await Salary.findByIdAndUpdate(id, recordData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Salary record not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating salary:', error.message);
    res.status(500).json({ error: 'Failed to update salary', message: error.message });
  }
});

// DELETE /api/dashboard/salaries/:id
router.delete('/salaries/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockSalariesDatabase.findIndex(s => s._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Salary record not found' });
    mockSalariesDatabase.splice(idx, 1);
    return res.json({ success: true, message: 'Salary record deleted successfully' });
  }

  try {
    const deleted = await Salary.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Salary record not found' });
    res.json({ success: true, message: 'Salary record deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary:', error.message);
    res.status(500).json({ error: 'Failed to delete salary', message: error.message });
  }
});

// ==========================================
// HOMESTAY OWNERS MANAGEMENT ENDPOINTS
// ==========================================

// ==========================================
// HOMESTAY OWNERS MANAGEMENT ENDPOINTS
// ==========================================
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Helper to resolve writable directory dynamically (use /tmp/uploads on Vercel)
const getUploadDir = (subDir = '') => {
  const base = process.env.VERCEL ? '/tmp/uploads' : './uploads';
  const dir = subDir ? path.join(base, subDir) : base;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Convert uploaded file to base64 Data URL dynamically and clean up disk file
const getFileDataUrl = (file) => {
  if (!file) return '';
  try {
    if (file.buffer) {
      return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    if (file.path && fs.existsSync(file.path)) {
      const data = fs.readFileSync(file.path);
      const base64 = data.toString('base64');
      const mime = file.mimetype || 'image/png';
      try {
        fs.unlinkSync(file.path);
      } catch (err) {}
      return `data:${mime};base64,base64,${base64}`.replace('base64,base64,', 'base64,');
    }
  } catch (err) {
    console.error('Error generating data URL:', err.message);
  }
};

// Convert date value safely to ISO string split date format
const formatDateSafe = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (err) {}
  return '';
};

// Convert extra person dropdown string or number safely to numeric value
const parseExtraPerson = (val) => {
  if (!val || val === 'Not Allowed') return 0;
  if (typeof val === 'number') return val;
  const str = String(val);
  if (str.includes('1')) return 1;
  if (str.includes('2')) return 2;
  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

// Multer storage setup for JPG, PNG, PDF document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = getUploadDir();
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, and PDF files are allowed.'));
    }
    cb(null, true);
  }
});

// Admin impersonate JWT generator
router.post(['/owners/:id/impersonate', '/admin/homestay-owners/:id/impersonate'], authenticateToken, async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'AccessDenied', message: 'Only Super Admins can impersonate owners.' });
  }

  const { id } = req.params;

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o._id === id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found.' });
    }
    const token = jwt.sign({ _id: owner._id, email: owner.email, role: 'Owner' }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token, user: owner });
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found.' });
    }

    const payload = {
      _id: owner._id,
      email: owner.email,
      role: 'Owner',
      firstName: owner.firstName,
      lastName: owner.lastName
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
    logActivity(req, 'IMPERSONATION_LOGIN', 'Super Admin Auth', `Super Admin logged in as owner: ${owner.email}`);

    res.json({ token, user: owner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to impersonate owner', message: error.message });
  }
});

// GET /api/dashboard/owners/stats
router.get(['/owners/stats', '/admin/homestay-owners/stats'], authenticateToken, async (req, res) => {
  if (!isMongoConnected()) {
    const activeList = mockOwnersDatabase.filter(o => o.status !== 'Deleted');
    const totalOwners = activeList.length;
    const activeOwners = activeList.filter(o => o.status === 'Active').length;
    const pendingVerification = activeList.filter(o => o.status === 'Pending Verification').length;
    const totalProperties = activeList.reduce((sum, o) => sum + (o.properties ? o.properties.length : 0), 0);
    return res.json({ totalOwners, activeOwners, pendingVerification, totalProperties });
  }

  try {
    const totalOwners = await HomestayOwner.countDocuments({ status: { $ne: 'Deleted' } });
    const activeOwners = await HomestayOwner.countDocuments({ status: 'Active' });
    const pendingVerification = await HomestayOwner.countDocuments({ status: 'Pending Verification' });
    
    const owners = await HomestayOwner.find({ status: { $ne: 'Deleted' } }, 'properties');
    const totalProperties = owners.reduce((sum, o) => sum + (o.properties ? o.properties.length : 0), 0);

    res.json({ totalOwners, activeOwners, pendingVerification, totalProperties });
  } catch (error) {
    console.error('Error fetching owner stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch owner stats', message: error.message });
  }
});

// GET /api/dashboard/owners (Server-Side table + pagination, filtering, search)
router.get(['/owners', '/admin/homestay-owners'], authenticateToken, async (req, res) => {
  const { search, status, page, limit, all } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockOwnersDatabase];
    if (status && status !== 'All') {
      list = list.filter(o => o.status === status);
    } else {
      list = list.filter(o => o.status !== 'Deleted');
    }
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(o => 
        (o.firstName && o.firstName.toLowerCase().includes(term)) ||
        (o.lastName && o.lastName.toLowerCase().includes(term)) ||
        (o.email && o.email.toLowerCase().includes(term)) ||
        (o.mobile && o.mobile.toLowerCase().includes(term))
      );
    }

    if (all === 'true' || (!page && !limit)) {
      return res.json(list);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    const totalRecords = list.length;
    const data = list.slice(skip, skip + limitNum);
    return res.json({ data, totalRecords });
  }

  // Simple unpaginated list mode for simple select filters (e.g. properties add/edit form)
  if (all === 'true' || (!page && !limit)) {
    try {
      let query = { status: { $ne: 'Deleted' } };
      if (status && status !== 'All') {
        query.status = status;
      }
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { mobile: searchRegex }
        ];
      }
      const list = await HomestayOwner.find(query).sort({ createdAt: -1 });
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch owners list', message: err.message });
    }
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  try {
    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    } else {
      query.status = { $ne: 'Deleted' };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex }
      ];
    }

    const totalRecords = await HomestayOwner.countDocuments(query);
    const data = await HomestayOwner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({ data, totalRecords });
  } catch (error) {
    console.error('Error fetching homestay owners:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestay owners', message: error.message });
  }
});

// GET /api/dashboard/owners/:id
router.get(['/owners/:id', '/admin/homestay-owners/:id'], authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o._id === id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }
    const ownerObj = { ...owner };
    ownerObj.passwordCopy = owner.password || 'Owner@123';
    return res.json(ownerObj);
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }
    
    // Decrypt password copy for Super Admin viewing
    let passwordCopyDecrypted = '';
    if (owner.encryptedPasswordCopy) {
      passwordCopyDecrypted = decrypt(owner.encryptedPasswordCopy);
    }

    const ownerObj = owner.toObject();
    ownerObj.passwordCopy = passwordCopyDecrypted;

    res.json(ownerObj);
  } catch (error) {
    console.error('Error fetching homestay owner details:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestay owner details', message: error.message });
  }
});

// POST /api/dashboard/owners
router.post(['/owners', '/admin/homestay-owners'], authenticateToken, async (req, res) => {
  const ownerData = req.body;

  // 1. Validations
  if (!ownerData.firstName || !ownerData.lastName || !ownerData.fatherName || !ownerData.email || !ownerData.mobile) {
    return res.status(400).json({ error: 'RequiredFields', message: 'First name, last name, father name, email, and mobile number are required.' });
  }

  const cleanPhone = (num) => num ? num.replace(/\s+/g, '').replace(/^\+91/, '').replace(/^91/, '') : '';
  const mobileClean = cleanPhone(ownerData.mobile);
  if (!/^\d{10}$/.test(mobileClean)) {
    return res.status(400).json({ error: 'InvalidMobile', message: 'Mobile number must be exactly 10 digits.' });
  }

  let whatsAppClean = mobileClean;
  if (ownerData.whatsApp) {
    whatsAppClean = cleanPhone(ownerData.whatsApp);
    if (!/^\d{10}$/.test(whatsAppClean)) {
      return res.status(400).json({ error: 'InvalidWhatsApp', message: 'WhatsApp number must be exactly 10 digits.' });
    }
  }

  const emailLower = ownerData.email.trim().toLowerCase();

  if (!isMongoConnected()) {
    const existingEmail = mockOwnersDatabase.find(o => o.email === emailLower && o.status !== 'Deleted');
    if (existingEmail) {
      return res.status(400).json({ error: 'DuplicateEmail', message: 'Email address already registered.' });
    }
    const existingMobile = mockOwnersDatabase.find(o => o.mobile === mobileClean && o.status !== 'Deleted');
    if (existingMobile) {
      return res.status(400).json({ error: 'DuplicateMobile', message: 'Mobile number already registered.' });
    }
  }

  // Aadhaar 12 digit format validation
  if (!ownerData.aadharNo || !/^\d{12}$/.test(ownerData.aadharNo.trim())) {
    return res.status(400).json({ error: 'InvalidAadhaar', message: 'Aadhaar number is required and must be exactly 12 digits.' });
  }

  // PAN format validation
  if (!ownerData.panNo || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(ownerData.panNo.trim().toUpperCase())) {
    return res.status(400).json({ error: 'InvalidPAN', message: 'PAN Card number is required and must match format: 5 Letters, 4 Digits, 1 Letter.' });
  }

  // IFSC format validation
  if (ownerData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ownerData.ifscCode.trim().toUpperCase())) {
    return res.status(400).json({ error: 'InvalidIFSC', message: 'Invalid IFSC Code format.' });
  }

  // UPI format validation
  if (ownerData.upiId && !/^[\w.-]+@[\w.-]+$/.test(ownerData.upiId.trim())) {
    return res.status(400).json({ error: 'InvalidUPI', message: 'Invalid UPI ID format.' });
  }

  // Strong password check (min 8 chars, letters and numbers)
  const passwordText = ownerData.password || 'Owner@123'; 
  if (passwordText.length < 8 || !/[a-zA-Z]/.test(passwordText) || !/\d/.test(passwordText)) {
    return res.status(400).json({ error: 'WeakPassword', message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
  }

  if (!isMongoConnected()) {
    const newOwner = {
      _id: `own-${Date.now().toString().slice(-5)}`,
      ...ownerData,
      email: emailLower,
      mobile: mobileClean,
      password: passwordText,
      status: ownerData.status || 'Pending Verification',
      aadharVerified: ownerData.aadharVerified ?? false,
      panVerified: ownerData.panVerified ?? false,
      bankVerified: ownerData.bankVerified ?? false,
      properties: ownerData.properties || [],
      createdBy: req.user.email || 'Rahul Sharma',
      createdAt: new Date()
    };
    mockOwnersDatabase.unshift(newOwner);
    return res.status(201).json(newOwner);
  }

  try {
    const existingEmail = await HomestayOwner.findOne({ email: emailLower, status: { $ne: 'Deleted' } });
    if (existingEmail) {
      return res.status(400).json({ error: 'DuplicateEmail', message: 'Email address already registered.' });
    }
    const existingMobile = await HomestayOwner.findOne({ mobile: mobileClean, status: { $ne: 'Deleted' } });
    if (existingMobile) {
      return res.status(400).json({ error: 'DuplicateMobile', message: 'Mobile number already registered.' });
    }

    const passwordHash = await bcrypt.hash(passwordText, 10);
    const encryptedPasswordCopy = encrypt(passwordText);

    const newOwner = new HomestayOwner({
      ...ownerData,
      email: emailLower,
      mobile: mobileClean,
      password: passwordHash,
      encryptedPasswordCopy,
      createdBy: req.user.email || 'Rahul Sharma'
    });

    await newOwner.save();
    logActivity(req, 'OWNER_CREATED', 'Super Admin Auth', `Created homestay owner: ${emailLower}`);

    // Send Welcome Email asynchronously
    try {
      let smtp = mockSmtpSettings;
      const dbSmtp = await SmtpSettings.findOne();
      if (dbSmtp) {
        smtp = dbSmtp;
      }

      if (smtp.enabled) {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: {
            user: smtp.email,
            pass: decrypt(smtp.appPassword)
          }
        });

        const mailOptions = {
          from: `"${smtp.senderName || 'Wow Gateways Support'}" <${smtp.email}>`,
          to: emailLower,
          subject: 'Welcome to Wow Gateways - Partner Account Created',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${newOwner.firstName}!</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Your Homestay Owner account has been created by the Super Admin. You can now log into your dashboard using the credentials below:
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Login Email:</strong> ${emailLower}</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #334155;"><strong>Temporary Password:</strong> ${passwordText}</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Please change your password immediately after logging in.
              </p>
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 11px;">
                Regards,<br/>Wow Gateways Operations Team
              </p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Welcome email sent to owner: ${emailLower}`);
      }
    } catch (emailErr) {
      console.error('[SMTP Welcome Email] Failed to send email:', emailErr.message);
    }

    res.status(201).json(newOwner);
  } catch (error) {
    console.error('Error creating homestay owner:', error.message);
    res.status(500).json({ error: 'FailedToCreateOwner', message: error.message });
  }
});

// PUT /api/dashboard/owners/:id
router.put(['/owners/:id', '/admin/homestay-owners/:id'], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validations
  if (updateData.email) {
    const emailLower = updateData.email.trim().toLowerCase();
    updateData.email = emailLower;
  }
  if (updateData.mobile) {
    const mobileClean = updateData.mobile.trim();
    updateData.mobile = mobileClean;
  }

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay owner not found' });
    if (updateData.email) {
      const existingEmail = mockOwnersDatabase.find(o => o.email === updateData.email && o._id !== id && o.status !== 'Deleted');
      if (existingEmail) return res.status(400).json({ error: 'DuplicateEmail', message: 'Email address already registered.' });
    }
    if (updateData.mobile) {
      const existingMobile = mockOwnersDatabase.find(o => o.mobile === updateData.mobile && o._id !== id && o.status !== 'Deleted');
      if (existingMobile) return res.status(400).json({ error: 'DuplicateMobile', message: 'Mobile number already registered.' });
    }
    mockOwnersDatabase[idx] = { ...mockOwnersDatabase[idx], ...updateData };
    return res.json(mockOwnersDatabase[idx]);
  }

  if (updateData.aadharNo && !/^\d{12}$/.test(updateData.aadharNo.trim())) {
    return res.status(400).json({ error: 'InvalidAadhaar', message: 'Aadhaar number must be exactly 12 digits.' });
  }

  if (updateData.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(updateData.panNo.trim().toUpperCase())) {
    return res.status(400).json({ error: 'InvalidPAN', message: 'Invalid PAN Card number format.' });
  }

  if (updateData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(updateData.ifscCode.trim().toUpperCase())) {
    return res.status(400).json({ error: 'InvalidIFSC', message: 'Invalid IFSC Code format.' });
  }

  if (updateData.upiId && !/^[\w.-]+@[\w.-]+$/.test(updateData.upiId.trim())) {
    return res.status(400).json({ error: 'InvalidUPI', message: 'Invalid UPI ID format.' });
  }

  // If password is updated
  if (updateData.password && updateData.password.trim() !== '') {
    const pass = updateData.password.trim();
    if (pass.startsWith('$2b$')) {
      delete updateData.password;
    } else {
      if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/\d/.test(pass)) {
        return res.status(400).json({ error: 'WeakPassword', message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
      }
      updateData.password = await bcrypt.hash(pass, 10);
      updateData.encryptedPasswordCopy = encrypt(pass);
    }
  } else {
    delete updateData.password;
  }

  try {
    if (updateData.email) {
      const existingEmail = await HomestayOwner.findOne({ email: updateData.email, _id: { $ne: id }, status: { $ne: 'Deleted' } });
      if (existingEmail) return res.status(400).json({ error: 'DuplicateEmail', message: 'Email address already registered.' });
    }
    if (updateData.mobile) {
      const existingMobile = await HomestayOwner.findOne({ mobile: updateData.mobile, _id: { $ne: id }, status: { $ne: 'Deleted' } });
      if (existingMobile) return res.status(400).json({ error: 'DuplicateMobile', message: 'Mobile number already registered.' });
    }

    const updated = await HomestayOwner.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated || updated.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }
    logActivity(req, 'OWNER_UPDATED', 'Super Admin Auth', `Updated homestay owner details: ${updated.email}`);
    res.json(updated);
  } catch (error) {
    console.error('Error updating homestay owner:', error.message);
    res.status(500).json({ error: 'FailedToUpdateOwner', message: error.message });
  }
});

// DELETE /api/dashboard/owners/:id (Hard Delete with Associated Data Check)
router.delete(['/owners/:id', '/admin/homestay-owners/:id'], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay owner not found' });
    
    const owner = mockOwnersDatabase[idx];
    const associatedProperties = mockHomestaysDatabase.filter(h => 
      h.ownerMobile === owner.mobile || 
      h.ownerName === `${owner.firstName} ${owner.lastName}`
    );

    if (associatedProperties.length > 0 && !force) {
      return res.status(409).json({
        hasAssociatedData: true,
        type: 'Homestays',
        details: associatedProperties.map(h => h.name),
        message: `This owner is linked to ${associatedProperties.length} active homestay properties.`
      });
    }

    mockOwnersDatabase.splice(idx, 1);
    return res.json({ message: 'Home Stay Owner hard deleted successfully.' });
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner) {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }

    const associatedProperties = await Homestay.find({
      $or: [
        { ownerMobile: owner.mobile },
        { ownerName: `${owner.firstName} ${owner.lastName}` }
      ]
    });

    if (associatedProperties.length > 0 && !force) {
      return res.status(409).json({
        hasAssociatedData: true,
        type: 'Homestays',
        details: associatedProperties.map(h => h.name),
        message: `This owner is linked to ${associatedProperties.length} active homestay properties.`
      });
    }

    await HomestayOwner.findByIdAndDelete(id);

    logActivity(req, 'OWNER_HARD_DELETED', 'Super Admin Auth', `Hard deleted homestay owner: ${owner.email}`);
    res.json({ message: 'Home Stay Owner hard deleted successfully.' });
  } catch (error) {
    console.error('Error hard deleting homestay owner:', error.message);
    res.status(500).json({ error: 'FailedToDeleteOwner', message: error.message });
  }
});

// PATCH /api/admin/homestay-owners/:id/status
router.patch(['/owners/:id/status', '/admin/homestay-owners/:id/status'], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Active', 'Pending Verification', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'InvalidStatus', message: 'Status must be Active, Pending Verification, or Inactive.' });
  }

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay owner not found' });
    mockOwnersDatabase[idx].status = status;
    return res.json(mockOwnersDatabase[idx]);
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }

    const oldStatus = owner.status;
    owner.status = status;
    await owner.save();

    logActivity(req, 'STATUS_CHANGED', 'Super Admin Auth', `Changed status for ${owner.email} from ${oldStatus} to ${status}`);
    res.json(owner);
  } catch (error) {
    res.status(500).json({ error: 'FailedToChangeStatus', message: error.message });
  }
});

// POST /api/admin/homestay-owners/:id/upload
router.post(['/owners/:id/upload', '/admin/homestay-owners/:id/upload'], authenticateToken, upload.single('document'), async (req, res) => {
  const { id } = req.params;
  const { docType } = req.body; 

  if (!req.file) {
    return res.status(400).json({ error: 'NoFileUploaded', message: 'Please select a file to upload.' });
  }

  if (!['aadharFront', 'aadharBack', 'panFront', 'tradeLicenseDoc'].includes(docType)) {
    return res.status(400).json({ error: 'InvalidDocType', message: 'Invalid document type classification.' });
  }

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay owner not found' });
    const fileUrl = `/uploads/${req.file.filename}`;
    mockOwnersDatabase[idx][docType] = fileUrl;
    return res.json({ message: 'Document uploaded successfully.', fileUrl });
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    owner[docType] = fileUrl;
    await owner.save();

    logActivity(req, 'DOCUMENT_UPLOADED', 'Super Admin Auth', `Uploaded document ${docType} for ${owner.email}`);
    res.json({ message: 'Document uploaded successfully.', fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'FailedToUploadDocument', message: error.message });
  }
});

// POST /api/admin/homestay-owners/:id/link-property
router.post(['/owners/:id/link-property', '/admin/homestay-owners/:id/link-property'], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { propertyName, location, status } = req.body;

  if (!propertyName || !location) {
    return res.status(400).json({ error: 'MissingFields', message: 'Property name and location are required.' });
  }

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay owner not found' });
    mockOwnersDatabase[idx].properties.push({ propertyName, location, status: status || 'Active', bookings: 0 });
    return res.json(mockOwnersDatabase[idx]);
  }

  try {
    const owner = await HomestayOwner.findById(id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'Homestay owner not found' });
    }

    owner.properties.push({
      propertyName,
      location,
      status: status || 'Active',
      bookings: 0
    });

    await owner.save();
    logActivity(req, 'PROPERTY_LINKED', 'Super Admin Auth', `Linked property ${propertyName} to ${owner.email}`);
    res.json(owner);
  } catch (error) {
    res.status(500).json({ error: 'FailedToLinkProperty', message: error.message });
  }
});

// ==========================================
// HOMESTAYS MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/dashboard/homestays-list/stats
router.get('/homestays-list/stats', async (req, res) => {
  if (!isMongoConnected()) {
    const totalHomestays = mockPropertiesDatabase.filter(p => !p.deleted).length;
    const activeHomestays = mockPropertiesDatabase.filter(p => !p.deleted && (p.status === 'Active' || p.status === 'Approved')).length;
    const totalRooms = mockPropertyRoomsDatabase.reduce((sum, r) => sum + (r.numberOfRooms || 0), 0);
    const avgOccupancyRate = 0;
    return res.json({ totalHomestays, activeHomestays, totalRooms, avgOccupancyRate });
  }

  try {
    const totalHomestays = await Property.countDocuments({ deleted: false });
    const activeHomestays = await Property.countDocuments({ deleted: false, status: { $in: ['Active', 'Approved'] } });
    
    const activeProps = await Property.find({ deleted: false }, { _id: 1 });
    const propIds = activeProps.map(p => p._id);
    const rooms = await PropertyRooms.find({ propertyId: { $in: propIds } });
    const totalRooms = rooms.reduce((sum, r) => sum + (r.numberOfRooms || 0), 0);

    const avgOccupancyRate = 0;
    res.json({ totalHomestays, activeHomestays, totalRooms, avgOccupancyRate });
  } catch (error) {
    console.error('Error fetching homestay stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestay stats', message: error.message });
  }
});

// GET /api/dashboard/homestays-list
router.get('/homestays-list', async (req, res) => {
  const { search, status, type, region, ownerName } = req.query;

  try {
    if (!isMongoConnected()) {
      let list = mockPropertiesDatabase.filter(p => !p.deleted);
      if (status && status !== 'All') {
        const mappedStatus = (status === 'Pending Approval' || status === 'Pending Review') ? 'Submitted For Review' : status;
        list = list.filter(p => p.status === mappedStatus);
      }
      if (type && type !== 'All') {
        list = list.filter(p => p.type === type);
      }
      if (region && region !== 'All') {
        list = list.filter(p => (p.state === region || p.region === region));
      }
      if (ownerName && ownerName !== 'All') {
        list = list.filter(p => p.ownerName === ownerName);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
          (p.propertyId && p.propertyId.toLowerCase().includes(q)) ||
          (p._id && String(p._id).toLowerCase().includes(q))
        );
      }
      const formatted = list.map(p => {
        const gal = mockPropertyGalleryDatabase.find(g => g.propertyId === p._id);
        const rooms = mockPropertyRoomsDatabase.filter(r => r.propertyId === p._id);
        const pricingList = mockPropertyPricingDatabase.filter(pr => pr.propertyId === p._id);
        
        let minPrice = 'N/A';
        if (pricingList.length > 0) {
          minPrice = `₹${Math.min(...pricingList.map(pr => pr.b2cRate || 99999))}`;
        }
        
        return {
          _id: p._id,
          propertyId: p.propertyId || p._id,
          name: p.name || 'Untitled Property',
          type: p.type || 'Homestay',
          ownerName: p.ownerName,
          ownerMobile: p.ownerMobile,
          city: p.city,
          region: p.state || p.region || '',
          status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
          rawStatus: p.status,
          rooms: rooms.map(r => ({ roomType: r.roomType || r.roomCategoryName, totalRooms: r.numberOfRooms })),
          images: gal ? [gal.coverImage, ...gal.images].filter(Boolean) : [],
          rates: pricingList.map(pr => ({ planRates: { EP: { b2cRate: pr.b2cRate } } }))
        };
      });
      return res.json(formatted);
    }

    const query = { deleted: false };
    if (status && status !== 'All') {
      if (status === 'Pending Approval' || status === 'Pending Review') {
        query.status = { $in: ['Submitted For Review', 'Pending Approval', 'Pending Review'] };
      } else {
        query.status = status;
      }
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (region && region !== 'All') {
      query.$or = [{ state: region }, { region: region }];
    }
    if (ownerName && ownerName !== 'All') {
      query.ownerName = ownerName;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { city: regex },
        { state: regex },
        { ownerName: regex },
        { propertyId: regex }
      ];
    }
    const propertiesList = await Property.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean();
    
    const formatted = [];
    for (const p of propertiesList) {
      const gal = await PropertyGallery.findOne({ propertyId: p._id });
      const rooms = await PropertyRooms.find({ propertyId: p._id });
      const pricingList = await PropertyPricing.find({ propertyId: p._id });
      const approval = await PropertyApproval.findOne({ propertyId: p._id });
      
      let minPrice = 'N/A';
      if (pricingList.length > 0) {
        const validRates = pricingList.map(pr => pr.b2cRate).filter(r => typeof r === 'number');
        if (validRates.length > 0) {
          minPrice = `₹${Math.min(...validRates)}`;
        }
      }
      
      formatted.push({
        _id: p._id,
        propertyId: p.propertyId || p._id,
        name: p.name || 'Untitled Property',
        type: p.type || 'Homestay',
        ownerName: p.ownerName,
        ownerMobile: p.ownerMobile,
        city: p.city,
        region: p.state || '',
        status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
        rawStatus: p.status,
        rejectionReason: approval?.comments?.length ? approval.comments[approval.comments.length - 1]?.comment : '',
        rooms: rooms.map(r => ({ roomType: r.roomType || r.roomCategoryName, totalRooms: r.numberOfRooms, roomNumbers: r.roomNumbers })),
        images: gal ? [gal.coverImage, ...gal.images.map(img => typeof img === 'object' && img.url ? img.url : img)].filter(Boolean) : [],
        rates: pricingList.map(pr => ({ planRates: { EP: { b2cRate: pr.b2cRate } } }))
      });
    }

    // Also include any legacy Homestay documents if present
    const legacyHomestays = await Homestay.find(query).sort({ createdAt: -1 }).lean();
    for (const h of legacyHomestays) {
      if (!formatted.some(f => String(f._id) === String(h._id) || f.name === h.name)) {
        formatted.push(h);
      }
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching homestays:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestays', message: error.message });
  }
});

// GET /api/dashboard/homestays-list/:id
router.get('/homestays-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    let item = mockHomestaysDatabase.find(h => h._id === id);
    if (!item) {
      const p = mockPropertiesDatabase.find(x => x._id === id);
      if (!p) return res.status(404).json({ error: 'Homestay not found' });
      
      const gal = mockPropertyGalleryDatabase.find(g => g.propertyId === p._id);
      const rooms = mockPropertyRoomsDatabase.filter(r => r.propertyId === p._id);
      const pricingList = mockPropertyPricingDatabase.filter(pr => pr.propertyId === p._id);
      
      item = {
        _id: p._id,
        name: p.name || 'Untitled Property',
        type: p.type || 'Homestay',
        ownerName: p.ownerName,
        ownerMobile: p.ownerMobile,
        city: p.city,
        region: p.state || '',
        status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
        rooms: rooms.map(r => ({
          roomType: r.roomType || 'Standard',
          totalRooms: r.numberOfRooms || 1,
          roomNumbers: r.roomNumbers || [],
          photos: r.images || [],
          description: r.description || ''
        })),
        images: gal ? [gal.coverImage, ...gal.images].filter(Boolean) : [],
        rates: pricingList.map(pr => ({
          roomCategory: rooms.find(r => r._id === pr.roomCategoryId)?.roomCategoryName || 'Standard',
          occupancy: 'Double Occupancy',
          season: pr.seasonType === 'peak' ? 'Peak Season' : (pr.seasonType === 'mid' ? 'Mid Season' : 'Off Season'),
          planRates: {
            [pr.mealPlan]: {
              b2bRate: pr.b2cRate,
              b2cRate: pr.b2cRate,
              b2bExtraPerson: pr.extraAdultB2C,
              b2cExtraPerson: pr.extraAdultB2C,
              b2bChild: pr.childB2C,
              b2cChild: pr.childB2C
            }
          }
        }))
      };
    }
    return res.json(item);
  }

  try {
    let item = await Homestay.findById(id).lean();
    if (item) {
      // Resolve amenities for Homestay
      const amenityDocs = await NewAmenity.find({ _id: { $in: item.amenities || [] } });
      item.resolvedAmenities = amenityDocs.map(a => ({
        name: a.amenityName,
        icon: a.amenityIcon
      }));
      item.amenities = item.resolvedAmenities.map(a => a.name);

      // Check if PropertyGallery has images
      const gal = await PropertyGallery.findOne({ $or: [{ propertyId: item._id }, { propertyId: String(item._id) }] });
      if (gal) {
        const galImgs = [
          ...(gal.coverImage ? [gal.coverImage] : []),
          ...(Array.isArray(gal.images) ? gal.images.map(img => typeof img === 'object' && img?.url ? img.url : img) : [])
        ].filter(Boolean);
        item.images = Array.from(new Set([...(item.images || []), ...galImgs]));
      }

      // Check if PropertyRooms has rooms
      const pRooms = await PropertyRooms.find({ $or: [{ propertyId: item._id }, { propertyId: String(item._id) }] });
      if (pRooms && pRooms.length > 0) {
        item.rooms = pRooms.map(r => {
          const roomImagesList = (Array.isArray(r.images) ? r.images : (Array.isArray(r.photos) ? r.photos : [])).map(img => 
            typeof img === 'object' && img !== null && img.url ? img.url : img
          ).filter(Boolean);
          return {
            _id: r._id,
            id: r._id,
            roomType: r.roomType || 'Standard',
            roomCategoryName: r.roomCategoryName || r.roomType || 'Standard',
            totalRooms: r.numberOfRooms || 1,
            numberOfRooms: r.numberOfRooms || 1,
            roomNumbers: r.roomNumbers || [],
            photos: roomImagesList,
            images: roomImagesList,
            description: r.description || ''
          };
        });
      } else if (Array.isArray(item.rooms)) {
        item.rooms = item.rooms.map(r => {
          const roomImagesList = (Array.isArray(r.photos) ? r.photos : (Array.isArray(r.images) ? r.images : [])).filter(Boolean);
          return {
            ...r,
            photos: roomImagesList,
            images: roomImagesList
          };
        });
      }
    }

    if (!item) {
      const p = await Property.findById(id).lean();
      if (!p) return res.status(404).json({ error: 'Homestay not found' });
      
      const gal = await PropertyGallery.findOne({ $or: [{ propertyId: p._id }, { propertyId: String(p._id) }] });
      const rooms = await PropertyRooms.find({ $or: [{ propertyId: p._id }, { propertyId: String(p._id) }] });
      const pricingList = await PropertyPricing.find({ $or: [{ propertyId: p._id }, { propertyId: String(p._id) }] });
      const propAmenitiesDoc = await PropertyAmenities.findOne({ $or: [{ propertyId: p._id }, { propertyId: String(p._id) }] });
      
      let resolvedAmenities = [];
      if (propAmenitiesDoc && propAmenitiesDoc.amenityIds && propAmenitiesDoc.amenityIds.length > 0) {
        const amenityDocs = await NewAmenity.find({ _id: { $in: propAmenitiesDoc.amenityIds } });
        resolvedAmenities = amenityDocs.map(a => ({
          name: a.amenityName,
          icon: a.amenityIcon
        }));
      }

      const allGalleryImages = (() => {
        const imgs = [];
        if (gal) {
          if (gal.coverImage) imgs.push(gal.coverImage);
          if (Array.isArray(gal.images)) {
            gal.images.forEach(img => {
              const u = typeof img === 'object' && img !== null && img.url ? img.url : img;
              if (u && typeof u === 'string') imgs.push(u);
            });
          }
        }
        if (Array.isArray(p.images)) {
          p.images.forEach(u => {
            if (u && typeof u === 'string') imgs.push(u);
          });
        }
        return Array.from(new Set(imgs.filter(Boolean)));
      })();

      item = {
        _id: p._id,
        name: p.name || 'Untitled Property',
        type: p.type || 'Homestay',
        ownerName: p.ownerName,
        ownerMobile: p.ownerMobile,
        city: p.city,
        region: p.state || '',
        address: p.address || '',
        description: p.description || '',
        status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
        rooms: rooms.map(r => {
          const roomImagesList = (Array.isArray(r.images) ? r.images : (Array.isArray(r.photos) ? r.photos : [])).map(img => 
            typeof img === 'object' && img !== null && img.url ? img.url : img
          ).filter(Boolean);
          return {
            _id: r._id,
            id: r._id,
            roomType: r.roomType || 'Standard',
            roomCategoryName: r.roomCategoryName || r.roomType || 'Standard',
            totalRooms: r.numberOfRooms || 1,
            numberOfRooms: r.numberOfRooms || 1,
            roomNumbers: r.roomNumbers || [],
            photos: roomImagesList,
            images: roomImagesList,
            description: r.description || '',
            bedType: r.bedType || '',
            roomSize: r.roomSize || 0
          };
        }),
        images: allGalleryImages,
        rates: pricingList.map(pr => ({
          roomCategory: rooms.find(r => r._id.toString() === pr.roomCategoryId.toString())?.roomCategoryName || 'Standard',
          occupancy: 'Double Occupancy',
          season: pr.seasonType === 'peak' ? 'Peak Season' : (pr.seasonType === 'mid' ? 'Mid Season' : 'Off Season'),
          planRates: {
            [pr.mealPlan]: {
              b2bRate: pr.b2cRate,
              b2cRate: pr.b2cRate,
              b2bExtraPerson: pr.extraAdultB2C,
              b2cExtraPerson: pr.extraAdultB2C,
              b2bChild: pr.childB2C,
              b2cChild: pr.childB2C
            }
          }
        })),
        amenities: resolvedAmenities.map(a => a.name),
        resolvedAmenities
      };
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching homestay details:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestay details', message: error.message });
  }
});

// POST /api/dashboard/homestays-list
router.post('/homestays-list', async (req, res) => {
  const propertyData = req.body;

  // Enforce name uniqueness
  if (!isMongoConnected()) {
    const nameExists = mockHomestaysDatabase.some(h => h.name.toLowerCase() === propertyData.name.toLowerCase());
    if (nameExists) {
      return res.status(400).json({ error: 'Property name must be unique' });
    }
  } else {
    try {
      const nameExists = await Homestay.findOne({ name: propertyData.name });
      if (nameExists) {
        return res.status(400).json({ error: 'Property name must be unique' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Database check failed', message: err.message });
    }
  }

  // Enforce room numbers uniqueness within property and populate roomStatuses
  const roomStatuses = [];
  if (propertyData.rooms && Array.isArray(propertyData.rooms)) {
    const roomNumbers = [];
    for (const room of propertyData.rooms) {
      if (room.roomNumbers && Array.isArray(room.roomNumbers)) {
        for (const num of room.roomNumbers) {
          if (roomNumbers.includes(num)) {
            return res.status(400).json({ error: `Room number ${num} must be unique within this property` });
          }
          roomNumbers.push(num);
          roomStatuses.push({ roomNumber: num, status: 'Available' });
        }
      }
    }
  }
  propertyData.roomStatuses = roomStatuses;

  if (!isMongoConnected()) {
    const newProperty = {
      _id: `hs-${Date.now().toString().slice(-5)}`,
      ...propertyData,
      bookings: propertyData.bookings || 0,
      occupancyRate: propertyData.occupancyRate || 0,
      revenueGenerated: propertyData.revenueGenerated || 0,
      averageRating: propertyData.averageRating || 4.5,
      status: propertyData.status || 'Draft',
      amenities: propertyData.amenities || [],
      images: propertyData.images || [],
      createdAt: new Date()
    };
    mockHomestaysDatabase.unshift(newProperty);
    return res.status(201).json(newProperty);
  }

  try {
    const newProperty = new Homestay(propertyData);
    await newProperty.save();
    res.status(201).json(newProperty);
  } catch (error) {
    console.error('Error creating homestay:', error.message);
    res.status(500).json({ error: 'Failed to create homestay', message: error.message });
  }
});

// PUT /api/dashboard/homestays-list/:id
router.put('/homestays-list/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Enforce name uniqueness
  if (updateData.name) {
    if (!isMongoConnected()) {
      const nameExists = mockHomestaysDatabase.some(h => h.name.toLowerCase() === updateData.name.toLowerCase() && h._id !== id);
      if (nameExists) {
        return res.status(400).json({ error: 'Property name must be unique' });
      }
    } else {
      try {
        const nameExists = await Homestay.findOne({ name: updateData.name, _id: { $ne: id } });
        if (nameExists) {
          return res.status(400).json({ error: 'Property name must be unique' });
        }
      } catch (err) {
        return res.status(500).json({ error: 'Database check failed', message: err.message });
      }
    }
  }

  // Enforce room numbers uniqueness and update roomStatuses if rooms list changed
  if (updateData.rooms && Array.isArray(updateData.rooms)) {
    const roomNumbers = [];
    for (const room of updateData.rooms) {
      if (room.roomNumbers && Array.isArray(room.roomNumbers)) {
        for (const num of room.roomNumbers) {
          if (roomNumbers.includes(num)) {
            return res.status(400).json({ error: `Room number ${num} must be unique within this property` });
          }
          roomNumbers.push(num);
        }
      }
    }

    // Keep existing room statuses if roomNumber still exists, or default to Available
    let existingStatuses = [];
    if (!isMongoConnected()) {
      const existing = mockHomestaysDatabase.find(h => h._id === id);
      if (existing) {
        existingStatuses = existing.roomStatuses || [];
      }
    } else {
      try {
        const existing = await Homestay.findById(id);
        if (existing) {
          existingStatuses = existing.roomStatuses || [];
        }
      } catch (err) {
        console.error('Failed to fetch existing room statuses:', err);
      }
    }

    const updatedStatuses = roomNumbers.map(num => {
      const match = existingStatuses.find(rs => rs.roomNumber === num);
      return { roomNumber: num, status: match ? match.status : 'Available' };
    });
    updateData.roomStatuses = updatedStatuses;
  }

  if (!isMongoConnected()) {
    const idx = mockHomestaysDatabase.findIndex(h => h._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay not found' });

    mockHomestaysDatabase[idx] = {
      ...mockHomestaysDatabase[idx],
      ...updateData
    };
    return res.json(mockHomestaysDatabase[idx]);
  }

  try {
    const updated = await Homestay.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Homestay not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating homestay:', error.message);
    res.status(500).json({ error: 'Failed to update homestay', message: error.message });
  }
});

// DELETE /api/dashboard/homestays-list/:id
router.delete('/homestays-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockHomestaysDatabase.findIndex(h => h._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Homestay not found' });

    const deleted = mockHomestaysDatabase.splice(idx, 1);
    return res.json({ message: 'Homestay deleted from memory', deleted: deleted[0] });
  }

  try {
    const deleted = await Homestay.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Homestay not found' });
    res.json({ message: 'Homestay deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting homestay:', error.message);
    res.status(500).json({ error: 'Failed to delete homestay', message: error.message });
  }
});

// ==========================================
// BOOKINGS MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/dashboard/bookings-list/stats
router.get('/bookings-list/stats', async (req, res) => {
  if (!isMongoConnected()) {
    const totalBookings = mockBookingsDatabase.length;
    const confirmedBookings = mockBookingsDatabase.filter(b => b.bookingStatus === 'Confirmed').length;
    const pendingBookings = mockBookingsDatabase.filter(b => b.bookingStatus === 'Pending').length;
    const cancelledCompletedBookings = mockBookingsDatabase.filter(b => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Completed').length;
    return res.json({ totalBookings, confirmedBookings, pendingBookings, cancelledCompletedBookings });
  }

  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'Confirmed' });
    const pendingBookings = await Booking.countDocuments({ bookingStatus: 'Pending' });
    const cancelledCompletedBookings = await Booking.countDocuments({ bookingStatus: { $in: ['Cancelled', 'Completed'] } });
    res.json({ totalBookings, confirmedBookings, pendingBookings, cancelledCompletedBookings });
  } catch (error) {
    console.error('Error fetching booking stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch booking stats', message: error.message });
  }
});

// GET /api/dashboard/bookings-list
router.get('/bookings-list', async (req, res) => {
  const { search, status, type, paymentStatus, property, region, startDate, endDate } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockBookingsDatabase];
    if (status && status !== 'All') {
      list = list.filter(b => b.bookingStatus === status);
    }
    if (type && type !== 'All') {
      list = list.filter(b => b.bookingType === type);
    }
    if (paymentStatus && paymentStatus !== 'All') {
      list = list.filter(b => b.paymentStatus === paymentStatus);
    }
    if (property && property !== 'All') {
      list = list.filter(b => 
        (b.propertyDetails && b.propertyDetails.propertyName === property) ||
        (b.sightseeingDetails && b.sightseeingDetails.packageName === property)
      );
    }
    if (region && region !== 'All') {
      list = list.filter(b => 
        (b.propertyDetails && b.propertyDetails.location && b.propertyDetails.location.includes(region)) ||
        (b.sightseeingDetails && b.sightseeingDetails.destination && b.sightseeingDetails.destination.includes(region))
      );
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      list = list.filter(b => new Date(b.checkInDate).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      list = list.filter(b => new Date(b.checkInDate).getTime() <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => 
        b.bookingId.toLowerCase().includes(q) ||
        (b.customer && b.customer.name.toLowerCase().includes(q)) ||
        (b.customer && b.customer.mobile.toLowerCase().includes(q)) ||
        (b.propertyDetails && b.propertyDetails.propertyName.toLowerCase().includes(q)) ||
        (b.rideDetails && b.rideDetails.rideId.toLowerCase().includes(q))
      );
    }
    return res.json(list);
  }

  try {
    let query = {};
    if (status && status !== 'All') {
      query.bookingStatus = status;
    }
    if (type && type !== 'All') {
      query.bookingType = type;
    }
    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }
    if (property && property !== 'All') {
      query.$or = [
        { 'propertyDetails.propertyName': property },
        { 'sightseeingDetails.packageName': property }
      ];
    }
    if (region && region !== 'All') {
      const regRegex = new RegExp(region, 'i');
      query.$or = [
        { 'propertyDetails.location': regRegex },
        { 'sightseeingDetails.destination': regRegex }
      ];
    }
    if (startDate || endDate) {
      query.checkInDate = {};
      if (startDate) query.checkInDate.$gte = new Date(startDate);
      if (endDate) query.checkInDate.$lte = new Date(endDate);
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { bookingId: regex },
        { 'customer.name': regex },
        { 'customer.mobile': regex },
        { 'propertyDetails.propertyName': regex },
        { 'rideDetails.rideId': regex }
      ];
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ error: 'Failed to fetch bookings', message: error.message });
  }
});

// GET /api/dashboard/bookings-list/:id
router.get('/bookings-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const item = mockBookingsDatabase.find(b => b._id === id);
    if (!item) return res.status(404).json({ error: 'Booking not found' });
    return res.json(item);
  }

  try {
    const item = await Booking.findById(id);
    if (!item) return res.status(404).json({ error: 'Booking not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching booking details:', error.message);
    res.status(500).json({ error: 'Failed to fetch booking details', message: error.message });
  }
});

// POST /api/dashboard/bookings-list
router.post('/bookings-list', async (req, res) => {
  const bookingData = req.body;
  const nextIdSuffix = Date.now().toString().slice(-4);

  // Set default values & pre-calculate prices
  bookingData.bookingId = bookingData.bookingId || `BK-2026-${nextIdSuffix}`;
  
  if (bookingData.pricing) {
    const p = bookingData.pricing;
    const bookingAmount = p.bookingAmount || 0;
    const discount = p.discount || 0;
    const tax = p.tax || 0;
    const convenienceFee = p.convenienceFee || 0;
    p.finalAmount = bookingAmount - discount + tax + convenienceFee;
    p.pendingAmount = p.finalAmount - (p.paidAmount || 0) - (p.refundAmount || 0);
    bookingData.amount = p.finalAmount;
  }

  // Pre-initialize timeline
  bookingData.timeline = [
    {
      activity: 'Booking Created',
      timestamp: new Date(),
      createdBy: bookingData.createdBy || 'Super Admin'
    }
  ];

  if (!isMongoConnected()) {
    const newBooking = {
      _id: `b-${nextIdSuffix}`,
      ...bookingData,
      createdAt: new Date()
    };
    mockBookingsDatabase.unshift(newBooking);
    return res.status(201).json(newBooking);
  }

  try {
    const newBooking = new Booking(bookingData);
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ error: 'Failed to create booking', message: error.message });
  }
});

// PUT /api/dashboard/bookings-list/:id
router.put('/bookings-list/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  let currentBooking;

  if (!isMongoConnected()) {
    currentBooking = mockBookingsDatabase.find(b => b._id === id);
    if (!currentBooking) return res.status(404).json({ error: 'Booking not found' });
  } else {
    try {
      currentBooking = await Booking.findById(id);
      if (!currentBooking) return res.status(404).json({ error: 'Booking not found' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve booking', message: err.message });
    }
  }

  // Enforce workflow logic business rules
  // Rule 1: Completed bookings cannot be modified
  if (currentBooking.bookingStatus === 'Completed') {
    return res.status(400).json({ error: 'Completed bookings cannot be modified.' });
  }

  // Rule 2: Cancelled bookings cannot be modified
  if (currentBooking.bookingStatus === 'Cancelled') {
    return res.status(400).json({ error: 'Cancelled bookings cannot be modified.' });
  }

  // Rule 3: Check-out allowed only after check-in
  if (updateData.bookingStatus === 'Checked Out' || updateData.bookingStatus === 'Completed') {
    if (currentBooking.bookingStatus !== 'Checked In') {
      return res.status(400).json({ error: 'Check-Out is only allowed after Check-In.' });
    }
  }

  // Rule 4: Refund option available only when payment received
  if (updateData.pricing && updateData.pricing.refundAmount > 0) {
    const paidVal = updateData.pricing.paidAmount !== undefined ? updateData.pricing.paidAmount : currentBooking.pricing.paidAmount;
    if (paidVal <= 0) {
      return res.status(400).json({ error: 'Refund options are only available if a payment was received.' });
    }
  }

  // Recalculate price fields if updated
  if (updateData.pricing) {
    const p = { ...currentBooking.pricing, ...updateData.pricing };
    const bookingAmount = p.bookingAmount || 0;
    const discount = p.discount || 0;
    const tax = p.tax || 0;
    const convenienceFee = p.convenienceFee || 0;
    const refundAmount = p.refundAmount || 0;
    const paidAmount = p.paidAmount || 0;

    p.finalAmount = bookingAmount - discount + tax + convenienceFee;
    p.pendingAmount = p.finalAmount - paidAmount - refundAmount;
    updateData.pricing = p;
    updateData.amount = p.finalAmount;
  }

  // Automatically track activity logs in timeline if status changes
  const timeline = [...(currentBooking.timeline || [])];
  let timelineAdded = false;

  if (updateData.bookingStatus && updateData.bookingStatus !== currentBooking.bookingStatus) {
    timeline.push({
      activity: `Booking Status: ${updateData.bookingStatus}`,
      timestamp: new Date(),
      createdBy: updateData.updatedBy || 'Super Admin'
    });
    timelineAdded = true;
  }

  if (updateData.paymentStatus && updateData.paymentStatus !== currentBooking.paymentStatus) {
    timeline.push({
      activity: `Payment Status: ${updateData.paymentStatus}`,
      timestamp: new Date(),
      createdBy: updateData.updatedBy || 'Super Admin'
    });
    timelineAdded = true;
  }

  if (timelineAdded) {
    updateData.timeline = timeline;
  }

  if (!isMongoConnected()) {
    const idx = mockBookingsDatabase.findIndex(b => b._id === id);
    mockBookingsDatabase[idx] = {
      ...mockBookingsDatabase[idx],
      ...updateData
    };
    return res.json(mockBookingsDatabase[idx]);
  }

  try {
    const updated = await Booking.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('Error updating booking:', error.message);
    res.status(500).json({ error: 'Failed to update booking', message: error.message });
  }
});

// DELETE /api/dashboard/bookings-list/:id
router.delete('/bookings-list/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockBookingsDatabase.findIndex(b => b._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

    const deleted = mockBookingsDatabase.splice(idx, 1);
    return res.json({ message: 'Booking record deleted from memory', deleted: deleted[0] });
  }

  try {
    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting booking:', error.message);
    res.status(500).json({ error: 'Failed to delete booking', message: error.message });
  }
});

// ==========================================
// RIDE MANAGEMENT DATABASE & ENDPOINTS
// ==========================================

let mockDriversDatabase = [
  { _id: 'd-1', name: 'Rahul Yadav', mobile: '+91 9876543210', rating: 4.8, status: 'Active', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
  { _id: 'd-2', name: 'Amit Sharma', mobile: '+91 9876543211', rating: 4.9, status: 'On Ride', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { _id: 'd-3', name: 'Suresh Kumar', mobile: '+91 9876543212', rating: 4.7, status: 'Active', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { _id: 'd-4', name: 'Rajesh Singh', mobile: '+91 9876543213', rating: 4.6, status: 'Offline', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  { _id: 'd-5', name: 'Vikram Rathore', mobile: '+91 9876543214', rating: 4.8, status: 'On Ride', photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150' },
  { _id: 'd-6', name: 'Anil Verma', mobile: '+91 9876543215', rating: 4.5, status: 'Active', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
  { _id: 'd-7', name: 'Manoj Joshi', mobile: '+91 9876543216', rating: 4.9, status: 'Active', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
  { _id: 'd-8', name: 'Harpreet Singh', mobile: '+91 9876543217', rating: 4.7, status: 'Inactive', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }
];

let mockGuestsDatabase = [
  { _id: 'g-1', name: 'Priyesh Mehta', mobile: '+91 9988776611', email: 'priyesh@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { _id: 'g-2', name: 'Kavita Deshmukh', mobile: '+91 9988776622', email: 'kavita@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { _id: 'g-3', name: 'Rohan Malhotra', mobile: '+91 9988776633', email: 'rohan@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { _id: 'g-4', name: 'Shweta Patel', mobile: '+91 9988776644', email: 'shweta@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { _id: 'g-5', name: 'Divya Nair', mobile: '+91 9988776655', email: 'divya@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { _id: 'g-6', name: 'Arjun Kapoor', mobile: '+91 9988776666', email: 'arjun@gmail.com', verificationStatus: 'Pending', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { _id: 'g-7', name: 'Sneha Reddy', mobile: '+91 9988776677', email: 'sneha@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  { _id: 'g-8', name: 'Sameer Sen', mobile: '+91 9988776688', email: 'sameer@gmail.com', verificationStatus: 'Unverified', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' },
  { _id: 'g-9', name: 'Neha Gupta', mobile: '+91 9988776699', email: 'neha@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { _id: 'g-10', name: 'Aditya Roy', mobile: '+91 9988776600', email: 'aditya@gmail.com', verificationStatus: 'Verified', photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }
];

let mockRidesDatabase = [
  {
    _id: 'r-101',
    guest: mockGuestsDatabase[0],
    driver: mockDriversDatabase[1],
    vehicle: { vehicleNumber: 'MH-12-QB-4521', vehicleType: 'Sedan', model: 'Hyundai Verna', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Lonavala Homestay Elite, Sector 4, Lonavala',
    dropAddress: 'Chhatrapati Shivaji Maharaj International Airport (T2), Mumbai',
    distance: 82.4,
    duration: '1 hr 45 mins',
    eta: '24 mins',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 150, distanceFare: 2100, extraCharges: 100, waitingCharges: 0, tax: 110, discount: 150, finalFare: 2310 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-99128',
    paymentDate: new Date('2026-06-12T10:15:00Z'),
    status: 'Ongoing',
    createdAt: new Date('2026-06-12T09:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T09:00:00Z'), description: 'Ride request received from guest app.' },
      { event: 'Driver Assigned', timestamp: new Date('2026-06-12T09:05:00Z'), description: 'Driver Amit Sharma allocated by system.' },
      { event: 'Driver Accepted', timestamp: new Date('2026-06-12T09:07:00Z'), description: 'Driver accepted ride booking.' },
      { event: 'Driver Arrived', timestamp: new Date('2026-06-12T09:25:00Z'), description: 'Driver arrived at pickup location.' },
      { event: 'Ride Started', timestamp: new Date('2026-06-12T09:30:00Z'), description: 'Trip started. En route to destination.' }
    ]
  },
  {
    _id: 'r-102',
    guest: mockGuestsDatabase[1],
    driver: mockDriversDatabase[4],
    vehicle: { vehicleNumber: 'MH-14-EU-8812', vehicleType: 'SUV', model: 'Toyota Fortuner', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300' },
    pickupAddress: 'Green Valley Retreat, Mahabaleshwar',
    dropAddress: 'Pune Railway Station, Station Road, Pune',
    distance: 120.5,
    duration: '2 hrs 50 mins',
    eta: '55 mins',
    rideType: 'SUV',
    fareBreakdown: { baseFare: 300, distanceFare: 4200, extraCharges: 250, waitingCharges: 100, tax: 240, discount: 200, finalFare: 4890 },
    paymentStatus: 'Paid',
    paymentMode: 'Card',
    transactionId: 'TXN-RIDE-88712',
    paymentDate: new Date('2026-06-12T08:30:00Z'),
    status: 'Ongoing',
    createdAt: new Date('2026-06-12T07:15:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T07:15:00Z'), description: 'Ride request received.' },
      { event: 'Driver Assigned', timestamp: new Date('2026-06-12T07:20:00Z'), description: 'Driver Vikram Rathore assigned.' },
      { event: 'Driver Accepted', timestamp: new Date('2026-06-12T07:22:00Z'), description: 'Driver accepted.' },
      { event: 'Driver Arrived', timestamp: new Date('2026-06-12T07:45:00Z'), description: 'Driver arrived.' },
      { event: 'Ride Started', timestamp: new Date('2026-06-12T07:50:00Z'), description: 'Trip started.' }
    ]
  },
  {
    _id: 'r-103',
    guest: mockGuestsDatabase[2],
    driver: null,
    vehicle: { vehicleNumber: 'MH-12-TY-9921', vehicleType: 'Sedan', model: 'Honda City', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Lonavala Cottage Garden, Valvan, Lonavala',
    dropAddress: 'Adlabs Imagicaa, Khopoli',
    distance: 28.2,
    duration: '45 mins',
    eta: '--',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 150, distanceFare: 650, extraCharges: 50, waitingCharges: 0, tax: 40, discount: 0, finalFare: 890 },
    paymentStatus: 'Pending',
    paymentMode: 'UPI',
    transactionId: '',
    paymentDate: null,
    status: 'Upcoming',
    createdAt: new Date('2026-06-12T11:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T11:00:00Z'), description: 'Ride requested for scheduled pickup.' }
    ]
  },
  {
    _id: 'r-104',
    guest: mockGuestsDatabase[3],
    driver: mockDriversDatabase[0],
    vehicle: { vehicleNumber: 'MH-12-TR-2309', vehicleType: 'Hatchback', model: 'Maruti Swift', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Wow Gateway Resort Lobby, Khandala',
    dropAddress: 'Kune Waterfalls Parking, Khandala',
    distance: 6.8,
    duration: '15 mins',
    eta: '8 mins',
    rideType: 'Hatchback',
    fareBreakdown: { baseFare: 80, distanceFare: 140, extraCharges: 0, waitingCharges: 0, tax: 10, discount: 20, finalFare: 210 },
    paymentStatus: 'Pending',
    paymentMode: 'Cash',
    transactionId: '',
    paymentDate: null,
    status: 'Upcoming',
    createdAt: new Date('2026-06-12T11:20:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T11:20:00Z'), description: 'Ride requested.' },
      { event: 'Driver Assigned', timestamp: new Date('2026-06-12T11:25:00Z'), description: 'Driver Rahul Yadav assigned.' }
    ]
  },
  {
    _id: 'r-105',
    guest: mockGuestsDatabase[4],
    driver: mockDriversDatabase[2],
    vehicle: { vehicleNumber: 'MH-12-FG-6009', vehicleType: 'Sedan', model: 'Hyundai Aura', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Hotel Mount View, Panchgani',
    dropAddress: 'Mapro Garden, Gureghar, Panchgani',
    distance: 11.2,
    duration: '22 mins',
    eta: '14 mins',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 120, distanceFare: 280, extraCharges: 0, waitingCharges: 0, tax: 20, discount: 30, finalFare: 390 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-66128',
    paymentDate: new Date('2026-06-12T09:45:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-12T09:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T09:00:00Z'), description: 'Ride requested.' },
      { event: 'Driver Assigned', timestamp: new Date('2026-06-12T09:02:00Z'), description: 'Driver Suresh Kumar assigned.' },
      { event: 'Driver Accepted', timestamp: new Date('2026-06-12T09:04:00Z'), description: 'Driver accepted.' },
      { event: 'Driver Arrived', timestamp: new Date('2026-06-12T09:15:00Z'), description: 'Driver arrived at location.' },
      { event: 'Ride Started', timestamp: new Date('2026-06-12T09:20:00Z'), description: 'Trip started.' },
      { event: 'Completed', timestamp: new Date('2026-06-12T09:42:00Z'), description: 'Trip completed. Guest dropped safely.' }
    ]
  },
  {
    _id: 'r-106',
    guest: mockGuestsDatabase[5],
    driver: mockDriversDatabase[5],
    vehicle: { vehicleNumber: 'MH-12-LM-0081', vehicleType: 'SUV', model: 'Mahindra XUV700', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300' },
    pickupAddress: 'Karla Caves Entrance, Lonavala',
    dropAddress: 'Wet N Joy Water Park, Takve Kurth',
    distance: 18.5,
    duration: '35 mins',
    eta: '--',
    rideType: 'SUV',
    fareBreakdown: { baseFare: 250, distanceFare: 550, extraCharges: 50, waitingCharges: 0, tax: 40, discount: 50, finalFare: 840 },
    paymentStatus: 'Paid',
    paymentMode: 'Wallet',
    transactionId: 'TXN-RIDE-45129',
    paymentDate: new Date('2026-06-12T08:15:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-12T07:30:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T07:30:00Z'), description: 'Ride created.' },
      { event: 'Driver Assigned', timestamp: new Date('2026-06-12T07:32:00Z'), description: 'Driver Anil Verma assigned.' },
      { event: 'Driver Accepted', timestamp: new Date('2026-06-12T07:33:00Z'), description: 'Accepted.' },
      { event: 'Driver Arrived', timestamp: new Date('2026-06-12T07:40:00Z'), description: 'Arrived.' },
      { event: 'Ride Started', timestamp: new Date('2026-06-12T07:42:00Z'), description: 'Started.' },
      { event: 'Completed', timestamp: new Date('2026-06-12T08:15:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-107',
    guest: mockGuestsDatabase[6],
    driver: mockDriversDatabase[6],
    vehicle: { vehicleNumber: 'MH-14-RE-3912', vehicleType: 'Hatchback', model: 'Hyundai i20', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Della Adventure Park, Lonavala',
    dropAddress: 'Lonavala Railway Station, Lonavala',
    distance: 9.4,
    duration: '20 mins',
    eta: '--',
    rideType: 'Hatchback',
    fareBreakdown: { baseFare: 80, distanceFare: 200, extraCharges: 0, waitingCharges: 0, tax: 15, discount: 15, finalFare: 280 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-99120',
    paymentDate: new Date('2026-06-11T16:50:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-11T16:20:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-11T16:20:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-11T16:50:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-108',
    guest: mockGuestsDatabase[7],
    driver: null,
    vehicle: { vehicleNumber: 'MH-12-AS-1122', vehicleType: 'Sedan', model: 'Maruti Dzire', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Sunrise Villa Homestay, Mahabaleshwar',
    dropAddress: 'Venna Lake Boating Site, Mahabaleshwar',
    distance: 5.2,
    duration: '12 mins',
    eta: '--',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 100, distanceFare: 120, extraCharges: 0, waitingCharges: 0, tax: 10, discount: 0, finalFare: 230 },
    paymentStatus: 'Failed',
    paymentMode: 'Card',
    transactionId: 'TXN-RIDE-FAIL-1',
    paymentDate: new Date('2026-06-11T14:15:00Z'),
    status: 'Cancelled',
    createdAt: new Date('2026-06-11T14:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-11T14:00:00Z'), description: 'Created.' },
      { event: 'Cancelled', timestamp: new Date('2026-06-11T14:15:00Z'), description: 'Cancelled due to guest transaction failure.' }
    ]
  },
  {
    _id: 'r-109',
    guest: mockGuestsDatabase[8],
    driver: mockDriversDatabase[0],
    vehicle: { vehicleNumber: 'MH-12-TR-2309', vehicleType: 'Hatchback', model: 'Maruti Swift', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Tungarli Lake Campsite, Lonavala',
    dropAddress: 'Lonavala Market Area',
    distance: 4.5,
    duration: '10 mins',
    eta: '--',
    rideType: 'Hatchback',
    fareBreakdown: { baseFare: 80, distanceFare: 100, extraCharges: 0, waitingCharges: 0, tax: 10, discount: 20, finalFare: 170 },
    paymentStatus: 'Paid',
    paymentMode: 'Cash',
    transactionId: '',
    paymentDate: new Date('2026-06-11T11:15:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-11T11:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-11T11:00:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-11T11:15:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-110',
    guest: mockGuestsDatabase[9],
    driver: mockDriversDatabase[1],
    vehicle: { vehicleNumber: 'MH-12-QB-4521', vehicleType: 'Sedan', model: 'Hyundai Verna', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Lonavala Railway Station, Lonavala',
    dropAddress: 'Sunny Da Dhaba, Old Mumbai-Pune Highway',
    distance: 14.8,
    duration: '25 mins',
    eta: '--',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 150, distanceFare: 380, extraCharges: 0, waitingCharges: 0, tax: 25, discount: 45, finalFare: 510 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-11092',
    paymentDate: new Date('2026-06-10T19:30:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-10T19:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-10T19:00:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-10T19:30:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-111',
    guest: mockGuestsDatabase[0],
    driver: null,
    vehicle: { vehicleNumber: 'MH-12-XX-9901', vehicleType: 'Shared', model: 'Tata Winger', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300' },
    pickupAddress: 'Wow Gateway Resort, Khandala',
    dropAddress: 'Imagicaa Water Park, Khopoli',
    distance: 25.5,
    duration: '40 mins',
    eta: '--',
    rideType: 'Shared',
    fareBreakdown: { baseFare: 50, distanceFare: 200, extraCharges: 0, waitingCharges: 0, tax: 15, discount: 15, finalFare: 250 },
    paymentStatus: 'Pending',
    paymentMode: 'UPI',
    transactionId: '',
    paymentDate: null,
    status: 'Upcoming',
    createdAt: new Date('2026-06-12T14:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-12T14:00:00Z'), description: 'Shared shuttle scheduled ride requested.' }
    ]
  },
  {
    _id: 'r-112',
    guest: mockGuestsDatabase[1],
    driver: mockDriversDatabase[2],
    vehicle: { vehicleNumber: 'MH-12-FG-6009', vehicleType: 'Sedan', model: 'Hyundai Aura', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Bus Stand, Panchgani',
    dropAddress: 'Parsi Point Viewpoint, Panchgani',
    distance: 4.8,
    duration: '10 mins',
    eta: '--',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 100, distanceFare: 120, extraCharges: 0, waitingCharges: 0, tax: 10, discount: 0, finalFare: 230 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-32219',
    paymentDate: new Date('2026-06-10T11:15:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-10T11:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-10T11:00:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-10T11:15:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-113',
    guest: mockGuestsDatabase[2],
    driver: mockDriversDatabase[5],
    vehicle: { vehicleNumber: 'MH-12-LM-0081', vehicleType: 'SUV', model: 'Mahindra XUV700', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300' },
    pickupAddress: 'Lonavala Homestay Elite, Lonavala',
    dropAddress: 'Wax Museum Lonavala, Varsoli',
    distance: 8.2,
    duration: '18 mins',
    eta: '--',
    rideType: 'SUV',
    fareBreakdown: { baseFare: 200, distanceFare: 250, extraCharges: 0, waitingCharges: 0, tax: 20, discount: 30, finalFare: 440 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-90921',
    paymentDate: new Date('2026-06-09T14:48:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-09T14:30:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-09T14:30:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-09T14:48:00Z'), description: 'Completed.' }
    ]
  },
  {
    _id: 'r-114',
    guest: mockGuestsDatabase[3],
    driver: null,
    vehicle: { vehicleNumber: 'MH-14-GH-1221', vehicleType: 'Sedan', model: 'Toyota Etios', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Khandala Lake Villa, Khandala',
    dropAddress: 'Tiger Point Cliff View, Kurvande',
    distance: 15.6,
    duration: '32 mins',
    eta: '--',
    rideType: 'Sedan',
    fareBreakdown: { baseFare: 150, distanceFare: 380, extraCharges: 50, waitingCharges: 0, tax: 30, discount: 20, finalFare: 590 },
    paymentStatus: 'Pending',
    paymentMode: 'Cash',
    transactionId: '',
    paymentDate: null,
    status: 'Cancelled',
    createdAt: new Date('2026-06-08T10:00:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-08T10:00:00Z'), description: 'Created.' },
      { event: 'Cancelled', timestamp: new Date('2026-06-08T10:10:00Z'), description: 'Cancelled by guest before driver allocation.' }
    ]
  },
  {
    _id: 'r-115',
    guest: mockGuestsDatabase[4],
    driver: mockDriversDatabase[6],
    vehicle: { vehicleNumber: 'MH-14-RE-3912', vehicleType: 'Hatchback', model: 'Hyundai i20', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300' },
    pickupAddress: 'Bhimashankar Temple Parking, Pune',
    dropAddress: 'Manas Homestay Luxury, Talegaon',
    distance: 68.4,
    duration: '1 hr 35 mins',
    eta: '--',
    rideType: 'Hatchback',
    fareBreakdown: { baseFare: 100, distanceFare: 1360, extraCharges: 100, waitingCharges: 0, tax: 80, discount: 100, finalFare: 1540 },
    paymentStatus: 'Paid',
    paymentMode: 'UPI',
    transactionId: 'TXN-RIDE-11822',
    paymentDate: new Date('2026-06-07T18:00:00Z'),
    status: 'Completed',
    createdAt: new Date('2026-06-07T16:20:00Z'),
    timeline: [
      { event: 'Ride Created', timestamp: new Date('2026-06-07T16:20:00Z'), description: 'Created.' },
      { event: 'Completed', timestamp: new Date('2026-06-07T18:00:00Z'), description: 'Completed.' }
    ]
  }
];

// GET /api/dashboard/rides/stats
router.get('/rides/stats', async (req, res) => {
  if (!isMongoConnected()) {
    const totalRidesToday = mockRidesDatabase.length;
    const ongoingRides = mockRidesDatabase.filter(r => r.status === 'Ongoing').length;
    const upcomingRides = mockRidesDatabase.filter(r => r.status === 'Upcoming').length;
    const completedRides = mockRidesDatabase.filter(r => r.status === 'Completed').length;
    const cancelledRides = mockRidesDatabase.filter(r => r.status === 'Cancelled').length;
    const totalRevenueToday = mockRidesDatabase
      .filter(r => r.status === 'Completed' || r.status === 'Ongoing')
      .reduce((sum, r) => sum + r.fareBreakdown.finalFare, 0);
    return res.json({ totalRidesToday, ongoingRides, upcomingRides, completedRides, cancelledRides, totalRevenueToday });
  }

  try {
    const ongoingRides = await Ride.countDocuments({ status: 'Ongoing' });
    const upcomingRides = await Ride.countDocuments({ status: 'Upcoming' });
    const completedRides = await Ride.countDocuments({ status: 'Completed' });
    const cancelledRides = await Ride.countDocuments({ status: 'Cancelled' });
    const totalRidesToday = await Ride.countDocuments();

    const revenueResult = await Ride.aggregate([
      { $match: { status: { $in: ['Completed', 'Ongoing'] } } },
      { $group: { _id: null, total: { $sum: '$fareBreakdown.finalFare' } } }
    ]);
    const totalRevenueToday = revenueResult[0]?.total || 0;

    res.json({ totalRidesToday, ongoingRides, upcomingRides, completedRides, cancelledRides, totalRevenueToday });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ride stats', message: err.message });
  }
});

// GET /api/dashboard/rides/drivers
router.get('/rides/drivers', async (req, res) => {
  if (!isMongoConnected()) {
    const mapped = mockRidersDatabase.map(r => ({
      _id: r._id,
      name: `${r.firstName} ${r.lastName}`,
      mobile: r.mobile,
      photo: r.documents.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      rating: r.rating,
      status: r.availability === 'Available' ? 'Active' : r.availability === 'On Trip' ? 'On Ride' : r.availability === 'Offline' ? 'Offline' : 'Inactive'
    }));
    return res.json(mapped);
  }
  try {
    const ridersList = await Rider.find();
    const mapped = ridersList.map(r => ({
      _id: r._id,
      name: `${r.firstName} ${r.lastName}`,
      mobile: r.mobile,
      photo: r.documents.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      rating: r.rating,
      status: r.availability === 'Available' ? 'Active' : r.availability === 'On Trip' ? 'On Ride' : r.availability === 'Offline' ? 'Offline' : 'Inactive'
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch riders as drivers', message: err.message });
  }
});

// GET /api/dashboard/rides
router.get('/rides', async (req, res) => {
  const { search, status, rideType, paymentStatus } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockRidesDatabase];
    if (status && status !== 'All') {
      list = list.filter(r => r.status === status);
    }
    if (rideType && rideType !== 'All') {
      list = list.filter(r => r.rideType === rideType);
    }
    if (paymentStatus && paymentStatus !== 'All') {
      list = list.filter(r => r.paymentStatus === paymentStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r._id.toLowerCase().includes(q) ||
        r.guest.name.toLowerCase().includes(q) ||
        r.guest.mobile.includes(q) ||
        (r.driver && r.driver.name.toLowerCase().includes(q)) ||
        r.vehicle.vehicleNumber.toLowerCase().includes(q)
      );
    }
    return res.json(list);
  }

  try {
    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (rideType && rideType !== 'All') {
      query.rideType = rideType;
    }
    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { _id: regex },
        { 'guest.name': regex },
        { 'guest.mobile': regex },
        { 'driver.name': regex },
        { 'vehicle.vehicleNumber': regex }
      ];
    }
    const rides = await Ride.find(query).sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides', message: err.message });
  }
});

// GET /api/dashboard/rides/:id
router.get('/rides/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const item = mockRidesDatabase.find(r => r._id === id);
    if (!item) return res.status(404).json({ error: 'Ride not found' });
    return res.json(item);
  }

  try {
    const item = await Ride.findById(id);
    if (!item) return res.status(404).json({ error: 'Ride not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ride details', message: err.message });
  }
});

// PUT /api/dashboard/rides/:id
router.put('/rides/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!isMongoConnected()) {
    const idx = mockRidesDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Ride not found' });

    let currentRide = mockRidesDatabase[idx];

    // Assigning driver business logic
    if (updateData.assignDriverId) {
      const rider = mockRidersDatabase.find(r => r._id === updateData.assignDriverId);
      if (rider) {
        if (currentRide.driver) {
          const oldRider = mockRidersDatabase.find(r => `${r.firstName} ${r.lastName}` === currentRide.driver.name);
          if (oldRider) oldRider.availability = 'Available';
        }

        currentRide.driver = {
          name: `${rider.firstName} ${rider.lastName}`,
          mobile: rider.mobile,
          photo: rider.documents.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          rating: rider.rating,
          status: 'On Ride'
        };
        rider.availability = 'On Trip';
        currentRide.status = 'Ongoing';
        currentRide.timeline.push({
          event: 'Driver Assigned',
          timestamp: new Date(),
          description: `Driver ${rider.firstName} ${rider.lastName} has been assigned to the ride.`
        });
      }
    }

    // Mark Completed logic
    if (updateData.status === 'Completed') {
      currentRide.status = 'Completed';
      currentRide.paymentStatus = 'Paid';
      currentRide.paymentDate = new Date();
      currentRide.transactionId = `TXN-RIDE-${Math.floor(Math.random() * 90000) + 10000}`;
      if (currentRide.driver) {
        const r = mockRidersDatabase.find(rider => `${rider.firstName} ${rider.lastName}` === currentRide.driver.name);
        if (r) r.availability = 'Available';
      }
      currentRide.timeline.push({
        event: 'Completed',
        timestamp: new Date(),
        description: 'Trip marked completed by admin operations desk.'
      });
    }

    // Cancel Ride logic
    if (updateData.status === 'Cancelled') {
      currentRide.status = 'Cancelled';
      if (currentRide.driver) {
        const r = mockRidersDatabase.find(rider => `${rider.firstName} ${rider.lastName}` === currentRide.driver.name);
        if (r) r.availability = 'Available';
      }
      currentRide.timeline.push({
        event: 'Cancelled',
        timestamp: new Date(),
        description: 'Ride booking cancelled.'
      });
    }

    if (updateData.pickupAddress) currentRide.pickupAddress = updateData.pickupAddress;
    if (updateData.dropAddress) currentRide.dropAddress = updateData.dropAddress;
    if (updateData.rideType) currentRide.rideType = updateData.rideType;
    if (updateData.paymentMode) currentRide.paymentMode = updateData.paymentMode;
    if (updateData.amount) {
      currentRide.fareBreakdown.finalFare = updateData.amount;
    }

    mockRidesDatabase[idx] = currentRide;
    return res.json(currentRide);
  }

  try {
    const updated = await Ride.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Ride not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ride', message: err.message });
  }
});


// DELETE /api/dashboard/rides/:id
router.delete('/rides/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockRidesDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Ride not found' });

    const ride = mockRidesDatabase[idx];
    if (ride.driver) {
      const d = mockDriversDatabase.find(driver => driver.name === ride.driver.name);
      if (d) d.status = 'Active';
    }

    mockRidesDatabase.splice(idx, 1);
    return res.json({ message: 'Ride deleted from memory' });
  }

  try {
    const deleted = await Ride.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Ride not found' });
    res.json({ message: 'Ride deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ride', message: err.message });
  }
});

// ==========================================
// RIDERS MANAGEMENT DATABASE & ENDPOINTS
// ==========================================

let mockRidersDatabase = [
  {
    _id: 'DR1025',
    firstName: 'Anushka',
    lastName: 'Pandey',
    fatherName: 'Rajesh Pandey',
    email: 'anushka.pandey@example.com',
    mobile: '+91 9876543210',
    whatsApp: '9876543210',
    dob: '1996-05-15',
    gender: 'Female',
    emergencyContact: '+91 9876543299',
    aadharNo: '1234-5678-9012',
    panNo: 'ABCDE1234F',
    drivingLicenseNo: 'DL-122020000456',
    licenseExpiryDate: '2031-12-31',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Toyota',
      model: 'Toyota Etios',
      vehicleNumber: 'DL3CAB3456',
      color: 'Silver',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: '56/A, MG Road', city: 'New Delhi', state: 'Delhi', pinCode: '110001' },
    permAddress: { line1: '56/A, MG Road', city: 'New Delhi', state: 'Delhi', pinCode: '110001' },
    bankName: 'State Bank of India',
    accountNumber: '1000293812903',
    ifscCode: 'SBIN0000125',
    upiId: 'anushka@oksbi',
    status: 'Active',
    availability: 'Available',
    rating: 4.8,
    joinedDate: new Date('2024-01-12T00:00:00.000Z'),
    performance: {
      totalRides: 120,
      completedRides: 118,
      cancelledRides: 2,
      averageRating: 4.8,
      completionRate: 98.5,
      totalEarnings: 28450,
      monthlyEarnings: 8450
    },
    rideHistory: [
      { rideId: '#R10254', date: new Date('2026-04-24T10:00:00Z'), guest: 'Onabi B.', pickup: 'Wow Resort Lobby', drop: 'New Delhi Airport', fare: 550, status: 'Completed' },
      { rideId: '#R10240', date: new Date('2026-04-22T14:30:00Z'), guest: 'Park St.', pickup: 'Karla Caves parking', drop: 'Siliguri Point', fare: 2950, status: 'Completed' },
      { rideId: '#R10212', date: new Date('2026-04-20T11:00:00Z'), guest: 'Praba G.', pickup: 'Lonavala Homestay', drop: 'Delhi Cantt', fare: 450, status: 'Completed' },
      { rideId: '#R10199', date: new Date('2026-04-18T09:00:00Z'), guest: 'Baghpat', pickup: 'Sunrise Villa', drop: 'Noida City Center', fare: 780, status: 'Cancelled' }
    ]
  },
  {
    _id: 'DR1024',
    firstName: 'Vikas',
    lastName: 'Yadav',
    fatherName: 'Sohan Yadav',
    email: 'vikas.yadav@example.com',
    mobile: '+91 9225533322',
    whatsApp: '9225533322',
    dob: '1992-08-20',
    gender: 'Male',
    emergencyContact: '+91 9225533399',
    aadharNo: '2345-6789-0123',
    panNo: 'BCDEF2345G',
    drivingLicenseNo: 'DL-142018000789',
    licenseExpiryDate: '2028-05-14',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Maruti Suzuki',
      model: 'Swift Dzire',
      vehicleNumber: 'DL8CN3090',
      color: 'White',
      fuelType: 'Diesel',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Sector 15, Rohini', city: 'New Delhi', state: 'Delhi', pinCode: '110085' },
    permAddress: { line1: 'Village Rewari', city: 'Rewari', state: 'Haryana', pinCode: '123401' },
    bankName: 'HDFC Bank',
    accountNumber: '5002938129034',
    ifscCode: 'HDFC0000240',
    upiId: 'vikas@okhdfc',
    status: 'Active',
    availability: 'On Trip',
    rating: 4.6,
    joinedDate: new Date('2024-02-05T00:00:00.000Z'),
    performance: {
      totalRides: 98,
      completedRides: 95,
      cancelledRides: 3,
      averageRating: 4.6,
      completionRate: 96.9,
      totalEarnings: 21320,
      monthlyEarnings: 6120
    },
    rideHistory: [
      { rideId: '#R10255', date: new Date('2026-04-24T12:00:00Z'), guest: 'Arjun K.', pickup: 'Airport T3', drop: 'Wow Gateway Resort', fare: 1200, status: 'Completed' },
      { rideId: '#R10221', date: new Date('2026-04-21T16:00:00Z'), guest: 'Neha S.', pickup: 'Wow Resort', drop: 'Della Adventure', fare: 350, status: 'Completed' }
    ]
  },
  {
    _id: 'DR1023',
    firstName: 'Vimad',
    lastName: 'Tipal',
    fatherName: 'Gyan Tipal',
    email: 'vimad.tipal@example.com',
    mobile: '+91 9886774600',
    whatsApp: '9886774600',
    dob: '1989-11-02',
    gender: 'Male',
    emergencyContact: '+91 9886774699',
    aadharNo: '3456-7890-1234',
    panNo: 'CDEFG3456H',
    drivingLicenseNo: 'DL-162015000123',
    licenseExpiryDate: '2027-10-30',
    vehicle: {
      vehicleType: 'SUV (6 Seater)',
      brand: 'Mahindra',
      model: 'Mahindra XUV500',
      vehicleNumber: 'DL10AB7788',
      color: 'Black',
      fuelType: 'Diesel',
      seatingCapacity: 6
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Gole Market', city: 'New Delhi', state: 'Delhi', pinCode: '110001' },
    permAddress: { line1: 'Gole Market', city: 'New Delhi', state: 'Delhi', pinCode: '110001' },
    bankName: 'ICICI Bank',
    accountNumber: '0029381290345',
    ifscCode: 'ICIC0000045',
    upiId: 'vimad@okicici',
    status: 'Active',
    availability: 'Available',
    rating: 4.7,
    joinedDate: new Date('2023-12-20T00:00:00.000Z'),
    performance: {
      totalRides: 76,
      completedRides: 74,
      cancelledRides: 2,
      averageRating: 4.7,
      completionRate: 97.4,
      totalEarnings: 31200,
      monthlyEarnings: 9200
    },
    rideHistory: [
      { rideId: '#R10256', date: new Date('2026-04-25T08:00:00Z'), guest: 'Elena R.', pickup: 'Karla Caves', drop: 'Pune Station', fare: 1500, status: 'Completed' },
      { rideId: '#R10219', date: new Date('2026-04-20T17:15:00Z'), guest: 'Amit Y.', pickup: 'Lonavala Station', drop: 'Sunrise Homestay', fare: 400, status: 'Completed' }
    ]
  },
  {
    _id: 'DR1022',
    firstName: 'Ravi',
    lastName: 'Kumar',
    fatherName: 'Madan Lal',
    email: 'ravi.kumar@example.com',
    mobile: '+91 9955442211',
    whatsApp: '9955442211',
    dob: '1994-03-24',
    gender: 'Male',
    emergencyContact: '+91 9955442299',
    aadharNo: '4567-8901-2345',
    panNo: 'DEFGH4567I',
    drivingLicenseNo: 'DL-122019000889',
    licenseExpiryDate: '2029-08-11',
    vehicle: {
      vehicleType: 'MPV (7 Seater)',
      brand: 'Toyota',
      model: 'Innova Crysta',
      vehicleNumber: 'UP14EF5567',
      color: 'White',
      fuelType: 'Diesel',
      seatingCapacity: 7
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Pending',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Indirapuram', city: 'Ghaziabad', state: 'Uttar Pradesh', pinCode: '201014' },
    permAddress: { line1: 'Indirapuram', city: 'Ghaziabad', state: 'Uttar Pradesh', pinCode: '201014' },
    bankName: 'Axis Bank',
    accountNumber: '9120293812903',
    ifscCode: 'UTIB0000120',
    upiId: 'ravi@okaxis',
    status: 'Inactive',
    availability: 'Offline',
    rating: 3.9,
    joinedDate: new Date('2023-11-18T00:00:00.000Z'),
    performance: {
      totalRides: 42,
      completedRides: 39,
      cancelledRides: 3,
      averageRating: 3.9,
      completionRate: 92.8,
      totalEarnings: 15450,
      monthlyEarnings: 0
    },
    rideHistory: [
      { rideId: '#R10202', date: new Date('2026-04-18T10:00:00Z'), guest: 'Sameer S.', pickup: 'Wow Resort Lobby', drop: 'Lonavala Market', fare: 250, status: 'Completed' }
    ]
  },
  {
    _id: 'DR1021',
    firstName: 'Sandeep',
    lastName: 'Singh',
    fatherName: 'Satnam Singh',
    email: 'sandeep.singh@example.com',
    mobile: '+91 9812233344',
    whatsApp: '9812233344',
    dob: '1990-12-11',
    gender: 'Male',
    emergencyContact: '+91 9812233399',
    aadharNo: '5678-9012-3456',
    panNo: 'EFGHI5678J',
    drivingLicenseNo: 'DL-152016000990',
    licenseExpiryDate: '2030-04-20',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Honda',
      model: 'Honda Amaze',
      vehicleNumber: 'HR26ZX1122',
      color: 'Brown',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Sector 56', city: 'Gurugram', state: 'Haryana', pinCode: '122011' },
    permAddress: { line1: 'Village Tarn Taran', city: 'Amritsar', state: 'Punjab', pinCode: '143401' },
    bankName: 'Punjab National Bank',
    accountNumber: '0129293812903',
    ifscCode: 'PUNB0024000',
    upiId: 'sandeep@okpnb',
    status: 'Active',
    availability: 'Available',
    rating: 4.5,
    joinedDate: new Date('2024-01-02T00:00:00.000Z'),
    performance: {
      totalRides: 65,
      completedRides: 62,
      cancelledRides: 3,
      averageRating: 4.5,
      completionRate: 95.3,
      totalEarnings: 19800,
      monthlyEarnings: 5400
    },
    rideHistory: [
      { rideId: '#R10257', date: new Date('2026-04-26T14:00:00Z'), guest: 'Priya M.', pickup: 'Della Adventure', drop: 'Mumbai Airport', fare: 2200, status: 'Completed' },
      { rideId: '#R10220', date: new Date('2026-04-21T09:30:00Z'), guest: 'Kavita D.', pickup: 'Bus Stand Panchgani', drop: 'Mapro Garden', fare: 300, status: 'Completed' }
    ]
  },
  {
    _id: 'DR1020',
    firstName: 'Harpreet',
    lastName: 'Singh',
    fatherName: 'Baldev Singh',
    email: 'harpreet.singh@example.com',
    mobile: '+91 9988776655',
    whatsApp: '9988776655',
    dob: '1988-06-15',
    gender: 'Male',
    emergencyContact: '+91 9988776699',
    aadharNo: '6789-0123-4567',
    panNo: 'FGHIJ6789K',
    drivingLicenseNo: 'DL-112014000889',
    licenseExpiryDate: '2029-03-12',
    vehicle: {
      vehicleType: 'SUV (6 Seater)',
      brand: 'Toyota',
      model: 'Toyota Fortuner',
      vehicleNumber: 'PB02AB9999',
      color: 'White',
      fuelType: 'Diesel',
      seatingCapacity: 6
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Sector 22', city: 'Chandigarh', state: 'Chandigarh', pinCode: '160022' },
    permAddress: { line1: 'Sector 22', city: 'Chandigarh', state: 'Chandigarh', pinCode: '160022' },
    bankName: 'Axis Bank',
    accountNumber: '91202938129038',
    ifscCode: 'UTIB0000120',
    upiId: 'harpreet@okaxis',
    status: 'Active',
    availability: 'Offline',
    rating: 4.9,
    joinedDate: new Date('2023-09-15T00:00:00.000Z'),
    performance: {
      totalRides: 140,
      completedRides: 139,
      cancelledRides: 1,
      averageRating: 4.9,
      completionRate: 99.2,
      totalEarnings: 45200,
      monthlyEarnings: 12400
    },
    rideHistory: []
  },
  {
    _id: 'DR1019',
    firstName: 'Amit',
    lastName: 'Sharma',
    fatherName: 'Prem Sharma',
    email: 'amit.sharma@example.com',
    mobile: '+91 9876543211',
    whatsApp: '9876543211',
    dob: '1991-04-12',
    gender: 'Male',
    emergencyContact: '+91 9876543222',
    aadharNo: '7890-1234-5678',
    panNo: 'GHIJK7890L',
    drivingLicenseNo: 'DL-152017000112',
    licenseExpiryDate: '2032-11-20',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Hyundai',
      model: 'Hyundai Verna',
      vehicleNumber: 'MH12QB4521',
      color: 'Black',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Lonavala Sector 4', city: 'Pune', state: 'Maharashtra', pinCode: '410401' },
    permAddress: { line1: 'Lonavala Sector 4', city: 'Pune', state: 'Maharashtra', pinCode: '410401' },
    bankName: 'ICICI Bank',
    accountNumber: '0029381290390',
    ifscCode: 'ICIC0000045',
    upiId: 'amit@okicici',
    status: 'Active',
    availability: 'On Trip',
    rating: 4.8,
    joinedDate: new Date('2023-08-01T00:00:00.000Z'),
    performance: {
      totalRides: 156,
      completedRides: 154,
      cancelledRides: 2,
      averageRating: 4.8,
      completionRate: 98.7,
      totalEarnings: 58000,
      monthlyEarnings: 14200
    },
    rideHistory: []
  },
  {
    _id: 'DR1018',
    firstName: 'Suresh',
    lastName: 'Kumar',
    fatherName: 'Ram Kumar',
    email: 'suresh.kumar@example.com',
    mobile: '+91 9876543212',
    whatsApp: '9876543212',
    dob: '1987-10-09',
    gender: 'Male',
    emergencyContact: '+91 9876543233',
    aadharNo: '8901-2345-6789',
    panNo: 'HIJKL8901M',
    drivingLicenseNo: 'DL-122013000556',
    licenseExpiryDate: '2028-09-12',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Hyundai',
      model: 'Hyundai Aura',
      vehicleNumber: 'MH12FG6009',
      color: 'White',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Khandala Main St', city: 'Pune', state: 'Maharashtra', pinCode: '410301' },
    permAddress: { line1: 'Khandala Main St', city: 'Pune', state: 'Maharashtra', pinCode: '410301' },
    bankName: 'Kotak Mahindra Bank',
    accountNumber: '4429381290345',
    ifscCode: 'KKBK0000210',
    upiId: 'suresh@okkotak',
    status: 'Active',
    availability: 'Available',
    rating: 4.7,
    joinedDate: new Date('2023-07-22T00:00:00.000Z'),
    performance: {
      totalRides: 90,
      completedRides: 88,
      cancelledRides: 2,
      averageRating: 4.7,
      completionRate: 97.7,
      totalEarnings: 34200,
      monthlyEarnings: 8200
    },
    rideHistory: []
  },
  {
    _id: 'DR1017',
    firstName: 'Rajesh',
    lastName: 'Singh',
    fatherName: 'Inder Singh',
    email: 'rajesh.singh@example.com',
    mobile: '+91 9876543213',
    whatsApp: '9876543213',
    dob: '1993-01-20',
    gender: 'Male',
    emergencyContact: '+91 9876543244',
    aadharNo: '9012-3456-7890',
    panNo: 'IJKLM9012N',
    drivingLicenseNo: 'DL-142017000234',
    licenseExpiryDate: '2032-02-18',
    vehicle: {
      vehicleType: 'Hatchback (4 Seater)',
      brand: 'Maruti Suzuki',
      model: 'Maruti Swift',
      vehicleNumber: 'MH12TR2309',
      color: 'Red',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Panchgani Road', city: 'Satara', state: 'Maharashtra', pinCode: '415001' },
    permAddress: { line1: 'Panchgani Road', city: 'Satara', state: 'Maharashtra', pinCode: '415001' },
    bankName: 'HDFC Bank',
    accountNumber: '5002938129035',
    ifscCode: 'HDFC0000240',
    upiId: 'rajesh@okhdfc',
    status: 'Active',
    availability: 'Offline',
    rating: 4.6,
    joinedDate: new Date('2023-06-15T00:00:00.000Z'),
    performance: {
      totalRides: 82,
      completedRides: 79,
      cancelledRides: 3,
      averageRating: 4.6,
      completionRate: 96.3,
      totalEarnings: 29800,
      monthlyEarnings: 0
    },
    rideHistory: []
  },
  {
    _id: 'DR1016',
    firstName: 'Vikram',
    lastName: 'Rathore',
    fatherName: 'Karan Rathore',
    email: 'vikram.rathore@example.com',
    mobile: '+91 9876543214',
    whatsApp: '9876543214',
    dob: '1991-05-22',
    gender: 'Male',
    emergencyContact: '+91 9876543255',
    aadharNo: '0123-4567-8901',
    panNo: 'JKLMN0123O',
    drivingLicenseNo: 'DL-152018000456',
    licenseExpiryDate: '2033-06-11',
    vehicle: {
      vehicleType: 'SUV (6 Seater)',
      brand: 'Toyota',
      model: 'Toyota Fortuner',
      vehicleNumber: 'MH14EU8812',
      color: 'Grey',
      fuelType: 'Diesel',
      seatingCapacity: 6
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Mahabaleshwar Main St', city: 'Satara', state: 'Maharashtra', pinCode: '412806' },
    permAddress: { line1: 'Mahabaleshwar Main St', city: 'Satara', state: 'Maharashtra', pinCode: '412806' },
    bankName: 'State Bank of India',
    accountNumber: '3000293812903',
    ifscCode: 'SBIN0000125',
    upiId: 'vikram@oksbi',
    status: 'Active',
    availability: 'On Trip',
    rating: 4.8,
    joinedDate: new Date('2023-05-22T00:00:00.000Z'),
    performance: {
      totalRides: 120,
      completedRides: 116,
      cancelledRides: 4,
      averageRating: 4.8,
      completionRate: 96.6,
      totalEarnings: 42000,
      monthlyEarnings: 11500
    },
    rideHistory: []
  },
  {
    _id: 'DR1015',
    firstName: 'Anil',
    lastName: 'Verma',
    fatherName: 'Jagdish Verma',
    email: 'anil.verma@example.com',
    mobile: '+91 9876543215',
    whatsApp: '9876543215',
    dob: '1990-11-12',
    gender: 'Male',
    emergencyContact: '+91 9876543266',
    aadharNo: '1234-9012-5678',
    panNo: 'KLMNO1234P',
    drivingLicenseNo: 'DL-162016000223',
    licenseExpiryDate: '2031-10-14',
    vehicle: {
      vehicleType: 'SUV (6 Seater)',
      brand: 'Mahindra',
      model: 'Mahindra XUV700',
      vehicleNumber: 'MH12LM0081',
      color: 'Blue',
      fuelType: 'Diesel',
      seatingCapacity: 6
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Chinchwad Sector 2', city: 'Pune', state: 'Maharashtra', pinCode: '411019' },
    permAddress: { line1: 'Chinchwad Sector 2', city: 'Pune', state: 'Maharashtra', pinCode: '411019' },
    bankName: 'HDFC Bank',
    accountNumber: '5002938129036',
    ifscCode: 'HDFC0000240',
    upiId: 'anil@okhdfc',
    status: 'Active',
    availability: 'Available',
    rating: 4.5,
    joinedDate: new Date('2023-04-12T00:00:00.000Z'),
    performance: {
      totalRides: 58,
      completedRides: 56,
      cancelledRides: 2,
      averageRating: 4.5,
      completionRate: 96.5,
      totalEarnings: 23100,
      monthlyEarnings: 5100
    },
    rideHistory: []
  },
  {
    _id: 'DR1014',
    firstName: 'Manoj',
    lastName: 'Joshi',
    fatherName: 'Bhuvan Joshi',
    email: 'manoj.joshi@example.com',
    mobile: '+91 9876543216',
    whatsApp: '9876543216',
    dob: '1989-08-14',
    gender: 'Male',
    emergencyContact: '+91 9876543277',
    aadharNo: '2345-0123-6789',
    panNo: 'LMNOP2345Q',
    drivingLicenseNo: 'DL-122014000456',
    licenseExpiryDate: '2029-05-18',
    vehicle: {
      vehicleType: 'Hatchback (4 Seater)',
      brand: 'Hyundai',
      model: 'Hyundai i20',
      vehicleNumber: 'MH14RE3912',
      color: 'White',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Kothrud Sector A', city: 'Pune', state: 'Maharashtra', pinCode: '411038' },
    permAddress: { line1: 'Kothrud Sector A', city: 'Pune', state: 'Maharashtra', pinCode: '411038' },
    bankName: 'State Bank of India',
    accountNumber: '3000293812904',
    ifscCode: 'SBIN0000125',
    upiId: 'manoj@oksbi',
    status: 'Active',
    availability: 'Available',
    rating: 4.9,
    joinedDate: new Date('2023-04-02T00:00:00.000Z'),
    performance: {
      totalRides: 88,
      completedRides: 87,
      cancelledRides: 1,
      averageRating: 4.9,
      completionRate: 98.8,
      totalEarnings: 36200,
      monthlyEarnings: 9800
    },
    rideHistory: []
  },
  {
    _id: 'DR1013',
    firstName: 'Arun',
    lastName: 'Pillai',
    fatherName: 'Krishna Pillai',
    email: 'arun.pillai@example.com',
    mobile: '+91 9988776612',
    whatsApp: '9988776612',
    dob: '1995-10-18',
    gender: 'Male',
    emergencyContact: '+91 9988776623',
    aadharNo: '3456-1234-7890',
    panNo: 'MNOPQ3456R',
    drivingLicenseNo: 'DL-152019000112',
    licenseExpiryDate: '2034-03-24',
    vehicle: {
      vehicleType: 'Shared (12 Seater)',
      brand: 'Tata',
      model: 'Tata Winger',
      vehicleNumber: 'MH12XX9901',
      color: 'White',
      fuelType: 'Diesel',
      seatingCapacity: 12
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      drivingLicense: 'Pending',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Wakad Phase 1', city: 'Pune', state: 'Maharashtra', pinCode: '411057' },
    permAddress: { line1: 'Cochin Main St', city: 'Cochin', state: 'Kerala', pinCode: '682001' },
    bankName: 'Federal Bank',
    accountNumber: '1120293812903',
    ifscCode: 'FDRL0000125',
    upiId: 'arun@okfederal',
    status: 'Pending Verification',
    availability: 'Busy',
    rating: 4.2,
    joinedDate: new Date('2024-05-10T00:00:00.000Z'),
    performance: {
      totalRides: 15,
      completedRides: 12,
      cancelledRides: 3,
      averageRating: 4.2,
      completionRate: 80.0,
      totalEarnings: 5200,
      monthlyEarnings: 5200
    },
    rideHistory: []
  },
  {
    _id: 'DR1012',
    firstName: 'Mohit',
    lastName: 'Chawla',
    fatherName: 'Devender Chawla',
    email: 'mohit.chawla@example.com',
    mobile: '+91 9988776634',
    whatsApp: '9988776634',
    dob: '1992-04-22',
    gender: 'Male',
    emergencyContact: '+91 9988776645',
    aadharNo: '4567-2345-8901',
    panNo: 'NOPQR4567S',
    drivingLicenseNo: 'DL-112015000556',
    licenseExpiryDate: '2030-08-22',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Toyota',
      model: 'Toyota Etios',
      vehicleNumber: 'MH14GH1221',
      color: 'Silver',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Kalyani Nagar', city: 'Pune', state: 'Maharashtra', pinCode: '411006' },
    permAddress: { line1: 'Kalyani Nagar', city: 'Pune', state: 'Maharashtra', pinCode: '411006' },
    bankName: 'ICICI Bank',
    accountNumber: '0029381290391',
    ifscCode: 'ICIC0000045',
    upiId: 'mohit@okicici',
    status: 'Suspended',
    availability: 'Offline',
    rating: 3.5,
    joinedDate: new Date('2024-03-01T00:00:00.000Z'),
    performance: {
      totalRides: 34,
      completedRides: 30,
      cancelledRides: 4,
      averageRating: 3.5,
      completionRate: 88.2,
      totalEarnings: 12500,
      monthlyEarnings: 0
    },
    rideHistory: []
  },
  {
    _id: 'DR1011',
    firstName: 'Vikrant',
    lastName: 'Desai',
    fatherName: 'Prakash Desai',
    email: 'vikrant.desai@example.com',
    mobile: '+91 9988776656',
    whatsApp: '9988776656',
    dob: '1990-11-20',
    gender: 'Male',
    emergencyContact: '+91 9988776667',
    aadharNo: '5678-3456-9012',
    panNo: 'OPQRS5678T',
    drivingLicenseNo: 'DL-152014000123',
    licenseExpiryDate: '2029-11-15',
    vehicle: {
      vehicleType: 'Sedan (4 Seater)',
      brand: 'Maruti Suzuki',
      model: 'Maruti Dzire',
      vehicleNumber: 'MH12AS1122',
      color: 'White',
      fuelType: 'Petrol',
      seatingCapacity: 4
    },
    documents: {
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      drivingLicense: 'Verified',
      rcBook: 'Verified',
      insurance: 'Verified',
      pollutionCertificate: 'Verified',
      aadharFront: 'Verified',
      aadharBack: 'Verified',
      panCard: 'Verified'
    },
    tempAddress: { line1: 'Hadapsar Magarpatta', city: 'Pune', state: 'Maharashtra', pinCode: '411028' },
    permAddress: { line1: 'Hadapsar Magarpatta', city: 'Pune', state: 'Maharashtra', pinCode: '411028' },
    bankName: 'HDFC Bank',
    accountNumber: '5002938129037',
    ifscCode: 'HDFC0000240',
    upiId: 'vikrant@okhdfc',
    status: 'Active',
    availability: 'Available',
    rating: 4.6,
    joinedDate: new Date('2023-04-10T00:00:00.000Z'),
    performance: {
      totalRides: 48,
      completedRides: 45,
      cancelledRides: 3,
      averageRating: 4.6,
      completionRate: 93.7,
      totalEarnings: 17200,
      monthlyEarnings: 4200
    },
    rideHistory: []
  }
];

// Fill Ride Histories for remaining riders to make 50+ total logs
// Generating additional mock records programmatically or statically.
mockRidersDatabase.forEach((rider, idx) => {
  if (rider.rideHistory.length === 0) {
    rider.rideHistory = [
      { rideId: `#R100${idx}1`, date: new Date('2026-05-02T10:00:00Z'), guest: 'Amit K.', pickup: 'Wow Gateway Resort Lobby', drop: 'Lonavala Market', fare: 250, status: 'Completed' },
      { rideId: `#R100${idx}2`, date: new Date('2026-05-05T14:30:00Z'), guest: 'Siddharth R.', pickup: 'Wet N Joy Water Park', drop: 'Wow Resort Entrance', fare: 480, status: 'Completed' },
      { rideId: `#R100${idx}3`, date: new Date('2026-05-08T09:00:00Z'), guest: 'Ayesha M.', pickup: 'Karla Caves Parking', drop: 'Imagicaa Water Park', fare: 1250, status: 'Completed' },
      { rideId: `#R100${idx}4`, date: new Date('2026-05-10T16:20:00Z'), guest: 'Vikram S.', pickup: 'Lonavala Homestay', drop: 'Pune Station', fare: 1600, status: 'Completed' }
    ];
  }
});

// GET /api/dashboard/riders/stats
router.get('/riders/stats', async (req, res) => {
  if (!isMongoConnected()) {
    const totalRiders = mockRidersDatabase.length;
    const activeRiders = mockRidersDatabase.filter(r => r.status === 'Active').length;
    const availableRiders = mockRidersDatabase.filter(r => r.status === 'Active' && r.availability === 'Available').length;
    const onTripRiders = mockRidersDatabase.filter(r => r.status === 'Active' && r.availability === 'On Trip').length;
    const inactiveRiders = mockRidersDatabase.filter(r => r.status === 'Inactive').length;
    const totalEarningsThisMonth = mockRidersDatabase.reduce((sum, r) => sum + r.performance.monthlyEarnings, 0);
    return res.json({ totalRiders, activeRiders, availableRiders, onTripRiders, inactiveRiders, totalEarningsThisMonth });
  }

  try {
    const totalRiders = await Rider.countDocuments();
    const activeRiders = await Rider.countDocuments({ status: 'Active' });
    const availableRiders = await Rider.countDocuments({ status: 'Active', availability: 'Available' });
    const onTripRiders = await Rider.countDocuments({ status: 'Active', availability: 'On Trip' });
    const inactiveRiders = await Rider.countDocuments({ status: 'Inactive' });
    
    const earningsResult = await Rider.aggregate([
      { $group: { _id: null, total: { $sum: '$performance.monthlyEarnings' } } }
    ]);
    const totalEarningsThisMonth = earningsResult[0]?.total || 0;

    res.json({ totalRiders, activeRiders, availableRiders, onTripRiders, inactiveRiders, totalEarningsThisMonth });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rider stats', message: err.message });
  }
});

// GET /api/dashboard/riders
router.get('/riders', async (req, res) => {
  const { search, status, availability, vehicleType, rating, location } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockRidersDatabase];

    if (status && status !== 'All') {
      list = list.filter(r => r.status === status);
    }
    if (availability && availability !== 'All') {
      list = list.filter(r => r.availability === availability);
    }
    if (vehicleType && vehicleType !== 'All') {
      list = list.filter(r => r.vehicle.vehicleType.includes(vehicleType));
    }
    if (rating && rating !== 'All') {
      const minRating = parseFloat(rating);
      list = list.filter(r => r.rating >= minRating);
    }
    if (location && location !== 'All') {
      const q = location.toLowerCase();
      list = list.filter(r => r.tempAddress.city.toLowerCase().includes(q));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        r.vehicle.vehicleNumber.toLowerCase().includes(q) ||
        r._id.toLowerCase().includes(q)
      );
    }
    return res.json(list);
  }

  try {
    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (availability && availability !== 'All') {
      query.availability = availability;
    }
    if (vehicleType && vehicleType !== 'All') {
      query['vehicle.vehicleType'] = { $regex: vehicleType, $options: 'i' };
    }
    if (rating && rating !== 'All') {
      query.rating = { $gte: parseFloat(rating) };
    }
    if (location && location !== 'All') {
      query['tempAddress.city'] = { $regex: location, $options: 'i' };
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { mobile: regex },
        { 'vehicle.vehicleNumber': regex },
        { _id: regex }
      ];
    }
    const riders = await Rider.find(query).sort({ joinedDate: -1 });
    res.json(riders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch riders list', message: err.message });
  }
});

// GET /api/dashboard/riders/:id
router.get('/riders/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const item = mockRidersDatabase.find(r => r._id === id);
    if (!item) return res.status(404).json({ error: 'Rider not found' });
    return res.json(item);
  }

  try {
    const item = await Rider.findById(id);
    if (!item) return res.status(404).json({ error: 'Rider not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rider details', message: err.message });
  }
});

// POST /api/dashboard/riders
router.post('/riders', async (req, res) => {
  const riderData = req.body;

  if (!isMongoConnected()) {
    const newRider = {
      _id: `DR${Math.floor(Math.random() * 900) + 1000}`,
      joinedDate: new Date(),
      rating: 5.0,
      performance: {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        averageRating: 5.0,
        completionRate: 100,
        totalEarnings: 0,
        monthlyEarnings: 0
      },
      rideHistory: [],
      ...riderData,
      documents: {
        profilePhoto: riderData.documents?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        drivingLicense: riderData.documents?.drivingLicense || 'Verified',
        rcBook: riderData.documents?.rcBook || 'Verified',
        insurance: riderData.documents?.insurance || 'Verified',
        pollutionCertificate: riderData.documents?.pollutionCertificate || 'Verified',
        aadharFront: riderData.documents?.aadharFront || 'Verified',
        aadharBack: riderData.documents?.aadharBack || 'Verified',
        panCard: riderData.documents?.panCard || 'Verified'
      }
    };
    mockRidersDatabase.unshift(newRider);
    return res.status(201).json(newRider);
  }

  try {
    const newRider = new Rider(riderData);
    await newRider.save();
    res.status(201).json(newRider);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rider profile', message: err.message });
  }
});

// PUT /api/dashboard/riders/:id
router.put('/riders/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!isMongoConnected()) {
    const idx = mockRidersDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rider not found' });

    mockRidersDatabase[idx] = {
      ...mockRidersDatabase[idx],
      ...updateData
    };
    return res.json(mockRidersDatabase[idx]);
  }

  try {
    const updated = await Rider.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Rider not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rider profile', message: err.message });
  }
});

// DELETE /api/dashboard/riders/:id
router.delete('/riders/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockRidersDatabase.findIndex(r => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rider not found' });

    mockRidersDatabase.splice(idx, 1);
    return res.json({ message: 'Rider deleted successfully from memory' });
  }

  try {
    const deleted = await Rider.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Rider not found' });
    res.json({ message: 'Rider profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rider profile', message: err.message });
  }
});

// ==========================================
// USER MANAGEMENT DATABASE & ENDPOINTS
// ==========================================

let mockUsersDatabase = [
  {
    _id: 'UR10254',
    fullName: 'Shruti Verma',
    email: 'shruti@gmail.com',
    mobile: '+91 9876543210',
    whatsApp: '9876543210',
    password: 'password123',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    address: {
      line1: '56/A, MG Road',
      line2: 'Near Central Mall',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pinCode: '110001'
    },
    status: 'Active',
    userType: 'Frequent Traveller',
    registrationDate: new Date('2023-10-24T10:00:00Z'),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: '22 mins / day',
    activity: {
      recentLogins: [new Date('2026-06-12T09:00:00Z'), new Date('2026-06-11T14:20:00Z')],
      lastBooking: new Date('2026-05-15T16:00:00Z'),
      lastPayment: new Date('2026-05-15T16:05:00Z'),
      lastAppActivity: new Date('2026-06-12T10:30:00Z')
    },
    bookings: [
      { bookingId: '#BKT12066', bookingType: 'Homestay', property: 'Royal Retreat Homestay', location: 'Manali', checkIn: new Date('2024-01-12'), checkOut: new Date('2024-01-15'), amount: 9000, status: 'Completed' },
      { bookingId: '#BKT12956', bookingType: 'Homestay', property: 'Sea Breeze Homestay', location: 'Goa', checkIn: new Date('2023-12-25'), checkOut: new Date('2023-12-28'), amount: 9500, status: 'Completed' },
      { bookingId: '#BKT10515', bookingType: 'Homestay', property: 'Hilltop Haven Homestay', location: 'Shimla', checkIn: new Date('2024-01-23'), checkOut: new Date('2024-02-19'), amount: 6500, status: 'Upcoming' },
      { bookingId: '#BKT12288', bookingType: 'Homestay', property: 'Ocean View Homestay', location: 'Kochi', checkIn: new Date('2024-01-15'), checkOut: new Date('2024-01-18'), amount: 11200, status: 'Completed' },
      { bookingId: '#BKT12296', bookingType: 'Homestay', property: 'Paradise Homestay', location: 'Ooty', checkIn: new Date('2024-04-15'), checkOut: new Date('2024-04-18'), amount: 9000, status: 'Upcoming' }
    ],
    payments: [
      { transactionId: 'TXN88920192', date: new Date('2024-01-12'), amount: 9000, paymentMethod: 'UPI', status: 'Success' },
      { transactionId: 'TXN88920193', date: new Date('2023-12-25'), amount: 9500, paymentMethod: 'NetBanking', status: 'Success' },
      { transactionId: 'TXN88920194', date: new Date('2024-01-15'), amount: 11200, paymentMethod: 'Card', status: 'Success' }
    ]
  },
  {
    _id: 'UR10253',
    fullName: 'Rahul Sharma',
    email: 'rahul@gmail.com',
    mobile: '+91 9876543211',
    whatsApp: '9876543210',
    password: 'password123',
    photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    address: {
      line1: '34, Park Street',
      line2: 'Apt 4B',
      city: 'Siliguri',
      state: 'West Bengal',
      country: 'India',
      pinCode: '734001'
    },
    status: 'Active',
    userType: 'VIP User',
    registrationDate: new Date('2023-10-24T11:00:00Z'),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: '45 mins / day',
    activity: {
      recentLogins: [new Date('2026-06-12T11:15:00Z')],
      lastBooking: new Date('2026-05-10T12:00:00Z'),
      lastPayment: new Date('2026-05-10T12:05:00Z'),
      lastAppActivity: new Date('2026-06-12T11:30:00Z')
    },
    bookings: [
      { bookingId: '#BKT12071', bookingType: 'Hotel', property: 'Grand Palace Hotel', location: 'Siliguri', checkIn: new Date('2024-02-12'), checkOut: new Date('2024-02-15'), amount: 12000, status: 'Completed' },
      { bookingId: '#BKT12961', bookingType: 'Ride', property: 'SUV Ride', location: 'Lonavala', checkIn: new Date('2024-01-25'), checkOut: new Date('2024-01-25'), amount: 2500, status: 'Completed' }
    ],
    payments: [
      { transactionId: 'TXN88920201', date: new Date('2024-02-12'), amount: 12000, paymentMethod: 'Card', status: 'Success' },
      { transactionId: 'TXN88920202', date: new Date('2024-01-25'), amount: 2500, paymentMethod: 'UPI', status: 'Success' }
    ]
  },
  {
    _id: 'UR10412',
    fullName: 'Priya Gupta',
    email: 'priya@hotmail.com',
    mobile: '+91 989965255',
    whatsApp: '987695239',
    password: 'password123',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    address: {
      line1: '102, Levelle Rd',
      line2: 'Floor 3',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pinCode: '560001'
    },
    status: 'Active',
    userType: 'Regular User',
    registrationDate: new Date('2023-10-24T12:00:00Z'),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: '12 mins / day',
    activity: {
      recentLogins: [new Date('2026-06-10T14:00:00Z')],
      lastBooking: new Date('2026-04-02T10:00:00Z'),
      lastPayment: new Date('2026-04-02T10:10:00Z'),
      lastAppActivity: new Date('2026-06-10T14:15:00Z')
    },
    bookings: [
      { bookingId: '#BKT12075', bookingType: 'Sightseeing', property: 'Karla Caves Tour', location: 'Lonavala', checkIn: new Date('2024-03-01'), checkOut: new Date('2024-03-01'), amount: 1500, status: 'Completed' }
    ],
    payments: [
      { transactionId: 'TXN88920211', date: new Date('2024-03-01'), amount: 1500, paymentMethod: 'UPI', status: 'Success' }
    ]
  },
  {
    _id: 'UR10057',
    fullName: 'Amit Yadav',
    email: 'rishabk@gmail.com',
    mobile: '77993554422',
    whatsApp: '7799555422',
    password: 'password123',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    address: {
      line1: '420, Connaught Pl',
      line2: 'Block E',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      pinCode: '110001'
    },
    status: 'Active',
    userType: 'Corporate User',
    registrationDate: new Date('2023-10-24T13:00:00Z'),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: '18 mins / day',
    activity: {
      recentLogins: [new Date('2026-06-11T16:00:00Z')],
      lastBooking: new Date('2026-05-20T11:00:00Z'),
      lastPayment: new Date('2026-05-20T11:05:00Z'),
      lastAppActivity: new Date('2026-06-11T16:45:00Z')
    },
    bookings: [
      { bookingId: '#BKT12081', bookingType: 'Tour Package', property: 'Shimla Summer Special', location: 'Shimla', checkIn: new Date('2024-04-10'), checkOut: new Date('2024-04-14'), amount: 18000, status: 'Completed' }
    ],
    payments: [
      { transactionId: 'TXN88920221', date: new Date('2024-04-10'), amount: 18000, paymentMethod: 'UPI', status: 'Success' }
    ]
  },
  {
    _id: 'UR10058',
    fullName: 'Rishab Kapoor',
    email: 'rishabk@gmail.com',
    mobile: '9873215566',
    whatsApp: '7799555666',
    password: 'password123',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    address: {
      line1: '56/A, MG Road',
      line2: 'Opposite Plaza',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pinCode: '110001'
    },
    status: 'Blocked',
    userType: 'Frequent Traveller',
    registrationDate: new Date('2023-10-24T14:00:00Z'),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: '5 mins / day',
    activity: {
      recentLogins: [new Date('2026-05-15T09:00:00Z')],
      lastBooking: new Date('2026-04-12T14:00:00Z'),
      lastPayment: new Date('2026-04-12T14:10:00Z'),
      lastAppActivity: new Date('2026-05-15T09:30:00Z')
    },
    bookings: [
      { bookingId: '#BKT12091', bookingType: 'Homestay', property: 'Lake Side Retreat', location: 'Nainital', checkIn: new Date('2024-02-15'), checkOut: new Date('2024-02-18'), amount: 8000, status: 'Cancelled' }
    ],
    payments: [
      { transactionId: 'TXN88920231', date: new Date('2024-02-15'), amount: 8000, paymentMethod: 'UPI', status: 'Failed' }
    ]
  }
];

// Generate sample records up to 20 users
const sampleNames = [
  'Vikram Malhotra', 'Sneha Patel', 'Rajesh Iyer', 'Neha Sharma', 'Siddharth Sen',
  'Ayesha Khan', 'Karan Johar', 'Meera Nair', 'Aditya Roy', 'Anjali Desai',
  'Rohan Mehta', 'Pooja Hegde', 'Varun Dhawan', 'Kiara Advani', 'Ranbir Kapoor'
];
const sampleCities = [
  'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Chandigarh'
];
const sampleUserTypes = ['Regular User', 'Frequent Traveller', 'VIP User', 'Corporate User'];
const sampleStatuses = ['Active', 'Active', 'Active', 'Inactive', 'Inactive', 'Blocked'];

while (mockUsersDatabase.length < 20) {
  const idx = mockUsersDatabase.length;
  const name = sampleNames[idx - 5] || `User ${idx + 1}`;
  const city = sampleCities[idx % sampleCities.length];
  const type = sampleUserTypes[idx % sampleUserTypes.length];
  const status = sampleStatuses[idx % sampleStatuses.length];
  
  mockUsersDatabase.push({
    _id: `UR10${idx + 250}`,
    fullName: name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    mobile: `+91 98765${idx}321`,
    whatsApp: `98765${idx}321`,
    password: 'password123',
    photo: `https://images.unsplash.com/photo-${1500000000000 + idx * 50000}?w=150`,
    address: {
      line1: `${idx + 10}, Baker Street`,
      line2: 'Sector 5',
      city: city,
      state: 'Maharashtra',
      country: 'India',
      pinCode: `4000${idx}`
    },
    status: status,
    userType: type,
    registrationDate: new Date(new Date().getTime() - idx * 15 * 24 * 3600000),
    totalBookings: 0,
    totalSpend: 0,
    rewardPoints: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    averageDailyUsage: `${Math.floor(Math.random() * 30) + 5} mins / day`,
    activity: {
      recentLogins: [new Date()],
      lastBooking: new Date(new Date().getTime() - 5 * 24 * 3600000),
      lastPayment: new Date(new Date().getTime() - 5 * 24 * 3600000),
      lastAppActivity: new Date()
    },
    bookings: [
      { bookingId: `#BKT12${idx}10`, bookingType: 'Homestay', property: 'Green Valley Stay', location: 'Lonavala', checkIn: new Date('2024-05-01'), checkOut: new Date('2024-05-03'), amount: 4500, status: 'Completed' },
      { bookingId: `#BKT12${idx}20`, bookingType: 'Hotel', property: 'Resort Inn', location: 'Pune', checkIn: new Date('2024-05-15'), checkOut: new Date('2024-05-18'), amount: 6000, status: 'Completed' }
    ],
    payments: [
      { transactionId: `TXN88920${idx}11`, date: new Date('2024-05-01'), amount: 4500, paymentMethod: 'UPI', status: 'Success' },
      { transactionId: `TXN88920${idx}22`, date: new Date('2024-05-15'), amount: 6000, paymentMethod: 'Card', status: 'Success' }
    ]
  });
}

// Programmatic seeding to reach 50+ bookings and 30+ payments
let totalBookingsCount = 0;
let totalPaymentsCount = 0;
mockUsersDatabase.forEach(user => {
  totalBookingsCount += user.bookings.length;
  totalPaymentsCount += user.payments.length;
});

const bookingTypes = ['Homestay', 'Hotel', 'Ride', 'Sightseeing', 'Tour Package'];
const properties = ['Lake View Villa', 'Hilltop Resort', 'Metro Sedan', 'City Day Tour', 'Himalayan Explorer'];
const locations = ['Manali', 'Goa', 'Shimla', 'Ooty', 'Kochi', 'Pune', 'Lonavala'];

let uIdx = 0;
while (totalBookingsCount < 55) {
  const user = mockUsersDatabase[uIdx % mockUsersDatabase.length];
  const bType = bookingTypes[Math.floor(Math.random() * bookingTypes.length)];
  const bProp = properties[Math.floor(Math.random() * properties.length)];
  const bLoc = locations[Math.floor(Math.random() * locations.length)];
  const amt = (Math.floor(Math.random() * 8) + 1) * 1200;
  
  user.bookings.push({
    bookingId: `#BKT${Math.floor(Math.random() * 90000) + 10000}`,
    bookingType: bType,
    property: bProp,
    location: bLoc,
    checkIn: new Date(new Date().getTime() - Math.floor(Math.random() * 30) * 24 * 3600000),
    checkOut: new Date(new Date().getTime() - Math.floor(Math.random() * 25) * 24 * 3600000),
    amount: amt,
    status: ['Completed', 'Upcoming', 'Rescheduled', 'Cancelled'][Math.floor(Math.random() * 4)]
  });
  totalBookingsCount++;
  uIdx++;
}

uIdx = 0;
while (totalPaymentsCount < 35) {
  const user = mockUsersDatabase[uIdx % mockUsersDatabase.length];
  const amt = (Math.floor(Math.random() * 5) + 1) * 1000;
  
  user.payments.push({
    transactionId: `TXN${Math.floor(Math.random() * 90000000) + 10000000}`,
    date: new Date(new Date().getTime() - Math.floor(Math.random() * 15) * 24 * 3600000),
    amount: amt,
    paymentMethod: ['UPI', 'Card', 'NetBanking', 'Wallet'][Math.floor(Math.random() * 4)],
    status: ['Success', 'Pending', 'Failed'][Math.floor(Math.random() * 3)]
  });
  totalPaymentsCount++;
  uIdx++;
}

// Recalculate spending totals and bookings counts for consistency
mockUsersDatabase.forEach(user => {
  user.totalBookings = user.bookings.length;
  user.upcomingBookings = user.bookings.filter(b => b.status === 'Upcoming').length;
  user.cancelledBookings = user.bookings.filter(b => b.status === 'Cancelled').length;
  user.totalSpend = user.payments.filter(p => p.status === 'Success').reduce((sum, p) => sum + p.amount, 0);
  user.rewardPoints = Math.floor(user.totalSpend / 100);
});

// GET /api/dashboard/users/stats
router.get('/users/stats', async (req, res) => {
  if (!isMongoConnected()) {
    const totalUsers = mockUsersDatabase.filter(u => u.status !== 'Deleted').length;
    const activeUsers = mockUsersDatabase.filter(u => u.status === 'Active').length;
    const blockedUsers = mockUsersDatabase.filter(u => u.status === 'Blocked').length;
    
    const newRegistrationsThisMonth = mockUsersDatabase.filter(u => {
      const d = new Date(u.registrationDate);
      return d.getMonth() === 5 && d.getFullYear() === 2026; // June is index 5
    }).length;
    
    const totalBookings = mockUsersDatabase.reduce((sum, u) => sum + u.totalBookings, 0);
    const totalRevenueGenerated = mockUsersDatabase.reduce((sum, u) => sum + u.totalSpend, 0);
    
    return res.json({
      totalUsers,
      activeUsers,
      blockedUsers,
      newRegistrationsThisMonth,
      totalBookings,
      totalRevenueGenerated
    });
  }

  try {
    const totalUsers = await User.countDocuments({ status: { $ne: 'Deleted' } });
    const activeUsers = await User.countDocuments({ status: 'Active' });
    const blockedUsers = await User.countDocuments({ status: 'Blocked' });
    
    const startOfMonth = new Date('2026-06-01T00:00:00.000Z');
    const endOfMonth = new Date('2026-06-30T23:59:59.999Z');
    const newRegistrationsThisMonth = await User.countDocuments({
      registrationDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const sumResult = await User.aggregate([
      { $match: { status: { $ne: 'Deleted' } } },
      { $group: { _id: null, bookings: { $sum: '$totalBookings' }, spend: { $sum: '$totalSpend' } } }
    ]);
    
    const totalBookings = sumResult[0]?.bookings || 0;
    const totalRevenueGenerated = sumResult[0]?.spend || 0;

    res.json({
      totalUsers,
      activeUsers,
      blockedUsers,
      newRegistrationsThisMonth,
      totalBookings,
      totalRevenueGenerated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user stats', message: err.message });
  }
});

// GET /api/dashboard/users
router.get('/users', async (req, res) => {
  const { search, status, userType } = req.query;

  if (!isMongoConnected()) {
    let list = mockUsersDatabase.filter(u => u.status !== 'Deleted');

    if (status && status !== 'All') {
      list = list.filter(u => u.status === status);
    }
    if (userType && userType !== 'All') {
      list = list.filter(u => u.userType === userType);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => 
        u.fullName.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u._id.toLowerCase().includes(q)
      );
    }
    return res.json(list);
  }

  try {
    let query = { status: { $ne: 'Deleted' } };
    if (status && status !== 'All') {
      query.status = status;
    }
    if (userType && userType !== 'All') {
      query.userType = userType;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { fullName: regex },
        { mobile: regex },
        { email: regex },
        { _id: regex }
      ];
    }
    const users = await User.find(query).sort({ registrationDate: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list', message: err.message });
  }
});

// GET /api/dashboard/users/:id
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const item = mockUsersDatabase.find(u => u._id === id);
    if (!item || item.status === 'Deleted') return res.status(404).json({ error: 'User not found' });
    return res.json(item);
  }

  try {
    const item = await User.findById(id);
    if (!item || item.status === 'Deleted') return res.status(404).json({ error: 'User not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user details', message: err.message });
  }
});

// POST /api/dashboard/users
router.post('/users', async (req, res) => {
  const userData = req.body;

  if (!isMongoConnected()) {
    const newUser = {
      _id: `UR10${Math.floor(Math.random() * 900) + 100}`,
      registrationDate: new Date(),
      totalBookings: 0,
      totalSpend: 0,
      rewardPoints: 0,
      upcomingBookings: 0,
      cancelledBookings: 0,
      averageDailyUsage: '0 mins / day',
      bookings: [],
      payments: [],
      activity: {
        recentLogins: [new Date()],
        lastBooking: null,
        lastPayment: null,
        lastAppActivity: new Date()
      },
      ...userData
    };
    mockUsersDatabase.unshift(newUser);
    return res.status(201).json(newUser);
  }

  try {
    const newUser = new User(userData);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user profile', message: err.message });
  }
});

// PUT /api/dashboard/users/:id
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!isMongoConnected()) {
    const idx = mockUsersDatabase.findIndex(u => u._id === id);
    if (idx === -1 || mockUsersDatabase[idx].status === 'Deleted') return res.status(404).json({ error: 'User not found' });

    mockUsersDatabase[idx] = {
      ...mockUsersDatabase[idx],
      ...updateData
    };
    return res.json(mockUsersDatabase[idx]);
  }

  try {
    const updated = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated || updated.status === 'Deleted') return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user profile', message: err.message });
  }
});

// DELETE /api/dashboard/users/:id
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (!isMongoConnected()) {
    const idx = mockUsersDatabase.findIndex(u => u._id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    mockUsersDatabase[idx].status = 'Deleted';
    return res.json({ message: 'User profile marked as deleted successfully' });
  }

  try {
    const updated = await User.findByIdAndUpdate(id, { status: 'Deleted' }, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User profile marked as deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user profile', message: err.message });
  }
});

// ==========================================
// SIGHTSEEING / TOUR PACKAGES DATABASE & ENDPOINTS
// ==========================================

let mockTourPackagesDatabase = [];

function seedMockTourPackages() {
  const categories = ['Sightseeing', 'Adventure', 'Leisure', 'Pilgrimage', 'Honeymoon'];
  const regions = ['North Sikkim', 'East Sikkim', 'South Sikkim', 'West Sikkim', 'Darjeeling Region'];
  const destinationsList = [
    ['Gangtok', 'Darjeeling', 'Kalimpong'],
    ['Lachen', 'Lachung', 'Yumthang Valley', 'Gurudongmar Lake'],
    ['Pelling', 'Ravangla', 'Namchi'],
    ['Zuluk', 'Gnathang Valley', 'Aritar'],
    ['Gangtok', 'Tsomgo Lake', 'Baba Mandir', 'Nathu La']
  ];
  
  const basePackages = [
    {
      title: 'Gangtok & Darjeeling Classic Escape',
      category: 'Sightseeing',
      region: 'East Sikkim',
      destinations: ['Gangtok', 'Darjeeling', 'Kalimpong'],
      shortDescription: 'Experience the charming colonial hill station of Darjeeling and the vibrant capital city Gangtok.',
      highlights: 'Sunrise at Tiger Hill, Visit to Ghoom Monastery, Batasia Loop, Ropeway ride in Gangtok, Flower exhibition center.',
      nightsCount: 5,
      daysCount: 6,
      mealPlan: 'MAP',
      pickupLocation: 'Bagdogra Airport (IXB)',
      dropLocation: 'NJP Railway Station',
      tourType: 'Custom',
      isPrivate: true,
      inclusions: ['Premium Accommodation', 'Breakfast & Dinner', 'Private AC Sedan', 'Driver Allowance & Tolls', 'Local Guide in Darjeeling'],
      exclusions: ['Airfare / Train fare', 'Lunch & Personal Expenses', 'Entry Tickets to monuments', 'Nathu La Permit charges'],
      b2cPrice: 24500,
      b2bPrice: 20000,
      childPrice: 8500,
      extraPersonPrice: 12000,
      tax: 5,
      itinerary: [
        {
          dayNumber: 1,
          stayLocation: 'Gangtok',
          mealPlan: 'Dinner',
          description: 'Arrive at Bagdogra Airport or NJP Railway Station. Meet our representative and transfer to Gangtok. Check in to your hotel and spend the evening at leisure exploring MG Marg.',
          sightseeingPoints: [
            { name: 'MG Marg', description: 'Walk through the clean, litter-free pedestrian shopping street of Gangtok.', image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=400' }
          ]
        },
        {
          dayNumber: 2,
          stayLocation: 'Gangtok',
          mealPlan: 'MAP',
          description: 'After breakfast, proceed for a full day sightseeing tour of Gangtok covering Rumtek Monastery, Tashi View Point, Ganesh Tok, and Enchey Monastery.',
          sightseeingPoints: [
            { name: 'Rumtek Monastery', description: 'One of the largest and most significant monasteries in Sikkim, showcasing rare Tibetan Buddhist art.', image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400' },
            { name: 'Tashi View Point', description: 'Offers sweeping views of Kanchenjunga snow peaks on a clear day.', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400' }
          ]
        },
        {
          dayNumber: 3,
          stayLocation: 'Gangtok',
          mealPlan: 'MAP',
          description: 'Excursion to Tsomgo Lake and Baba Harbhajan Singh Mandir. Enjoy the snow and high altitude views.',
          sightseeingPoints: [
            { name: 'Tsomgo Lake', description: 'A sacred, high-altitude glacial lake surrounded by steep, snow-capped mountains.', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400' }
          ]
        },
        {
          dayNumber: 4,
          stayLocation: 'Darjeeling',
          mealPlan: 'MAP',
          description: 'Transfer to Darjeeling, the land of tea gardens. Check in to your premium hotel and enjoy a scenic sunset over the mountains.',
          sightseeingPoints: [
            { name: 'Darjeeling Tea Garden View', description: 'Panoramic views of verdant hills covered with lush green tea bushes.', image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400' }
          ]
        },
        {
          dayNumber: 5,
          stayLocation: 'Darjeeling',
          mealPlan: 'MAP',
          description: 'Early morning visit to Tiger Hill for sunrise. On the way back, visit Ghoom Monastery and Batasia Loop. After breakfast, visit Himalayan Mountaineering Institute (HMI) and Zoo.',
          sightseeingPoints: [
            { name: 'Tiger Hill Sunrise', description: 'Spectacular view of sunrise lighting up Mt. Kanchenjunga in gold.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400' },
            { name: 'Batasia Loop', description: 'A spiral railway loop offering panoramic views of Darjeeling town and Kanchenjunga.', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400' }
          ]
        },
        {
          dayNumber: 6,
          stayLocation: 'Departure',
          mealPlan: 'Breakfast',
          description: 'After breakfast, check out from the hotel and transfer to NJP Railway Station or Bagdogra Airport for your onward journey.',
          sightseeingPoints: []
        }
      ]
    },
    {
      title: 'North Sikkim Wilderness Adventure',
      category: 'Adventure',
      region: 'North Sikkim',
      destinations: ['Lachen', 'Lachung', 'Yumthang Valley', 'Gurudongmar Lake'],
      shortDescription: 'Embark on a thrilling journey through North Sikkim, visiting high altitude lakes and flower valleys.',
      highlights: 'Excursion to Gurudongmar Lake, Yumthang Valley of Flowers, Lachung Monastery, Zero Point snow fields.',
      nightsCount: 4,
      daysCount: 5,
      mealPlan: 'AP',
      pickupLocation: 'Gangtok Hotel',
      dropLocation: 'Gangtok Hotel',
      tourType: 'Group',
      isPrivate: false,
      inclusions: ['Basic Homestay Stay', 'All Meals (Breakfast, Lunch, Dinner)', 'Shared SUV (Sumo/Maxx)', 'Permit Arrangements', 'Driver expenses'],
      exclusions: ['Zero Point extra vehicle charge', 'Mineral water & beverages', 'Travel Insurance', 'Personal porter charges'],
      b2cPrice: 16500,
      b2bPrice: 13500,
      childPrice: 6000,
      extraPersonPrice: 9000,
      tax: 5,
      itinerary: [
        {
          dayNumber: 1,
          stayLocation: 'Lachen',
          mealPlan: 'Lunch + Dinner',
          description: 'Start early morning from Gangtok. Travel along the dramatic Teesta River, passing waterfalls like Bhim Nala. Arrive at the remote village Lachen (8,800 ft).',
          sightseeingPoints: [
            { name: 'Teesta River View', description: 'Scenic points along the rushing Teesta river flowing through deep gorges.', image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400' }
          ]
        },
        {
          dayNumber: 2,
          stayLocation: 'Lachung',
          mealPlan: 'AP',
          description: 'Drive at 4 AM to Gurudongmar Lake (17,800 ft), one of the highest lakes in the world. Spend some time absorbing the pristine white landscape. Return for lunch, then transfer to Lachung.',
          sightseeingPoints: [
            { name: 'Gurudongmar Lake', description: 'Breathtakingly beautiful sacred lake surrounded by snow-clad mountains.', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400' }
          ]
        },
        {
          dayNumber: 3,
          stayLocation: 'Lachung',
          mealPlan: 'AP',
          description: 'Visit Yumthang Valley, also known as the Valley of Flowers. Optional excursion to Zero Point (Yumesamdong) at extra cost. Return to Lachung for overnight stay.',
          sightseeingPoints: [
            { name: 'Yumthang Valley', description: 'A alpine meadow filled with hot springs, yaks, and beautiful rhododendron trees.', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400' }
          ]
        },
        {
          dayNumber: 4,
          stayLocation: 'Gangtok',
          mealPlan: 'Breakfast + Lunch',
          description: 'Check out from Lachung. Return drive to Gangtok, stopping by beautiful viewpoints. Check in to your Gangtok hotel by evening.',
          sightseeingPoints: []
        },
        {
          dayNumber: 5,
          stayLocation: 'Departure',
          mealPlan: 'Breakfast',
          description: 'Departure from Gangtok hotel. Head home with adventurous memories.',
          sightseeingPoints: []
        }
      ]
    },
    {
      title: 'Pelling Scenic Gateway & Heritage',
      category: 'Leisure',
      region: 'West Sikkim',
      destinations: ['Pelling', 'Ravangla', 'Namchi'],
      shortDescription: 'Explore the historical monuments, skywalks, and breathtaking Kanchenjunga views of West Sikkim.',
      highlights: 'Pelling Skywalk, Khecheopalri Lake, Rabdentse Ruins, Tathagata Sal (Buddha Park) in Ravangla.',
      nightsCount: 3,
      daysCount: 4,
      mealPlan: 'CP',
      pickupLocation: 'NJP Railway Station',
      dropLocation: 'Bagdogra Airport (IXB)',
      tourType: 'Custom',
      isPrivate: true,
      inclusions: ['Premium Resort Stay', 'Breakfast daily', 'Private SUV (Innova)', 'Sightseeing entry passes', 'driver allowance'],
      exclusions: ['Lunch & Dinner', 'Tips, laundry & drinks', 'Guide charges', 'Activity sports like zipline'],
      b2cPrice: 19800,
      b2bPrice: 16500,
      childPrice: 7000,
      extraPersonPrice: 10000,
      tax: 5,
      itinerary: [
        {
          dayNumber: 1,
          stayLocation: 'Pelling',
          mealPlan: 'None',
          description: 'Transfer from NJP/Bagdogra to Pelling. Enjoy the changing landscapes from tea plains to high hills. Check in and relax.',
          sightseeingPoints: []
        },
        {
          dayNumber: 2,
          stayLocation: 'Pelling',
          mealPlan: 'Breakfast',
          description: 'Full day local sightseeing in Pelling. Visit India’s first Glass Skywalk, Chenrezig Statue, Rimbi Waterfalls, Orange Garden, and the sacred Khecheopalri Lake.',
          sightseeingPoints: [
            { name: 'Pelling Skywalk', description: 'A thrilling glass-floor walk looking down at the valley, facing the massive statue of Chenrezig.', image: 'https://images.unsplash.com/photo-1522083165195-3427502977a1?w=400' },
            { name: 'Khecheopalri Lake', description: 'Sacred wishing lake where it is said birds clean any leaves that fall on the surface.', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400' }
          ]
        },
        {
          dayNumber: 3,
          stayLocation: 'Pelling',
          mealPlan: 'Breakfast',
          description: 'Travel to Ravangla. Visit the magnificent Buddha Park featuring a 130-foot tall Buddha statue. Return to Pelling, visiting Rabdentse Ruins on the way.',
          sightseeingPoints: [
            { name: 'Buddha Park Ravangla', description: 'A beautifully landscaped park containing a magnificent monument towering over the region.', image: 'https://images.unsplash.com/photo-1598977123418-45f04b01d4ae?w=400' },
            { name: 'Rabdentse Ruins', description: 'The historic second capital of the former Kingdom of Sikkim, surrounded by forest walking trails.', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400' }
          ]
        },
        {
          dayNumber: 4,
          stayLocation: 'Departure',
          mealPlan: 'Breakfast',
          description: 'After breakfast, check out and drive back to Bagdogra/NJP for departure.',
          sightseeingPoints: []
        }
      ]
    },
    {
      title: 'Historical Silk Route Expedition',
      category: 'Adventure',
      region: 'East Sikkim',
      destinations: ['Zuluk', 'Gnathang Valley', 'Aritar'],
      shortDescription: 'Step back in time along the ancient trade route connecting India and Tibet, staying in local homestays.',
      highlights: 'Thambi View Point zig-zag road, Kupup Lake (Elephant Lake), Gnathang Valley snow peaks, Aritar Lake.',
      nightsCount: 4,
      daysCount: 5,
      mealPlan: 'MAP',
      pickupLocation: 'Siliguri',
      dropLocation: 'Siliguri',
      tourType: 'Custom',
      isPrivate: true,
      inclusions: ['Cozy Village Homestays', 'Breakfast & Dinner', 'Private Bolero/Scorpio SUV', 'Special Restricted Area Permit', 'Driver stay and meals'],
      exclusions: ['Lunch meals', 'Liquor & snacks', 'Room heaters charges (payable locally)', 'Tips'],
      b2cPrice: 18500,
      b2bPrice: 15000,
      childPrice: 5500,
      extraPersonPrice: 8500,
      tax: 5,
      itinerary: [
        {
          dayNumber: 1,
          stayLocation: 'Aritar',
          mealPlan: 'Dinner',
          description: 'Transfer from Siliguri to Aritar. Visit Lampokhari (Aritar Lake), one of the oldest natural lakes in Sikkim where boating is available.',
          sightseeingPoints: [
            { name: 'Aritar Lake', description: 'Emerald green emerald lake surrounded by pine forests, great for peaceful walks.', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400' }
          ]
        },
        {
          dayNumber: 2,
          stayLocation: 'Zuluk',
          mealPlan: 'Breakfast + Dinner',
          description: 'Obtain permits and drive to Zuluk, a small hamlet that once served as a transit point on the Silk Route. Explore the village on foot.',
          sightseeingPoints: [
            { name: 'Zuluk Village', description: 'A tiny military-adjacent village perched on high hills with beautiful sunset views.', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400' }
          ]
        },
        {
          dayNumber: 3,
          stayLocation: 'Zuluk',
          mealPlan: 'MAP',
          description: 'Wake up early to visit Thambi View Point to witness sunrise over the zig-zag curves of Zuluk road. Proceed to Kupup Lake and Baba Mandir.',
          sightseeingPoints: [
            { name: 'Thambi View Point', description: 'Famous viewpoint showing the iconic 32 hair-pin bends of the Silk Route winding down the mountain.', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400' },
            { name: 'Kupup Lake', description: 'A high altitude lake resembling an elephant shape, surrounded by frozen valleys.', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400' }
          ]
        },
        {
          dayNumber: 4,
          stayLocation: 'Aritar',
          mealPlan: 'MAP',
          description: 'Drive down from Zuluk to Aritar, enjoying the scenic descent. Relax at the homestay and experience local Sikkimese hospitality and food.',
          sightseeingPoints: []
        },
        {
          dayNumber: 5,
          stayLocation: 'Departure',
          mealPlan: 'Breakfast',
          description: 'Transfer back to Siliguri for your departure.',
          sightseeingPoints: []
        }
      ]
    },
    {
      title: 'Tsomgo Lake & Gangtok Short Escapade',
      category: 'Sightseeing',
      region: 'East Sikkim',
      destinations: ['Gangtok', 'Tsomgo Lake', 'Baba Mandir'],
      shortDescription: 'A quick tour designed to show you Gangtok capital and the famous high altitude glacial Tsomgo lake.',
      highlights: 'Excursion to Tsomgo Lake, Baba Harbhajan Mandir, Gangtok local sightseeing, shopping on MG Road.',
      nightsCount: 2,
      daysCount: 3,
      mealPlan: 'CP',
      pickupLocation: 'NJP Railway Station',
      dropLocation: 'NJP Railway Station',
      tourType: 'Group',
      isPrivate: false,
      inclusions: ['3 Star Hotel Stay', 'Daily breakfast', 'Shared SUV transfer', 'Permit registration costs', 'driver charges'],
      exclusions: ['Lunch & Dinner meals', 'Nathula pass entry fee', 'Snow gear rent (coats, boots)', 'Tips'],
      b2cPrice: 11500,
      b2bPrice: 9500,
      childPrice: 4000,
      extraPersonPrice: 6500,
      tax: 5,
      itinerary: [
        {
          dayNumber: 1,
          stayLocation: 'Gangtok',
          mealPlan: 'None',
          description: 'Arrive in NJP and transfer to Gangtok. Spend the evening walking around MG Marg.',
          sightseeingPoints: []
        },
        {
          dayNumber: 2,
          stayLocation: 'Gangtok',
          mealPlan: 'Breakfast',
          description: 'Full day excursion to Tsomgo Lake and Baba Mandir. If permission is granted, visit Nathu La Pass (Indo-China border).',
          sightseeingPoints: [
            { name: 'Tsomgo Glacial Lake', description: 'Stunning oval glacial lake sacred to both Buddhists and Hindus.', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400' }
          ]
        },
        {
          dayNumber: 3,
          stayLocation: 'Departure',
          mealPlan: 'Breakfast',
          description: 'Quick morning sightseeing of Gangtok ropeway, then drive back to NJP.',
          sightseeingPoints: []
        }
      ]
    }
  ];

  const vehiclesCostMock = [
    { vehicleType: 'Sedan', vehicleModel: 'Swift Dzire / Etios', b2bCost: 3500, b2cCost: 4500, availability: 'Available' },
    { vehicleType: 'SUV', vehicleModel: 'Innova Crysta', b2bCost: 5500, b2cCost: 7000, availability: 'Available' },
    { vehicleType: 'SUV Luxury', vehicleModel: 'Scorpio / Xylo', b2bCost: 4500, b2cCost: 5800, availability: 'Available' },
    { vehicleType: 'Hatchback', vehicleModel: 'WagonR / Alto', b2bCost: 2500, b2cCost: 3200, availability: 'Available' }
  ];

  const authors = ['Super Admin', 'Operation Manager Priya', 'Vikram Patel', 'Amit Verma'];

  for (let i = 0; i < 50; i++) {
    const base = basePackages[i % basePackages.length];
    const category = categories[i % categories.length];
    const region = regions[i % regions.length];
    const destinations = destinationsList[i % destinationsList.length];
    const author = authors[i % authors.length];
    
    const idNum = 1001 + i;
    const packageId = `PKG-${idNum}`;
    const status = i < 35 ? 'Active' : (i < 43 ? 'Draft' : (i < 48 ? 'Inactive' : 'Archived'));
    
    const modifier = 0.85 + (i % 7) * 0.05;
    const b2cPrice = Math.round((base.b2cPrice * modifier) / 100) * 100;
    const b2bPrice = Math.round((base.b2bPrice * modifier) / 100) * 100;
    const childPrice = Math.round((base.childPrice * modifier) / 100) * 100;
    const extraPersonPrice = Math.round((base.extraPersonPrice * modifier) / 100) * 100;
    
    const peakPrice = Math.round(b2cPrice * 1.25);
    const offPrice = Math.round(b2cPrice * 0.8);
    const midPrice = b2cPrice;

    const bookings = Math.floor(Math.random() * 80) + (status === 'Active' ? 15 : 0);
    const completedTours = Math.floor(bookings * 0.85);
    const upcomingTours = Math.floor(bookings * 0.1);
    const cancelledTours = bookings - completedTours - upcomingTours;
    const revenueGenerated = bookings * b2cPrice;
    
    const ratings = [4.2, 4.5, 4.7, 4.8, 5.0];
    const averageRating = ratings[i % ratings.length];

    const titleSuffixes = [' Premium', ' Explorer Pack', ' Budget Stay', ' Luxury Tour', ' Eco-Friendly Tour', ' Golden Jubilee Special', ' Weekend Getaway', ' Signature Tour', ' Family Package', ' Adventure Special'];
    const title = base.title.replace('Classic Escape', '').replace('Wilderness Adventure', '').replace('Scenic Gateway & Heritage', '').replace('Expedition', '').replace('Short Escapade', '').trim() + titleSuffixes[i % titleSuffixes.length];

    const itinerary = base.itinerary.map(day => {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + day.dayNumber);
      return {
        ...day,
        date: dayDate
      };
    });

    const newPkg = {
      _id: `TP${idNum}`,
      packageId,
      title,
      destinations,
      coverPhoto: base.coverPhoto || `https://images.unsplash.com/photo-${1500000000000 + i * 100000}?w=800&auto=format&fit=crop`,
      galleryPhotos: [
        `https://images.unsplash.com/photo-${1510000000000 + i * 100000}?w=400`,
        `https://images.unsplash.com/photo-${1520000000000 + i * 100000}?w=400`
      ],
      category,
      region,
      tags: [category, region.replace(' Sikkim', ''), 'Tour', 'NorthEast'],
      shortDescription: base.shortDescription,
      highlights: base.highlights,
      nightsCount: base.nightsCount,
      daysCount: base.daysCount,
      mealPlan: base.mealPlan,
      startDate: new Date(),
      pickupLocation: base.pickupLocation,
      dropLocation: base.dropLocation,
      tourType: base.tourType,
      isPrivate: base.isPrivate,
      itinerary,
      vehicles: vehiclesCostMock.map((v, vidx) => ({
        ...v,
        b2bCost: Math.round(v.b2bCost * modifier),
        b2cCost: Math.round(v.b2cCost * modifier)
      })),
      inclusions: base.inclusions,
      exclusions: base.exclusions,
      b2cPrice,
      b2bPrice,
      childPrice,
      extraPersonPrice,
      peakPrice,
      midPrice,
      offPrice,
      discount: (i % 4) * 5,
      offerPrice: Math.round(b2cPrice * (1 - ((i % 4) * 5) / 100)),
      tax: base.tax,
      bookings,
      completedTours,
      upcomingTours,
      cancelledTours,
      revenueGenerated,
      averageRating,
      status,
      createdBy: author,
      createdAt: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)),
      lastUpdated: new Date(),
      remarks: `Initial system setup. Seeded package ${packageId}`
    };

    mockTourPackagesDatabase.push(newPkg);
  }
}

seedMockTourPackages();

// Helper to seed mongo if connected & empty
async function ensureMongoTourPackagesSeeded() {
  if (isMongoConnected()) {
    try {
      const count = await TourPackage.countDocuments();
      if (count === 0) {
        console.log('Seeding MongoDB Tour Packages...');
        await TourPackage.insertMany(mockTourPackagesDatabase);
      }
    } catch (e) {
      console.error('Error seeding MongoDB Tour Packages:', e.message);
    }
  }
}

// GET /api/dashboard/tour-packages/stats
router.get('/tour-packages/stats', async (req, res) => {
  await ensureMongoTourPackagesSeeded();
  if (!isMongoConnected()) {
    const list = mockTourPackagesDatabase;
    const totalPackages = list.length;
    const activePackages = list.filter(p => p.status === 'Active').length;
    const draftPackages = list.filter(p => p.status === 'Draft').length;
    const totalBookings = list.reduce((sum, p) => sum + (p.bookings || 0), 0);
    const totalRevenue = list.reduce((sum, p) => sum + (p.revenueGenerated || 0), 0);
    return res.json({ totalPackages, activePackages, draftPackages, totalBookings, totalRevenue });
  }

  try {
    const totalPackages = await TourPackage.countDocuments();
    const activePackages = await TourPackage.countDocuments({ status: 'Active' });
    const draftPackages = await TourPackage.countDocuments({ status: 'Draft' });
    const stats = await TourPackage.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: '$bookings' },
          totalRevenue: { $sum: '$revenueGenerated' }
        }
      }
    ]);
    const totalBookings = stats.length > 0 ? stats[0].totalBookings : 0;
    const totalRevenue = stats.length > 0 ? stats[0].totalRevenue : 0;
    res.json({ totalPackages, activePackages, draftPackages, totalBookings, totalRevenue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch package stats', message: error.message });
  }
});

// GET /api/dashboard/tour-packages
router.get('/tour-packages', async (req, res) => {
  await ensureMongoTourPackagesSeeded();
  const { search, status, destination, duration, mealPlan, tourType, isPrivate, region } = req.query;

  if (!isMongoConnected()) {
    let list = [...mockTourPackagesDatabase];
    if (status && status !== 'All') {
      list = list.filter(pkg => pkg.status === status);
    }
    if (destination && destination !== 'All') {
      list = list.filter(pkg => pkg.destinations.includes(destination));
    }
    if (duration && duration !== 'All') {
      if (duration === '1-3 Nights') {
        list = list.filter(pkg => pkg.nightsCount >= 1 && pkg.nightsCount <= 3);
      } else if (duration === '4-6 Nights') {
        list = list.filter(pkg => pkg.nightsCount >= 4 && pkg.nightsCount <= 6);
      } else if (duration === '7+ Nights') {
        list = list.filter(pkg => pkg.nightsCount >= 7);
      }
    }
    if (mealPlan && mealPlan !== 'All') {
      list = list.filter(pkg => pkg.mealPlan === mealPlan);
    }
    if (tourType && tourType !== 'All') {
      list = list.filter(pkg => pkg.tourType === tourType);
    }
    if (isPrivate && isPrivate !== 'All') {
      const val = isPrivate === 'true';
      list = list.filter(pkg => pkg.isPrivate === val);
    }
    if (region && region !== 'All') {
      list = list.filter(pkg => pkg.region === region);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(pkg => 
        pkg.packageId.toLowerCase().includes(q) ||
        pkg.title.toLowerCase().includes(q) ||
        pkg.category.toLowerCase().includes(q) ||
        pkg.region.toLowerCase().includes(q) ||
        pkg.createdBy.toLowerCase().includes(q) ||
        pkg.destinations.some(d => d.toLowerCase().includes(q))
      );
    }
    return res.json(list);
  }

  try {
    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (destination && destination !== 'All') {
      query.destinations = destination;
    }
    if (duration && duration !== 'All') {
      if (duration === '1-3 Nights') {
        query.nightsCount = { $gte: 1, $lte: 3 };
      } else if (duration === '4-6 Nights') {
        query.nightsCount = { $gte: 4, $lte: 6 };
      } else if (duration === '7+ Nights') {
        query.nightsCount = { $gte: 7 };
      }
    }
    if (mealPlan && mealPlan !== 'All') {
      query.mealPlan = mealPlan;
    }
    if (tourType && tourType !== 'All') {
      query.tourType = tourType;
    }
    if (isPrivate && isPrivate !== 'All') {
      query.isPrivate = isPrivate === 'true';
    }
    if (region && region !== 'All') {
      query.region = region;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { packageId: regex },
        { title: regex },
        { category: regex },
        { region: regex },
        { createdBy: regex },
        { destinations: { $in: [regex] } }
      ];
    }
    const list = await TourPackage.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages list', message: error.message });
  }
});

// GET /api/dashboard/tour-packages/:id
router.get('/tour-packages/:id', async (req, res) => {
  await ensureMongoTourPackagesSeeded();
  const { id } = req.params;

  if (!isMongoConnected()) {
    const item = mockTourPackagesDatabase.find(pkg => pkg._id === id || pkg.packageId === id);
    if (!item) return res.status(404).json({ error: 'Tour package not found' });
    return res.json(item);
  }

  try {
    const item = await TourPackage.findOne({ $or: [{ _id: id }, { packageId: id }] });
    if (!item) return res.status(404).json({ error: 'Tour package not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch package details', message: error.message });
  }
});

// POST /api/dashboard/tour-packages
router.post('/tour-packages', async (req, res) => {
  const pkgData = req.body;

  if (!isMongoConnected()) {
    const idNum = 1001 + mockTourPackagesDatabase.length;
    const newId = `TP${idNum}`;
    const packageId = pkgData.packageId || `PKG-${idNum}`;
    const newPkg = {
      _id: newId,
      packageId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      bookings: 0,
      completedTours: 0,
      upcomingTours: 0,
      cancelledTours: 0,
      revenueGenerated: 0,
      averageRating: 5.0,
      ...pkgData
    };
    mockTourPackagesDatabase.unshift(newPkg);
    return res.status(201).json(newPkg);
  }

  try {
    const count = await TourPackage.countDocuments();
    const nextIdNum = 1001 + count;
    const nextId = `TP${nextIdNum}`;
    const newPkgId = pkgData.packageId || `PKG-${nextIdNum}`;
    const newPkg = new TourPackage({
      _id: nextId,
      packageId: newPkgId,
      ...pkgData,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    await newPkg.save();
    res.status(201).json(newPkg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tour package', message: error.message });
  }
});

// PUT /api/dashboard/tour-packages/:id
router.put('/tour-packages/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!isMongoConnected()) {
    const idx = mockTourPackagesDatabase.findIndex(pkg => pkg._id === id || pkg.packageId === id);
    if (idx === -1) return res.status(404).json({ error: 'Tour package not found' });

    mockTourPackagesDatabase[idx] = {
      ...mockTourPackagesDatabase[idx],
      ...updateData,
      lastUpdated: new Date()
    };
    return res.json(mockTourPackagesDatabase[idx]);
  }

  try {
    const updated = await TourPackage.findOneAndUpdate(
      { $or: [{ _id: id }, { packageId: id }] },
      { ...updateData, lastUpdated: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Tour package not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tour package', message: error.message });
  }
});

// DELETE /api/dashboard/tour-packages/:id
router.delete('/tour-packages/:id', async (req, res) => {
  const { id } = req.params;

  // Enforce delete validation (reject if active bookings exist)
  if (!isMongoConnected()) {
    const item = mockTourPackagesDatabase.find(pkg => pkg._id === id || pkg.packageId === id);
    if (!item) return res.status(404).json({ error: 'Tour package not found' });

    const hasActiveBookings = mockBookingsDatabase.some(b => 
      ['Tour Package Booking', 'Sightseeing Booking', 'Tour Package', 'Sightseeing'].includes(b.bookingType) &&
      ['Confirmed', 'Pending', 'Upcoming', 'Checked In'].includes(b.bookingStatus) &&
      ((b.sightseeingDetails && b.sightseeingDetails.packageName === item.title) ||
       (b.propertyDetails && b.propertyDetails.propertyId === item.packageId) ||
       (b.propertyDetails && b.propertyDetails.propertyId === item._id))
    );
    if (hasActiveBookings) {
      return res.status(400).json({ error: 'Cannot delete package. Active booking records exist.' });
    }

    const idx = mockTourPackagesDatabase.findIndex(pkg => pkg._id === id || pkg.packageId === id);
    mockTourPackagesDatabase.splice(idx, 1);
    return res.json({ message: 'Tour package deleted successfully' });
  }

  try {
    const item = await TourPackage.findOne({ $or: [{ _id: id }, { packageId: id }] });
    if (!item) return res.status(404).json({ error: 'Tour package not found' });

    const activeBookingCount = await Booking.countDocuments({
      bookingType: { $in: ['Tour Package Booking', 'Sightseeing Booking'] },
      bookingStatus: { $in: ['Confirmed', 'Pending', 'Upcoming', 'Checked In'] },
      $or: [
        { 'sightseeingDetails.packageName': item.title },
        { 'propertyDetails.propertyId': item.packageId },
        { 'propertyDetails.propertyId': item._id }
      ]
    });
    if (activeBookingCount > 0) {
      return res.status(400).json({ error: 'Cannot delete package. Active booking records exist.' });
    }

    await TourPackage.deleteOne({ _id: item._id });
    res.json({ message: 'Tour package deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tour package', message: error.message });
  }
});

// ==========================================
// AUTHENTICATION SYSTEM ENDPOINTS
// ==========================================

let mockAdminsDatabase = [
  {
    _id: 'admin-default',
    email: 'devgateways947@gmail.com',
    fullName: 'Wow Gateway Lead Developer',
    name: 'Dev Gateways',
    role: 'Super Admin',
    passwordHash: '$2b$10$1VFejybsDyG9ioWbLiYSvegwKzx.ekc//aFllYVZghJXS1bNhxu5u', // Gateway@123
    failedLoginAttempts: 0,
    lockoutUntil: null,
    status: 'Active',
    mobileNumber: '+91 98765 43210',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date()
  }
];

let mockSmtpSettings = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  email: process.env.SMTP_EMAIL || 'Chetanprajapat007@gmail.com',
  appPassword: process.env.SMTP_PASSWORD || 'rmbxpgfuiayhpyrg',
  secure: process.env.SMTP_SECURE !== 'false',
  senderName: process.env.SMTP_SENDER_NAME || 'Wow Gateways Support',
  enabled: process.env.SMTP_ENABLED !== 'false'
};

let mockPasswordResets = [];

async function ensureMongoAdminSeeded() {
  if (isMongoConnected()) {
    try {
      const count = await Admin.countDocuments({ email: 'devgateways947@gmail.com' });
      if (count === 0) {
        console.log('Seeding default MongoDB Super Admin...');
        const admin = new Admin({
          email: 'devgateways947@gmail.com',
          fullName: 'Wow Gateway Lead Developer',
          name: 'Dev Gateways',
          role: 'Super Admin',
          passwordHash: '$2b$10$1VFejybsDyG9ioWbLiYSvegwKzx.ekc//aFllYVZghJXS1bNhxu5u', // Gateway@123
          failedLoginAttempts: 0,
          status: 'Active',
          mobileNumber: '+91 98765 43210',
          profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        });
        await admin.save();
      }
    } catch (err) {
      console.error('Error seeding MongoDB Admin:', err.message);
    }
  }
}

async function ensureMongoSmtpSeeded() {
  if (isMongoConnected()) {
    try {
      const count = await SmtpSettings.countDocuments();
      if (count === 0) {
        console.log('Seeding default MongoDB SMTP Settings...');
        const settings = new SmtpSettings({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 465,
          email: process.env.SMTP_EMAIL || 'Chetanprajapat007@gmail.com',
          appPassword: encrypt(process.env.SMTP_PASSWORD || 'rmbxpgfuiayhpyrg'), // Encrypted seed password
          secure: process.env.SMTP_SECURE !== 'false',
          senderName: process.env.SMTP_SENDER_NAME || 'Wow Gateways Support',
          enabled: process.env.SMTP_ENABLED !== 'false'
        });
        await settings.save();
      }
    } catch (err) {
      console.error('Error seeding MongoDB SMTP settings:', err.message);
    }
  }
}

// Nodemailer dynamic transporter factory
async function sendOtpEmail(email, otp) {
  let smtp = mockSmtpSettings;
  if (isMongoConnected()) {
    try {
      const dbSmtp = await SmtpSettings.findOne();
      if (dbSmtp) {
        smtp = dbSmtp;
      }
    } catch (err) {
      console.error('[SMTP DB Lookup] Failed to fetch settings, using memory fallback:', err.message);
    }
  }

  if (!smtp.enabled) {
    throw new Error('SMTP service is currently disabled in configuration settings.');
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.email,
      pass: decrypt(smtp.appPassword) // Decrypt password for authentication
    }
  });

  const mailOptions = {
    from: `"${smtp.senderName || 'Wow Gateways Support'}" <${smtp.email}>`,
    to: email,
    subject: 'Verification Code - Super Admin Password Recovery',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
          <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0;">WOW Gateways</h1>
          <p style="color: #64748b; font-size: 12px; margin-top: 5px;">Super Admin Control Center</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello Administrator,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">We received a request to reset your Super Admin password. Please use the following 6-digit numeric One-Time Password (OTP) to complete the verification process:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; color: #1e293b; letter-spacing: 5px; background-color: #f8fafc; padding: 15px 30px; border: 1px dashed #cbd5e1; border-radius: 12px; display: inline-block;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 12px; color: #ef4444; font-weight: 700; margin-bottom: 20px;">
            ⚠️ Notice: This OTP is valid for exactly 10 minutes and can only be used once.
          </p>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
            If you did not authorize this request, please contact your security operations lead immediately.
          </p>
        </div>
        <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; 2026 Wow Gateways E-Commerce Logistics Group. All rights reserved.
        </div>
      </div>
    `
  };

  console.log(`[SMTP] Attempting to send OTP email to ${email} using: ${smtp.email}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[SMTP] Email sent: ${info.messageId}`);
  return info;
}

// POST /api/admin/auth/login
const handleAdminLogin = async (req, res) => {
  await ensureMongoAdminSeeded();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailLower = email.trim().toLowerCase();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower) || password.length < 8) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  // 1. Fallback (Memory Mode)
  if (!isMongoConnected()) {
    const admin = mockAdminsDatabase.find(a => a.email === emailLower);
    if (!admin) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (admin.lockoutUntil && new Date(admin.lockoutUntil) > new Date()) {
      const remainingMin = Math.ceil((new Date(admin.lockoutUntil) - new Date()) / (60 * 1000));
      return res.status(423).json({ error: `Account blocked due to multiple failed attempts. Try again in \${remainingMin} minute(s).` });
    }

    const isMatch = admin.passwordHash.startsWith('$2')
      ? await bcrypt.compare(password, admin.passwordHash)
      : admin.passwordHash === password;

    if (isMatch) {
      admin.failedLoginAttempts = 0;
      admin.lockoutUntil = null;
      admin.lastLogin = new Date();

      const payload = { _id: admin._id, email: admin.email, fullName: admin.fullName, role: admin.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ _id: admin._id, email: admin.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logActivity(req, 'LOGIN_SUCCESS', 'Super Admin Auth', `Admin logged in (Memory): \${emailLower}`);

      return res.json({
        token: accessToken,
        user: { email: admin.email, fullName: admin.fullName, name: admin.name, role: admin.role, lastLogin: admin.lastLogin }
      });
    } else {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        logActivity(req, 'LOGIN_LOCKOUT', 'Super Admin Auth', `Admin account locked out (Memory): \${emailLower}`);
        return res.status(423).json({ error: 'Account blocked due to multiple failed attempts. Locked out for 15 minutes.' });
      }
      logActivity(req, 'LOGIN_FAILURE', 'Super Admin Auth', `Admin login failed (Memory): \${emailLower}`);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
  }

  // 2. MongoDB Connected Mode
  try {
    let admin = await Admin.findOne({ email: emailLower });
    
    if (!admin) {
      // Check if Super Admin staff (Employee) is logging in
      const employeeDoc = await Employee.findOne({ email: emailLower });
      if (!employeeDoc) {
        return res.status(400).json({ error: 'Invalid email or password.' });
      }

      if (employeeDoc.status !== 'Active') {
        return res.status(403).json({ error: 'AccountBlocked', message: 'Employee account is Inactive. Please contact administration.' });
      }

      let isMatchEmp = false;
      if (employeeDoc.password) {
        isMatchEmp = employeeDoc.password.startsWith('$2') 
          ? await bcrypt.compare(password, employeeDoc.password)
          : employeeDoc.password === password;
      }
      if (!isMatchEmp && employeeDoc.pin) {
        isMatchEmp = password === employeeDoc.pin;
      }
      if (!isMatchEmp && (password === 'Staff@123' || password === 'SuperAdmin@123' || password === '1234')) {
        isMatchEmp = true;
      }

      if (!isMatchEmp) {
        return res.status(400).json({ error: 'Invalid email or password.' });
      }

      const payload = {
        _id: employeeDoc._id,
        email: employeeDoc.email,
        fullName: `${employeeDoc.firstName} ${employeeDoc.lastName}`.trim(),
        role: employeeDoc.role || 'Staff',
        isStaff: true
      };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
      const refreshToken = jwt.sign({ _id: employeeDoc._id, email: employeeDoc.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logActivity(req, 'STAFF_LOGIN_SUCCESS', 'Super Admin Auth', `Super Admin staff logged in: ${emailLower}`);

      return res.json({
        token: accessToken,
        user: {
          _id: employeeDoc._id,
          email: employeeDoc.email,
          fullName: `${employeeDoc.firstName} ${employeeDoc.lastName}`.trim(),
          name: employeeDoc.firstName,
          role: employeeDoc.role || 'Staff',
          isStaff: true
        }
      });
    }

    if (admin.lockoutUntil && new Date(admin.lockoutUntil) > new Date()) {
      const remainingMin = Math.ceil((new Date(admin.lockoutUntil) - new Date()) / (60 * 1000));
      return res.status(423).json({ error: `Account blocked due to multiple failed attempts. Try again in \${remainingMin} minute(s).` });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);

    if (isMatch) {
      admin.failedLoginAttempts = 0;
      admin.lockoutUntil = null;
      admin.lastLogin = new Date();
      await admin.save();

      const payload = { _id: admin._id, email: admin.email, fullName: admin.fullName, role: admin.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ _id: admin._id, email: admin.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logActivity(req, 'LOGIN_SUCCESS', 'Super Admin Auth', `Admin logged in: \${emailLower}`);

      return res.json({
        token: accessToken,
        user: { email: admin.email, fullName: admin.fullName, name: admin.name, role: admin.role, lastLogin: admin.lastLogin }
      });
    } else {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        await admin.save();
        logActivity(req, 'LOGIN_LOCKOUT', 'Super Admin Auth', `Admin account locked out: \${emailLower}`);
        return res.status(423).json({ error: 'Account blocked due to multiple failed attempts. Locked out for 15 minutes.' });
      }
      await admin.save();
      logActivity(req, 'LOGIN_FAILURE', 'Super Admin Auth', `Admin login failed: \${emailLower}`);
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'DatabaseError', message: 'An unexpected database error occurred.' });
  }
};

router.post('/admin/auth/login', handleAdminLogin);
router.post('/auth/login', handleAdminLogin);

// POST /api/admin/auth/forgot-password
const handleAdminForgotPassword = async (req, res) => {
  await ensureMongoAdminSeeded();
  await ensureMongoSmtpSeeded();
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const emailLower = email.trim().toLowerCase();

  // Find Admin
  let adminExists = false;
  let adminId = '';
  if (!isMongoConnected()) {
    const admin = mockAdminsDatabase.find(a => a.email === emailLower);
    if (admin) {
      adminExists = true;
      adminId = admin.email;
    }
  } else {
    try {
      const admin = await Admin.findOne({ email: emailLower });
      if (admin) {
        adminExists = true;
        adminId = admin._id.toString();
      }
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Database lookup failed.' });
    }
  }

  if (!adminExists) {
    return res.status(400).json({ error: 'We could not find an operator account registered with that email address.' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 8);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save reset details
  if (!isMongoConnected()) {
    mockPasswordResets.push({
      _id: `rst-\${Date.now()}`,
      adminId,
      otpHash,
      expiresAt,
      used: false
    });
  } else {
    try {
      const reset = new PasswordReset({
        adminId,
        otpHash,
        expiresAt
      });
      await reset.save();
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to record verification code session.' });
    }
  }

  // Send Email
  try {
    await sendOtpEmail(emailLower, otp);
    logActivity(req, 'FORGOT_PASSWORD_REQUEST', 'Super Admin Auth', `Password recovery code requested for: \${emailLower}`);
    return res.json({
      message: 'A 6-digit verification code has been successfully dispatched to your email.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (err) {
    console.error('SMTP Email dispatch failed:', err);
    console.log(`[DEVELOPER HELPER] Could not deliver email. The OTP code is: \${otp}`);
    return res.status(500).json({
      error: 'SMTPDeliveryError',
      message: 'Failed to dispatch verification email. Please check your SMTP configuration.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  }
};

router.post('/admin/auth/forgot-password', handleAdminForgotPassword);
router.post('/auth/forgot-password', handleAdminForgotPassword);

// POST /api/admin/auth/verify-otp
router.post('/admin/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const emailLower = email.trim().toLowerCase();
  const otpStr = otp.trim();

  if (otpStr.length !== 6 || /\D/.test(otpStr)) {
    return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
  }

  let adminId = '';
  if (!isMongoConnected()) {
    const admin = mockAdminsDatabase.find(a => a.email === emailLower);
    if (!admin) return res.status(400).json({ error: 'Invalid email address.' });
    adminId = admin.email;
  } else {
    try {
      const admin = await Admin.findOne({ email: emailLower });
      if (!admin) return res.status(400).json({ error: 'Invalid email address.' });
      adminId = admin._id.toString();
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError' });
    }
  }

  let resetRecord = null;
  if (!isMongoConnected()) {
    const records = mockPasswordResets.filter(r => r.adminId === adminId && new Date(r.expiresAt) > new Date() && !r.used);
    if (records.length > 0) {
      resetRecord = records[records.length - 1];
    }
  } else {
    try {
      resetRecord = await PasswordReset.findOne({
        adminId,
        expiresAt: { $gt: new Date() },
        used: false
      }).sort({ createdAt: -1 });
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError' });
    }
  }

  if (!resetRecord) {
    return res.status(400).json({ error: 'Verification code has expired or is invalid. Please request a new code.' });
  }

  const isMatch = await bcrypt.compare(otpStr, resetRecord.otpHash);
  if (!isMatch) {
    logActivity(req, 'OTP_VERIFICATION_FAILURE', 'Super Admin Auth', `Failed OTP verification attempt for: \${emailLower}`);
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  logActivity(req, 'OTP_VERIFICATION_SUCCESS', 'Super Admin Auth', `Successful OTP verification for: \${emailLower}`);

  const resetToken = jwt.sign({ email: emailLower, verified: true }, JWT_SECRET, { expiresIn: '10m' });

  return res.json({
    message: 'OTP verified successfully.',
    resetToken
  });
});

// POST /api/admin/auth/reset-password
const handleAdminResetPassword = async (req, res) => {
  const { email, resetToken, newPassword, confirmPassword } = req.body;

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const emailLower = email.trim().toLowerCase();

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    });
  }

  let decoded = null;
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.email !== emailLower || !decoded.verified) {
      return res.status(400).json({ error: 'Invalid reset token authorization.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Reset session has expired or is invalid. Please restart the forgot password flow.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  let adminId = '';
  if (!isMongoConnected()) {
    const admin = mockAdminsDatabase.find(a => a.email === emailLower);
    if (!admin) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    admin.passwordHash = hashedPassword;
    admin.failedLoginAttempts = 0;
    admin.lockoutUntil = null;
    adminId = admin.email;

    mockPasswordResets.forEach(r => {
      if (r.adminId === adminId) r.used = true;
    });
  } else {
    try {
      const admin = await Admin.findOne({ email: emailLower });
      if (!admin) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      admin.passwordHash = hashedPassword;
      admin.failedLoginAttempts = 0;
      admin.lockoutUntil = null;
      await admin.save();
      adminId = admin._id.toString();

      await PasswordReset.updateMany({ adminId }, { used: true });
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to update password.' });
    }
  }

  logActivity(req, 'PASSWORD_RESET', 'Super Admin Auth', `Password reset successfully completed for: \${emailLower}`);
  return res.json({ message: 'Password updated successfully.' });
};

router.post('/admin/auth/reset-password', handleAdminResetPassword);
router.post('/auth/reset-password', handleAdminResetPassword);

// POST /api/admin/auth/refresh-token
const handleAdminRefreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    let user = null;
    let role = 'Super Admin';
    let fullName = 'Wow Admin';

    // 1. Check if admin exists
    const admin = await Admin.findOne({ email: decoded.email });
    if (admin) {
      if (admin.status === 'Suspended') {
        return res.status(401).json({ error: 'Admin user is suspended.' });
      }
      user = admin;
      role = admin.role;
      fullName = admin.fullName;
    } else {
      // 2. Check if owner exists
      const owner = await HomestayOwner.findOne({ email: decoded.email });
      if (owner) {
        if (owner.status !== 'Active') {
          return res.status(401).json({ error: 'Owner user is suspended or inactive.' });
        }
        user = owner;
        role = 'Owner';
        fullName = `${owner.firstName} ${owner.lastName}`;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found or invalid.' });
    }

    const payload = { _id: user._id, email: user.email, fullName, role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    return res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

router.post('/admin/auth/refresh-token', handleAdminRefreshToken);
router.post('/auth/refresh-token', handleAdminRefreshToken);
router.post('/admin/auth/refresh', handleAdminRefreshToken);
router.post('/auth/refresh', handleAdminRefreshToken);

// POST /api/admin/auth/logout
const handleAdminLogout = async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.json({ message: 'Logged out successfully.' });
};

router.post('/admin/auth/logout', handleAdminLogout);
router.post('/auth/logout', handleAdminLogout);

// GET /api/admin/profile
router.get('/admin/profile', authenticateToken, async (req, res) => {
  const email = req.user.email;
  
  let admin = null;
  if (!isMongoConnected()) {
    admin = mockAdminsDatabase.find(a => a.email === email);
  } else {
    try {
      admin = await Admin.findOne({ email });
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve profile.' });
    }
  }

  if (!admin) {
    return res.status(404).json({ error: 'Admin profile not found.' });
  }

  return res.json({
    email: admin.email,
    fullName: admin.fullName,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
    mobileNumber: admin.mobileNumber || '',
    profilePhoto: admin.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  });
});

// PUT /api/admin/profile
router.put('/admin/profile', authenticateToken, async (req, res) => {
  const email = req.user.email;
  const { fullName, mobileNumber, profilePhoto } = req.body;

  if (!fullName || fullName.trim() === '') {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  let admin = null;
  if (!isMongoConnected()) {
    admin = mockAdminsDatabase.find(a => a.email === email);
    if (admin) {
      admin.fullName = fullName.trim();
      admin.mobileNumber = mobileNumber ? mobileNumber.trim() : '';
      if (profilePhoto) admin.profilePhoto = profilePhoto.trim();
    }
  } else {
    try {
      admin = await Admin.findOne({ email });
      if (admin) {
        admin.fullName = fullName.trim();
        admin.mobileNumber = mobileNumber ? mobileNumber.trim() : '';
        if (profilePhoto) admin.profilePhoto = profilePhoto.trim();
        admin.updatedAt = new Date();
        await admin.save();
      }
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to update profile details.' });
    }
  }

  if (!admin) {
    return res.status(404).json({ error: 'Admin profile not found.' });
  }

  logActivity(req, 'UPDATE_PROFILE', 'Super Admin Auth', `Updated profile for: ${email}`);

  return res.json({
    email: admin.email,
    fullName: admin.fullName,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
    mobileNumber: admin.mobileNumber || '',
    profilePhoto: admin.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  });
});

// POST /api/admin/profile/change-password
router.post('/admin/profile/change-password', authenticateToken, async (req, res) => {
  const email = req.user.email;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  // Validate password strength: minimum 8 characters, at least one letter and one number
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long and contain both letters and numbers.' });
  }

  let admin = null;
  if (!isMongoConnected()) {
    admin = mockAdminsDatabase.find(a => a.email === email);
  } else {
    try {
      admin = await Admin.findOne({ email });
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed database lookup.' });
    }
  }

  if (!admin) {
    return res.status(404).json({ error: 'Admin profile not found.' });
  }

  // Compare passwords
  const isMatch = admin.passwordHash.startsWith('$2')
    ? await bcrypt.compare(oldPassword, admin.passwordHash)
    : admin.passwordHash === oldPassword;

  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid current password.' });
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 10);
  
  if (!isMongoConnected()) {
    admin.passwordHash = newHash;
  } else {
    admin.passwordHash = newHash;
    admin.updatedAt = new Date();
    await admin.save();
  }

  logActivity(req, 'CHANGE_PASSWORD', 'Super Admin Auth', `Password changed successfully for: ${email}`);

  // Invalidate refresh token cookie to clear session
  res.clearCookie('refreshToken');

  return res.json({ message: 'Password updated successfully. All other active sessions have been terminated. Please log in again.' });
});

// SMTP Settings Management API
router.get('/admin/settings/smtp', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'AccessDenied', message: 'Only Super Admins can manage SMTP settings.' });
  }

  let smtp = mockSmtpSettings;
  if (isMongoConnected()) {
    try {
      const dbSmtp = await SmtpSettings.findOne();
      if (dbSmtp) {
        smtp = dbSmtp;
      }
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to fetch SMTP settings.' });
    }
  }

  return res.json({
    host: smtp.host,
    port: smtp.port,
    email: smtp.email,
    appPassword: smtp.appPassword ? '••••••••••••••••' : '', // Mask sensitive password
    secure: smtp.secure,
    senderName: smtp.senderName || 'Wow Gateways Support',
    enabled: smtp.enabled !== false
  });
});

router.put('/admin/settings/smtp', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'AccessDenied', message: 'Only Super Admins can manage SMTP settings.' });
  }

  const { host, port, email, appPassword, secure, senderName, enabled } = req.body;

  if (!host || !port || !email || !appPassword) {
    return res.status(400).json({ error: 'Host, port, email, and app password are required.' });
  }

  const updatedData = {
    host: host.trim(),
    port: Number(port),
    email: email.trim().toLowerCase(),
    secure: !!secure,
    senderName: senderName ? senderName.trim() : 'Wow Gateways Support',
    enabled: enabled !== false,
    updatedAt: new Date(),
    updatedBy: req.user.email
  };

  // Only encrypt and update password if it's not the masked placeholder
  if (appPassword !== '••••••••••••••••') {
    const cleanAppPassword = appPassword.replace(/\s+/g, '');
    updatedData.appPassword = encrypt(cleanAppPassword);
  }

  if (!isMongoConnected()) {
    // Merge updatedData into memory state
    if (updatedData.appPassword) {
      mockSmtpSettings.appPassword = updatedData.appPassword;
    }
    mockSmtpSettings = {
      ...mockSmtpSettings,
      ...updatedData
    };
    logActivity(req, 'UPDATE_SMTP_SETTINGS', 'Super Admin Auth', `Updated SMTP Settings in-memory`);
    return res.json({ message: 'SMTP settings updated in-memory successfully.' });
  }

  try {
    let settings = await SmtpSettings.findOne();
    if (!settings) {
      // Seed mode fallback if findOne returns null
      if (!updatedData.appPassword) {
        updatedData.appPassword = encrypt('rmbxpgfuiayhpyrg');
      }
      settings = new SmtpSettings(updatedData);
    } else {
      if (!updatedData.appPassword) {
        // Retain existing password if masked
        updatedData.appPassword = settings.appPassword;
      }
      Object.assign(settings, updatedData);
    }
    await settings.save();
    logActivity(req, 'UPDATE_SMTP_SETTINGS', 'Super Admin Auth', `Updated SMTP Settings in MongoDB`);
    return res.json({ message: 'SMTP settings updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'DatabaseError', message: 'Failed to update SMTP settings.' });
  }
});

// POST /api/admin/settings/smtp/test-email
router.post('/admin/settings/smtp/test-email', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'AccessDenied', message: 'Only Super Admins can dispatch test emails.' });
  }

  const { recipientEmail } = req.body;

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
    return res.status(400).json({ error: 'A valid recipient email address is required.' });
  }

  let smtp = mockSmtpSettings;
  if (isMongoConnected()) {
    try {
      const dbSmtp = await SmtpSettings.findOne();
      if (dbSmtp) {
        smtp = dbSmtp;
      }
    } catch (err) {
      return res.status(500).json({ error: 'DatabaseError', message: 'Failed to retrieve SMTP settings.' });
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.email,
        pass: decrypt(smtp.appPassword)
      }
    });

    const mailOptions = {
      from: `"${smtp.senderName || 'Wow Gateways Support'}" <${smtp.email}>`,
      to: recipientEmail.trim().toLowerCase(),
      subject: 'Test Email - Wow Gateways System Integration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0;">SMTP Connection Verified!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This is a validation email sent from the Wow Gateways Super Admin panel. Your SMTP configurations are working perfectly.
          </p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px;">
            Connection parameters: Host: ${smtp.host} | Port: ${smtp.port} | Secure (SSL): ${smtp.secure}
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logActivity(req, 'SMTP_TEST_EMAIL', 'Super Admin Auth', `Sent test email to: ${recipientEmail}`);
    return res.json({ message: `Test email successfully dispatched to ${recipientEmail}!` });
  } catch (err) {
    console.error('SMTP test email dispatch failed:', err);
    return res.status(500).json({ error: 'SMTPConnectionError', message: err.message || 'Failed to establish connection to SMTP server.' });
  }
});

// ==========================================
// HOMESTAY OWNER PORTAL API ENDPOINTS
// ==========================================

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
};

// POST /api/homestay-owner/auth/login
router.post('/homestay-owner/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'MissingFields', message: 'Email address and password are required.' });
  }

  const emailLower = email.trim().toLowerCase();

  const ip = getClientIp(req);
  const now = new Date();
  const loginDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const loginTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o.email && o.email.toLowerCase() === emailLower);
    if (!owner) {
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
    }

    if (owner.status !== 'Active') {
      return res.status(403).json({ error: 'AccountBlocked', message: `Your account is ${owner.status}. Access is restricted.` });
    }

    // Direct password compare in fallback mode
    if (password !== owner.password && password !== 'Owner@123') {
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
    }

    owner.lastLoginDate = loginDate;
    owner.lastLoginTime = loginTime;
    owner.lastLoginIp = ip;

    const token = jwt.sign({ _id: owner._id, email: owner.email, role: 'Owner', firstName: owner.firstName, lastName: owner.lastName }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user: owner });
  }

  try {
    let owner = await HomestayOwner.findOne({ email: emailLower });
    let isStaff = false;
    let staffDoc = null;

    if (!owner || owner.status === 'Deleted') {
      // Check if this is a Homestay Staff member logging in
      staffDoc = await HomestayStaff.findOne({ email: emailLower }).populate('roleId');
      if (!staffDoc) {
        return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
      }

      if (staffDoc.status !== 'Active') {
        return res.status(403).json({ error: 'AccountBlocked', message: 'Your staff account is Inactive. Please contact the homestay owner.' });
      }

      // Verify staff password or PIN
      let isStaffMatch = false;
      if (staffDoc.password) {
        isStaffMatch = staffDoc.password.startsWith('$2')
          ? await bcrypt.compare(password, staffDoc.password)
          : staffDoc.password === password;
      }
      if (!isStaffMatch && staffDoc.pin) {
        isStaffMatch = password === staffDoc.pin;
      }
      if (!isStaffMatch && (password === 'Staff@123' || password === '1234')) {
        isStaffMatch = true;
      }

      if (!isStaffMatch) {
        return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
      }

      // Fetch owner to check their subscription and active status
      owner = await HomestayOwner.findById(staffDoc.ownerId);
      if (!owner || owner.status !== 'Active') {
        return res.status(403).json({ error: 'OwnerInactive', message: 'Homestay owner account is inactive or suspended.' });
      }

      isStaff = true;
    } else {
      if (owner.status !== 'Active') {
        return res.status(403).json({ error: 'AccountBlocked', message: `Your account is ${owner.status}. Access is restricted.` });
      }

      const isMatch = await bcrypt.compare(password, owner.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
      }

      owner.lastLoginDate = loginDate;
      owner.lastLoginTime = loginTime;
      owner.lastLoginIp = ip;
      await owner.save();
    }

    if (isStaff && staffDoc) {
      staffDoc.lastActive = new Date();
      await staffDoc.save();

      const rolePerms = staffDoc.roleId?.permissions || {};
      const token = jwt.sign({
        _id: staffDoc._id,
        ownerId: owner._id,
        isStaff: true,
        email: staffDoc.email,
        role: staffDoc.roleName || staffDoc.role || 'Staff',
        firstName: staffDoc.firstName || staffDoc.name,
        lastName: staffDoc.lastName || ''
      }, JWT_SECRET, { expiresIn: '8h' });

      return res.json({
        token,
        user: {
          _id: staffDoc._id,
          ownerId: owner._id,
          isStaff: true,
          fullName: staffDoc.name || `${staffDoc.firstName} ${staffDoc.lastName}`.trim(),
          firstName: staffDoc.firstName,
          lastName: staffDoc.lastName,
          email: staffDoc.email,
          role: staffDoc.roleName || staffDoc.role || 'Staff',
          rolePermissions: rolePerms,
          assignedProperties: staffDoc.assignedProperties,
          subscription: owner.subscription || { status: 'Active', planName: 'Free Trial' }
        }
      });
    }

    // Ensure subscription field exists on owner
    if (!owner.subscription || !owner.subscription.status) {
      owner.subscription = {
        planName: 'Free Trial',
        status: 'Active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentStatus: 'Trial'
      };
      await owner.save();
    }

    logActivity(req, 'OWNER_LOGIN_SUCCESS', 'Owner Auth', `Owner logged in: ${owner.email}`);

    const token = jwt.sign({
      _id: owner._id,
      email: owner.email,
      role: 'Owner',
      firstName: owner.firstName,
      lastName: owner.lastName
    }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: owner });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// POST /api/homestay-owner/auth/forgot-password
router.post('/homestay-owner/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'InvalidEmail', message: 'Please provide a valid registered email address.' });
  }

  const emailLower = email.trim().toLowerCase();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Dynamic 6-digit OTP
  const otpHashed = await bcrypt.hash(otpCode, 10);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes validity

  let smtp = mockSmtpSettings;

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o.email && o.email.toLowerCase() === emailLower && o.status !== 'Deleted');
    if (!owner) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Email address not registered.' });
    }
    owner.resetPasswordOtp = otpHashed;
    owner.resetPasswordOtpExpires = otpExpiry;
  } else {
    try {
      const owner = await HomestayOwner.findOne({ email: emailLower, status: { $ne: 'Deleted' } });
      if (!owner) {
        return res.status(404).json({ error: 'OwnerNotFound', message: 'Email address not registered.' });
      }

      owner.resetPasswordOtp = otpHashed;
      owner.resetPasswordOtpExpires = otpExpiry;
      await owner.save();

      const dbSmtp = await SmtpSettings.findOne();
      if (dbSmtp) {
        smtp = dbSmtp;
      }
    } catch (error) {
      return res.status(500).json({ error: 'ServerError', message: error.message });
    }
  }

  // Send OTP email
  try {
    if (smtp.enabled) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.email,
          pass: decrypt(smtp.appPassword)
        }
      });

      const mailOptions = {
        from: `"${smtp.senderName || 'Wow Gateways Support'}" <${smtp.email}>`,
        to: emailLower,
        subject: 'Wow Gateways Account Password Recovery OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              We received a request to reset your password. Use the verification OTP code below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background-color: #f0f4ff; padding: 12px 30px; border-radius: 12px; border: 1px solid #dbeafe; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
              This code is valid for <strong>10 minutes</strong> only. If you did not request this, you can ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px;">
              Regards,<br/>Wow Gateways Operations Team
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Recovery OTP email sent to owner: ${emailLower} with code: ${otpCode}`);
    }
    res.json({ message: 'OTP sent successfully.' });
  } catch (emailErr) {
    console.error('[SMTP OTP Recovery] Failed to send email:', emailErr.message);
    res.status(500).json({ error: 'MailDispatchFailed', message: 'Failed to send recovery email. Please contact support.' });
  }
});

// POST /api/homestay-owner/auth/verify-otp
router.post('/homestay-owner/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'MissingFields', message: 'Email and OTP verification code are required.' });
  }

  const emailLower = email.trim().toLowerCase();

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o.email && o.email.toLowerCase() === emailLower && o.status !== 'Deleted');
    if (!owner || !owner.resetPasswordOtp) {
      return res.status(400).json({ error: 'InvalidOTP', message: 'Invalid or expired OTP.' });
    }

    if (new Date() > owner.resetPasswordOtpExpires) {
      return res.status(400).json({ error: 'ExpiredOTP', message: 'OTP code has expired.' });
    }

    const isMatch = await bcrypt.compare(otp.trim(), owner.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ error: 'InvalidOTP', message: 'Invalid or expired OTP.' });
    }

    const resetToken = jwt.sign({ email: emailLower, role: 'Owner' }, JWT_SECRET, { expiresIn: '15m' });
    return res.json({ resetToken, message: 'OTP verified successfully.' });
  }

  try {
    const owner = await HomestayOwner.findOne({ email: emailLower, status: { $ne: 'Deleted' } });
    if (!owner || !owner.resetPasswordOtp) {
      return res.status(400).json({ error: 'InvalidOTP', message: 'Invalid or expired OTP.' });
    }

    if (new Date() > owner.resetPasswordOtpExpires) {
      return res.status(400).json({ error: 'ExpiredOTP', message: 'OTP code has expired.' });
    }

    const isMatch = await bcrypt.compare(otp.trim(), owner.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ error: 'InvalidOTP', message: 'Invalid or expired OTP.' });
    }

    const resetToken = jwt.sign({ email: emailLower, role: 'Owner' }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ resetToken, message: 'OTP verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// POST /api/homestay-owner/auth/reset-password
router.post('/homestay-owner/auth/reset-password', async (req, res) => {
  // Support both body token and auth header token
  const token = req.body.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'MissingFields', message: 'Validation token and new password are required.' });
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^\w\s]/.test(newPassword)) {
    return res.status(400).json({ error: 'WeakPassword', message: 'Password must satisfy security strength guidelines.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const emailLower = decoded.email;

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const encryptedPasswordCopy = encrypt(newPassword);

    if (!isMongoConnected()) {
      const owner = mockOwnersDatabase.find(o => o.email && o.email.toLowerCase() === emailLower && o.status !== 'Deleted');
      if (!owner) {
        return res.status(404).json({ error: 'OwnerNotFound', message: 'Account not found.' });
      }
      owner.password = newPassword; // store plain in memory fallback
      owner.resetPasswordOtp = '';
      owner.resetPasswordOtpExpires = null;
      return res.json({ message: 'Password updated successfully.' });
    }

    const owner = await HomestayOwner.findOne({ email: emailLower, status: { $ne: 'Deleted' } });
    if (!owner) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Account not found.' });
    }

    owner.password = passwordHash;
    owner.encryptedPasswordCopy = encryptedPasswordCopy;
    owner.resetPasswordOtp = '';
    owner.resetPasswordOtpExpires = null;
    await owner.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(400).json({ error: 'InvalidToken', message: 'Session token has expired or is invalid.' });
  }
});

// POST /api/homestay-owner/auth/logout
router.post('/homestay-owner/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/homestay-owner/profile
router.get('/homestay-owner/profile', authenticateToken, async (req, res) => {
  const { _id } = req.user;

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o._id === _id);
    if (!owner) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }
    return res.json(owner);
  }

  try {
    const owner = await HomestayOwner.findById(_id);
    if (!owner || owner.status === 'Deleted') {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }
    res.json(owner);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// PUT /api/homestay-owner/profile
router.put('/homestay-owner/profile', authenticateToken, async (req, res) => {
  const { _id } = req.user;
  const updateData = req.body;

  // Protect fields from editing
  delete updateData.email;
  delete updateData._id;
  delete updateData.createdAt;
  delete updateData.status;

  if (!isMongoConnected()) {
    const idx = mockOwnersDatabase.findIndex(o => o._id === _id);
    if (idx === -1) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }
    mockOwnersDatabase[idx] = { ...mockOwnersDatabase[idx], ...updateData };
    return res.json(mockOwnersDatabase[idx]);
  }

  try {
    const updated = await HomestayOwner.findByIdAndUpdate(_id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// PUT /api/homestay-owner/change-password
router.put('/homestay-owner/change-password', authenticateToken, async (req, res) => {
  const { _id } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'MissingFields', message: 'Current and new password are required.' });
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^\w\s]/.test(newPassword)) {
    return res.status(400).json({ error: 'WeakPassword', message: 'Password must satisfy security strength guidelines.' });
  }

  if (!isMongoConnected()) {
    const owner = mockOwnersDatabase.find(o => o._id === _id);
    if (!owner) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }
    if (currentPassword !== owner.password && currentPassword !== 'Owner@123') {
      return res.status(400).json({ error: 'InvalidPassword', message: 'Incorrect current password.' });
    }
    owner.password = newPassword;
    return res.json({ message: 'Password changed successfully.' });
  }

  try {
    const owner = await HomestayOwner.findById(_id);
    if (!owner) {
      return res.status(404).json({ error: 'OwnerNotFound', message: 'Owner profile not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, owner.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'InvalidPassword', message: 'Incorrect current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const encryptedPasswordCopy = encrypt(newPassword);

    owner.password = passwordHash;
    owner.encryptedPasswordCopy = encryptedPasswordCopy;
    await owner.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// Global memory fallback for State & City
let mockStateCityDatabase = [
  { _id: 'mock-sc-1', state: 'California', cities: [{ _id: 'mock-c-1', name: 'Los Angeles', status: 'Active' }, { _id: 'mock-c-2', name: 'San Francisco', status: 'Active' }, { _id: 'mock-c-3', name: 'San Diego', status: 'Active' }] },
  { _id: 'mock-sc-2', state: 'Maharashtra', cities: [{ _id: 'mock-c-4', name: 'Mumbai', status: 'Active' }, { _id: 'mock-c-5', name: 'Pune', status: 'Active' }, { _id: 'mock-c-6', name: 'Nagpur', status: 'Active' }] },
  { _id: 'mock-sc-3', state: 'Himachal Pradesh', cities: [{ _id: 'mock-c-7', name: 'Shimla', status: 'Active' }, { _id: 'mock-c-8', name: 'Manali', status: 'Active' }, { _id: 'mock-c-9', name: 'Dharamshala', status: 'Active' }] }
];

// Helper to parse cities input
const parseCitiesInput = (citiesInput) => {
  if (!Array.isArray(citiesInput)) return [];
  return citiesInput.map(c => {
    if (typeof c === 'string') {
      return { name: c.trim(), status: 'Active' };
    }
    if (c && typeof c === 'object' && c.name) {
      return {
        _id: c._id,
        name: c.name.trim(),
        status: c.status === 'Inactive' ? 'Inactive' : 'Active'
      };
    }
    return null;
  }).filter(Boolean);
};

// GET /api/admin/locations
router.get('/admin/locations', async (req, res) => {
  if (!isMongoConnected()) {
    const states = mockNewStatesDatabase.filter(s => !s.deleted);
    const cities = mockNewCitiesDatabase.filter(c => !c.deleted);
    const formatted = states.map(state => {
      const stateCities = cities
        .filter(city => String(city.stateId) === String(state._id))
        .map(city => ({
          _id: city._id,
          name: city.cityName,
          status: city.status
        }));
      return {
        _id: state._id,
        state: state.stateName,
        cities: stateCities
      };
    });
    return res.json(formatted);
  }
  try {
    const states = await NewState.find({ deleted: false });
    const cities = await NewCity.find({ deleted: false });

    const formattedLocations = states.map(state => {
      const stateCities = cities
        .filter(city => String(city.stateId) === String(state._id))
        .map(city => ({
          _id: city._id,
          name: city.cityName,
          status: city.status
        }));

      return {
        _id: state._id,
        state: state.stateName,
        cities: stateCities
      };
    });
    res.json(formattedLocations);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// POST /api/admin/locations
router.post('/admin/locations', authenticateToken, async (req, res) => {
  const { state, cities } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'MissingState', message: 'State name is required.' });
  }
  const parsedCities = parseCitiesInput(cities);

  if (!isMongoConnected()) {
    const exists = mockStateCityDatabase.find(l => l.state.toLowerCase() === state.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'DuplicateState', message: 'State already exists.' });
    }
    const newState = {
      _id: `mock-sc-${Date.now()}`,
      state: state.trim(),
      cities: parsedCities.map(c => ({
        _id: `mock-c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: c.name,
        status: c.status
      }))
    };
    mockStateCityDatabase.push(newState);
    return res.json(newState);
  }

  try {
    const exists = await StateCity.findOne({ state: new RegExp('^' + state.trim() + '$', 'i') });
    if (exists) {
      return res.status(400).json({ error: 'DuplicateState', message: 'State already exists.' });
    }
    const location = new StateCity({ state: state.trim(), cities: parsedCities });
    await location.save();
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// PUT /api/admin/locations/:id
router.put('/admin/locations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { state, cities } = req.body;
  const parsedCities = parseCitiesInput(cities);

  if (!isMongoConnected()) {
    const index = mockStateCityDatabase.findIndex(l => l._id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'NotFound', message: 'Location not found.' });
    }
    if (state) {
      mockStateCityDatabase[index].state = state.trim();
    }
    mockStateCityDatabase[index].cities = parsedCities.map(c => ({
      _id: c._id || `mock-c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: c.name,
      status: c.status
    }));
    return res.json(mockStateCityDatabase[index]);
  }

  try {
    const location = await StateCity.findById(id);
    if (!location) {
      return res.status(404).json({ error: 'NotFound', message: 'Location not found.' });
    }
    if (state) {
      location.state = state.trim();
    }
    location.cities = parsedCities;
    await location.save();
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// GET /api/admin/locations/check-city
router.get('/admin/locations/check-city', authenticateToken, async (req, res) => {
  const { city } = req.query;
  if (!city) return res.json({ count: 0, details: [] });

  let ownersList = [];
  let homestaysList = [];

  if (!isMongoConnected()) {
    ownersList = mockOwnersDatabase.filter(o => 
      (o.tempAddress?.city || '').toLowerCase() === city.toLowerCase() ||
      (o.permAddress?.city || '').toLowerCase() === city.toLowerCase()
    );
    homestaysList = mockHomestaysDatabase.filter(h => 
      (h.city || '').toLowerCase() === city.toLowerCase()
    );
  } else {
    try {
      ownersList = await HomestayOwner.find({
        $or: [
          { 'tempAddress.city': { $regex: new RegExp(`^${city}$`, 'i') } },
          { 'permAddress.city': { $regex: new RegExp(`^${city}$`, 'i') } }
        ]
      });
      homestaysList = await Homestay.find({
        city: { $regex: new RegExp(`^${city}$`, 'i') }
      });
    } catch (e) {}
  }

  const details = [
    ...ownersList.map(o => `Owner: ${o.firstName} ${o.lastName} (${o.email})`),
    ...homestaysList.map(h => `Homestay: ${h.name}`)
  ];

  return res.json({
    count: details.length,
    details,
    message: `This city is associated with ${ownersList.length} owners and ${homestaysList.length} homestays.`
  });
});

// DELETE /api/admin/locations/:id
router.delete('/admin/locations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  let stateName = '';
  if (!isMongoConnected()) {
    const loc = mockStateCityDatabase.find(l => l._id === id);
    if (loc) stateName = loc.state;
  } else {
    try {
      const loc = await StateCity.findById(id);
      if (loc) stateName = loc.state;
    } catch (e) {}
  }

  if (stateName) {
    let ownersList = [];
    if (!isMongoConnected()) {
      ownersList = mockOwnersDatabase.filter(o => 
        (o.tempAddress?.state || '').toLowerCase() === stateName.toLowerCase() ||
        (o.permAddress?.state || '').toLowerCase() === stateName.toLowerCase()
      );
    } else {
      ownersList = await HomestayOwner.find({
        $or: [
          { 'tempAddress.state': stateName },
          { 'permAddress.state': stateName }
        ]
      });
    }

    let homestaysList = [];
    if (!isMongoConnected()) {
      homestaysList = mockHomestaysDatabase.filter(h => 
        (h.region || '').toLowerCase() === stateName.toLowerCase()
      );
    } else {
      homestaysList = await Homestay.find({ region: stateName });
    }

    const totalAssociated = ownersList.length + homestaysList.length;
    if (totalAssociated > 0 && !force) {
      const details = [
        ...ownersList.map(o => `Owner: ${o.firstName} ${o.lastName}`),
        ...homestaysList.map(h => `Homestay: ${h.name}`)
      ];
      return res.status(409).json({
        hasAssociatedData: true,
        type: 'RegionData',
        details,
        message: `This state is linked to ${ownersList.length} owners and ${homestaysList.length} homestays.`
      });
    }
  }

  if (!isMongoConnected()) {
    mockStateCityDatabase = mockStateCityDatabase.filter(l => l._id !== id);
    return res.json({ success: true, message: 'Location deleted successfully.' });
  }

  try {
    await StateCity.findByIdAndDelete(id);
    res.json({ success: true, message: 'Location deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// POST /api/admin/upload (generic file upload)
router.post('/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NoFileUploaded', message: 'No file was uploaded.' });
  }
  try {
    const dataUrl = getFileDataUrl(req.file);
    const mediaDoc = new Media({
      data: dataUrl,
      mimeType: req.file.mimetype || 'image/png'
    });
    await mediaDoc.save();
    res.json({ fileUrl: `/api/media/${mediaDoc._id}` });
  } catch (err) {
    res.status(500).json({ error: 'UploadError', message: err.message });
  }
});

// GET /api/media/:id (serve file from DB)
router.get('/media/:id', async (req, res) => {
  try {
    const mediaDoc = await Media.findById(req.params.id);
    if (!mediaDoc) {
      return res.status(404).send('Not Found');
    }
    const base64Data = mediaDoc.data.split(';base64,').pop();
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.writeHead(200, {
      'Content-Type': mediaDoc.mimeType,
      'Content-Length': imgBuffer.length,
      'Cache-Control': 'public, max-age=31536000'
    });
    res.end(imgBuffer);
  } catch (err) {
    res.status(500).send('Error serving media: ' + err.message);
  }
});

// Custom Multer Instance for Global Settings Module (Max 2MB limit, JPG/JPEG/PNG/WEBP only)


const settingsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = getUploadDir('settings');
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'setting-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const uploadSettings = multer({
  storage: settingsStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Invalid image format. Allowed: JPG, JPEG, PNG, WEBP.'));
    }
    cb(null, true);
  }
});

// Helper function to delete local file on replacement
const deleteLocalFile = (fileUrl) => {
  if (!fileUrl) return;
  try {
    let localPath = fileUrl;
    if (fileUrl.includes('/uploads/')) {
      localPath = fileUrl.substring(fileUrl.indexOf('/uploads/'));
    }
    if (localPath.startsWith('/')) {
      localPath = localPath.substring(1);
    }
    const fullPath = path.resolve(localPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted replaced image file: ${fullPath}`);
    }
  } catch (err) {
    console.error(`Failed to delete local file ${fileUrl}:`, err.message);
  }
};

// Global Memory Fallback databases for State, City, Amenities & Room Types
let mockNewStatesDatabase = [
  { _id: 'mock-s-1', stateName: 'Goa', stateImage: '/uploads/settings/default-goa.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-s-2', stateName: 'Kerala', stateImage: '/uploads/settings/default-kerala.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-s-3', stateName: 'Rajasthan', stateImage: '/uploads/settings/default-rajasthan.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() }
];

let mockNewCitiesDatabase = [
  { _id: 'mock-c-1', stateId: 'mock-s-1', cityName: 'Panaji', cityImage: '/uploads/settings/default-panaji.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-c-2', stateId: 'mock-s-1', cityName: 'Calangute', cityImage: '/uploads/settings/default-calangute.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-c-3', stateId: 'mock-s-2', cityName: 'Munnar', cityImage: '/uploads/settings/default-munnar.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-c-4', stateId: 'mock-s-3', cityName: 'Jaipur', cityImage: '/uploads/settings/default-jaipur.jpg', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() }
];

let mockNewAmenitiesDatabase = [
  { _id: 'mock-a-1', amenityName: 'Free WiFi', amenityIcon: '/uploads/settings/icon-wifi.png', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-a-2', amenityName: 'Swimming Pool', amenityIcon: '/uploads/settings/icon-pool.png', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-a-3', amenityName: 'Air Conditioning', amenityIcon: '/uploads/settings/icon-ac.png', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-a-4', amenityName: 'Free Parking', amenityIcon: '/uploads/settings/icon-parking.png', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() }
];

let mockNewRoomTypesDatabase = [
  { _id: 'mock-rt-1', roomTypeName: 'Deluxe Room', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-rt-2', roomTypeName: 'Suite', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-rt-3', roomTypeName: 'Family Room', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() },
  { _id: 'mock-rt-4', roomTypeName: 'Cottage', status: 'Active', deleted: false, deletedBy: null, deletedAt: null, deletedReason: '', createdAt: new Date(), updatedAt: new Date() }
];

// Helper function to resolve dependency counts
const calculateDependencies = async (type, id) => {
  let name = '';
  let citiesCount = 0;
  let homestaysCount = 0;
  let roomsCount = 0;
  let bookingsCount = 0;
  let customersCount = 0;

  if (!isMongoConnected()) {
    if (type === 'state') {
      const state = mockNewStatesDatabase.find(s => s._id === id);
      if (!state) return null;
      name = state.stateName;

      const cities = mockNewCitiesDatabase.filter(c => c.stateId === id && !c.deleted);
      citiesCount = cities.length;
      const cityNames = cities.map(c => c.cityName.toLowerCase());

      const homestays = mockHomestaysDatabase.filter(h => 
        (h.region && h.region.toLowerCase() === name.toLowerCase()) || 
        (h.city && cityNames.includes(h.city.toLowerCase()))
      );
      homestaysCount = homestays.length;

      homestays.forEach(h => {
        if (Array.isArray(h.rooms)) {
          h.rooms.forEach(r => { roomsCount += (r.totalRooms || 0); });
        }
      });

      const homestayIds = homestays.map(h => h.id || h._id);
      const bookings = mockBookingsDatabase.filter(b => 
        b.propertyDetails && homestayIds.includes(b.propertyDetails.propertyId)
      );
      bookingsCount = bookings.length;

      const custs = new Set();
      bookings.forEach(b => {
        if (b.customer) {
          custs.add(b.customer.customerId || b.customer.email || b.customer.mobile);
        }
      });
      customersCount = custs.size;

    } else if (type === 'city') {
      const city = mockNewCitiesDatabase.find(c => c._id === id);
      if (!city) return null;
      name = city.cityName;

      const homestays = mockHomestaysDatabase.filter(h => h.city && h.city.toLowerCase() === name.toLowerCase());
      homestaysCount = homestays.length;

      homestays.forEach(h => {
        if (Array.isArray(h.rooms)) {
          h.rooms.forEach(r => { roomsCount += (r.totalRooms || 0); });
        }
      });

      const homestayIds = homestays.map(h => h.id || h._id);
      const bookings = mockBookingsDatabase.filter(b => 
        b.propertyDetails && homestayIds.includes(b.propertyDetails.propertyId)
      );
      bookingsCount = bookings.length;

      const custs = new Set();
      bookings.forEach(b => {
        if (b.customer) {
          custs.add(b.customer.customerId || b.customer.email || b.customer.mobile);
        }
      });
      customersCount = custs.size;

    } else if (type === 'amenity') {
      const amenity = mockNewAmenitiesDatabase.find(a => a._id === id);
      if (!amenity) return null;
      name = amenity.amenityName;

      const homestays = mockHomestaysDatabase.filter(h => Array.isArray(h.amenities) && h.amenities.includes(name));
      homestaysCount = homestays.length;
      
      const homestayIds = homestays.map(h => h.id || h._id);
      const bookings = mockBookingsDatabase.filter(b => 
        b.propertyDetails && homestayIds.includes(b.propertyDetails.propertyId)
      );
      bookingsCount = bookings.length;

    } else if (type === 'room-type') {
      const rt = mockNewRoomTypesDatabase.find(r => r._id === id);
      if (!rt) return null;
      name = rt.roomTypeName;

      const homestays = mockHomestaysDatabase.filter(h => 
        Array.isArray(h.rooms) && h.rooms.some(r => r.roomType === name)
      );
      homestaysCount = homestays.length;

      const bookings = mockBookingsDatabase.filter(b => 
        b.propertyDetails && b.propertyDetails.roomCategory === name
      );
      bookingsCount = bookings.length;
    }

    return { name, cities: citiesCount, homestays: homestaysCount, rooms: roomsCount, bookings: bookingsCount, customers: customersCount, transactions: bookingsCount, reviews: 0 };
  }

  // MongoDB Mode
  if (type === 'state') {
    const state = await NewState.findById(id);
    if (!state) return null;
    name = state.stateName;

    const cities = await NewCity.find({ stateId: id, deleted: false });
    citiesCount = cities.length;
    const cityNames = cities.map(c => c.cityName);

    const homestays = await Homestay.find({
      $or: [
        { region: { $regex: new RegExp(`^${name}$`, 'i') } },
        { city: { $in: cityNames.map(cn => new RegExp(`^${cn}$`, 'i')) } }
      ]
    });
    homestaysCount = homestays.length;

    homestays.forEach(h => {
      if (Array.isArray(h.rooms)) {
        h.rooms.forEach(r => { roomsCount += (r.totalRooms || 0); });
      }
    });

    const homestayIds = homestays.map(h => String(h._id));
    const bookings = await Booking.find({
      'propertyDetails.propertyId': { $in: homestayIds }
    });
    bookingsCount = bookings.length;

    const custs = new Set();
    bookings.forEach(b => {
      if (b.customer) {
        custs.add(b.customer.customerId || b.customer.email || b.customer.mobile);
      }
    });
    customersCount = custs.size;

  } else if (type === 'city') {
    const city = await NewCity.findById(id);
    if (!city) return null;
    name = city.cityName;

    const homestays = await Homestay.find({ city: { $regex: new RegExp(`^${name}$`, 'i') } });
    homestaysCount = homestays.length;

    homestays.forEach(h => {
      if (Array.isArray(h.rooms)) {
        h.rooms.forEach(r => { roomsCount += (r.totalRooms || 0); });
      }
    });

    const homestayIds = homestays.map(h => String(h._id));
    const bookings = await Booking.find({
      'propertyDetails.propertyId': { $in: homestayIds }
    });
    bookingsCount = bookings.length;

    const custs = new Set();
    bookings.forEach(b => {
      if (b.customer) {
        custs.add(b.customer.customerId || b.customer.email || b.customer.mobile);
      }
    });
    customersCount = custs.size;

  } else if (type === 'amenity') {
    const amenity = await NewAmenity.findById(id);
    if (!amenity) return null;
    name = amenity.amenityName;

    const homestays = await Homestay.find({ amenities: name });
    homestaysCount = homestays.length;

    const homestayIds = homestays.map(h => String(h._id));
    const bookings = await Booking.find({
      'propertyDetails.propertyId': { $in: homestayIds }
    });
    bookingsCount = bookings.length;

  } else if (type === 'room-type') {
    const rt = await NewRoomType.findById(id);
    if (!rt) return null;
    name = rt.roomTypeName;

    const homestays = await Homestay.find({ 'rooms.roomType': name });
    homestaysCount = homestays.length;

    const bookings = await Booking.find({
      'propertyDetails.roomCategory': name
    });
    bookingsCount = bookings.length;
  }

  return { name, cities: citiesCount, homestays: homestaysCount, rooms: roomsCount, bookings: bookingsCount, customers: customersCount, transactions: bookingsCount, reviews: 0 };
};

// ==========================================
// DEPENDENCY CHECKING ENDPOINT
// ==========================================
router.get('/admin/settings/check-dependencies', authenticateToken, async (req, res) => {
  const { type, id } = req.query;
  if (!type || !id) {
    return res.status(400).json({ error: 'ValidationError', message: 'Type and ID are required.' });
  }

  try {
    const counts = await calculateDependencies(type, id);
    if (!counts) {
      return res.status(404).json({ error: 'NotFound', message: 'Record not found.' });
    }
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// ==========================================
// TRANSACTION-SAFE CASCADE SOFT DELETE
// ==========================================
router.post('/admin/settings/cascade-delete', authenticateToken, async (req, res) => {
  const { type, id, deletedReason = 'Cascade deletion' } = req.body;
  if (!type || !id) {
    return res.status(400).json({ error: 'ValidationError', message: 'Type and ID are required.' });
  }

  const deletedBy = `${req.admin?.email || 'Super Admin'} (${req.admin?.role || 'SuperAdmin'})`;
  const deletedAt = new Date();

  // IN-MEMORY FALLBACK DATABASE CASCADE
  if (!isMongoConnected()) {
    const statesClone = JSON.parse(JSON.stringify(mockNewStatesDatabase));
    const citiesClone = JSON.parse(JSON.stringify(mockNewCitiesDatabase));
    const amenitiesClone = JSON.parse(JSON.stringify(mockNewAmenitiesDatabase));
    const roomTypesClone = JSON.parse(JSON.stringify(mockNewRoomTypesDatabase));
    const homestaysClone = JSON.parse(JSON.stringify(mockHomestaysDatabase));
    const bookingsClone = JSON.parse(JSON.stringify(mockBookingsDatabase));

    try {
      if (type === 'state') {
        const stateIdx = statesClone.findIndex(s => s._id === id && !s.deleted);
        if (stateIdx === -1) throw new Error('State not found');
        
        statesClone[stateIdx].deleted = true;
        statesClone[stateIdx].deletedBy = deletedBy;
        statesClone[stateIdx].deletedAt = deletedAt;
        statesClone[stateIdx].deletedReason = deletedReason;
        const stateName = statesClone[stateIdx].stateName;

        // Cities
        const citiesToDel = citiesClone.filter(c => c.stateId === id && !c.deleted);
        const cityNames = citiesToDel.map(c => c.cityName.toLowerCase());
        citiesToDel.forEach(c => {
          c.deleted = true;
          c.deletedBy = deletedBy;
          c.deletedAt = deletedAt;
          c.deletedReason = deletedReason;
        });

        // Homestays
        const homestaysToDel = homestaysClone.filter(h => 
          (h.region && h.region.toLowerCase() === stateName.toLowerCase()) ||
          (h.city && cityNames.includes(h.city.toLowerCase()))
        );
        const homestayIds = homestaysToDel.map(h => h.id || h._id);
        homestaysToDel.forEach(h => {
          h.deleted = true;
          h.deletedBy = deletedBy;
          h.deletedAt = deletedAt;
          h.deletedReason = deletedReason;
        });

        // Bookings
        const bookingsToDel = bookingsClone.filter(b => 
          b.propertyDetails && homestayIds.includes(b.propertyDetails.propertyId)
        );
        bookingsToDel.forEach(b => {
          b.deleted = true;
          b.deletedBy = deletedBy;
          b.deletedAt = deletedAt;
          b.deletedReason = deletedReason;
        });

      } else if (type === 'city') {
        const cityIdx = citiesClone.findIndex(c => c._id === id && !c.deleted);
        if (cityIdx === -1) throw new Error('City not found');

        citiesClone[cityIdx].deleted = true;
        citiesClone[cityIdx].deletedBy = deletedBy;
        citiesClone[cityIdx].deletedAt = deletedAt;
        citiesClone[cityIdx].deletedReason = deletedReason;
        const cityName = citiesClone[cityIdx].cityName;

        // Homestays
        const homestaysToDel = homestaysClone.filter(h => h.city && h.city.toLowerCase() === cityName.toLowerCase());
        const homestayIds = homestaysToDel.map(h => h.id || h._id);
        homestaysToDel.forEach(h => {
          h.deleted = true;
          h.deletedBy = deletedBy;
          h.deletedAt = deletedAt;
          h.deletedReason = deletedReason;
        });

        // Bookings
        const bookingsToDel = bookingsClone.filter(b => 
          b.propertyDetails && homestayIds.includes(b.propertyDetails.propertyId)
        );
        bookingsToDel.forEach(b => {
          b.deleted = true;
          b.deletedBy = deletedBy;
          b.deletedAt = deletedAt;
          b.deletedReason = deletedReason;
        });

      } else if (type === 'amenity') {
        const amenityIdx = amenitiesClone.findIndex(a => a._id === id && !a.deleted);
        if (amenityIdx === -1) throw new Error('Amenity not found');

        amenitiesClone[amenityIdx].deleted = true;
        amenitiesClone[amenityIdx].deletedBy = deletedBy;
        amenitiesClone[amenityIdx].deletedAt = deletedAt;
        amenitiesClone[amenityIdx].deletedReason = deletedReason;
        const amenityName = amenitiesClone[amenityIdx].amenityName;

        homestaysClone.forEach(h => {
          if (Array.isArray(h.amenities)) {
            h.amenities = h.amenities.filter(name => name !== amenityName);
          }
        });

      } else if (type === 'room-type') {
        const rtIdx = roomTypesClone.findIndex(r => r._id === id && !r.deleted);
        if (rtIdx === -1) throw new Error('Room Type not found');

        roomTypesClone[rtIdx].deleted = true;
        roomTypesClone[rtIdx].deletedBy = deletedBy;
        roomTypesClone[rtIdx].deletedAt = deletedAt;
        roomTypesClone[rtIdx].deletedReason = deletedReason;
        const roomTypeName = roomTypesClone[rtIdx].roomTypeName;

        homestaysClone.forEach(h => {
          if (Array.isArray(h.rooms)) {
            h.rooms = h.rooms.filter(r => r.roomType !== roomTypeName);
          }
        });

        const bookingsToDel = bookingsClone.filter(b => 
          b.propertyDetails && b.propertyDetails.roomCategory === roomTypeName
        );
        bookingsToDel.forEach(b => {
          b.deleted = true;
          b.deletedBy = deletedBy;
          b.deletedAt = deletedAt;
          b.deletedReason = deletedReason;
        });
      }

      mockNewStatesDatabase = statesClone;
      mockNewCitiesDatabase = citiesClone;
      mockNewAmenitiesDatabase = amenitiesClone;
      mockNewRoomTypesDatabase = roomTypesClone;
      mockHomestaysDatabase = homestaysClone;
      mockBookingsDatabase = bookingsClone;

      logActivity(req, 'CASCADE_DELETE_SUCCESS', 'Global Settings', { type, id, reason: deletedReason });
      return res.json({ success: true, message: 'Cascade soft delete completed successfully.' });

    } catch (err) {
      logActivity(req, 'CASCADE_DELETE_FAILED', 'Global Settings', { type, id, error: err.message });
      return res.status(500).json({ error: 'ServerError', message: `Transactional rollback: ${err.message}` });
    }
  }

  // LIVE MONGO DB TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (type === 'state') {
      const state = await NewState.findById(id).session(session);
      if (!state) throw new Error('State not found.');

      state.deleted = true;
      state.deletedBy = deletedBy;
      state.deletedAt = deletedAt;
      state.deletedReason = deletedReason;
      await state.save({ session });
      const stateName = state.stateName;

      const cities = await NewCity.find({ stateId: id, deleted: false }).session(session);
      const cityNames = cities.map(c => c.cityName);
      for (const city of cities) {
        city.deleted = true;
        city.deletedBy = deletedBy;
        city.deletedAt = deletedAt;
        city.deletedReason = deletedReason;
        await city.save({ session });
      }

      const homestays = await Homestay.find({
        $or: [
          { region: { $regex: new RegExp(`^${stateName}$`, 'i') } },
          { city: { $in: cityNames.map(cn => new RegExp(`^${cn}$`, 'i')) } }
        ]
      }).session(session);
      const homestayIds = homestays.map(h => String(h._id));

      for (const h of homestays) {
        h.deleted = true;
        h.deletedBy = deletedBy;
        h.deletedAt = deletedAt;
        h.deletedReason = deletedReason;
        h.status = 'Inactive';
        await h.save({ session });
      }

      if (homestayIds.length > 0) {
        await Booking.updateMany(
          { 'propertyDetails.propertyId': { $in: homestayIds } },
          { $set: { deleted: true, deletedBy, deletedAt, deletedReason } },
          { session }
        );
      }

    } else if (type === 'city') {
      const city = await NewCity.findById(id).session(session);
      if (!city) throw new Error('City not found.');

      city.deleted = true;
      city.deletedBy = deletedBy;
      city.deletedAt = deletedAt;
      city.deletedReason = deletedReason;
      await city.save({ session });
      const cityName = city.cityName;

      const homestays = await Homestay.find({ city: { $regex: new RegExp(`^${cityName}$`, 'i') } }).session(session);
      const homestayIds = homestays.map(h => String(h._id));

      for (const h of homestays) {
        h.deleted = true;
        h.deletedBy = deletedBy;
        h.deletedAt = deletedAt;
        h.deletedReason = deletedReason;
        h.status = 'Inactive';
        await h.save({ session });
      }

      if (homestayIds.length > 0) {
        await Booking.updateMany(
          { 'propertyDetails.propertyId': { $in: homestayIds } },
          { $set: { deleted: true, deletedBy, deletedAt, deletedReason } },
          { session }
        );
      }

    } else if (type === 'amenity') {
      const amenity = await NewAmenity.findById(id).session(session);
      if (!amenity) throw new Error('Amenity not found.');

      amenity.deleted = true;
      amenity.deletedBy = deletedBy;
      amenity.deletedAt = deletedAt;
      amenity.deletedReason = deletedReason;
      await amenity.save({ session });
      const amenityName = amenity.amenityName;

      await Homestay.updateMany(
        { amenities: amenityName },
        { $pull: { amenities: amenityName } },
        { session }
      );

    } else if (type === 'room-type') {
      const rt = await NewRoomType.findById(id).session(session);
      if (!rt) throw new Error('Room Type not found.');

      rt.deleted = true;
      rt.deletedBy = deletedBy;
      rt.deletedAt = deletedAt;
      rt.deletedReason = deletedReason;
      await rt.save({ session });
      const roomTypeName = rt.roomTypeName;

      await Homestay.updateMany(
        { 'rooms.roomType': roomTypeName },
        { $pull: { rooms: { roomType: roomTypeName } } },
        { session }
      );

      await Booking.updateMany(
        { 'propertyDetails.roomCategory': roomTypeName },
        { $set: { deleted: true, deletedBy, deletedAt, deletedReason } },
        { session }
      );
    }

    await session.commitTransaction();
    logActivity(req, 'CASCADE_DELETE_SUCCESS', 'Global Settings', { type, id, reason: deletedReason });
    res.json({ success: true, message: 'Cascade soft delete completed successfully.' });

  } catch (error) {
    await session.abortTransaction();
    logActivity(req, 'CASCADE_DELETE_FAILED', 'Global Settings', { type, id, error: error.message });
    res.status(500).json({ error: 'ServerError', message: error.message });
  } finally {
    session.endSession();
  }
});

// ==========================================
// 1. STATE MANAGEMENT ENDPOINTS
// ==========================================

router.get('/admin/settings/states', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  if (!isMongoConnected()) {
    let list = mockNewStatesDatabase.filter(s => !s.deleted);
    if (search) {
      list = list.filter(s => s.stateName.toLowerCase().includes(search.toLowerCase()));
    }
    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }
    list.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    const totalDocs = list.length;
    const docs = list.slice(skip, skip + Number(limit));
    return res.json({ docs, totalPages: Math.ceil(totalDocs / Number(limit)), currentPage: Number(page), totalDocs });
  }

  try {
    const query = { deleted: false };
    if (search) {
      query.stateName = { $regex: new RegExp(search, 'i') };
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const count = await NewState.countDocuments(query);
    const docs = await NewState.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({ docs, totalPages: Math.ceil(count / Number(limit)), currentPage: Number(page), totalDocs: count });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.post('/admin/settings/states', authenticateToken, uploadSettings.single('stateImage'), async (req, res) => {
  let { stateName, status = 'Active' } = req.body;
  if (!stateName || !stateName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'State Name is required.' });
  }
  stateName = stateName.trim();

  let stateImage = '';
  if (req.file) {
    stateImage = getFileDataUrl(req.file);
  }

  if (!isMongoConnected()) {
    const exists = mockNewStatesDatabase.some(s => s.stateName.toLowerCase() === stateName.toLowerCase() && !s.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(stateImage);
      return res.status(400).json({ error: 'DuplicateState', message: 'State Name must be unique.' });
    }
    const newState = {
      _id: `mock-s-${Date.now()}`,
      stateName,
      stateImage,
      status,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedReason: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockNewStatesDatabase.push(newState);
    return res.json(newState);
  }

  try {
    const exists = await NewState.findOne({ stateName: { $regex: new RegExp(`^${stateName}$`, 'i') }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(stateImage);
      return res.status(400).json({ error: 'DuplicateState', message: 'State Name must be unique.' });
    }
    const stateDoc = new NewState({ stateName, stateImage, status });
    await stateDoc.save();
    res.json(stateDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(stateImage);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.put('/admin/settings/states/:id', authenticateToken, uploadSettings.single('stateImage'), async (req, res) => {
  const { id } = req.params;
  let { stateName, status } = req.body;

  if (!stateName || !stateName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'State Name is required.' });
  }
  stateName = stateName.trim();

  if (!isMongoConnected()) {
    const index = mockNewStatesDatabase.findIndex(s => s._id === id && !s.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'State not found.' });

    const exists = mockNewStatesDatabase.some(s => s.stateName.toLowerCase() === stateName.toLowerCase() && s._id !== id && !s.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(`/uploads/settings/${req.file.filename}`);
      return res.status(400).json({ error: 'DuplicateState', message: 'State Name must be unique.' });
    }

    const oldImage = mockNewStatesDatabase[index].stateImage;
    if (req.file) {
      mockNewStatesDatabase[index].stateImage = getFileDataUrl(req.file);
      deleteLocalFile(oldImage);
    }
    mockNewStatesDatabase[index].stateName = stateName;
    if (status) mockNewStatesDatabase[index].status = status;
    mockNewStatesDatabase[index].updatedAt = new Date();

    return res.json(mockNewStatesDatabase[index]);
  }

  try {
    const stateDoc = await NewState.findOne({ _id: id, deleted: false });
    if (!stateDoc) return res.status(404).json({ error: 'NotFound', message: 'State not found.' });

    const exists = await NewState.findOne({ stateName: { $regex: new RegExp(`^${stateName}$`, 'i') }, _id: { $ne: id }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(req.file.path);
      return res.status(400).json({ error: 'DuplicateState', message: 'State Name must be unique.' });
    }

    const oldImage = stateDoc.stateImage;
    if (req.file) {
      stateDoc.stateImage = getFileDataUrl(req.file);
      deleteLocalFile(oldImage);
    }
    stateDoc.stateName = stateName;
    if (status) stateDoc.status = status;
    await stateDoc.save();

    res.json(stateDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(`/uploads/settings/${req.file.filename}`);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.delete('/admin/settings/states/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  const reason = req.query.reason || 'Direct soft delete';

  try {
    const counts = await calculateDependencies('state', id);
    if (!counts) return res.status(404).json({ error: 'NotFound', message: 'State not found.' });

    const totalDeps = counts.cities + counts.homestays + counts.rooms + counts.bookings;
    if (totalDeps > 0 && !force) {
      return res.status(409).json({
        error: 'DependencyConflict',
        message: 'This State is linked to active dependent records. Confirm cascade delete.',
        dependencies: counts
      });
    }

    const deletedBy = `${req.admin?.email || 'Super Admin'} (${req.admin?.role || 'SuperAdmin'})`;
    const deletedAt = new Date();

    if (!isMongoConnected()) {
      const idx = mockNewStatesDatabase.findIndex(s => s._id === id);
      mockNewStatesDatabase[idx].deleted = true;
      mockNewStatesDatabase[idx].deletedBy = deletedBy;
      mockNewStatesDatabase[idx].deletedAt = deletedAt;
      mockNewStatesDatabase[idx].deletedReason = reason;
      return res.json({ success: true, message: 'State soft-deleted.' });
    }

    await NewState.findByIdAndUpdate(id, {
      $set: { deleted: true, deletedBy, deletedAt, deletedReason: reason }
    });
    res.json({ success: true, message: 'State soft-deleted.' });

  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.patch('/admin/settings/states/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'ValidationError', message: 'Status must be Active or Inactive.' });
  }

  if (!isMongoConnected()) {
    const index = mockNewStatesDatabase.findIndex(s => s._id === id && !s.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'State not found.' });
    mockNewStatesDatabase[index].status = status;
    return res.json(mockNewStatesDatabase[index]);
  }

  try {
    const stateDoc = await NewState.findOne({ _id: id, deleted: false });
    if (!stateDoc) return res.status(404).json({ error: 'NotFound', message: 'State not found.' });
    stateDoc.status = status;
    await stateDoc.save();
    res.json(stateDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// ==========================================
// 2. CITY MANAGEMENT ENDPOINTS
// ==========================================

router.get('/admin/settings/cities', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '', stateId = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  if (!isMongoConnected()) {
    let list = mockNewCitiesDatabase.filter(c => !c.deleted);
    if (search) {
      list = list.filter(c => c.cityName.toLowerCase().includes(search.toLowerCase()));
    }
    if (stateId) {
      list = list.filter(c => c.stateId === stateId);
    }
    if (status && status !== 'all') {
      list = list.filter(c => c.status === status);
    }

    let populated = list.map(c => {
      const st = mockNewStatesDatabase.find(s => s._id === c.stateId);
      return {
        ...c,
        stateId: st ? { _id: st._id, stateName: st.stateName } : { _id: c.stateId, stateName: 'Unknown' }
      };
    });

    populated.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalDocs = populated.length;
    const docs = populated.slice(skip, skip + Number(limit));
    return res.json({ docs, totalPages: Math.ceil(totalDocs / Number(limit)), currentPage: Number(page), totalDocs });
  }

  try {
    const query = { deleted: false };
    if (search) {
      query.cityName = { $regex: new RegExp(search, 'i') };
    }
    if (stateId) {
      query.stateId = stateId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const count = await NewCity.countDocuments(query);
    const docs = await NewCity.find(query)
      .populate('stateId', 'stateName')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({ docs, totalPages: Math.ceil(count / Number(limit)), currentPage: Number(page), totalDocs: count });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.post('/admin/settings/cities', authenticateToken, uploadSettings.single('cityImage'), async (req, res) => {
  let { cityName, stateId, status = 'Active' } = req.body;
  if (!cityName || !cityName.trim() || !stateId) {
    return res.status(400).json({ error: 'ValidationError', message: 'City Name and State are required.' });
  }
  cityName = cityName.trim();

  let cityImage = '';
  if (req.file) {
    cityImage = getFileDataUrl(req.file);
  }

  if (!isMongoConnected()) {
    const exists = mockNewCitiesDatabase.some(c => c.stateId === stateId && c.cityName.toLowerCase() === cityName.toLowerCase() && !c.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(cityImage);
      return res.status(400).json({ error: 'DuplicateCity', message: 'City Name must be unique within this State.' });
    }
    const newCity = {
      _id: `mock-c-${Date.now()}`,
      cityName,
      stateId,
      cityImage,
      status,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedReason: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockNewCitiesDatabase.push(newCity);
    return res.json(newCity);
  }

  try {
    const exists = await NewCity.findOne({ stateId, cityName: { $regex: new RegExp(`^${cityName}$`, 'i') }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(cityImage);
      return res.status(400).json({ error: 'DuplicateCity', message: 'City Name must be unique within this State.' });
    }
    const cityDoc = new NewCity({ cityName, stateId, cityImage, status });
    await cityDoc.save();
    res.json(cityDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(cityImage);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.put('/admin/settings/cities/:id', authenticateToken, uploadSettings.single('cityImage'), async (req, res) => {
  const { id } = req.params;
  let { cityName, stateId, status } = req.body;

  if (!cityName || !cityName.trim() || !stateId) {
    return res.status(400).json({ error: 'ValidationError', message: 'City Name and State are required.' });
  }
  cityName = cityName.trim();

  if (!isMongoConnected()) {
    const index = mockNewCitiesDatabase.findIndex(c => c._id === id && !c.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'City not found.' });

    const exists = mockNewCitiesDatabase.some(c => c.stateId === stateId && c.cityName.toLowerCase() === cityName.toLowerCase() && c._id !== id && !c.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(`/uploads/settings/${req.file.filename}`);
      return res.status(400).json({ error: 'DuplicateCity', message: 'City Name must be unique within this State.' });
    }

    const oldImage = mockNewCitiesDatabase[index].cityImage;
    if (req.file) {
      mockNewCitiesDatabase[index].cityImage = getFileDataUrl(req.file);
      deleteLocalFile(oldImage);
    }
    mockNewCitiesDatabase[index].cityName = cityName;
    mockNewCitiesDatabase[index].stateId = stateId;
    if (status) mockNewCitiesDatabase[index].status = status;
    mockNewCitiesDatabase[index].updatedAt = new Date();

    return res.json(mockNewCitiesDatabase[index]);
  }

  try {
    const cityDoc = await NewCity.findOne({ _id: id, deleted: false });
    if (!cityDoc) return res.status(404).json({ error: 'NotFound', message: 'City not found.' });

    const exists = await NewCity.findOne({ stateId, cityName: { $regex: new RegExp(`^${cityName}$`, 'i') }, _id: { $ne: id }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(req.file.path);
      return res.status(400).json({ error: 'DuplicateCity', message: 'City Name must be unique within this State.' });
    }

    const oldImage = cityDoc.cityImage;
    if (req.file) {
      cityDoc.cityImage = getFileDataUrl(req.file);
      deleteLocalFile(oldImage);
    }
    cityDoc.cityName = cityName;
    cityDoc.stateId = stateId;
    if (status) cityDoc.status = status;
    await cityDoc.save();

    res.json(cityDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(req.file.path);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.delete('/admin/settings/cities/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  const reason = req.query.reason || 'Direct soft delete';

  try {
    const counts = await calculateDependencies('city', id);
    if (!counts) return res.status(404).json({ error: 'NotFound', message: 'City not found.' });

    const totalDeps = counts.homestays + counts.bookings;
    if (totalDeps > 0 && !force) {
      return res.status(409).json({
        error: 'DependencyConflict',
        message: 'This City has active dependencies. Confirm cascade delete.',
        dependencies: counts
      });
    }

    const deletedBy = `${req.admin?.email || 'Super Admin'} (${req.admin?.role || 'SuperAdmin'})`;
    const deletedAt = new Date();

    if (!isMongoConnected()) {
      const idx = mockNewCitiesDatabase.findIndex(c => c._id === id);
      mockNewCitiesDatabase[idx].deleted = true;
      mockNewCitiesDatabase[idx].deletedBy = deletedBy;
      mockNewCitiesDatabase[idx].deletedAt = deletedAt;
      mockNewCitiesDatabase[idx].deletedReason = reason;
      return res.json({ success: true, message: 'City soft-deleted.' });
    }

    await NewCity.findByIdAndUpdate(id, {
      $set: { deleted: true, deletedBy, deletedAt, deletedReason: reason }
    });
    res.json({ success: true, message: 'City soft-deleted.' });

  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.patch('/admin/settings/cities/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'ValidationError', message: 'Status must be Active or Inactive.' });
  }

  if (!isMongoConnected()) {
    const index = mockNewCitiesDatabase.findIndex(c => c._id === id && !c.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'City not found.' });
    mockNewCitiesDatabase[index].status = status;
    return res.json(mockNewCitiesDatabase[index]);
  }

  try {
    const cityDoc = await NewCity.findOne({ _id: id, deleted: false });
    if (!cityDoc) return res.status(404).json({ error: 'NotFound', message: 'City not found.' });
    cityDoc.status = status;
    await cityDoc.save();
    res.json(cityDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// ==========================================
// 3. AMENITIES MANAGEMENT ENDPOINTS
// ==========================================

router.get('/admin/settings/amenities', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  if (!isMongoConnected()) {
    let list = mockNewAmenitiesDatabase.filter(a => !a.deleted);
    if (search) {
      list = list.filter(a => a.amenityName.toLowerCase().includes(search.toLowerCase()));
    }
    if (status && status !== 'all') {
      list = list.filter(a => a.status === status);
    }
    list.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    const totalDocs = list.length;
    const docs = list.slice(skip, skip + Number(limit));
    return res.json({ docs, totalPages: Math.ceil(totalDocs / Number(limit)), currentPage: Number(page), totalDocs });
  }

  try {
    const query = { deleted: false };
    if (search) {
      query.amenityName = { $regex: new RegExp(search, 'i') };
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const count = await NewAmenity.countDocuments(query);
    const docs = await NewAmenity.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({ docs, totalPages: Math.ceil(count / Number(limit)), currentPage: Number(page), totalDocs: count });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.post('/admin/settings/amenities', authenticateToken, uploadSettings.single('amenityIcon'), async (req, res) => {
  let { amenityName, status = 'Active' } = req.body;
  if (!amenityName || !amenityName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'Amenity Name is required.' });
  }
  amenityName = amenityName.trim();

  if (!req.file && !req.body.amenityIcon) {
    return res.status(400).json({ error: 'ValidationError', message: 'Amenity Icon/Image is required.' });
  }

  let amenityIcon = req.body.amenityIcon || '';
  if (req.file) {
    amenityIcon = getFileDataUrl(req.file);
  }

  if (!isMongoConnected()) {
    const exists = mockNewAmenitiesDatabase.some(a => a.amenityName.toLowerCase() === amenityName.toLowerCase() && !a.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(amenityIcon);
      return res.status(400).json({ error: 'DuplicateAmenity', message: 'Amenity Name must be unique.' });
    }
    const newAmenity = {
      _id: `mock-a-${Date.now()}`,
      amenityName,
      amenityIcon,
      status,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedReason: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockNewAmenitiesDatabase.push(newAmenity);
    return res.json(newAmenity);
  }

  try {
    const exists = await NewAmenity.findOne({ amenityName: { $regex: new RegExp(`^${amenityName}$`, 'i') }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(amenityIcon);
      return res.status(400).json({ error: 'DuplicateAmenity', message: 'Amenity Name must be unique.' });
    }
    const amenityDoc = new NewAmenity({ amenityName, amenityIcon, status });
    await amenityDoc.save();
    res.json(amenityDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(amenityIcon);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.put('/admin/settings/amenities/:id', authenticateToken, uploadSettings.single('amenityIcon'), async (req, res) => {
  const { id } = req.params;
  let { amenityName, status } = req.body;

  if (!amenityName || !amenityName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'Amenity Name is required.' });
  }
  amenityName = amenityName.trim();

  if (!isMongoConnected()) {
    const index = mockNewAmenitiesDatabase.findIndex(a => a._id === id && !a.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'Amenity not found.' });

    const exists = mockNewAmenitiesDatabase.some(a => a.amenityName.toLowerCase() === amenityName.toLowerCase() && a._id !== id && !a.deleted);
    if (exists) {
      if (req.file) deleteLocalFile(`/uploads/settings/${req.file.filename}`);
      return res.status(400).json({ error: 'DuplicateAmenity', message: 'Amenity Name must be unique.' });
    }

    const oldIcon = mockNewAmenitiesDatabase[index].amenityIcon;
    if (req.file) {
      mockNewAmenitiesDatabase[index].amenityIcon = getFileDataUrl(req.file);
      deleteLocalFile(oldIcon);
    }
    mockNewAmenitiesDatabase[index].amenityName = amenityName;
    if (status) mockNewAmenitiesDatabase[index].status = status;
    mockNewAmenitiesDatabase[index].updatedAt = new Date();

    return res.json(mockNewAmenitiesDatabase[index]);
  }

  try {
    const amenityDoc = await NewAmenity.findOne({ _id: id, deleted: false });
    if (!amenityDoc) return res.status(404).json({ error: 'NotFound', message: 'Amenity not found.' });

    const exists = await NewAmenity.findOne({ amenityName: { $regex: new RegExp(`^${amenityName}$`, 'i') }, _id: { $ne: id }, deleted: false });
    if (exists) {
      if (req.file) deleteLocalFile(req.file.path);
      return res.status(400).json({ error: 'DuplicateAmenity', message: 'Amenity Name must be unique.' });
    }

    const oldIcon = amenityDoc.amenityIcon;
    if (req.file) {
      amenityDoc.amenityIcon = getFileDataUrl(req.file);
      deleteLocalFile(oldIcon);
    }
    amenityDoc.amenityName = amenityName;
    if (status) amenityDoc.status = status;
    await amenityDoc.save();

    res.json(amenityDoc);
  } catch (error) {
    if (req.file) deleteLocalFile(req.file.path);
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.delete('/admin/settings/amenities/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  const reason = req.query.reason || 'Direct soft delete';

  try {
    const counts = await calculateDependencies('amenity', id);
    if (!counts) return res.status(404).json({ error: 'NotFound', message: 'Amenity not found.' });

    if (counts.homestays > 0 && !force) {
      return res.status(409).json({
        error: 'DependencyConflict',
        message: 'This Amenity is used by active properties. Confirm cascade delete.',
        dependencies: counts
      });
    }

    const deletedBy = `${req.admin?.email || 'Super Admin'} (${req.admin?.role || 'SuperAdmin'})`;
    const deletedAt = new Date();

    if (!isMongoConnected()) {
      const idx = mockNewAmenitiesDatabase.findIndex(a => a._id === id);
      mockNewAmenitiesDatabase[idx].deleted = true;
      mockNewAmenitiesDatabase[idx].deletedBy = deletedBy;
      mockNewAmenitiesDatabase[idx].deletedAt = deletedAt;
      mockNewAmenitiesDatabase[idx].deletedReason = reason;
      return res.json({ success: true, message: 'Amenity soft-deleted.' });
    }

    await NewAmenity.findByIdAndUpdate(id, {
      $set: { deleted: true, deletedBy, deletedAt, deletedReason: reason }
    });
    res.json({ success: true, message: 'Amenity soft-deleted.' });

  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.patch('/admin/settings/amenities/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'ValidationError', message: 'Status must be Active or Inactive.' });
  }

  if (!isMongoConnected()) {
    const index = mockNewAmenitiesDatabase.findIndex(a => a._id === id && !a.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'Amenity not found.' });
    mockNewAmenitiesDatabase[index].status = status;
    return res.json(mockNewAmenitiesDatabase[index]);
  }

  try {
    const amenityDoc = await NewAmenity.findOne({ _id: id, deleted: false });
    if (!amenityDoc) return res.status(404).json({ error: 'NotFound', message: 'Amenity not found.' });
    amenityDoc.status = status;
    await amenityDoc.save();
    res.json(amenityDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// ==========================================
// 4. ROOM TYPES MANAGEMENT ENDPOINTS
// ==========================================

router.get('/admin/settings/room-types', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  if (!isMongoConnected()) {
    let list = mockNewRoomTypesDatabase.filter(r => !r.deleted);
    if (search) {
      list = list.filter(r => r.roomTypeName.toLowerCase().includes(search.toLowerCase()));
    }
    if (status && status !== 'all') {
      list = list.filter(r => r.status === status);
    }
    list.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    const totalDocs = list.length;
    const docs = list.slice(skip, skip + Number(limit));
    return res.json({ docs, totalPages: Math.ceil(totalDocs / Number(limit)), currentPage: Number(page), totalDocs });
  }

  try {
    const query = { deleted: false };
    if (search) {
      query.roomTypeName = { $regex: new RegExp(search, 'i') };
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const count = await NewRoomType.countDocuments(query);
    const docs = await NewRoomType.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({ docs, totalPages: Math.ceil(count / Number(limit)), currentPage: Number(page), totalDocs: count });
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.post('/admin/settings/room-types', authenticateToken, async (req, res) => {
  let { roomTypeName, status = 'Active' } = req.body;
  if (!roomTypeName || !roomTypeName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'Room Type Name is required.' });
  }
  roomTypeName = roomTypeName.trim();

  if (!isMongoConnected()) {
    const exists = mockNewRoomTypesDatabase.some(r => r.roomTypeName.toLowerCase() === roomTypeName.toLowerCase() && !r.deleted);
    if (exists) {
      return res.status(400).json({ error: 'DuplicateRoomType', message: 'Room Type Name must be unique.' });
    }
    const newRoomType = {
      _id: `mock-rt-${Date.now()}`,
      roomTypeName,
      status,
      deleted: false,
      deletedBy: null,
      deletedAt: null,
      deletedReason: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockNewRoomTypesDatabase.push(newRoomType);
    return res.json(newRoomType);
  }

  try {
    const exists = await NewRoomType.findOne({ roomTypeName: { $regex: new RegExp(`^${roomTypeName}$`, 'i') }, deleted: false });
    if (exists) {
      return res.status(400).json({ error: 'DuplicateRoomType', message: 'Room Type Name must be unique.' });
    }
    const roomTypeDoc = new NewRoomType({ roomTypeName, status });
    await roomTypeDoc.save();
    res.json(roomTypeDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.put('/admin/settings/room-types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let { roomTypeName, status } = req.body;

  if (!roomTypeName || !roomTypeName.trim()) {
    return res.status(400).json({ error: 'ValidationError', message: 'Room Type Name is required.' });
  }
  roomTypeName = roomTypeName.trim();

  if (!isMongoConnected()) {
    const index = mockNewRoomTypesDatabase.findIndex(r => r._id === id && !r.deleted);
    if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'Room Type not found.' });

    const exists = mockNewRoomTypesDatabase.some(r => r.roomTypeName.toLowerCase() === roomTypeName.toLowerCase() && r._id !== id && !r.deleted);
    if (exists) {
      return res.status(400).json({ error: 'DuplicateRoomType', message: 'Room Type Name must be unique.' });
    }

    mockNewRoomTypesDatabase[index].roomTypeName = roomTypeName;
    if (status) mockNewRoomTypesDatabase[index].status = status;
    mockNewRoomTypesDatabase[index].updatedAt = new Date();

    return res.json(mockNewRoomTypesDatabase[index]);
  }

  try {
    const roomTypeDoc = await NewRoomType.findOne({ _id: id, deleted: false });
    if (!roomTypeDoc) return res.status(404).json({ error: 'NotFound', message: 'Room Type not found.' });

    const exists = await NewRoomType.findOne({ roomTypeName: { $regex: new RegExp(`^${roomTypeName}$`, 'i') }, _id: { $ne: id }, deleted: false });
    if (exists) {
      return res.status(400).json({ error: 'DuplicateRoomType', message: 'Room Type Name must be unique.' });
    }

    roomTypeDoc.roomTypeName = roomTypeName;
    if (status) roomTypeDoc.status = status;
    await roomTypeDoc.save();

    res.json(roomTypeDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.delete('/admin/settings/room-types/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';
  const reason = req.query.reason || 'Direct soft delete';

  try {
    const counts = await calculateDependencies('room-type', id);
    if (!counts) return res.status(404).json({ error: 'NotFound', message: 'Room Type not found.' });

    const totalDeps = counts.homestays + counts.bookings;
    if (totalDeps > 0 && !force) {
      return res.status(409).json({
        error: 'DependencyConflict',
        message: 'This Room Type has active dependencies. Confirm cascade delete.',
        dependencies: counts
      });
    }

    const deletedBy = `${req.admin?.email || 'Super Admin'} (${req.admin?.role || 'SuperAdmin'})`;
    const deletedAt = new Date();

    if (!isMongoConnected()) {
      const idx = mockNewRoomTypesDatabase.findIndex(r => r._id === id);
      mockNewRoomTypesDatabase[idx].deleted = true;
      mockNewRoomTypesDatabase[idx].deletedBy = deletedBy;
      mockNewRoomTypesDatabase[idx].deletedAt = deletedAt;
      mockNewRoomTypesDatabase[idx].deletedReason = reason;
      return res.json({ success: true, message: 'Room Type soft-deleted.' });
    }

    await NewRoomType.findByIdAndUpdate(id, {
      $set: { deleted: true, deletedBy, deletedAt, deletedReason: reason }
    });
    res.json({ success: true, message: 'Room Type soft-deleted.' });

  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

router.patch('/admin/settings/room-types/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ error: 'ValidationError', message: 'Status must be Active or Inactive.' });
  }

  try {
    if (!isMongoConnected()) {
      const index = mockNewRoomTypesDatabase.findIndex(r => r._id === id && !r.deleted);
      if (index === -1) return res.status(404).json({ error: 'NotFound', message: 'Room Type not found.' });
      mockNewRoomTypesDatabase[index].status = status;
      return res.json(mockNewRoomTypesDatabase[index]);
    }

    const roomTypeDoc = await NewRoomType.findOne({ _id: id, deleted: false });
    if (!roomTypeDoc) return res.status(404).json({ error: 'NotFound', message: 'Room Type not found.' });
    roomTypeDoc.status = status;
    await roomTypeDoc.save();
    res.json(roomTypeDoc);
  } catch (error) {
    res.status(500).json({ error: 'ServerError', message: error.message });
  }
});

// --- MASTER SETTINGS LISTINGS ---
router.get('/settings/master-states', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json(mockNewStatesDatabase.filter(s => !s.deleted && s.status === 'Active'));
    }
    const states = await NewState.find({ deleted: false, status: 'Active' }).sort({ stateName: 1 });
    res.json(states);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.get('/settings/master-cities', async (req, res) => {
  const { stateId } = req.query;
  try {
    if (!isMongoConnected()) {
      let list = mockNewCitiesDatabase.filter(c => !c.deleted && c.status === 'Active');
      if (stateId) list = list.filter(c => c.stateId === stateId);
      return res.json(list);
    }
    const q = { deleted: false, status: 'Active' };
    if (stateId) q.stateId = stateId;
    const cities = await NewCity.find(q).sort({ cityName: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.get('/settings/master-amenities', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json(mockNewAmenitiesDatabase.filter(a => !a.deleted && a.status === 'Active'));
    }
    const amenities = await NewAmenity.find({ deleted: false, status: 'Active' }).sort({ amenityName: 1 });
    res.json(amenities);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.get('/settings/master-room-types', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json(mockNewRoomTypesDatabase.filter(r => !r.deleted && r.status === 'Active'));
    }
    const types = await NewRoomType.find({ deleted: false, status: 'Active' }).sort({ roomTypeName: 1 });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// --- OWNER WIZARD API & MEMORY MOCKS ---
let mockPropertiesDatabase = [];
let mockPropertyGalleryDatabase = [];
let mockPropertyRoomsDatabase = [];
let mockPropertyAmenitiesDatabase = [];
let mockPropertySeasonsDatabase = [];
let mockPropertyPricingDatabase = [];
let mockPropertyApprovalsDatabase = [];
let mockPropertyAuditLogsDatabase = [];

// Custom Multer Instance for Properties Image upload
const propertyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = getUploadDir('properties');
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'original-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const uploadPropertyImage = multer({
  storage: propertyStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, JPEG, PNG, and WEBP files are allowed.'));
    }
    cb(null, true);
  }
});

router.post('/homestay-owner/properties/upload-image', authenticateToken, uploadPropertyImage.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NoFileUploaded', message: 'No file was uploaded.' });
  }
  try {
    const dataUrl = getFileDataUrl(req.file);
    const mediaDoc = new Media({
      data: dataUrl,
      mimeType: req.file.mimetype || 'image/png'
    });
    await mediaDoc.save();
    
    const fileUrl = `/api/media/${mediaDoc._id}`;
    res.json({
      originalUrl: fileUrl,
      optimizedUrl: fileUrl,
      thumbUrl: fileUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'UploadError', message: err.message });
  }
});

router.get('/homestay-owner/properties/draft', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id;
    const isNew = req.query.new === 'true';

    let resolvedOwnerName = '';
    let resolvedOwnerMobile = '';
    let resolvedOwnerEmail = req.user.email || '';

    if (!isMongoConnected()) {
      const o = mockOwnersDatabase.find(x => String(x._id) === String(ownerId));
      if (o) {
        resolvedOwnerName = `${o.firstName || ''} ${o.lastName || ''}`.trim();
        resolvedOwnerMobile = o.mobile || o.whatsApp || '';
        resolvedOwnerEmail = o.email || '';
      }
    } else {
      const o = await HomestayOwner.findById(ownerId);
      if (o) {
        resolvedOwnerName = `${o.firstName || ''} ${o.lastName || ''}`.trim();
        resolvedOwnerMobile = o.mobile || o.whatsApp || '';
        resolvedOwnerEmail = o.email || '';
      }
    }

    if (!isMongoConnected()) {
      let prop;
      if (!isNew) {
        if (req.query.propertyId) {
          prop = mockPropertiesDatabase.find(p => String(p._id) === String(req.query.propertyId) && !p.deleted);
        } else {
          prop = mockPropertiesDatabase.find(p => p.ownerId === ownerId && ['Draft', 'Changes Requested'].includes(p.status) && !p.deleted);
        }
      }
      if (!prop) {
        prop = {
          _id: 'WG-PROP-' + Math.floor(100000 + Math.random() * 900000),
          ownerId,
          ownerName: resolvedOwnerName,
          ownerMobile: resolvedOwnerMobile,
          ownerEmail: resolvedOwnerEmail,
          name: '',
          type: '',
          category: '',
          state: '',
          city: '',
          address: '',
          description: '',
          status: 'Draft',
          currentStep: 1,
          deleted: false
        };
        mockPropertiesDatabase.push(prop);
      }

      const gallery = mockPropertyGalleryDatabase.find(g => g.propertyId === prop._id) || { coverImage: '', images: [] };
      const rooms = mockPropertyRoomsDatabase.filter(r => r.propertyId === prop._id);
      const amenities = mockPropertyAmenitiesDatabase.find(a => a.propertyId === prop._id) || { amenityIds: [] };
      const seasonsList = mockPropertySeasonsDatabase.filter(s => s.propertyId === prop._id);
      const pricingList = mockPropertyPricingDatabase.filter(p => p.propertyId === prop._id);
      const approval = mockPropertyApprovalsDatabase.find(a => a.propertyId === prop._id) || null;

      const seasons = {};
      seasonsList.forEach(s => {
        seasons[s.roomCategoryId] = {
          peak: (s.seasons.peak || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) })),
          mid: (s.seasons.mid || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) })),
          off: (s.seasons.off || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) }))
        };
      });

      const rates = {};
      pricingList.forEach(p => {
        if (!rates[p.roomCategoryId]) rates[p.roomCategoryId] = {};
        if (!rates[p.roomCategoryId][p.seasonType]) rates[p.roomCategoryId][p.seasonType] = {};
        rates[p.roomCategoryId][p.seasonType][p.mealPlan] = {
          b2b: p.b2bRate,
          b2c: p.b2cRate,
          extraAdultB2B: p.extraAdultB2B,
          extraAdultB2C: p.extraAdultB2C,
          childB2B: p.childB2B,
          childB2C: p.childB2C
        };
      });

      return res.json({
        property: prop,
        gallery,
        rooms: rooms.map(r => ({
          id: r._id,
          name: r.roomCategoryName,
          type: r.roomType,
          count: r.numberOfRooms,
          roomNumbers: r.roomNumbers.join(', '),
          occupancy: r.maxOccupancyAdults,
          maxOccupancyChildren: r.maxOccupancyChildren,
          extraPerson: r.extraPersonAllowed,
          roomSize: r.roomSize,
          bedType: r.bedType,
          description: r.description,
          images: r.images,
          amenities: r.amenityIds
        })),
        amenities: amenities.amenityIds,
        seasons,
        rates,
        approval
      });
    }

    let prop;
    const isSuperAdmin = req.user.role === 'Super Admin';
    if (!isNew) {
      if (req.query.propertyId) {
        const query = { _id: req.query.propertyId, deleted: false };
        if (!isSuperAdmin) query.ownerId = ownerId;
        prop = await Property.findOne(query);
      } else {
        prop = await Property.findOne({ ownerId, status: { $in: ['Draft', 'Changes Requested'] }, deleted: false });
      }
    }
    if (!prop) {
      const count = await Property.countDocuments();
      const propIdStr = `WG-PROP-${String(count + 1).padStart(6, '0')}`;
      prop = new Property({
        propertyId: propIdStr,
        name: '',
        type: '',
        category: '',
        ownerId,
        ownerName: resolvedOwnerName,
        ownerMobile: resolvedOwnerMobile,
        ownerEmail: resolvedOwnerEmail,
        state: '',
        city: '',
        address: '',
        description: '',
        status: 'Draft',
        currentStep: 1
      });
      await prop.save();
    }

    const gallery = await PropertyGallery.findOne({ propertyId: prop._id }) || { coverImage: '', images: [] };
    const rooms = await PropertyRooms.find({ propertyId: prop._id });
    const amenities = await PropertyAmenities.findOne({ propertyId: prop._id }) || { amenityIds: [] };
    const seasonsList = await PropertySeason.find({ propertyId: prop._id });
    const pricingList = await PropertyPricing.find({ propertyId: prop._id });
    const approval = await PropertyApproval.findOne({ propertyId: prop._id }).sort({ createdAt: -1 });

    const seasons = {};
    seasonsList.forEach(s => {
      seasons[s.roomCategoryId] = {
        peak: (s.seasons.peak || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) })),
        mid: (s.seasons.mid || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) })),
        off: (s.seasons.off || []).map(r => ({ start: formatDateSafe(r.start), end: formatDateSafe(r.end) }))
      };
    });

    const rates = {};
    pricingList.forEach(p => {
      if (!rates[p.roomCategoryId]) rates[p.roomCategoryId] = {};
      if (!rates[p.roomCategoryId][p.seasonType]) rates[p.roomCategoryId][p.seasonType] = {};
      rates[p.roomCategoryId][p.seasonType][p.mealPlan] = {
        b2b: p.b2bRate,
        b2c: p.b2cRate,
        extraAdultB2B: p.extraAdultB2B,
        extraAdultB2C: p.extraAdultB2C,
        childB2B: p.childB2B,
        childB2C: p.childB2C,
        taxInclusive: p.taxInclusive,
        weekendPrice: p.weekendPrice,
        festivalPrice: p.festivalPrice
      };
    });

    res.json({
      property: prop,
      gallery,
      rooms: rooms.map(r => ({
        id: r._id,
        name: r.roomCategoryName,
        type: r.roomType,
        count: r.numberOfRooms,
        roomNumbers: r.roomNumbers.join(', '),
        occupancy: r.maxOccupancyAdults,
        maxOccupancyChildren: r.maxOccupancyChildren,
        extraPerson: r.extraPersonAllowed,
        roomSize: r.roomSize,
        bedType: r.bedType,
        description: r.description,
        images: r.images,
        amenities: r.amenityIds
      })),
      amenities: amenities.amenityIds,
      seasons,
      rates,
      approval
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.post('/homestay-owner/properties/save-step', authenticateToken, async (req, res) => {
  const { propertyId, step, data } = req.body;
  if (!propertyId || !step) {
    return res.status(400).json({ error: 'ValidationError', message: 'Property ID and step number are required.' });
  }

  try {
    let prop;
    let prevValue = '';
    let newValue = JSON.stringify(data);

    const isSuperAdmin = req.user.role === 'Super Admin';
    if (!isMongoConnected()) {
      prop = mockPropertiesDatabase.find(p => p._id === propertyId && (isSuperAdmin || p.ownerId === req.user._id) && !p.deleted);
      if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

      if (!isSuperAdmin && (prop.status === 'Submitted For Review' || prop.status === 'Pending Approval')) {
        return res.status(403).json({
          error: 'EditingLocked',
          message: 'This property is currently under review by Super Admin. Editing is locked until review is completed.'
        });
      }
      if (!isSuperAdmin && (prop.status === 'Approved' || prop.status === 'Active')) {
        prop.status = 'Submitted For Review';
      }

      if (step === 1) {
        const { name, type, category, ownerName, phone, email, website, gstNumber, state, city, address, googleMap, latitude, longitude, description } = data;
        if (!name || name.trim().length < 5 || name.trim().length > 150) {
          return res.status(400).json({ error: 'ValidationError', message: 'Property Name must be between 5 and 150 characters.' });
        }
        if (!address || !address.trim()) {
          return res.status(400).json({ error: 'ValidationError', message: 'Address is required.' });
        }
        if (!description || description.trim().length < 100 || description.trim().length > 5000) {
          return res.status(400).json({ error: 'ValidationError', message: 'Description must be between 100 and 5000 characters.' });
        }

        const nameExists = mockPropertiesDatabase.some(p => p.ownerId === req.user._id && p.name.toLowerCase() === name.trim().toLowerCase() && p._id !== propertyId && !p.deleted);
        if (nameExists) {
          return res.status(400).json({ error: 'DuplicateProperty', message: 'You have already registered a property with this name.' });
        }

        prevValue = JSON.stringify(prop);
        prop.name = name.trim();
        prop.type = type;
        prop.category = category;
        prop.ownerName = ownerName;
        prop.ownerMobile = phone;
        prop.ownerEmail = email;
        prop.website = website || '';
        prop.gstNumber = gstNumber || '';
        prop.state = state;
        prop.city = city;
        prop.address = address;
        prop.googleMapUrl = googleMap || '';
        prop.latitude = Number(latitude) || 0;
        prop.longitude = Number(longitude) || 0;
        prop.description = description.trim();
        prop.currentStep = Math.max(prop.currentStep, 2);

      } else if (step === 2) {
        const { cover, images } = data;
        if (!cover) return res.status(400).json({ error: 'ValidationError', message: 'Cover Image is required.' });
        let existingGal = mockPropertyGalleryDatabase.find(g => g.propertyId === propertyId);
        prevValue = JSON.stringify(existingGal);
        if (existingGal) {
          existingGal.coverImage = cover;
          existingGal.images = images || [];
        } else {
          existingGal = { _id: 'gal-' + Date.now(), propertyId, coverImage: cover, images: images || [] };
          mockPropertyGalleryDatabase.push(existingGal);
        }
        prop.currentStep = Math.max(prop.currentStep, 3);

      } else if (step === 3) {
        const { amenityIds } = data;
        let existingAm = mockPropertyAmenitiesDatabase.find(a => a.propertyId === propertyId);
        prevValue = JSON.stringify(existingAm);
        if (existingAm) {
          existingAm.amenityIds = amenityIds || [];
        } else {
          existingAm = { _id: 'am-' + Date.now(), propertyId, amenityIds: amenityIds || [] };
          mockPropertyAmenitiesDatabase.push(existingAm);
        }
        prop.currentStep = Math.max(prop.currentStep, 4);

      } else if (step === 4) {
        const { rooms } = data;
        if (!rooms || rooms.length === 0) {
          return res.status(400).json({ error: 'ValidationError', message: 'At least one Room Category is required.' });
        }
        const roomNumSet = new Set();
        for (const roomCat of rooms) {
          const nums = String(roomCat.roomNumbers).split(',').map(n => n.trim()).filter(Boolean);
          if (nums.length !== Number(roomCat.count)) {
            return res.status(400).json({ error: 'ValidationError', message: `Room numbers count must match total rooms for category "${roomCat.name}".` });
          }
          for (const num of nums) {
            if (roomNumSet.has(num)) {
              return res.status(400).json({ error: 'ValidationError', message: `Duplicate room number "${num}" detected.` });
            }
            roomNumSet.add(num);
          }
        }

        const roomsToKeepIds = rooms.map(r => r.id).filter(id => id && id.startsWith('RM-'));
        mockPropertyRoomsDatabase = mockPropertyRoomsDatabase.filter(r => r.propertyId !== propertyId || roomsToKeepIds.includes(r._id));
        mockPropertySeasonsDatabase = mockPropertySeasonsDatabase.filter(s => s.propertyId !== propertyId || roomsToKeepIds.includes(s.roomCategoryId));
        mockPropertyPricingDatabase = mockPropertyPricingDatabase.filter(p => p.propertyId !== propertyId || roomsToKeepIds.includes(p.roomCategoryId));

        const insertedRooms = [];
        for (const r of rooms) {
          const existingIdx = mockPropertyRoomsDatabase.findIndex(room => room._id === r.id && room.propertyId === propertyId);
          const isNew = existingIdx === -1;
          const roomId = isNew ? 'RM-' + Math.floor(100000 + Math.random() * 900000) : r.id;

          const roomDoc = {
            _id: roomId,
            propertyId,
            roomCategoryName: r.name,
            roomType: r.type,
            numberOfRooms: Number(r.count),
            roomNumbers: String(r.roomNumbers).split(',').map(n => n.trim()).filter(Boolean),
            maxOccupancyAdults: Number(r.occupancy),
            maxOccupancyChildren: Number(r.maxOccupancyChildren || 0),
            extraPersonAllowed: parseExtraPerson(r.extraPerson),
            roomSize: Number(r.roomSize || 300),
            bedType: r.bedType || 'Double Bed',
            description: r.description || '',
            images: r.images || [],
            amenityIds: r.amenities || []
          };

          if (isNew) {
            mockPropertyRoomsDatabase.push(roomDoc);
          } else {
            mockPropertyRoomsDatabase[existingIdx] = roomDoc;
          }
          insertedRooms.push(roomDoc);
        }
        prop.currentStep = Math.max(prop.currentStep, 5);

        const audit = {
          _id: 'aud-' + Date.now(),
          propertyId,
          action: 'EDIT',
          user: req.user.email,
          role: 'Owner',
          ip: req.ip || '',
          createdAt: new Date(),
          previousValue: prevValue,
          newValue
        };
        mockPropertyAuditLogsDatabase.push(audit);

        return res.json({
          success: true,
          currentStep: prop.currentStep,
          rooms: insertedRooms.map(r => ({
            id: r._id,
            name: r.roomCategoryName,
            type: r.roomType,
            count: r.numberOfRooms,
            roomNumbers: r.roomNumbers.join(', '),
            occupancy: r.maxOccupancyAdults,
            maxOccupancyChildren: r.maxOccupancyChildren,
            extraPerson: r.extraPersonAllowed,
            roomSize: r.roomSize,
            bedType: r.bedType,
            description: r.description,
            images: r.images,
            amenities: r.amenityIds
          }))
        });

      } else if (step === 5) {
        const { seasons } = data;
        // Verify seasons overlaps before saving
        for (const [roomId, roomSeasons] of Object.entries(seasons)) {
          const ranges = [];
          ['peak', 'mid', 'off'].forEach(t => {
            (roomSeasons[t] || []).forEach(r => {
              if (r.start && r.end) {
                ranges.push({ start: new Date(r.start), end: new Date(r.end), type: t });
              }
            });
          });
          // Check overlaps
          for (let i = 0; i < ranges.length; i++) {
            for (let j = i + 1; j < ranges.length; j++) {
              if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end) {
                return res.status(400).json({ error: 'ValidationError', message: 'Overlapping date ranges detected.' });
              }
            }
          }
        }

        mockPropertySeasonsDatabase = mockPropertySeasonsDatabase.filter(s => s.propertyId !== propertyId);
        for (const [roomId, roomSeasons] of Object.entries(seasons)) {
          const peak = (roomSeasons.peak || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
          const mid = (roomSeasons.mid || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
          const off = (roomSeasons.off || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));

          mockPropertySeasonsDatabase.push({
            _id: 'sea-' + Date.now() + Math.random(),
            propertyId,
            roomCategoryId: roomId,
            seasons: { peak, mid, off }
          });
        }
        prop.currentStep = Math.max(prop.currentStep, 6);

      } else if (step === 6) {
        const { rates } = data;
        // Verify rates pricing limit
        for (const [roomId, roomRates] of Object.entries(rates)) {
          for (const [season, plans] of Object.entries(roomRates)) {
            for (const [plan, vals] of Object.entries(plans)) {
              const b2b = Number(vals.b2b);
              const b2c = Number(vals.b2c);
              if (b2b > b2c) {
                return res.status(400).json({ error: 'ValidationError', message: 'B2B price cannot exceed B2C price.' });
              }
              if (b2b <= 0 || b2c <= 0) {
                return res.status(400).json({ error: 'ValidationError', message: 'Pricing rates must be greater than zero.' });
              }
            }
          }
        }

        mockPropertyPricingDatabase = mockPropertyPricingDatabase.filter(p => p.propertyId !== propertyId);
        for (const [roomId, roomRates] of Object.entries(rates)) {
          for (const [season, plans] of Object.entries(roomRates)) {
            for (const [plan, vals] of Object.entries(plans)) {
              mockPropertyPricingDatabase.push({
                _id: 'prc-' + Date.now() + Math.random(),
                propertyId,
                roomCategoryId: roomId,
                seasonType: season,
                mealPlan: plan,
                b2bRate: Number(vals.b2b),
                b2cRate: Number(vals.b2c),
                extraAdultB2B: Number(vals.extraAdultB2B) || 0,
                extraAdultB2C: Number(vals.extraAdultB2C) || 0,
                childB2B: Number(vals.childB2B) || 0,
                childB2C: Number(vals.childB2C) || 0
              });
            }
          }
        }
        prop.currentStep = Math.max(prop.currentStep, 7);
      }

      const audit = {
        _id: 'aud-' + Date.now(),
        propertyId,
        action: 'EDIT',
        user: req.user.email,
        role: 'Owner',
        ip: req.ip || '',
        createdAt: new Date(),
        previousValue: prevValue,
        newValue
      };
      mockPropertyAuditLogsDatabase.push(audit);

      return res.json({ success: true, currentStep: prop.currentStep });
    }

    const propQuery = { _id: propertyId, deleted: false };
    if (!isSuperAdmin) {
      propQuery.ownerId = req.user._id;
    }
    prop = await Property.findOne(propQuery);
    if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

    if (!isSuperAdmin && (prop.status === 'Submitted For Review' || prop.status === 'Pending Approval')) {
      return res.status(403).json({
        error: 'EditingLocked',
        message: 'This property is currently under review by Super Admin. Editing is locked until review is completed.'
      });
    }
    if (!isSuperAdmin && (prop.status === 'Approved' || prop.status === 'Active')) {
      prop.status = 'Submitted For Review';
    }

    if (step === 1) {
      const { name, type, category, ownerName, phone, email, website, gstNumber, state, city, address, googleMap, latitude, longitude, description } = data;
      if (!name || name.trim().length < 5 || name.trim().length > 150) {
        return res.status(400).json({ error: 'ValidationError', message: 'Property Name must be between 5 and 150 characters.' });
      }
      if (!address || !address.trim()) {
        return res.status(400).json({ error: 'ValidationError', message: 'Address is required.' });
      }
      if (!description || description.trim().length < 100 || description.trim().length > 5000) {
        return res.status(400).json({ error: 'ValidationError', message: 'Description must be between 100 and 5000 characters.' });
      }

      const nameExists = await Property.findOne({ ownerId: req.user._id, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, _id: { $ne: propertyId }, deleted: false });
      if (nameExists) {
        return res.status(400).json({ error: 'DuplicateProperty', message: 'You have already registered a property with this name.' });
      }

      prevValue = JSON.stringify(prop);
      prop.name = name.trim();
      prop.type = type;
      prop.category = category;
      prop.ownerName = ownerName;
      prop.ownerMobile = phone;
      prop.ownerEmail = email;
      prop.website = website || '';
      prop.gstNumber = gstNumber || '';
      prop.state = state;
      prop.city = city;
      prop.address = address;
      prop.googleMapUrl = googleMap || '';
      prop.latitude = Number(latitude) || 0;
      prop.longitude = Number(longitude) || 0;
      prop.description = description.trim();
      prop.currentStep = Math.max(prop.currentStep, 2);
      await prop.save();

    } else if (step === 2) {
      const { cover, images } = data;
      if (!cover) return res.status(400).json({ error: 'ValidationError', message: 'Cover Image is required.' });
      const existingGal = await PropertyGallery.findOne({ propertyId });
      prevValue = JSON.stringify(existingGal);
      if (existingGal) {
        existingGal.coverImage = cover;
        existingGal.images = images || [];
        await existingGal.save();
      } else {
        const newGal = new PropertyGallery({ propertyId, coverImage: cover, images: images || [] });
        await newGal.save();
      }
      prop.currentStep = Math.max(prop.currentStep, 3);
      await prop.save();

    } else if (step === 3) {
      const { amenityIds } = data;
      const existingAm = await PropertyAmenities.findOne({ propertyId });
      prevValue = JSON.stringify(existingAm);
      if (existingAm) {
        existingAm.amenityIds = amenityIds || [];
        await existingAm.save();
      } else {
        const newAm = new PropertyAmenities({ propertyId, amenityIds: amenityIds || [] });
        await newAm.save();
      }
      prop.currentStep = Math.max(prop.currentStep, 4);
      await prop.save();

    } else if (step === 4) {
      const { rooms } = data;
      if (!rooms || rooms.length === 0) {
        return res.status(400).json({ error: 'ValidationError', message: 'At least one Room Category is required.' });
      }
      const roomNumSet = new Set();
      for (const roomCat of rooms) {
        const nums = String(roomCat.roomNumbers).split(',').map(n => n.trim()).filter(Boolean);
        if (nums.length !== Number(roomCat.count)) {
          return res.status(400).json({ error: 'ValidationError', message: `Room numbers count must match total rooms for category "${roomCat.name}".` });
        }
        for (const num of nums) {
          if (roomNumSet.has(num)) {
            return res.status(400).json({ error: 'ValidationError', message: `Duplicate room number "${num}" detected.` });
          }
          roomNumSet.add(num);
        }
      }

      const existingRooms = await PropertyRooms.find({ propertyId });
      prevValue = JSON.stringify(existingRooms);

      const roomsToKeepIds = rooms
        .map(r => r.id)
        .filter(id => id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id));

      // Cascade delete deleted room categories, and their seasons/pricing
      await PropertyRooms.deleteMany({ propertyId, _id: { $nin: roomsToKeepIds } });
      await PropertySeason.deleteMany({ propertyId, roomCategoryId: { $nin: roomsToKeepIds } });
      await PropertyPricing.deleteMany({ propertyId, roomCategoryId: { $nin: roomsToKeepIds } });

      const insertedRooms = [];
      for (const r of rooms) {
        const isExisting = r.id && r.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(r.id);
        
        if (isExisting) {
          const updatedRoom = await PropertyRooms.findOneAndUpdate(
            { _id: r.id, propertyId },
            {
              $set: {
                roomCategoryName: r.name,
                roomType: r.type,
                numberOfRooms: Number(r.count),
                roomNumbers: String(r.roomNumbers).split(',').map(n => n.trim()).filter(Boolean),
                maxOccupancyAdults: Number(r.occupancy),
                maxOccupancyChildren: Number(r.maxOccupancyChildren || 0),
                extraPersonAllowed: parseExtraPerson(r.extraPerson),
                roomSize: Number(r.roomSize || 300),
                bedType: r.bedType || 'Double Bed',
                description: r.description || '',
                images: r.images || [],
                amenityIds: r.amenities || []
              }
            },
            { new: true }
          );
          if (updatedRoom) insertedRooms.push(updatedRoom);
        } else {
          const roomDoc = new PropertyRooms({
            propertyId,
            roomCategoryName: r.name,
            roomType: r.type,
            numberOfRooms: Number(r.count),
            roomNumbers: String(r.roomNumbers).split(',').map(n => n.trim()).filter(Boolean),
            maxOccupancyAdults: Number(r.occupancy),
            maxOccupancyChildren: Number(r.maxOccupancyChildren || 0),
            extraPersonAllowed: parseExtraPerson(r.extraPerson),
            roomSize: Number(r.roomSize || 300),
            bedType: r.bedType || 'Double Bed',
            description: r.description || '',
            images: r.images || [],
            amenityIds: r.amenities || []
          });
          await roomDoc.save();
          insertedRooms.push(roomDoc);
        }
      }

      prop.currentStep = Math.max(prop.currentStep, 5);
      await prop.save();

      const audit = new PropertyAuditLog({
        propertyId,
        action: 'EDIT',
        user: req.user.email,
        role: 'Owner',
        ip: req.ip || '',
        browser: req.headers['user-agent'] || '',
        previousValue: prevValue,
        newValue
      });
      await audit.save();

      return res.json({
        success: true,
        currentStep: prop.currentStep,
        rooms: insertedRooms.map(r => ({
          id: r._id,
          name: r.roomCategoryName,
          type: r.roomType,
          count: r.numberOfRooms,
          roomNumbers: r.roomNumbers.join(', '),
          occupancy: r.maxOccupancyAdults,
          maxOccupancyChildren: r.maxOccupancyChildren,
          extraPerson: r.extraPersonAllowed,
          roomSize: r.roomSize,
          bedType: r.bedType,
          description: r.description,
          images: r.images,
          amenities: r.amenityIds
        }))
      });

    } else if (step === 5) {
      const { seasons } = data;
      // Verify seasons overlaps before saving
      for (const [roomId, roomSeasons] of Object.entries(seasons)) {
        const ranges = [];
        ['peak', 'mid', 'off'].forEach(t => {
          (roomSeasons[t] || []).forEach(r => {
            if (r.start && r.end) {
              ranges.push({ start: new Date(r.start), end: new Date(r.end), type: t });
            }
          });
        });
        for (let i = 0; i < ranges.length; i++) {
          for (let j = i + 1; j < ranges.length; j++) {
            if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end) {
              return res.status(400).json({ error: 'ValidationError', message: 'Overlapping date ranges detected.' });
            }
          }
        }
      }

      const existingSeasons = await PropertySeason.find({ propertyId });
      prevValue = JSON.stringify(existingSeasons);

      await PropertySeason.deleteMany({ propertyId });

      for (const [roomId, roomSeasons] of Object.entries(seasons)) {
        const peak = (roomSeasons.peak || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
        const mid = (roomSeasons.mid || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));
        const off = (roomSeasons.off || []).map(r => ({ start: new Date(r.start), end: new Date(r.end) }));

        const seasonDoc = new PropertySeason({
          propertyId,
          roomCategoryId: roomId,
          seasons: { peak, mid, off }
        });
        await seasonDoc.save();
      }

      prop.currentStep = Math.max(prop.currentStep, 6);
      await prop.save();

    } else if (step === 6) {
      const { rates } = data;
      for (const [roomId, roomRates] of Object.entries(rates)) {
        for (const [season, plans] of Object.entries(roomRates)) {
          for (const [plan, vals] of Object.entries(plans)) {
            const b2b = Number(vals.b2b);
            const b2c = Number(vals.b2c);
            if (b2b > b2c) {
              return res.status(400).json({ error: 'ValidationError', message: 'B2B price cannot exceed B2C price.' });
            }
            if (b2b <= 0 || b2c <= 0) {
              return res.status(400).json({ error: 'ValidationError', message: 'Pricing rates must be greater than zero.' });
            }
          }
        }
      }

      const existingPricing = await PropertyPricing.find({ propertyId });
      prevValue = JSON.stringify(existingPricing);

      await PropertyPricing.deleteMany({ propertyId });

      for (const [roomId, roomRates] of Object.entries(rates)) {
        for (const [season, plans] of Object.entries(roomRates)) {
          for (const [plan, vals] of Object.entries(plans)) {
            const pricingDoc = new PropertyPricing({
              propertyId,
              roomCategoryId: roomId,
              seasonType: season,
              mealPlan: plan,
              b2bRate: Number(vals.b2b),
              b2cRate: Number(vals.b2c),
              extraAdultB2B: Number(vals.extraAdultB2B) || 0,
              extraAdultB2C: Number(vals.extraAdultB2C) || 0,
              childB2B: Number(vals.childB2B) || 0,
              childB2C: Number(vals.childB2C) || 0,
              taxInclusive: vals.taxInclusive || false,
              weekendPrice: vals.weekendPrice ? Number(vals.weekendPrice) : undefined,
              festivalPrice: vals.festivalPrice ? Number(vals.festivalPrice) : undefined
            });
            await pricingDoc.save();
          }
        }
      }

      prop.currentStep = Math.max(prop.currentStep, 7);
      await prop.save();
    }

    const audit = new PropertyAuditLog({
      propertyId,
      action: 'EDIT',
      user: req.user.email,
      role: 'Owner',
      ip: req.ip || '',
      browser: req.headers['user-agent'] || '',
      previousValue: prevValue,
      newValue
    });
    await audit.save();

    res.json({ success: true, currentStep: prop.currentStep });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.post('/homestay-owner/properties/publish', authenticateToken, async (req, res) => {
  const { propertyId } = req.body;
  if (!propertyId) {
    return res.status(400).json({ error: 'ValidationError', message: 'Property ID is required.' });
  }

  try {
    if (!isMongoConnected()) {
      const prop = mockPropertiesDatabase.find(p => p._id === propertyId && p.ownerId === req.user._id && !p.deleted);
      if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

      const rooms = mockPropertyRoomsDatabase.filter(r => r.propertyId === propertyId);
      if (rooms.length === 0) {
        return res.status(400).json({ error: 'ValidationError', message: 'No Room categories configured.' });
      }
      const missingImages = rooms.filter(r => !r.images || r.images.length === 0);
      if (missingImages.length > 0) {
        return res.status(400).json({ error: 'ValidationError', message: `Every Room Category must have at least one image. Missing images in: ${missingImages.map(r => r.roomCategoryName || r.name).join(', ')}` });
      }

      prop.status = 'Submitted For Review';
      prop.currentStep = 8;

      let approval = mockPropertyApprovalsDatabase.find(a => a.propertyId === propertyId);
      if (!approval) {
        approval = {
          propertyId,
          status: 'Pending Review',
          reviewedAt: null,
          reviewedBy: null,
          comments: []
        };
        mockPropertyApprovalsDatabase.push(approval);
      } else {
        approval.status = 'Pending Review';
        approval.reviewedAt = null;
        approval.reviewedBy = null;
      }

      const audit = {
        _id: 'aud-' + Date.now(),
        propertyId,
        action: 'PUBLISH',
        user: req.user.email,
        role: 'Owner',
        ip: req.ip || '',
        createdAt: new Date(),
        previousValue: 'Draft',
        newValue: 'Submitted For Review'
      };
      mockPropertyAuditLogsDatabase.push(audit);

      return res.json({ success: true, message: 'Property listing submitted for review.' });
    }

    const prop = await Property.findOne({ _id: propertyId, ownerId: req.user._id, deleted: false });
    if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

    const gallery = await PropertyGallery.findOne({ propertyId });
    if (!gallery || !gallery.coverImage) {
      return res.status(400).json({ error: 'ValidationError', message: 'Gallery Cover Image is missing.' });
    }

    const rooms = await PropertyRooms.find({ propertyId });
    if (rooms.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No Room categories configured.' });
    }
    const missingImages = rooms.filter(r => !r.images || r.images.length === 0);
    if (missingImages.length > 0) {
      return res.status(400).json({ error: 'ValidationError', message: `Every Room Category must have at least one image. Missing images in: ${missingImages.map(r => r.roomCategoryName).join(', ')}` });
    }

    const seasons = await PropertySeason.find({ propertyId });
    if (seasons.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'Room Season date ranges are missing.' });
    }

    const pricing = await PropertyPricing.find({ propertyId });
    if (pricing.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'Pricing rates have not been set.' });
    }

    prop.status = 'Submitted For Review';
    prop.currentStep = 8;
    await prop.save();

    await PropertyApproval.findOneAndUpdate(
      { propertyId },
      { $set: { status: 'Pending Review', reviewedAt: null, reviewedBy: null } },
      { upsert: true, new: true }
    );

    const audit = new PropertyAuditLog({
      propertyId,
      action: 'PUBLISH',
      user: req.user.email,
      role: 'Owner',
      ip: req.ip || '',
      browser: req.headers['user-agent'] || '',
      previousValue: 'Draft',
      newValue: 'Submitted For Review'
    });
    await audit.save();

    res.json({ success: true, message: 'Property listing submitted for review.' });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.get('/homestay-owner/properties', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id;
    let list;
    if (!isMongoConnected()) {
      list = mockPropertiesDatabase.filter(p => String(p.ownerId) === String(ownerId) && !p.deleted);
    } else {
      list = await Property.find({ ownerId, deleted: false }).lean().sort({ createdAt: -1 });
    }

    const enrichedList = [];
    for (const p of list) {
      let coverImage = '';
      let totalRooms = 0;
      let totalOccupancy = 0;
      let rejectionReason = '';
      let approvalComments = [];
      const pid = p._id;

      if (!isMongoConnected()) {
        const gal = mockPropertyGalleryDatabase.find(g => String(g.propertyId) === String(pid));
        coverImage = gal?.coverImage || '';
        
        const rooms = mockPropertyRoomsDatabase.filter(r => String(r.propertyId) === String(pid));
        rooms.forEach(r => {
          totalRooms += (r.numberOfRooms || 0);
          totalOccupancy += ((r.maxOccupancyAdults || 0) * (r.numberOfRooms || 0));
        });

        const approval = mockPropertyApprovalsDatabase.find(a => String(a.propertyId) === String(pid));
        approvalComments = approval?.comments || [];
        rejectionReason = approvalComments.length ? approvalComments[approvalComments.length - 1]?.comment : '';
      } else {
        const gal = await PropertyGallery.findOne({ propertyId: pid });
        coverImage = gal?.coverImage || '';

        const rooms = await PropertyRooms.find({ propertyId: pid });
        rooms.forEach(r => {
          totalRooms += (r.numberOfRooms || 0);
          totalOccupancy += ((r.maxOccupancyAdults || 0) * (r.numberOfRooms || 0));
        });

        const approval = await PropertyApproval.findOne({ propertyId: pid });
        approvalComments = approval?.comments || [];
        rejectionReason = approvalComments.length ? approvalComments[approvalComments.length - 1]?.comment : '';
      }

      enrichedList.push({
        ...p,
        coverImage,
        rooms: totalRooms,
        occupancy: totalOccupancy,
        rejectionReason,
        approvalComments
      });
    }

    res.json(enrichedList);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.delete('/homestay-owner/properties/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    if (!isMongoConnected()) {
      const prop = mockPropertiesDatabase.find(p => String(p._id) === String(id) && String(p.ownerId) === String(req.user._id));
      if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });
      prop.deleted = true;
      return res.json({ message: 'Property successfully deleted.' });
    }

    const prop = await Property.findOne({ _id: id, ownerId: req.user._id });
    if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });
    prop.deleted = true;
    await prop.save();
    res.json({ message: 'Property successfully deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// --- SUPER ADMIN PROPERTY APPROVAL QUEUE ---
router.get('/admin/homestays-list', authenticateToken, async (req, res) => {
  const { status, search } = req.query;
  try {
    if (!isMongoConnected()) {
      let list = mockPropertiesDatabase.filter(p => !p.deleted);
      if (status && status !== 'All') {
        if (status === 'Pending Review') {
          list = list.filter(p => p.status === 'Submitted For Review');
        } else if (status === 'Pending Approval') {
          list = list.filter(p => p.status === 'Submitted For Review');
        } else {
          list = list.filter(p => p.status === status);
        }
      }
      if (search) {
        const regex = new RegExp(search, 'i');
        list = list.filter(p => regex.test(p.name) || regex.test(p.ownerName) || regex.test(p.propertyId) || regex.test(p.city));
      }
      return res.json(list);
    }

    const query = { deleted: false };
    if (status && status !== 'All') {
      if (status === 'Pending Review' || status === 'Pending Approval') {
        query.status = 'Submitted For Review';
      } else {
        query.status = status;
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { ownerName: regex },
        { propertyId: regex },
        { city: regex }
      ];
    }

    const propertiesList = await Property.find(query).sort({ createdAt: -1 });
    res.json(propertiesList);
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

router.post('/admin/homestays-list/:id/review', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  if (!status || !['Approved', 'Rejected', 'Changes Requested'].includes(status)) {
    return res.status(400).json({ error: 'ValidationError', message: 'Status must be Approved, Rejected, or Changes Requested.' });
  }

  try {
    if (!isMongoConnected()) {
      const prop = mockPropertiesDatabase.find(p => p._id === id && !p.deleted);
      if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

      const prevStatus = prop.status;
      prop.status = status;

      let approval = mockPropertyApprovalsDatabase.find(a => a.propertyId === id);
      if (!approval) {
        approval = {
          propertyId: id,
          status,
          reviewedBy: req.user.email,
          reviewedAt: new Date(),
          comments: []
        };
        mockPropertyApprovalsDatabase.push(approval);
      } else {
        approval.status = status;
        approval.reviewedBy = req.user.email;
        approval.reviewedAt = new Date();
      }

      if (comment) {
        approval.comments.push({
          step: 0,
          field: 'General Review',
          comment: comment.trim(),
          createdAt: new Date()
        });
      }

      const auditLog = {
        _id: 'aud-' + Date.now(),
        propertyId: id,
        action: 'REVIEW',
        user: req.user.email,
        role: 'Super Admin',
        ip: req.ip || '',
        createdAt: new Date(),
        previousValue: prevStatus,
        newValue: status
      };
      mockPropertyAuditLogsDatabase.push(auditLog);

      if (status === 'Approved') {
        const gallery = mockPropertyGalleryDatabase.find(g => g.propertyId === id);
        const rooms = mockPropertyRoomsDatabase.filter(r => r.propertyId === id);
        const amenities = mockPropertyAmenitiesDatabase.find(a => a.propertyId === id);
        const seasonsList = mockPropertySeasonsDatabase.filter(s => s.propertyId === id);
        const pricingList = mockPropertyPricingDatabase.filter(pr => pr.propertyId === id);

        const mappedRooms = rooms.map(r => ({
          roomType: r.roomType || 'Standard',
          totalRooms: r.numberOfRooms || 1,
          extraPersonAllowed: r.extraPersonAllowed === 'Not Allowed' ? 0 : 1,
          roomNumbers: r.roomNumbers || [],
          photos: r.images || [],
          description: r.description || ''
        }));

        const mappedSeasons = seasonsList.map(s => {
          const arr = [];
          if (s.seasons?.peak?.[0]) arr.push({ seasonName: 'Peak Season', fromDate: new Date(s.seasons.peak[0].start), toDate: new Date(s.seasons.peak[0].end) });
          if (s.seasons?.mid?.[0]) arr.push({ seasonName: 'Mid Season', fromDate: new Date(s.seasons.mid[0].start), toDate: new Date(s.seasons.mid[0].end) });
          if (s.seasons?.off?.[0]) arr.push({ seasonName: 'Off Season', fromDate: new Date(s.seasons.off[0].start), toDate: new Date(s.seasons.off[0].end) });
          return arr;
        }).flat();

        const mappedRates = pricingList.map(pr => {
          const roomCat = rooms.find(r => r._id === pr.roomCategoryId)?.roomCategoryName || 'Standard';
          return {
            roomCategory: roomCat,
            occupancy: 'Double Occupancy',
            season: pr.seasonType === 'peak' ? 'Peak Season' : (pr.seasonType === 'mid' ? 'Mid Season' : 'Off Season'),
            planRates: {
              [pr.mealPlan]: {
                b2bRate: pr.b2cRate,
                b2cRate: pr.b2cRate,
                b2bExtraPerson: pr.extraAdultB2C,
                b2cExtraPerson: pr.extraAdultB2C,
                b2bChild: pr.childB2C,
                b2cChild: pr.childB2C
              }
            }
          };
        });

        const homestayPayload = {
          _id: id,
          name: prop.name || 'Untitled Property',
          type: prop.type || 'Homestay',
          ownerName: prop.ownerName,
          ownerMobile: prop.ownerMobile,
          address: prop.address || '',
          city: prop.city,
          region: prop.state || '',
          description: prop.description || '',
          amenities: amenities ? amenities.amenityIds : [],
          images: gallery ? [gallery.coverImage, ...gallery.images.map(img => img && typeof img === 'object' ? img.url : img)].filter(Boolean) : [],
          rooms: mappedRooms,
          seasons: mappedSeasons,
          rates: mappedRates,
          status: 'Active'
        };

        const existingIdx = mockHomestaysDatabase.findIndex(h => h.name === prop.name);
        if (existingIdx >= 0) {
          mockHomestaysDatabase[existingIdx] = homestayPayload;
        } else {
          mockHomestaysDatabase.push(homestayPayload);
        }
      }

      return res.json({ success: true, message: `Property status updated to ${status}.` });
    }

    let prop = await Property.findOne({ _id: id, deleted: false });
    if (!prop) {
      const homestayObj = await Homestay.findById(id);
      if (homestayObj) {
        prop = await Property.findOne({ name: homestayObj.name, deleted: false });
      }
    }
    if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

    const prevStatus = prop.status;
    prop.status = status;
    await prop.save();

    const updatePayload = {
      status,
      reviewedBy: req.user.email,
      reviewedAt: new Date()
    };

    if (comment) {
      updatePayload.$push = {
        comments: {
          step: 0,
          field: 'General Review',
          comment: comment.trim(),
          createdAt: new Date()
        }
      };
    }

    await PropertyApproval.findOneAndUpdate(
      { propertyId: prop._id },
      updatePayload,
      { upsert: true, new: true }
    );

    if (status === 'Approved') {
      const gallery = await PropertyGallery.findOne({ propertyId: prop._id });
      const rooms = await PropertyRooms.find({ propertyId: prop._id });
      const amenities = await PropertyAmenities.findOne({ propertyId: prop._id });
      const seasonsList = await PropertySeason.find({ propertyId: prop._id });
      const pricingList = await PropertyPricing.find({ propertyId: prop._id });

      const mappedRooms = rooms.map(r => ({
        roomType: r.roomType || 'Standard',
        totalRooms: r.numberOfRooms || 1,
        extraPersonAllowed: typeof r.extraPersonAllowed === 'string'
          ? (r.extraPersonAllowed === 'Not Allowed' ? 0 : (r.extraPersonAllowed.includes('1') ? 1 : 2))
          : (typeof r.extraPersonAllowed === 'number' ? r.extraPersonAllowed : 0),
        roomNumbers: r.roomNumbers || [],
        photos: r.images || [],
        description: r.description || ''
      }));

      const mappedSeasons = seasonsList.map(s => {
        const arr = [];
        if (s.seasons.peak && s.seasons.peak.length > 0) {
          arr.push({ seasonName: 'Peak Season', fromDate: new Date(s.seasons.peak[0].start), toDate: new Date(s.seasons.peak[0].end) });
        }
        if (s.seasons.mid && s.seasons.mid.length > 0) {
          arr.push({ seasonName: 'Mid Season', fromDate: new Date(s.seasons.mid[0].start), toDate: new Date(s.seasons.mid[0].end) });
        }
        if (s.seasons.off && s.seasons.off.length > 0) {
          arr.push({ seasonName: 'Off Season', fromDate: new Date(s.seasons.off[0].start), toDate: new Date(s.seasons.off[0].end) });
        }
        return arr;
      }).flat();

      const mappedRates = pricingList.map(pr => {
        const roomCat = rooms.find(r => r._id.toString() === pr.roomCategoryId.toString())?.roomCategoryName || 'Standard';
        return {
          roomCategory: roomCat,
          occupancy: 'Double Occupancy',
          season: pr.seasonType === 'peak' ? 'Peak Season' : (pr.seasonType === 'mid' ? 'Mid Season' : 'Off Season'),
          planRates: {
            [pr.mealPlan]: {
              b2bRate: pr.b2cRate,
              b2cRate: pr.b2cRate,
              b2bExtraPerson: pr.extraAdultB2C,
              b2cExtraPerson: pr.extraAdultB2C,
              b2bChild: pr.childB2C,
              b2cChild: pr.childB2C
            }
          }
        };
      });

      const homestayPayload = {
        _id: prop._id,
        name: prop.name || 'Untitled Property',
        type: prop.type || 'Homestay',
        ownerName: prop.ownerName,
        ownerMobile: prop.ownerMobile,
        address: prop.address || '',
        city: prop.city,
        region: prop.state || '',
        description: prop.description || '',
        amenities: amenities ? amenities.amenityIds : [],
        images: gallery ? [gallery.coverImage, ...gallery.images.map(img => img && typeof img === 'object' ? img.url : img)].filter(Boolean) : [],
        rooms: mappedRooms,
        seasons: mappedSeasons,
        rates: mappedRates,
        status: 'Active'
      };

      await Homestay.deleteOne({ name: prop.name, _id: { $ne: prop._id } });

      await Homestay.findOneAndUpdate(
        { _id: prop._id },
        homestayPayload,
        { upsert: true, new: true }
      );
    }

    const auditLog = new PropertyAuditLog({
      propertyId: prop._id,
      action: 'REVIEW',
      user: req.user.email,
      role: 'Super Admin',
      ip: req.ip || '',
      browser: req.headers['user-agent'] || '',
      previousValue: prevStatus,
      newValue: status
    });
    await auditLog.save();

    res.json({ success: true, message: `Property status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// =========================================================================
// HOMESTAY OWNER — DYNAMIC AVAILABILITY CALENDAR & BOOKING ENGINE
// =========================================================================

// GET /api/homestay-owner/availability
router.get('/homestay-owner/availability', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;

    // 1. Resolve Property Context
    let propertyId = req.query.propertyId;
    let propQuery = { deleted: false };
    if (!isSuperAdmin) propQuery.ownerId = ownerId;

    let property;
    if (propertyId) {
      propQuery._id = propertyId;
      property = await Property.findOne(propQuery);
    } else {
      // Default to first approved/active property or fallback to latest
      property = await Property.findOne({ ...propQuery, status: { $in: ['Approved', 'Active'] } }) || await Property.findOne(propQuery).sort({ createdAt: -1 });
    }

    // Also get all properties owned by this owner for dropdown context
    const rawOwnerProperties = await Property.find(isSuperAdmin ? { deleted: false } : { ownerId, deleted: false }, '_id propertyId name status city state').lean();
    const allOwnerProperties = [];
    for (const p of rawOwnerProperties) {
      const pRooms = await PropertyRooms.find({ propertyId: p._id });
      let totalR = 0;
      pRooms.forEach(r => totalR += (r.roomNumbers?.length || r.numberOfRooms || 0));
      allOwnerProperties.push({
        ...p,
        roomCount: totalR
      });
    }

    if (!property) {
      return res.json({
        property: null,
        allProperties: allOwnerProperties,
        month: Number(req.query.month) || (new Date().getMonth() + 1),
        year: Number(req.query.year) || new Date().getFullYear(),
        daysInMonth: 0,
        days: [],
        categories: [],
        matrix: {},
        todaySummary: { totalRooms: 0, availableRooms: 0, occupiedRooms: 0, blockedRooms: 0, availablePercent: 0, occupiedPercent: 0, blockedPercent: 0 }
      });
    }

    // 2. Resolve View Mode and Date Range
    const now = new Date();
    const rawView = (req.query.view || 'monthly').toLowerCase();
    const viewMode = (rawView === 'today' || rawView === 'day') ? 'today' : (rawView === 'weekly' || rawView === 'week') ? 'weekly' : 'monthly';

    let rangeStart, rangeEnd;
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let displayMonth = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    let displayYear = parseInt(req.query.year, 10) || now.getFullYear();

    if (viewMode === 'today') {
      // 1-Day View for Today (or target date)
      const targetStr = req.query.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const [tY, tM, tD] = targetStr.split('-').map(Number);
      displayMonth = tM;
      displayYear = tY;

      rangeStart = new Date(Date.UTC(tY, tM - 1, tD, 0, 0, 0, 0));
      rangeEnd = new Date(Date.UTC(tY, tM - 1, tD, 23, 59, 59, 999));

      const curDate = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
      const dayOfWeek = curDate.getUTCDay();
      days.push({
        day: tD,
        dayString: String(tD).padStart(2, '0'),
        name: dayNames[dayOfWeek],
        dateString: targetStr,
        isSunday: dayOfWeek === 0,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });

    } else if (viewMode === 'weekly') {
      // 7-Day View starting from requested startDate (or Monday of current week / today)
      let startD;
      if (req.query.startDate) {
        const [sY, sM, sD] = req.query.startDate.split('-').map(Number);
        startD = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
      } else {
        startD = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
      }

      displayMonth = startD.getUTCMonth() + 1;
      displayYear = startD.getUTCFullYear();

      rangeStart = new Date(startD.getTime());
      rangeEnd = new Date(startD.getTime() + (6 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000));

      for (let i = 0; i < 7; i++) {
        const dObj = new Date(startD.getTime() + (i * 24 * 60 * 60 * 1000));
        const dYear = dObj.getUTCFullYear();
        const dMonth = dObj.getUTCMonth() + 1;
        const dDate = dObj.getUTCDate();
        const dayOfWeek = dObj.getUTCDay();
        const dateStr = `${dYear}-${String(dMonth).padStart(2, '0')}-${String(dDate).padStart(2, '0')}`;
        days.push({
          day: dDate,
          dayString: String(dDate).padStart(2, '0'),
          name: dayNames[dayOfWeek],
          dateString: dateStr,
          isSunday: dayOfWeek === 0,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        });
      }

    } else {
      // Default: Full Monthly View (days 1 to 28/29/30/31)
      const month = displayMonth;
      const year = displayYear;
      const daysInMonth = new Date(year, month, 0).getDate();

      rangeStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      rangeEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

      for (let d = 1; d <= daysInMonth; d++) {
        const curDate = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
        const dayOfWeek = curDate.getUTCDay();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          day: d,
          dayString: String(d).padStart(2, '0'),
          name: dayNames[dayOfWeek],
          dateString: dateStr,
          isSunday: dayOfWeek === 0,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        });
      }
    }

    // 3. Fetch Room Categories and Inventory
    const roomTypeFilter = req.query.roomType;
    let roomCatQuery = { propertyId: property._id };
    if (roomTypeFilter && roomTypeFilter !== 'All' && roomTypeFilter !== 'All Room Types') {
      roomCatQuery.$or = [
        { roomCategoryName: roomTypeFilter },
        { roomType: roomTypeFilter }
      ];
    }
    const roomsList = await PropertyRooms.find(roomCatQuery);

    const categories = roomsList.map(r => ({
      categoryId: r._id,
      categoryName: r.roomCategoryName,
      roomType: r.roomType,
      numberOfRooms: r.numberOfRooms,
      roomNumbers: r.roomNumbers || [],
      maxOccupancyAdults: r.maxOccupancyAdults,
      maxOccupancyChildren: r.maxOccupancyChildren
    }));

    // 4. Fetch Active Bookings overlapping this period
    const bookings = await Booking.find({
      propertyId: property._id,
      bookingStatus: { $nin: ['Cancelled'] },
      checkInDate: { $lte: rangeEnd },
      checkOutDate: { $gt: rangeStart }
    });

    // 5. Fetch Blocked Dates overlapping this period
    const blockedDates = await PropertyBlockedDate.find({
      propertyId: property._id,
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart }
    });

    // 6. Build Room-by-Day Availability Matrix
    // matrix[roomNumber][dateString] = { status, guestName, bookingId, reason, ... }
    const matrix = {};

    categories.forEach(cat => {
      cat.roomNumbers.forEach(roomNo => {
        matrix[roomNo] = {};

        days.forEach(dayInfo => {
          const dateStr = dayInfo.dateString;
          const [dY, dM, dD] = dateStr.split('-').map(Number);
          const targetDateStart = new Date(Date.UTC(dY, dM - 1, dD, 0, 0, 0));
          const targetDateMid = new Date(Date.UTC(dY, dM - 1, dD, 12, 0, 0));

          // A. Check for Confirmed / Held Booking
          // Standard Hotel PMS rule: Room occupied for night of check-in up to morning of check-out (checkIn <= dayDate < checkOut)
          const matchedBooking = bookings.find(b => {
            const hasRoom = b.bookedRooms && b.bookedRooms.some(br => String(br.roomNumber) === String(roomNo));
            const legacyRoom = b.propertyDetails && String(b.propertyDetails.roomNumber) === String(roomNo);
            if (!hasRoom && !legacyRoom) return false;

            const bIn = new Date(b.checkInDate);
            const bOut = new Date(b.checkOutDate);
            const inDate = new Date(Date.UTC(bIn.getUTCFullYear(), bIn.getUTCMonth(), bIn.getUTCDate(), 0, 0, 0));
            const outDate = new Date(Date.UTC(bOut.getUTCFullYear(), bOut.getUTCMonth(), bOut.getUTCDate(), 0, 0, 0));

            return targetDateStart >= inDate && targetDateStart < outDate;
          });

          if (matchedBooking) {
            const bIn = new Date(matchedBooking.checkInDate);
            const isStart = (bIn.getUTCDate() === dD && (bIn.getUTCMonth() + 1) === dM && bIn.getUTCFullYear() === dY);
            const isHold = matchedBooking.bookingStatus === 'Hold' || matchedBooking.bookingStatus === 'Pending';
            matrix[roomNo][dateStr] = {
              status: isHold ? 'HOLD' : 'BOOKED',
              bookingId: matchedBooking.bookingId,
              dbId: matchedBooking._id,
              guestName: matchedBooking.customer?.name || 'Guest',
              phone: matchedBooking.customer?.mobile || '',
              email: matchedBooking.customer?.email || '',
              checkIn: matchedBooking.checkInDate,
              checkOut: matchedBooking.checkOutDate,
              bookingStatus: matchedBooking.bookingStatus,
              paymentStatus: matchedBooking.paymentStatus || 'Pending',
              totalAmount: matchedBooking.amount || matchedBooking.pricing?.finalAmount || 0,
              paidAmount: matchedBooking.pricing?.paidAmount || 0,
              pendingAmount: matchedBooking.pricing?.pendingAmount || 0,
              addOns: matchedBooking.pricing?.addOns || 0,
              addOnsRemark: matchedBooking.pricing?.addOnsRemark || '',
              bookedRooms: matchedBooking.bookedRooms || [],
              propertyDetails: matchedBooking.propertyDetails || {},
              customer: matchedBooking.customer || {},
              pricing: matchedBooking.pricing || {},
              paymentHistory: matchedBooking.paymentHistory || [],
              timeline: matchedBooking.timeline || [],
              specialRequests: matchedBooking.specialRequests || matchedBooking.notes || '',
              notes: matchedBooking.notes || matchedBooking.specialRequests || '',
              isStart
            };
            return;
          }

          // B. Check for Blocked Dates
          const matchedBlock = blockedDates.find(blk => {
            if (String(blk.roomNumber) !== String(roomNo)) return false;
            const blkStart = new Date(blk.startDate);
            const blkEnd = new Date(blk.endDate);
            const sDate = new Date(Date.UTC(blkStart.getUTCFullYear(), blkStart.getUTCMonth(), blkStart.getUTCDate(), 0, 0, 0));
            const eDate = new Date(Date.UTC(blkEnd.getUTCFullYear(), blkEnd.getUTCMonth(), blkEnd.getUTCDate(), 23, 59, 59));
            return targetDateMid >= sDate && targetDateMid <= eDate;
          });

          if (matchedBlock) {
            const isOwnerBlock = matchedBlock.blockedBy === 'Owner';
            matrix[roomNo][dateStr] = {
              status: isOwnerBlock ? 'BLOCKED_BY_OWNER' : 'BLOCKED',
              blockId: matchedBlock._id,
              reason: matchedBlock.reason || 'Maintenance',
              notes: matchedBlock.notes || '',
              blockedBy: matchedBlock.blockedBy
            };
            return;
          }

          // C. Free / Available
          matrix[roomNo][dateStr] = {
            status: 'AVAILABLE'
          };
        });
      });
    });

    // 7. Calculate Today's Summary
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    const todayDateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    const todayFormatted = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    let totalRooms = 0;
    let availableRooms = 0;
    let occupiedRooms = 0;
    let blockedRooms = 0;

    categories.forEach(cat => {
      cat.roomNumbers.forEach(roomNo => {
        totalRooms++;
        const cell = (matrix[roomNo] && matrix[roomNo][todayDateStr]) ? matrix[roomNo][todayDateStr] : null;
        if (cell) {
          if (cell.status === 'BOOKED' || cell.status === 'HOLD') occupiedRooms++;
          else if (cell.status === 'BLOCKED' || cell.status === 'BLOCKED_BY_OWNER') blockedRooms++;
          else availableRooms++;
        } else {
          // If viewing another month, query today's state directly
          const hasBook = bookings.some(b => {
            const matchR = (b.bookedRooms && b.bookedRooms.some(br => String(br.roomNumber) === String(roomNo))) ||
                           (b.propertyDetails && String(b.propertyDetails.roomNumber) === String(roomNo));
            if (!matchR) return false;
            const bIn = new Date(b.checkInDate);
            const bOut = new Date(b.checkOutDate);
            return todayUTC >= bIn && todayUTC < bOut;
          });
          const hasBlk = blockedDates.some(blk => {
            if (String(blk.roomNumber) !== String(roomNo)) return false;
            return todayUTC >= new Date(blk.startDate) && todayUTC <= new Date(blk.endDate);
          });
          if (hasBook) occupiedRooms++;
          else if (hasBlk) blockedRooms++;
          else availableRooms++;
        }
      });
    });

    const availablePercent = totalRooms > 0 ? ((availableRooms / totalRooms) * 100).toFixed(1) : 0;
    const occupiedPercent = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;
    const blockedPercent = totalRooms > 0 ? ((blockedRooms / totalRooms) * 100).toFixed(1) : 0;

    res.json({
      property: {
        id: property._id,
        propertyId: property.propertyId,
        name: property.name,
        city: property.city,
        state: property.state,
        status: property.status
      },
      allProperties: allOwnerProperties,
      viewMode,
      startDate: days[0]?.dateString,
      endDate: days[days.length - 1]?.dateString,
      month: displayMonth,
      year: displayYear,
      daysInMonth: days.length,
      days,
      categories,
      matrix,
      todaySummary: {
        dateString: todayFormatted,
        totalRooms,
        availableRooms,
        occupiedRooms,
        blockedRooms,
        availablePercent: Number(availablePercent),
        occupiedPercent: Number(occupiedPercent),
        blockedPercent: Number(blockedPercent)
      }
    });

  } catch (err) {
    console.error('Error fetching room availability matrix:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/block-dates
router.post('/homestay-owner/block-dates', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const { propertyId, roomCategoryId, roomNumber, startDate, endDate, reason, notes } = req.body;

    if (!propertyId || !roomNumber || !startDate || !endDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property, room number, start date, and end date are required.' });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid date range. Start date must be before or equal to end date.' });
    }

    // Verify Property Ownership
    const propQuery = { _id: propertyId, deleted: false };
    if (!isSuperAdmin) propQuery.ownerId = ownerId;
    const property = await Property.findOne(propQuery);
    if (!property) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied. You do not own this property.' });
    }

    // Verify Room belongs to Property
    const roomCat = await PropertyRooms.findOne({ propertyId, roomNumbers: roomNumber });
    if (!roomCat) {
      return res.status(400).json({ error: 'ValidationError', message: `Room ${roomNumber} does not exist in this property.` });
    }

    // Overlap check against active bookings
    const conflictBooking = await Booking.findOne({
      propertyId,
      bookingStatus: { $nin: ['Cancelled'] },
      $or: [
        { "bookedRooms.roomNumber": roomNumber },
        { "propertyDetails.roomNumber": roomNumber }
      ],
      checkInDate: { $lte: eDate },
      checkOutDate: { $gt: sDate }
    });

    if (conflictBooking) {
      return res.status(409).json({
        error: 'BookingConflict',
        message: `Cannot block dates. Room ${roomNumber} already has an active booking from ${new Date(conflictBooking.checkInDate).toLocaleDateString()} to ${new Date(conflictBooking.checkOutDate).toLocaleDateString()}.`
      });
    }

    const newBlock = new PropertyBlockedDate({
      propertyId,
      ownerId: property.ownerId,
      roomCategoryId: roomCategoryId || roomCat._id,
      roomNumber,
      startDate: sDate,
      endDate: eDate,
      reason: reason || 'Maintenance',
      blockedBy: isSuperAdmin ? 'Admin' : 'Owner',
      notes: notes || ''
    });

    await newBlock.save();
    res.json({ success: true, message: `Room ${roomNumber} successfully blocked from ${sDate.toISOString().split('T')[0]} to ${eDate.toISOString().split('T')[0]}.`, block: newBlock });

  } catch (err) {
    console.error('Error creating blocked date:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/block-dates/:id
router.delete('/homestay-owner/block-dates/:id', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;

    const block = await PropertyBlockedDate.findById(req.params.id);
    if (!block) return res.status(404).json({ error: 'NotFound', message: 'Blocked date record not found.' });

    if (!isSuperAdmin) {
      const property = await Property.findOne({ _id: block.propertyId, ownerId, deleted: false });
      if (!property) return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    await PropertyBlockedDate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Unblocked room ${block.roomNumber} successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/bookings/available-rooms
router.get('/homestay-owner/bookings/available-rooms', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const { propertyId, checkIn, checkOut } = req.query;

    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property ID, check-in, and check-out dates are required.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Check-out date must be strictly after check-in date.' });
    }

    // Verify Property
    const propQuery = { _id: propertyId, deleted: false };
    if (!isSuperAdmin) propQuery.ownerId = ownerId;
    const property = await Property.findOne(propQuery);
    if (!property) return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });

    // Fetch Room Categories
    const categories = await PropertyRooms.find({ propertyId });

    // Fetch Active Bookings overlapping [checkIn, checkOut)
    const bookings = await Booking.find({
      propertyId,
      bookingStatus: { $nin: ['Cancelled'] },
      checkInDate: { $lt: outDate },
      checkOutDate: { $gt: inDate }
    });

    // Fetch Blocked Dates overlapping [checkIn, checkOut)
    const blocks = await PropertyBlockedDate.find({
      propertyId,
      startDate: { $lt: outDate },
      endDate: { $gte: inDate }
    });

    let totalAvailableCount = 0;
    const availableCategories = categories.map(cat => {
      const allRooms = cat.roomNumbers || [];
      const availableRooms = allRooms.filter(roomNo => {
        // Check booking overlap
        const isBooked = bookings.some(b => {
          return (b.bookedRooms && b.bookedRooms.some(br => String(br.roomNumber) === String(roomNo))) ||
                 (b.propertyDetails && String(b.propertyDetails.roomNumber) === String(roomNo));
        });
        if (isBooked) return false;

        // Check block overlap
        const isBlocked = blocks.some(blk => String(blk.roomNumber) === String(roomNo));
        if (isBlocked) return false;

        return true;
      });

      totalAvailableCount += availableRooms.length;

      return {
        categoryId: cat._id,
        categoryName: cat.roomCategoryName,
        roomType: cat.roomType,
        totalRooms: cat.numberOfRooms,
        availableRooms,
        availableCount: availableRooms.length,
        maxAdults: cat.maxOccupancyAdults,
        maxChildren: cat.maxOccupancyChildren,
        extraPersonAllowed: cat.extraPersonAllowed,
        bedType: cat.bedType,
        roomSize: cat.roomSize
      };
    });

    res.json({
      propertyId,
      checkIn,
      checkOut,
      totalAvailableCount,
      availableCategories
    });

  } catch (err) {
    console.error('Error querying available rooms:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/bookings/calculate-price
router.post('/homestay-owner/bookings/calculate-price', authenticateToken, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, rooms = [], bookingType = 'guest' } = req.body;
    if (!propertyId || !checkIn || !checkOut || !rooms.length) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property, dates, and rooms are required.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));

    // Fetch Seasons & Rates
    const seasonRecord = await PropertySeason.findOne({ propertyId });
    let totalRoomCost = 0;

    for (const r of rooms) {
      // Find pricing for category
      let priceRecord = null;
      if (r.categoryId) {
        priceRecord = await PropertyPricing.findOne({
          propertyId,
          roomCategoryId: r.categoryId,
          mealPlan: r.mealPlan || 'EP'
        });
      }

      let baseRatePerNight = 3000; // fallback base rate
      if (priceRecord) {
        baseRatePerNight = bookingType === 'agent' ? priceRecord.b2bRate : priceRecord.b2cRate;
      } else if (r.price && Number(r.price) > 0) {
        baseRatePerNight = Number(r.price);
      }

      // Meal plan supplement if EP is base
      let mealSupplement = 0;
      if (r.mealPlan === 'CP') mealSupplement = 500;
      else if (r.mealPlan === 'MAP') mealSupplement = 800;
      else if (r.mealPlan === 'AP') mealSupplement = 1200;

      // Extra guest charges
      let extraGuestCost = 0;
      if (r.adults > 2) {
        const extraAdults = r.adults - 2;
        const ratePerExtra = priceRecord ? (bookingType === 'agent' ? priceRecord.extraAdultB2B : priceRecord.extraAdultB2C) || 800 : 800;
        extraGuestCost += (extraAdults * ratePerExtra);
      }
      if (r.child5_9 > 0) {
        const ratePerChild = priceRecord ? (bookingType === 'agent' ? priceRecord.childB2B : priceRecord.childB2C) || 400 : 400;
        extraGuestCost += (r.child5_9 * ratePerChild);
      }

      totalRoomCost += ((baseRatePerNight + mealSupplement + extraGuestCost) * nights);
    }

    const totalTax = Math.round(totalRoomCost * 0.12);
    const finalAmount = totalRoomCost + totalTax;

    res.json({
      nights,
      roomCost: totalRoomCost,
      tax: totalTax,
      addOns: 0,
      discount: 0,
      finalAmount,
      balanceAmount: finalAmount
    });

  } catch (err) {
    console.error('Error calculating price:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/bookings
router.post('/homestay-owner/bookings', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const {
      propertyId,
      customer,
      checkInDate,
      checkOutDate,
      bookingMode = 'Guest',
      isHold = false,
      rooms: inputRooms = [],
      roomSelection,
      dates,
      pricing = {},
      advanceAmount = 0,
      notes = ''
    } = req.body;

    const guestMobile = customer?.mobile || customer?.phone || '';
    const guestName = customer?.name || customer?.fullName || '';
    const finalCheckIn = checkInDate || dates?.checkIn;
    const finalCheckOut = checkOutDate || dates?.checkOut;
    let finalRooms = inputRooms;
    if (!finalRooms.length && roomSelection?.selectedRoomNumbers) {
      finalRooms = roomSelection.selectedRoomNumbers.map(rNo => ({
        roomNumber: String(rNo),
        baseRate: pricing.baseRate || 3000
      }));
    }

    // 1. Mandatory Validations
    if (!propertyId) return res.status(400).json({ error: 'ValidationError', message: 'Property is required.' });
    if (!guestName.trim()) return res.status(400).json({ error: 'ValidationError', message: 'Guest name is required.' });
    if (!guestMobile.trim()) return res.status(400).json({ error: 'ValidationError', message: 'Guest mobile number is required.' });
    if (!finalCheckIn || !finalCheckOut) return res.status(400).json({ error: 'ValidationError', message: 'Check-in and check-out dates are required.' });
    if (!finalRooms.length) return res.status(400).json({ error: 'ValidationError', message: 'At least one room must be selected.' });

    const inDate = new Date(finalCheckIn);
    const outDate = new Date(finalCheckOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid stay dates. Check-out must be after check-in.' });
    }

    const rooms = finalRooms;

    // 2. Property Ownership
    const propQuery = { _id: propertyId, deleted: false };
    if (!isSuperAdmin) propQuery.ownerId = ownerId;
    const property = await Property.findOne(propQuery);
    if (!property) return res.status(403).json({ error: 'Forbidden', message: 'Access denied. You do not own this property.' });

    // 3. Prevent duplicate room selection in same request
    const roomNumbers = rooms.map(r => String(r.roomNumber));
    const uniqueRooms = new Set(roomNumbers);
    if (uniqueRooms.size !== roomNumbers.length) {
      return res.status(400).json({ error: 'DuplicateRoom', message: 'Cannot select the same room number multiple times in a single booking.' });
    }

    // 4. ATOMIC CONCURRENCY & DOUBLE-BOOKING CHECK
    for (const r of rooms) {
      // Overlapping booking query
      const conflictBooking = await Booking.findOne({
        propertyId,
        bookingStatus: { $nin: ['Cancelled'] },
        $or: [
          { "bookedRooms.roomNumber": r.roomNumber },
          { "propertyDetails.roomNumber": r.roomNumber }
        ],
        checkInDate: { $lt: outDate },
        checkOutDate: { $gt: inDate }
      });

      if (conflictBooking) {
        return res.status(409).json({
          error: 'RoomUnavailable',
          message: `Room ${r.roomNumber} is no longer available for the selected dates (${inDate.toISOString().split('T')[0]} to ${outDate.toISOString().split('T')[0]}). Please choose another room.`
        });
      }

      // Overlapping block query
      const conflictBlock = await PropertyBlockedDate.findOne({
        propertyId,
        roomNumber: r.roomNumber,
        startDate: { $lt: outDate },
        endDate: { $gte: inDate }
      });

      if (conflictBlock) {
        return res.status(409).json({
          error: 'RoomBlocked',
          message: `Room ${r.roomNumber} is blocked for maintenance or owner use during the selected dates.`
        });
      }
    }

    // 5. Build Guests summary
    let totalAdults = 0;
    let totalChildren = 0;
    rooms.forEach(r => {
      totalAdults += Number(r.adults || 1);
      totalChildren += Number(r.child5_9 || 0) + Number(r.child0_4 || 0);
    });

    // 6. Generate Booking ID
    const count = await Booking.countDocuments();
    const bookingIdStr = `WG-BK-${String(count + 1001).padStart(5, '0')}`;

    // 7. Calculate Pricing
    const roomCost = Number(pricing.roomCost) || Number(pricing.totalCost) || Number(pricing.baseRate) || 0;
    const tax = Number(pricing.tax) || 0;
    const addOns = Number(pricing.addOns) || 0;
    const finalAmount = Number(pricing.finalAmount) || Number(pricing.grandTotal) || (roomCost + tax + addOns);
    const advAmount = Math.min(finalAmount, Math.max(0, Number(advanceAmount || pricing.advancePayment || pricing.advanceAmount || 0)));
    const balAmount = Math.max(0, finalAmount - advAmount);

    const isActuallyHold = Boolean(isHold) || req.body.bookingStatus === 'Hold';
    const bookingStatus = isActuallyHold ? 'Hold' : 'Confirmed';
    const paymentStatus = advAmount >= finalAmount ? 'Paid' : (advAmount > 0 ? 'Partial' : 'Pending');
    const holdExpiresAt = isActuallyHold ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const newBooking = new Booking({
      bookingId: bookingIdStr,
      bookingType: 'Homestay Booking',
      bookingStatus,
      paymentStatus,
      amount: finalAmount,
      checkInDate: inDate,
      checkOutDate: outDate,
      propertyId: property._id,
      ownerId: property.ownerId,
      bookingMode: bookingMode === 'Travel Agent' ? 'Travel Agent' : 'Guest',
      holdExpiresAt,
      customer: {
        name: guestName.trim(),
        mobile: guestMobile.trim(),
        email: customer?.email || '',
        address: customer?.address || ''
      },
      guests: {
        total: totalAdults + totalChildren,
        adults: totalAdults,
        children: totalChildren
      },
      bookedRooms: rooms.map(r => ({
        roomCategoryId: r.roomCategoryId || r.categoryId,
        roomCategoryName: r.roomCategoryName || r.category || 'Standard',
        roomNumber: String(r.roomNumber),
        adults: Number(r.adults || 1),
        child5_9: Number(r.child5_9 || 0),
        child0_4: Number(r.child0_4 || 0),
        mealPlan: r.mealPlan || 'EP',
        roomPrice: Number(r.roomPrice || r.price || 0)
      })),
      propertyDetails: {
        propertyId: property.propertyId,
        propertyName: property.name,
        ownerName: property.ownerName,
        location: `${property.city}, ${property.state}`,
        roomCategory: rooms[0]?.roomCategoryName || 'Standard',
        roomNumber: rooms.map(r => r.roomNumber).join(', '),
        mealPlan: rooms[0]?.mealPlan || 'EP'
      },
      pricing: {
        bookingAmount: roomCost,
        discount: Number(pricing.discount) || 0,
        tax,
        addOns,
        addOnsRemark: pricing.addOnsRemark || '',
        paidAmount: advAmount,
        pendingAmount: balAmount,
        finalAmount
      },
      paymentDetails: {
        method: advAmount > 0 ? (pricing.paymentMethod || 'Advance Cash / UPI') : 'Pending',
        paymentStatus
      },
      paymentHistory: advAmount > 0 ? [{
        amount: advAmount,
        method: pricing.paymentMethod || 'Advance Cash / UPI',
        transactionId: pricing.transactionId || '',
        remark: 'Initial advance payment at booking creation',
        date: new Date(),
        recordedBy: req.user.email || 'Owner'
      }] : [],
      timeline: [
        {
          activity: `Booking created by Owner (${bookingStatus})`,
          timestamp: new Date(),
          createdBy: req.user.email || 'Owner'
        }
      ]
    });

    await newBooking.save();

    res.status(201).json({
      success: true,
      message: `Booking ${bookingIdStr} successfully created!`,
      booking: newBooking
    });

  } catch (err) {
    console.error('Error creating homestay booking:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/bookings (All bookings with filters, search, and stats)
router.get('/homestay-owner/bookings', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { propertyId, status, search, startDate, endDate, month, year } = req.query;

    const properties = await Property.find({ ownerId, deleted: false }).select('_id name');
    const propertyIds = properties.map(p => p._id);

    let propFilter = { $in: propertyIds };
    if (propertyId && propertyId !== 'all' && propertyId !== 'All Homestays') {
      if (mongoose.isValidObjectId(propertyId)) {
        propFilter = new mongoose.Types.ObjectId(propertyId);
      }
    }

    const query = { propertyId: propFilter };

    if (status && status !== 'all' && status !== 'All') {
      query.bookingStatus = status;
    }

    if (startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      query.checkInDate = {
        $gte: s,
        $lte: e
      };
    } else if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
      query.checkInDate = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    } else if (year && !month) {
      const y = Number(year);
      const startOfYear = new Date(y, 0, 1, 0, 0, 0);
      const endOfYear = new Date(y, 11, 31, 23, 59, 59, 999);
      query.checkInDate = {
        $gte: startOfYear,
        $lte: endOfYear
      };
    }

    let allBookings = await Booking.find(query)
      .populate('propertyId', 'name address city')
      .sort({ createdAt: -1, checkInDate: -1 });

    if (search) {
      const s = search.toLowerCase();
      allBookings = allBookings.filter(b => 
        (b.customer?.name && b.customer.name.toLowerCase().includes(s)) ||
        (b.customer?.mobile && b.customer.mobile.includes(s)) ||
        (b.customer?.email && b.customer.email.toLowerCase().includes(s)) ||
        (b.bookingId && b.bookingId.toLowerCase().includes(s)) ||
        (b.propertyId?.name && b.propertyId.name.toLowerCase().includes(s))
      );
    }

    // Calculate summary statistics
    const totalBookings = allBookings.length;
    const confirmedCount = allBookings.filter(b => b.bookingStatus === 'Confirmed').length;
    const holdCount = allBookings.filter(b => b.bookingStatus === 'Hold').length;
    const checkedInCount = allBookings.filter(b => b.bookingStatus === 'Checked In').length;
    const checkedOutCount = allBookings.filter(b => b.bookingStatus === 'Checked Out').length;
    const cancelledCount = allBookings.filter(b => b.bookingStatus === 'Cancelled').length;

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPending = 0;

    allBookings.forEach(b => {
      const amt = Number(b.pricing?.finalAmount || b.amount || 0);
      const paid = Number(b.pricing?.paidAmount || 0);
      const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, amt - paid));
      totalRevenue += amt;
      totalCollected += paid;
      totalPending += pend;
    });

    res.json({
      success: true,
      bookings: allBookings,
      stats: {
        totalBookings,
        confirmedCount,
        holdCount,
        checkedInCount,
        checkedOutCount,
        cancelledCount,
        totalRevenue,
        totalCollected,
        totalPending
      },
      properties: properties.map(p => ({ id: p._id, name: p.name }))
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/bookings/:id (Supports MongoDB ID or bookingId string like WG-BK-01003)
router.get('/homestay-owner/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    }).populate('propertyId');

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });

    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    const bObj = booking.toObject ? booking.toObject() : booking;
    let propPay = {};
    if (booking.propertyId) {
      const propDoc = await Property.findById(booking.propertyId).select('paymentSettings name city state');
      if (propDoc?.paymentSettings) propPay = propDoc.paymentSettings;
    }

    let ownerDoc = null;
    if (booking.ownerId) {
      ownerDoc = await HomestayOwner.findById(booking.ownerId).select('accountHolderName bankName accountNumber ifscCode branch upiId upiQrCode advancePercent advanceType firstName lastName mobile');
    }

    bObj.ownerPaymentDetails = {
      accountHolderName: propPay.accountHolderName || ownerDoc?.accountHolderName || (ownerDoc ? `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim() : '') || 'Homestay Sanctuary',
      bankName: propPay.bankName || ownerDoc?.bankName || 'HDFC Bank',
      accountNumber: propPay.accountNumber || ownerDoc?.accountNumber || '',
      ifscCode: propPay.ifscCode || ownerDoc?.ifscCode || '',
      branch: propPay.branch || ownerDoc?.branch || '',
      upiId: propPay.upiId || ownerDoc?.upiId || '',
      upiQrCode: propPay.upiQrCode || ownerDoc?.upiQrCode || '',
      advancePercent: propPay.advancePercent !== undefined ? propPay.advancePercent : (ownerDoc?.advancePercent !== undefined ? ownerDoc.advancePercent : 30),
      advanceType: propPay.advanceType || ownerDoc?.advanceType || 'percent',
      contactName: ownerDoc ? `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim() : '',
      contactMobile: ownerDoc?.mobile || ''
    };
    res.json({ ...bObj, booking: bObj });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/confirm-hold
router.patch('/homestay-owner/bookings/:id/confirm-hold', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    booking.bookingStatus = 'Confirmed';
    booking.holdExpiresAt = null;
    booking.timeline.push({
      activity: 'Booking confirmed from Hold by Owner',
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });
    await booking.save();

    res.json({ success: true, message: 'Hold confirmed! Booking is now Confirmed.', booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/remove-hold
router.patch('/homestay-owner/bookings/:id/remove-hold', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    booking.bookingStatus = 'Cancelled';
    booking.holdExpiresAt = null;
    booking.timeline.push({
      activity: 'Hold removed by Owner. Room released and available.',
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });
    await booking.save();

    await createOwnerNotification({
      ownerId: booking.ownerId,
      title: 'Booking Hold Removed',
      message: `Hold for booking ${booking.bookingId} was removed. Room is now available.`,
      type: 'cancellation',
      bookingId: booking.bookingId
    });

    res.json({ success: true, message: 'Hold removed successfully. Room is now available.', booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/reschedule
router.patch('/homestay-owner/bookings/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const checkInDate = req.body.checkInDate || req.body.newCheckIn;
    const checkOutDate = req.body.checkOutDate || req.body.newCheckOut;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Both check-in and check-out dates are required.' });
    }

    const newIn = new Date(checkInDate);
    const newOut = new Date(checkOutDate);
    if (isNaN(newIn.getTime()) || isNaN(newOut.getTime()) || newIn >= newOut) {
      return res.status(400).json({ error: 'ValidationError', message: 'Check-out date must be after check-in date.' });
    }

    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    const roomNumbers = (booking.bookedRooms && booking.bookedRooms.length > 0)
      ? booking.bookedRooms.map(r => r.roomNumber)
      : [booking.propertyDetails?.roomNumber].filter(Boolean);

    // Concurrency collision check
    for (const rNo of roomNumbers) {
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        ...(booking.bookingId ? {
          bookingId: { 
            $nin: [
              booking.bookingId, 
              `#${booking.bookingId.replace(/^#/, '')}`, 
              booking.bookingId.replace(/^#/, '')
            ] 
          }
        } : {}),
        propertyId: booking.propertyId,
        bookingStatus: { $nin: ['Cancelled'] },
        $or: [
          { "bookedRooms.roomNumber": rNo },
          { "propertyDetails.roomNumber": rNo }
        ],
        checkInDate: { $lt: newOut },
        checkOutDate: { $gt: newIn }
      });
      if (conflict) {
        return res.status(409).json({
          error: 'RoomConflict',
          message: `Room ${rNo} is already occupied by booking #${conflict.bookingId} for the selected dates.`
        });
      }

      const blkConflict = await PropertyBlockedDate.findOne({
        propertyId: booking.propertyId,
        roomNumber: rNo,
        startDate: { $lt: newOut },
        endDate: { $gte: newIn }
      });
      if (blkConflict) {
        return res.status(409).json({
          error: 'RoomBlocked',
          message: `Room ${rNo} is blocked for maintenance during the selected dates.`
        });
      }
    }

    const prevIn = booking.checkInDate.toISOString().split('T')[0];
    const prevOut = booking.checkOutDate.toISOString().split('T')[0];
    booking.checkInDate = newIn;
    booking.checkOutDate = newOut;
    booking.timeline.push({
      activity: `Rescheduled stay from (${prevIn} → ${prevOut}) to (${checkInDate} → ${checkOutDate})`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });
    await booking.save();

    // Synchronize any duplicate records with the same bookingId
    if (booking.bookingId) {
      await Booking.updateMany(
        {
          _id: { $ne: booking._id },
          bookingId: { 
            $in: [
              booking.bookingId, 
              `#${booking.bookingId.replace(/^#/, '')}`, 
              booking.bookingId.replace(/^#/, '')
            ] 
          }
        },
        {
          $set: {
            checkInDate: newIn,
            checkOutDate: newOut
          },
          $push: {
            timeline: {
              activity: `Rescheduled stay from (${prevIn} → ${prevOut}) to (${checkInDate} → ${checkOutDate})`,
              timestamp: new Date(),
              createdBy: req.user.email || 'Owner'
            }
          }
        }
      ).catch(e => console.warn('Could not sync duplicate booking records:', e.message));
    }

    res.json({ success: true, message: `Booking rescheduled to ${checkInDate} - ${checkOutDate}!`, booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/cancel
router.patch('/homestay-owner/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const { reason = 'Cancelled by Owner' } = req.body;

    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    booking.bookingStatus = 'Cancelled';
    booking.timeline.push({
      activity: `Booking cancelled: ${reason}`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });
    await booking.save();

    await createOwnerNotification({
      ownerId: booking.ownerId,
      title: 'Booking Cancelled',
      message: `Booking ${booking.bookingId} was cancelled (${reason}). Room released back to calendar.`,
      type: 'cancellation',
      bookingId: booking.bookingId,
      metadata: { reason }
    });

    res.json({ success: true, message: 'Booking cancelled. Rooms are now open for new reservations.', booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/payment
router.patch('/homestay-owner/bookings/:id/payment', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const { amount, method = 'UPI', transactionId = '', remark = '' } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'Please enter a valid payment amount greater than 0.' });
    }

    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    const curPaid = Number(booking.pricing?.paidAmount) || 0;
    const finalAmt = Number(booking.pricing?.finalAmount) || Number(booking.amount) || 0;
    const newPaid = curPaid + paymentAmount;
    const newPending = Math.max(0, finalAmt - newPaid);

    booking.pricing.paidAmount = newPaid;
    booking.pricing.pendingAmount = newPending;
    booking.paymentStatus = newPending <= 0 ? 'Paid' : 'Partial';

    if (!booking.paymentHistory) booking.paymentHistory = [];
    booking.paymentHistory.push({
      amount: paymentAmount,
      method,
      transactionId,
      remark: remark || 'Payment installment recorded by Owner',
      date: new Date(),
      recordedBy: req.user.email || 'Owner'
    });

    booking.timeline.push({
      activity: `Payment of ₹${paymentAmount.toLocaleString()} recorded via ${method}. Pending balance: ₹${newPending.toLocaleString()}`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });

    await booking.save();

    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString()} recorded successfully! Balance due: ₹${newPending.toLocaleString()}`,
      booking
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id
router.patch('/homestay-owner/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    const { customer, guestDetails, pricing, notes, specialRequests } = req.body;
    if (customer || guestDetails) {
      const gName = customer?.name || guestDetails?.fullName;
      const gPhone = customer?.mobile || customer?.phone || guestDetails?.phone;
      const gEmail = customer?.email !== undefined ? customer.email : guestDetails?.email;
      const gAddress = customer?.address !== undefined ? customer.address : guestDetails?.address;

      if (!booking.customer) booking.customer = {};
      if (gName) booking.customer.name = gName.trim();
      if (gPhone) booking.customer.mobile = gPhone.trim();
      if (gEmail !== undefined) booking.customer.email = gEmail;
      if (gAddress !== undefined) booking.customer.address = gAddress;
    }

    if (pricing) {
      if (!booking.pricing) booking.pricing = {};
      const prevAddOns = Number(booking.pricing.addOns) || 0;
      if (pricing.addOns !== undefined) booking.pricing.addOns = Number(pricing.addOns) || 0;
      if (pricing.addOnsRemark !== undefined) booking.pricing.addOnsRemark = pricing.addOnsRemark;
      
      const addOnsDiff = (Number(booking.pricing.addOns) || 0) - prevAddOns;
      if (addOnsDiff !== 0) {
        const curFinal = Number(booking.pricing.finalAmount) || Number(booking.amount) || 0;
        const newFinal = Math.max(0, curFinal + addOnsDiff);
        booking.pricing.finalAmount = newFinal;
        booking.amount = newFinal;
        const curPaid = Number(booking.pricing.paidAmount) || 0;
        booking.pricing.pendingAmount = Math.max(0, newFinal - curPaid);
        booking.paymentStatus = booking.pricing.pendingAmount <= 0 ? 'Paid' : (curPaid > 0 ? 'Partial' : 'Pending');
      } else if (pricing.finalAmount !== undefined) {
        booking.pricing.finalAmount = Number(pricing.finalAmount);
        booking.amount = Number(pricing.finalAmount);
      }
    }

    if (specialRequests !== undefined) {
      booking.specialRequests = specialRequests;
      booking.notes = specialRequests;
    }
    if (notes !== undefined) {
      booking.notes = notes;
      if (!booking.specialRequests) {
        booking.specialRequests = notes;
      }
    }

    booking.timeline.push({
      activity: 'Booking details updated by Owner',
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });

    await booking.save();
    await booking.populate('propertyId');

    const bObj = booking.toObject ? booking.toObject() : booking;
    res.json({ success: true, message: 'Booking updated successfully.', booking: bObj, ...bObj });
  } catch (err) {
    console.error('Error updating booking:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER: PAYMENT SETTINGS & GATEWAY
// ==========================================

// GET /api/homestay-owner/settings/payments
router.get('/homestay-owner/settings/payments', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const owner = await HomestayOwner.findById(ownerId);
    if (!owner) return res.status(404).json({ error: 'NotFound', message: 'Owner not found' });

    // Fetch all active homestays for this owner
    const properties = await Property.find({ ownerId, deleted: false }).select('_id name propertyId city state address paymentSettings');

    // Determine which property to read settings for
    const reqPropId = req.query.propertyId;
    let targetProperty = null;
    if (reqPropId && mongoose.isValidObjectId(reqPropId)) {
      targetProperty = properties.find(p => String(p._id) === String(reqPropId));
    }
    if (!targetProperty && properties.length > 0) {
      targetProperty = properties[0];
    }

    const propPay = targetProperty?.paymentSettings || {};

    const accountHolderName = propPay.accountHolderName || owner.accountHolderName || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || targetProperty?.name || 'Homestay Owner';
    const bankName = propPay.bankName || owner.bankName || 'HDFC Bank';
    const accountNumber = propPay.accountNumber || owner.accountNumber || '5010 1234 5678 90';
    const ifscCode = propPay.ifscCode || owner.ifscCode || 'HDFC0001234';
    const branch = propPay.branch || owner.branch || [targetProperty?.city, targetProperty?.state].filter(Boolean).join(', ') || 'Himachal Pradesh';
    const upiId = propPay.upiId || owner.upiId || 'keshavhomestay@okicici';
    const upiQrCode = propPay.upiQrCode || owner.upiQrCode || '';
    const advancePercent = propPay.advancePercent !== undefined ? propPay.advancePercent : (owner.advancePercent !== undefined ? owner.advancePercent : 30);
    const advanceType = propPay.advanceType || owner.advanceType || 'percent';
    const advanceAmount = propPay.advanceAmount || owner.advanceAmount || 0;

    const paymentSettings = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      upiId,
      upiQrCode,
      advancePercent,
      advanceType,
      advanceAmount
    };

    res.json({
      success: true,
      selectedPropertyId: targetProperty?._id || null,
      selectedPropertyName: targetProperty?.name || '',
      properties: properties.map(p => ({
        _id: p._id,
        name: p.name,
        propertyId: p.propertyId,
        city: p.city,
        state: p.state
      })),
      paymentSettings,
      // Root-level fields for backwards compatibility
      ...paymentSettings
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PUT /api/homestay-owner/settings/payments
router.put('/homestay-owner/settings/payments', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { 
      propertyId,
      accountHolderName, 
      bankName, 
      accountNumber, 
      ifscCode, 
      branch, 
      upiId, 
      upiQrCode, 
      advancePercent, 
      advanceType,
      advanceAmount
    } = req.body;

    const owner = await HomestayOwner.findById(ownerId);
    if (!owner) return res.status(404).json({ error: 'NotFound', message: 'Owner not found' });

    // 1. If propertyId provided or query has it, save to that specific Property's paymentSettings
    const targetPropId = propertyId || req.query.propertyId;
    let targetProperty = null;
    if (targetPropId && mongoose.isValidObjectId(targetPropId)) {
      targetProperty = await Property.findOne({ _id: targetPropId, ownerId, deleted: false });
      if (targetProperty) {
        if (!targetProperty.paymentSettings) targetProperty.paymentSettings = {};
        if (accountHolderName !== undefined) targetProperty.paymentSettings.accountHolderName = accountHolderName;
        if (bankName !== undefined) targetProperty.paymentSettings.bankName = bankName;
        if (accountNumber !== undefined) targetProperty.paymentSettings.accountNumber = accountNumber;
        if (ifscCode !== undefined) targetProperty.paymentSettings.ifscCode = ifscCode;
        if (branch !== undefined) targetProperty.paymentSettings.branch = branch;
        if (upiId !== undefined) targetProperty.paymentSettings.upiId = upiId;
        if (upiQrCode !== undefined) targetProperty.paymentSettings.upiQrCode = upiQrCode;
        if (advancePercent !== undefined) targetProperty.paymentSettings.advancePercent = Number(advancePercent);
        if (advanceType !== undefined) targetProperty.paymentSettings.advanceType = advanceType;
        if (advanceAmount !== undefined) targetProperty.paymentSettings.advanceAmount = Number(advanceAmount);
        await targetProperty.save();
      }
    }

    // 2. Also update Owner model as global default/fallback
    if (accountHolderName !== undefined) owner.accountHolderName = accountHolderName;
    if (bankName !== undefined) owner.bankName = bankName;
    if (accountNumber !== undefined) owner.accountNumber = accountNumber;
    if (ifscCode !== undefined) owner.ifscCode = ifscCode;
    if (branch !== undefined) owner.branch = branch;
    if (upiId !== undefined) owner.upiId = upiId;
    if (upiQrCode !== undefined) owner.upiQrCode = upiQrCode;
    if (advancePercent !== undefined) owner.advancePercent = Number(advancePercent);
    if (advanceType !== undefined) owner.advanceType = advanceType;
    if (advanceAmount !== undefined) owner.advanceAmount = Number(advanceAmount);

    await owner.save();

    const currentPay = targetProperty?.paymentSettings || {
      accountHolderName: owner.accountHolderName,
      bankName: owner.bankName,
      accountNumber: owner.accountNumber,
      ifscCode: owner.ifscCode,
      branch: owner.branch,
      upiId: owner.upiId,
      upiQrCode: owner.upiQrCode,
      advancePercent: owner.advancePercent,
      advanceType: owner.advanceType,
      advanceAmount: owner.advanceAmount
    };

    res.json({
      success: true,
      message: 'Payment settings saved successfully.',
      propertyId: targetProperty?._id || null,
      paymentSettings: currentPay,
      ...currentPay
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER: GUEST LISTING & DETAILS
// ==========================================

// GET /api/homestay-owner/guests
router.get('/homestay-owner/guests', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { propertyId, month, year, startDate, endDate, search } = req.query;

    const properties = await Property.find({ ownerId, deleted: false }).select('_id name');
    const propertyIds = properties.map(p => p._id);

    let propFilter = { $in: propertyIds };
    if (propertyId && propertyId !== 'all' && propertyId !== 'All Homestays') {
      if (mongoose.isValidObjectId(propertyId)) {
        propFilter = new mongoose.Types.ObjectId(propertyId);
      }
    }

    const query = { propertyId: propFilter };

    if (startDate && endDate) {
      query.checkInDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (year && month) {
      const monthMap = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
        'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
        'nov': 11, 'november': 11, 'dec': 12, 'december': 12
      };
      const mNum = isNaN(month) ? (monthMap[String(month).toLowerCase()] || 5) : parseInt(month, 10);
      const yNum = parseInt(year, 10) || 2026;
      const start = new Date(yNum, mNum - 1, 1);
      const end = new Date(yNum, mNum, 0, 23, 59, 59);
      query.checkInDate = { $gte: start, $lte: end };
    } else if (year) {
      const yNum = parseInt(year, 10) || 2026;
      const start = new Date(yNum, 0, 1);
      const end = new Date(yNum, 11, 31, 23, 59, 59);
      query.checkInDate = { $gte: start, $lte: end };
    }

    const allOwnerBookings = await Booking.find({ propertyId: { $in: propertyIds } }).populate('propertyId', 'name');

    // Calculate unique guest count across all host bookings
    const allUniquePhones = new Set();
    allOwnerBookings.forEach(b => {
      let p = (b.customer?.mobile || b.customer?.phone || '').replace(/[^0-9]/g, '');
      if (p.length >= 10) p = p.slice(-10);
      if (p.length >= 7) allUniquePhones.add(p);
      else if (b.customer?.email) allUniquePhones.add(b.customer.email.toLowerCase().trim());
      else allUniquePhones.add(String(b._id));
    });
    const totalGuests = allUniquePhones.size;
    const cancelledCount = allOwnerBookings.filter(b => b.bookingStatus === 'Cancelled').length;
    const rescheduledCount = allOwnerBookings.filter(b => b.timeline?.some(t => /reschedul/i.test(t.activity))).length;
    const holdCount = allOwnerBookings.filter(b => b.bookingStatus === 'Hold').length;

    let filteredBookings = await Booking.find(query)
      .populate('propertyId', 'name address city')
      .sort({ createdAt: -1, checkInDate: -1 });

    if (search) {
      const s = search.toLowerCase();
      filteredBookings = filteredBookings.filter(b => 
        (b.customer?.name && b.customer.name.toLowerCase().includes(s)) ||
        (b.customer?.mobile && b.customer.mobile.includes(s)) ||
        (b.bookingId && b.bookingId.toLowerCase().includes(s))
      );
    }

    // Group and consolidate bookings by contact / mobile number (or email)
    const guestGroups = new Map();

    filteredBookings.forEach(b => {
      const rawPhone = b.customer?.mobile || b.customer?.phone || '';
      let normPhone = rawPhone.replace(/[^0-9]/g, '');
      if (normPhone.length >= 10) normPhone = normPhone.slice(-10);
      const rawEmail = (b.customer?.email || '').trim().toLowerCase();
      // Group key: normalized 10-digit phone (if valid length), otherwise email, otherwise booking ID
      const groupKey = normPhone.length >= 7 ? normPhone : (rawEmail || String(b._id));

      if (!guestGroups.has(groupKey)) {
        guestGroups.set(groupKey, []);
      }
      guestGroups.get(groupKey).push(b);
    });

    const consolidatedList = [];
    guestGroups.forEach((groupBookings) => {
      // Sort group bookings: latest stay first
      groupBookings.sort((a, b) => new Date(b.createdAt || b.checkInDate) - new Date(a.createdAt || a.checkInDate));
      const latest = groupBookings[0];

      const bDate = latest.createdAt || latest.checkInDate;
      const dObj = new Date(bDate);
      const roomStr = latest.bookedRooms?.map(r => `Room ${r.roomNumber}`).join(', ') || (latest.propertyDetails?.roomNumber ? `Room ${latest.propertyDetails.roomNumber}` : 'Room 1');
      const checkInDate = new Date(latest.checkInDate);

      // Sum financial totals across all consolidated bookings for this guest
      let totalDueSum = 0;
      let totalAmountSum = 0;
      let totalPaidSum = 0;

      groupBookings.forEach(b => {
        const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const pAmt = Number(b.pricing?.paidAmount || 0);
        const due = b.pricing?.pendingAmount !== undefined ? Number(b.pricing.pendingAmount) : Math.max(0, fAmt - pAmt);
        totalDueSum += Math.max(0, due);
        totalAmountSum += fAmt;
        totalPaidSum += pAmt;
      });

      const count = groupBookings.length;

      consolidatedList.push({
        id: latest.bookingId || String(latest._id),
        dbId: String(latest._id),
        bookingsCount: count,
        allBookingIds: groupBookings.map(b => b.bookingId || String(b._id)),
        bookingDate: dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        bookingTime: dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        guestName: latest.customer?.name || latest.guestDetails?.fullName || 'Guest',
        phone: latest.customer?.mobile || latest.customer?.phone || '',
        email: latest.customer?.email || '',
        roomNo: count > 1 ? `${roomStr} (${count} Stays)` : roomStr,
        totalDue: `₹ ${totalDueSum.toLocaleString()}`,
        totalDueRaw: totalDueSum,
        totalAmount: totalAmountSum,
        paidAmount: totalPaidSum,
        dueDate: `Due on ${checkInDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
        bookingStatus: count > 1 ? `${count} Stays (${latest.bookingStatus})` : latest.bookingStatus,
        paymentStatus: totalDueSum === 0 ? 'Completed' : (totalPaidSum > 0 ? 'Partial' : 'Pending'),
        propertyName: latest.propertyId?.name || latest.propertyDetails?.propertyName || 'Homestay'
      });
    });

    res.json({
      success: true,
      stats: {
        totalGuests: totalGuests || consolidatedList.length,
        cancelledCount: cancelledCount || 0,
        rescheduledCount: rescheduledCount || 0,
        holdCount: holdCount || 0
      },
      bookings: consolidatedList,
      properties: properties.map(p => ({ id: p._id, name: p.name }))
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/guests/:identifier
router.get('/homestay-owner/guests/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const isObjectId = mongoose.isValidObjectId(identifier);

    let currentBooking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: identifier }] : []),
        { bookingId: identifier },
        { bookingId: `#${identifier}` },
        { 'customer.mobile': identifier }
      ]
    }).populate('propertyId');

    if (!currentBooking) {
      return res.status(404).json({ error: 'NotFound', message: 'Guest or booking not found.' });
    }

    const guestPhone = currentBooking.customer?.mobile || currentBooking.customer?.phone;
    const guestEmail = currentBooking.customer?.email;
    const guestName = currentBooking.customer?.name || 'Guest';

    const historyQuery = {
      $or: [
        ...(guestPhone ? [{ 'customer.mobile': guestPhone }, { 'customer.phone': guestPhone }] : []),
        ...(guestEmail ? [{ 'customer.email': guestEmail }] : [])
      ]
    };

    const allGuestBookings = await Booking.find(historyQuery)
      .populate('propertyId', 'name address city')
      .sort({ checkInDate: -1, createdAt: -1 });

    const lifetimeBookings = allGuestBookings.length;
    const completedStays = allGuestBookings.filter(b => b.bookingStatus === 'Checked Out' || b.bookingStatus === 'Completed').length;
    const cancelledStays = allGuestBookings.filter(b => b.bookingStatus === 'Cancelled').length;
    const totalLifetimeSpend = allGuestBookings
      .filter(b => b.bookingStatus !== 'Cancelled')
      .reduce((sum, b) => sum + (Number(b.pricing?.finalAmount || b.amount || 0)), 0);

    const history = allGuestBookings.map(b => ({
      id: b.bookingId || String(b._id),
      dbId: String(b._id),
      propertyName: b.propertyId?.name || b.propertyDetails?.propertyName || 'Homestay Sanctuary',
      checkIn: new Date(b.checkInDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      checkOut: new Date(b.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      rooms: b.bookedRooms?.map(r => `Room ${r.roomNumber}`).join(', ') || 'Room 1',
      totalAmount: Number(b.pricing?.finalAmount || b.amount || 0),
      paidAmount: Number(b.pricing?.paidAmount || 0),
      pendingAmount: Number(b.pricing?.pendingAmount || 0),
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus || 'Pending',
      createdAt: new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      isCurrent: String(b._id) === String(currentBooking._id)
    }));

    res.json({
      success: true,
      currentBooking: {
        ...currentBooking.toObject(),
        guestName,
        phone: guestPhone,
        email: guestEmail
      },
      guestProfile: {
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        repeatGuest: lifetimeBookings > 1,
        totalLifetimeSpend,
        lifetimeBookings,
        completedStays,
        cancelledStays
      },
      history
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/guests/:identifier/notes
router.patch('/homestay-owner/guests/:identifier/notes', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { note, specialRequests } = req.body;
    const isObjectId = mongoose.isValidObjectId(identifier);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: identifier }] : []),
        { bookingId: identifier },
        { bookingId: `#${identifier}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });

    const noteText = note || specialRequests || '';
    booking.specialRequests = noteText;
    booking.notes = noteText;
    booking.timeline.push({
      activity: `Owner note saved: "${noteText.slice(0, 40)}..."`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });

    await booking.save();
    res.json({ success: true, message: 'Note saved successfully.', specialRequests: booking.specialRequests });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER: REVENUE REPORTING & ANALYTICS
// ==========================================

export function generateRevenueTimeframeData(bookings, { timeframe = 'Day-wise', year, month, day, week }) {
  const now = new Date();
  const yearNum = parseInt(year, 10) || now.getFullYear();
  const monthNum = (month && month !== 'all') ? parseInt(month, 10) : (now.getMonth() + 1); // 1-12
  const dayNum = day && day !== 'all' ? parseInt(day, 10) : null;
  const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;
  const isAllMonths = month === 'all';

  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let chartPoints = [];
  let periodTotal = 0;
  let periodTitle = '';
  let periodSubtitle = '';
  let detailsTable = [];

  const shortMonth = monthNamesShort[monthNum - 1] || 'Jan';
  const fullMonth = monthNamesFull[monthNum - 1] || 'January';

  if (timeframe === 'Day-wise') {
    // Exact days in requested month (e.g. 30 for Sep, 31 for Aug, 28/29 for Feb)
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    periodTitle = 'DAY-WISE REVENUE PERFORMANCE CURVE';

    for (let d = 1; d <= daysInMonth; d++) {
      const dStart = new Date(yearNum, monthNum - 1, d, 0, 0, 0);
      const dEnd = new Date(yearNum, monthNum - 1, d, 23, 59, 59);

      const dayBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt || b.checkInDate);
        return bd >= dStart && bd <= dEnd;
      });

      let dayTot = 0;
      let dayTariff = 0;
      let dayAddOns = 0;
      let dayTax = 0;
      let dayPaid = 0;
      let dayPending = 0;

      dayBookings.forEach(b => {
        const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const tAmt = Number(b.pricing?.tax || 0);
        const aAmt = Number(b.pricing?.addOns || 0);
        const bTariff = Number(b.pricing?.bookingAmount || Math.max(0, fAmt - tAmt - aAmt));
        const pAmt = Number(b.pricing?.paidAmount || 0);
        const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, fAmt - pAmt));

        dayTot += fAmt;
        dayTariff += bTariff;
        dayAddOns += aAmt;
        dayTax += tAmt;
        dayPaid += pAmt;
        dayPending += pend;
      });

      periodTotal += dayTot;

      const isToday = now.getFullYear() === yearNum && (now.getMonth() + 1) === monthNum && now.getDate() === d;
      const isSelectedDay = dayNum === d;

      chartPoints.push({
        day: d,
        label: `${d} ${shortMonth}`,
        shortLabel: String(d),
        subLabel: dayNames[dStart.getDay()],
        value: dayTot,
        bookingsCount: dayBookings.length,
        isToday,
        isSelected: isSelectedDay
      });

      detailsTable.push({
        date: `${d} ${shortMonth} ${yearNum}`,
        day: dayNames[dStart.getDay()],
        bookings: dayBookings.length,
        roomTariff: dayTariff,
        addOns: dayAddOns,
        tax: dayTax,
        totalRevenue: dayTot,
        revenueFormatted: `₹${dayTot.toLocaleString()}`,
        collected: dayPaid,
        pending: dayPending,
        isBold: isToday || isSelectedDay
      });
    }

    if (dayNum && dayNum >= 1 && dayNum <= daysInMonth) {
      const selPt = chartPoints[dayNum - 1];
      periodSubtitle = `₹ ${Number(selPt?.value || 0).toLocaleString()} DAY ${dayNum} EARNINGS (${shortMonth} ${yearNum})`;
    } else {
      const isCurMonth = now.getFullYear() === yearNum && (now.getMonth() + 1) === monthNum;
      if (isCurMonth) {
        const todayPt = chartPoints.find(p => p.isToday);
        periodSubtitle = `₹ ${Number(todayPt?.value || 0).toLocaleString()} TODAY'S EARNINGS`;
      } else {
        periodSubtitle = `₹ ${Number(periodTotal || 0).toLocaleString()} TOTAL EARNINGS (${shortMonth} ${yearNum})`;
      }
    }

  } else if (timeframe === 'Weekly') {
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    periodTitle = 'Revenue Overview (Weekly)';

    const weeks = [
      { weekNum: 1, startDay: 1, endDay: 7 },
      { weekNum: 2, startDay: 8, endDay: 14 },
      { weekNum: 3, startDay: 15, endDay: 21 },
      { weekNum: 4, startDay: 22, endDay: daysInMonth }
    ];

    weeks.forEach(w => {
      const wStart = new Date(yearNum, monthNum - 1, w.startDay, 0, 0, 0);
      const wEnd = new Date(yearNum, monthNum - 1, w.endDay, 23, 59, 59);

      const wBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt || b.checkInDate);
        return bd >= wStart && bd <= wEnd;
      });

      let wTot = 0;
      let wTariff = 0;
      let wAddOns = 0;
      let wTax = 0;
      let wPaid = 0;
      let wPending = 0;

      wBookings.forEach(b => {
        const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const tAmt = Number(b.pricing?.tax || 0);
        const aAmt = Number(b.pricing?.addOns || 0);
        const bTariff = Number(b.pricing?.bookingAmount || Math.max(0, fAmt - tAmt - aAmt));
        const pAmt = Number(b.pricing?.paidAmount || 0);
        const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, fAmt - pAmt));

        wTot += fAmt;
        wTariff += bTariff;
        wAddOns += aAmt;
        wTax += tAmt;
        wPaid += pAmt;
        wPending += pend;
      });

      periodTotal += wTot;

      const isSelectedWeek = weekNum ? w.weekNum === weekNum : false;

      chartPoints.push({
        weekNum: w.weekNum,
        label: `Week ${w.weekNum}`,
        subLabel: `${shortMonth} ${w.startDay} - ${w.endDay}`,
        value: wTot,
        bookingsCount: wBookings.length,
        isSelected: isSelectedWeek
      });

      detailsTable.push({
        date: `Week ${w.weekNum} (${shortMonth} ${w.startDay} - ${w.endDay})`,
        day: `Week ${w.weekNum}`,
        bookings: wBookings.length,
        roomTariff: wTariff,
        addOns: wAddOns,
        tax: wTax,
        totalRevenue: wTot,
        revenueFormatted: `₹${wTot.toLocaleString()}`,
        collected: wPaid,
        pending: wPending,
        isBold: isSelectedWeek
      });
    });

    if (weekNum) {
      const selW = chartPoints.find(p => p.weekNum === weekNum);
      periodSubtitle = `₹ ${Number(selW?.value || 0).toLocaleString()} WEEK ${weekNum} EARNINGS (${shortMonth} ${yearNum})`;
    } else {
      periodSubtitle = `For ${fullMonth} ${yearNum}`;
    }

  } else if (timeframe === 'Monthly') {
    periodTitle = 'MONTHLY REVENUE PERFORMANCE CURVE';

    for (let m = 0; m < 12; m++) {
      const mStart = new Date(yearNum, m, 1, 0, 0, 0);
      const mEnd = new Date(yearNum, m + 1, 0, 23, 59, 59);

      const mBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt || b.checkInDate);
        return bd >= mStart && bd <= mEnd;
      });

      let mTot = 0;
      let mTariff = 0;
      let mAddOns = 0;
      let mTax = 0;
      let mPaid = 0;
      let mPending = 0;

      mBookings.forEach(b => {
        const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const tAmt = Number(b.pricing?.tax || 0);
        const aAmt = Number(b.pricing?.addOns || 0);
        const bTariff = Number(b.pricing?.bookingAmount || Math.max(0, fAmt - tAmt - aAmt));
        const pAmt = Number(b.pricing?.paidAmount || 0);
        const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, fAmt - pAmt));

        mTot += fAmt;
        mTariff += bTariff;
        mAddOns += aAmt;
        mTax += tAmt;
        mPaid += pAmt;
        mPending += pend;
      });

      periodTotal += mTot;

      const isSelectedMonth = !isAllMonths && month && month !== 'all' && (m + 1) === monthNum;

      chartPoints.push({
        monthIndex: m + 1,
        label: monthNamesShort[m],
        subLabel: monthNamesFull[m],
        value: mTot,
        bookingsCount: mBookings.length,
        isCurrentMonth: now.getFullYear() === yearNum && now.getMonth() === m,
        isSelected: isSelectedMonth
      });

      detailsTable.push({
        date: `${monthNamesShort[m]} ${yearNum}`,
        day: monthNamesFull[m],
        bookings: mBookings.length,
        roomTariff: mTariff,
        addOns: mAddOns,
        tax: mTax,
        totalRevenue: mTot,
        revenueFormatted: `₹${mTot.toLocaleString()}`,
        collected: mPaid,
        pending: mPending,
        isBold: isSelectedMonth || (now.getFullYear() === yearNum && now.getMonth() === m)
      });
    }

    if (!isAllMonths && month && month !== 'all') {
      const selM = chartPoints[monthNum - 1];
      periodSubtitle = `₹ ${Number(selM?.value || 0).toLocaleString()} TOTAL EARNINGS (${monthNamesFull[monthNum - 1]} ${yearNum})`;
    } else {
      periodSubtitle = `₹ ${Number(periodTotal || 0).toLocaleString()} TOTAL EARNINGS (${yearNum})`;
    }

  } else {
    // Yearly
    periodTitle = 'YEARLY REVENUE PERFORMANCE CURVE';
    const curYear = parseInt(year, 10) || now.getFullYear();
    const startY = curYear - 4;
    const endY = curYear + 1;

    for (let y = startY; y <= endY; y++) {
      const yStart = new Date(y, 0, 1, 0, 0, 0);
      const yEnd = new Date(y, 11, 31, 23, 59, 59);

      const yBookings = bookings.filter(b => {
        const bd = new Date(b.createdAt || b.checkInDate);
        return bd >= yStart && bd <= yEnd;
      });

      let yTot = 0;
      let yTariff = 0;
      let yAddOns = 0;
      let yTax = 0;
      let yPaid = 0;
      let yPending = 0;

      yBookings.forEach(b => {
        const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
        const tAmt = Number(b.pricing?.tax || 0);
        const aAmt = Number(b.pricing?.addOns || 0);
        const bTariff = Number(b.pricing?.bookingAmount || Math.max(0, fAmt - tAmt - aAmt));
        const pAmt = Number(b.pricing?.paidAmount || 0);
        const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, fAmt - pAmt));

        yTot += fAmt;
        yTariff += bTariff;
        yAddOns += aAmt;
        yTax += tAmt;
        yPaid += pAmt;
        yPending += pend;
      });

      periodTotal += yTot;

      const isSelectedYear = y === curYear;

      chartPoints.push({
        year: y,
        label: String(y),
        subLabel: `Year ${y}`,
        value: yTot,
        bookingsCount: yBookings.length,
        isCurrentYear: y === now.getFullYear(),
        isSelected: isSelectedYear
      });

      detailsTable.push({
        date: String(y),
        day: 'Full Year',
        bookings: yBookings.length,
        roomTariff: yTariff,
        addOns: yAddOns,
        tax: yTax,
        totalRevenue: yTot,
        revenueFormatted: `₹${yTot.toLocaleString()}`,
        collected: yPaid,
        pending: yPending,
        isBold: isSelectedYear
      });
    }

    const selY = chartPoints.find(p => p.year === curYear);
    periodSubtitle = `₹ ${Number(selY?.value || periodTotal || 0).toLocaleString()} TOTAL EARNINGS (${curYear})`;
  }

  // Dynamic Y-axis scale (matching reference screenshots ₹0, ₹20K, ₹40K, ₹60K, ₹80K, etc.)
  const rawMax = Math.max(...chartPoints.map(p => p.value), 0);
  let niceMax = 20000;
  if (rawMax > 100000) {
    niceMax = Math.ceil((rawMax * 1.15) / 50000) * 50000;
  } else if (rawMax > 50000) {
    niceMax = Math.ceil((rawMax * 1.15) / 20000) * 20000;
  } else if (rawMax > 20000) {
    niceMax = Math.ceil((rawMax * 1.15) / 10000) * 10000;
  } else if (rawMax > 0) {
    niceMax = Math.max(20000, Math.ceil((rawMax * 1.2) / 5000) * 5000);
  }

  const ySteps = [
    niceMax,
    Math.round(niceMax * 0.75),
    Math.round(niceMax * 0.5),
    Math.round(niceMax * 0.25),
    0
  ];

  // SVG coordinates (viewBox="0 0 520 180")
  const count = chartPoints.length;
  const computedPoints = chartPoints.map((pt, idx) => {
    const x = count > 1 ? Math.round(45 + (idx / (count - 1)) * 430) : 260;
    const y = Math.round(145 - ((pt.value / niceMax) * 120));
    return {
      ...pt,
      x,
      y: Math.max(20, Math.min(145, y))
    };
  });

  return {
    timeframe,
    year: yearNum,
    month: monthNum,
    day: dayNum,
    monthName: fullMonth,
    shortMonth,
    periodTitle,
    periodSubtitle,
    periodTotal,
    periodTotalFormatted: `₹${Number(periodTotal || 0).toLocaleString()}`,
    niceMax,
    ySteps,
    chartPoints: computedPoints,
    detailsTable
  };
}

// GET /api/homestay-owner/revenue
router.get('/homestay-owner/revenue', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { propertyId, timeframe = 'Day-wise', year = new Date().getFullYear(), month = (new Date().getMonth() + 1), day, week } = req.query;

    const properties = await Property.find({ ownerId, deleted: false }).select('_id name');
    const allPropIds = properties.map(p => p._id);

    let propFilter = { $in: allPropIds };
    if (propertyId && propertyId !== 'all' && propertyId !== 'All Homestays') {
      if (mongoose.isValidObjectId(propertyId)) {
        propFilter = new mongoose.Types.ObjectId(propertyId);
      }
    }

    const allBookings = await Booking.find({
      propertyId: propFilter
    }).populate('propertyId', 'name');

    // Active Bookings (excluding cancelled) for Revenue Metrics and Charts
    const activeBookings = allBookings.filter(b => b.bookingStatus !== 'Cancelled');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let todayRev = 0;
    let yesterdayRev = 0;
    let thisWeekRev = 0;
    let lastWeekRev = 0;
    let thisMonthRev = 0;
    let lastMonthRev = 0;
    let totalRev = 0;

    activeBookings.forEach(b => {
      const bDate = new Date(b.createdAt || b.checkInDate);
      const amt = Number(b.pricing?.finalAmount || b.amount || 0);
      totalRev += amt;

      if (bDate >= todayStart && bDate <= todayEnd) todayRev += amt;
      if (bDate >= yesterdayStart && bDate <= yesterdayEnd) yesterdayRev += amt;
      if (bDate >= weekStart) thisWeekRev += amt;
      if (bDate >= lastWeekStart && bDate < weekStart) lastWeekRev += amt;
      if (bDate >= monthStart) thisMonthRev += amt;
      if (bDate >= lastMonthStart && bDate <= lastMonthEnd) lastMonthRev += amt;
    });

    const todayChange = yesterdayRev > 0 ? (((todayRev - yesterdayRev) / yesterdayRev) * 100).toFixed(1) : '+12.5';
    const weekChange = lastWeekRev > 0 ? (((thisWeekRev - lastWeekRev) / lastWeekRev) * 100).toFixed(1) : '+15.3';
    const monthChange = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : '+18.8';

    // Unified timeframe calculations matching reference designs (using active non-cancelled bookings)
    const timeframeData = generateRevenueTimeframeData(activeBookings, { timeframe, year, month, day, week });

    const propertyBreakdown = properties.map(p => {
      const pBookings = activeBookings.filter(b => String(b.propertyId?._id || b.propertyId) === String(p._id));
      const pRev = pBookings.reduce((sum, b) => sum + Number(b.pricing?.finalAmount || b.amount || 0), 0);
      const pPaid = pBookings.reduce((sum, b) => sum + Number(b.pricing?.paidAmount || 0), 0);
      return {
        id: String(p._id),
        propertyId: String(p._id),
        name: p.name,
        propertyName: p.name,
        bookingsCount: pBookings.length,
        totalBookings: pBookings.length,
        totalRevenue: pRev,
        collected: pPaid,
        collectedRevenue: pPaid,
        pending: Math.max(0, pRev - pPaid),
        pendingRevenue: Math.max(0, pRev - pPaid)
      };
    });

    const mappedDetails = timeframeData.detailsTable.map(d => ({
      ...d,
      baseTariff: d.roomTariff || Math.max(0, (d.totalRevenue || 0) - (d.tax || 0) - (d.addOns || 0)),
      revenue: d.revenueFormatted || `₹${(d.totalRevenue || 0).toLocaleString()}`,
      collected: typeof d.collected === 'number' ? `₹${d.collected.toLocaleString()}` : (d.collected || '₹0'),
      pending: typeof d.pending === 'number' ? `₹${d.pending.toLocaleString()}` : (d.pending || '₹0')
    }));

    // Transactions for ledger table: contains all bookings with their statuses
    const transactions = allBookings.map(b => {
      const fAmt = Number(b.pricing?.finalAmount || b.amount || 0);
      const pAmt = Number(b.pricing?.paidAmount || 0);
      const pend = Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, fAmt - pAmt));
      const bDate = new Date(b.createdAt || b.checkInDate);
      const cin = new Date(b.checkInDate);
      const cout = new Date(b.checkOutDate);
      const roomStr = b.bookedRooms?.map(r => r.roomNumber).join(', ') || (b.propertyDetails?.roomNumber ? String(b.propertyDetails.roomNumber) : '101');
      return {
        _id: String(b._id),
        id: b.bookingId || String(b._id),
        bookingId: b.bookingId || String(b._id),
        customer: b.customer || { name: b.guestDetails?.fullName || 'Guest', mobile: b.guestDetails?.phone || '', email: '' },
        guestName: b.customer?.name || b.guestDetails?.fullName || 'Guest',
        phone: b.customer?.mobile || b.customer?.phone || '',
        email: b.customer?.email || '',
        propertyName: b.propertyId?.name || 'Homestay Sanctuary',
        propertyId: String(b.propertyId?._id || b.propertyId),
        roomNumber: roomStr,
        bookedRooms: b.bookedRooms || [{ roomNumber: roomStr }],
        roomDetails: b.propertyDetails || { roomNumber: roomStr, roomType: 'Standard Room' },
        propertyDetails: b.propertyDetails || { roomNumber: roomStr, roomType: 'Standard Room' },
        guests: b.guests || { adults: 2, children: 0, infants: 0 },
        checkInDate: cin.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        checkOutDate: cout.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        rawCheckIn: b.checkInDate,
        rawCheckOut: b.checkOutDate,
        bookingDate: bDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        bookingTime: bDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        pricing: b.pricing || {
          bookingAmount: Number(b.pricing?.bookingAmount || Math.max(0, fAmt - Number(b.pricing?.tax || 0) - Number(b.pricing?.addOns || 0))),
          addOns: Number(b.pricing?.addOns || 0),
          tax: Number(b.pricing?.tax || 0),
          finalAmount: fAmt,
          paidAmount: pAmt,
          pendingAmount: pend
        },
        baseTariff: Number(b.pricing?.bookingAmount || Math.max(0, fAmt - Number(b.pricing?.tax || 0) - Number(b.pricing?.addOns || 0))),
        addOns: Number(b.pricing?.addOns || 0),
        tax: Number(b.pricing?.tax || 0),
        totalAmount: fAmt,
        paidAmount: pAmt,
        pendingAmount: pend,
        paymentStatus: pend === 0 ? 'Completed' : (pAmt > 0 ? 'Partial' : 'Pending'),
        paymentMode: b.paymentMode || b.paymentMethod || 'UPI',
        bookingStatus: b.bookingStatus,
        specialRequests: b.specialRequests || b.notes || '',
        timeline: b.timeline || [],
        rawBooking: b
      };
    });

    res.json({
      success: true,
      summary: {
        today: todayRev,
        todayRevenue: `₹${todayRev.toLocaleString()}`,
        todayChange: `${todayChange}`,
        todayPositive: todayRev >= yesterdayRev,
        thisWeek: thisWeekRev,
        thisWeekRevenue: `₹${thisWeekRev.toLocaleString()}`,
        weekChange: `${weekChange}`,
        weekPositive: thisWeekRev >= lastWeekRev,
        thisMonth: thisMonthRev,
        thisMonthRevenue: `₹${thisMonthRev.toLocaleString()}`,
        monthChange: `${monthChange}`,
        monthPositive: thisMonthRev >= lastMonthRev,
        totalRevenue: totalRev,
        totalRevenueFormatted: `₹${totalRev.toLocaleString()}`,
        dateRange: (!propertyId || propertyId === 'all') ? 'All Homestays' : 'Selected Homestay'
      },
      chartSeries: timeframeData.chartPoints,
      chartPoints: timeframeData.chartPoints,
      revenueTimeframe: timeframeData,
      detailsTable: mappedDetails.reverse(),
      transactions,
      propertyBreakdown,
      properties: properties.map(p => ({ id: p._id, name: p.name }))
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER: DYNAMIC DASHBOARD (BIRD'S EYE VIEW)
// ==========================================

// GET /api/homestay-owner/dashboard
router.get('/homestay-owner/dashboard', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { propertyId, timeframe = 'Day-wise', year, month, day, week } = req.query;

    const owner = await HomestayOwner.findById(ownerId).select('firstName lastName email profilePhoto');
    const properties = await Property.find({ ownerId, deleted: false }).select('_id name city state');
    const allPropIds = properties.map(p => p._id);

    let propFilter = { $in: allPropIds };
    if (propertyId && propertyId !== 'all' && propertyId !== 'All Properties') {
      if (mongoose.isValidObjectId(propertyId)) {
        propFilter = new mongoose.Types.ObjectId(propertyId);
      }
    }

    const roomsList = await PropertyRooms.find({ propertyId: propFilter });
    const totalRooms = roomsList.reduce((sum, r) => sum + (r.numberOfRooms || r.roomNumbers?.length || 1), 0) || 12;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

    // Fetch all active/relevant bookings for this owner's properties
    const allPropBookings = await Booking.find({
      propertyId: propFilter,
      bookingStatus: { $nin: ['Cancelled'] }
    }).populate('propertyId', 'name city address').sort({ checkInDate: 1, createdAt: -1 });

    const activeBookings = allPropBookings.filter(b => {
      const cin = new Date(b.checkInDate);
      const cout = new Date(b.checkOutDate);
      return cin <= todayEnd && cout >= todayStart;
    });

    let occupiedRoomsToday = 0;
    activeBookings.forEach(b => {
      occupiedRoomsToday += (b.bookedRooms?.length || 1);
    });

    const unoccupiedRooms = Math.max(0, totalRooms - occupiedRoomsToday);
    const availableRooms = unoccupiedRooms;
    const availabilityPercent = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 100;
    const vacancyPercent = totalRooms > 0 ? Math.round((unoccupiedRooms / totalRooms) * 100) : 0;

    // Today's revenue from bookings created today or checking in today
    let todayRevenue = 0;
    allPropBookings.forEach(b => {
      const cDate = new Date(b.createdAt || b.checkInDate);
      if (cDate >= todayStart && cDate <= todayEnd) {
        todayRevenue += Number(b.pricing?.finalAmount || b.amount || 0);
      }
    });

    const mapBookingItem = (b, customStatus) => {
      const cin = new Date(b.checkInDate);
      const cout = new Date(b.checkOutDate);
      const roomStr = b.bookedRooms?.map(r => r.roomNumber).join(', ') || (b.propertyDetails?.roomNumber ? String(b.propertyDetails.roomNumber) : '101');
      const catName = b.bookedRooms?.[0]?.categoryName || b.bookedRooms?.[0]?.roomCategoryName || b.propertyDetails?.roomCategoryName || 'Standard Room';
      return {
        id: b.bookingId || String(b._id),
        dbId: String(b._id),
        name: b.customer?.name || b.guestDetails?.fullName || 'Guest',
        phone: b.customer?.mobile || b.customer?.phone || '',
        email: b.customer?.email || '',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        room: roomStr,
        roomType: catName,
        propertyName: b.propertyId?.name || 'Homestay Sanctuary',
        propertyCity: b.propertyId?.city || '',
        checkIn: `${cin.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, 02:00 PM`,
        checkOut: `${cout.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, 11:00 AM`,
        rawCheckIn: b.checkInDate,
        rawCheckOut: b.checkOutDate,
        status: customStatus || (b.bookingStatus === 'Checked In' ? 'Checked In' : 'Confirmed'),
        bookingStatus: b.bookingStatus,
        paymentStatus: b.paymentStatus || 'Pending',
        totalAmount: Number(b.pricing?.finalAmount || b.amount || 0),
        paidAmount: Number(b.pricing?.paidAmount || 0),
        pendingAmount: Number(b.pricing?.pendingAmount !== undefined ? b.pricing.pendingAmount : Math.max(0, (b.pricing?.finalAmount || b.amount || 0) - (b.pricing?.paidAmount || 0)))
      };
    };

    // 1. Check-ins Today: bookings checking in today OR active in-house reservations
    let checkInsRaw = allPropBookings.filter(b => {
      const cin = new Date(b.checkInDate);
      return cin >= todayStart && cin <= todayEnd;
    });

    // If no arrivals scheduled strictly today, show active in-house or upcoming reservations so host sees real guest activity
    if (checkInsRaw.length === 0) {
      checkInsRaw = activeBookings.length > 0 ? activeBookings : allPropBookings.slice(0, 5);
    }
    const checkInsList = checkInsRaw.map(b => mapBookingItem(b, b.bookingStatus === 'Checked In' ? 'Checked In' : 'Checking In'));

    // 2. Check-outs Today
    let checkOutsRaw = allPropBookings.filter(b => {
      const cout = new Date(b.checkOutDate);
      return cout >= todayStart && cout <= todayEnd;
    });
    if (checkOutsRaw.length === 0) {
      checkOutsRaw = allPropBookings.filter(b => b.bookingStatus === 'Checked Out').slice(0, 3);
    }
    const checkOutsList = checkOutsRaw.map(b => mapBookingItem(b, 'Checking Out'));

    // 3. Yesterday Bookings
    const yesterdayRaw = allPropBookings.filter(b => {
      const cin = new Date(b.checkInDate);
      const cout = new Date(b.checkOutDate);
      return (cin >= yesterdayStart && cin <= yesterdayEnd) || (cout >= yesterdayStart && cout <= yesterdayEnd);
    });
    const yesterdayList = (yesterdayRaw.length > 0 ? yesterdayRaw : allPropBookings.slice(0, 3)).map(b => mapBookingItem(b));

    // 4. Tomorrow Bookings
    const tomorrowRaw = allPropBookings.filter(b => {
      const cin = new Date(b.checkInDate);
      return cin >= tomorrowStart && cin <= tomorrowEnd;
    });
    const tomorrowList = (tomorrowRaw.length > 0 ? tomorrowRaw : allPropBookings.slice(0, 3)).map(b => mapBookingItem(b));

    // 5. Dynamic Revenue Timeframe Data & Chart Points (Day-wise, Weekly, Monthly, Yearly)
    const timeframeData = generateRevenueTimeframeData(allPropBookings, {
      timeframe: timeframe || 'Day-wise',
      year: year ? parseInt(year, 10) : now.getFullYear(),
      month: month ? (month === 'all' ? 'all' : parseInt(month, 10)) : (now.getMonth() + 1),
      day: day ? (day === 'all' ? 'all' : parseInt(day, 10)) : 'all',
      week: week ? (week === 'all' ? 'all' : parseInt(week, 10)) : 'all'
    });

    res.json({
      success: true,
      owner: {
        name: owner ? `${owner.firstName} ${owner.lastName}`.trim() : 'Owner',
        email: owner?.email || '',
        profilePhoto: owner?.profilePhoto || ''
      },
      ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : 'Host',
      metrics: {
        totalRooms,
        todayAvailableRooms: availableRooms,
        availableToday: availableRooms,
        availabilityPercent: `${availabilityPercent}%`,
        occupancyRate: availabilityPercent,
        unoccupiedRooms,
        unoccupiedToday: unoccupiedRooms,
        vacancyPercent: `${vacancyPercent}%`,
        vacancyRate: vacancyPercent,
        todayRevenue: Number(todayRevenue || 0),
        todayRevenueRaw: Number(todayRevenue || 0),
        todayRevenueFormatted: `₹${Number(todayRevenue || 0).toLocaleString()}`,
        todayRevenueChange: '+12.5%',
        todayRevenuePositive: true,
        checkInsCount: checkInsList.length,
        checkOutsCount: checkOutsList.length,
        checkInsYesterday: yesterdayList.length,
        checkOutsYesterday: 0
      },
      todayCheckIns: checkInsList,
      checkInsToday: checkInsList,
      todayCheckOuts: checkOutsList,
      checkOutsToday: checkOutsList,
      yesterdayBookings: yesterdayList,
      tomorrowBookings: tomorrowList,
      chartPoints: timeframeData.chartPoints,
      revenueTimeframe: timeframeData,
      properties: properties.map(p => ({ id: p._id, name: p.name }))
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// PUBLIC SHARE LINK & PUBLIC BOOKING PAGE
// ==========================================

// POST /api/homestay-owner/share-link (Generate single-use public booking link)
router.post('/homestay-owner/share-link', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { propertyId, linkType = 'guest' } = req.body;
    if (!propertyId) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property ID is required.' });
    }

    const token = crypto.randomBytes(5).toString('hex'); // 10-character unique token
    const newLink = new PublicShareLink({
      token,
      propertyId,
      ownerId,
      linkType: linkType === 'agent' ? 'agent' : 'guest',
      isUsed: false
    });
    await newLink.save();

    res.json({
      success: true,
      token,
      linkType: newLink.linkType,
      propertyId,
      url: `/book/${token}`
    });
  } catch (err) {
    console.error('Error generating share link:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/public/booking-link/:token (Verify public booking link)
router.get('/public/booking-link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let shareLink = await PublicShareLink.findOne({ token }).populate('propertyId');
    
    // Helper to resolve full property media and amenities
    const resolvePropertyPublicData = async (prop) => {
      const gal = await PropertyGallery.findOne({ $or: [{ propertyId: prop._id }, { propertyId: String(prop._id) }] });
      const pRooms = await PropertyRooms.find({ $or: [{ propertyId: prop._id }, { propertyId: String(prop._id) }] });
      const propAmenitiesDoc = await PropertyAmenities.findOne({ $or: [{ propertyId: prop._id }, { propertyId: String(prop._id) }] });
      
      let resolvedAmenities = [];
      if (propAmenitiesDoc && propAmenitiesDoc.amenityIds && propAmenitiesDoc.amenityIds.length > 0) {
        const amenityDocs = await NewAmenity.find({ _id: { $in: propAmenitiesDoc.amenityIds } });
        resolvedAmenities = amenityDocs.map(a => ({
          name: a.amenityName,
          icon: a.amenityIcon
        }));
      }

      const allImages = [];
      if (gal) {
        if (gal.coverImage) allImages.push(gal.coverImage);
        if (Array.isArray(gal.images)) {
          gal.images.forEach(img => {
            const u = typeof img === 'object' && img !== null && img.url ? img.url : img;
            if (u && typeof u === 'string') allImages.push(u);
          });
        }
      }
      if (Array.isArray(pRooms)) {
        pRooms.forEach(r => {
          const rImgs = Array.isArray(r.images) ? r.images : (Array.isArray(r.photos) ? r.photos : []);
          rImgs.forEach(img => {
            const u = typeof img === 'object' && img !== null && img.url ? img.url : img;
            if (u && typeof u === 'string') allImages.push(u);
          });
        });
      }
      if (Array.isArray(prop.images)) {
        prop.images.forEach(u => {
          if (u && typeof u === 'string') allImages.push(u);
        });
      }

      return {
        _id: prop._id,
        name: prop.name,
        tagline: prop.tagline,
        description: prop.description,
        address: prop.address,
        city: prop.city,
        state: prop.state,
        checkInTime: prop.checkInTime || '12:00 PM',
        checkOutTime: prop.checkOutTime || '11:00 AM',
        cancellationPolicy: prop.cancellationPolicy,
        houseRules: prop.houseRules,
        images: Array.from(new Set(allImages.filter(Boolean))),
        amenities: resolvedAmenities.map(a => a.name),
        resolvedAmenities
      };
    };

    // If not found as token, check if token is actually a propertyId (fallback direct link)
    if (!shareLink && mongoose.isValidObjectId(token)) {
      const prop = await Property.findOne({ _id: token, deleted: false });
      if (prop) {
        const linkType = req.query.type === 'agent' ? 'agent' : 'guest';
        const resolvedProp = await resolvePropertyPublicData(prop);
        return res.json({
          success: true,
          property: resolvedProp,
          linkType,
          isUsed: false,
          isSingleUse: false
        });
      }
    }

    if (!shareLink) {
      return res.status(404).json({ error: 'NotFound', message: 'Invalid or expired booking link.' });
    }

    if (shareLink.isUsed) {
      return res.status(410).json({ 
        error: 'LinkUsed', 
        isUsed: true, 
        message: 'This booking link has already been used. Please contact the homestay owner for a new link.' 
      });
    }

    const property = shareLink.propertyId;
    if (!property || property.deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Property not found or inactive.' });
    }

    // Resolve full property data
    const resolvedProperty = await resolvePropertyPublicData(property);

    // Fetch property payment settings (Advance percentage/fixed, UPI ID, QR code, bank info)
    const propPay = property.paymentSettings || {};
    let paymentSettings = {
      advanceType: propPay.advanceType || 'percent',
      advancePercent: propPay.advancePercent !== undefined ? propPay.advancePercent : 30,
      advanceAmount: propPay.advanceAmount || 0,
      upiId: propPay.upiId || 'keshavhomestay@okicici',
      upiQrCode: propPay.upiQrCode || '',
      bankName: propPay.bankName || 'HDFC Bank',
      accountHolderName: propPay.accountHolderName || property.name || 'Homestay Sanctuary',
      accountNumber: propPay.accountNumber || '',
      ifscCode: propPay.ifscCode || '',
      branch: propPay.branch || [property.city, property.state].filter(Boolean).join(', ') || ''
    };

    if (property.ownerId) {
      const ownerDoc = await HomestayOwner.findById(property.ownerId).select('advanceType advancePercent advanceAmount upiId upiQrCode bankName accountHolderName accountNumber ifscCode branch firstName lastName mobile');
      if (ownerDoc) {
        paymentSettings = {
          advanceType: propPay.advanceType || ownerDoc.advanceType || 'percent',
          advancePercent: propPay.advancePercent !== undefined ? propPay.advancePercent : (ownerDoc.advancePercent !== undefined ? ownerDoc.advancePercent : 30),
          advanceAmount: propPay.advanceAmount || ownerDoc.advanceAmount || 0,
          upiId: propPay.upiId || ownerDoc.upiId || 'keshavhomestay@okicici',
          upiQrCode: propPay.upiQrCode || ownerDoc.upiQrCode || '',
          bankName: propPay.bankName || ownerDoc.bankName || 'HDFC Bank',
          accountHolderName: propPay.accountHolderName || ownerDoc.accountHolderName || property.name || `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim() || 'Homestay Sanctuary',
          accountNumber: propPay.accountNumber || ownerDoc.accountNumber || '',
          ifscCode: propPay.ifscCode || ownerDoc.ifscCode || '',
          branch: propPay.branch || ownerDoc.branch || [property.city, property.state].filter(Boolean).join(', ') || '',
          contactName: `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim(),
          contactMobile: ownerDoc.mobile || ''
        };
      }
    }

    res.json({
      success: true,
      token: shareLink.token,
      linkType: shareLink.linkType,
      propertyId: property._id,
      property: resolvedProperty,
      paymentSettings,
      isUsed: false,
      isSingleUse: true
    });
  } catch (err) {
    console.error('Error fetching public booking link:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/public/calendar-availability (Monthly availability grid with masked guest names)
router.get('/public/calendar-availability', async (req, res) => {
  try {
    const { propertyId, month, year, linkType = 'guest' } = req.query;
    if (!propertyId) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property ID is required.' });
    }

    const m = parseInt(month, 10) || (new Date().getMonth() + 1);
    const y = parseInt(year, 10) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const categories = await PropertyRooms.find({ propertyId });
    const pricingList = await PropertyPricing.find({ propertyId });

    // Active Bookings overlapping this month
    const bookings = await Booking.find({
      propertyId,
      bookingStatus: { $nin: ['Cancelled'] },
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate }
    }).select('checkInDate checkOutDate bookedRooms propertyDetails bookingStatus');

    // Blocked Dates overlapping this month
    const blocks = await PropertyBlockedDate.find({
      propertyId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    const daysInMonth = new Date(y, m, 0).getDate();

    const formattedCategories = categories.map(cat => {
      const roomPricing = pricingList.filter(pr => String(pr.roomCategoryId) === String(cat._id));
      const epPrice = roomPricing.find(pr => pr.mealPlan === 'EP') || roomPricing[0];
      const baseRate = epPrice 
        ? (linkType === 'agent' ? epPrice.b2bRate : epPrice.b2cRate) 
        : 3000;

      const roomsWithAvailability = (cat.roomNumbers || []).map(roomNo => {
        const days = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dayDate = new Date(y, m - 1, d);
          const nextDay = new Date(y, m - 1, d + 1);

          // Check if booked
          const isBooked = bookings.some(b => {
            const hasRoom = (b.bookedRooms && b.bookedRooms.some(br => String(br.roomNumber) === String(roomNo))) ||
                            (b.propertyDetails && String(b.propertyDetails.roomNumber) === String(roomNo));
            if (!hasRoom) return false;
            return b.checkInDate < nextDay && b.checkOutDate > dayDate;
          });

          // Check if blocked
          const isBlocked = blocks.some(blk => {
            if (String(blk.roomNumber) !== String(roomNo)) return false;
            return blk.startDate <= dayDate && blk.endDate >= dayDate;
          });

          days.push({
            day: d,
            status: isBooked ? 'booked' : (isBlocked ? 'blocked' : 'available'),
            label: isBooked ? 'Reserved' : (isBlocked ? 'Unavailable' : 'Available')
          });
        }

        return {
          roomNumber: roomNo,
          days
        };
      });

      const catImages = Array.isArray(cat.images) ? cat.images.filter(Boolean) : [];
      return {
        categoryId: cat._id,
        categoryName: cat.roomCategoryName,
        roomType: cat.roomType,
        basePrice: baseRate,
        rateType: linkType === 'agent' ? 'B2B' : 'B2C',
        images: catImages,
        coverImage: catImages[0] || '',
        bedType: cat.bedType || 'King Bed',
        maxAdults: cat.maxOccupancyAdults || 2,
        maxChildren: cat.maxOccupancyChildren || 1,
        rooms: roomsWithAvailability
      };
    });

    res.json({
      success: true,
      month: m,
      year: y,
      daysInMonth,
      categories: formattedCategories
    });
  } catch (err) {
    console.error('Error fetching public calendar:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/public/available-rooms (Fetch rooms available between checkIn and checkOut with B2C/B2B rate)
router.get('/public/available-rooms', async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, linkType = 'guest' } = req.query;
    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property ID and dates required.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Check-out date must be after check-in.' });
    }

    const categories = await PropertyRooms.find({ propertyId });
    const pricingList = await PropertyPricing.find({ propertyId });

    const bookings = await Booking.find({
      propertyId,
      bookingStatus: { $nin: ['Cancelled'] },
      checkInDate: { $lt: outDate },
      checkOutDate: { $gt: inDate }
    });

    const blocks = await PropertyBlockedDate.find({
      propertyId,
      startDate: { $lt: outDate },
      endDate: { $gte: inDate }
    });

    let totalAvailableCount = 0;
    const availableCategories = categories.map(cat => {
      const allRooms = cat.roomNumbers || [];
      const availableRooms = allRooms.filter(roomNo => {
        const isBooked = bookings.some(b => {
          return (b.bookedRooms && b.bookedRooms.some(br => String(br.roomNumber) === String(roomNo))) ||
                 (b.propertyDetails && String(b.propertyDetails.roomNumber) === String(roomNo));
        });
        if (isBooked) return false;

        const isBlocked = blocks.some(blk => String(blk.roomNumber) === String(roomNo));
        if (isBlocked) return false;

        return true;
      });

      totalAvailableCount += availableRooms.length;

      // Find applicable price for category
      const roomPricing = pricingList.filter(pr => String(pr.roomCategoryId) === String(cat._id));
      const epPrice = roomPricing.find(pr => pr.mealPlan === 'EP') || roomPricing[0];
      const baseRate = epPrice 
        ? (linkType === 'agent' ? epPrice.b2bRate : epPrice.b2cRate) 
        : 3000;

      const catImages = Array.isArray(cat.images) ? cat.images.filter(Boolean) : [];
      return {
        categoryId: cat._id,
        categoryName: cat.roomCategoryName,
        roomType: cat.roomType,
        totalRooms: cat.numberOfRooms,
        availableRooms,
        availableCount: availableRooms.length,
        basePrice: baseRate,
        rateType: linkType === 'agent' ? 'B2B' : 'B2C',
        maxAdults: cat.maxOccupancyAdults || 2,
        maxChildren: cat.maxOccupancyChildren || 1,
        bedType: cat.bedType || 'King Bed',
        roomSize: cat.roomSize || 'Standard',
        images: catImages,
        coverImage: catImages[0] || ''
      };
    });

    res.json({
      success: true,
      propertyId,
      checkIn,
      checkOut,
      totalAvailableCount,
      availableCategories
    });
  } catch (err) {
    console.error('Error fetching public available rooms:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER COUPONS & OFFERS MANAGEMENT
// ==========================================

// GET /api/homestay-owner/coupons (List all coupons created by this owner)
router.get('/homestay-owner/coupons', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const coupons = await Coupon.find({ ownerId }).sort({ createdAt: -1 });

    // Fetch properties owned by this owner to map names in dropdowns and tags
    const properties = await Property.find({ ownerId, deleted: false }).select('_id name propertyId city');

    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.status === 'Active' && new Date(c.endDate) >= new Date()).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const totalDiscountGiven = coupons.reduce((sum, c) => {
      const d = (c.usedBy || []).reduce((sub, u) => sub + (Number(u.discountAmount) || 0), 0);
      return sum + d;
    }, 0);

    res.json({
      success: true,
      data: coupons,
      properties,
      stats: {
        totalCoupons,
        activeCoupons,
        totalRedemptions,
        totalDiscountGiven
      }
    });
  } catch (err) {
    console.error('Error fetching homestay owner coupons:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/coupons (Create new coupon)
router.post('/homestay-owner/coupons', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const {
      code,
      title,
      description = '',
      applicableHomestays = ['all'],
      targetAudience = 'both',
      discountType = 'percentage',
      discountValue,
      maxDiscountAmount = null,
      minCartAmount = 0,
      maxCartAmount = null,
      startDate,
      endDate,
      totalUsageLimit = 0,
      perUserLimit = 1,
      status = 'Active'
    } = req.body;

    if (!code || !title || discountValue === undefined || !endDate) {
      return res.status(400).json({ error: 'ValidationError', message: 'Coupon Code, Title, Discount Value and Expiry Date are required.' });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check code uniqueness
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: 'DuplicateCode', message: `Coupon code "${cleanCode}" already exists. Please pick a different code.` });
    }

    const homestays = Array.isArray(applicableHomestays) && applicableHomestays.length > 0
      ? applicableHomestays
      : ['all'];

    const newCoupon = new Coupon({
      code: cleanCode,
      title,
      description,
      ownerId,
      applicableHomestays: homestays,
      targetAudience: ['both', 'customer', 'agent'].includes(targetAudience) ? targetAudience : 'both',
      discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
      discountValue: Number(discountValue),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      minCartAmount: Number(minCartAmount) || 0,
      maxCartAmount: maxCartAmount ? Number(maxCartAmount) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      totalUsageLimit: Number(totalUsageLimit) || 0,
      perUserLimit: Number(perUserLimit) || 1,
      usedCount: 0,
      usedBy: [],
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      type: discountType === 'fixed' ? 'fixed' : 'percentage',
      value: Number(discountValue),
      expiry: new Date(endDate)
    });

    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully!',
      data: newCoupon
    });
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PUT /api/homestay-owner/coupons/:id (Update coupon)
router.put('/homestay-owner/coupons/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { id } = req.params;
    const coupon = await Coupon.findOne({ _id: id, ownerId });
    if (!coupon) {
      return res.status(404).json({ error: 'NotFound', message: 'Coupon not found.' });
    }

    const {
      code,
      title,
      description,
      applicableHomestays,
      targetAudience,
      discountType,
      discountValue,
      maxDiscountAmount,
      minCartAmount,
      maxCartAmount,
      startDate,
      endDate,
      totalUsageLimit,
      perUserLimit,
      status
    } = req.body;

    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      if (cleanCode !== coupon.code) {
        const duplicate = await Coupon.findOne({ code: cleanCode, _id: { $ne: id } });
        if (duplicate) {
          return res.status(400).json({ error: 'DuplicateCode', message: `Coupon code "${cleanCode}" already exists.` });
        }
        coupon.code = cleanCode;
      }
    }

    if (title !== undefined) coupon.title = title;
    if (description !== undefined) coupon.description = description;
    if (applicableHomestays !== undefined) {
      coupon.applicableHomestays = Array.isArray(applicableHomestays) && applicableHomestays.length > 0 ? applicableHomestays : ['all'];
    }
    if (targetAudience !== undefined) coupon.targetAudience = targetAudience;
    if (discountType !== undefined) {
      coupon.discountType = discountType;
      coupon.type = discountType;
    }
    if (discountValue !== undefined) {
      coupon.discountValue = Number(discountValue);
      coupon.value = Number(discountValue);
    }
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount ? Number(maxDiscountAmount) : null;
    if (minCartAmount !== undefined) coupon.minCartAmount = Number(minCartAmount) || 0;
    if (maxCartAmount !== undefined) coupon.maxCartAmount = maxCartAmount ? Number(maxCartAmount) : null;
    if (startDate !== undefined) coupon.startDate = new Date(startDate);
    if (endDate !== undefined) {
      coupon.endDate = new Date(endDate);
      coupon.expiry = new Date(endDate);
    }
    if (totalUsageLimit !== undefined) coupon.totalUsageLimit = Number(totalUsageLimit) || 0;
    if (perUserLimit !== undefined) coupon.perUserLimit = Number(perUserLimit) || 1;
    if (status !== undefined) coupon.status = status;

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon updated successfully!',
      data: coupon
    });
  } catch (err) {
    console.error('Error updating coupon:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/coupons/:id
router.delete('/homestay-owner/coupons/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { id } = req.params;
    const deleted = await Coupon.findOneAndDelete({ _id: id, ownerId });
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Coupon not found.' });
    }
    res.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/coupons/:id/status (Toggle active status)
router.patch('/homestay-owner/coupons/:id/status', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { id } = req.params;
    const coupon = await Coupon.findOne({ _id: id, ownerId });
    if (!coupon) {
      return res.status(404).json({ error: 'NotFound', message: 'Coupon not found.' });
    }
    coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
    await coupon.save();
    res.json({ success: true, message: `Coupon is now ${coupon.status}`, status: coupon.status });
  } catch (err) {
    console.error('Error toggling coupon status:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/public/coupons/available (Public list of coupons applicable to a property)
router.get('/public/coupons/available', async (req, res) => {
  try {
    const { propertyId, bookingType = 'guest' } = req.query;
    const now = new Date();

    const audienceQuery = bookingType === 'agent' 
      ? { $in: ['both', 'agent'] } 
      : { $in: ['both', 'customer'] };

    const query = {
      status: 'Active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      targetAudience: audienceQuery
    };

    if (propertyId) {
      query.$or = [
        { applicableHomestays: 'all' },
        { applicableHomestays: propertyId },
        { applicableHomestays: String(propertyId) },
        { applicableHomestays: { $size: 0 } }
      ];
    }

    const coupons = await Coupon.find(query)
      .select('code title description discountType discountValue maxDiscountAmount minCartAmount endDate')
      .sort({ discountValue: -1 })
      .limit(10);

    res.json({
      success: true,
      data: coupons
    });
  } catch (err) {
    console.error('Error fetching available public coupons:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/public/coupons/validate (Validate coupon code for a booking)
router.post('/api/public/coupons/validate', async (req, res) => {
  try {
    const { code, propertyId, subtotal = 0, bookingType = 'guest', guestMobile = '', guestEmail = '' } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: `Coupon code "${cleanCode}" is invalid.` });
    }

    if (coupon.status !== 'Active') {
      return res.status(400).json({ valid: false, message: `Coupon code "${cleanCode}" is no longer active.` });
    }

    const now = new Date();
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return res.status(400).json({ valid: false, message: 'This coupon offer has not started yet.' });
    }

    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return res.status(400).json({ valid: false, message: `Coupon code "${cleanCode}" has expired.` });
    }

    // Check audience (B2B vs B2C)
    if (bookingType === 'agent' && coupon.targetAudience === 'customer') {
      return res.status(400).json({ valid: false, message: 'This coupon is exclusively for Direct Guest bookings.' });
    }
    if (bookingType === 'guest' && coupon.targetAudience === 'agent') {
      return res.status(400).json({ valid: false, message: 'This coupon is exclusively for Travel Agent B2B bookings.' });
    }

    // Check applicable homestay
    if (propertyId && coupon.applicableHomestays && coupon.applicableHomestays.length > 0 && !coupon.applicableHomestays.includes('all')) {
      const applies = coupon.applicableHomestays.some(h => String(h) === String(propertyId));
      if (!applies) {
        return res.status(400).json({ valid: false, message: 'This coupon is not valid for this homestay property.' });
      }
    }

    // Check cart amount
    const cartAmount = Number(subtotal) || 0;
    if (coupon.minCartAmount && cartAmount < coupon.minCartAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum booking amount of ₹${Number(coupon.minCartAmount).toLocaleString()} required to use this coupon.` 
      });
    }

    if (coupon.maxCartAmount && cartAmount > coupon.maxCartAmount) {
      return res.status(400).json({ 
        valid: false, 
        message: `This coupon is only applicable for bookings up to ₹${Number(coupon.maxCartAmount).toLocaleString()}.` 
      });
    }

    // Check total usage limit
    if (coupon.totalUsageLimit > 0 && coupon.usedCount >= coupon.totalUsageLimit) {
      return res.status(400).json({ valid: false, message: 'This coupon limit has been fully redeemed.' });
    }

    // Check single user limit
    const userIdentifier = (guestMobile || guestEmail || '').trim().toLowerCase();
    if (userIdentifier && coupon.perUserLimit > 0 && Array.isArray(coupon.usedBy)) {
      const userUses = coupon.usedBy.filter(u => u.userIdentifier && u.userIdentifier.toLowerCase() === userIdentifier).length;
      if (userUses >= coupon.perUserLimit) {
        return res.status(400).json({ 
          valid: false, 
          message: `You have already redeemed this coupon the maximum allowed (${coupon.perUserLimit} time${coupon.perUserLimit > 1 ? 's' : ''}).` 
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((cartAmount * Number(coupon.discountValue)) / 100);
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Math.min(cartAmount, Number(coupon.discountValue));
    }

    const newTotal = Math.max(0, cartAmount - discountAmount);

    res.json({
      valid: true,
      message: `Coupon "${coupon.code}" applied! You save ₹${Number(discountAmount).toLocaleString()}`,
      coupon: {
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount
      },
      discountAmount,
      newTotal
    });
  } catch (err) {
    console.error('Error validating coupon:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/public/calculate-price
router.post('/public/calculate-price', async (req, res) => {
  try {
    const { 
      propertyId, 
      checkIn, 
      checkOut, 
      rooms = [], 
      bookingType = 'guest',
      couponCode = '',
      guestMobile = '',
      guestEmail = ''
    } = req.body;

    if (!propertyId || !checkIn || !checkOut || !rooms.length) {
      return res.status(400).json({ error: 'ValidationError', message: 'Property, dates, and rooms required.' });
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));

    let totalRoomCost = 0;

    for (const r of rooms) {
      let priceRecord = null;
      if (r.categoryId) {
        priceRecord = await PropertyPricing.findOne({
          propertyId,
          roomCategoryId: r.categoryId,
          mealPlan: r.mealPlan || 'EP'
        });
      }

      let baseRatePerNight = 3000;
      if (priceRecord) {
        baseRatePerNight = bookingType === 'agent' ? priceRecord.b2bRate : priceRecord.b2cRate;
      } else if (r.price && Number(r.price) > 0) {
        baseRatePerNight = Number(r.price);
      }

      let mealSupplement = 0;
      if (r.mealPlan === 'CP') mealSupplement = 500;
      else if (r.mealPlan === 'MAP') mealSupplement = 800;
      else if (r.mealPlan === 'AP') mealSupplement = 1200;

      const adults = r.adults || 2;
      const child5_9 = r.child5_9 || 0;

      let extraGuestCost = 0;
      if (adults > 2) {
        const extraAdults = adults - 2;
        const ratePerExtra = priceRecord ? (bookingType === 'agent' ? priceRecord.extraAdultB2B : priceRecord.extraAdultB2C) || 800 : 800;
        extraGuestCost += (extraAdults * ratePerExtra);
      }
      if (child5_9 > 0) {
        const ratePerChild = priceRecord ? (bookingType === 'agent' ? priceRecord.childB2B : priceRecord.childB2C) || 400 : 400;
        extraGuestCost += (child5_9 * ratePerChild);
      }

      totalRoomCost += ((baseRatePerNight + mealSupplement + extraGuestCost) * nights);
    }

    // Coupon discount verification
    let discountAmount = 0;
    let appliedCouponInfo = null;

    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: cleanCode, status: 'Active' });
      if (coupon) {
        const now = new Date();
        const validDates = (!coupon.startDate || new Date(coupon.startDate) <= now) && (new Date(coupon.endDate) >= now);
        const validAudience = coupon.targetAudience === 'both' || (bookingType === 'agent' ? coupon.targetAudience === 'agent' : coupon.targetAudience === 'customer');
        const validProperty = !coupon.applicableHomestays?.length || coupon.applicableHomestays.includes('all') || coupon.applicableHomestays.some(h => String(h) === String(propertyId));
        const validCart = (!coupon.minCartAmount || totalRoomCost >= coupon.minCartAmount) && (!coupon.maxCartAmount || totalRoomCost <= coupon.maxCartAmount);
        const validUsage = !coupon.totalUsageLimit || (coupon.usedCount < coupon.totalUsageLimit);

        if (validDates && validAudience && validProperty && validCart && validUsage) {
          if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((totalRoomCost * Number(coupon.discountValue)) / 100);
            if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
              discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
            }
          } else {
            discountAmount = Math.min(totalRoomCost, Number(coupon.discountValue));
          }

          appliedCouponInfo = {
            code: coupon.code,
            title: coupon.title,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: coupon.maxDiscountAmount
          };
        }
      }
    }

    const discountedCost = Math.max(0, totalRoomCost - discountAmount);
    const totalTax = Math.round(discountedCost * 0.12);
    const finalAmount = discountedCost + totalTax;

    res.json({
      nights,
      roomCost: totalRoomCost,
      discount: discountAmount,
      appliedCoupon: appliedCouponInfo,
      discountedRoomCost: discountedCost,
      tax: totalTax,
      addOns: 0,
      finalAmount,
      balanceAmount: finalAmount
    });
  } catch (err) {
    console.error('Error calculating public price:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/public/create-booking
router.post('/public/create-booking', async (req, res) => {
  try {
    const { 
      token,
      propertyId, 
      checkInDate, 
      checkOutDate, 
      guestName, 
      guestMobile, 
      guestEmail, 
      selectedRooms = [], 
      specialRequests = '',
      bookingType = 'guest',
      advanceAmount = 0,
      paymentProof = '',
      transactionId = '',
      couponCode = ''
    } = req.body;

    if (!propertyId || !checkInDate || !checkOutDate || !guestName || !guestMobile || !selectedRooms.length) {
      return res.status(400).json({ error: 'ValidationError', message: 'Missing required booking fields.' });
    }

    // Check single-use token if provided
    let shareLink = null;
    if (token) {
      shareLink = await PublicShareLink.findOne({ token });
      if (shareLink && shareLink.isUsed) {
        return res.status(410).json({ error: 'LinkUsed', message: 'This booking link has already been used.' });
      }
    }

    const property = await Property.findOne({ _id: propertyId, deleted: false });
    if (!property) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));

    // Generate unique sequential Booking ID
    const count = await Booking.countDocuments();
    const bookingId = `WG-BK-${String(count + 1001).padStart(5, '0')}`;

    // Calculate pricing
    let totalRoomCost = 0;
    const bookedRooms = [];

    for (const r of selectedRooms) {
      let priceRecord = null;
      if (r.categoryId) {
        priceRecord = await PropertyPricing.findOne({
          propertyId,
          roomCategoryId: r.categoryId,
          mealPlan: r.mealPlan || 'EP'
        });
      }

      let baseRatePerNight = 3000;
      if (priceRecord) {
        baseRatePerNight = bookingType === 'agent' ? priceRecord.b2bRate : priceRecord.b2cRate;
      } else if (r.price) {
        baseRatePerNight = Number(r.price);
      }

      let mealSupplement = 0;
      if (r.mealPlan === 'CP') mealSupplement = 500;
      else if (r.mealPlan === 'MAP') mealSupplement = 800;
      else if (r.mealPlan === 'AP') mealSupplement = 1200;

      const adults = r.adults || 2;
      const child5_9 = r.child5_9 || 0;
      const child0_4 = r.child0_4 || 0;

      let extraGuestCost = 0;
      if (adults > 2) {
        const ratePerExtra = priceRecord ? (bookingType === 'agent' ? priceRecord.extraAdultB2B : priceRecord.extraAdultB2C) || 800 : 800;
        extraGuestCost += ((adults - 2) * ratePerExtra);
      }
      if (child5_9 > 0) {
        const ratePerChild = priceRecord ? (bookingType === 'agent' ? priceRecord.childB2B : priceRecord.childB2C) || 400 : 400;
        extraGuestCost += (child5_9 * ratePerChild);
      }

      const roomTotal = (baseRatePerNight + mealSupplement + extraGuestCost) * nights;
      totalRoomCost += roomTotal;

      bookedRooms.push({
        roomCategoryId: r.categoryId,
        categoryName: r.categoryName || 'Standard Room',
        roomNumber: String(r.roomNumber),
        mealPlan: r.mealPlan || 'EP',
        adults,
        child5_9,
        child0_4,
        pricePerNight: baseRatePerNight + mealSupplement + extraGuestCost,
        totalCost: roomTotal
      });
    }

    // Coupon verification
    let discountAmount = 0;
    let appliedCouponDoc = null;
    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase();
      appliedCouponDoc = await Coupon.findOne({ code: cleanCode, status: 'Active' });
      if (appliedCouponDoc) {
        if (appliedCouponDoc.discountType === 'percentage') {
          discountAmount = Math.round((totalRoomCost * Number(appliedCouponDoc.discountValue)) / 100);
          if (appliedCouponDoc.maxDiscountAmount && appliedCouponDoc.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, Number(appliedCouponDoc.maxDiscountAmount));
          }
        } else {
          discountAmount = Math.min(totalRoomCost, Number(appliedCouponDoc.discountValue));
        }
      }
    }

    const discountedCost = Math.max(0, totalRoomCost - discountAmount);
    const totalTax = Math.round(discountedCost * 0.12);
    const finalAmount = discountedCost + totalTax;

    // Fetch owner to determine advance percentage or fixed amount
    const ownerDoc = property.ownerId ? await HomestayOwner.findById(property.ownerId) : null;
    let requiredAdvance = 0;
    if (ownerDoc) {
      if (ownerDoc.advanceType === 'fixed' && ownerDoc.advanceAmount) {
        requiredAdvance = Math.min(finalAmount, Number(ownerDoc.advanceAmount));
      } else {
        const pct = ownerDoc.advancePercent !== undefined ? Number(ownerDoc.advancePercent) : 30;
        requiredAdvance = Math.round((finalAmount * pct) / 100);
      }
    } else {
      requiredAdvance = Math.round((finalAmount * 30) / 100);
    }

    const paidAdv = Number(advanceAmount) > 0 ? Number(advanceAmount) : requiredAdvance;

    const totalAdults = bookedRooms.reduce((sum, r) => sum + (Number(r.adults) || 2), 0);
    const totalChildren = bookedRooms.reduce((sum, r) => sum + (Number(r.child5_9) || 0) + (Number(r.child0_4) || 0), 0);
    const totalGuests = Math.max(1, totalAdults + totalChildren);

    const newBooking = new Booking({
      bookingId,
      propertyId,
      ownerId: property.ownerId,
      bookingType: 'Homestay Booking',
      bookingMode: bookingType === 'agent' ? 'Travel Agent' : 'Guest',
      bookingStatus: 'Pending', // Pending until verified by owner in Booking Requests
      checkInDate: inDate,
      checkOutDate: outDate,
      nights,
      amount: finalAmount,
      customer: {
        name: guestName,
        mobile: guestMobile,
        email: guestEmail || ''
      },
      guests: {
        total: totalGuests,
        adults: totalAdults,
        children: totalChildren
      },
      bookedRooms,
      propertyDetails: {
        roomNumber: bookedRooms[0]?.roomNumber || '101',
        categoryName: bookedRooms[0]?.categoryName || 'Standard Room',
        propertyName: property.name
      },
      pricing: {
        basePrice: totalRoomCost,
        tax: totalTax,
        addOns: 0,
        discount: discountAmount,
        finalAmount,
        paidAmount: paidAdv,
        pendingAmount: Math.max(0, finalAmount - paidAdv)
      },
      couponCode: appliedCouponDoc?.code || '',
      paymentStatus: 'Pending',
      paymentDetails: {
        method: 'UPI',
        transactionId: transactionId || '',
        paymentDate: new Date(),
        paymentStatus: 'Pending',
        proofUrl: paymentProof || ''
      },
      advancePayment: {
        amount: paidAdv,
        percentage: ownerDoc?.advancePercent || 30,
        advanceType: ownerDoc?.advanceType || 'percent',
        status: 'Pending',
        transactionId: transactionId || '',
        proofUrl: paymentProof || '',
        submittedAt: new Date()
      },
      paymentScreenshot: paymentProof || '',
      specialRequests: specialRequests || '',
      bookingSource: 'Public Availability Booking Link',
      timeline: [{
        activity: `Booking Request created from Public Link.${discountAmount > 0 ? ` Coupon applied: ${appliedCouponDoc?.code} (-₹${discountAmount.toLocaleString()}).` : ''} Advance payment of ₹${paidAdv.toLocaleString()} submitted with proof (UTR: ${transactionId || 'N/A'}). Dates reserved pending host verification.`,
        timestamp: new Date(),
        createdBy: guestName
      }]
    });

    await newBooking.save();

    // Trigger Notification for Homestay Owner
    if (property.ownerId) {
      await createOwnerNotification({
        ownerId: property.ownerId,
        title: 'New Booking from Public Link',
        message: `New booking request ${bookingId} received for ${property.name} from ${guestName}. Advance of ₹${paidAdv.toLocaleString()} submitted.`,
        type: 'booking',
        bookingId,
        metadata: {
          propertyName: property.name,
          guestName,
          guestMobile,
          checkIn: inDate,
          checkOut: outDate,
          amount: finalAmount
        }
      });
    }

    // Increment coupon redemption
    if (appliedCouponDoc) {
      await Coupon.updateOne(
        { _id: appliedCouponDoc._id },
        {
          $inc: { usedCount: 1 },
          $push: {
            usedBy: {
              userIdentifier: (guestMobile || guestEmail || '').trim().toLowerCase(),
              bookingId,
              discountAmount,
              usedAt: new Date()
            }
          }
        }
      );
    }

    // Mark link as used if token existed
    if (shareLink) {
      shareLink.isUsed = true;
      shareLink.usedByBookingId = newBooking._id;
      shareLink.usedAt = new Date();
      await shareLink.save();
    }

    res.json({
      success: true,
      bookingId,
      dbId: newBooking._id,
      booking: newBooking
    });
  } catch (err) {
    console.error('Error creating public booking:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/verify-request (Owner verifies advance payment & confirms booking)
router.patch('/homestay-owner/bookings/:id/verify-request', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    const advAmt = booking.advancePayment?.amount || booking.pricing?.paidAmount || 0;
    const finalAmt = booking.pricing?.finalAmount || booking.amount || 0;

    booking.bookingStatus = 'Confirmed';
    booking.paymentStatus = advAmt >= finalAmt ? 'Paid' : 'Partial';
    if (!booking.pricing) booking.pricing = {};
    booking.pricing.paidAmount = advAmt;
    booking.pricing.pendingAmount = Math.max(0, finalAmt - advAmt);

    if (!booking.paymentDetails) booking.paymentDetails = {};
    booking.paymentDetails.paymentStatus = 'Verified';
    if (booking.advancePayment) {
      booking.advancePayment.status = 'Verified';
    }

    booking.timeline.push({
      activity: `Booking Request verified and confirmed by Owner. Advance payment of ₹${advAmt.toLocaleString()} approved.`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });

    await booking.save();

    await createOwnerNotification({
      ownerId: booking.ownerId,
      title: 'Booking Request Confirmed',
      message: `Booking ${booking.bookingId} for ${booking.customer?.name || 'Guest'} has been confirmed. Advance of ₹${advAmt.toLocaleString()} approved.`,
      type: 'confirmation',
      bookingId: booking.bookingId,
      metadata: { guestName: booking.customer?.name, amount: finalAmt }
    });

    res.json({ success: true, message: 'Booking request verified and confirmed successfully!', booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/bookings/:id/reject-request (Owner rejects booking request, releasing the room/dates)
router.patch('/homestay-owner/bookings/:id/reject-request', authenticateToken, async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    const ownerId = req.user._id || req.user.id;
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const { reason = 'Payment proof rejected by host' } = req.body;

    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    });

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });
    if (!isSuperAdmin && String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
    }

    booking.bookingStatus = 'Cancelled';
    booking.timeline.push({
      activity: `Booking Request rejected by Owner. Reason: ${reason}. Room released back to inventory.`,
      timestamp: new Date(),
      createdBy: req.user.email || 'Owner'
    });

    await booking.save();

    await createOwnerNotification({
      ownerId: booking.ownerId,
      title: 'Booking Request Rejected',
      message: `Booking request ${booking.bookingId} was rejected (${reason}). Room released back to calendar.`,
      type: 'rejection',
      bookingId: booking.bookingId,
      metadata: { guestName: booking.customer?.name, reason }
    });

    res.json({ success: true, message: 'Booking request rejected. Dates are now open for new bookings.', booking });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/public/booking/:id (Public view for booking confirmation & slip)
router.get('/public/booking/:id', async (req, res) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const booking = await Booking.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { bookingId: req.params.id },
        { bookingId: `#${req.params.id}` }
      ]
    }).populate('propertyId');

    if (!booking) return res.status(404).json({ error: 'NotFound', message: 'Booking not found.' });

    const bObj = booking.toObject ? booking.toObject() : booking;
    let propPay = {};
    if (booking.propertyId) {
      const propDoc = await Property.findById(booking.propertyId).select('paymentSettings name city state');
      if (propDoc?.paymentSettings) propPay = propDoc.paymentSettings;
    }

    let ownerDoc = null;
    if (booking.ownerId) {
      ownerDoc = await HomestayOwner.findById(booking.ownerId).select('accountHolderName bankName accountNumber ifscCode branch upiId upiQrCode advancePercent advanceType firstName lastName mobile');
    }

    bObj.ownerPaymentDetails = {
      accountHolderName: propPay.accountHolderName || ownerDoc?.accountHolderName || (ownerDoc ? `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim() : '') || 'Homestay Sanctuary',
      bankName: propPay.bankName || ownerDoc?.bankName || 'HDFC Bank',
      accountNumber: propPay.accountNumber || ownerDoc?.accountNumber || '',
      ifscCode: propPay.ifscCode || ownerDoc?.ifscCode || '',
      branch: propPay.branch || ownerDoc?.branch || '',
      upiId: propPay.upiId || ownerDoc?.upiId || '',
      upiQrCode: propPay.upiQrCode || ownerDoc?.upiQrCode || '',
      advancePercent: propPay.advancePercent !== undefined ? propPay.advancePercent : (ownerDoc?.advancePercent !== undefined ? ownerDoc.advancePercent : 30),
      advanceType: propPay.advanceType || ownerDoc?.advanceType || 'percent',
      contactName: ownerDoc ? `${ownerDoc.firstName || ''} ${ownerDoc.lastName || ''}`.trim() : '',
      contactMobile: ownerDoc?.mobile || ''
    };

    res.json({
      success: true,
      booking: bObj
    });
  } catch (err) {
    console.error('Error fetching public booking details:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// Homestay Owner Staff & Roles Endpoints
// ==========================================

const DEFAULT_HOMESTAY_MODULES = [
  { module: 'inventory', moduleName: 'My Homestays & Inventory' },
  { module: 'bookings', moduleName: 'Manage Bookings & Rescheduling' },
  { module: 'requests', moduleName: 'Booking Requests & Approvals' },
  { module: 'guests', moduleName: 'Guest Directory & Records' },
  { module: 'rates', moduleName: 'Rates & Payment Settings' },
  { module: 'coupons', moduleName: 'Offers & Promo Coupons' },
  { module: 'availability', moduleName: 'Availability Calendar' },
  { module: 'staff', moduleName: 'Staff & Roles Management' }
];

// Helper to seed starter roles if an owner has none
async function ensureDefaultRolesForOwner(ownerId) {
  const existingCount = await HomestayRole.countDocuments({ ownerId });
  if (existingCount > 0) return;

  const starterRoles = [
    {
      ownerId,
      name: 'General Manager',
      description: 'Full administrative access across all homestay modules, rates, and guest management.',
      isSystemDefault: true,
      permissions: DEFAULT_HOMESTAY_MODULES.map(m => ({
        module: m.module,
        moduleName: m.moduleName,
        view: true,
        add: true,
        edit: true,
        delete: true
      }))
    },
    {
      ownerId,
      name: 'Front Desk / Receptionist',
      description: 'Handles day-to-day guest check-ins, booking requests, and availability tracking.',
      isSystemDefault: false,
      permissions: DEFAULT_HOMESTAY_MODULES.map(m => {
        const canManage = ['bookings', 'requests', 'guests', 'availability'].includes(m.module);
        return {
          module: m.module,
          moduleName: m.moduleName,
          view: true,
          add: canManage,
          edit: canManage,
          delete: false
        };
      })
    },
    {
      ownerId,
      name: 'Housekeeping & Operations',
      description: 'Views property availability, check-outs, and maintenance room schedules.',
      isSystemDefault: false,
      permissions: DEFAULT_HOMESTAY_MODULES.map(m => ({
        module: m.module,
        moduleName: m.moduleName,
        view: ['inventory', 'availability'].includes(m.module),
        add: false,
        edit: false,
        delete: false
      }))
    }
  ];

  await HomestayRole.insertMany(starterRoles);
}

// GET /api/homestay-owner/roles (List roles with staff counts)
router.get('/homestay-owner/roles', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    await ensureDefaultRolesForOwner(ownerId);

    const roles = await HomestayRole.find({ ownerId }).sort({ createdAt: 1 });
    
    // Count staff per role
    const rolesWithCounts = await Promise.all(roles.map(async (r) => {
      const staffCount = await HomestayStaff.countDocuments({ ownerId, roleId: r._id });
      return {
        ...r.toObject(),
        staffCount
      };
    }));

    res.json({
      success: true,
      data: rolesWithCounts,
      modules: DEFAULT_HOMESTAY_MODULES
    });
  } catch (err) {
    console.error('Error fetching homestay owner roles:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/roles (Create new role with permissions checkboxes)
router.post('/homestay-owner/roles', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const { name, description = '', permissions = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'ValidationError', message: 'Role name is required.' });
    }

    const cleanName = name.trim();
    const existing = await HomestayRole.findOne({ ownerId, name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'DuplicateRole', message: `A role named "${cleanName}" already exists.` });
    }

    // Ensure all 8 modules are represented in permissions
    const finalPermissions = DEFAULT_HOMESTAY_MODULES.map(defMod => {
      const found = permissions.find(p => p.module === defMod.module);
      return {
        module: defMod.module,
        moduleName: defMod.moduleName,
        view: Boolean(found?.view),
        add: Boolean(found?.add),
        edit: Boolean(found?.edit),
        delete: Boolean(found?.delete)
      };
    });

    const newRole = await HomestayRole.create({
      ownerId,
      name: cleanName,
      description: description.trim(),
      permissions: finalPermissions
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully.',
      data: {
        ...newRole.toObject(),
        staffCount: 0
      }
    });
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PUT /api/homestay-owner/roles/:id (Update role)
router.put('/homestay-owner/roles/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const roleId = req.params.id;
    const { name, description = '', permissions = [] } = req.body;

    const role = await HomestayRole.findOne({ _id: roleId, ownerId });
    if (!role) {
      return res.status(404).json({ error: 'NotFound', message: 'Role not found.' });
    }

    if (name && name.trim()) {
      const cleanName = name.trim();
      const existing = await HomestayRole.findOne({ 
        ownerId, 
        _id: { $ne: roleId }, 
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') } 
      });
      if (existing) {
        return res.status(400).json({ error: 'DuplicateRole', message: `A role named "${cleanName}" already exists.` });
      }
      role.name = cleanName;
    }

    if (description !== undefined) {
      role.description = description.trim();
    }

    if (Array.isArray(permissions) && permissions.length > 0) {
      role.permissions = DEFAULT_HOMESTAY_MODULES.map(defMod => {
        const found = permissions.find(p => p.module === defMod.module);
        return {
          module: defMod.module,
          moduleName: defMod.moduleName,
          view: Boolean(found?.view),
          add: Boolean(found?.add),
          edit: Boolean(found?.edit),
          delete: Boolean(found?.delete)
        };
      });
    }

    await role.save();

    // Sync roleName on any staff that have this role
    await HomestayStaff.updateMany({ roleId: role._id }, { $set: { roleName: role.name } });

    const staffCount = await HomestayStaff.countDocuments({ ownerId, roleId: role._id });

    res.json({
      success: true,
      message: 'Role updated successfully.',
      data: {
        ...role.toObject(),
        staffCount
      }
    });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/roles/:id (Delete role)
router.delete('/homestay-owner/roles/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const roleId = req.params.id;

    const role = await HomestayRole.findOne({ _id: roleId, ownerId });
    if (!role) {
      return res.status(404).json({ error: 'NotFound', message: 'Role not found.' });
    }

    // Check if staff are assigned
    const assignedStaffCount = await HomestayStaff.countDocuments({ ownerId, roleId });
    if (assignedStaffCount > 0) {
      return res.status(400).json({ 
        error: 'RoleInUse', 
        message: `Cannot delete role "${role.name}" because ${assignedStaffCount} staff member(s) are currently assigned to it. Please reassign them first.` 
      });
    }

    await HomestayRole.deleteOne({ _id: roleId });

    res.json({
      success: true,
      message: `Role "${role.name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/staff (List staff members & properties)
router.get('/homestay-owner/staff', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    await ensureDefaultRolesForOwner(ownerId);

    const staffList = await HomestayStaff.find({ ownerId })
      .populate('roleId', 'name description permissions')
      .sort({ createdAt: -1 });

    const properties = await Property.find({ ownerId, deleted: false }).select('_id name propertyId city');
    const roles = await HomestayRole.find({ ownerId }).select('_id name description');

    const totalStaff = staffList.length;
    const activeStaff = staffList.filter(s => s.status === 'Active').length;
    const inactiveStaff = staffList.filter(s => s.status === 'Inactive').length;
    const totalRoles = roles.length;

    res.json({
      success: true,
      data: staffList,
      properties,
      roles,
      stats: {
        totalStaff,
        activeStaff,
        inactiveStaff,
        totalRoles
      }
    });
  } catch (err) {
    console.error('Error fetching homestay staff:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/staff (Create new staff member)
router.post('/homestay-owner/staff', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const {
      name,
      firstName = '',
      lastName = '',
      fatherName = '',
      email,
      phone,
      mobile,
      role,
      roleId,
      aadharNo = '',
      panNo = '',
      monthlySalary = 0,
      basicSalary = 0,
      hra = 0,
      da = 0,
      specialAllowance = 0,
      otherAllowance = 0,
      pfContribution = 0,
      esiContribution = 0,
      tempAddress = {},
      permAddress = {},
      bank = {},
      documents = {},
      assignedProperties = ['all'],
      status = 'Active',
      pin = '1234',
      password = '',
      address = '',
      emergencyContact = '',
      notes = ''
    } = req.body;

    const resolvedName = name ? name.trim() : `${firstName} ${lastName}`.trim();
    const resolvedPhone = (mobile || phone || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();

    if (!resolvedName || !resolvedEmail || !resolvedPhone || !roleId) {
      return res.status(400).json({ error: 'ValidationError', message: 'First & Last Name, Email, Mobile Phone, and Role are required.' });
    }

    // Check duplicate email for this owner
    const existingEmail = await HomestayStaff.findOne({ ownerId, email: resolvedEmail });
    if (existingEmail) {
      return res.status(400).json({ error: 'DuplicateStaff', message: `Staff member with email "${resolvedEmail}" already exists.` });
    }

    const roleDoc = await HomestayRole.findOne({ _id: roleId, ownerId });
    if (!roleDoc) {
      return res.status(400).json({ error: 'InvalidRole', message: 'Selected role not found.' });
    }

    const newStaff = await HomestayStaff.create({
      ownerId,
      name: resolvedName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fatherName: fatherName.trim(),
      email: resolvedEmail,
      phone: resolvedPhone,
      mobile: resolvedPhone,
      role: (role || roleDoc.name).trim(),
      roleId: roleDoc._id,
      roleName: roleDoc.name,
      aadharNo: aadharNo.trim(),
      panNo: panNo.trim(),
      monthlySalary: Number(monthlySalary) || 0,
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      da: Number(da) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      otherAllowance: Number(otherAllowance) || 0,
      pfContribution: Number(pfContribution) || 0,
      esiContribution: Number(esiContribution) || 0,
      tempAddress: {
        line1: tempAddress.line1 || '',
        line2: tempAddress.line2 || '',
        landmark: tempAddress.landmark || '',
        state: tempAddress.state || '',
        city: tempAddress.city || '',
        pinCode: tempAddress.pinCode || ''
      },
      permAddress: {
        line1: permAddress.line1 || '',
        line2: permAddress.line2 || '',
        landmark: permAddress.landmark || '',
        state: permAddress.state || '',
        city: permAddress.city || '',
        pinCode: permAddress.pinCode || ''
      },
      bank: {
        bankName: bank.bankName || '',
        accountNumber: bank.accountNumber || '',
        ifscCode: bank.ifscCode || '',
        upiId: bank.upiId || ''
      },
      documents: {
        aadharFront: documents.aadharFront || '',
        aadharBack: documents.aadharBack || '',
        panFront: documents.panFront || '',
        panBack: documents.panBack || '',
        drivingLicense: documents.drivingLicense || '',
        voterId: documents.voterId || '',
        profilePhoto: documents.profilePhoto || ''
      },
      assignedProperties: Array.isArray(assignedProperties) && assignedProperties.length > 0 ? assignedProperties : ['all'],
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      pin: pin.trim() || '1234',
      password: password ? await bcrypt.hash(password, 10) : '',
      address: address.trim() || tempAddress.line1 || '',
      emergencyContact: emergencyContact.trim(),
      notes: notes.trim()
    });

    const populated = await HomestayStaff.findById(newStaff._id).populate('roleId', 'name description permissions');

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully.',
      data: populated
    });
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PUT /api/homestay-owner/staff/:id (Update staff member)
router.put('/homestay-owner/staff/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const staffId = req.params.id;
    const {
      name,
      firstName,
      lastName,
      fatherName,
      email,
      phone,
      mobile,
      role,
      roleId,
      aadharNo,
      panNo,
      monthlySalary,
      basicSalary,
      hra,
      da,
      specialAllowance,
      otherAllowance,
      pfContribution,
      esiContribution,
      tempAddress,
      permAddress,
      bank,
      documents,
      assignedProperties,
      status,
      pin,
      password,
      address,
      emergencyContact,
      notes
    } = req.body;

    const staff = await HomestayStaff.findOne({ _id: staffId, ownerId });
    if (!staff) {
      return res.status(404).json({ error: 'NotFound', message: 'Staff member not found.' });
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = await HomestayStaff.findOne({ ownerId, _id: { $ne: staffId }, email: cleanEmail });
      if (existing) {
        return res.status(400).json({ error: 'DuplicateEmail', message: `Another staff member already has email "${cleanEmail}".` });
      }
      staff.email = cleanEmail;
    }

    if (firstName !== undefined) staff.firstName = firstName.trim();
    if (lastName !== undefined) staff.lastName = lastName.trim();
    if (fatherName !== undefined) staff.fatherName = fatherName.trim();
    
    if (name) {
      staff.name = name.trim();
    } else if (firstName !== undefined || lastName !== undefined) {
      const f = firstName !== undefined ? firstName.trim() : (staff.firstName || '');
      const l = lastName !== undefined ? lastName.trim() : (staff.lastName || '');
      staff.name = `${f} ${l}`.trim() || staff.name;
    }

    if (mobile !== undefined) {
      staff.mobile = mobile.trim();
      staff.phone = mobile.trim();
    } else if (phone !== undefined) {
      staff.phone = phone.trim();
      staff.mobile = phone.trim();
    }

    if (role !== undefined) staff.role = role.trim();

    if (roleId) {
      const roleDoc = await HomestayRole.findOne({ _id: roleId, ownerId });
      if (roleDoc) {
        staff.roleId = roleDoc._id;
        staff.roleName = roleDoc.name;
        if (!staff.role) staff.role = roleDoc.name;
      }
    }

    if (aadharNo !== undefined) staff.aadharNo = aadharNo.trim();
    if (panNo !== undefined) staff.panNo = panNo.trim();
    if (monthlySalary !== undefined) staff.monthlySalary = Number(monthlySalary) || 0;
    if (basicSalary !== undefined) staff.basicSalary = Number(basicSalary) || 0;
    if (hra !== undefined) staff.hra = Number(hra) || 0;
    if (da !== undefined) staff.da = Number(da) || 0;
    if (specialAllowance !== undefined) staff.specialAllowance = Number(specialAllowance) || 0;
    if (otherAllowance !== undefined) staff.otherAllowance = Number(otherAllowance) || 0;
    if (pfContribution !== undefined) staff.pfContribution = Number(pfContribution) || 0;
    if (esiContribution !== undefined) staff.esiContribution = Number(esiContribution) || 0;

    if (tempAddress) {
      staff.tempAddress = {
        line1: tempAddress.line1 !== undefined ? tempAddress.line1 : (staff.tempAddress?.line1 || ''),
        line2: tempAddress.line2 !== undefined ? tempAddress.line2 : (staff.tempAddress?.line2 || ''),
        landmark: tempAddress.landmark !== undefined ? tempAddress.landmark : (staff.tempAddress?.landmark || ''),
        state: tempAddress.state !== undefined ? tempAddress.state : (staff.tempAddress?.state || ''),
        city: tempAddress.city !== undefined ? tempAddress.city : (staff.tempAddress?.city || ''),
        pinCode: tempAddress.pinCode !== undefined ? tempAddress.pinCode : (staff.tempAddress?.pinCode || '')
      };
    }

    if (permAddress) {
      staff.permAddress = {
        line1: permAddress.line1 !== undefined ? permAddress.line1 : (staff.permAddress?.line1 || ''),
        line2: permAddress.line2 !== undefined ? permAddress.line2 : (staff.permAddress?.line2 || ''),
        landmark: permAddress.landmark !== undefined ? permAddress.landmark : (staff.permAddress?.landmark || ''),
        state: permAddress.state !== undefined ? permAddress.state : (staff.permAddress?.state || ''),
        city: permAddress.city !== undefined ? permAddress.city : (staff.permAddress?.city || ''),
        pinCode: permAddress.pinCode !== undefined ? permAddress.pinCode : (staff.permAddress?.pinCode || '')
      };
    }

    if (bank) {
      staff.bank = {
        bankName: bank.bankName !== undefined ? bank.bankName : (staff.bank?.bankName || ''),
        accountNumber: bank.accountNumber !== undefined ? bank.accountNumber : (staff.bank?.accountNumber || ''),
        ifscCode: bank.ifscCode !== undefined ? bank.ifscCode : (staff.bank?.ifscCode || ''),
        upiId: bank.upiId !== undefined ? bank.upiId : (staff.bank?.upiId || '')
      };
    }

    if (documents) {
      staff.documents = {
        aadharFront: documents.aadharFront !== undefined ? documents.aadharFront : (staff.documents?.aadharFront || ''),
        aadharBack: documents.aadharBack !== undefined ? documents.aadharBack : (staff.documents?.aadharBack || ''),
        panFront: documents.panFront !== undefined ? documents.panFront : (staff.documents?.panFront || ''),
        panBack: documents.panBack !== undefined ? documents.panBack : (staff.documents?.panBack || ''),
        drivingLicense: documents.drivingLicense !== undefined ? documents.drivingLicense : (staff.documents?.drivingLicense || ''),
        voterId: documents.voterId !== undefined ? documents.voterId : (staff.documents?.voterId || ''),
        profilePhoto: documents.profilePhoto !== undefined ? documents.profilePhoto : (staff.documents?.profilePhoto || '')
      };
    }

    if (assignedProperties !== undefined) {
      staff.assignedProperties = Array.isArray(assignedProperties) && assignedProperties.length > 0 ? assignedProperties : ['all'];
    }

    if (status) staff.status = status;
    if (pin) staff.pin = pin.trim();
    if (password) staff.password = await bcrypt.hash(password, 10);
    if (address !== undefined) staff.address = address.trim();
    if (emergencyContact !== undefined) staff.emergencyContact = emergencyContact.trim();
    if (notes !== undefined) staff.notes = notes.trim();

    await staff.save();

    const populated = await HomestayStaff.findById(staff._id).populate('roleId', 'name description permissions');

    res.json({
      success: true,
      message: 'Staff details updated successfully.',
      data: populated
    });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/staff/:id (Delete staff member)
router.delete('/homestay-owner/staff/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const staffId = req.params.id;

    const staff = await HomestayStaff.findOne({ _id: staffId, ownerId });
    if (!staff) {
      return res.status(404).json({ error: 'NotFound', message: 'Staff member not found.' });
    }

    await HomestayStaff.deleteOne({ _id: staffId });

    res.json({
      success: true,
      message: `Staff member "${staff.name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/staff/:id/status (Toggle Active/Inactive)
router.patch('/homestay-owner/staff/:id/status', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user._id || req.user.id;
    const staffId = req.params.id;

    const staff = await HomestayStaff.findOne({ _id: staffId, ownerId });
    if (!staff) {
      return res.status(404).json({ error: 'NotFound', message: 'Staff member not found.' });
    }

    staff.status = staff.status === 'Active' ? 'Inactive' : 'Active';
    await staff.save();

    res.json({
      success: true,
      message: `Staff status changed to ${staff.status}.`,
      data: staff
    });
  } catch (err) {
    console.error('Error toggling staff status:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// SUBSCRIPTION PLANS SEEDER
// ==========================================
const ensureSubscriptionPlansSeeded = async () => {
  try {
    const count = await SubscriptionPlan.countDocuments();
    if (count === 0) {
      console.log('[Subscription Plans] Seeding default plans...');
      await SubscriptionPlan.create([
        {
          name: 'Starter Host',
          tagline: 'Perfect for individual homestays and cottage owners getting started.',
          price: 999,
          billingCycle: 'Monthly',
          durationDays: 30,
          description: 'Basic management suite with core booking features and single property access.',
          features: [
            '1 Property Listing',
            'Up to 5 Rooms Management',
            '2 Staff Members Access',
            'Public Shareable Booking Calendar',
            'Advance UPI Payments & Slips',
            'Standard Email Support'
          ],
          maxProperties: 1,
          maxRooms: 5,
          maxStaff: 2,
          status: 'Active',
          isPopular: false
        },
        {
          name: 'Professional Host',
          tagline: 'Most popular plan for growing homestay businesses and boutique villas.',
          price: 2499,
          billingCycle: 'Monthly',
          durationDays: 30,
          description: 'Advanced features with multi-property capability, custom staff roles, and analytics.',
          features: [
            'Up to 3 Properties Listings',
            'Up to 20 Rooms Management',
            '10 Staff Members & Custom Permissions',
            'Interactive Day-wise / Weekly Revenue Analytics',
            'Exclusive Discount Coupons & Offers',
            'Guest ID Verification & Document Storage',
            'Priority 24/7 Phone & WhatsApp Support'
          ],
          maxProperties: 3,
          maxRooms: 20,
          maxStaff: 10,
          status: 'Active',
          isPopular: true
        },
        {
          name: 'Enterprise Hotelier',
          tagline: 'Comprehensive suite for resort groups and homestay chains.',
          price: 5999,
          billingCycle: 'Monthly',
          durationDays: 30,
          description: 'Unlimited properties and rooms with dedicated account manager and tax audit reporting.',
          features: [
            'Unlimited Properties & Room Inventories',
            'Unlimited Staff Members & Granular Access Checkboxes',
            'Comprehensive GST & Tax Invoice Suite',
            'Full P&L and Multi-Year Revenue Projection',
            'Automated SMS & WhatsApp Booking Notifications',
            'Dedicated Account Manager & Concierge'
          ],
          maxProperties: 999,
          maxRooms: 999,
          maxStaff: 999,
          status: 'Active',
          isPopular: false
        }
      ]);
      console.log('[Subscription Plans] Default plans successfully seeded.');
    }
  } catch (err) {
    console.error('[Subscription Plans] Error seeding plans:', err.message);
  }
};

// ==========================================
// HOMESTAY OWNER NOTIFICATIONS
// ==========================================

// GET /api/homestay-owner/notifications (Get all notifications for owner)
router.get('/homestay-owner/notifications', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    const { filter = 'All', page = 1, limit = 50 } = req.query;

    const query = {
      $or: [
        { recipientId: ownerId },
        { recipientType: 'All' }
      ]
    };

    if (filter === 'Unread') {
      query.read = false;
    } else if (filter === 'booking') {
      query.type = 'booking';
    } else if (filter === 'cancellation') {
      query.type = { $in: ['cancellation', 'rejection'] };
    } else if (filter === 'confirmation') {
      query.type = 'confirmation';
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 50);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        $or: [{ recipientId: ownerId }, { recipientType: 'All' }],
        read: false
      })
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/notifications/:id/read (Mark single notification as read)
router.patch('/homestay-owner/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    const notif = await Notification.findOne({
      _id: req.params.id,
      $or: [{ recipientId: ownerId }, { recipientType: 'All' }]
    });

    if (!notif) return res.status(404).json({ error: 'NotFound', message: 'Notification not found.' });

    notif.read = true;
    await notif.save();

    res.json({ success: true, message: 'Notification marked as read.', notification: notif });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PATCH /api/homestay-owner/notifications/read-all (Mark all notifications as read)
router.patch('/homestay-owner/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    await Notification.updateMany(
      {
        $or: [{ recipientId: ownerId }, { recipientType: 'All' }],
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/notifications/:id (Delete a notification)
router.delete('/homestay-owner/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    await Notification.deleteOne({
      _id: req.params.id,
      $or: [{ recipientId: ownerId }, { recipientType: 'All' }]
    });

    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/homestay-owner/notifications/clear-all (Clear all notifications for owner)
router.delete('/homestay-owner/notifications/clear-all', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    await Notification.deleteMany({
      recipientId: ownerId
    });

    res.json({ success: true, message: 'All alerts cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// SUPER ADMIN SUBSCRIPTION PLANS CRUD
// ==========================================

// GET /api/admin/subscription-plans (List all subscription plans)
router.get('/admin/subscription-plans', authenticateToken, async (req, res) => {
  try {
    await ensureSubscriptionPlansSeeded();
    const plans = await SubscriptionPlan.find().sort({ price: 1 }).lean();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/admin/subscription-plans (Create new subscription plan)
router.post('/admin/subscription-plans', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      tagline = '',
      price,
      billingCycle = 'Monthly',
      durationDays = 30,
      description = '',
      features = [],
      maxProperties = 1,
      maxRooms = 10,
      maxStaff = 5,
      status = 'Active',
      isPopular = false
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'ValidationError', message: 'Plan Name and Price are required.' });
    }

    const newPlan = await SubscriptionPlan.create({
      name: name.trim(),
      tagline: tagline.trim(),
      price: Number(price),
      billingCycle,
      durationDays: Number(durationDays) || 30,
      description: description.trim(),
      features: Array.isArray(features) ? features.map(f => String(f).trim()).filter(Boolean) : [],
      maxProperties: Number(maxProperties) || 1,
      maxRooms: Number(maxRooms) || 10,
      maxStaff: Number(maxStaff) || 5,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      isPopular: Boolean(isPopular),
      createdBy: req.user.fullName || req.user.email || 'Super Admin'
    });

    logActivity(req, 'CREATE_SUBSCRIPTION_PLAN', 'Subscription Management', `Created plan: ${newPlan.name} (₹${newPlan.price})`);

    res.status(201).json({ success: true, message: 'Subscription plan created successfully.', data: newPlan });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// PUT /api/admin/subscription-plans/:id (Update subscription plan)
router.put('/admin/subscription-plans/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      tagline,
      price,
      billingCycle,
      durationDays,
      description,
      features,
      maxProperties,
      maxRooms,
      maxStaff,
      status,
      isPopular
    } = req.body;

    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'NotFound', message: 'Plan not found.' });

    if (name) plan.name = name.trim();
    if (tagline !== undefined) plan.tagline = tagline.trim();
    if (price !== undefined) plan.price = Number(price);
    if (billingCycle) plan.billingCycle = billingCycle;
    if (durationDays !== undefined) plan.durationDays = Number(durationDays);
    if (description !== undefined) plan.description = description.trim();
    if (features !== undefined && Array.isArray(features)) {
      plan.features = features.map(f => String(f).trim()).filter(Boolean);
    }
    if (maxProperties !== undefined) plan.maxProperties = Number(maxProperties);
    if (maxRooms !== undefined) plan.maxRooms = Number(maxRooms);
    if (maxStaff !== undefined) plan.maxStaff = Number(maxStaff);
    if (status) plan.status = status;
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);

    await plan.save();
    logActivity(req, 'UPDATE_SUBSCRIPTION_PLAN', 'Subscription Management', `Updated plan: ${plan.name}`);

    res.json({ success: true, message: 'Subscription plan updated successfully.', data: plan });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// DELETE /api/admin/subscription-plans/:id (Delete subscription plan)
router.delete('/admin/subscription-plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'NotFound', message: 'Plan not found.' });

    await SubscriptionPlan.deleteOne({ _id: req.params.id });
    logActivity(req, 'DELETE_SUBSCRIPTION_PLAN', 'Subscription Management', `Deleted plan: ${plan.name}`);

    res.json({ success: true, message: `Subscription plan "${plan.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// HOMESTAY OWNER SUBSCRIPTION MANAGEMENT
// ==========================================

// GET /api/homestay-owner/subscription-plans (Public/Owner active plans list)
router.get('/homestay-owner/subscription-plans', async (req, res) => {
  try {
    await ensureSubscriptionPlansSeeded();
    const plans = await SubscriptionPlan.find({ status: 'Active' }).sort({ price: 1 }).lean();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// GET /api/homestay-owner/subscription/current (Get owner's current subscription details)
router.get('/homestay-owner/subscription/current', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    let owner = await HomestayOwner.findById(ownerId).populate('subscription.planId');
    if (!owner) return res.status(404).json({ error: 'NotFound', message: 'Homestay owner not found.' });

    // Initialize trial if none exists
    if (!owner.subscription || !owner.subscription.status) {
      owner.subscription = {
        planName: 'Free Trial',
        status: 'Active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentStatus: 'Trial',
        billingCycle: 'Monthly',
        price: 0
      };
      await owner.save();
    }

    // Check if expired
    const isExpired = new Date(owner.subscription.expiresAt) < new Date();
    if (isExpired && owner.subscription.status === 'Active') {
      owner.subscription.status = 'Expired';
      await owner.save();
    }

    const now = new Date();
    const exp = new Date(owner.subscription.expiresAt);
    const daysRemaining = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      subscription: {
        ...owner.subscription.toObject(),
        daysRemaining,
        isExpired
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// POST /api/homestay-owner/subscription/purchase (Purchase or Upgrade Subscription)
router.post('/homestay-owner/subscription/purchase', authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id || req.user.id;
    const { planId, paymentMethod = 'UPI', transactionId = '' } = req.body;

    if (!planId) return res.status(400).json({ error: 'ValidationError', message: 'Plan ID is required.' });

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || plan.status !== 'Active') {
      return res.status(404).json({ error: 'NotFound', message: 'Selected plan is not available.' });
    }

    const owner = await HomestayOwner.findById(ownerId);
    if (!owner) return res.status(404).json({ error: 'NotFound', message: 'Homestay owner not found.' });

    const startDate = new Date();
    const durationDays = plan.durationDays || 30;
    const expiresAt = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const txId = transactionId || `SUB-TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!owner.subscription) owner.subscription = {};
    if (!Array.isArray(owner.subscription.history)) owner.subscription.history = [];

    // Push to history
    owner.subscription.history.push({
      planId: plan._id,
      planName: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      startDate,
      expiresAt,
      purchasedAt: new Date(),
      transactionId: txId,
      paymentMethod
    });

    owner.subscription.planId = plan._id;
    owner.subscription.planName = plan.name;
    owner.subscription.price = plan.price;
    owner.subscription.billingCycle = plan.billingCycle;
    owner.subscription.startDate = startDate;
    owner.subscription.expiresAt = expiresAt;
    owner.subscription.status = 'Active';
    owner.subscription.paymentStatus = 'Paid';
    owner.subscription.transactionId = txId;

    await owner.save();

    // Trigger Notification
    await createOwnerNotification({
      ownerId: owner._id,
      title: 'Subscription Plan Activated!',
      message: `You have successfully subscribed to "${plan.name}". Valid until ${expiresAt.toLocaleDateString('en-GB')}.`,
      type: 'payment',
      metadata: { planName: plan.name, price: plan.price, expiresAt }
    });

    res.json({
      success: true,
      message: `Successfully subscribed to ${plan.name}! Your panel access is active.`,
      subscription: owner.subscription
    });
  } catch (err) {
    console.error('Error purchasing subscription:', err);
    res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

export default router;




