import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/admin-auth';
import { sendEmail } from '../services/email.service';

const router = express.Router();

// ==================== HELPER ====================
async function logAdminActivity(
  adminId: number,
  action: string,
  resource: string,
  resourceId: number | null,
  details: Record<string, unknown> = {}
) {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, '127.0.0.1')`,
      [adminId, action, resource, resourceId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
}

// ==================== ADMIN REGISTRATION FLOW ====================

router.post('/register/request', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { email, username, role, county } = req.body;
    const requestingAdmin = (req as express.Request & { admin: { id: number } }).admin;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const existing = await pool.query(
      'SELECT id FROM admins WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or username already registered' });
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    const result = await pool.query(
      `INSERT INTO admins (username, email, password_hash, role, county, is_active, email_verified, verification_token)
       VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, $6)
       RETURNING id, username, email, role, county`,
      [username, email, placeholderHash, role || 'admin', county, invitationToken]
    );

    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/register?token=${invitationToken}`;
    const emailSent = await sendEmail({
      to: email,
      subject: 'Invitation to Kenya Farm IoT Admin Portal',
      html: `
        <h2>Admin Account Invitation</h2>
        <p>You have been invited to join the Kenya Farm IoT Admin Portal.</p>
        <p>Username: <strong>${username}</strong></p>
        <p>Role: <strong>${role || 'admin'}</strong></p>
        <p>Click the link below to complete your registration:</p>
        <p><a href="${invitationLink}" style="background: #006600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Complete Registration</a></p>
        <p>This invitation will expire in 24 hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    if (!emailSent) {
      await pool.query('DELETE FROM admins WHERE id = $1', [result.rows[0].id]);
      throw new Error('Failed to send invitation email');
    }

    await logAdminActivity(requestingAdmin.id, 'invite_admin', 'admin', result.rows[0].id, {
      email,
      username,
      role,
    });

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      admin: result.rows[0],
    });
  } catch (error) {
    console.error('Registration request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send invitation' });
  }
});

router.get('/register/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT id, username, email, role, county, created_at
       FROM admins
       WHERE verification_token = $1 AND is_active = FALSE AND email_verified = FALSE
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invitation token' });
    }
    res.json({ success: true, admin: result.rows[0] });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify token' });
  }
});

router.post('/register/complete', async (req, res) => {
  try {
    const { token, password, phone, name } = req.body;

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const adminResult = await pool.query(
      `SELECT id, username, email FROM admins
       WHERE verification_token = $1 AND is_active = FALSE AND email_verified = FALSE
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      [token]
    );
    if (adminResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invitation token' });
    }
    const admin = adminResult.rows[0];

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpToken = crypto.randomBytes(32).toString('hex');
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(
      `INSERT INTO admin_email_verifications (email, otp_code, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [admin.email, otpCode, otpToken, otpExpiresAt]
    );

    const emailSent = await sendEmail({
      to: admin.email,
      subject: 'Kenya Farm IoT - Verify Your Email',
      html: `
        <h2>Email Verification</h2>
        <p>Your verification code is: <strong>${otpCode}</strong></p>
        <p>Enter this code on the verification page to complete your registration.</p>
        <p>This code will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification email' });
    }

    await pool.query(
      `UPDATE admins SET password_hash = $1, phone = $2, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [passwordHash, phone || null, admin.id]
    );

    res.json({
      success: true,
      message: 'Registration complete! Check your email for verification code.',
      verificationToken: otpToken,
      email: admin.email,
    });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete registration' });
  }
});

router.post('/register/verify-email', async (req, res) => {
  try {
    const { token, otp } = req.body;
    const otpResult = await pool.query(
      `SELECT email FROM admin_email_verifications
       WHERE token = $1 AND otp_code = $2 AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP`,
      [token, otp]
    );
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }
    const email = otpResult.rows[0].email;

    await pool.query('UPDATE admin_email_verifications SET is_used = TRUE WHERE token = $1', [token]);
    await pool.query(
      `UPDATE admins SET email_verified = TRUE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE email = $1`,
      [email]
    );

    res.json({ success: true, message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
});

// ==================== LOGIN ====================

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminResult = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = TRUE',
      [username]
    );
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const admin = adminResult.rows[0];

    if (!admin.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your email.',
      });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);
    await logAdminActivity(admin.id, 'login', 'admin', admin.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        county: admin.county,
      },
      process.env.ADMIN_JWT_SECRET || 'admin-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        county: admin.county,
        phone: admin.phone,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.post('/login/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const adminResult = await pool.query(
      'SELECT id, username, email FROM admins WHERE email = $1 AND is_active = TRUE AND email_verified = TRUE',
      [email]
    );
    if (adminResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive an OTP',
      });
    }
    const admin = adminResult.rows[0];

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO admin_email_verifications (email, otp_code, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, otpCode, otpToken, expiresAt]
    );

    const emailSent = await sendEmail({
      to: email,
      subject: 'Kenya Farm IoT - Login OTP',
      html: `
        <h2>Login Verification</h2>
        <p>Your login verification code is: <strong>${otpCode}</strong></p>
        <p>Enter this code on the login page to access your account.</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    res.json({ success: true, message: 'OTP sent to your email', otpToken });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

router.post('/login/with-otp', async (req, res) => {
  try {
    const { otpToken, otp } = req.body;
    const otpResult = await pool.query(
      `SELECT email FROM admin_email_verifications
       WHERE token = $1 AND otp_code = $2 AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP`,
      [otpToken, otp]
    );
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    const email = otpResult.rows[0].email;

    const adminResult = await pool.query(
      'SELECT * FROM admins WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }
    const admin = adminResult.rows[0];

    await pool.query('UPDATE admin_email_verifications SET is_used = TRUE WHERE token = $1', [otpToken]);
    await pool.query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);
    await logAdminActivity(admin.id, 'login_otp', 'admin', admin.id, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        county: admin.county,
      },
      process.env.ADMIN_JWT_SECRET || 'admin-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        county: admin.county,
        phone: admin.phone,
      },
    });
  } catch (error) {
    console.error('Login with OTP error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ==================== PROFILE ====================

router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { id: number } }).admin;
    const result = await pool.query(
      `SELECT id, username, email, role, county, phone, email_verified, last_login, created_at
       FROM admins WHERE id = $1`,
      [admin.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.put('/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { id: number; username: string } }).admin;
    const { username, phone, county } = req.body;

    if (username && username !== admin.username) {
      const existing = await pool.query(
        'SELECT id FROM admins WHERE username = $1 AND id != $2',
        [username, admin.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    }

    await pool.query(
      `UPDATE admins SET username = COALESCE($1, username), phone = COALESCE($2, phone), county = COALESCE($3, county), updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [username, phone, county, admin.id]
    );

    await logAdminActivity(admin.id, 'update_profile', 'admin', admin.id, {
      updates: { username, phone, county },
    });

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.post('/profile/change-password', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { id: number } }).admin;
    const { currentPassword, newPassword } = req.body;

    const adminResult = await pool.query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [admin.id]
    );
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, adminResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, admin.id]
    );
    await logAdminActivity(admin.id, 'change_password', 'admin', admin.id, {});

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// ==================== PASSWORD RESET ====================

router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;
    const adminResult = await pool.query(
      'SELECT id, username, email FROM admins WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    if (adminResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive reset instructions',
      });
    }
    const admin = adminResult.rows[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO admin_password_resets (admin_id, token, expires_at) VALUES ($1, $2, $3)`,
      [admin.id, resetToken, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/reset-password?token=${resetToken}`;
    const emailSent = await sendEmail({
      to: email,
      subject: 'Kenya Farm IoT - Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password for username: <strong>${admin.username}</strong></p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background: #006600; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send reset email' });
    }

    res.json({ success: true, message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Failed to process password reset' });
  }
});

router.get('/password-reset/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.username, a.email
       FROM admin_password_resets pr
       JOIN admins a ON pr.admin_id = a.id
       WHERE pr.token = $1 AND pr.is_used = FALSE AND pr.expires_at > CURRENT_TIMESTAMP AND a.is_active = TRUE`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    res.json({ success: true, admin: result.rows[0] });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify reset token' });
  }
});

router.post('/password-reset/complete', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const tokenResult = await pool.query(
      `SELECT pr.admin_id, a.username
       FROM admin_password_resets pr
       JOIN admins a ON pr.admin_id = a.id
       WHERE pr.token = $1 AND pr.is_used = FALSE AND pr.expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    const { admin_id, username } = tokenResult.rows[0];

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, admin_id]
    );
    await pool.query('UPDATE admin_password_resets SET is_used = TRUE WHERE token = $1', [token]);

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, resource, resource_id, details)
       VALUES ($1, 'password_reset', 'admin', $1, $2)`,
      [admin_id, JSON.stringify({ username, via: 'reset_token' })]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

export default router;
