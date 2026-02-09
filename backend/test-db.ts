// test-db.ts
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const testUrl = process.env.DATABASE_URL;

if (!testUrl) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

async function testDB() {
  // Configure SSL based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const sslMode = process.env.PGSSLMODE;
  const sslConfig = sslMode === 'require' || sslMode === 'prefer' || isProduction
    ? { rejectUnauthorized: false }
    : undefined;

  const pool = new Pool({
    connectionString: testUrl,
    ssl: sslConfig,
  });

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('📅 Server time:', result.rows[0].now);
    await pool.end();
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Database connection failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

testDB();
