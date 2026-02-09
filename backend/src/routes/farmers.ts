import { Router, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { verifyToken, isFarmer } from '../middleware/auth';
import { pool } from '../db';

const router = Router();

// Protect all farmer routes
router.use(verifyToken);
router.use(isFarmer);

// Get farmer profile (Kenya-specific)
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload & { userId?: string; id?: string; phone?: string };
    const farmerPhone = user?.phone;
    
    res.json({
      success: true,
      message: `Habari ${farmerPhone}`,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
});

// Get farmer profile (me endpoint - existing)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload & { userId?: string; id?: string };
    const farmerId = user?.userId ?? user?.id;
    if (!farmerId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const { rows } = await pool.query(
      'SELECT id, phone, name, county, created_at FROM farmers WHERE id = $1',
      [farmerId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Farmer not found' });
      return;
    }
    const f = rows[0];
    res.json({ id: f.id, phone: f.phone, name: f.name, county: f.county, created_at: f.created_at });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
});

export default router;
