const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/attendance/today - Get current user's today's attendance status
router.get('/today', async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ success: true, attendance: null });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const attRes = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND date = $2`,
      [employeeId, todayStr]
    );

    res.json({
      success: true,
      attendance: attRes.rows[0] || null
    });
  } catch (err) {
    console.error('Fetch today attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch today attendance' });
  }
});

// POST /api/attendance/check-in - Employee Self Check-in
router.post('/check-in', async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee profile found for your account' });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const { notes } = req.body;

    // Check if already checked in today
    const existing = await query(
      'SELECT id, check_in, check_out FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, dateStr]
    );

    if (existing.rows.length > 0 && existing.rows[0].check_in) {
      return res.status(400).json({ success: false, message: 'You have already checked in today.' });
    }

    const attId = uuidv4();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Check if late (e.g., past 9:30 AM local time)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = (hours > 9 || (hours === 9 && minutes > 30));
    const status = isLate ? 'LATE' : 'PRESENT';

    if (existing.rows.length > 0) {
      await query(
        `UPDATE attendance SET check_in = CURRENT_TIMESTAMP, status = $1, notes = $2, ip_address = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [status, notes || null, ip, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO attendance (id, employee_id, date, check_in, status, notes, ip_address, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [attId, employeeId, dateStr, status, notes || null, ip]
      );
    }

    await logAudit(req.user.id, 'ATTENDANCE_CHECK_IN', 'attendance', attId, { date: dateStr, status }, req);

    res.json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString()} (${status})`,
      checkInTime: now.toISOString(),
      status
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ success: false, message: 'Failed to record check-in' });
  }
});

// POST /api/attendance/check-out - Employee Self Check-out
router.post('/check-out', async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No linked employee profile found' });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const existing = await query(
      'SELECT id, check_in, check_out, status FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, dateStr]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      return res.status(400).json({ success: false, message: 'Cannot check out without checking in first.' });
    }

    const attRecord = existing.rows[0];
    const checkInDate = new Date(attRecord.check_in);
    const workedHours = Math.max(0, Math.round(((now - checkInDate) / (1000 * 60 * 60)) * 100) / 100);

    let newStatus = attRecord.status;
    if (workedHours < 4 && newStatus !== 'LEAVE') {
      newStatus = 'HALF_DAY';
    }

    await query(
      `UPDATE attendance SET 
        check_out = CURRENT_TIMESTAMP, 
        worked_hours = $1, 
        status = $2, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [workedHours, newStatus, attRecord.id]
    );

    await logAudit(req.user.id, 'ATTENDANCE_CHECK_OUT', 'attendance', attRecord.id, { workedHours, status: newStatus }, req);

    res.json({
      success: true,
      message: `Checked out successfully. Total worked: ${workedHours} hrs`,
      checkOutTime: now.toISOString(),
      workedHours,
      status: newStatus
    });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ success: false, message: 'Failed to record check-out' });
  }
});

// GET /api/attendance - List attendance (Filtered by role)
router.get('/', async (req, res) => {
  try {
    const { employee_id, department_id, start_date, end_date, status } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    let sql = `
      SELECT a.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             e.profile_image,
             d.name as department_name
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === ROLES.EMPLOYEE) {
      params.push(userEmpId);
      sql += ` AND a.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND a.employee_id = $${params.length}`;
    }

    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      sql += ` AND a.date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND a.date <= $${params.length}`;
    }

    sql += ` ORDER BY a.date DESC, a.check_in DESC LIMIT 200`;

    const records = await query(sql, params);
    res.json({ success: true, attendance: records.rows });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records' });
  }
});

// PUT /api/attendance/:id - Update / Correct Attendance (HR_MANAGER, ADMIN)
router.put('/:id', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { id } = req.params;
    const { worked_hours, status, notes } = req.body;

    await query(
      `UPDATE attendance SET worked_hours = $1, status = $2, notes = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [parseFloat(worked_hours) || 0, status, notes || null, id]
    );

    await logAudit(req.user.id, 'CORRECT_ATTENDANCE', 'attendance', id, { worked_hours, status, notes }, req);
    res.json({ success: true, message: 'Attendance updated successfully' });
  } catch (err) {
    console.error('Update attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to update attendance' });
  }
});

module.exports = router;
