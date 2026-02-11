# Kenya Farm IoT - Backend Setup Instructions

## Step 1: Run Database Migrations

The database migrations run **automatically** when you start the backend server. However, you can also run them manually or reset the database if needed.

### Option A: Automatic Migration (Recommended)

Migrations run automatically when the backend starts:

```bash
cd backend
npm install
npm run dev
```

The migrations will:
1. Create the `migrations` tracking table
2. Run all pending migrations in order (001-008)
3. Create all required tables

### Option B: Reset Database (Fresh Start)

If you need to reset the database and recreate all tables:

```bash
cd backend
npm run db:reset
npm run dev
```

This will:
1. Drop all existing tables
2. When the backend starts, migrations will recreate everything fresh

### Migration Details

The system includes **8 migrations** that create the following tables:

#### Migration 001: Add Farm Size Column
- Adds `farm_size` column to `farmers` table

#### Migration 002: Add Crop Type Column
- Adds `crop_type` column to `farmers` table

#### Migration 003: Create Alerts Table
- Creates `alerts` table for farmer notifications

#### Migration 004: Create OTPs Table
- Creates `otps` table for SMS verification codes

#### Migration 005: Create Feedback Table
- Creates `feedback` table for farmer feedback

#### Migration 006: Create Crops and Schedules
- Creates `crops` table (crop master data)
- Creates `farmer_crops` table (farmer-crop assignments)
- Creates `watering_schedules` table (irrigation schedules)

#### Migration 007: Create Admin Tables
- Creates `admins` table (admin users)
- Creates `admin_logs` table (activity logging)
- Creates `system_settings` table (configuration)
- Creates `sms_logs` table (SMS tracking)

#### Migration 008: Admin Auth Enhancements
- Creates `admin_email_verifications` table (email OTP verification)
- Creates `admin_password_resets` table (password reset tokens)
- Adds `email_verified`, `verification_token`, `phone` columns to `admins`

### Prerequisites

1. **PostgreSQL Database**: Ensure PostgreSQL is running and accessible
2. **Database Created**: Create a database (e.g., `farmdb`)
3. **Environment Variables**: Set up `.env` file with:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/farmdb
   ```

### Verify Migrations

After starting the backend, check the console output. You should see:
```
Running migration: 001_add_farm_size_column
Running migration: 002_add_crop_type_column
...
All migrations completed
```

### Manual SQL Execution (Alternative)

If you prefer to run migrations manually via SQL, you can execute the SQL from `backend/src/db/migrations.ts` directly in your PostgreSQL client (pgAdmin, psql, etc.).

---

## Step 2: Create Default Super Admin

After migrations complete, you need to create a default super admin account to access the admin portal.

### Option A: Automatic Seeding (Recommended)

The default admin is **automatically created** when you start the backend server. The `seedAdmin()` function runs on startup and creates/updates the admin user.

**Default Credentials:**
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@kenyafarmiot.co.ke`
- **Role**: `super_admin`

Simply start the backend:
```bash
cd backend
npm run dev
```

You should see in the console:
```
✅ Default admin created (username: admin, password: admin123)
```

### Option B: Manual Seed Script

If you prefer to run the seed script manually:

```bash
cd backend
npm run db:seed-admin
```

This will create/update the default admin user with the same credentials as above.

### Option C: Manual SQL (Advanced)

If you need to create the admin manually via SQL, generate the password hash first:

```bash
cd backend
node -e "
const bcrypt = require('bcrypt');
const password = 'admin123';
bcrypt.hash(password, 10).then(hash => {
    console.log('Default admin password hash:', hash);
    console.log('Run this SQL:');
    console.log(\`
        INSERT INTO admins (username, email, password_hash, role, email_verified, is_active) 
        VALUES ('admin', 'admin@kenyafarmiot.co.ke', '\${hash}', 'super_admin', TRUE, TRUE);
    \`);
});
"
```

Then execute the generated SQL in your PostgreSQL client (psql, pgAdmin, etc.).

**Note**: The manual SQL approach doesn't handle conflicts. If the admin already exists, use:
```sql
INSERT INTO admins (username, email, password_hash, role, email_verified, is_active) 
VALUES ('admin', 'admin@kenyafarmiot.co.ke', '<hash>', 'super_admin', TRUE, TRUE)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    email_verified = TRUE,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;
```

### Verify Admin Creation

After creating the admin, verify it exists:

```sql
SELECT id, username, email, role, email_verified, is_active, created_at 
FROM admins 
WHERE username = 'admin';
```

You should see one row with `role = 'super_admin'` and `email_verified = TRUE`.

### Login

Once the admin is created, you can log in at:
- **Frontend**: `http://localhost:5173/admin.html` (or your frontend URL)
- **Credentials**: `admin` / `admin123`

**⚠️ Security Note**: Change the default password immediately in production!

---

## Next Steps

After creating the admin:
- **Step 3**: Configure environment variables (email, JWT secrets, etc.)
- **Step 4**: Start the backend server
- **Step 5**: Access the admin portal and change the default password
