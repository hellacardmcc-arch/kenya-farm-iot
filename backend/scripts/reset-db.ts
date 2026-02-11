/**
 * Reset database to match app code: drop all app tables so the next
 * backend start recreates them with correct types (e.g. farmers.id SERIAL).
 * Run: npm run db:reset
 */
import 'dotenv/config';
import { pool } from '../src/db';

const DROP_ORDER = [
  'watering_schedules',
  'farmer_crops',
  'crops',
  'feedback',
  'otps',
  'alerts',
  'admin_logs',
  'sms_logs',
  'sensor_readings',
  'farmers',
  'system_settings',
  'admin_password_resets',
  'admin_email_verifications',
  'admins',
  'migrations',
];

async function main() {
  const client = await pool.connect();
  try {
    for (const table of DROP_ORDER) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped ${table}`);
    }
    console.log('Database reset complete. Restart the backend (npm run dev) to recreate tables.');
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

main();
