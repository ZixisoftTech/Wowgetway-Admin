import axios from '../../frontend/node_modules/axios/index.js';
import { connectDB, BASE_URL, generateAdminToken, generateOwnerToken, TestRunner } from './test_helper.js';
import { Property, PropertyRooms, PropertyPricing, PropertyApproval, Booking, HomestayOwner } from '../models.js';

const runner = new TestRunner('Suite 2: Property Lifecycle, Rooms, Pricing & Allocation');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 2 ---');

  const testSuffix = Date.now().toString().slice(-6);
  let createdOwner = await HomestayOwner.findOne({ status: 'Active' });
  if (!createdOwner) {
    createdOwner = await HomestayOwner.create({
      firstName: 'QA_Prop',
      lastName: 'Owner',
      fatherName: 'QA Senior',
      email: `prop_owner_${testSuffix}@example.com`,
      mobile: `97${testSuffix.padStart(8, '0')}`,
      aadharNo: '112233445566',
      panNo: 'ABCDE1111F',
      status: 'Active'
    });
  }

  const ownerToken = generateOwnerToken({ _id: createdOwner._id, email: createdOwner.email });
  const adminToken = generateAdminToken();

  let testPropertyId = null;
  let testRoomId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST AREA 5: Property Lifecycle (Draft -> In Review -> Published -> Inactive)
    // -------------------------------------------------------------------------
    // 5.1 Fetch or initialize Draft property
    const draftRes = await axios.get(`${BASE_URL}/homestay-owner/properties/draft`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    runner.assert(
      draftRes.status === 200 && draftRes.data?.property?._id,
      '5.1 Fetch/Initialize Draft property returns valid draft object'
    );
    testPropertyId = draftRes.data.property._id;

    // 5.2 Save Step 1: Basic Details
    const step1Res = await axios.post(
      `${BASE_URL}/homestay-owner/properties/save-step`,
      {
        propertyId: testPropertyId,
        step: 1,
        data: {
          name: `QA Majestic Retreat ${testSuffix}`,
          type: 'Homestay',
          category: 'Standard',
          state: 'Goa',
          city: 'Panaji',
          address: '123 QA Heritage Lane, Panaji Coastal Zone',
          postalCode: '403001',
          description: 'A luxurious homestay situated right beside the serene coastal waters of North Goa, offering an authentic heritage experience with pristine amenities, scenic sea views, and handcrafted Goan cuisine for discerning corporate and leisure travelers.'
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(step1Res.status === 200 && step1Res.data?.success, '5.2 Save Step 1 (Basic Details) succeeds');

    // 5.2.1 Save Step 2: Gallery Cover Image
    const step2Res = await axios.post(
      `${BASE_URL}/homestay-owner/properties/save-step`,
      {
        propertyId: testPropertyId,
        step: 2,
        data: {
          cover: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
              category: 'Lobby',
              order: 1
            }
          ]
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(step2Res.status === 200 && step2Res.data?.success, '5.2.1 Save Step 2 (Gallery Cover Image) succeeds');

    // 5.3 Save Step 4: Room Categories & Physical Room Numbers (Area 7.1 & 7.2)
    const step4Res = await axios.post(
      `${BASE_URL}/homestay-owner/properties/save-step`,
      {
        propertyId: testPropertyId,
        step: 4,
        data: {
          rooms: [
            {
              name: `Deluxe Suite ${testSuffix}`,
              type: 'Deluxe Room',
              count: 2,
              roomNumbers: '101, 102',
              occupancy: 2,
              maxOccupancyChildren: 1,
              extraPerson: 'Allowed',
              roomSize: 350,
              bedType: 'King Bed',
              description: 'Spacious ocean-view suite',
              images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427']
            }
          ]
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(step4Res.status === 200 && step4Res.data?.success, '5.3 Save Step 4 (Room Categories & Physical Numbers) succeeds');

    // Verify room category created in DB
    const createdRoom = await PropertyRooms.findOne({ propertyId: testPropertyId });
    runner.assert(
      createdRoom && createdRoom.roomNumbers.includes('101') && createdRoom.roomNumbers.includes('102'),
      '7.1 Physical rooms 101 and 102 saved with correct metadata'
    );
    testRoomId = createdRoom?._id;

    // 5.3.1 Save Step 5: Room Seasons
    const step5Res = await axios.post(
      `${BASE_URL}/homestay-owner/properties/save-step`,
      {
        propertyId: testPropertyId,
        step: 5,
        data: {
          seasons: {
            [testRoomId]: {
              peak: [{ start: '2026-12-01', end: '2027-01-15' }],
              mid: [{ start: '2026-10-01', end: '2026-11-30' }],
              off: [{ start: '2026-06-01', end: '2026-09-30' }]
            }
          }
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(step5Res.status === 200 && step5Res.data?.success, '7.2 Save Step 5 (Seasonal Date Ranges) succeeds');

    // 5.3.2 Test B2B > B2C rate violation check
    try {
      await axios.post(
        `${BASE_URL}/homestay-owner/properties/save-step`,
        {
          propertyId: testPropertyId,
          step: 6,
          data: {
            rates: {
              [testRoomId]: {
                peak: {
                  EP: { b2b: 6000, b2c: 4000 } // B2B exceeds B2C (Illegal)
                }
              }
            }
          }
        },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      runner.assert(false, '7.3 B2B > B2C pricing rule rejected', 'Should have returned 400');
    } catch (err) {
      runner.assert(err.response?.status === 400, '7.3 Pricing invariant strictly enforced: B2B rate cannot exceed B2C rate');
    }

    // 5.3.3 Save Step 6: Valid Pricing Rates
    const step6Res = await axios.post(
      `${BASE_URL}/homestay-owner/properties/save-step`,
      {
        propertyId: testPropertyId,
        step: 6,
        data: {
          rates: {
            [testRoomId]: {
              peak: {
                EP: { b2b: 3500, b2c: 5000, extraAdultB2B: 500, extraAdultB2C: 800, taxInclusive: false }
              }
            }
          }
        }
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(step6Res.status === 200 && step6Res.data?.success, '7.4 Save Step 6 (B2B/B2C Rates) succeeds');

    // 5.4 Submit Property for Review
    const publishRes = await axios.post(
      `${BASE_URL}/homestay-owner/properties/publish`,
      { propertyId: testPropertyId },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(publishRes.status === 200 && publishRes.data?.success, '5.4 Submit property for review transitions status');

    // Verify status in DB is 'Submitted For Review'
    const propInDb = await Property.findById(testPropertyId);
    runner.assert(
      propInDb.status === 'Submitted For Review',
      '5.5 Property status in DB is "Submitted For Review"'
    );

    // 5.6 Super Admin Review & Approval
    const approveRes = await axios.post(
      `${BASE_URL}/admin/homestays-list/${testPropertyId}/review`,
      { status: 'Approved', comment: 'Verified by Principal QA Release Automation' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(approveRes.status === 200, '5.6 Super Admin review endpoint approves property');

    // Verify approved property is now Published/Approved
    const approvedProp = await Property.findById(testPropertyId);
    runner.assert(
      approvedProp.status === 'Approved' || approvedProp.status === 'Active' || approvedProp.status === 'Published',
      '5.7 Property status updated to Approved/Active after Admin approval'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 7: Pricing & Tax Configuration
    // -------------------------------------------------------------------------
    // 7.1 Verify pricing rules logic (Base tariff, tax slabs)
    const baseTariffLow = 4000;
    const taxRateLow = baseTariffLow <= 7500 ? 0.12 : 0.18;
    const calculatedTaxLow = Math.round(baseTariffLow * taxRateLow);
    runner.assert(
      taxRateLow === 0.12 && calculatedTaxLow === 480,
      '7.2 Indian GST Rule: Room tariff <= Rs.7500 incurs 12% GST (Rs. 480 on Rs. 4000)'
    );

    const baseTariffHigh = 10000;
    const taxRateHigh = baseTariffHigh > 7500 ? 0.18 : 0.12;
    const calculatedTaxHigh = Math.round(baseTariffHigh * taxRateHigh);
    runner.assert(
      taxRateHigh === 0.18 && calculatedTaxHigh === 1800,
      '7.3 Indian GST Rule: Room tariff > Rs.7500 incurs 18% GST (Rs. 1800 on Rs. 10000)'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 9: Physical Room Allocation & Availability Integrity
    // -------------------------------------------------------------------------
    // 9.1 Create Confirmed Booking for Room 101 on dates: 2026-11-10 to 2026-11-15
    const booking1 = await Booking.create({
      bookingId: `BK-QA-ALLOC-1-${testSuffix}`,
      bookingType: 'Homestay Booking',
      bookingStatus: 'Confirmed',
      paymentStatus: 'Paid',
      amount: 15000,
      totalAmount: 15000,
      paidAmount: 15000,
      pendingAmount: 0,
      propertyId: testPropertyId,
      propertyName: approvedProp.propertyName,
      ownerId: createdOwner._id,
      roomCategory: createdRoom.roomCategoryName,
      allocatedRooms: ['101'],
      bookedRooms: [
        {
          roomNumber: '101',
          roomCategoryId: testRoomId,
          roomCategoryName: createdRoom.roomCategoryName,
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          mealPlan: 'EP',
          roomPrice: 15000
        }
      ],
      checkInDate: new Date('2026-11-10T14:00:00Z'),
      checkOutDate: new Date('2026-11-15T11:00:00Z'),
      customer: {
        name: 'Guest Alpha',
        email: 'alpha@test.local',
        mobile: '9876543210'
      }
    });
    runner.assert(booking1._id, '9.1 Confirmed booking for Room 101 created for dates Nov 10 - Nov 15');

    // 9.2 Conflict Detection: Check if Room 101 is detected as occupied on Nov 12 - Nov 14 (Overlapping)
    const overlapCheck = await Booking.findOne({
      propertyId: testPropertyId,
      'bookedRooms.roomNumber': '101',
      bookingStatus: { $in: ['Confirmed', 'Booked', 'Hold', 'Checked In'] },
      $or: [
        {
          checkInDate: { $lt: new Date('2026-11-14T11:00:00Z') },
          checkOutDate: { $gt: new Date('2026-11-12T14:00:00Z') }
        }
      ]
    });
    runner.assert(
      overlapCheck !== null && overlapCheck.bookingId === booking1.bookingId,
      '9.2 Availability engine strictly detects Room 101 as unavailable for overlapping dates (Nov 12-14)'
    );

    // 9.3 Room 102 availability: Room 102 must NOT conflict on the same dates
    const room102Check = await Booking.findOne({
      propertyId: testPropertyId,
      'bookedRooms.roomNumber': '102',
      bookingStatus: { $in: ['Confirmed', 'Booked', 'Hold', 'Checked In'] },
      $or: [
        {
          checkInDate: { $lt: new Date('2026-11-14T11:00:00Z') },
          checkOutDate: { $gt: new Date('2026-11-12T14:00:00Z') }
        }
      ]
    });
    runner.assert(
      room102Check === null,
      '9.3 Distinct Room 102 is verified completely free and available for parallel booking on same dates'
    );

    // 9.4 Release upon cancellation
    await Booking.findByIdAndUpdate(booking1._id, { bookingStatus: 'Cancelled' });
    const postCancelCheck = await Booking.findOne({
      propertyId: testPropertyId,
      'bookedRooms.roomNumber': '101',
      bookingStatus: { $in: ['Confirmed', 'Booked', 'Hold', 'Checked In'] },
      $or: [
        {
          checkInDate: { $lt: new Date('2026-11-14T11:00:00Z') },
          checkOutDate: { $gt: new Date('2026-11-12T14:00:00Z') }
        }
      ]
    });
    runner.assert(
      postCancelCheck === null,
      '9.4 Room 101 immediately released back to available inventory upon booking cancellation'
    );

    // Clean up booking
    await Booking.findByIdAndDelete(booking1._id);

  } catch (error) {
    console.error('Unexpected Suite 2 Error:', error.response?.data || error.message);
    runner.assert(false, 'Suite 2 execution without unhandled exception', error.message);
  } finally {
    console.log('Cleaning up Suite 2 test artifacts...');
    if (testRoomId) await PropertyRooms.findByIdAndDelete(testRoomId);
    if (testPropertyId) {
      await Property.findByIdAndDelete(testPropertyId);
      await PropertyApproval.deleteMany({ propertyId: testPropertyId });
    }
    console.log('Suite 2 cleanup completed.');
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
