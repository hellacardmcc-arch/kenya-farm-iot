import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, testConnection } from './db';
import { runMigrations } from './db/migrations';
import { seedCrops } from './seed/crops.seed';
import { seedAdmin } from './seed/admin.seed';
import { validateFarmerRegistration } from './middleware/validation';
import adminAuthRouter from './routes/admin-auth';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory fallback when DB is unavailable
const farmers: Array<{ id: number; phone: string; name: string; county: string; farm_size?: number }> = [];
const sensorReadings: Array<{ id: number; farmer_id: number; moisture: number; temperature: number; recorded_at: string }> = [];
const farmerCrops: Array<{ id: number; farmer_id: number; crop_id: number; planting_date: string; area_acres: number; status: string; crop_name?: string; swahili_name?: string }> = [];
const wateringSchedules: Array<{ id: number; farmer_crop_id: number; scheduled_date: string; water_amount_mm: number; status: string; notes?: string; crop_name?: string; swahili_name?: string }> = [];
let inMemoryCropId = 0;
let inMemoryReadingId = 0;
let inMemoryScheduleId = 0;

let dbConnected = false;

app.use(cors());
app.use(express.json());

// Ensure farmers table exists before migrations (migrations expect it)
async function ensureFarmersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        county VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        moisture DECIMAL(5,2),
        temperature DECIMAL(5,2),
        battery INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
      CREATE INDEX IF NOT EXISTS idx_readings_farmer ON sensor_readings(farmer_id);
    `);
  } catch (e) {
    console.error('ensureFarmersTable:', e);
  }
}

async function initDb() {
  try {
    const ok = await testConnection();
    if (!ok) throw new Error('testConnection returned false');
    await ensureFarmersTable();
    await runMigrations();
    await seedCrops();
    await seedAdmin();
    dbConnected = true;
    console.log('Database connected and migrations/seeds applied.');
  } catch (err) {
    console.error('DB init failed, using in-memory mode:', err);
    dbConnected = false;
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Farmer registration
app.post('/api/farmers/register', validateFarmerRegistration, async (req, res) => {
  const { phone, name, county, farm_size } = req.body;
  try {
    if (dbConnected) {
      const result = await pool.query(
        `INSERT INTO farmers (phone, name, county, farm_size) VALUES ($1, $2, $3, $4)
         ON CONFLICT (phone) DO UPDATE SET name = $2, county = $3, farm_size = $4
         RETURNING id, phone, name, county, farm_size`,
        [phone, name, county, farm_size ?? null]
      );
      const row = result.rows[0];
      return res.status(201).json({
        success: true,
        message: `Karibu ${name}! Umesajiliwa kikamilifu.`,
        farmer: { id: row.id, phone: row.phone, name: row.name, county: row.county, farm_size: row.farm_size },
      });
    }
    const existing = farmers.find((f) => f.phone === phone);
    if (existing) {
      existing.name = name;
      existing.county = county;
      existing.farm_size = farm_size;
      return res.json({ success: true, message: `Updated ${name}.`, farmer: existing });
    }
    const id = farmers.length + 1;
    farmers.push({ id, phone, name, county, farm_size });
    res.status(201).json({ success: true, message: `Karibu ${name}!`, farmer: { id, phone, name, county, farm_size } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

// Get crops list
app.get('/api/crops', async (_req, res) => {
  try {
    if (dbConnected) {
      const result = await pool.query('SELECT id, name, swahili_name, optimal_moisture_min, optimal_moisture_max, water_requirement_mm, growth_days, description FROM crops ORDER BY name');
      return res.json({ success: true, crops: result.rows });
    }
    const demoCrops = [
      { id: 1, name: 'maize', swahili_name: 'mahindi' },
      { id: 2, name: 'kale', swahili_name: 'sukuma wiki' },
      { id: 3, name: 'tomatoes', swahili_name: 'nyanya' },
      { id: 4, name: 'capsicum', swahili_name: 'pilipili hoho' },
      { id: 5, name: 'watermelon', swahili_name: 'tikiti maji' },
    ];
    res.json({ success: true, crops: demoCrops });
  } catch (e) {
    console.error('Crops list error:', e);
    res.status(500).json({ success: false, message: 'Failed to load crops.' });
  }
});

// Assign crop to farmer
app.post('/api/farmers/:phone/crops', async (req, res) => {
  const { phone } = req.params;
  const { crop_id, planting_date, area_acres } = req.body;
  if (!crop_id || !planting_date || !area_acres) {
    return res.status(400).json({ success: false, message: 'Missing crop_id, planting_date, or area_acres.' });
  }
  try {
    if (dbConnected) {
      const farmerResult = await pool.query('SELECT id FROM farmers WHERE phone = $1', [phone]);
      if (farmerResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Farmer not found.' });
      const farmerId = farmerResult.rows[0].id;
      const insert = await pool.query(
        'INSERT INTO farmer_crops (farmer_id, crop_id, planting_date, area_acres) VALUES ($1, $2, $3, $4) RETURNING id',
        [farmerId, crop_id, planting_date, parseFloat(area_acres)]
      );
      const id = insert.rows[0].id;
      const cropRow = await pool.query('SELECT name, swahili_name FROM crops WHERE id = $1', [crop_id]);
      const crop = cropRow.rows[0] || {};
      return res.status(201).json({
        success: true,
        message: 'Crop added.',
        crop: { id, farmer_id: farmerId, crop_id, planting_date, area_acres: parseFloat(area_acres), status: 'growing', crop_name: crop.name, swahili_name: crop.swahili_name },
      });
    }
    const f = farmers.find((x) => x.phone === phone);
    if (!f) return res.status(404).json({ success: false, message: 'Farmer not found.' });
    inMemoryCropId += 1;
    const fc = { id: inMemoryCropId, farmer_id: f.id, crop_id: Number(crop_id), planting_date, area_acres: parseFloat(area_acres), status: 'growing' };
    farmerCrops.push(fc);
    res.status(201).json({ success: true, message: 'Crop added.', crop: fc });
  } catch (e) {
    console.error('Add crop error:', e);
    res.status(500).json({ success: false, message: 'Failed to add crop.' });
  }
});

// Get farmer's crops
app.get('/api/farmers/:phone/crops', async (req, res) => {
  const { phone } = req.params;
  try {
    if (dbConnected) {
      const farmerResult = await pool.query('SELECT id FROM farmers WHERE phone = $1', [phone]);
      if (farmerResult.rows.length === 0) return res.json({ success: true, crops: [] });
      const farmerId = farmerResult.rows[0].id;
      const result = await pool.query(
        `SELECT fc.id, fc.planting_date, fc.area_acres, fc.status, c.name AS crop_name, c.swahili_name, c.growth_days,
         (fc.planting_date + (c.growth_days || ' days')::interval)::date AS expected_harvest
         FROM farmer_crops fc JOIN crops c ON c.id = fc.crop_id WHERE fc.farmer_id = $1 ORDER BY fc.id DESC`,
        [farmerId]
      );
      const crops = result.rows.map((r) => ({
        id: r.id,
        planting_date: r.planting_date,
        area_acres: r.area_acres,
        status: r.status,
        crop_name: r.crop_name,
        swahili_name: r.swahili_name,
        growth_days: r.growth_days,
        expected_harvest: r.expected_harvest,
      }));
      return res.json({ success: true, crops });
    }
    const f = farmers.find((x) => x.phone === phone);
    if (!f) return res.json({ success: true, crops: [] });
    const list = farmerCrops.filter((fc) => fc.farmer_id === f.id).map((fc) => ({
      id: fc.id,
      planting_date: fc.planting_date,
      area_acres: fc.area_acres,
      status: fc.status,
      crop_name: fc.crop_name,
      swahili_name: fc.swahili_name,
    }));
    res.json({ success: true, crops: list });
  } catch (e) {
    console.error('Get crops error:', e);
    res.status(500).json({ success: false, message: 'Failed to load crops.' });
  }
});

// Get today's watering tasks
app.get('/api/farmers/:phone/watering/today', async (req, res) => {
  const { phone } = req.params;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (dbConnected) {
      const farmerResult = await pool.query('SELECT id FROM farmers WHERE phone = $1', [phone]);
      if (farmerResult.rows.length === 0) return res.json({ success: true, schedule: [] });
      const farmerId = farmerResult.rows[0].id;
      const result = await pool.query(
        `SELECT ws.id, ws.water_amount_mm, ws.notes, c.name AS crop_name, c.swahili_name
         FROM watering_schedules ws
         JOIN farmer_crops fc ON fc.id = ws.farmer_crop_id
         JOIN crops c ON c.id = fc.crop_id
         WHERE fc.farmer_id = $1 AND ws.scheduled_date = $2 AND ws.status = 'pending'
         ORDER BY ws.id`,
        [farmerId, today]
      );
      const schedule = result.rows.map((r) => ({
        id: r.id,
        water_amount_mm: r.water_amount_mm,
        notes: r.notes,
        crop_name: r.crop_name,
        swahili_name: r.swahili_name,
        swahili_message: r.swahili_name ? `Umwagia ${r.swahili_name} leo.` : r.notes,
      }));
      return res.json({ success: true, schedule });
    }
    const f = farmers.find((x) => x.phone === phone);
    if (!f) return res.json({ success: true, schedule: [] });
    const list = wateringSchedules.filter((ws) => ws.scheduled_date === today && ws.status === 'pending');
    res.json({ success: true, schedule: list });
  } catch (e) {
    console.error('Watering today error:', e);
    res.status(500).json({ success: false, message: 'Failed to load watering schedule.' });
  }
});

// Complete watering task
app.post('/api/watering/:id/complete', async (req, res) => {
  const id = Number(req.params.id);
  const { actual_water_used } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'Invalid task id.' });
  try {
    if (dbConnected) {
      const result = await pool.query(
        `UPDATE watering_schedules SET status = 'completed', actual_water_used = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
        [actual_water_used ?? null, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Task not found.' });
      return res.json({ success: true, message: 'Watering task completed.' });
    }
    const idx = wateringSchedules.findIndex((ws) => ws.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found.' });
    wateringSchedules[idx].status = 'completed';
    res.json({ success: true, message: 'Watering task completed.' });
  } catch (e) {
    console.error('Complete watering error:', e);
    res.status(500).json({ success: false, message: 'Failed to complete task.' });
  }
});

// Get farmer's sensor readings
app.get('/api/farmer/:phone/readings', async (req, res) => {
  const { phone } = req.params;
  try {
    if (dbConnected) {
      const farmerResult = await pool.query('SELECT id FROM farmers WHERE phone = $1', [phone]);
      if (farmerResult.rows.length === 0) return res.json({ success: true, readings: [] });
      const farmerId = farmerResult.rows[0].id;
      const result = await pool.query(
        'SELECT id, moisture, temperature, recorded_at FROM sensor_readings WHERE farmer_id = $1 ORDER BY recorded_at DESC LIMIT 50',
        [farmerId]
      );
      const readings = result.rows.map((r) => ({
        id: r.id,
        moisture: r.moisture,
        temperature: r.temperature,
        recorded_at: r.recorded_at,
      }));
      return res.json({ success: true, readings });
    }
    const f = farmers.find((x) => x.phone === phone);
    if (!f) return res.json({ success: true, readings: [] });
    const list = sensorReadings.filter((r) => r.farmer_id === f.id).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()).slice(0, 50);
    res.json({ success: true, readings: list });
  } catch (e) {
    console.error('Readings error:', e);
    res.status(500).json({ success: false, message: 'Failed to load readings.' });
  }
});

app.use('/api/admin', adminAuthRouter);
app.use('/api/admin', adminRouter);

app.get('/', (_req, res) => {
  res.send('Kenya Farm IoT API. Use /api/health for status.');
});

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
