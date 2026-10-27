import axios from '../../frontend/node_modules/axios/index.js';
import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { TestRunner } from './test_helper.js';

const PROD_API = 'https://backend-sand-nine-13.vercel.app/api';
const PROD_FRONTEND = 'https://frontend-chi-three-zbs3ijk1gi.vercel.app';

const runner = new TestRunner('Phase C: Vercel Production Smoke & Regression');

async function run() {
  console.log('\n========================================================================');
  console.log('🌐 EXECUTING PHASE C: VERCEL PRODUCTION VERIFICATION');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Production Backend Auth & Health
    // -------------------------------------------------------------------------
    console.log('  Verifying Live Production Backend Auth...');
    const loginRes = await axios.post(`${PROD_API}/admin/auth/login`, {
      email: 'devgateways947@gmail.com',
      password: 'Gateway@123'
    });
    runner.assert(
      loginRes.status === 200 && Boolean(loginRes.data?.token),
      'Prod 1.1 Backend Live: Super Admin auth returns HTTP 200 with JWT token'
    );
    const prodToken = loginRes.data?.token;

    // -------------------------------------------------------------------------
    // 2. Production Security Fix (DEF-01): NoSQL / Type check verification
    // -------------------------------------------------------------------------
    console.log('  Verifying Live Production Security Fix (DEF-01 NoSQL / Type Protection)...');
    try {
      await axios.post(`${PROD_API}/admin/auth/login`, {
        email: { $gt: '' },
        password: { $gt: '' }
      });
      runner.assert(false, 'Prod 2.1 Live NoSQL injection rejected', 'Should return 400');
    } catch (err) {
      runner.assert(
        err.response?.status === 400,
        `Prod 2.1 Live Security Invariant: Non-string auth payloads rejected with HTTP 400 (Status: ${err.response?.status})`
      );
    }

    // -------------------------------------------------------------------------
    // 3. Production Frontend HTTP & Bundle Verification
    // -------------------------------------------------------------------------
    console.log('  Verifying Live Production Frontend Web App...');
    const feRes = await axios.get(PROD_FRONTEND);
    runner.assert(
      feRes.status === 200 && feRes.data.includes('<div id="root"></div>'),
      'Prod 3.1 Frontend Live: HTTP 200 with valid HTML document and React root container'
    );

    // -------------------------------------------------------------------------
    // 4. Browser E2E Verification on Live Vercel Production
    // -------------------------------------------------------------------------
    console.log('  Launching Headless Chrome on Live Vercel Deployment...');
    const browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const liveErrors = [];
    page.on('pageerror', err => liveErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('favicon') && !t.includes('net::ERR_')) liveErrors.push(t);
      }
    });

    // 4.1 Login Screen on Live Vercel
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${PROD_FRONTEND}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    const emailField = await page.$('input[type="email"], input[name="email"]');
    const passField = await page.$('input[type="password"]');
    runner.assert(
      emailField !== null && passField !== null,
      'Prod 4.1 Live UI: Admin Login view renders with responsive inputs'
    );

    // 4.2 Document View on Live Vercel
    console.log('  Fetching live production booking for document verification...');
    const listRes = await axios.get(`${PROD_API}/bookings-list?limit=1`, {
      headers: { Authorization: `Bearer ${prodToken}` }
    });
    const liveBookingId = listRes.data?.bookings?.[0]?._id || '6ae07ebdd62b6d6c003759c2';
    console.log(`  Verifying Live Booking Confirmation Slip with live ID: ${liveBookingId}...`);

    await page.goto(`${PROD_FRONTEND}/confirmation-slip/${liveBookingId}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.printable-document', { timeout: 15000 });
    const hasDoc = await page.evaluate(() => {
      const el = document.querySelector('.printable-document');
      return el !== null && el.getBoundingClientRect().height <= 1200;
    });
    runner.assert(
      hasDoc,
      'Prod 4.2 Live Documents: Confirmation slip renders in production within single-page printable bounds (height <= 1200px)'
    );

    // 4.3 Zero Uncaught Console Errors on Production
    runner.assert(
      liveErrors.length === 0,
      `Prod 4.3 Zero Console Errors on Live Vercel: Clean execution (Errors: ${liveErrors.length})`
    );

    await browser.close();

  } catch (error) {
    console.error('Production Verification Error:', error.response?.data || error.message);
    runner.assert(false, 'Production verification without exception', error.message);
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
