import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db/index';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'Kenya Farm IoT Backend',
      message: '🇰🇪 Inafanya kazi!'
    });
  } catch {
    res.json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      service: 'Kenya Farm IoT Backend',
      message: 'Database not connected, but API is running'
    });
  }
});

app.post('/api/farmers/register', async (req, res) => {
  try {
    const { phone, name, county } = req.body;
    if (!phone || !/^(07|01)[0-9]{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Tafadhali weka namba ya simu ya Kenya (07xxxxxxxx)'
      });
    }
    const result = await pool.query(
      `INSERT INTO farmers (phone, name, county) VALUES ($1, $2, $3) RETURNING id, phone, name, county, created_at`,
      [phone, name, county]
    );
    res.json({
      success: true,
      message: `Karibu ${name} kutoka ${county}!`,
      farmer: result.rows[0]
    });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === '23505') {
      return res.status(400).json({ success: false, message: 'Namba ya simu tayari imesajiliwa' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Imeshindikana kusajili. Tafadhali jaribu tena.' });
  }
});

app.get('/api/sensor/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(
      `SELECT * FROM sensor_readings WHERE farmer_id = (SELECT id FROM farmers WHERE phone = $1) ORDER BY recorded_at DESC LIMIT 10`,
      [phone]
    );
    res.json({ success: true, readings: result.rows });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch sensor data' });
  }
});

app.get('/api/demo', (_req, res) => {
  res.json({
    success: true,
    message: 'Kenya Farm IoT Demo API',
    features: [
      'SMS alerts for soil moisture',
      'Kenyan farmer registration',
      'Works on feature phones',
      'Swahili language support'
    ],
    demo_phone: '0712345678',
    demo_message: 'Udongo umekauka. Umwagie maji kesho asubuhi.'
  });
});

const startServer = async () => {
  const PORT = Number(process.env.PORT) || 3000;
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('⚠️  Running in fallback mode (database not connected)');
    console.log('ℹ️  API will work, but data won\'t persist between restarts');
  }
  app.listen(PORT, () => {
    console.log(`✅ Kenya Farm IoT Backend running on port ${PORT}`);
    console.log(`🌍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📞 Register farmer: POST http://localhost:${PORT}/api/farmers/register`);
    if (!dbConnected) {
      console.log('⚠️  DATABASE NOT CONNECTED - Check Render PostgreSQL setup');
      console.log('🔗 Create database: Render Dashboard → New PostgreSQL');
      console.log('🔧 Then add DATABASE_URL to environment variables');
    }
  });
};

startServer();
