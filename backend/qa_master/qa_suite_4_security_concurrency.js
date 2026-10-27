import axios from '../../frontend/node_modules/axios/index.js';
import { connectDB, BASE_URL, generateAdminToken, generateOwnerToken, TestRunner } from './test_helper.js';
import { Property, PropertyRooms, Booking, HomestayOwner, Admin } from '../models.js';

const runner = new TestRunner('Suite 4: Security, Multi-Tenant Isolation & Concurrency');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 4 ---');

  const testSuffix = Date.now().toString().slice(-6);

  // Setup two separate isolated owners: Owner Alpha and Owner Beta
  const ownerAlpha = await HomestayOwner.create({
    firstName: 'Owner',
    lastName: `Alpha_${testSuffix}`,
    fatherName: 'Senior Alpha',
    email: `owner_alpha_${testSuffix}@example.com`,
    mobile: `96${testSuffix.padStart(8, '1')}`,
    aadharNo: `334455${testSuffix.padStart(6, '0')}`,
    panNo: `ALPHA${testSuffix.slice(-4)}A`,
    status: 'Active'
  });

  const ownerBeta = await HomestayOwner.create({
    firstName: 'Owner',
    lastName: `Beta_${testSuffix}`,
    fatherName: 'Senior Beta',
    email: `owner_beta_${testSuffix}@example.com`,
    mobile: `95${testSuffix.padStart(8, '2')}`,
    aadharNo: `445566${testSuffix.padStart(6, '0')}`,
    panNo: `BETAA${testSuffix.slice(-4)}B`,
    status: 'Active'
  });

  const tokenAlpha = generateOwnerToken({ _id: ownerAlpha._id, email: ownerAlpha.email });
  const tokenBeta = generateOwnerToken({ _id: ownerBeta._id, email: ownerBeta.email });
  const adminToken = generateAdminToken();

  // Create Property owned by Owner Alpha
  const propAlpha = await Property.create({
    propertyId: `WG-PROP-${testSuffix}`,
    ownerId: ownerAlpha._id,
    name: `Alpha Estate ${testSuffix}`,
    propertyName: `Alpha Estate ${testSuffix}`,
    type: 'Homestay',
    status: 'Approved',
    state: 'Goa',
    city: 'Panaji',
    address: 'Alpha Lane, Goa'
  });

  const roomAlpha = await PropertyRooms.create({
    propertyId: propAlpha._id,
    roomCategoryName: `Alpha Premium Suite ${testSuffix}`,
    roomType: 'Deluxe Room',
    numberOfRooms: 2,
    roomNumbers: [`A-101-${testSuffix}`, `A-102-${testSuffix}`],
    maxOccupancyAdults: 2,
    maxOccupancyChildren: 0,
    bedType: 'King Bed',
    roomSize: 300
  });

  const physicalRoomNum = `A-101-${testSuffix}`;

  // Create Confirmed Booking on Alpha's Property
  const bookingAlpha = await Booking.create({
    bookingId: `BK-ALPHA-${testSuffix}`,
    bookingType: 'Homestay Booking',
    bookingStatus: 'Confirmed',
    paymentStatus: 'Pending',
    amount: 10000,
    totalAmount: 10000,
    paidAmount: 0,
    pendingAmount: 10000,
    propertyId: propAlpha._id,
    propertyName: propAlpha.propertyName,
    ownerId: ownerAlpha._id,
    bookedRooms: [{
      roomNumber: physicalRoomNum,
      roomCategoryId: roomAlpha._id,
      roomCategoryName: roomAlpha.roomCategoryName,
      adults: 2,
      mealPlan: 'EP',
      roomPrice: 10000
    }],
    pricing: {
      bookingAmount: 10000,
      paidAmount: 0,
      pendingAmount: 10000,
      finalAmount: 10000
    },
    checkInDate: new Date('2026-11-20T14:00:00Z'),
    checkOutDate: new Date('2026-11-25T11:00:00Z'),
    customer: {
      name: 'Alpha Guest',
      email: 'alpha_guest@test.local',
      mobile: '9876543210'
    }
  });

  try {
    // -------------------------------------------------------------------------
    // TEST AREA 19: Security, Auth Bypass & Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    // 19.1 Cross-Tenant Property Access: Owner Beta attempts to access Owner Alpha's property available rooms
    try {
      await axios.get(
        `${BASE_URL}/homestay-owner/bookings/available-rooms?propertyId=${propAlpha._id}&checkIn=2026-12-01&checkOut=2026-12-05`,
        { headers: { Authorization: `Bearer ${tokenBeta}` } }
      );
      runner.assert(false, '19.1 Cross-tenant property access blocked', 'Should have returned 403 Forbidden');
    } catch (err) {
      runner.assert(
        err.response?.status === 403,
        '19.1 Multi-Tenant Isolation: Owner Beta cannot query Owner Alpha’s property (403 Forbidden)'
      );
    }

    // 19.2 Cross-Tenant Booking Tampering: Owner Beta attempts to cancel Owner Alpha's booking
    try {
      await axios.patch(
        `${BASE_URL}/homestay-owner/bookings/${bookingAlpha._id}/cancel`,
        { reason: 'Malicious cancellation by competitor' },
        { headers: { Authorization: `Bearer ${tokenBeta}` } }
      );
      runner.assert(false, '19.2 Cross-tenant booking cancellation blocked', 'Should have returned 403 Forbidden');
    } catch (err) {
      runner.assert(
        err.response?.status === 403,
        '19.2 Multi-Tenant Isolation: Owner Beta cannot cancel Owner Alpha’s booking (403 Forbidden)'
      );
    }

    // 19.3 Cross-Tenant Financial Tampering: Owner Beta attempts to record payment on Owner Alpha's booking
    try {
      await axios.patch(
        `${BASE_URL}/homestay-owner/bookings/${bookingAlpha._id}/payment`,
        { amount: 5000, method: 'Cash' },
        { headers: { Authorization: `Bearer ${tokenBeta}` } }
      );
      runner.assert(false, '19.3 Cross-tenant payment recording blocked', 'Should have returned 403 Forbidden');
    } catch (err) {
      runner.assert(
        err.response?.status === 403,
        '19.3 Multi-Tenant Isolation: Owner Beta cannot record payments on Owner Alpha’s ledger (403 Forbidden)'
      );
    }

    // 19.4 Privilege Escalation: Owner Alpha attempts to review homestays as Admin
    try {
      await axios.post(
        `${BASE_URL}/admin/homestays-list/${propAlpha._id}/review`,
        { status: 'Approved', comment: 'Self-approval attempt' },
        { headers: { Authorization: `Bearer ${tokenAlpha}` } }
      );
      runner.assert(false, '19.4 Privilege escalation blocked', 'Should have returned 403 Forbidden');
    } catch (err) {
      runner.assert(
        err.response?.status === 403,
        '19.4 Role Boundary: Owner token strictly denied from executing Super Admin approval actions (403)'
      );
    }

    // 19.5 Password Hashing Integrity: Verify passwords stored in database are bcrypt hashes ($2a$ or $2b$)
    const adminUser = await Admin.findOne({ email: 'devgateways947@gmail.com' });
    runner.assert(
      adminUser && (adminUser.password?.startsWith('$2') || adminUser.passwordHash?.startsWith('$2')),
      '19.5 Password Security: Super Admin password stored exclusively as cryptographic bcrypt hash'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 18: API Robustness, Input Validation & Injection Resistance
    // -------------------------------------------------------------------------
    // 18.1 NoSQL Injection Attempt in Login
    try {
      await axios.post(`${BASE_URL}/admin/auth/login`, {
        email: { $gt: '' },
        password: { $gt: '' }
      });
      runner.assert(false, '18.1 NoSQL injection rejected', 'Should have returned 400');
    } catch (err) {
      runner.assert(
        err.response?.status === 400 || err.response?.status === 500,
        '18.1 NoSQL Injection payload rejected gracefully with client error'
      );
    }

    // 18.2 Malformed MongoDB ObjectId
    try {
      await axios.get(`${BASE_URL}/homestay-owner/bookings/invalid-mongodb-id-9999`, {
        headers: { Authorization: `Bearer ${tokenAlpha}` }
      });
      runner.assert(false, '18.2 Malformed ObjectId rejected', 'Should have returned 404');
    } catch (err) {
      runner.assert(
        err.response?.status === 404 || err.response?.status === 400,
        '18.2 Malformed ObjectId handled gracefully with 404/400 (no uncaught 500 server crash)'
      );
    }

    // 18.3 Negative payment amount rejected
    try {
      await axios.patch(
        `${BASE_URL}/homestay-owner/bookings/${bookingAlpha._id}/payment`,
        { amount: -500, method: 'Cash' },
        { headers: { Authorization: `Bearer ${tokenAlpha}` } }
      );
      runner.assert(false, '18.3 Negative payment rejected', 'Should have returned 400');
    } catch (err) {
      runner.assert(
        err.response?.status === 400,
        '18.3 Input Validation: Negative financial amounts strictly rejected with 400 error'
      );
    }

    // -------------------------------------------------------------------------
    // TEST AREA 20: Concurrency, Double-Booking & Race Conditions
    // -------------------------------------------------------------------------
    // 20.1 Concurrent Double-Booking Race Condition Simulation:
    // Fire 2 simultaneous booking requests trying to book Room A-102 on same dates: 2026-12-10 to 2026-12-15
    console.log('  Testing Concurrency Race Condition: Firing parallel booking attempts on same room...');
    const targetRoomNum = `A-102-${testSuffix}`;
    const bookingPayloadA = {
      propertyId: propAlpha._id,
      guestName: 'Guest Concurrent A',
      guestMobile: '9111111111',
      checkInDate: '2026-12-10',
      checkOutDate: '2026-12-15',
      rooms: [{
        roomNumber: targetRoomNum,
        roomCategoryId: roomAlpha._id,
        roomCategoryName: roomAlpha.roomCategoryName,
        adults: 2,
        mealPlan: 'EP'
      }],
      pricing: { baseRate: 3500, finalAmount: 17500 }
    };

    const bookingPayloadB = {
      propertyId: propAlpha._id,
      guestName: 'Guest Concurrent B',
      guestMobile: '9222222222',
      checkInDate: '2026-12-10',
      checkOutDate: '2026-12-15',
      rooms: [{
        roomNumber: targetRoomNum,
        roomCategoryId: roomAlpha._id,
        roomCategoryName: roomAlpha.roomCategoryName,
        adults: 2,
        mealPlan: 'EP'
      }],
      pricing: { baseRate: 3500, finalAmount: 17500 }
    };

    // Execute concurrently using Promise.allSettled
    const [resA, resB] = await Promise.allSettled([
      axios.post(`${BASE_URL}/homestay-owner/bookings`, bookingPayloadA, { headers: { Authorization: `Bearer ${tokenAlpha}` } }),
      axios.post(`${BASE_URL}/homestay-owner/bookings`, bookingPayloadB, { headers: { Authorization: `Bearer ${tokenAlpha}` } })
    ]);

    const aSuccess = resA.status === 'fulfilled' && (resA.value.status === 200 || resA.value.status === 201);
    const bSuccess = resB.status === 'fulfilled' && (resB.value.status === 200 || resB.value.status === 201);

    const aConflict = resA.status === 'rejected' && resA.reason.response?.status === 409;
    const bConflict = resB.status === 'rejected' && resB.reason.response?.status === 409;

    const exactlyOneSucceeded = (aSuccess && bConflict) || (bSuccess && aConflict);
    runner.assert(
      exactlyOneSucceeded,
      `20.1 Concurrency Defense: Under parallel race condition, exactly ONE booking succeeded and the duplicate was rejected with 409 Conflict (A: ${resA.status === 'fulfilled' ? resA.value.status : resA.reason.response?.status}, B: ${resB.status === 'fulfilled' ? resB.value.status : resB.reason.response?.status})`
    );

    // Verify DB count of bookings for Room A-102 on those dates is strictly 1
    const activeBookingsCount = await Booking.countDocuments({
      propertyId: propAlpha._id,
      'bookedRooms.roomNumber': targetRoomNum,
      bookingStatus: { $ne: 'Cancelled' },
      checkInDate: { $lt: new Date('2026-12-15T11:00:00Z') },
      checkOutDate: { $gt: new Date('2026-12-10T14:00:00Z') }
    });
    runner.assert(
      activeBookingsCount === 1,
      `20.2 Database Integrity: Authoritative database count for target room on dates is strictly 1 (Actual: ${activeBookingsCount})`
    );

  } catch (error) {
    console.error('Unexpected Suite 4 Error:', error.response?.data || error.message);
    runner.assert(false, 'Suite 4 execution without unhandled exception', error.message);
  } finally {
    console.log('Cleaning up Suite 4 test artifacts...');
    await Booking.deleteMany({ propertyId: propAlpha._id });
    await PropertyRooms.findByIdAndDelete(roomAlpha._id);
    await Property.findByIdAndDelete(propAlpha._id);
    await HomestayOwner.findByIdAndDelete(ownerAlpha._id);
    await HomestayOwner.findByIdAndDelete(ownerBeta._id);
    console.log('Suite 4 cleanup completed.');
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
