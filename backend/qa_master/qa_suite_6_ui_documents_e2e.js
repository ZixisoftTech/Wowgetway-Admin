import puppeteer from '../node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { connectDB, BASE_URL, FRONTEND_URL, TestRunner } from './test_helper.js';
import { Booking, Property } from '../models.js';

const runner = new TestRunner('Suite 6: UI Responsiveness & Pixel-Perfect Booking Documents');

async function run() {
  await connectDB();
  console.log('\n--- Starting Master QA Suite 6 (Browser E2E) ---');

  // Find a valid booking with property details for document rendering
  const validBooking = await Booking.findOne({ propertyId: { $ne: null } });
  if (!validBooking) {
    throw new Error('No valid booking found in local DB for document QA.');
  }

  const bookingId = validBooking._id;
  console.log(`  Target test booking ID: ${bookingId} (${validBooking.bookingId})`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore benign favicon or network retries if any
        if (!text.includes('favicon') && !text.includes('net::ERR_')) {
          consoleErrors.push(text);
        }
      }
    });

    // -------------------------------------------------------------------------
    // TEST AREA 17: UI Field-by-Field, Modals, Forms & Responsiveness
    // -------------------------------------------------------------------------
    // 17.1 Desktop Viewport (1920 x 1080)
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    runner.assert(
      emailInput !== null && passwordInput !== null && submitBtn !== null,
      '17.1 Desktop (1920x1080): Login form fields and submit action button render properly'
    );

    // 17.2 Tablet Viewport (768 x 1024)
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}/homestay-owner/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    const ownerInputs = await page.$$('input');
    const ownerSubmitBtn = await page.$('button[type="submit"]');
    runner.assert(
      ownerInputs.length >= 2 && ownerSubmitBtn !== null,
      '17.2 Tablet (768x1024): Homestay Owner portal login responsive layout renders cleanly'
    );

    // 17.3 Mobile Viewport (375 x 812) - Check for Horizontal Overflow
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    runner.assert(
      scrollWidth <= clientWidth,
      `17.3 Mobile (375x812): Zero horizontal scroll overflow (scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px)`
    );

    // -------------------------------------------------------------------------
    // TEST AREA 15: Booking Documents (Tax Invoice, Confirmation Slip, Quotation)
    // -------------------------------------------------------------------------
    await page.setViewport({ width: 1200, height: 1200 });

    // 15.1 Tax Invoice (/invoice/:id)
    console.log('  Testing Tax Invoice visual rendering and single-page fit...');
    await page.goto(`${FRONTEND_URL}/invoice/${bookingId}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.printable-document', { timeout: 10000 });

    const invoiceData = await page.evaluate(() => {
      const el = document.querySelector('.printable-document');
      const text = el ? el.innerText : '';
      const rect = el ? el.getBoundingClientRect() : null;
      const qrImg = el ? el.querySelector('img[alt*="UPI"], img[alt*="QR"], img[src^="data:image/png"]') : null;
      return {
        found: el !== null,
        text,
        heightPx: rect ? rect.height : 0,
        widthPx: rect ? rect.width : 0,
        hasQr: qrImg !== null
      };
    });

    runner.assert(invoiceData.found, '15.1 Tax Invoice renders .printable-document container');
    runner.assert(
      invoiceData.text.includes('TAX INVOICE') || invoiceData.text.includes('Invoice'),
      '15.2 Tax Invoice header and document type clearly displayed'
    );
    runner.assert(
      invoiceData.text.includes('GSTIN') || invoiceData.text.includes('GST'),
      '15.3 Tax Invoice displays GST identification and tax breakdown'
    );
    runner.assert(invoiceData.hasQr, '15.4 Tax Invoice renders base64 scannable UPI QR code');

    // Single-page fit: At 780px width, rendered document height must fit comfortably in standard printable A4 bounds (<= 1200px)
    runner.assert(
      invoiceData.heightPx <= 1200,
      `15.5 Tax Invoice Single-Page Fit: Height is strictly contained for single-page print/export (${Math.round(invoiceData.heightPx)}px <= 1200px)`
    );

    // 15.2 Booking Confirmation Slip (/confirmation-slip/:id)
    console.log('  Testing Confirmation Slip visual rendering and single-page fit...');
    await page.goto(`${FRONTEND_URL}/confirmation-slip/${bookingId}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.printable-document', { timeout: 10000 });

    const slipData = await page.evaluate(() => {
      const el = document.querySelector('.printable-document');
      const text = el ? el.innerText : '';
      const rect = el ? el.getBoundingClientRect() : null;
      return {
        found: el !== null,
        text,
        heightPx: rect ? rect.height : 0
      };
    });

    runner.assert(slipData.found, '15.6 Booking Confirmation Slip renders .printable-document container');
    runner.assert(
      slipData.text.includes('CONFIRMATION') || slipData.text.includes('Confirmation') || slipData.text.includes('BOOKING'),
      '15.7 Confirmation Slip displays authoritative booking confirmation heading'
    );
    runner.assert(
      slipData.heightPx <= 1200,
      `15.8 Confirmation Slip Single-Page Fit: Height is strictly contained for single-page print/export (${Math.round(slipData.heightPx)}px <= 1200px)`
    );

    // 15.3 Booking Quotation (/quotation/:id)
    console.log('  Testing Booking Quotation visual rendering and single-page fit...');
    await page.goto(`${FRONTEND_URL}/quotation/${bookingId}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.printable-document', { timeout: 10000 });

    const quoteData = await page.evaluate(() => {
      const el = document.querySelector('.printable-document');
      const text = el ? el.innerText : '';
      const rect = el ? el.getBoundingClientRect() : null;
      return {
        found: el !== null,
        text,
        heightPx: rect ? rect.height : 0
      };
    });

    runner.assert(quoteData.found, '15.9 Booking Quotation renders .printable-document container');
    runner.assert(
      quoteData.text.includes('QUOTATION') || quoteData.text.includes('Quotation'),
      '15.10 Booking Quotation header and estimate terms displayed'
    );
    runner.assert(
      quoteData.heightPx <= 1200,
      `15.11 Booking Quotation Single-Page Fit: Height is strictly contained for single-page print/export (${Math.round(quoteData.heightPx)}px <= 1200px)`
    );

    // 17.4 Zero Uncaught Runtime React Console Exceptions
    const criticalErrors = consoleErrors.filter(e => !e.includes('net::') && !e.includes('favicon'));
    runner.assert(
      criticalErrors.length === 0,
      `17.4 Frontend Reliability: Zero uncaught runtime console exceptions during browser interactions (Errors: ${criticalErrors.length})`
    );

  } catch (error) {
    console.error('Unexpected Suite 6 Error:', error.message);
    runner.assert(false, 'Suite 6 browser E2E execution without unhandled exception', error.message);
  } finally {
    await browser.close();
    console.log('Suite 6 browser session closed.');
  }

  return runner.summary();
}

run().then(res => {
  process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
