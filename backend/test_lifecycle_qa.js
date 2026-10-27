import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './backend/.env' });

const BASE_URL = 'http://localhost:5005';
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

async function runLifecycleQATests() {
  console.log('================================================================');
  console.log('🧪 WOW GATEWAYS — COMPREHENSIVE 5-DEFECT LIFECYCLE QA SUITE');
  console.log('================================================================\n');

  // Step 0: Login
  console.log('--- STEP 0: Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devgateways947@gmail.com', password: 'Gateway@123' })
  });
  assert(loginRes.status === 200, 'Super Admin login succeeded');
  const { token } = await loginRes.json();

  // Fetch properties
  const propsRes = await fetch(`${BASE_URL}/api/homestay-owner/properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const properties = await propsRes.json();
  assert(Array.isArray(properties) && properties.length > 0, `Loaded ${properties.length} homestay properties`);
  const propertyId = properties[0]._id;

  const runId = Date.now().toString().slice(-4);
  const roomA = `QA-101-${runId}`;
  const roomB = `QA-102-${runId}`;

  // =================================================================
  // TEST SUITE 1: BUG 1 — RESCHEDULING STAY DATES
  // =================================================================
  console.log('\n--- BUG 1: Rescheduling Stay Dates & Payload Contract ---');

  // Create initial booking (2 nights: Nov 10 - Nov 12, 2027)
  const createRes1 = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId,
      customer: {
        name: 'Arjun Verma',
        mobile: '9876500001',
        email: 'arjun.verma@example.com'
      },
      checkInDate: '2027-11-10',
      checkOutDate: '2027-11-12',
      rooms: [{ roomNumber: roomA, adults: 2, mealPlan: 'EP', price: 3000 }],
      pricing: {
        roomCost: 6000,
        tax: 720,
        addOns: 0,
        finalAmount: 6720,
        advancePayment: 3000
      }
    })
  });
  assert(createRes1.status === 201, 'Created Booking 1 for Reschedule testing');
  const booking1 = (await createRes1.json()).booking;
  const b1Id = booking1._id;

  // 1A: Reschedule sending { checkIn, checkOut } format (the exact frontend payload that previously failed!)
  const reschedRes1 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      checkIn: '2027-11-12',
      checkOut: '2027-11-14'
    })
  });
  const reschedData1 = await reschedRes1.json();
  assert(reschedRes1.status === 200, `Reschedule with { checkIn, checkOut } returned 200 (Got ${reschedRes1.status})`);
  assert(reschedData1.success === true, 'Reschedule payload successfully processed');
  assert(reschedData1.booking.checkInDate.startsWith('2027-11-12'), 'Check-in date updated to 2027-11-12');
  assert(reschedData1.booking.checkOutDate.startsWith('2027-11-14'), 'Check-out date updated to 2027-11-14');

  // 1B: Reschedule sending { checkInDate, checkOutDate } format
  const reschedRes2 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      checkInDate: '2027-11-14',
      checkOutDate: '2027-11-18' // 4 nights: price should recalculate!
    })
  });
  const reschedData2 = await reschedRes2.json();
  assert(reschedRes2.status === 200, 'Reschedule with { checkInDate, checkOutDate } returned 200');
  assert(reschedData2.booking.checkInDate.startsWith('2027-11-14'), 'Check-in date updated to 2027-11-14');
  assert(reschedData2.booking.checkOutDate.startsWith('2027-11-18'), 'Check-out date updated to 2027-11-18');
  assert(reschedData2.priceDifference !== undefined, 'Price difference returned in reschedule response');
  assert(Number(reschedData2.booking.pricing?.finalAmount) > 6720, 'Final amount increased proportionally for 4 nights stay');
  assert(Number(reschedData2.booking.pricing?.paidAmount) === 3000, 'Original advance payment of ₹3,000 preserved in payment totals');

  // 1C: Missing dates rejection
  const badResched1 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  assert(badResched1.status === 400, 'Reschedule with empty payload rejected with 400');

  // 1D: Check-in >= Check-out rejection
  const badResched2 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      checkInDate: '2027-11-20',
      checkOutDate: '2027-11-18'
    })
  });
  assert(badResched2.status === 400, 'Reschedule with checkIn >= checkOut rejected with 400');

  // 1E: Concurrency collision check
  // Create another booking in Room A (Nov 25 - Nov 28)
  const createRes2 = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId,
      customer: {
        name: 'Rohan Sharma',
        mobile: '9876500002',
        email: 'rohan.sharma@example.com'
      },
      checkInDate: '2027-11-25',
      checkOutDate: '2027-11-28',
      rooms: [{ roomNumber: roomA, adults: 2, mealPlan: 'EP', price: 3000 }],
      pricing: { finalAmount: 6720, advancePayment: 6720 }
    })
  });
  assert(createRes2.status === 201, 'Created Booking 2 in Room A (Nov 25 - 28)');

  // Try to reschedule Booking 1 into Nov 24 - Nov 27 (overlaps Booking 2 in Room A!)
  const conflictResched = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}/reschedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      checkInDate: '2027-11-24',
      checkOutDate: '2027-11-27'
    })
  });
  assert(conflictResched.status === 409, 'Reschedule into conflicting occupied room rejected with 409 Conflict');
  const conflictMsg = (await conflictResched.json()).message;
  assert(conflictMsg.includes('already occupied'), `Conflict message explains room occupancy: "${conflictMsg}"`);

  // =================================================================
  // TEST SUITE 2: BUG 2 — BOOKING DETAILS ACCESSIBLE BY ALL ID FORMATS
  // =================================================================
  console.log('\n--- BUG 2: Booking Details Canonical Access ---');

  // 2A: Access by MongoDB _id
  const getByIdRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${b1Id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getByIdRes.status === 200, 'GET booking by MongoDB _id succeeded (200)');
  const bData1 = await getByIdRes.json();
  const fetchedB = bData1.booking || bData1;
  assert(fetchedB.customer?.name === 'Arjun Verma', 'Customer name returned correctly');
  assert(Array.isArray(fetchedB.timeline) && fetchedB.timeline.length > 0, 'Audit timeline included');

  // 2B: Access by Booking ID string (e.g. WG-BK-xxxxx)
  const bkStringId = fetchedB.bookingId;
  assert(Boolean(bkStringId), `Generated booking string ID is "${bkStringId}"`);
  const getByStringRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${bkStringId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getByStringRes.status === 200, 'GET booking by bookingId string succeeded (200)');

  // 2C: Access by Booking ID with leading # (e.g. #WG-BK-xxxxx)
  const getByHashRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/%23${bkStringId.replace(/^#/, '')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(getByHashRes.status === 200, 'GET booking by #bookingId succeeded (200)');

  // =================================================================
  // TEST SUITE 3: BUG 3 — GUEST DETAILS CANONICAL ACCESS EVERYWHERE
  // =================================================================
  console.log('\n--- BUG 3: Guest Profile & Lifetime History Everywhere ---');

  // 3A: Guest lookup by booking _id
  const guestByBookingRes = await fetch(`${BASE_URL}/api/homestay-owner/guests/${b1Id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(guestByBookingRes.status === 200, 'GET guest details by booking _id succeeded (200)');
  const guestData1 = await guestByBookingRes.json();
  assert(guestData1.success === true, 'Guest details response success flag is true');
  assert(guestData1.guestProfile?.name === 'Arjun Verma', 'Guest profile name matches');
  assert(guestData1.guestProfile?.phone === '9876500001', 'Guest profile phone matches');
  assert(Array.isArray(guestData1.history), 'Guest booking history array returned');

  // 3B: Guest lookup by guest phone number
  const guestByPhoneRes = await fetch(`${BASE_URL}/api/homestay-owner/guests/9876500001`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(guestByPhoneRes.status === 200, 'GET guest details by phone number succeeded (200)');
  const guestData2 = await guestByPhoneRes.json();
  assert(guestData2.guestProfile?.name === 'Arjun Verma', 'Phone lookup resolves same guest profile');

  // =================================================================
  // TEST SUITE 4: BUG 4 — STRICT OVERPAYMENT PREVENTION ($P \le T$)
  // =================================================================
  console.log('\n--- BUG 4: Strict Overpayment Prevention & Balance Invariant ---');

  // Create dedicated booking with exact known amounts:
  // Total: ₹10,000, Paid: ₹6,000, Pending: ₹4,000
  const roomC = `QA-PAY-${runId}`;
  const createPayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      propertyId,
      customer: {
        name: 'Meera Sen',
        mobile: '9876500003',
        email: 'meera.sen@example.com'
      },
      checkInDate: '2027-12-01',
      checkOutDate: '2027-12-04',
      rooms: [{ roomNumber: roomC, adults: 2, mealPlan: 'EP', price: 3000 }],
      pricing: {
        roomCost: 9000,
        tax: 1000,
        finalAmount: 10000,
        advancePayment: 6000
      }
    })
  });
  assert(createPayRes.status === 201, 'Created Booking for payment testing (Total: ₹10,000, Advance: ₹6,000, Balance: ₹4,000)');
  const payBooking = (await createPayRes.json()).booking;
  const payBookingId = payBooking._id;

  // 4A: Attempt OVERPAYMENT of ₹5,000 (exceeds ₹4,000 pending by ₹1,000)
  const overpayRes1 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: 5000,
      method: 'UPI',
      transactionId: 'UPI-OVERPAY-123',
      remark: 'Test overpayment'
    })
  });
  assert(overpayRes1.status === 400, `Overpayment of ₹5,000 rejected with 400 Bad Request (Got ${overpayRes1.status})`);
  const overpayData1 = await overpayRes1.json();
  assert(overpayData1.error === 'OverpaymentNotAllowed', `Error code is "OverpaymentNotAllowed" (Got "${overpayData1.error}")`);
  assert(overpayData1.message.includes('exceeds the outstanding balance'), `Message clearly states balance limit: "${overpayData1.message}"`);

  // 4B: Attempt invalid negative or zero payment
  const zeroPayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 0, method: 'Cash' })
  });
  assert(zeroPayRes.status === 400, 'Payment of ₹0 rejected with 400');

  const negPayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: -500, method: 'Cash' })
  });
  assert(negPayRes.status === 400, 'Negative payment of -₹500 rejected with 400');

  // 4C: Record valid partial payment of ₹2,500
  const partialPayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: 2500,
      method: 'UPI',
      transactionId: 'UPI-PARTIAL-001',
      remark: 'Second installment'
    })
  });
  assert(partialPayRes.status === 200, 'Partial payment of ₹2,500 accepted (200)');
  const partialData = await partialPayRes.json();
  assert(Number(partialData.booking.pricing?.paidAmount) === 8500, 'Paid amount updated to ₹8,500');
  assert(Number(partialData.booking.pricing?.pendingAmount) === 1500, 'Pending balance updated to ₹1,500 (10000 - 8500)');
  assert(partialData.booking.paymentStatus === 'Partial', 'Payment status is Partial');

  // 4D: Attempt overpayment on newly reduced balance (try to pay ₹2,000 when only ₹1,500 is pending)
  const overpayRes2 = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 2000, method: 'Card' })
  });
  assert(overpayRes2.status === 400, 'Payment of ₹2,000 on ₹1,500 balance rejected with 400 OverpaymentNotAllowed');

  // 4E: Settle exact remaining balance of ₹1,500
  const settlePayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: 1500,
      method: 'Bank Transfer',
      transactionId: 'NEFT-SETTLE-002',
      remark: 'Final settlement'
    })
  });
  assert(settlePayRes.status === 200, 'Exact settlement payment of ₹1,500 accepted (200)');
  const settleData = await settlePayRes.json();
  assert(Number(settleData.booking.pricing?.paidAmount) === 10000, 'Paid amount is exactly ₹10,000');
  assert(Number(settleData.booking.pricing?.pendingAmount) === 0, 'Pending balance is exactly ₹0');
  assert(settleData.booking.paymentStatus === 'Paid', 'Payment status transitioned to Paid');

  // 4F: Attempt payment after fully settled
  const postSettlePayRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}/payment`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount: 1000, method: 'Cash' })
  });
  assert(postSettlePayRes.status === 400, 'Payment attempt on fully settled booking rejected with 400');
  const postSettleData = await postSettlePayRes.json();
  assert(postSettleData.error === 'AlreadyPaid', 'Error code is "AlreadyPaid"');

  // =================================================================
  // TEST SUITE 5: BUG 5 — EDIT BOOKING VIA ORIGINAL CREATE WIZARD
  // =================================================================
  console.log('\n--- BUG 5: Edit Booking Self-Exclusion & Wizard Persistence ---');

  // Verify available rooms endpoint excludes this booking's own rooms
  const availRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/available-rooms?propertyId=${propertyId}&checkIn=2027-12-01&checkOut=2027-12-04&excludeBookingId=${payBookingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(availRes.status === 200, 'Available rooms query with excludeBookingId returned 200');
  const availData = await availRes.json();
  const availCategories = availData.availableCategories || [];
  assert(Array.isArray(availCategories), 'Available categories array returned');
  assert(typeof availData.totalAvailableCount === 'number', 'totalAvailableCount numeric summary returned');

  // Edit booking details via PATCH /api/homestay-owner/bookings/:id
  const editRes = await fetch(`${BASE_URL}/api/homestay-owner/bookings/${payBookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      customer: {
        name: 'Meera Sen Updated',
        mobile: '9876500003',
        email: 'meera.updated@example.com'
      },
      specialRequests: 'High floor, feather pillows, late check-out requested',
      pricing: {
        finalAmount: 11000, // Added ₹1,000 add-ons
        addOns: 1000,
        addOnsRemark: 'Airport pickup & flower bouquet'
      }
    })
  });
  assert(editRes.status === 200, 'Booking edit via PATCH endpoint succeeded (200)');
  const editData = await editRes.json();
  const updatedB = editData.booking || editData;
  assert(updatedB.customer?.name === 'Meera Sen Updated', 'Updated customer name persisted');
  assert(updatedB.customer?.email === 'meera.updated@example.com', 'Updated customer email persisted');
  assert(Number(updatedB.pricing?.finalAmount) === 11000, 'Updated final amount ₹11,000 persisted');
  assert(Number(updatedB.pricing?.paidAmount) === 10000, 'Payment ledger of ₹10,000 preserved during edit');
  assert(Number(updatedB.pricing?.pendingAmount) === 1000, 'New pending balance of ₹1,000 calculated correctly (11000 - 10000)');
  assert(updatedB.paymentStatus === 'Partial', 'Payment status updated to Partial due to new balance');
  assert(updatedB.specialRequests === 'High floor, feather pillows, late check-out requested', 'Special requests persisted');

  console.log('\n================================================================');
  console.log(`🏁 LIFECYCLE QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLifecycleQATests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
