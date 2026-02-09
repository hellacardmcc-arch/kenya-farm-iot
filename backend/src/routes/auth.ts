import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../db';
import { AuthenticatedRequest } from '../types';

const router = Router();
const secret = process.env.JWT_SECRET!;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '254');
}

router.post(
  '/register',
  body('phone').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { phone, password, name, county } = req.body;
    const normalized = normalizePhone(phone);
    const password_hash = await bcrypt.hash(password, 10);
    try {
      await pool.query(
        `INSERT INTO farmers (phone, password_hash, name, county)
         VALUES ($1, $2, $3, $4)`,
        [normalized, password_hash, name || null, county || null]
      );
      res.status(201).json({ message: 'Registered. Please log in.' });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        res.status(400).json({ message: 'Phone number already registered' });
        return;
      }
      throw err;
    }
  }
);

router.post(
  '/login',
  body('phone').trim().notEmpty(),
  body('password').notEmpty(),
  async (req, res: Response): Promise<void> => {
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
      res.status(401).json({ message: 'Invalid phone or password' });
      return;
    }
    const farmer = rows[0];
    const ok = await bcrypt.compare(password, farmer.password_hash);
    if (!ok) {
      res.status(401).json({ message: 'Invalid phone or password' });
      return;
    }
    const token = jwt.sign(
      { farmerId: farmer.id, phone: farmer.phone },
      secret,
      { expiresIn: '7d' }
    );
    res.json({ token, farmer: { id: farmer.id, phone: farmer.phone, name: farmer.name, county: farmer.county } });
  }
);

export const authRouter = router;
