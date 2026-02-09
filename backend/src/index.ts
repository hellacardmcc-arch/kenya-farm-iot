import express from 'express';
import cors from 'cors';
import { pool, initDatabase } from './db';
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
      region: 'Kenya'
    });
  } catch {
    res.json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      service: 'Kenya Farm IoT Backend',
      message: 'Running without database'
    });
  }
});

app.post('/api/farmers/register', async (req, res) => {
  try {
    const { phone, name, county } = req.body;
    if (!phone || !/^07[0-9]{8}$/.test(phone)) {
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

app.post('/api/sensor/reading', async (req, res) => {
  try {
    const { phone, moisture, temperature } = req.body;
    const farmerCheck = await pool.query('SELECT id FROM farmers WHERE phone = $1', [phone]);
    if (farmerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not registered. Please register first.'
      });
    }
    const result = await pool.query(
      `INSERT INTO sensor_readings (phone, moisture, temperature) VALUES ($1, $2, $3) RETURNING id, moisture, temperature, recorded_at`,
      [phone, moisture, temperature]
    );
    let advice = '';
    if (moisture < 30) {
      advice = 'Udongo umekauka. Umwagie maji sasa.';
    } else if (moisture < 60) {
      advice = 'Udongo uko sawa. Usiumwagie maji leo.';
    } else {
      advice = 'Udongo umejaa maji. Usiumwagie maji wiki ijayo.';
    }
    res.json({
      success: true,
      reading: result.rows[0],
      advice,
      message: 'Sensor data saved successfully'
    });
  } catch (error) {
    console.error('Sensor error:', error);
    res.status(500).json({ success: false, message: 'Failed to save sensor data' });
  }
});

app.get('/api/farmer/:phone/readings', async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await pool.query(
      `SELECT moisture, temperature, recorded_at FROM sensor_readings WHERE phone = $1 ORDER BY recorded_at DESC LIMIT 10`,
      [phone]
    );
    res.json({
      success: true,
      phone,
      readings: result.rows,
      count: result.rows.length
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch readings' });
  }
});

app.get('/api/demo', (_req, res) => {
  res.json({
    success: true,
    message: '🇰🇪 Kenya Farm IoT API',
    endpoints: [
      'POST /api/farmers/register - Register Kenyan farmer',
      'POST /api/sensor/reading - Submit sensor data',
      'GET /api/farmer/:phone/readings - Get farmer readings',
      'GET /api/health - Health check'
    ],
    example: {
      register: {
        phone: '0712345678',
        name: 'John Kamau',
        county: 'Nairobi'
      }
    }
  });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    console.log('⚠️  Database not initialized. Some features may not work.');
  }
  app.listen(PORT, () => {
    console.log(`✅ Kenya Farm IoT Backend running on port ${PORT}`);
    console.log(`🌍 Health: http://localhost:${PORT}/api/health`);
    console.log(`📞 Demo: http://localhost:${PORT}/api/demo`);
    if (!dbInitialized) {
      console.log('⚠️  IMPORTANT: Set DATABASE_URL environment variable');
      console.log('🔗 Create PostgreSQL on Render and add DATABASE_URL');
    }
  });
}

startServer();
