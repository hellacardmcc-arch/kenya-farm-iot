import { pool } from './index';

export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // List of migrations in order
    const migrations = [
      {
        name: '001_add_farm_size_column',
        sql: `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farm_size DECIMAL(5,2);`
      },
      {
        name: '002_add_crop_type_column',
        sql: `ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crop_type VARCHAR(50);`
      },
      {
        name: '003_create_alerts_table',
        sql: `
          CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            farmer_id INTEGER REFERENCES farmers(id),
            message TEXT NOT NULL,
            alert_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP
          );
        `
      },
      {
        name: '004_create_otps_table',
        sql: `
          CREATE TABLE IF NOT EXISTS otps (
            phone VARCHAR(10) PRIMARY KEY,
            otp VARCHAR(6) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
        `
      },
      {
        name: '005_create_feedback_table',
        sql: `
          CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            phone VARCHAR(10),
            message TEXT NOT NULL,
            rating INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_feedback_phone ON feedback(phone);
        `
      },
      {
        name: '006_create_crops_and_schedules',
        sql: `
          -- Crops table with Kenyan crop types
          CREATE TABLE IF NOT EXISTS crops (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            swahili_name VARCHAR(50),
            optimal_moisture_min DECIMAL(5,2),
            optimal_moisture_max DECIMAL(5,2),
            water_requirement_mm DECIMAL(5,2),
            growth_days INTEGER,
            description TEXT
          );

          -- Farmer's crop assignments
          CREATE TABLE IF NOT EXISTS farmer_crops (
            id SERIAL PRIMARY KEY,
            farmer_id INTEGER REFERENCES farmers(id),
            crop_id INTEGER REFERENCES crops(id),
            planting_date DATE NOT NULL,
            area_acres DECIMAL(5,2),
            status VARCHAR(20) DEFAULT 'growing',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Watering schedule
          CREATE TABLE IF NOT EXISTS watering_schedules (
            id SERIAL PRIMARY KEY,
            farmer_crop_id INTEGER REFERENCES farmer_crops(id),
            scheduled_date DATE NOT NULL,
            scheduled_time TIME DEFAULT '06:00:00',
            water_amount_mm DECIMAL(5,2),
            status VARCHAR(20) DEFAULT 'pending',
            actual_water_used DECIMAL(5,2),
            completed_at TIMESTAMP,
            notes TEXT
          );
        `
      }
    ];
    
    // Execute pending migrations
    for (const migration of migrations) {
      const alreadyExecuted = await client.query(
        'SELECT id FROM migrations WHERE name = $1',
        [migration.name]
      );
      
      if (alreadyExecuted.rows.length === 0) {
        console.log(`Running migration: ${migration.name}`);
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
      }
    }
    
    console.log('All migrations completed');
  } finally {
    client.release();
  }
}

