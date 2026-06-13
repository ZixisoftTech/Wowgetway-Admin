import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking, Employee, Homestay } from './models.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways';

async function seedDatabase() {
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB. Starting database seeding...');

    // Clear existing collections
    await Booking.deleteMany({});
    await Employee.deleteMany({});
    await Homestay.deleteMany({});
    console.log('Cleared existing data.');

    // --- 1. Seed Homestays (18 Homestays + 7 Hotels = 25 total properties) ---
    const topHomestaysData = [
      { name: 'Hill View Homestay', type: 'Homestay', bookings: 156, occupancyRate: 82 },
      { name: 'Sunrise Cottage', type: 'Homestay', bookings: 134, occupancyRate: 75 },
      { name: 'River Bliss Homestay', type: 'Homestay', bookings: 98, occupancyRate: 68 },
      { name: 'Green Valley Stay', type: 'Homestay', bookings: 74, occupancyRate: 60 },
      { name: 'Lake Side Retreat', type: 'Homestay', bookings: 62, occupancyRate: 55 }
    ];

    const otherHomestays = Array.from({ length: 13 }, (_, i) => ({
      name: `Cozy Cabin ${i + 1}`,
      type: 'Homestay',
      bookings: Math.floor(Math.random() * 40) + 10,
      occupancyRate: Math.floor(Math.random() * 30) + 30
    }));

    const hotels = Array.from({ length: 7 }, (_, i) => ({
      name: `Grand Palace Hotel ${i + 1}`,
      type: 'Hotel',
      bookings: Math.floor(Math.random() * 80) + 20,
      occupancyRate: Math.floor(Math.random() * 40) + 40
    }));

    await Homestay.insertMany([...topHomestaysData, ...otherHomestays, ...hotels]);
    console.log('Seeded Homestays (18 Homestays, 7 Hotels).');

    // --- 2. Seed Employees (56 Total: 42 Active, 14 Inactive) ---
    const topEmployeesData = [
      { name: 'Amit Verma', role: 'Homestay Manager', status: 'Active', bookings: 32, revenue: 245000, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { name: 'Priya Singh', role: 'Booking coordinator', status: 'Active', bookings: 28, revenue: 210000, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { name: 'Vikram Patel', role: 'Support Agent', status: 'Active', bookings: 24, revenue: 180000, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { name: 'Neha Gupta', role: 'Customer Success', status: 'Active', bookings: 18, revenue: 125000, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
      { name: 'Rohit Sharma', role: 'Operations Lead', status: 'Active', bookings: 16, revenue: 110000, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
    ];

    // Need 42 active - 5 top active = 37 other active
    const activeStaff = Array.from({ length: 37 }, (_, i) => ({
      name: `Staff Member ${i + 6}`,
      role: 'Staff Assistant',
      status: 'Active',
      bookings: Math.floor(Math.random() * 15),
      revenue: Math.floor(Math.random() * 80000)
    }));

    // Need 14 inactive
    const inactiveStaff = Array.from({ length: 14 }, (_, i) => ({
      name: `Inactive Staff ${i + 1}`,
      role: 'Contractor',
      status: 'Inactive',
      bookings: Math.floor(Math.random() * 5),
      revenue: Math.floor(Math.random() * 20000)
    }));

    await Employee.insertMany([...topEmployeesData, ...activeStaff, ...inactiveStaff]);
    console.log('Seeded Employees (56 total: 42 Active, 14 Inactive).');

    // --- 3. Seed Bookings (1,248 total bookings: 862 Confirmed, 196 Pending, 120 Cancelled, 70 Completed) ---
    // In order to avoid generating 1248 rows in a slow seeding process, we can insert them in batches, or generate a rich distribution
    const bookingsToCreate = [];

    const bookingDistribution = [
      { status: 'Confirmed', count: 862 },
      { status: 'Pending', count: 196 },
      { status: 'Cancelled', count: 120 },
      { status: 'Completed', count: 70 }
    ];

    // For repeat customer rate (approx 38.7% of bookings)
    let repeatCount = 0;
    const targetRepeatCount = Math.floor(1248 * 0.387); // ~483 repeat customers

    const today = new Date();

    for (const group of bookingDistribution) {
      for (let i = 0; i < group.count; i++) {
        // Generate a creation date spread across the current year
        const randomMonth = Math.floor(Math.random() * 12);
        const randomDay = Math.floor(Math.random() * 28) + 1;
        const createdAt = new Date(today.getFullYear(), randomMonth, randomDay);

        // Define checkin / checkout dates
        // We need exactly 9 checkins today and 10 checkouts today
        let checkInDate = new Date(createdAt);
        checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * 10) + 1);

        let checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 5) + 1);

        // Generate repeat status
        let isRepeatCustomer = false;
        if (repeatCount < targetRepeatCount) {
          isRepeatCustomer = true;
          repeatCount++;
        }

        // Amount mapping
        let amount = Math.floor(Math.random() * 8000) + 2000; // Average ₹2000-₹10000 per booking

        bookingsToCreate.push({
          status: group.status,
          amount,
          isRepeatCustomer,
          checkInDate,
          checkOutDate,
          createdAt
        });
      }
    }

    // Adjust specific elements to ensure Today's Checkins (9) and Today's Checkouts (10) match perfectly
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Force exactly 9 bookings checkInDate to be today
    for (let i = 0; i < 9; i++) {
      bookingsToCreate[i].checkInDate = new Date(startOfToday.getTime() + i * 3600000); // spread across hours today
      bookingsToCreate[i].status = 'Confirmed';
    }

    // Force exactly 10 bookings checkOutDate to be today
    for (let i = 9; i < 19; i++) {
      bookingsToCreate[i].checkOutDate = new Date(startOfToday.getTime() + (i - 9) * 3600000);
      bookingsToCreate[i].status = 'Completed';
    }

    // Force exactly 28 today's bookings (createdAt is today)
    for (let i = 0; i < 28; i++) {
      bookingsToCreate[i].createdAt = new Date(startOfToday.getTime() + i * 30 * 60000); // every 30 mins
    }

    // Force Today's Revenue to equal ₹1,25,600 across the 28 today bookings
    // 28 bookings. Let's make their amounts sum to 125600
    const baseAmount = Math.floor(125600 / 28); // 4485
    let currentSum = 0;
    for (let i = 0; i < 28; i++) {
      if (i === 27) {
        bookingsToCreate[i].amount = 125600 - currentSum;
      } else {
        bookingsToCreate[i].amount = baseAmount;
        currentSum += baseAmount;
      }
    }

    // Batch insert bookings for speed
    const batchSize = 200;
    for (let i = 0; i < bookingsToCreate.length; i += batchSize) {
      const batch = bookingsToCreate.slice(i, i + batchSize);
      await Booking.insertMany(batch);
    }

    console.log(`Seeded ${bookingsToCreate.length} Bookings.`);
    console.log('Database seeding successfully completed.');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
