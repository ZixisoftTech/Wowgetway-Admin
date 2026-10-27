import axios from '../../frontend/node_modules/axios/index.js';
import { connectDB, BASE_URL, generateAdminToken, generateOwnerToken, TestRunner } from './test_helper.js';
import { Admin, HomestayOwner, NewState, NewCity, NewAmenity, NewRoomType, SmtpSettings } from '../models.js';
import bcrypt from '../node_modules/bcryptjs/index.js';

const runner = new TestRunner('Suite 1: Auth, Profiles, Owners & Global Settings');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 1 ---');

  const testSuffix = Date.now().toString().slice(-6);
  const testOwnerEmail = `qa_owner_${testSuffix}@example.com`;
  const testOwnerMobile = `98${testSuffix.padStart(8, '0')}`;
  let createdOwnerId = null;
  let testStateId = null;
  let testCityId = null;
  let testAmenityId = null;
  let testRoomTypeId = null;

  // Find or create an admin user in local DB for authentic login test
  let adminUser = await Admin.findOne({ role: 'Super Admin' });
  const rawAdminPassword = 'TestPassword123!';
  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawAdminPassword, salt);
    adminUser = await Admin.create({
      name: 'QA Admin Local',
      email: `qa_admin_${testSuffix}@example.com`,
      password: hashedPassword,
      role: 'Super Admin'
    });
  }
  const adminToken = generateAdminToken({ _id: adminUser._id, email: adminUser.email });

  try {
    // -------------------------------------------------------------------------
    // TEST AREA 1: Super Admin Authentication & Session Management
    // -------------------------------------------------------------------------
    // 1.1 Admin login with missing credentials -> 400
    try {
      await axios.post(`${BASE_URL}/admin/auth/login`, {});
      runner.assert(false, '1.1 Admin login missing credentials rejected', 'Should have returned 400');
    } catch (err) {
      runner.assert(err.response?.status === 400, '1.1 Admin login missing credentials rejected with 400');
    }

    // 1.2 Admin login with invalid password -> 400, 401, or 423 (Account Locked)
    try {
      await axios.post(`${BASE_URL}/admin/auth/login`, {
        email: `invalid_admin_${testSuffix}@example.com`,
        password: 'DefinitiveWrongPassword999!'
      });
      runner.assert(false, '1.2 Admin login invalid password rejected', 'Should have returned 400, 401 or 423');
    } catch (err) {
      runner.assert(
        [400, 401, 423].includes(err.response?.status),
        '1.2 Admin login invalid password rejected (400/401/423 lockout)'
      );
    }

    // 1.3 Unauthenticated profile request -> 401
    try {
      await axios.get(`${BASE_URL}/admin/profile`);
      runner.assert(false, '1.3 Unauthenticated admin profile request rejected', 'Should have returned 401');
    } catch (err) {
      runner.assert(err.response?.status === 401, '1.3 Unauthenticated admin profile rejected with 401');
    }

    // 1.4 Tampered token profile request -> 401/403
    try {
      await axios.get(`${BASE_URL}/admin/profile`, {
        headers: { Authorization: 'Bearer this_is_a_tampered_token' }
      });
      runner.assert(false, '1.4 Tampered token rejected', 'Should have returned 401 or 403');
    } catch (err) {
      runner.assert(err.response?.status === 401 || err.response?.status === 403, '1.4 Tampered token rejected with 401/403');
    }

    // 1.5 Valid admin profile request -> 200
    const profileRes = await axios.get(`${BASE_URL}/admin/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    runner.assert(
      profileRes.status === 200 && (profileRes.data.email === adminUser.email || profileRes.data.user?.email === adminUser.email),
      '1.5 Admin profile fetch returns valid profile details'
    );

    // -------------------------------------------------------------------------
    // TEST AREA 2: Super Admin Profile & System Settings
    // -------------------------------------------------------------------------
    // 2.1 Admin profile update
    const updateRes = await axios.put(
      `${BASE_URL}/admin/profile`,
      { fullName: `Updated QA Admin ${testSuffix}` },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(updateRes.status === 200, '2.1 Admin profile name update succeeds');

    // 2.2 SMTP Settings read
    const smtpRes = await axios.get(`${BASE_URL}/admin/settings/smtp`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    runner.assert(smtpRes.status === 200 && typeof smtpRes.data === 'object', '2.2 SMTP settings fetch succeeds');

    // 2.3 SMTP Settings update
    const smtpUpdateRes = await axios.put(
      `${BASE_URL}/admin/settings/smtp`,
      {
        host: 'smtp.mailtrap.io',
        port: 2525,
        email: 'qa_user@wowgateways.local',
        appPassword: 'qa_secret_app_password_123',
        secure: false,
        senderName: 'QA Automated Release Suite',
        enabled: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(smtpUpdateRes.status === 200, '2.3 SMTP settings update persists');

    // -------------------------------------------------------------------------
    // TEST AREA 3: Homestay Owner CRUD & Lifecycle
    // -------------------------------------------------------------------------
    // 3.1 Create Homestay Owner
    const aadharSample = `123456${testSuffix.padStart(6, '0')}`.slice(0, 12);
    const panSample = `ABCDE${testSuffix.slice(-4).padStart(4, '1')}F`;
    const createOwnerRes = await axios.post(
      `${BASE_URL}/admin/homestay-owners`,
      {
        firstName: 'QA',
        lastName: `Owner_${testSuffix}`,
        fatherName: 'QA Senior Owner',
        email: testOwnerEmail,
        mobile: `98${testSuffix.padStart(8, '0')}`,
        aadharNo: aadharSample,
        panNo: panSample,
        ifscCode: 'HDFC0001234',
        bankAccountNo: '123456789012',
        bankName: 'HDFC Bank',
        branchName: 'Panaji',
        homestayName: `QA Paradise Homestay ${testSuffix}`,
        status: 'Active',
        password: 'OwnerPassword123!'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(
      (createOwnerRes.status === 200 || createOwnerRes.status === 201) && createOwnerRes.data?._id,
      '3.1 Create Homestay Owner returns 200/201 and valid _id'
    );
    createdOwnerId = createOwnerRes.data?._id;

    // 3.2 Duplicate Email Rejection
    try {
      await axios.post(
        `${BASE_URL}/admin/homestay-owners`,
        {
          firstName: 'Duplicate',
          lastName: 'Owner',
          fatherName: 'QA Father',
          email: testOwnerEmail,
          mobile: `99${testSuffix.padStart(8, '1')}`,
          aadharNo: '987654321098',
          panNo: 'PQRSX9999Z',
          homestayName: 'Duplicate Homestay',
          status: 'Active'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      runner.assert(false, '3.2 Duplicate owner email rejected', 'Should have returned 400/409');
    } catch (err) {
      runner.assert(err.response?.status === 400 || err.response?.status === 409, '3.2 Duplicate owner email rejected with 400/409');
    }

    // 3.3 List Owners with pagination & search
    const listOwnersRes = await axios.get(`${BASE_URL}/admin/homestay-owners?search=${testOwnerEmail}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundOwners = listOwnersRes.data?.data || listOwnersRes.data;
    const ownerFound = Array.isArray(foundOwners) && foundOwners.some(o => o.email === testOwnerEmail);
    runner.assert(ownerFound, '3.3 List Homestay Owners finds newly created owner by search query');

    // 3.4 Update Owner Details
    const updateOwnerRes = await axios.put(
      `${BASE_URL}/admin/homestay-owners/${createdOwnerId}`,
      { firstName: 'QA_Updated' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(updateOwnerRes.status === 200, '3.4 Update owner details succeeds');

    // 3.5 Status Toggle to Suspended
    const suspendRes = await axios.put(
      `${BASE_URL}/admin/homestay-owners/${createdOwnerId}`,
      { status: 'Suspended' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(suspendRes.status === 200, '3.5 Owner status update to Suspended succeeds');

    // -------------------------------------------------------------------------
    // TEST AREA 4: Homestay Owner Authentication & Permissions
    // -------------------------------------------------------------------------
    // Re-activate owner for login testing
    await HomestayOwner.findByIdAndUpdate(createdOwnerId, { status: 'Active' });

    // 4.1 Owner login
    const ownerLoginRes = await axios.post(`${BASE_URL}/homestay-owner/auth/login`, {
      email: testOwnerEmail,
      password: 'OwnerPassword123!'
    });
    runner.assert(
      ownerLoginRes.status === 200 && Boolean(ownerLoginRes.data?.token || ownerLoginRes.data?.accessToken),
      '4.1 Homestay Owner login succeeds with valid token returned'
    );
    const ownerToken = ownerLoginRes.data?.token || ownerLoginRes.data?.accessToken || generateOwnerToken({ _id: createdOwnerId, email: testOwnerEmail });

    // 4.2 Suspended owner login blocked
    await HomestayOwner.findByIdAndUpdate(createdOwnerId, { status: 'Suspended' });
    try {
      await axios.post(`${BASE_URL}/homestay-owner/auth/login`, {
        email: testOwnerEmail,
        password: 'OwnerPassword123!'
      });
      runner.assert(false, '4.2 Suspended owner login blocked', 'Should have returned 401/403');
    } catch (err) {
      runner.assert(err.response?.status === 401 || err.response?.status === 403, '4.2 Suspended owner login blocked with 401/403');
    }
    // Restore status to Active
    await HomestayOwner.findByIdAndUpdate(createdOwnerId, { status: 'Active' });

    // 4.3 Multi-tenant / Role Boundary: Owner token forbidden from accessing Admin SMTP settings
    try {
      await axios.get(`${BASE_URL}/admin/settings/smtp`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      runner.assert(false, '4.3 Owner role forbidden from Admin SMTP settings', 'Should have returned 403');
    } catch (err) {
      runner.assert(err.response?.status === 403, '4.3 Owner role strictly forbidden from Admin endpoints (403)');
    }

    // -------------------------------------------------------------------------
    // TEST AREA 6: Global Settings (States, Cities, Amenities, Room Types)
    // -------------------------------------------------------------------------
    // 6.1 Create State
    const createStateRes = await axios.post(
      `${BASE_URL}/admin/settings/states`,
      { stateName: `QA_State_${testSuffix}`, status: 'Active' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(createStateRes.status === 201 || createStateRes.status === 200, '6.1 Create Global State succeeds');
    testStateId = createStateRes.data?.data?._id || createStateRes.data?._id;

    // 6.2 Create City linked to State
    const createCityRes = await axios.post(
      `${BASE_URL}/admin/settings/cities`,
      { cityName: `QA_City_${testSuffix}`, stateId: testStateId, status: 'Active' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(createCityRes.status === 201 || createCityRes.status === 200, '6.2 Create Global City linked to State succeeds');
    testCityId = createCityRes.data?.data?._id || createCityRes.data?._id;

    // 6.3 Create Amenity
    const createAmenityRes = await axios.post(
      `${BASE_URL}/admin/settings/amenities`,
      { amenityName: `QA_Amenity_WiFi_${testSuffix}`, amenityIcon: 'data:image/svg+xml;utf8,<svg></svg>', status: 'Active' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(createAmenityRes.status === 201 || createAmenityRes.status === 200, '6.3 Create Global Amenity succeeds');
    testAmenityId = createAmenityRes.data?.data?._id || createAmenityRes.data?._id;

    // 6.4 Create Room Type
    const createRoomTypeRes = await axios.post(
      `${BASE_URL}/admin/settings/room-types`,
      { roomTypeName: `QA_Deluxe_Suite_${testSuffix}`, status: 'Active' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(createRoomTypeRes.status === 201 || createRoomTypeRes.status === 200, '6.4 Create Global Room Type succeeds');
    testRoomTypeId = createRoomTypeRes.data?.data?._id || createRoomTypeRes.data?._id;

    // 6.5 Public Master Endpoints verification
    const masterStatesRes = await axios.get(`${BASE_URL}/settings/master-states`);
    runner.assert(masterStatesRes.status === 200 && Array.isArray(masterStatesRes.data), '6.5 Public master-states endpoint returns list');

    const masterCitiesRes = await axios.get(`${BASE_URL}/settings/master-cities`);
    runner.assert(masterCitiesRes.status === 200 && Array.isArray(masterCitiesRes.data), '6.6 Public master-cities endpoint returns list');

    // 6.7 Cascade dependency check endpoint
    const depCheckRes = await axios.get(
      `${BASE_URL}/admin/settings/check-dependencies?type=state&id=${testStateId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    runner.assert(depCheckRes.status === 200 && depCheckRes.data?.cities >= 1, '6.7 State with linked city correctly reports dependent cities (dependency check)');

  } catch (error) {
    console.error('Unexpected Suite 1 Error:', error.response?.data || error.message);
    runner.assert(false, 'Suite 1 execution without unhandled exception', error.message);
  } finally {
    // Clean up test records
    console.log('Cleaning up Suite 1 test artifacts...');
    if (createdOwnerId) await HomestayOwner.findByIdAndDelete(createdOwnerId);
    if (testCityId) await NewCity.findByIdAndDelete(testCityId);
    if (testStateId) await NewState.findByIdAndDelete(testStateId);
    if (testAmenityId) await NewAmenity.findByIdAndDelete(testAmenityId);
    if (testRoomTypeId) await NewRoomType.findByIdAndDelete(testRoomTypeId);
    console.log('Suite 1 cleanup completed.');
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
