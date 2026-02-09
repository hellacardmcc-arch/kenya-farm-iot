import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth';
import farmersRouter from './routes/farmers';
import { verifyToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { testConnection, pool } from './db';

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (_req, res) =>
  res.json({
    name: 'Kenya Farm IoT API',
    version: '1.0',
    docs: 'API only – use the frontend at ' + (frontendUrl || 'http://localhost:5173'),
    health: '/api/health',
    auth: '/api/auth (register, login)',
    farmers: '/api/farmers (me, profile)',
  })
);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    region: 'Kenya',
    service: 'Farm IoT Dashboard',
  });
});

// Kenya farmer registration endpoint (Swahili messages)
app.post('/api/farmers/register', async (req, res) => {
  const { phone, name, county } = req.body;

  // Validate Kenyan phone
  const kenyaPhoneRegex = /^(07|01)\d{8}$/;
  if (!kenyaPhoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Tafadhali weka namba ya simu ya Kenya (07xxxxxxxx)',
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO farmers (phone, name, county) VALUES ($1, $2, $3) RETURNING *',
      [phone, name, county]
    );

    res.json({
      success: true,
      message: `Karibu ${name} kutoka ${county}!`,
      farmer: result.rows[0],
    });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === '23505') {
      // Unique violation
      res.status(400).json({
        success: false,
        message: 'Namba ya simu tayari imesajiliwa',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Imeshindikana kusajili',
      });
    }
  }
});

app.use('/api/auth', authRouter);
app.use('/api/farmers', farmersRouter);

app.use(errorHandler);
export default app;
