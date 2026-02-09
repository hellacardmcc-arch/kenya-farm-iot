import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth';
import farmersRouter from './routes/farmers';
import { verifyToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { AppDataSource } from './data-source';
import { Farmer } from './entities';

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

// API root endpoint
app.get('/api', (_req, res) =>
  res.json({
    name: 'Kenya Farm IoT API',
    version: '1.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
      },
      farmers: {
        register: 'POST /api/farmers/register',
        me: 'GET /api/farmers/me',
        profile: 'GET /api/farmers/profile',
      },
    },
  })
);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const isDbConnected = AppDataSource.isInitialized;
  res.json({
    status: isDbConnected ? 'healthy' : 'unhealthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    region: 'Kenya',
    service: 'Kenya Farm IoT',
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
    const farmerRepo = AppDataSource.getRepository(Farmer);
    const farmer = await farmerRepo.save({
      phone,
      name,
      county
    });

    res.json({
      success: true,
      message: `Karibu ${name} kutoka ${county}!`,
      farmer
    });
  } catch (error: any) {
    if (error.code === '23505') { // Duplicate phone
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
