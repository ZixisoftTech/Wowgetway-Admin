import mongoose from 'mongoose';
import { Booking, Property } from './models.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways_local';

async function seed() {
  console.log('Connecting to:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const properties = await db.collection('properties').find({ deleted: { $ne: true } }).toArray();
  const propertyRooms = await db.collection('propertyRooms').find({}).toArray();

  console.log(`Found ${properties.length} active properties.`);

  const guestsPool = [
    { name: 'Aarav Sharma', mobile: '9876501234', email: 'aarav.sharma@example.com' },
    { name: 'Priya Patel', mobile: '9823456781', email: 'priya.patel@example.com' },
    { name: 'Vikram Malhotra', mobile: '9811223344', email: 'vikram.m@example.com' },
    { name: 'Ananya Deshmukh', mobile: '9877665544', email: 'ananya.d@example.com' },
    { name: 'Rohan Mehra', mobile: '9845098765', email: 'rohan.mehra@example.com' },
    { name: 'Sneha Verma', mobile: '9765432109', email: 'sneha.verma@example.com' },
    { name: 'Kabir Kapoor', mobile: '9833445566', email: 'kabir.kapoor@example.com' },
    { name: 'Ishita Sen', mobile: '9922114433', email: 'ishita.sen@example.com' },
    { name: 'Aditya Joshi', mobile: '9855667788', email: 'aditya.joshi@example.com' },
    { name: 'Kavya Nair', mobile: '9788990011', email: 'kavya.nair@example.com' },
    { name: 'Tanmay Bhatt', mobile: '9899001122', email: 'tanmay.bhatt@example.com' },
    { name: 'Diya Singhania', mobile: '9866778899', email: 'diya.s@example.com' }
  ];

  let guestIdx = 0;
  let totalCreated = 0;

  // Current anchor date: 2026-10-27
  const now = new Date('2026-10-27T10:00:00.000Z');
  const todayStr = '2026-10-27';

  for (const prop of properties) {
    const propId = prop._id;
    const propRooms = propertyRooms.filter(r => String(r.propertyId) === String(propId));
    
    // Collect all room units for this property
    const units = [];
    for (const pr of propRooms) {
      const roomNos = pr.roomNumbers || pr.rooms || ['101'];
      for (const rNo of roomNos) {
        units.push({
          roomCategoryId: pr._id,
          roomCategoryName: pr.roomCategoryName || pr.name || 'Standard Room',
          roomNumber: String(rNo),
          price: pr.basePrice || pr.price || 3500
        });
      }
    }

    if (units.length === 0) {
      units.push({
        roomCategoryId: new mongoose.Types.ObjectId(),
        roomCategoryName: 'Standard Room',
        roomNumber: '101',
        price: 3000
      });
    }

    console.log(`\nSeeding dummy bookings for: "${prop.name}" (Units: ${units.map(u => u.roomNumber).join(', ')})`);

    // We will create 3 high-value testing scenarios per property:
    // 1. Check-in Today (Partial paid, with remaining balance to test Record Payment & Reschedule)
    // 2. Hold Booking (On hold, to test Confirm Booking and Remove Hold)
    // 3. Upcoming multi-night booking with Add-ons (to test Edit, Tax Invoice, Slip, Quotation)

    const scenarios = [
      {
        type: 'Check-in Today (Partial Paid)',
        status: 'Confirmed',
        checkIn: new Date('2026-10-27T14:00:00.000Z'),
        checkOut: new Date('2026-10-29T11:00:00.000Z'),
        nights: 2,
        paymentStatus: 'Partial',
        payRatio: 0.5,
        addOns: 500,
        addOnsRemark: 'Airport Transfer & Extra Breakfast',
        unit: units[0]
      },
      {
        type: 'Hold Booking (Pending)',
        status: 'Hold',
        checkIn: new Date('2026-10-28T14:00:00.000Z'),
        checkOut: new Date('2026-10-30T11:00:00.000Z'),
        nights: 2,
        paymentStatus: 'Pending',
        payRatio: 0,
        addOns: 0,
        addOnsRemark: '',
        unit: units[1 % units.length]
      },
      {
        type: 'Upcoming Confirmed (Fully Paid)',
        status: 'Confirmed',
        checkIn: new Date('2026-11-05T14:00:00.000Z'),
        checkOut: new Date('2026-11-08T11:00:00.000Z'),
        nights: 3,
        paymentStatus: 'Paid',
        payRatio: 1.0,
        addOns: 1200,
        addOnsRemark: 'Bonfire & Guided Orchard Trek',
        unit: units[2 % units.length]
      }
    ];

    for (const sc of scenarios) {
      const guest = guestsPool[guestIdx % guestsPool.length];
      guestIdx++;

      // Generate unique bookingId
      const countTotal = await Booking.countDocuments();
      const codeSeq = String(countTotal + 1010 + totalCreated).padStart(5, '0');
      const bCode = `WG-BK-${codeSeq}`;

      const ratePerNight = sc.unit.price || 3500;
      const basePrice = ratePerNight * sc.nights;
      const tax = Math.round(basePrice * 0.12);
      const discount = 0;
      const addOns = sc.addOns;
      const finalAmount = basePrice + tax + addOns - discount;
      const paidAmount = Math.round(finalAmount * sc.payRatio);
      const pendingAmount = finalAmount - paidAmount;

      const newBooking = new Booking({
        bookingId: bCode,
        bookingType: 'Homestay Booking',
        bookingStatus: sc.status,
        paymentStatus: sc.paymentStatus,
        amount: finalAmount,
        checkInDate: sc.checkIn,
        checkOutDate: sc.checkOut,
        propertyId: propId,
        ownerId: prop.ownerId,
        bookedRooms: [{
          roomCategoryId: sc.unit.roomCategoryId,
          roomCategoryName: sc.unit.roomCategoryName,
          roomNumber: sc.unit.roomNumber,
          adults: 2,
          child5_9: 0,
          child0_4: 0,
          mealPlan: 'CP',
          roomPrice: ratePerNight
        }],
        bookingMode: 'Guest',
        bookingSource: 'Direct Website',
        specialRequests: sc.addOnsRemark || 'Quiet room with scenic valley view.',
        notes: `Created for owner verification across homestay "${prop.name}".`,
        customer: {
          name: guest.name,
          mobile: guest.mobile,
          email: guest.email,
          whatsApp: guest.mobile,
          address: 'Bengaluru, Karnataka'
        },
        guests: {
          total: 2,
          adults: 2,
          children: 0
        },
        propertyDetails: {
          propertyId: String(propId),
          propertyName: prop.name,
          ownerName: prop.ownerName || 'Host',
          location: prop.address || prop.city || 'Manali',
          roomCategory: sc.unit.roomCategoryName,
          roomNumber: sc.unit.roomNumber,
          mealPlan: 'CP'
        },
        pricing: {
          basePrice,
          bookingAmount: basePrice,
          tax,
          addOns,
          addOnsRemark: sc.addOnsRemark,
          discount,
          paidAmount,
          pendingAmount,
          finalAmount
        },
        paymentDetails: {
          method: 'UPI',
          transactionId: paidAmount > 0 ? `UPI-${Date.now().toString().slice(-6)}-${totalCreated}` : '',
          paymentDate: paidAmount > 0 ? sc.checkIn : null,
          paymentStatus: sc.paymentStatus
        },
        paymentHistory: paidAmount > 0 ? [{
          amount: paidAmount,
          method: 'UPI',
          transactionId: `TXN-${Date.now().toString().slice(-6)}-${totalCreated}`,
          remark: sc.paymentStatus === 'Paid' ? 'Full payment received' : 'Advance booking payment',
          date: sc.checkIn,
          recordedBy: 'Host'
        }] : [],
        timeline: [
          {
            activity: `Booking created via Direct Website by ${guest.name}`,
            timestamp: sc.checkIn,
            createdBy: guest.name
          },
          ...(paidAmount > 0 ? [{
            activity: `Advance payment of ₹${paidAmount.toLocaleString()} recorded via UPI`,
            timestamp: sc.checkIn,
            createdBy: 'Host'
          }] : []),
          ...(sc.status === 'Hold' ? [{
            activity: 'Room placed on Hold pending guest confirmation',
            timestamp: sc.checkIn,
            createdBy: 'Host'
          }] : [])
        ]
      });

      await newBooking.save();
      totalCreated++;
      console.log(`  ✅ Created ${bCode} (${sc.type}) | Room ${sc.unit.roomNumber} | Guest: ${guest.name} | Total: ₹${finalAmount} | Paid: ₹${paidAmount} | Status: ${sc.status}`);
    }
  }

  console.log(`\n🎉 Successfully seeded ${totalCreated} new test bookings across all homestays!`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
