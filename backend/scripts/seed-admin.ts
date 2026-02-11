/**
 * Create default super_admin user (run once after migrations).
 * Default: username=admin, password=admin123
 * Run: npm run db:seed-admin
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/db';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_EMAIL = 'admin@kenyafarmiot.co.ke';
const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_ROLE = 'super_admin';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO admins (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         updated_at = CURRENT_TIMESTAMP`,
      [DEFAULT_USERNAME, DEFAULT_EMAIL, passwordHash, DEFAULT_ROLE]
    );
    console.log('Default admin created/updated.');
    console.log(`  Username: ${DEFAULT_USERNAME}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log('  Role: super_admin');
    console.log('Use these credentials to log in at /admin.html');
  } catch (err) {
    console.error('Seed failed (is the DB running and migrations applied?):', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

main();
