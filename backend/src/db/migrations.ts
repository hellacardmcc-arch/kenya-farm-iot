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
      },
      {
        name: '007_create_admin_tables',
        sql: `
          -- Admin users table
          CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'admin',
            county VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Admin activity logs
          CREATE TABLE IF NOT EXISTS admin_logs (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER REFERENCES admins(id),
            action VARCHAR(100) NOT NULL,
            resource VARCHAR(50) NOT NULL,
            resource_id INTEGER,
            details JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- System settings
          CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(50) UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type VARCHAR(20) DEFAULT 'string',
            category VARCHAR(30) DEFAULT 'general',
            description TEXT,
            is_editable BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- SMS logs (for monitoring)
          CREATE TABLE IF NOT EXISTS sms_logs (
            id SERIAL PRIMARY KEY,
            farmer_id INTEGER REFERENCES farmers(id),
            phone VARCHAR(10) NOT NULL,
            message TEXT NOT NULL,
            message_type VARCHAR(20),
            status VARCHAR(20) DEFAULT 'sent',
            provider_response JSONB,
            cost DECIMAL(10,4),
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered_at TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON admin_logs(resource, resource_id);
          CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone, sent_at);
          CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status, sent_at);
        `
      },
      {
        name: '008_admin_auth_enhancements',
        sql: `
          -- Email verification for admin registration
          CREATE TABLE IF NOT EXISTS admin_email_verifications (
            id SERIAL PRIMARY KEY,
            email VARCHAR(100) NOT NULL,
            otp_code VARCHAR(6) NOT NULL,
            token VARCHAR(100) UNIQUE NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Admin password reset tokens
          CREATE TABLE IF NOT EXISTS admin_password_resets (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER REFERENCES admins(id),
            token VARCHAR(100) UNIQUE NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Add columns to admins table
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS verification_token VARCHAR(100);
          ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

          CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON admin_email_verifications(email, expires_at);
          CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON admin_email_verifications(token);
          CREATE INDEX IF NOT EXISTS idx_password_resets_token ON admin_password_resets(token, expires_at);
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

