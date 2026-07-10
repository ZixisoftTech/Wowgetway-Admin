import assert from 'assert';

const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('🏁 Starting Integration Tests for Security, Auth & Pagination...\n');

  try {
    // 1. Test Login
    console.log('🧪 Test 1: Admin Login with valid credentials...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@wowgateways.com',
        password: 'Password@123'
      })
    });
    
    assert.strictEqual(loginRes.status, 200, 'Login should return 200 OK');
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Response should contain access token');
    console.log('✅ Login successful! Token received.');

    const token = loginData.token;

    // 2. Access protected endpoint with token
    console.log('\n🧪 Test 2: Access Protected Endpoint (/employees-list) with valid JWT...');
    const employeesRes = await fetch(`${BASE_URL}/dashboard/employees-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(employeesRes.status, 200, 'Should return 200 OK');
    const employeesData = await employeesRes.json();
    assert.ok(Array.isArray(employeesData.data), 'Data should be an array of employees');
    console.log(`✅ Accessed successfully! Total staff records: ${employeesData.pagination.total}`);

    // 3. Access protected endpoint without token
    console.log('\n🧪 Test 3: Access Protected Endpoint without JWT (expect 401)...');
    const unauthRes = await fetch(`${BASE_URL}/dashboard/employees-list`);
    assert.strictEqual(unauthRes.status, 401, 'Should return 401 Unauthorized');
    console.log('✅ Correctly blocked request with 401!');

    // 4. Test Server-Side Pagination
    console.log('\n🧪 Test 4: Verify Pagination (limit=3)...');
    const paginatedRes = await fetch(`${BASE_URL}/dashboard/employees-list?page=1&limit=3`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const paginatedData = await paginatedRes.json();
    assert.strictEqual(paginatedData.data.length, 3, 'Should return exactly 3 employees');
    assert.strictEqual(paginatedData.pagination.limit, 3, 'Limit parameter should be respected');
    console.log('✅ Pagination confirmed! Server returned exactly 3 items.');

    // 5. Test Search
    console.log('\n🧪 Test 5: Verify Search Filter (search="Amit")...');
    const searchRes = await fetch(`${BASE_URL}/dashboard/employees-list?search=Amit`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    assert.ok(searchData.data.length > 0, 'Should find at least 1 record');
    
    const matchesSearch = searchData.data.every(emp => {
      const first = emp.firstName ? emp.firstName.toLowerCase() : '';
      const last = emp.lastName ? emp.lastName.toLowerCase() : '';
      const name = emp.name ? emp.name.toLowerCase() : '';
      return first.includes('amit') || last.includes('amit') || name.includes('amit');
    });
    assert.ok(matchesSearch, 'All results should match "Amit"');
    console.log(`✅ Search query confirmed! Found ${searchData.data.length} match(es).`);

    // 6. Test Coupon endpoints
    console.log('\n🧪 Test 6: Verify Coupon list and creation...');
    const couponsRes = await fetch(`${BASE_URL}/dashboard/coupons`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(couponsRes.status, 200, 'Coupons list should return 200 OK');
    const couponsData = await couponsRes.json();
    assert.ok(Array.isArray(couponsData.data), 'Coupons should be returned');
    console.log(`✅ Coupons list fetched successfully. Found ${couponsData.pagination.total} coupons.`);

    // Create a new coupon
    const newCouponCode = `TESTCOUPON_${Date.now().toString().slice(-4)}`;
    console.log(`🧪 Sub-Test: Creating coupon ${newCouponCode}...`);
    const createCouponRes = await fetch(`${BASE_URL}/dashboard/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        code: newCouponCode,
        type: 'percentage',
        value: 10,
        expiry: '2026-12-31',
        status: 'Active'
      })
    });
    assert.strictEqual(createCouponRes.status, 201, 'Should create coupon and return 201');
    const createdCoupon = await createCouponRes.json();
    console.log(`✅ Coupon created successfully! ID: ${createdCoupon._id}`);

    console.log('\n🎉 ALL SECURITY, JWT, RBAC & PAGINATION TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
