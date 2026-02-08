/**
 * Optional seed script. Run with: npm run db:seed
 */
import dotenv from 'dotenv';
import { pool } from './index';

dotenv.config();

async function seed() {
  console.log('Seed: no seed data defined. Exiting.');
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
