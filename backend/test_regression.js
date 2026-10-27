import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './backend/.env' });

const BASE_URL = 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'wow_gateway_default_secure_secret_2026_key_xyz';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wow_gateway_default_secure_refresh_2026_key_abc';

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

async function runRegressionTests() {
  console.log('======================================================');
  console.log('🚀 RUNNING WOW GATEWAYS REGRESSION TESTS (LOCAL DB)');
  console.log('======================================================\n');

  // TEST 1: Super Admin Login
  console.log('Test Group 1: Admin Login & Authentication');
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devgateways947@gmail.com', password: 'Gateway@123' })
  });
  assert(loginRes.status === 200, `Login response status is 200 (got ${loginRes.status})`);
  const loginData = await loginRes.json();
  assert(!!loginData.token, 'Access token returned on login');
  assert(!!loginData.refreshToken, 'Refresh token returned on login');
  assert(loginData.user?.role === 'Super Admin', 'User role is Super Admin');

  const adminToken = loginData.token;
  const adminRefreshToken = loginData.refreshToken;

  // TEST 2: Invalid Password
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devgateways947@gmail.com', password: 'WrongPassword' })
  });
  assert(badLoginRes.status === 400, 'Invalid login rejected with status 400');

  // TEST 3: Expired Access Token triggers 401
  console.log('\nTest Group 2: Token Validation & Refresh Token Flow');
  const expiredToken = jwt.sign(
    { _id: loginData.user._id, email: loginData.user.email, role: 'Super Admin' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  const expiredReq = await fetch(`${BASE_URL}/api/dashboard/owners/stats`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert(expiredReq.status === 401, 'Expired access token returns 401');
  const expiredBody = await expiredReq.json();
  assert(expiredBody.code === 'TOKEN_EXPIRED', 'Response code is TOKEN_EXPIRED');

  // TEST 4: Invalid/Corrupt Token triggers 401
  const corruptReq = await fetch(`${BASE_URL}/api/dashboard/owners/stats`, {
    headers: { Authorization: 'Bearer invalid.corrupt.token' }
  });
  assert(corruptReq.status === 401, 'Corrupted token returns 401');

  // TEST 5: Missing Token triggers 401
  const missingReq = await fetch(`${BASE_URL}/api/dashboard/owners/stats`);
  assert(missingReq.status === 401, 'Missing token returns 401');

  // TEST 6: Token Refresh with valid refresh token in header/body
  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-refresh-token': adminRefreshToken
    },
    body: JSON.stringify({ refreshToken: adminRefreshToken })
  });
  assert(refreshRes.status === 200, 'Refresh endpoint succeeds with 200');
  const refreshData = await refreshRes.json();
  assert(!!refreshData.token, 'New access token received from refresh');
  const newAccessToken = refreshData.token;

  // TEST 7: Expired Refresh Token triggers 401
  const expiredRefreshToken = jwt.sign(
    { _id: loginData.user._id, email: loginData.user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '-1s' }
  );
  const badRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-refresh-token': expiredRefreshToken },
    body: JSON.stringify({ refreshToken: expiredRefreshToken })
  });
  assert(badRefreshRes.status === 401, 'Expired refresh token returns 401');

  // TEST 8: Owner Stats
  console.log('\nTest Group 3: Owner Listing, Filtering, Search & Statistics');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/owners/stats`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(statsRes.status === 200, 'Owner stats endpoint returns 200');
  const statsData = await statsRes.json();
  assert(typeof statsData.totalOwners === 'number' && statsData.totalOwners >= 3, `Stats totalOwners count is >= 3 (got ${statsData.totalOwners})`);

  // TEST 9: Paginated Owners List
  const listRes = await fetch(`${BASE_URL}/api/dashboard/owners?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(listRes.status === 200, 'Paginated owners list returns 200');
  const listData = await listRes.json();
  assert(Array.isArray(listData.data), 'Owners list data is an array');
  assert(listData.totalRecords >= 3, `Total records >= 3 (got ${listData.totalRecords})`);

  // TEST 10: Search filter
  const searchRes = await fetch(`${BASE_URL}/api/dashboard/owners?search=Chetan1&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  const searchData = await searchRes.json();
  assert(searchData.data.some(o => o.firstName.includes('Chetan1')), 'Search filter finds Chetan1');

  // TEST 11: Status filter
  const filterRes = await fetch(`${BASE_URL}/api/dashboard/owners?status=Active&page=1&limit=10`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  const filterData = await filterRes.json();
  assert(filterData.data.every(o => o.status === 'Active'), 'All filtered owners have Active status');

  // TEST 12: Subscription Details for Existing Owner with Active Plan
  console.log('\nTest Group 4: Subscription Details & Assignment');
  const chetan1Id = '6a9951414015068f67716e32';
  const subRes1 = await fetch(`${BASE_URL}/api/admin/homestay-owners/${chetan1Id}/subscription`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(subRes1.status === 200, `Owner ${chetan1Id} subscription retrieved with 200`);
  const subData1 = await subRes1.json();
  assert(subData1.success === true, 'Response success is true');
  assert(subData1.owner.subscription.status === 'Active', 'Owner has Active subscription status');
  assert(subData1.owner.subscription.planName === 'Starter Host', 'Plan name is Starter Host');

  // TEST 13: Subscription Details for Owner Without Active Plan (Rajesh Kulkarni)
  const rajeshId = '6a994c865f80a3035883dcd7';
  // Ensure idempotent state by resetting Rajesh's subscription to None first if previously assigned
  await fetch(`${BASE_URL}/api/admin/homestay-owners/${rajeshId}/subscription`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });

  const subRes2 = await fetch(`${BASE_URL}/api/admin/homestay-owners/${rajeshId}/subscription`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(subRes2.status === 200, `Owner ${rajeshId} (No Plan) subscription retrieved with 200`);
  const subData2 = await subRes2.json();
  assert(subData2.success === true, 'Response success is true for owner without active subscription');
  assert(subData2.owner.subscription.status === 'None', 'Subscription status is None');

  // TEST 14: Lookup subscription by Property ID (Reference Resolver)
  const propId = '6a9958e6e7b9706e532e0e86'; // Floala Inn (belongs to Chetan1)
  const subByPropRes = await fetch(`${BASE_URL}/api/admin/homestay-owners/${propId}/subscription`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(subByPropRes.status === 200, 'Subscription resolved by Property ID returns 200');
  const subByPropData = await subByPropRes.json();
  assert(subByPropData.owner._id === chetan1Id, 'Resolved owner matches property owner ID');

  // TEST 15: Invalid / Non-existent Owner ID
  const fakeId = '507f1f77bcf86cd799439011';
  const badOwnerRes = await fetch(`${BASE_URL}/api/admin/homestay-owners/${fakeId}/subscription`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(badOwnerRes.status === 404, 'Non-existent owner ID returns 404');

  // TEST 16: Assign Subscription Plan to Rajesh Kulkarni
  const plansRes = await fetch(`${BASE_URL}/api/admin/subscription-plans`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  const plansData = await plansRes.json();
  assert(plansRes.status === 200 && plansData.data.length > 0, 'Subscription plans fetched successfully');
  const planToAssign = plansData.data[0];

  const assignRes = await fetch(`${BASE_URL}/api/admin/homestay-owners/${rajeshId}/subscription/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newAccessToken}`
    },
    body: JSON.stringify({
      planId: planToAssign._id,
      startDate: new Date().toISOString(),
      customDurationDays: 30,
      extraRooms: 2
    })
  });
  assert(assignRes.status === 200, `Assign plan to owner ${rajeshId} returned 200`);
  const assignData = await assignRes.json();
  assert(assignData.success === true, 'Assign success is true');
  assert(assignData.subscription.status === 'Active', 'Assigned subscription status is Active');
  assert(assignData.subscription.extraRooms === 2, 'Assigned extraRooms is 2');

  // TEST 17: Add Extra Rooms to Active Subscription
  const addRoomsRes = await fetch(`${BASE_URL}/api/admin/homestay-owners/${rajeshId}/subscription/add-rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newAccessToken}`
    },
    body: JSON.stringify({
      additionalRooms: 3,
      paymentMethod: 'UPI'
    })
  });
  assert(addRoomsRes.status === 200, 'Add extra rooms returned 200');
  const addRoomsData = await addRoomsRes.json();
  assert(addRoomsData.subscription.extraRooms === 5, 'Extra rooms incremented to 5 (2 + 3)');

  // TEST 18: Homestays List has resolved ownerId and ownerSubscription
  console.log('\nTest Group 5: Homestays & Owners Association');
  const homestaysRes = await fetch(`${BASE_URL}/api/dashboard/homestays-list`, {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert(homestaysRes.status === 200, 'Homestays list returns 200');
  const homestaysData = await homestaysRes.json();
  assert(homestaysData.length > 0, 'Homestays returned');
  for (const h of homestaysData) {
    assert(!!h.ownerId, `Homestay "${h.name}" has resolved ownerId: ${h.ownerId}`);
  }

  // TEST 19: Homestay Image Upload with Super Admin Auth
  console.log('\nTest Group 6: Homestay Image Upload & Verification');
  const png1x1Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const imgBuffer = Buffer.from(png1x1Base64, 'base64');
  const uploadFormData = new FormData();
  const testBlob = new Blob([imgBuffer], { type: 'image/png' });
  uploadFormData.append('file', testBlob, 'regression_sample.png');

  const uploadRes = await fetch(`${BASE_URL}/api/homestay-owner/properties/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${newAccessToken}` },
    body: uploadFormData
  });
  assert(uploadRes.status === 200, `Image upload response status is 200 (got ${uploadRes.status})`);
  const uploadData = await uploadRes.json();
  assert(!!uploadData.optimizedUrl, `Uploaded image URL returned: ${uploadData.optimizedUrl}`);

  const mediaFetchRes = await fetch(`${BASE_URL}${uploadData.optimizedUrl}`);
  assert(mediaFetchRes.status === 200, 'Served media endpoint returns 200 for uploaded image');

  // Teardown / Cleanup: Reset Rajesh back to None for clean future runs
  await fetch(`${BASE_URL}/api/admin/homestay-owners/${rajeshId}/subscription`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
