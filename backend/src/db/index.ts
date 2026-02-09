import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        county VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_kenyan_phone CHECK (phone ~ '^(07|01)[0-9]{8}$')
      );
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        moisture DECIMAL(5,2),
        temperature DECIMAL(5,2),
        battery INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
      CREATE INDEX IF NOT EXISTS idx_readings_farmer ON sensor_readings(farmer_id);
    `);
    client.release();
    return true;
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string };
    console.error('Database connection failed:', e.message);
    if (e.code === '3D000' || e.message?.includes('does not exist')) {
      console.log('Database might not exist. Using fallback mode.');
    }
    return false;
  }
};
