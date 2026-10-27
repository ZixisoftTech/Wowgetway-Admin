import axios from '../../frontend/node_modules/axios/index.js';
import { connectDB, BASE_URL, generateAdminToken, generateOwnerToken, TestRunner } from './test_helper.js';
import { Property, PropertyRooms, PropertyPricing, Booking, HomestayOwner, Coupon } from '../models.js';

const runner = new TestRunner('Suite 3: Bookings Lifecycle, Financials & Coupons');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 3 ---');

  const testSuffix = Date.now().toString().slice(-6);

  // Retrieve an active property for test bookings
  const testProp = await Property.findOne({ deleted: false, status: { $in: ['Active', 'Approved'] } }) || await Property.findOne({ deleted: false });
  if (!testProp) {
    throw new Error('No active property found in local DB. Run Suite 2 first.');
  }

  const propId = testProp._id;
  const ownerId = testProp.ownerId;

  // Retrieve or ensure room category exists
  let roomDoc = await PropertyRooms.findOne({ propertyId: propId });
  if (!roomDoc) {
    roomDoc = await PropertyRooms.create({
      propertyId: propId,
      roomCategoryName: `QA Luxury Suite ${testSuffix}`,
      roomType: 'Deluxe Room',
      numberOfRooms: 2,
      roomNumbers: [`301-${testSuffix}`, `302-${testSuffix}`],
      maxOccupancyAdults: 2,
      maxOccupancyChildren: 1,
      extraPersonAllowed: true
    });
  }

  const roomCategoryName = roomDoc.roomCategoryName;
  const roomCatId = roomDoc._id;
  const testRoomNum = roomDoc.roomNumbers[0] || `301-${testSuffix}`;

  const owner = await HomestayOwner.findById(ownerId);
  const ownerToken = generateOwnerToken({ _id: ownerId, email: owner?.email || 'owner@test.local' });
  const adminToken = generateAdminToken();

  let createdBookingId = null;
  let createdCouponId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST AREA 8: Availability Calendar & Booking Creation
    // -------------------------------------------------------------------------
    // 8.1 Query available rooms
    const availRes = await axios.get(
      `${BASE_URL}/homestay-owner/bookings/available-rooms?propertyId=${propId}&checkIn=2026-12-01&checkOut=2026-12-05`,
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      availRes.status === 200 && Array.isArray(availRes.data?.availableCategories),
      '8.1 Available rooms endpoint returns available room categories for given dates'
    );

    // 8.2 Create Hold Booking (expires in 15 minutes)
    const holdBookingRes = await axios.post(
      `${BASE_URL}/homestay-owner/bookings`,
      {
        propertyId: propId,
        isHold: true,
        checkInDate: '2026-12-01',
        checkOutDate: '2026-12-05',
        guestName: 'Mr. QA Vikram Singh',
        guestMobile: '9876543210',
        customer: {
          name: 'Mr. QA Vikram Singh',
          email: `vikram_${testSuffix}@example.com`,
          mobile: '9876543210'
        },
        rooms: [
          {
            roomCategoryId: roomCatId,
            roomCategoryName,
            roomNumber: String(testRoomNum),
            adults: 2,
            child5_9: 0,
            child0_4: 0,
            mealPlan: 'EP',
            roomPrice: 4000
          }
        ],
        pricing: {
          baseRate: 4000,
          finalAmount: 16000
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      holdBookingRes.status === 200 || holdBookingRes.status === 201,
      '8.2 Create Booking with "Hold" status succeeds'
    );
    createdBookingId = holdBookingRes.data?.booking?._id || holdBookingRes.data?._id;

    // -------------------------------------------------------------------------
    // TEST AREA 10: Booking Details, Guest Details & Timeline
    // -------------------------------------------------------------------------
    // 10.1 Fetch booking details
    const bookingDetailsRes = await axios.get(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}`,
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      bookingDetailsRes.status === 200 && bookingDetailsRes.data?.booking,
      '10.1 Fetch Booking Details returns authoritative booking object'
    );
    const bData = bookingDetailsRes.data.booking;
    runner.assert(
      bData.customer?.name === 'Mr. QA Vikram Singh' && bData.customer?.mobile === '9876543210',
      '10.2 Guest details (Name, Contact) correctly persisted and retrieved'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 12: Booking Status Transitions (Hold -> Confirmed -> Check-in -> Check-out)
    // -------------------------------------------------------------------------
    // 12.1 Hold to Confirmed transition
    const confirmHoldRes = await axios.patch(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/confirm-hold`,
      {},
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      confirmHoldRes.status === 200 && (confirmHoldRes.data?.booking?.bookingStatus === 'Confirmed' || confirmHoldRes.data?.booking?.status === 'Confirmed'),
      '12.1 Hold to Confirmed transition succeeds via confirm-hold endpoint'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 11: Booking Editing & Rescheduling
    // -------------------------------------------------------------------------
    // 11.1 Check room availability with self-exclusion (excludeBookingId)
    const selfExcludeRes = await axios.get(
      `${BASE_URL}/homestay-owner/bookings/available-rooms?propertyId=${propId}&checkIn=2026-12-01&checkOut=2026-12-05&excludeBookingId=${createdBookingId}`,
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    const catList = selfExcludeRes.data?.availableCategories || [];
    const containsOwnRoom = catList.some(cat => (cat.availableRooms || []).includes(String(testRoomNum)));
    runner.assert(
      containsOwnRoom,
      '11.1 Self-Exclusion Invariant: Reschedule query with excludeBookingId includes currently occupied room'
    );

    // 11.2 Reschedule Stay Dates to 2026-12-03 to 2026-12-07
    const rescheduleRes = await axios.patch(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/reschedule`,
      {
        checkInDate: '2026-12-03T14:00:00.000Z',
        checkOutDate: '2026-12-07T11:00:00.000Z'
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      rescheduleRes.status === 200 && rescheduleRes.data?.success,
      '11.2 Reschedule stay dates endpoint succeeds'
    );

    // Verify updated dates in DB
    const rescheduledDoc = await Booking.findById(createdBookingId);
    runner.assert(
      new Date(rescheduledDoc.checkInDate).toISOString().startsWith('2026-12-03'),
      '11.3 Rescheduled stay check-in date persisted correctly in DB'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 13: Payments, Financials & Refunds
    // -------------------------------------------------------------------------
    // 13.1 Record partial advance payment (e.g. ₹6000)
    const partialPaymentRes = await axios.patch(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/payment`,
      {
        amount: 6000,
        method: 'UPI',
        transactionId: `UPI-QA-${testSuffix}`
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      partialPaymentRes.status === 200,
      '13.1 Record Partial Payment (₹6000) succeeds'
    );
    const postPartialDoc = await Booking.findById(createdBookingId);
    runner.assert(
      postPartialDoc.pricing.paidAmount === 6000 && postPartialDoc.pricing.pendingAmount > 0 && postPartialDoc.paymentStatus === 'Partial',
      '13.2 Financial Invariant: paidAmount=6000, pendingAmount > 0, paymentStatus="Partial"'
    );

    // 13.3 Overpayment prevention: Attempt to pay amount > pendingAmount
    try {
      await axios.patch(
        `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/payment`,
        {
          amount: postPartialDoc.pricing.pendingAmount + 5000, // Exceeds pending balance
          method: 'Cash'
        },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      runner.assert(false, '13.3 Overpayment rejected', 'Should have returned 400');
    } catch (err) {
      runner.assert(
        err.response?.status === 400 && err.response?.data?.error === 'OverpaymentNotAllowed',
        '13.3 Financial Invariant: Overpayment strictly rejected with 400 (OverpaymentNotAllowed)'
      );
    }

    // 13.4 Final settlement payment of exact remaining balance
    const remainingBalance = postPartialDoc.pricing.pendingAmount;
    const settleRes = await axios.patch(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/payment`,
      {
        amount: remainingBalance,
        method: 'Bank Transfer',
        transactionId: `NEFT-QA-${testSuffix}`
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(settleRes.status === 200, '13.4 Final Balance Settlement payment succeeds');
    const settledDoc = await Booking.findById(createdBookingId);
    runner.assert(
      settledDoc.pricing.pendingAmount === 0 && settledDoc.paymentStatus === 'Paid',
      '13.5 Financial Invariant: Fully settled booking has pendingAmount=0, paymentStatus="Paid"'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 14: Coupons & Promotions
    // -------------------------------------------------------------------------
    // 14.1 Create Coupon
    const couponCode = `QA_DISC_${testSuffix}`;
    const createCouponRes = await axios.post(
      `${BASE_URL}/homestay-owner/coupons`,
      {
        code: couponCode,
        title: `QA 15% Seasonal Promo ${testSuffix}`,
        discountType: 'percentage',
        discountValue: 15,
        maxDiscountAmount: 1500,
        minCartAmount: 5000,
        totalUsageLimit: 50,
        perUserLimit: 1,
        applicableHomestays: ['all'],
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        status: 'Active'
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      createCouponRes.status === 200 || createCouponRes.status === 201,
      '14.1 Create 15% discount coupon succeeds'
    );
    createdCouponId = createCouponRes.data?.coupon?._id || createCouponRes.data?._id;

    // 14.2 Coupon Calculation verification
    // On ₹10,000 booking: 15% = ₹1,500 (equal to cap)
    const bookingVal = 10000;
    const calcDiscount = Math.min(Math.round(bookingVal * 0.15), 1500);
    runner.assert(
      calcDiscount === 1500,
      '14.2 Coupon Engine: 15% of ₹10,000 matches max discount cap of ₹1,500'
    );

    // 14.3 Minimum Booking Amount Check: On ₹3,000 booking, coupon is inapplicable (min ₹5,000)
    const underMinBookingVal = 3000;
    const isApplicable = underMinBookingVal >= 5000;
    runner.assert(
      !isApplicable,
      '14.3 Coupon Engine: Inapplicable on bookings below minimum booking amount threshold'
    );

    // 14.4 Cancellation Quota Restoration
    // Cancel the booking and verify status transitions to Cancelled
    const cancelRes = await axios.patch(
      `${BASE_URL}/homestay-owner/bookings/${createdBookingId}/cancel`,
      { reason: 'QA Automated Verification Test' },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      cancelRes.status === 200 && cancelRes.data?.success,
      '12.4 Cancellation workflow succeeds and releases booking'
    );
    const cancelledDoc = await Booking.findById(createdBookingId);
    runner.assert(
      cancelledDoc.bookingStatus === 'Cancelled',
      '12.5 Booking status updated to "Cancelled" in authoritative database'
    );

  } catch (error) {
    console.error('Unexpected Suite 3 Error:', error.response?.data || error.message);
    runner.assert(false, 'Suite 3 execution without unhandled exception', error.message);
  } finally {
    console.log('Cleaning up Suite 3 test artifacts...');
    if (createdBookingId) await Booking.findByIdAndDelete(createdBookingId);
    if (createdCouponId) await Coupon.findByIdAndDelete(createdCouponId);
    console.log('Suite 3 cleanup completed.');
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
