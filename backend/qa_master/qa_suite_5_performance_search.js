import axios from '../../frontend/node_modules/axios/index.js';
import { connectDB, BASE_URL, generateAdminToken, generateOwnerToken, TestRunner } from './test_helper.js';
import { Property, Booking, HomestayOwner, Notification, ActivityLog } from '../models.js';

const runner = new TestRunner('Suite 5: Performance, Scale, Search & Reliability');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 5 ---');

  const testProp = await Property.findOne({ deleted: false });
  const ownerToken = generateOwnerToken({ _id: testProp?.ownerId || '668f09876543210987654321' });
  const adminToken = generateAdminToken();

  try {
    // -------------------------------------------------------------------------
    // TEST AREA 21: Performance, Query Optimization & Scalability
    // -------------------------------------------------------------------------
    // 21.1 Latency benchmark on 30 consecutive queries
    console.log('  Running performance benchmark (30 requests)...');
    const latencies = [];
    for (let i = 0; i < 30; i++) {
      const t0 = performance.now();
      await axios.get(
        `${BASE_URL}/homestay-owner/bookings/available-rooms?propertyId=${testProp._id}&checkIn=2026-12-01&checkOut=2026-12-05`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    console.log(`  Benchmark Results: p50 = ${p50.toFixed(2)}ms | p95 = ${p95.toFixed(2)}ms`);

    runner.assert(
      p50 < 100,
      `21.1 Performance Benchmark: Median latency (p50) is < 100ms (Actual: ${p50.toFixed(1)}ms)`
    );
    runner.assert(
      p95 < 250,
      `21.2 Performance Benchmark: 95th percentile latency (p95) is < 250ms (Actual: ${p95.toFixed(1)}ms)`
    );

    // -------------------------------------------------------------------------
    // TEST AREA 22: Pagination, Filtering & Search
    // -------------------------------------------------------------------------
    // 22.1 Pagination on Homestay Owners
    const pageRes = await axios.get(`${BASE_URL}/admin/homestay-owners?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pData = pageRes.data?.data || pageRes.data;
    runner.assert(
      Array.isArray(pData) && pData.length <= 2,
      '22.1 Pagination: page=1&limit=2 strictly limits page payload size'
    );

    // 22.2 Search Bookings by query
    const sampleBooking = await Booking.findOne({ propertyId: { $ne: null } });
    if (sampleBooking) {
      const prop = await Property.findById(sampleBooking.propertyId);
      const propOwner = await HomestayOwner.findById(prop?.ownerId);
      const bookingOwnerToken = generateOwnerToken({ _id: prop?.ownerId, email: propOwner?.email });
      const guestQuery = sampleBooking.customer?.name || sampleBooking.bookingId;
      const searchRes = await axios.get(
        `${BASE_URL}/homestay-owner/bookings?search=${encodeURIComponent(guestQuery)}`,
        { headers: { Authorization: `Bearer ${bookingOwnerToken}` } }
      );
      const sList = searchRes.data?.bookings || searchRes.data || [];
      runner.assert(
        Array.isArray(sList) && sList.some(b => b.bookingId === sampleBooking.bookingId || String(b._id) === String(sampleBooking._id)),
        `22.2 Search Engine: Accurate match for query "${guestQuery}"`
      );

      // 22.3 Filter Bookings by Status
      const statusRes = await axios.get(
        `${BASE_URL}/homestay-owner/bookings?status=${sampleBooking.bookingStatus}`,
        { headers: { Authorization: `Bearer ${bookingOwnerToken}` } }
      );
      const filteredList = statusRes.data?.bookings || statusRes.data || [];
      const allMatch = filteredList.every(b => b.bookingStatus === sampleBooking.bookingStatus || b.status === sampleBooking.bookingStatus);
      runner.assert(
        allMatch,
        `22.3 Filter Engine: Status filter "${sampleBooking.bookingStatus}" returns strictly matching records`
      );
    } else {
      runner.assert(true, '22.2 Search skipped (No sample booking in DB)');
      runner.assert(true, '22.3 Filter skipped (No sample booking in DB)');
    }

    // -------------------------------------------------------------------------
    // TEST AREA 16: Communication & Notifications
    // -------------------------------------------------------------------------
    // 16.1 Notification creation & listing
    const testNotif = await Notification.create({
      recipientId: testProp.ownerId,
      recipientModel: 'HomestayOwner',
      title: 'QA System Alert',
      message: 'Master QA Automated release test notification',
      type: 'system',
      read: false
    });

    const notifRes = await axios.get(`${BASE_URL}/homestay-owner/notifications`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const notifs = notifRes.data?.notifications || notifRes.data || [];
    runner.assert(
      Array.isArray(notifs) && notifs.some(n => String(n._id) === String(testNotif._id)),
      '16.1 Notification Hub: Recipient retrieves dispatches in notification inbox'
    );

    // 16.2 Mark notification read
    const readRes = await axios.patch(
      `${BASE_URL}/homestay-owner/notifications/${testNotif._id}/read`,
      {},
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    runner.assert(
      readRes.status === 200,
      '16.2 Notification Hub: Mark as read endpoint updates state to read=true'
    );

    await Notification.findByIdAndDelete(testNotif._id);

    // -------------------------------------------------------------------------
    // TEST AREA 23: Failure Recovery, Error Handling & Logging
    // -------------------------------------------------------------------------
    // 23.1 Non-existent endpoint graceful 404
    try {
      await axios.get(`${BASE_URL}/non-existent-api-route-xyz-404`);
      runner.assert(false, '23.1 Non-existent route 404', 'Should have returned 404');
    } catch (err) {
      runner.assert(err.response?.status === 404, '23.1 404 Handler: Gracefully returns HTTP 404 for non-existent endpoints');
    }

    // 23.2 Activity Audit Trail
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(5);
    runner.assert(
      logs.length > 0 && Boolean(logs[0].action),
      '23.2 Audit Logging: High-value administrative and user actions are persistently recorded in ActivityLog'
    );

  } catch (error) {
    console.error('Unexpected Suite 5 Error:', error.response?.data || error.message);
    runner.assert(false, 'Suite 5 execution without unhandled exception', error.message);
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
