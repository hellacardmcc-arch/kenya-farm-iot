import express from 'express';
import cors from 'cors';
import { log, logError } from './utils/logger';
import { SMSService } from './services/sms.service';
import { validateFarmerRegistration } from './middleware/validation';
import { runMigrations } from './db/migrations';
import { AuthService } from './services/auth.service';

const app = express();
app.use(cors());
app.use(express.json());

const farmers: { id: number; phone: string; name: string; county: string; createdAt: Date }[] = [];
const readings: { id: number; phone: string; moisture: number; temperature?: number; recordedAt: Date }[] = [];

app.get('/', (_req, res) => {
  res.json({
    service: 'Kenya Farm IoT API',
    docs: 'Use /api/health, /api/status, POST /api/farmers/register, etc.',
    health: '/api/health',
    status: '/api/status'
  });
});

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

// Request OTP
app.post('/api/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone || !/^07[0-9]{8}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number'
    });
  }
  
  const otp = AuthService.generateOTP();
  const stored = await AuthService.storeOTP(phone, otp);
  
  if (stored) {
    // In production, send via SMS
    console.log(`OTP for ${phone}: ${otp}`);
    
    res.json({
      success: true,
      message: 'OTP generated (check console for development)'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to generate OTP'
    });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  const isValid = await AuthService.verifyOTP(phone, otp);
  
  if (isValid) {
    // Generate simple token
    const token = Buffer.from(`${phone}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      token: token,
      message: 'Authentication successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }
});

app.post('/api/farmers/register', validateFarmerRegistration, async (req, res) => {
  log('Farmer registration attempt', { phone: req.body?.phone });

  try {
    const { phone, name, county } = req.body;
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

    const smsSent = await SMSService.sendWelcomeSMS(phone, name);
    if (smsSent) {
      log('Welcome SMS sent successfully', { phone });
    }

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

async function startServer() {
  try {
    await runMigrations();
    log('Database migrations ran successfully');
  } catch (error) {
    logError(error, 'runMigrations');
    log('Continuing with in-memory mode (database optional for MVP)');
  }

  app.listen(PORT, () => {
    console.log(`✅ Kenya Farm IoT MVP running on port ${PORT}`);
    console.log(`📍 No database needed for MVP (DB optional, used when configured)`);
    console.log(`📍 Data resets on restart for in-memory storage`);
  });
}

startServer().catch((error) => {
  logError(error, 'startServer');
  process.exit(1);
});
