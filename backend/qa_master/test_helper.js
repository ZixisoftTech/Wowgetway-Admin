import mongoose from '../node_modules/mongoose/index.js';
import dotenv from '../node_modules/dotenv/lib/main.js';
import jwt from '../node_modules/jsonwebtoken/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const BASE_URL = process.env.LOCAL_API_URL || 'http://localhost:5005/api';
export const FRONTEND_URL = process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways_local';
export const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let isConnected = false;

export async function connectDB() {
  if (!isConnected && mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
  }
}

export function generateAdminToken(adminData = {}) {
  const adminId = adminData._id || '668f12345678901234567890';
  return jwt.sign(
    {
      _id: adminId,
      id: adminId,
      email: adminData.email || 'qa_admin@test.local',
      role: 'Super Admin',
      name: 'QA Master Admin'
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export function generateOwnerToken(ownerData = {}) {
  const ownerId = ownerData._id || '668f09876543210987654321';
  return jwt.sign(
    {
      _id: ownerId,
      id: ownerId,
      email: ownerData.email || 'qa_owner@test.local',
      role: 'Homestay Owner',
      name: 'QA Master Owner',
      homestayName: 'QA Test Homestay'
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  assert(condition, testName, details = '') {
    const passed = Boolean(condition);
    this.results.push({
      testName,
      passed,
      details: passed ? 'PASSED' : `FAILED: ${details}`
    });
    const mark = passed ? '✅' : '❌';
    console.log(`  ${mark} [${this.suiteName}] ${testName} ${!passed ? '-> ' + details : ''}`);
    return passed;
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`\n======================================================`);
    console.log(`SUITE: ${this.suiteName}`);
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Duration: ${duration}s`);
    console.log(`======================================================\n`);
    return { suiteName: this.suiteName, total, passed, failed, duration, results: this.results };
  }
}
