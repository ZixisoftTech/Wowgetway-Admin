import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Suite 1: Auth, Profiles, Owners & Global Settings', file: 'qa_suite_1_auth_users.js' },
  { name: 'Suite 2: Property Lifecycle, Rooms, Pricing & Allocation', file: 'qa_suite_2_properties_rooms_rates.js' },
  { name: 'Suite 3: Bookings Lifecycle, Financials & Coupons', file: 'qa_suite_3_bookings_financials.js' },
  { name: 'Suite 4: Security, Multi-Tenant Isolation & Concurrency', file: 'qa_suite_4_security_concurrency.js' },
  { name: 'Suite 5: Performance, Scale, Search & Reliability', file: 'qa_suite_5_performance_search.js' },
  { name: 'Suite 6: UI Responsiveness & Pixel-Perfect Booking Documents', file: 'qa_suite_6_ui_documents_e2e.js' }
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, suite.file);
    const proc = spawn('node', [fullPath], { stdio: 'inherit' });

    proc.on('close', (code) => {
      resolve({ name: suite.name, code, passed: code === 0 });
    });
  });
}

async function main() {
  console.log('\n========================================================================');
  console.log('🚀 WOW GATEWAYS — MASTER QA RELEASE VERIFICATION (LOCAL PHASE A)');
  console.log('========================================================================\n');

  const startTime = Date.now();
  const summary = [];

  for (const s of suites) {
    const res = await runSuite(s);
    summary.push(res);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const allPassed = summary.every(s => s.passed);

  console.log('\n========================================================================');
  console.log('🏁 MASTER QA EXECUTION CONSOLIDATED SUMMARY');
  console.log('========================================================================');
  summary.forEach(s => {
    const mark = s.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`  ${mark} - ${s.name}`);
  });
  console.log(`\nOverall Verdict: ${allPassed ? 'ALL GATES PASSED (100%)' : 'FAILURES DETECTED'}`);
  console.log(`Total Duration: ${duration}s`);
  console.log('========================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

main();
