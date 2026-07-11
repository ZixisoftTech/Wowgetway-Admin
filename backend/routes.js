import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { authenticateToken, requirePermission } from './middleware/auth.js';
import { Booking, Employee, Homestay, Role, Attendance, Salary, HomestayOwner, Ride, Rider, User, TourPackage, Admin, Coupon, ActivityLog, PasswordReset, SmtpSettings, StateCity, NewState, NewCity, NewAmenity, NewRoomType, Property, PropertyGallery, PropertyRooms, PropertyAmenities, PropertySeason, PropertyPricing, PropertyApproval, PropertyAuditLog } from './models.js';

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
    if (pass.length < 8 || !/[a-zA-Z]/.test(pass) || !/\d/.test(pass)) {
      return res.status(400).json({ error: 'WeakPassword', message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
    }
    updateData.password = await bcrypt.hash(pass, 10);
    updateData.encryptedPasswordCopy = encrypt(pass);
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
    const totalHomestays = mockHomestaysDatabase.length;
    const activeHomestays = mockHomestaysDatabase.filter(h => h.status === 'Active').length;
    const totalRooms = mockHomestaysDatabase.reduce((sum, h) => {
      if (Array.isArray(h.rooms)) {
        return sum + h.rooms.reduce((sumR, r) => sumR + (r.totalRooms || 0), 0);
      }
      return sum + (typeof h.rooms === 'number' ? h.rooms : 0);
    }, 0);
    const avgOccupancyRate = Math.round(mockHomestaysDatabase.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / (totalHomestays || 1));
    return res.json({ totalHomestays, activeHomestays, totalRooms, avgOccupancyRate });
  }

  try {
    const totalHomestays = await Homestay.countDocuments();
    const activeStays = await Homestay.find({ status: 'Active' });
    const totalRooms = activeStays.reduce((sum, h) => {
      if (Array.isArray(h.rooms)) {
        return sum + h.rooms.reduce((sumR, r) => sumR + (r.totalRooms || 0), 0);
      }
      return sum + (typeof h.rooms === 'number' ? h.rooms : 0);
    }, 0);
    const avgOccupancyRate = activeStays.length > 0 ? Math.round(activeStays.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / activeStays.length) : 0;
    res.json({ totalHomestays, activeHomestays: activeStays.length, totalRooms, avgOccupancyRate });
  } catch (error) {
    console.error('Error fetching homestay stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch homestay stats', message: error.message });
  }
});

// GET /api/dashboard/homestays-list
router.get('/homestays-list', async (req, res) => {
  const { search, status, type, region, ownerName } = req.query;

  const isPendingReviewStatus = ['Pending Review', 'Pending Approval', 'Submitted For Review', 'Changes Requested'].includes(status);

  if (!isMongoConnected()) {
    if (isPendingReviewStatus || status === 'All') {
      let list = mockPropertiesDatabase.filter(p => !p.deleted);
      if (status && status !== 'All') {
        const mappedStatus = (status === 'Pending Approval' || status === 'Pending Review') ? 'Submitted For Review' : status;
        list = list.filter(p => p.status === mappedStatus);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(p => 
          p.name.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(q))
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
          name: p.name || 'Untitled Property',
          type: p.type || 'Homestay',
          ownerName: p.ownerName,
          ownerMobile: p.ownerMobile,
          city: p.city,
          region: p.state || '',
          status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
          rooms: rooms.map(r => ({ roomType: r.roomType, totalRooms: r.numberOfRooms })),
          images: gal ? [gal.coverImage, ...gal.images].filter(Boolean) : [],
          rates: pricingList.map(pr => ({ planRates: { EP: { b2cRate: pr.b2cRate } } }))
        };
      });
      if (status !== 'All') {
        return res.json(formatted);
      }
    }

    let list = [...mockHomestaysDatabase];
    if (status && status !== 'All') {
      list = list.filter(h => h.status === status);
    }
    if (type && type !== 'All') {
      list = list.filter(h => h.type === type);
    }
    if (region && region !== 'All') {
      list = list.filter(h => h.region === region);
    }
    if (ownerName && ownerName !== 'All') {
      list = list.filter(h => h.ownerName === ownerName);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(h => 
        h.name.toLowerCase().includes(q) ||
        (h.city && h.city.toLowerCase().includes(q)) ||
        (h.region && h.region.toLowerCase().includes(q)) ||
        (h.ownerName && h.ownerName.toLowerCase().includes(q)) ||
        (h._id && h._id.toLowerCase().includes(q))
      );
    }
    return res.json(list);
  }

  try {
    if (isPendingReviewStatus || status === 'All') {
      const query = { deleted: false };
      if (status && status !== 'All') {
        query.status = (status === 'Pending Approval' || status === 'Pending Review') ? 'Submitted For Review' : status;
      }
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { city: regex },
          { ownerName: regex }
        ];
      }
      const propertiesList = await Property.find(query).sort({ updatedAt: -1 }).lean();
      
      const formatted = [];
      for (const p of propertiesList) {
        const gal = await PropertyGallery.findOne({ propertyId: p._id });
        const rooms = await PropertyRooms.find({ propertyId: p._id });
        const pricingList = await PropertyPricing.find({ propertyId: p._id });
        
        let minPrice = 'N/A';
        if (pricingList.length > 0) {
          const validRates = pricingList.map(pr => pr.b2cRate).filter(r => typeof r === 'number');
          if (validRates.length > 0) {
            minPrice = `₹${Math.min(...validRates)}`;
          }
        }
        
        formatted.push({
          _id: p._id,
          name: p.name || 'Untitled Property',
          type: p.type || 'Homestay',
          ownerName: p.ownerName,
          ownerMobile: p.ownerMobile,
          city: p.city,
          region: p.state || '',
          status: p.status === 'Submitted For Review' ? 'Pending Approval' : p.status,
          rooms: rooms.map(r => ({ roomType: r.roomType, totalRooms: r.numberOfRooms })),
          images: gal ? [gal.coverImage, ...gal.images].filter(Boolean) : [],
          rates: pricingList.map(pr => ({ planRates: { EP: { b2cRate: pr.b2cRate } } }))
        });
      }
      if (status !== 'All') {
        return res.json(formatted);
      }
    }

    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (region && region !== 'All') {
      query.region = region;
    }
    if (ownerName && ownerName !== 'All') {
      query.ownerName = ownerName;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { city: regex },
        { region: regex },
        { ownerName: regex },
        { _id: regex }
      ];
    }
    const homestays = await Homestay.find(query).sort({ createdAt: -1 });
    res.json(homestays);
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
    if (!item) {
      const p = await Property.findById(id).lean();
      if (!p) return res.status(404).json({ error: 'Homestay not found' });
      
      const gal = await PropertyGallery.findOne({ propertyId: p._id });
      const rooms = await PropertyRooms.find({ propertyId: p._id });
      const pricingList = await PropertyPricing.find({ propertyId: p._id });
      
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
        }))
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
    const admin = await Admin.findOne({ email: emailLower });
    if (!admin) {
      return res.status(400).json({ error: 'Invalid email or password.' });
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
    
    let admin = null;
    if (!isMongoConnected()) {
      admin = mockAdminsDatabase.find(a => a.email === decoded.email);
    } else {
      admin = await Admin.findOne({ email: decoded.email });
    }

    if (!admin || admin.status === 'Suspended') {
      return res.status(401).json({ error: 'Admin user is suspended or invalid.' });
    }

    const payload = { _id: admin._id, email: admin.email, fullName: admin.fullName, role: admin.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

    return res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

router.post('/admin/auth/refresh-token', handleAdminRefreshToken);
router.post('/auth/refresh-token', handleAdminRefreshToken);

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
    const owner = await HomestayOwner.findOne({ email: emailLower });
    if (!owner || owner.status === 'Deleted') {
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
    }

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
router.post('/admin/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NoFileUploaded', message: 'No file was uploaded.' });
  }
  const fileUrl = getFileDataUrl(req.file);
  res.json({ fileUrl });
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
    res.json({
      originalUrl: dataUrl,
      optimizedUrl: dataUrl,
      thumbUrl: dataUrl
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
    if (!isNew) {
      if (req.query.propertyId) {
        prop = await Property.findOne({ _id: req.query.propertyId, ownerId, deleted: false });
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

    if (!isMongoConnected()) {
      prop = mockPropertiesDatabase.find(p => p._id === propertyId && p.ownerId === req.user._id && !p.deleted);
      if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

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
            extraPersonAllowed: Number(r.extraPerson || 0),
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

    prop = await Property.findOne({ _id: propertyId, ownerId: req.user._id, deleted: false });
    if (!prop) return res.status(404).json({ error: 'NotFound', message: 'Property not found.' });

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
                extraPersonAllowed: Number(r.extraPerson || 0),
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
            extraPersonAllowed: Number(r.extraPerson || 0),
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
      const pid = p._id;

      if (!isMongoConnected()) {
        const gal = mockPropertyGalleryDatabase.find(g => String(g.propertyId) === String(pid));
        coverImage = gal?.coverImage || '';
        
        const rooms = mockPropertyRoomsDatabase.filter(r => String(r.propertyId) === String(pid));
        rooms.forEach(r => {
          totalRooms += (r.numberOfRooms || 0);
          totalOccupancy += ((r.maxOccupancyAdults || 0) * (r.numberOfRooms || 0));
        });
      } else {
        const gal = await PropertyGallery.findOne({ propertyId: pid });
        coverImage = gal?.coverImage || '';

        const rooms = await PropertyRooms.find({ propertyId: pid });
        rooms.forEach(r => {
          totalRooms += (r.numberOfRooms || 0);
          totalOccupancy += ((r.maxOccupancyAdults || 0) * (r.numberOfRooms || 0));
        });
      }

      enrichedList.push({
        ...p,
        coverImage,
        rooms: totalRooms,
        occupancy: totalOccupancy
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
          images: gallery ? [gallery.coverImage, ...gallery.images].filter(Boolean) : [],
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

    const prop = await Property.findOne({ _id: id, deleted: false });
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
      { propertyId: id },
      updatePayload,
      { upsert: true, new: true }
    );

    if (status === 'Approved') {
      const gallery = await PropertyGallery.findOne({ propertyId: id });
      const rooms = await PropertyRooms.find({ propertyId: id });
      const amenities = await PropertyAmenities.findOne({ propertyId: id });
      const seasonsList = await PropertySeason.find({ propertyId: id });
      const pricingList = await PropertyPricing.find({ propertyId: id });

      const mappedRooms = rooms.map(r => ({
        roomType: r.roomType || 'Standard',
        totalRooms: r.numberOfRooms || 1,
        extraPersonAllowed: r.extraPersonAllowed === 'Not Allowed' ? 0 : (r.extraPersonAllowed.includes('1') ? 1 : 2),
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
        name: prop.name || 'Untitled Property',
        type: prop.type || 'Homestay',
        ownerName: prop.ownerName,
        ownerMobile: prop.ownerMobile,
        address: prop.address || '',
        city: prop.city,
        region: prop.state || '',
        description: prop.description || '',
        amenities: amenities ? amenities.amenityIds : [],
        images: gallery ? [gallery.coverImage, ...gallery.images].filter(Boolean) : [],
        rooms: mappedRooms,
        seasons: mappedSeasons,
        rates: mappedRates,
        status: 'Active'
      };

      await Homestay.findOneAndUpdate(
        { name: prop.name },
        homestayPayload,
        { upsert: true, new: true }
      );
    }

    const auditLog = new PropertyAuditLog({
      propertyId: id,
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

export default router;
