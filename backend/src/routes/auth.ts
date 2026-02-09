import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../db';
import { AuthenticatedRequest } from '../types';

const router = Router();

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '254');
}

router.post(
  '/register',
  body('phone').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { phone, password, name, county } = req.body;
      const normalized = normalizePhone(phone);
      const password_hash = await bcrypt.hash(password, 10);
      
      const { rows } = await pool.query(
        `INSERT INTO farmers (phone, password_hash, name, county)
         VALUES ($1, $2, $3, $4)
         RETURNING id, phone, name, county`,
        [normalized, password_hash, name || null, county || null]
      );
      
      const user = rows[0];
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({ success: true, token, user });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === '23505') {
        res.status(400).json({ error: 'Phone number already registered' });
        return;
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  body('phone').trim().notEmpty(),
  body('password').notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { phone, password } = req.body;
      const normalized = normalizePhone(phone);
      
      const { rows } = await pool.query(
        'SELECT id, phone, password_hash, name, county FROM farmers WHERE phone = $1',
        [normalized]
      );
      
      if (rows.length === 0) {
        res.status(401).json({ error: 'Invalid phone or password' });
        return;
      }
      
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      
      if (!ok) {
        res.status(401).json({ error: 'Invalid phone or password' });
        return;
      }
      
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      
      res.json({ success: true, token, user: { id: user.id, phone: user.phone, name: user.name, county: user.county } });
    } catch (error) {
      res.status(401).json({ error: 'Login failed' });
    }
  }
);

export default router;
