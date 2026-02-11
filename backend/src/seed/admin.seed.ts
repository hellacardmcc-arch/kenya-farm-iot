import bcrypt from 'bcrypt';
import { pool } from '../db';

export async function seedAdmin() {
  const password = 'admin123'; // Change this in production!
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO admins (username, email, password_hash, role, email_verified, is_active)
     VALUES ('admin', 'admin@kenyafarmiot.co.ke', $1, 'super_admin', TRUE, TRUE)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       email_verified = TRUE,
       is_active = TRUE,
       updated_at = CURRENT_TIMESTAMP`,
    [passwordHash]
  );

  console.log('✅ Default admin created (username: admin, password: admin123)');
}
