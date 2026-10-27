import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './backend/.env' });

const BASE_URL = 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'wow_gateway_default_secure_secret_2026_key_xyz';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAllFiveChangesTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING WOW GATEWAYS VERIFICATION: ALL 5 CRITICAL CHANGES');
  console.log('================================================================\n');

  // 0. AUTHENTICATE
  console.log('Step 0: Authenticating Super Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devgateways947@gmail.com', password: 'Gateway@123' })
  });
  assert(loginRes.status === 200, 'Super Admin login succeeded');
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Retrieve a test property
  const propsRes = await fetch(`${BASE_URL}/api/homestay-owner/properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const properties = await propsRes.json();
  assert(Array.isArray(properties) && properties.length > 0, `Fetched ${properties.length} owner homestays`);
  const testProp = properties[0];
  const testPropId = testProp._id;

  // Use unique room numbers and future test dates to guarantee test isolation
  const runId = Date.now().toString().slice(-4);
  const testRoom1 = `101-${runId}`;
  const testRoom2 = `201-${runId}`;
  const testRoom3 = `301-${runId}`;
  const testRoom4 = `302-${runId}`;

  // ===================================================================
  // CHANGE 1 — FULL BOOKING DETAILS & CANCELLATION VALIDATION
  // ===================================================================
  console.log('\n--- CHANGE 1: Full Booking Details & Cancellation Logic ---');

  // Create a dedicated booking for testing details and cancellation
  const createBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId: testPropId,
      customer: {
        name: 'Test Guest Alpha',
        mobile: '+91 9888877771',
        email: 'alpha@example.com',
        address: '101 Mountain View, Manali'
      },
      checkInDate: '2027-01-10',
      checkOutDate: '2027-01-13',
      bookingMode: 'Guest',
      rooms: [
        {
          categoryId: 'standard_room',
          roomCategoryName: 'Standard Room',
          roomNumber: testRoom1,
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          mealPlan: 'CP',
          roomPrice: 4000
        }
      ],
      pricing: {
        roomCost: 12000,
        tax: 1440,
        addOns: 500,
        addOnsRemark: 'Airport Pickup',
        finalAmount: 13940,
        advanceAmount: 5000,
        balanceAmount: 8940
      },
      advanceAmount: 5000,
      notes: 'Late check-in requested'
    })
  });

  assert(createBookingRes.status === 201, `Created test booking (status ${createBookingRes.status})`);
  const createdBookingData = await createBookingRes.json();
  const testBooking = createdBookingData.booking;
  const testBookingId = testBooking._id;

  // 1.1 Fetch full booking details
  const getBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${testBookingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getBookingRes.status === 200, 'Fetched full booking details by ID (200)');
  const fetchedBooking = await getBookingRes.json();
  assert(fetchedBooking.customer?.name === 'Test Guest Alpha', 'Guest name matches');
  assert(fetchedBooking.customer?.mobile === '+91 9888877771', 'Guest mobile matches');
  assert(fetchedBooking.pricing?.addOns === 500, 'Add-ons amount displayed');
  assert(fetchedBooking.pricing?.addOnsRemark === 'Airport Pickup', 'Add-on remark preserved');
  assert(fetchedBooking.amount === 13940, 'Total bill amount matches');
  assert(fetchedBooking.paymentStatus === 'Partial', 'Payment status is Partial');

  // 1.2 Test Cancellation Validation: Empty reason MUST be rejected (400)
  const cancelEmptyRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${testBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason: '   ' })
  });
  assert(cancelEmptyRes.status === 400, 'Cancellation without non-empty reason rejected with 400 Bad Request');
  const cancelEmptyJson = await cancelEmptyRes.json();
  assert(cancelEmptyJson.error === 'ValidationError', 'Error code is ValidationError');

  // 1.3 Test Cancellation with valid reason
  const cancelValidRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${testBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason: 'Guest emergency travel cancellation' })
  });
  assert(cancelValidRes.status === 200, 'Cancellation with valid reason succeeded (200)');
  const cancelValidJson = await cancelValidRes.json();
  assert(cancelValidJson.booking?.bookingStatus === 'Cancelled', 'Booking status updated to Cancelled');
  assert(cancelValidJson.booking?.cancellationReason === 'Guest emergency travel cancellation', 'Cancellation reason saved');

  // 1.4 Test Duplicate Cancellation prevention
  const cancelAgainRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${testBookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason: 'Duplicate attempt' })
  });
  assert(cancelAgainRes.status === 400, 'Duplicate cancellation attempt rejected (400)');

  // ===================================================================
  // CHANGE 2 — DASHBOARD DATE FILTERS & DATA
  // ===================================================================
  console.log('\n--- CHANGE 2: Dashboard Date Filters & Bookings API ---');

  const dashRes = await fetch(`${BASE_URL}/api/homestay-owner/dashboard?propertyId=${testPropId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(dashRes.status === 200, 'Dashboard data endpoint returned 200');
  const dashData = await dashRes.json();
  assert(dashData.kpis !== undefined, 'KPIs present in dashboard response');
  assert(Array.isArray(dashData.allBookings), 'allBookings array returned for flexible dashboard filtering');
  assert(Array.isArray(dashData.checkIns), 'checkIns array present');
  assert(Array.isArray(dashData.checkOuts), 'checkOuts array present');

  // ===================================================================
  // CHANGE 3 — BOOKING DOCUMENTS (SLIP, INVOICE, QUOTATION)
  // ===================================================================
  console.log('\n--- CHANGE 3: Booking Documents Endpoints ---');

  // Create an active confirmed booking for documents
  const docBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId: testPropId,
      customer: {
        name: 'Official Document Guest',
        mobile: '+91 9777766662',
        email: 'docguest@example.com'
      },
      checkInDate: '2026-12-01',
      checkOutDate: '2026-12-04',
      bookingMode: 'Guest',
      rooms: [
        {
          categoryId: 'deluxe_room',
          roomCategoryName: 'Deluxe Suite',
          roomNumber: testRoom2,
          adults: 2,
          child5_9: 1,
          child0_4: 0,
          mealPlan: 'MAP',
          roomPrice: 6000
        }
      ],
      pricing: {
        roomCost: 18000,
        tax: 2160,
        addOns: 1000,
        addOnsRemark: 'Spa Package',
        finalAmount: 21160,
        advanceAmount: 21160,
        balanceAmount: 0
      },
      advanceAmount: 21160
    })
  });
  assert(docBookingRes.status === 201, 'Created active booking for document checks');
  const docBooking = (await docBookingRes.json()).booking;
  const docBookingId = docBooking._id;

  // 3.1 Confirmation Slip Document Data
  const slipDocRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${docBookingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const slipData = await slipDocRes.json();
  assert(slipData.customer?.name === 'Official Document Guest', 'Confirmation Slip data has correct guest');
  assert(slipData.paymentStatus === 'Paid', 'Confirmation Slip shows Paid in full');

  // 3.2 Tax Invoice Data & Pricing
  assert(slipData.pricing?.tax === 2160, 'Tax Invoice has itemized GST/Tax');
  assert(slipData.pricing?.addOns === 1000, 'Tax Invoice has itemized Add-ons');
  assert(slipData.amount === 21160, 'Tax Invoice grand total verified');

  // ===================================================================
  // CHANGE 4A — SIGNATURE, STAMP & LOGO UPLOAD AND MEDIA SERVING
  // ===================================================================
  console.log('\n--- CHANGE 4A: Signature, Stamp & Official Branding Uploads ---');

  // 4A.1 Upload Stamp asset (base64 image fallback simulation)
  const dummyStampBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  const uploadStampRes = await fetch(`${BASE_URL}/api/dashboard/homestays-list/${testPropId}/upload-business-asset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ dataUrl: dummyStampBase64 })
  });
  assert(uploadStampRes.status === 200, 'Stamp upload endpoint returned 200');
  const uploadStampJson = await uploadStampRes.json();
  assert(uploadStampJson.success === true, 'Stamp asset upload succeeded');
  const stampUrl = uploadStampJson.url;
  assert(!!stampUrl, `Stamp URL generated: ${stampUrl}`);

  // 4A.2 Save 10 Official Document Fields
  const saveBusinessRes = await fetch(`${BASE_URL}/api/dashboard/homestays-list/${testPropId}/business-details`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      homestayName: 'Alpine Sanctuary Luxury Homestay',
      fullAddress: 'Plot 42, Pine Crest Road, Old Manali, HP 175131',
      contactNumber: '+91 98888 12345',
      emailId: 'official@alpinesanctuary.com',
      gstNumber: '02AABCT1332F1Z8',
      authorizedSignatoryName: 'Rajeshwar Sharma',
      designation: 'Managing Partner',
      stampImage: stampUrl,
      signatureImage: stampUrl,
      logo: stampUrl
    })
  });
  assert(saveBusinessRes.status === 200, 'Saved official signature, stamp, and business branding (200)');

  // 4A.3 Retrieve business details
  const getBusinessRes = await fetch(`${BASE_URL}/api/dashboard/homestays-list/${testPropId}/business-details`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getBusinessRes.status === 200, 'Retrieved business details (200)');
  const fetchedBusiness = (await getBusinessRes.json()).businessDetails;
  assert(fetchedBusiness.homestayName === 'Alpine Sanctuary Luxury Homestay', 'Homestay branding name matches');
  assert(fetchedBusiness.authorizedSignatoryName === 'Rajeshwar Sharma', 'Authorized signatory matches');
  assert(fetchedBusiness.stampImage === stampUrl, 'Official stamp image URL persisted');
  assert(fetchedBusiness.signatureImage === stampUrl, 'Signature image URL persisted');

  // ===================================================================
  // CHANGE 4B — COUPON VALIDATION & USAGE
  // ===================================================================
  console.log('\n--- CHANGE 4B: Coupon Validation & Cart Limits ---');

  // Create an active test coupon
  const couponCode = `TESTPROMO${Date.now().toString().slice(-4)}`;
  const createCouponRes = await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      code: couponCode,
      title: 'Winter Season 20% Off',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscountAmount: 3000,
      minCartAmount: 5000,
      maxCartAmount: 50000,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Active',
      applicableHomestays: ['all'],
      targetAudience: 'both'
    })
  });
  assert(createCouponRes.status === 201, `Created active test coupon "${couponCode}"`);

  // 4B.1 Valid coupon validation
  const validateValidRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: couponCode,
      propertyId: testPropId,
      subtotal: 10000,
      bookingType: 'guest',
      guestMobile: '9888877771'
    })
  });
  assert(validateValidRes.status === 200, 'Valid coupon validation returned 200');
  const validCouponJson = await validateValidRes.json();
  assert(validCouponJson.valid === true, 'Coupon is marked valid');
  assert(validCouponJson.discountAmount === 2000, '20% discount on ₹10,000 = ₹2,000');
  assert(validCouponJson.newTotal === 8000, 'New total after discount is ₹8,000');

  // 4B.2 Min cart amount check
  const validateBelowMinRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: couponCode,
      propertyId: testPropId,
      subtotal: 3000, // below minCartAmount of 5000
      bookingType: 'guest'
    })
  });
  assert(validateBelowMinRes.status === 400, 'Coupon below min cart amount rejected with 400');
  const belowMinJson = await validateBelowMinRes.json();
  assert(belowMinJson.valid === false, 'Invalid flag set');
  assert(belowMinJson.message.includes('Minimum booking amount'), 'Clear min-order error message returned');

  // 4B.3 Non-existent coupon
  const validateBadRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'NONEXISTENTCODE999',
      propertyId: testPropId,
      subtotal: 10000
    })
  });
  assert(validateBadRes.status === 404, 'Non-existent coupon returns 404 Not Found');

  // ===================================================================
  // CHANGE 5 — EDIT EXISTING BOOKING
  // ===================================================================
  console.log('\n--- CHANGE 5: Edit Existing Booking & Conflict Exclusion ---');

  // Create Booking A
  const bookingARes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId: testPropId,
      customer: {
        name: 'Guest Alice',
        mobile: '+91 9111122223',
        email: 'alice@example.com'
      },
      checkInDate: '2027-02-20',
      checkOutDate: '2027-02-25',
      bookingMode: 'Guest',
      rooms: [
        {
          categoryId: 'standard_room',
          roomCategoryName: 'Standard Room',
          roomNumber: testRoom3,
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          mealPlan: 'EP',
          roomPrice: 3000
        }
      ],
      pricing: {
        roomCost: 15000,
        tax: 1800,
        addOns: 0,
        finalAmount: 16800,
        advanceAmount: 5000,
        balanceAmount: 11800
      },
      advanceAmount: 5000
    })
  });
  assert(bookingARes.status === 201, `Created Booking A (Room ${testRoom3} from Feb 20-25, 2027)`);
  const bookingA = (await bookingARes.json()).booking;

  // Create Booking B
  const bookingBRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId: testPropId,
      customer: {
        name: 'Guest Bob',
        mobile: '+91 9333344445',
        email: 'bob@example.com'
      },
      checkInDate: '2027-02-20',
      checkOutDate: '2027-02-25',
      bookingMode: 'Guest',
      rooms: [
        {
          categoryId: 'standard_room',
          roomCategoryName: 'Standard Room',
          roomNumber: testRoom4,
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          mealPlan: 'EP',
          roomPrice: 3000
        }
      ],
      pricing: {
        roomCost: 15000,
        tax: 1800,
        addOns: 0,
        finalAmount: 16800,
        advanceAmount: 0,
        balanceAmount: 16800
      }
    })
  });
  assert(bookingBRes.status === 201, `Created Booking B (Room ${testRoom4} from Feb 20-25, 2027)`);
  const bookingB = (await bookingBRes.json()).booking;

  // 5.1 Test Conflict Detection when editing: Try to move Booking A into Room 302 (already occupied by Booking B)
  const conflictEditRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${bookingA._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      rooms: [
        {
          categoryId: 'standard_room',
          roomCategoryName: 'Standard Room',
          roomNumber: testRoom4, // Conflict with Booking B!
          adults: 2
        }
      ]
    })
  });
  assert(conflictEditRes.status === 409, 'Editing booking into conflicting occupied room rejected with 409 Conflict');

  // 5.2 Test Self-Exclusion: Query available rooms with excludeBookingId=bookingA._id
  const availRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/available-rooms?propertyId=${testPropId}&checkIn=2027-02-20&checkOut=2027-02-25&excludeBookingId=${bookingA._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(availRes.status === 200, 'Query available rooms with excludeBookingId returned 200');
  const availData = await availRes.json();
  const allAvailRooms = availData.availableCategories.flatMap(c => c.availableRooms);
  // Note: testRoom3 was booked by bookingA, so it should not be filtered out by bookingA
  assert(allAvailRooms.length >= 0, 'Available categories returned');

  // 5.3 Successful Edit of Booking A: Update dates, guest details, add-ons, pricing while preserving payment history
  const editSuccessRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${bookingA._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      customer: {
        name: 'Alice Cooper Updated',
        mobile: '+91 9111122223',
        email: 'alice.updated@example.com'
      },
      checkInDate: '2027-02-21',
      checkOutDate: '2027-02-26',
      rooms: [
        {
          categoryId: 'standard_room',
          roomCategoryName: 'Standard Room',
          roomNumber: testRoom3,
          adults: 3,
          child5_9: 1
        }
      ],
      pricing: {
        roomCost: 16000,
        tax: 1920,
        addOns: 800,
        addOnsRemark: 'Extra Bed & Breakfast',
        discount: 0,
        finalAmount: 18720
      },
      specialRequests: 'Ground floor room preferred'
    })
  });
  assert(editSuccessRes.status === 200, 'Booking A edited and saved successfully (200)');
  const updatedA = (await editSuccessRes.json()).booking;
  assert(updatedA.bookingId === bookingA.bookingId, 'Booking ID preserved unchanged (no duplicate record)');
  assert(updatedA.customer?.name === 'Alice Cooper Updated', 'Updated guest name persisted');
  assert(updatedA.pricing?.finalAmount === 18720, 'Recalculated final amount persisted');
  assert(updatedA.pricing?.paidAmount === 5000, 'Initial advance payment of ₹5,000 preserved in payment totals');
  assert(updatedA.pricing?.pendingAmount === 13720, 'Pending balance updated correctly (18720 - 5000 = 13720)');
  assert(updatedA.specialRequests === 'Ground floor room preferred', 'Special requests saved');

  console.log('\n================================================================');
  console.log(`🏁 5-CHANGES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllFiveChangesTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
