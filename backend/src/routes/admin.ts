import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/admin-auth';

const router = express.Router();

// ==================== HELPER: Log admin activity ====================
async function logAdminActivity(
  adminId: number,
  action: string,
  resource: string,
  resourceId: number | null,
  details: Record<string, unknown> = {}
) {
  try {
    const ip = (details.ip as string) || null;
    const userAgent = (details.userAgent as string) || null;
    const detailsForJson = { ...details };
    delete detailsForJson.ip;
    delete detailsForJson.userAgent;

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, action, resource, resourceId, JSON.stringify(detailsForJson), ip, userAgent]
    );
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
}

// ==================== DASHBOARD STATS ====================

router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { county?: string; role: string } }).admin;

    let countyFilter = '';
    const params: string[] = [];

    if (admin.county && admin.role !== 'super_admin') {
      countyFilter = 'WHERE f.county = $1';
      params.push(admin.county);
    }

    const farmersQuery = await pool.query(
      `SELECT COUNT(*) as total FROM farmers f ${countyFilter}`,
      params
    );

    const cropsQuery = await pool.query(
      `SELECT COUNT(*) as total
       FROM farmer_crops fc
       JOIN farmers f ON fc.farmer_id = f.id
       WHERE fc.status = 'growing' ${admin.county && admin.role !== 'super_admin' ? 'AND f.county = $1' : ''}`,
      admin.county && admin.role !== 'super_admin' ? [admin.county] : []
    );

    const readingsQuery = await pool.query(
      `SELECT COUNT(*) as total
       FROM sensor_readings
       WHERE DATE(recorded_at) = CURRENT_DATE`
    );

    const wateringQuery = await pool.query(
      `SELECT COUNT(*) as total
       FROM watering_schedules
       WHERE status = 'pending' AND scheduled_date <= CURRENT_DATE`
    );

    const recentRegQuery = await pool.query(
      `SELECT COUNT(*) as total, DATE(created_at) as date
       FROM farmers
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       ${admin.county && admin.role !== 'super_admin' ? 'AND county = $1' : ''}
       GROUP BY DATE(created_at)
       ORDER BY date`,
      admin.county && admin.role !== 'super_admin' ? [admin.county] : []
    );

    const countyQuery = await pool.query(
      `SELECT county, COUNT(*) as farmers_count
       FROM farmers
       ${admin.county && admin.role !== 'super_admin' ? 'WHERE county = $1' : ''}
       GROUP BY county
       ORDER BY farmers_count DESC
       LIMIT 10`,
      admin.county && admin.role !== 'super_admin' ? [admin.county] : []
    );

    res.json({
      success: true,
      stats: {
        total_farmers: parseInt(farmersQuery.rows[0].total, 10),
        active_crops: parseInt(cropsQuery.rows[0].total, 10),
        todays_readings: parseInt(readingsQuery.rows[0].total, 10),
        pending_watering: parseInt(wateringQuery.rows[0].total, 10),
        recent_registrations: recentRegQuery.rows,
        county_distribution: countyQuery.rows,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard stats',
    });
  }
});

// ==================== FARMER MANAGEMENT ====================

router.get('/farmers', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { county?: string; role: string } }).admin;
    const { page = 1, limit = 20, county, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (admin.county && admin.role !== 'super_admin') {
      paramCount++;
      whereConditions.push(`f.county = $${paramCount}`);
      params.push(admin.county);
    } else if (county) {
      paramCount++;
      whereConditions.push(`f.county = $${paramCount}`);
      params.push(county as string);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(f.name ILIKE $${paramCount} OR f.phone ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const farmersQuery = await pool.query(
      `SELECT
         f.id, f.phone, f.name, f.county, f.farm_size, f.created_at,
         COUNT(DISTINCT fc.id) as crops_count,
         COUNT(DISTINCT sr.id) as readings_count,
         MAX(sr.recorded_at) as last_reading
       FROM farmers f
       LEFT JOIN farmer_crops fc ON f.id = fc.farmer_id
       LEFT JOIN sensor_readings sr ON f.id = sr.farmer_id
       ${whereClause}
       GROUP BY f.id
       ORDER BY f.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, Number(limit), offset]
    );

    const countQuery = await pool.query(
      `SELECT COUNT(*) as total FROM farmers f ${whereClause}`,
      params
    );

    res.json({
      success: true,
      farmers: farmersQuery.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countQuery.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countQuery.rows[0].total, 10) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('List farmers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers',
    });
  }
});

router.get('/farmers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const farmerQuery = await pool.query(
      `SELECT
         f.*,
         (SELECT COUNT(*) FROM farmer_crops WHERE farmer_id = f.id) as crops_count,
         (SELECT COUNT(*) FROM sensor_readings WHERE farmer_id = f.id) as readings_count,
         (SELECT JSON_AGG(crops) FROM (
           SELECT fc.id, fc.planting_date, fc.area_acres, fc.status, c.swahili_name, c.name as crop_type
           FROM farmer_crops fc
           JOIN crops c ON fc.crop_id = c.id
           WHERE fc.farmer_id = f.id
           ORDER BY fc.planting_date DESC
         ) crops) as crops,
         (SELECT JSON_AGG(readings) FROM (
           SELECT moisture, temperature, recorded_at
           FROM sensor_readings
           WHERE farmer_id = f.id
           ORDER BY recorded_at DESC
           LIMIT 10
         ) readings) as recent_readings
       FROM farmers f
       WHERE f.id = $1`,
      [id]
    );

    if (farmerQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found',
      });
    }

    res.json({
      success: true,
      farmer: farmerQuery.rows[0],
    });
  } catch (error) {
    console.error('Farmer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer details',
    });
  }
});

router.put('/farmers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, county, farm_size } = req.body;
    const admin = (req as express.Request & { admin: { id: number } }).admin;

    const farmerCheck = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);

    if (farmerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found',
      });
    }

    await pool.query(
      `UPDATE farmers
       SET name = COALESCE($1, name),
           county = COALESCE($2, county),
           farm_size = COALESCE($3, farm_size)
       WHERE id = $4`,
      [name, county, farm_size, id]
    );

    await logAdminActivity(admin.id, 'update', 'farmer', parseInt(id, 10), {
      updates: { name, county, farm_size },
    });

    res.json({
      success: true,
      message: 'Farmer updated successfully',
    });
  } catch (error) {
    console.error('Update farmer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update farmer',
    });
  }
});

router.post('/farmers/:id/sms', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const admin = (req as express.Request & { admin: { id: number } }).admin;

    const farmerQuery = await pool.query(
      'SELECT phone, name FROM farmers WHERE id = $1',
      [id]
    );

    if (farmerQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found',
      });
    }

    const farmer = farmerQuery.rows[0];

    await pool.query(
      `INSERT INTO sms_logs (farmer_id, phone, message, message_type)
       VALUES ($1, $2, $3, $4)`,
      [id, farmer.phone, message, 'admin_message']
    );

    await logAdminActivity(admin.id, 'send_sms', 'farmer', parseInt(id, 10), {
      message: message.substring(0, 50) + '...',
    });

    res.json({
      success: true,
      message: 'SMS scheduled for sending',
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
    });
  }
});

// ==================== CROP MANAGEMENT ====================

router.get('/crops', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { county?: string; role: string } }).admin;
    const { page = 1, limit = 20, status, county } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (admin.county && admin.role !== 'super_admin') {
      paramCount++;
      whereConditions.push(`f.county = $${paramCount}`);
      params.push(admin.county);
    } else if (county) {
      paramCount++;
      whereConditions.push(`f.county = $${paramCount}`);
      params.push(county as string);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`fc.status = $${paramCount}`);
      params.push(status as string);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const cropsQuery = await pool.query(
      `SELECT
         fc.id, fc.planting_date, fc.area_acres, fc.status,
         c.swahili_name, c.name as crop_type,
         f.name as farmer_name, f.phone, f.county,
         (fc.planting_date + (c.growth_days || ' days')::interval)::date as expected_harvest,
         (SELECT COUNT(*) FROM watering_schedules ws
          WHERE ws.farmer_crop_id = fc.id AND ws.status = 'pending') as pending_watering
       FROM farmer_crops fc
       JOIN crops c ON fc.crop_id = c.id
       JOIN farmers f ON fc.farmer_id = f.id
       ${whereClause}
       ORDER BY fc.planting_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, Number(limit), offset]
    );

    const countQuery = await pool.query(
      `SELECT COUNT(*) as total
       FROM farmer_crops fc
       JOIN farmers f ON fc.farmer_id = f.id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      crops: cropsQuery.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countQuery.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countQuery.rows[0].total, 10) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('List crops error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crops',
    });
  }
});

// ==================== SENSOR DATA ====================

router.get('/sensor-readings', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      phone,
      startDate,
      endDate,
      minMoisture,
      maxMoisture,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (phone) {
      paramCount++;
      whereConditions.push(`f.phone = $${paramCount}`);
      params.push(phone as string);
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`sr.recorded_at >= $${paramCount}`);
      params.push(startDate as string);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`sr.recorded_at <= $${paramCount}`);
      params.push(endDate as string);
    }

    if (minMoisture) {
      paramCount++;
      whereConditions.push(`sr.moisture >= $${paramCount}`);
      params.push(parseFloat(minMoisture as string));
    }

    if (maxMoisture) {
      paramCount++;
      whereConditions.push(`sr.moisture <= $${paramCount}`);
      params.push(parseFloat(maxMoisture as string));
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const readingsQuery = await pool.query(
      `SELECT sr.*, f.name as farmer_name, f.county
       FROM sensor_readings sr
       LEFT JOIN farmers f ON sr.farmer_id = f.id
       ${whereClause}
       ORDER BY sr.recorded_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, Number(limit), offset]
    );

    const countQuery = await pool.query(
      `SELECT COUNT(*) as total
       FROM sensor_readings sr
       LEFT JOIN farmers f ON sr.farmer_id = f.id
       ${whereClause}`,
      params
    );

    const statsQuery = await pool.query(
      `SELECT
         COUNT(*) as total_readings,
         AVG(moisture)::numeric(10,2) as avg_moisture,
         MIN(moisture) as min_moisture,
         MAX(moisture) as max_moisture,
         AVG(temperature)::numeric(10,2) as avg_temperature
       FROM sensor_readings sr
       LEFT JOIN farmers f ON sr.farmer_id = f.id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      readings: readingsQuery.rows,
      stats: statsQuery.rows[0],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countQuery.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countQuery.rows[0].total, 10) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Sensor readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor readings',
    });
  }
});

// ==================== SMS LOGS ====================

router.get('/sms-logs', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, phone, status, startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (phone) {
      paramCount++;
      whereConditions.push(`sl.phone = $${paramCount}`);
      params.push(phone as string);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`sl.status = $${paramCount}`);
      params.push(status as string);
    }

    if (startDate) {
      paramCount++;
      whereConditions.push(`sl.sent_at >= $${paramCount}`);
      params.push(startDate as string);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`sl.sent_at <= $${paramCount}`);
      params.push(endDate as string);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsQuery = await pool.query(
      `SELECT sl.*, f.name as farmer_name
       FROM sms_logs sl
       LEFT JOIN farmers f ON sl.farmer_id = f.id
       ${whereClause}
       ORDER BY sl.sent_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, Number(limit), offset]
    );

    const countQuery = await pool.query(
      `SELECT COUNT(*) as total FROM sms_logs sl ${whereClause}`,
      params
    );

    const statsQuery = await pool.query(
      `SELECT
         COUNT(*) as total_sms,
         COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         SUM(cost) as total_cost
       FROM sms_logs sl
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      logs: logsQuery.rows,
      stats: statsQuery.rows[0],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countQuery.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countQuery.rows[0].total, 10) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('SMS logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS logs',
    });
  }
});

// ==================== SYSTEM SETTINGS ====================

router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM system_settings';
    const params: string[] = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category as string);
    }

    query += ' ORDER BY category, setting_key';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      settings: result.rows,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
    });
  }
});

router.put('/settings/:key', authenticateAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const admin = (req as express.Request & { admin: { id: number } }).admin;

    const settingCheck = await pool.query(
      'SELECT * FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (settingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }

    if (!settingCheck.rows[0].is_editable) {
      return res.status(403).json({
        success: false,
        message: 'This setting is not editable',
      });
    }

    await pool.query(
      `UPDATE system_settings
       SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE setting_key = $2`,
      [value, key]
    );

    await logAdminActivity(admin.id, 'update', 'setting', null, { key, value });

    res.json({
      success: true,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
    });
  }
});

// ==================== ADMIN MANAGEMENT (Super Admin Only) ====================

router.get('/admins', authenticateAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const admins = await pool.query(
      'SELECT id, username, email, role, county, is_active, last_login, created_at FROM admins ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      admins: admins.rows,
    });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
    });
  }
});

router.post('/admins', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role, county } = req.body;
    const admin = (req as express.Request & { admin: { id: number } }).admin;

    const existing = await pool.query(
      'SELECT id FROM admins WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO admins (username, email, password_hash, role, county)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, county`,
      [username, email, passwordHash, role || 'admin', county]
    );

    await logAdminActivity(admin.id, 'create', 'admin', result.rows[0].id, {
      username,
      role,
      county,
    });

    res.json({
      success: true,
      message: 'Admin created successfully',
      admin: result.rows[0],
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
    });
  }
});

// ==================== ACTIVITY LOGS ====================

router.get('/activity-logs', authenticateAdmin, async (req, res) => {
  try {
    const admin = (req as express.Request & { admin: { id: number; role: string } }).admin;
    const { page = 1, limit = 50, action, resource } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCount = 0;

    if (admin.role !== 'super_admin') {
      paramCount++;
      whereConditions.push(`al.admin_id = $${paramCount}`);
      params.push(admin.id);
    }

    if (action) {
      paramCount++;
      whereConditions.push(`al.action = $${paramCount}`);
      params.push(action as string);
    }

    if (resource) {
      paramCount++;
      whereConditions.push(`al.resource = $${paramCount}`);
      params.push(resource as string);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logsQuery = await pool.query(
      `SELECT al.*, a.username as admin_username
       FROM admin_logs al
       JOIN admins a ON al.admin_id = a.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, Number(limit), offset]
    );

    const countQuery = await pool.query(
      `SELECT COUNT(*) as total FROM admin_logs al ${whereClause}`,
      params
    );

    res.json({
      success: true,
      logs: logsQuery.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countQuery.rows[0].total, 10),
        totalPages: Math.ceil(parseInt(countQuery.rows[0].total, 10) / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
    });
  }
});

export default router;
