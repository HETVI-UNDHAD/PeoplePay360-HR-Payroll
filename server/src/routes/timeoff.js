const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/timeoff/types - List all time off types
router.get('/types', async (req, res) => {
  try {
    const types = await query('SELECT * FROM time_off_types WHERE is_active = TRUE ORDER BY name ASC');
    res.json({ success: true, types: types.rows });
  } catch (err) {
    console.error('Fetch timeoff types error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch time-off types' });
  }
});

// GET /api/timeoff/allocations - List leave allocations
router.get('/allocations', async (req, res) => {
  try {
    const { employee_id, year } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;
    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    let sql = `
      SELECT la.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             d.name as department_name,
             tot.name as leave_type_name,
             tot.code as leave_type_code,
             tot.is_paid,
             tot.color_code
      FROM leave_allocations la
      JOIN employees e ON e.id = la.employee_id
      JOIN time_off_types tot ON tot.id = la.time_off_type_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE la.year = $1
    `;
    const params = [targetYear];

    if (userRole === ROLES.EMPLOYEE) {
      params.push(userEmpId);
      sql += ` AND la.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND la.employee_id = $${params.length}`;
    }

    sql += ` ORDER BY e.first_name ASC, tot.name ASC`;

    const allocations = await query(sql, params);
    res.json({ success: true, allocations: allocations.rows });
  } catch (err) {
    console.error('Fetch allocations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leave allocations' });
  }
});

// POST /api/timeoff/allocations - Allocate leaves (HR_MANAGER, ADMIN)
router.post('/allocations', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { employee_id, time_off_type_id, year, allocated_days } = req.body;
    if (!employee_id || !time_off_type_id || allocated_days === undefined) {
      return res.status(400).json({ success: false, message: 'Employee, leave type, and allocated days are required' });
    }

    const allocYear = parseInt(year, 10) || new Date().getFullYear();
    const allocDays = parseFloat(allocated_days) || 0;

    // Check if allocation exists
    const existing = await query(
      `SELECT id, used_days FROM leave_allocations WHERE employee_id = $1 AND time_off_type_id = $2 AND year = $3`,
      [employee_id, time_off_type_id, allocYear]
    );

    if (existing.rows.length > 0) {
      const used = parseFloat(existing.rows[0].used_days) || 0;
      const remaining = Math.max(0, allocDays - used);
      await query(
        `UPDATE leave_allocations SET allocated_days = $1, remaining_days = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [allocDays, remaining, existing.rows[0].id]
      );
    } else {
      const id = uuidv4();
      await query(
        `INSERT INTO leave_allocations (id, employee_id, time_off_type_id, year, allocated_days, used_days, remaining_days, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, employee_id, time_off_type_id, allocYear, allocDays]
      );
    }

    await logAudit(req.user.id, 'ALLOCATE_LEAVE', 'leave_allocations', employee_id, { time_off_type_id, year: allocYear, allocated_days: allocDays }, req);

    res.json({ success: true, message: 'Leave allocation updated successfully' });
  } catch (err) {
    console.error('Allocate leave error:', err);
    res.status(500).json({ success: false, message: 'Failed to allocate leaves' });
  }
});

// GET /api/timeoff/requests - List time off requests
router.get('/requests', async (req, res) => {
  try {
    const { status, employee_id } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    let sql = `
      SELECT tor.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             e.profile_image,
             d.name as department_name,
             tot.name as leave_type_name,
             tot.code as leave_type_code,
             tot.is_paid,
             tot.color_code,
             u.first_name || ' ' || u.last_name as reviewer_name
      FROM time_off_requests tor
      JOIN employees e ON e.id = tor.employee_id
      JOIN time_off_types tot ON tot.id = tor.time_off_type_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = tor.reviewed_by
      WHERE 1=1
    `;
    const params = [];

    if (userRole === ROLES.EMPLOYEE) {
      params.push(userEmpId);
      sql += ` AND tor.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND tor.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND tor.status = $${params.length}`;
    }

    sql += ` ORDER BY tor.created_at DESC LIMIT 200`;

    const requests = await query(sql, params);
    res.json({ success: true, requests: requests.rows });
  } catch (err) {
    console.error('Fetch timeoff requests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch time-off requests' });
  }
});

// POST /api/timeoff/requests - Apply for Time Off (Employee / HR)
router.post('/requests', async (req, res) => {
  try {
    let { employee_id, time_off_type_id, from_date, to_date, total_days, reason } = req.body;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    if (userRole === ROLES.EMPLOYEE) {
      employee_id = userEmpId;
    }

    if (!employee_id || !time_off_type_id || !from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'All fields (employee, leave type, dates, reason) are required' });
    }

    const calculatedDays = parseFloat(total_days) || 1.0;

    // Fetch leave type configuration
    const typeRes = await query('SELECT * FROM time_off_types WHERE id = $1', [time_off_type_id]);
    if (typeRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid leave type' });
    }
    const leaveType = typeRes.rows[0];

    // If allocation required, validate available remaining days
    if (leaveType.is_allocation_required) {
      const year = new Date(from_date).getFullYear();
      const allocRes = await query(
        `SELECT * FROM leave_allocations WHERE employee_id = $1 AND time_off_type_id = $2 AND year = $3`,
        [employee_id, time_off_type_id, year]
      );

      if (allocRes.rows.length === 0 || parseFloat(allocRes.rows[0].remaining_days) < calculatedDays) {
        const remaining = allocRes.rows.length > 0 ? allocRes.rows[0].remaining_days : 0;
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You requested ${calculatedDays} day(s), but only ${remaining} day(s) remain in your allocation.`
        });
      }
    }

    const reqId = uuidv4();
    await query(
      `INSERT INTO time_off_requests (id, employee_id, time_off_type_id, from_date, to_date, total_days, reason, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [reqId, employee_id, time_off_type_id, from_date, to_date, calculatedDays, reason.trim()]
    );

    await logAudit(req.user.id, 'APPLY_TIME_OFF', 'time_off_requests', reqId, { employee_id, from_date, to_date, total_days: calculatedDays }, req);

    res.status(201).json({
      success: true,
      message: 'Time-off request submitted successfully. Pending HR Manager review.',
      requestId: reqId
    });
  } catch (err) {
    console.error('Apply timeoff error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit time-off request' });
  }
});

// POST /api/timeoff/requests/:id/action - Approve or Reject Request (HR_MANAGER, ADMIN)
router.post('/requests/:id/action', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    const reqRes = await query(
      `SELECT tor.*, tot.is_allocation_required, tot.is_paid 
       FROM time_off_requests tor
       JOIN time_off_types tot ON tot.id = tor.time_off_type_id
       WHERE tor.id = $1`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Time-off request not found' });
    }

    const leaveReq = reqRes.rows[0];

    if (leaveReq.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `This request has already been ${leaveReq.status.toLowerCase()}` });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // If APPROVE and allocation is required, deduct from allocation balance
    if (action === 'APPROVE' && leaveReq.is_allocation_required) {
      const year = new Date(leaveReq.from_date).getFullYear();
      const allocRes = await query(
        `SELECT * FROM leave_allocations WHERE employee_id = $1 AND time_off_type_id = $2 AND year = $3`,
        [leaveReq.employee_id, leaveReq.time_off_type_id, year]
      );

      if (allocRes.rows.length > 0) {
        const alloc = allocRes.rows[0];
        const newUsed = (parseFloat(alloc.used_days) || 0) + parseFloat(leaveReq.total_days);
        const newRemaining = Math.max(0, (parseFloat(alloc.allocated_days) || 0) - newUsed);

        await query(
          `UPDATE leave_allocations SET used_days = $1, remaining_days = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [newUsed, newRemaining, alloc.id]
        );
      }
    }

    // Update request record
    await query(
      `UPDATE time_off_requests SET 
        status = $1, 
        reviewed_by = $2, 
        reviewed_at = CURRENT_TIMESTAMP, 
        review_comments = $3, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      [newStatus, req.user.id, comment || null, id]
    );

    await logAudit(req.user.id, `LEAVE_${newStatus}`, 'time_off_requests', id, { status: newStatus, comment }, req);

    res.json({
      success: true,
      message: `Time-off request has been ${newStatus.toLowerCase()} successfully`,
      status: newStatus
    });
  } catch (err) {
    console.error('Review timeoff error:', err);
    res.status(500).json({ success: false, message: 'Failed to process time-off review' });
  }
});

module.exports = router;
