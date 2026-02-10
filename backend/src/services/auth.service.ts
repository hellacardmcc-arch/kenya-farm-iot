import { pool } from '../db';

export class AuthService {
  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  // Store OTP in database (valid for 10 minutes)
  static async storeOTP(phone: string, otp: string): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await pool.query(`
        INSERT INTO otps (phone, otp, expires_at) 
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) 
        DO UPDATE SET otp = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP
      `, [phone, otp, expiresAt]);
      
      return true;
    } catch (error) {
      console.error('Failed to store OTP:', error);
      return false;
    }
  }
  
  // Verify OTP
  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        SELECT otp, expires_at 
        FROM otps 
        WHERE phone = $1 AND expires_at > CURRENT_TIMESTAMP
      `, [phone]);
      
      if (result.rows.length === 0) {
        return false;
      }
      
      const storedOTP = result.rows[0].otp;
      return storedOTP === otp;
    } catch (error) {
      console.error('OTP verification failed:', error);
      return false;
    }
  }
}

