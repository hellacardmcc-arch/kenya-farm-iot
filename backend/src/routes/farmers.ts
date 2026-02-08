import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../db';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const farmerId = req.user!.farmerId;
  const { rows } = await pool.query(
    'SELECT id, phone, name, county, created_at FROM farmers WHERE id = $1',
    [farmerId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Farmer not found' });
    return;
  }
  const f = rows[0];
  res.json({ id: f.id, phone: f.phone, name: f.name, county: f.county, created_at: f.created_at });
});

export const farmersRouter = router;
