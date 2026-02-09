import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// Load .env from backend directory (works even if cwd is project root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

// Configure SSL for production (Render.com requires SSL)
const isProduction = process.env.NODE_ENV === 'production';
const sslMode = process.env.PGSSLMODE || (isProduction ? 'require' : undefined);

export const pool = new Pool({
  connectionString,
  ssl: sslMode === 'require' || sslMode === 'prefer' 
    ? { rejectUnauthorized: false } 
    : undefined,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
