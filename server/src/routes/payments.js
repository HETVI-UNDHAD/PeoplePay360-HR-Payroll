const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/payments - List all payment disbursements
router.get('/', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { payroll_id, employee_id, start_date, end_date } = req.query;

    let sql = `
      SELECT pay.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             e.bank_name,
             e.bank_account_number,
             p.name as payroll_name,
             p.period_start,
             p.period_end
      FROM payments pay
      JOIN employees e ON e.id = pay.employee_id
      JOIN payrolls p ON p.id = pay.payroll_id
      WHERE 1=1
    `;
    const params = [];

    if (payroll_id) {
      params.push(payroll_id);
      sql += ` AND pay.payroll_id = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      sql += ` AND pay.employee_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      sql += ` AND pay.payment_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND pay.payment_date <= $${params.length}`;
    }

    sql += ` ORDER BY pay.payment_date DESC, pay.created_at DESC`;

    const payments = await query(sql, params);
    res.json({ success: true, payments: payments.rows });
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment records' });
  }
});

module.exports = router;
