import express from 'express';
import cors from 'cors';
import { log, logError } from './utils/logger';

const app = express();
app.use(cors());
app.use(express.json());

const farmers: { id: number; phone: string; name: string; county: string; createdAt: Date }[] = [];
const readings: { id: number; phone: string; moisture: number; temperature?: number; recordedAt: Date }[] = [];

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Kenya Farm IoT',
    farmers: farmers.length,
    readings: readings.length,
    message: '🇰🇪 Inafanya kazi!'
  });
});

app.get('/api/status', (_req, res) => {
  const currentTime = new Date();
  const uptime = process.uptime();
  res.json({
    status: 'operational',
    version: '1.0.0',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    database: 'in-memory',
    farmers: farmers.length,
    readings: readings.length,
    timestamp: currentTime.toISOString(),
    region: 'Kenya'
  });
});

app.post('/api/farmers/register', async (req, res) => {
  log('Farmer registration attempt', { phone: req.body?.phone });

  try {
    const { phone, name, county } = req.body;
    if (!phone || !/^07[0-9]{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Tafadhali weka namba ya simu ya Kenya (07xxxxxxxx)'
      });
    }
    if (farmers.find(f => f.phone === phone)) {
      return res.status(400).json({
        success: false,
        message: 'Namba ya simu tayari imesajiliwa'
      });
    }
    const farmer = {
      id: farmers.length + 1,
      phone,
      name,
      county,
      createdAt: new Date()
    };
    farmers.push(farmer);
    log('Farmer registered successfully', { phone, name });
    res.json({
      success: true,
      message: `Karibu ${name} kutoka ${county}!`,
      farmer,
      total: farmers.length
    });
  } catch (error) {
    logError(error, 'farmer registration');
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.post('/api/sensor/reading', (req, res) => {
  const { phone, moisture, temperature } = req.body;
  if (!farmers.find(f => f.phone === phone)) {
    return res.status(404).json({
      success: false,
      message: 'Farmer not found. Register first.'
    });
  }
  const reading = {
    id: readings.length + 1,
    phone,
    moisture,
    temperature,
    recordedAt: new Date()
  };
  readings.push(reading);
  let advice = '';
  if (moisture < 30) advice = 'Udongo umekauka. Umwagie maji sasa.';
  else if (moisture < 60) advice = 'Udongo uko sawa.';
  else advice = 'Udongo umejaa maji.';
  res.json({
    success: true,
    reading,
    advice,
    totalReadings: readings.length
  });
});

app.get('/api/farmer/:phone/readings', (req, res) => {
  const { phone } = req.params;
  const farmerReadings = readings.filter(r => r.phone === phone).slice(0, 10);
  res.json({
    success: true,
    phone,
    readings: farmerReadings,
    count: farmerReadings.length
  });
});

app.get('/api/admin/data', (_req, res) => {
  res.json({
    farmers,
    readings,
    summary: {
      totalFarmers: farmers.length,
      totalReadings: readings.length,
      counties: [...new Set(farmers.map(f => f.county))]
    }
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`✅ Kenya Farm IoT MVP running on port ${PORT}`);
  console.log(`📍 No database needed for MVP`);
  console.log(`📍 Data resets on restart - add database later`);
});
