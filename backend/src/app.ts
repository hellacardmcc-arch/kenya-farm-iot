import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth';
import farmersRouter from './routes/farmers';
import { errorHandler } from './middleware/errorHandler';

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
    health: '/health',
    auth: '/api/auth (register, login)',
    farmers: '/api/farmers (me)',
  })
);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/farmers', farmersRouter);

app.use(errorHandler);
export default app;
