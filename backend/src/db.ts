import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
});

export async function initDatabase(): Promise<boolean> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(10) UNIQUE NOT NULL CHECK (phone ~ '^07[0-9]{8}$'),
        name VARCHAR(100) NOT NULL,
        county VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(10) NOT NULL,
        moisture DECIMAL(5,2) CHECK (moisture >= 0 AND moisture <= 100),
        temperature DECIMAL(5,2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
      CREATE INDEX IF NOT EXISTS idx_readings_phone ON sensor_readings(phone);
    `);
    console.log('✅ Database tables created successfully');
    return true;
  } catch (error: unknown) {
    const e = error as Error;
    console.error('❌ Database initialization failed:', e.message);
    return false;
  }
}
