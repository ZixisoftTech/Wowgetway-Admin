import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { 
  Admin, 
  HomestayOwner, 
  Booking, 
  Employee, 
  Homestay, 
  NewAmenity, 
  NewRoomType, 
  NewState, 
  NewCity,
  SmtpSettings 
} from './models.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways_local';

async function seed() {
  console.log(`[Seed] Connecting to local MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('[Seed] Connected to local MongoDB.');

  // 1. Super Admin
  const adminEmail = 'devgateways947@gmail.com';
  let admin = await Admin.findOne({ email: adminEmail });
  const adminPasswordHash = await bcrypt.hash('Gateway@123', 10);
  if (!admin) {
    admin = new Admin({
      email: adminEmail,
      fullName: 'Dev Gateways Admin',
      name: 'Dev Gateways',
      role: 'Super Admin',
      passwordHash: adminPasswordHash,
      status: 'Active',
      mobileNumber: '+91 98765 43210'
    });
    await admin.save();
    console.log(`[Seed] Created Super Admin: ${adminEmail} / Gateway@123`);
  } else {
    admin.passwordHash = adminPasswordHash;
    admin.status = 'Active';
    admin.lockoutUntil = null;
    admin.failedLoginAttempts = 0;
    await admin.save();
    console.log(`[Seed] Updated Super Admin: ${adminEmail} / Gateway@123`);
  }

  // 2. Homestay Owner
  const ownerEmail = 'rajesh@gmail.com';
  let owner = await HomestayOwner.findOne({ email: ownerEmail });
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 10);
  if (!owner) {
    owner = new HomestayOwner({
      firstName: 'Rajesh',
      lastName: 'Kulkarni',
      fatherName: 'Gopal Kulkarni',
      email: ownerEmail,
      mobile: '9823456781',
      whatsApp: '9823456781',
      password: ownerPasswordHash,
      aadharNo: '111122223333',
      panNo: 'ABCDE1111F',
      status: 'Active',
      aadharVerified: true,
      panVerified: true,
      bankVerified: true,
      properties: []
    });
    await owner.save();
    console.log(`[Seed] Created Homestay Owner: ${ownerEmail} / Owner@123`);
  } else {
    owner.password = ownerPasswordHash;
    owner.status = 'Active';
    await owner.save();
    console.log(`[Seed] Updated Homestay Owner: ${ownerEmail} / Owner@123`);
  }

  // 3. Master Amenities
  const sampleAmenities = [
    { amenityName: 'Free High-Speed WiFi', amenityIcon: 'wifi' },
    { amenityName: 'Swimming Pool', amenityIcon: 'pool' },
    { amenityName: 'Air Conditioning', amenityIcon: 'air' },
    { amenityName: 'Complimentary Breakfast', amenityIcon: 'coffee' },
    { amenityName: 'Free Parking', amenityIcon: 'car' },
    { amenityName: 'CCTV Surveillance', amenityIcon: 'camera' },
    { amenityName: 'Power Backup', amenityIcon: 'zap' },
    { amenityName: 'Geyser / Hot Water', amenityIcon: 'thermometer' }
  ];

  for (const item of sampleAmenities) {
    const exists = await NewAmenity.findOne({ amenityName: item.amenityName });
    if (!exists) {
      await NewAmenity.create({ ...item, status: 'Active' });
    }
  }
  console.log('[Seed] Seeded Master Amenities.');

  // 4. Master Room Types
  const sampleRoomTypes = ['Deluxe Room', 'Super Deluxe Room', 'Family Suite', 'Standard Room', 'Luxury Villa', 'Cottage'];
  for (const rt of sampleRoomTypes) {
    const exists = await NewRoomType.findOne({ roomTypeName: rt });
    if (!exists) {
      await NewRoomType.create({ roomTypeName: rt, status: 'Active' });
    }
  }
  console.log('[Seed] Seeded Master Room Types.');

  // 5. Sample Employees
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    await Employee.insertMany([
      { firstName: 'Amit', lastName: 'Verma', fatherName: 'Suresh Verma', aadharNo: '123412341234', panNo: 'ABCDE1234F', role: 'Homestay Manager', mobile: '9876500001', email: 'amit@wowgateways.com', status: 'Active', monthlySalary: 45000 },
      { firstName: 'Priya', lastName: 'Singh', fatherName: 'Rajesh Singh', aadharNo: '234523452345', panNo: 'BCDEF2345G', role: 'Booking Coordinator', mobile: '9876500002', email: 'priya@wowgateways.com', status: 'Active', monthlySalary: 38000 }
    ]);
    console.log('[Seed] Seeded initial employees.');
  }

  // 6. Sample Bookings
  const bookingCount = await Booking.countDocuments();
  if (bookingCount === 0) {
    const now = new Date();
    await Booking.create({
      bookingId: 'BK-10001',
      bookingType: 'Homestay Booking',
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid',
      amount: 6500,
      checkInDate: now,
      checkOutDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      customer: { name: 'Rahul Sharma', mobile: '9812345678', email: 'rahul@example.com' },
      propertyDetails: { propertyName: 'Hill View Homestay', ownerName: 'Rajesh Kulkarni' }
    });
    console.log('[Seed] Seeded sample booking.');
  }

  console.log('[Seed] Local seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
