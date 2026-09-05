const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/schedules - List working schedules
router.get('/', async (req, res) => {
  try {
    const schedules = await query(
      `SELECT ws.*, COUNT(c.id) as assigned_contract_count
       FROM working_schedules ws
       LEFT JOIN contracts c ON c.working_schedule_id = ws.id AND c.status = 'ACTIVE'
       GROUP BY ws.id
       ORDER BY ws.name ASC`
    );

    res.json({ success: true, schedules: schedules.rows });
  } catch (err) {
    console.error('Fetch schedules error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
});

// GET /api/schedules/:id - Get schedule details with days
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const schedRes = await query('SELECT * FROM working_schedules WHERE id = $1', [id]);
    if (schedRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const daysRes = await query('SELECT * FROM working_schedule_days WHERE schedule_id = $1 ORDER BY id ASC', [id]);

    res.json({
      success: true,
      schedule: schedRes.rows[0],
      days: daysRes.rows
    });
  } catch (err) {
    console.error('Fetch schedule details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule details' });
  }
});

// POST /api/schedules - Create schedule (ADMIN, HR_MANAGER)
router.post('/', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { name, timezone, weekly_working_hours, working_days, start_time, end_time, break_hours } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Schedule name is required' });

    const id = uuidv4();
    await query(
      `INSERT INTO working_schedules (id, company_id, name, timezone, weekly_working_hours, working_days, start_time, end_time, break_hours, is_active)
       VALUES ($1, 'comp-001', $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [id, name.trim(), timezone || 'UTC', parseFloat(weekly_working_hours) || 40.0, working_days || 'Monday,Tuesday,Wednesday,Thursday,Friday', start_time || '09:00:00', end_time || '18:00:00', parseFloat(break_hours) || 1.0]
    );

    // Populate day records
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const activeDaysList = (working_days || 'Monday,Tuesday,Wednesday,Thursday,Friday').split(',');
    for (const day of days) {
      const isWork = activeDaysList.includes(day);
      await query(
        `INSERT INTO working_schedule_days (id, schedule_id, day_of_week, is_working_day, start_time, end_time, break_hours, hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), id, day, isWork, isWork ? (start_time || '09:00:00') : '00:00:00', isWork ? (end_time || '18:00:00') : '00:00:00', isWork ? (parseFloat(break_hours) || 1.0) : 0, isWork ? 8.0 : 0.0]
      );
    }

    await logAudit(req.user.id, 'CREATE_SCHEDULE', 'working_schedules', id, { name, weekly_working_hours }, req);
    res.status(201).json({ success: true, message: 'Schedule created successfully', id });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
});

module.exports = router;
