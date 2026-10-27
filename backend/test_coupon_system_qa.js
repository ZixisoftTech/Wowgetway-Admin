import assert from 'assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const BASE_URL = 'http://localhost:5005';
let passed = 0;
let failed = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runCouponTests() {
  console.log('================================================================');
  console.log('🧪 WOW GATEWAYS — COMPREHENSIVE COUPON SYSTEM QA TEST SUITE');
  console.log('================================================================\n');

  // 1. Authenticate Super Admin
  console.log('--- Phase 1: Authentication & Property Discovery ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devgateways947@gmail.com', password: 'Gateway@123' })
  });
  check(loginRes.status === 200, 'Super Admin login succeeded');
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Retrieve properties
  const propsRes = await fetch(`${BASE_URL}/api/homestay-owner/properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const properties = await propsRes.json();
  check(Array.isArray(properties) && properties.length >= 2, `Retrieved ${properties.length} homestays for eligibility testing`);

  const propA = properties[0];
  const propB = properties[1];
  const ownerAId = propA.ownerId;

  const runId = Date.now().toString().slice(-4);

  // -------------------------------------------------------------
  // Test 1: Unit & Validation Matrix via /api/public/coupons/validate
  // -------------------------------------------------------------
  console.log('\n--- Phase 2: Coupon Validation Matrix & Error Messaging ---');

  // 1A. Create a percentage coupon with cap & min cart
  const codePercent = `PCT${runId}`;
  const createPctRes = await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codePercent,
      title: '20% Summer Bonanza',
      description: 'Get 20% off up to ₹1,000 on min ₹3,000 booking',
      applicableHomestays: [String(propA._id)],
      targetAudience: 'customer',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscountAmount: 1000,
      minCartAmount: 3000,
      endDate: '2030-12-31',
      totalUsageLimit: 5,
      perUserLimit: 1,
      status: 'Active'
    })
  });
  check(createPctRes.status === 201, `Created 20% capped coupon ${codePercent} (Status: ${createPctRes.status})`);

  // 1B. Validate percentage with cap on eligible homestay
  const valCapRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: codePercent.toLowerCase(), // test case-insensitivity
      propertyId: String(propA._id),
      subtotal: 10000, // 20% of 10000 = 2000, but capped at 1000
      bookingType: 'guest'
    })
  });
  const valCapData = await valCapRes.json();
  check(valCapRes.status === 200 && valCapData.valid === true, 'Validation on eligible property returned 200 valid');
  check(valCapData.discountAmount === 1000, `Percentage discount capped at maxDiscountAmount of ₹1,000 (Got ₹${valCapData.discountAmount})`);
  check(valCapData.newTotal === 9000, `New total reflects discount (Got ₹${valCapData.newTotal})`);

  // 1C. Ineligible homestay rejection
  const valIneligRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: codePercent,
      propertyId: String(propB._id),
      subtotal: 10000,
      bookingType: 'guest'
    })
  });
  const valIneligData = await valIneligRes.json();
  check(valIneligRes.status === 400 && valIneligData.valid === false, 'Validation on ineligible homestay rejected (400)');
  check(valIneligData.message.includes('not valid for this homestay'), `Clear message: "${valIneligData.message}"`);

  // 1D. Minimum cart amount rejection
  const valMinCartRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: codePercent,
      propertyId: String(propA._id),
      subtotal: 2500, // below min 3000
      bookingType: 'guest'
    })
  });
  const valMinCartData = await valMinCartRes.json();
  check(valMinCartRes.status === 400 && valMinCartData.valid === false, 'Subtotal below minCartAmount rejected (400)');
  check(valMinCartData.message.includes('Minimum booking amount of ₹3,000'), `Clear min cart error: "${valMinCartData.message}"`);

  // 1E. Target audience mismatch (Customer only vs Agent)
  const valAudienceRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: codePercent,
      propertyId: String(propA._id),
      subtotal: 5000,
      bookingType: 'agent'
    })
  });
  const valAudienceData = await valAudienceRes.json();
  check(valAudienceRes.status === 400 && valAudienceData.valid === false, 'B2B Travel Agent using Direct Customer coupon rejected (400)');
  check(valAudienceData.message.includes('exclusively for Direct Guest bookings'), `Audience message: "${valAudienceData.message}"`);

  // 1F. Expired coupon rejection
  const codeExpired = `EXP${runId}`;
  await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codeExpired,
      title: 'Expired Offer',
      applicableHomestays: ['all'],
      discountType: 'fixed',
      discountValue: 500,
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      status: 'Active'
    })
  });
  const valExpRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: codeExpired, propertyId: String(propA._id), subtotal: 5000 })
  });
  const valExpData = await valExpRes.json();
  check(valExpRes.status === 400 && valExpData.valid === false, 'Expired coupon rejected (400)');
  check(valExpData.message.includes('expired'), `Expired message: "${valExpData.message}"`);

  // 1G. Inactive coupon rejection
  const codeInactive = `INACT${runId}`;
  await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codeInactive,
      title: 'Draft Offer',
      applicableHomestays: ['all'],
      discountType: 'fixed',
      discountValue: 500,
      endDate: '2030-01-01',
      status: 'Inactive'
    })
  });
  const valInactRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: codeInactive, propertyId: String(propA._id), subtotal: 5000 })
  });
  const valInactData = await valInactRes.json();
  check(valInactRes.status === 400 && valInactData.valid === false, 'Inactive coupon rejected (400)');
  check(valInactData.message.includes('no longer active'), `Inactive message: "${valInactData.message}"`);

  // 1H. Non-existent coupon rejection (404)
  const valNotFoundRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'INVALID_BOGUS_CODE_XYZ', propertyId: String(propA._id), subtotal: 5000 })
  });
  const valNotFoundData = await valNotFoundRes.json();
  check(valNotFoundRes.status === 404 && valNotFoundData.valid === false, 'Non-existent coupon returns 404');
  check(valNotFoundData.message.includes('is invalid'), `Not found message: "${valNotFoundData.message}"`);

  // -------------------------------------------------------------
  // Test 2: Booking Creation with Coupon & Authoritative Backend Calculation
  // -------------------------------------------------------------
  console.log('\n--- Phase 3: Booking Creation with Coupon & Tampering Defense ---');

  // Create a fixed discount coupon
  const codeFixed = `FLAT${runId}`;
  await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codeFixed,
      title: 'Flat ₹500 Discount',
      applicableHomestays: ['all'],
      targetAudience: 'both',
      discountType: 'fixed',
      discountValue: 500,
      minCartAmount: 2000,
      endDate: '2030-12-31',
      totalUsageLimit: 2,
      perUserLimit: 1,
      status: 'Active'
    })
  });

  // Attempt booking with invalid coupon -> must be rejected
  const testRoom1 = `CPN-101-${runId}`;
  const badCouponBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Fraud Guest',
      guestMobile: '9888877771',
      checkInDate: '2028-06-01',
      checkOutDate: '2028-06-03',
      rooms: [{ roomNumber: testRoom1, roomPrice: 3000, adults: 2 }],
      couponCode: 'DOES_NOT_EXIST',
      pricing: { roomCost: 6000, discount: 500, finalAmount: 5500 }
    })
  });
  check(badCouponBookingRes.status === 400, 'Booking with nonexistent coupon rejected (400)');

  // Attempt booking with client-tampered discount (e.g. client sends discount 4000 on a 500 coupon)
  const tamperedBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Tampering Guest',
      guestMobile: '9888877772',
      checkInDate: '2028-06-05',
      checkOutDate: '2028-06-07',
      rooms: [{ roomNumber: testRoom1, roomPrice: 3000, adults: 2 }],
      couponCode: codeFixed,
      pricing: { roomCost: 6000, discount: 4000, finalAmount: 2000 } // fabricated discount!
    })
  });
  const tamperedBookingData = await tamperedBookingRes.json();
  if (tamperedBookingRes.status !== 201) {
    console.error('Tampered booking error response:', tamperedBookingData);
  }
  check(tamperedBookingRes.status === 201, 'Booking created with authoritative recalculation');
  if (tamperedBookingData.booking) {
    check(tamperedBookingData.booking.pricing.discount === 500, `Backend overrode tampered discount with authoritative ₹500 (Got ₹${tamperedBookingData.booking.pricing.discount})`);
    check(tamperedBookingData.booking.pricing.couponCode === codeFixed, `Persisted coupon code is ${codeFixed}`);
  }

  const booking1 = tamperedBookingData.booking || {};

  // -------------------------------------------------------------
  // Test 3: Usage Limits & Per-Customer Limit Enforcement
  // -------------------------------------------------------------
  console.log('\n--- Phase 4: Per-Customer Limits & Exhaustion ---');

  // Customer 9888877772 tries to reuse the same coupon (perUserLimit is 1)
  const duplicateUserRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Tampering Guest Repeated',
      guestMobile: '9888877772', // same mobile!
      checkInDate: '2028-06-10',
      checkOutDate: '2028-06-12',
      rooms: [{ roomNumber: testRoom1, roomPrice: 3000, adults: 2 }],
      couponCode: codeFixed
    })
  });
  const duplicateUserData = await duplicateUserRes.json();
  check(duplicateUserRes.status === 400, 'Re-redemption by same customer rejected (400)');
  check(duplicateUserData.message.includes('already redeemed this coupon the maximum allowed'), `Per-customer limit error message: "${duplicateUserData.message}"`);

  // Another customer redeems 2nd use (totalUsageLimit = 2)
  const testRoom2 = `CPN-102-${runId}`;
  const booking2Res = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Second Guest',
      guestMobile: '9888877773',
      checkInDate: '2028-06-15',
      checkOutDate: '2028-06-17',
      rooms: [{ roomNumber: testRoom2, roomPrice: 3000, adults: 2 }],
      couponCode: codeFixed
    })
  });
  check(booking2Res.status === 201, 'Second eligible customer successfully redeemed coupon (201)');

  // Third customer tries to redeem (totalUsageLimit was 2, now fully exhausted)
  const booking3Res = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Third Guest Over Limit',
      guestMobile: '9888877774',
      checkInDate: '2028-06-20',
      checkOutDate: '2028-06-22',
      rooms: [{ roomNumber: testRoom2, roomPrice: 3000, adults: 2 }],
      couponCode: codeFixed
    })
  });
  const booking3Data = await booking3Res.json();
  check(booking3Res.status === 400, 'Exhausted coupon rejected on booking creation (400)');
  check(booking3Data.message.includes('limit has been fully redeemed'), `Limit message: "${booking3Data.message}"`);

  // -------------------------------------------------------------
  // Test 4: Concurrency & Atomic Limits (Race Condition Simulation)
  // -------------------------------------------------------------
  console.log('\n--- Phase 5: Concurrency & Race Condition Simulation ---');
  const codeRace = `RACE${runId}`;
  await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codeRace,
      title: 'Flash Sale (Only 1 Available)',
      applicableHomestays: ['all'],
      discountType: 'fixed',
      discountValue: 200,
      endDate: '2030-12-31',
      totalUsageLimit: 1, // EXACTLY 1 ALLOWED
      perUserLimit: 1,
      status: 'Active'
    })
  });

  // Launch 3 simultaneous booking attempts competing for the 1 coupon
  const promises = [1, 2, 3].map(i => {
    return fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        propertyId: String(propA._id),
        guestName: `Race Guest ${i}`,
        guestMobile: `988887700${i}`,
        checkInDate: `2028-07-0${i}`,
        checkOutDate: `2028-07-0${i + 1}`,
        rooms: [{ roomNumber: `RACE-${i}-${runId}`, roomPrice: 3000, adults: 2 }],
        couponCode: codeRace
      })
    });
  });

  const raceResults = await Promise.all(promises);
  const raceStatuses = raceResults.map(r => r.status);
  const successCount = raceStatuses.filter(s => s === 201).length;
  const rejectedCount = raceStatuses.filter(s => s === 400 || s === 409).length;

  check(successCount === 1, `Exactly 1 concurrent request succeeded (Got ${successCount})`);
  check(rejectedCount === 2, `Remaining 2 concurrent requests were rejected (Got ${rejectedCount})`);

  // -------------------------------------------------------------
  // Test 5: Booking Edit Lifecycle with Coupons
  // -------------------------------------------------------------
  console.log('\n--- Phase 6: Booking Editing, Coupon Switching & Removal ---');

  // Let's edit booking1 (which currently has codeFixed)
  // A. Change room prices/dates -> recalculates authoritative discount
  const editPriceRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${booking1._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      pricing: { roomCost: 8000 } // cost increased to 8000
    })
  });
  const editPriceData = await editPriceRes.json();
  check(editPriceRes.status === 200, 'Booking edit with price change succeeded (200)');
  check(editPriceData.booking.pricing.discount === 500, 'Coupon discount maintained accurately');
  // Net room cost: 8000 - 500 = 7500. Tax: 7500 * 0.12 = 900. Final: 8400.
  check(editPriceData.booking.pricing.finalAmount === 8400, `Authoritative final amount recalculated to ₹8,400 (Got ₹${editPriceData.booking.pricing.finalAmount})`);

  // B. Remove coupon on edit
  const removeCouponRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${booking1._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      couponCode: '' // clear coupon
    })
  });
  const removeCouponData = await removeCouponRes.json();
  check(removeCouponRes.status === 200, 'Coupon removed successfully on booking edit');
  check(removeCouponData.booking.pricing.discount === 0, 'Discount reset to 0');
  check(removeCouponData.booking.pricing.couponCode === '', 'Coupon code cleared');
  // Final amount without discount: 8000 + (8000 * 0.12 = 960) = 8960.
  check(removeCouponData.booking.pricing.finalAmount === 8960, `Final amount updated without coupon to ₹8,960 (Got ₹${removeCouponData.booking.pricing.finalAmount})`);

  // -------------------------------------------------------------
  // Test 6: Booking Cancellation & Coupon Usage Restoration
  // -------------------------------------------------------------
  console.log('\n--- Phase 7: Booking Cancellation & Usage Restoration ---');

  // Remember codeRace was exhausted (usedCount was 1 of 1).
  // First, find the booking that used codeRace:
  const checkRaceValBefore = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: codeRace, propertyId: String(propA._id), subtotal: 3000 })
  });
  check(checkRaceValBefore.status === 400, 'codeRace is currently exhausted (400)');

  // Let's create a fresh booking with a dedicated coupon, then cancel it and verify the coupon is restored!
  const codeCancel = `RESTORE${runId}`;
  await fetch(`${BASE_URL}/api/homestay-owner/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: codeCancel,
      title: 'Restorable Coupon',
      applicableHomestays: ['all'],
      discountType: 'fixed',
      discountValue: 300,
      endDate: '2030-12-31',
      totalUsageLimit: 1, // Only 1 use
      perUserLimit: 1,
      status: 'Active'
    })
  });

  // Book with codeCancel
  const bookCancelRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      propertyId: String(propA._id),
      guestName: 'Cancel Test Guest',
      guestMobile: '9777766661',
      checkInDate: '2028-08-01',
      checkOutDate: '2028-08-03',
      rooms: [{ roomNumber: `CNL-101-${runId}`, roomPrice: 3000, adults: 2 }],
      couponCode: codeCancel
    })
  });
  const bookCancelData = await bookCancelRes.json();
  check(bookCancelRes.status === 201, 'Booking created with restorable coupon (201)');
  const cancelBookingId = bookCancelData.booking._id;

  // Verify coupon is now exhausted
  const valExhaustedRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: codeCancel, propertyId: String(propA._id), subtotal: 3000 })
  });
  check(valExhaustedRes.status === 400, 'Coupon is exhausted immediately after booking');

  // Cancel the booking
  const cancelRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${cancelBookingId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason: 'Guest requested date cancellation' })
  });
  check(cancelRes.status === 200, 'Booking cancelled successfully (200)');

  // Verify coupon is now restored and valid again!
  const valRestoredRes = await fetch(`${BASE_URL}/api/public/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: codeCancel, propertyId: String(propA._id), subtotal: 3000 })
  });
  const valRestoredData = await valRestoredRes.json();
  check(valRestoredRes.status === 200 && valRestoredData.valid === true, 'Coupon was automatically restored upon booking cancellation and is valid again!');

  // -------------------------------------------------------------
  // Test 7: Super Admin Dashboard Coupons API (/api/dashboard/coupons)
  // -------------------------------------------------------------
  console.log('\n--- Phase 8: Super Admin Dashboard Coupons API ---');
  const superAdminListRes = await fetch(`${BASE_URL}/api/dashboard/coupons?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  check(superAdminListRes.status === 200, 'GET /api/dashboard/coupons returned 200');
  const superAdminListData = await superAdminListRes.json();
  check(Array.isArray(superAdminListData.data), 'Coupons array returned');
  check(superAdminListData.pagination && superAdminListData.pagination.total >= 1, 'Pagination metadata returned');

  // Create via dashboard endpoint
  const adminCode = `ADMINCPN${runId}`;
  const superAdminCreateRes = await fetch(`${BASE_URL}/api/dashboard/coupons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: adminCode,
      type: 'percentage',
      value: 15,
      minOrder: 2500,
      maxUses: 10,
      expiry: '2030-12-31',
      status: 'Active'
    })
  });
  check(superAdminCreateRes.status === 201, 'POST /api/dashboard/coupons created coupon (201)');

  // Update via dashboard endpoint
  const createdAdminCpn = await superAdminCreateRes.json();
  const superAdminUpdateRes = await fetch(`${BASE_URL}/api/dashboard/coupons/${createdAdminCpn.data._id || createdAdminCpn.data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      status: 'Inactive'
    })
  });
  check(superAdminUpdateRes.status === 200, 'PUT /api/dashboard/coupons/:id updated status (200)');

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log('\n================================================================');
  console.log(`🏁 TEST EXECUTION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCouponTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
