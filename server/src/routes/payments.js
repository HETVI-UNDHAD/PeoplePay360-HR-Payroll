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
             d.name as department_name,
             des.name as designation_name,
             p.name as payroll_name,
             p.period_start,
             p.period_end
      FROM payments pay
      JOIN employees e ON e.id = pay.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
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

// GET /api/payments/:id - Get full single payment details including employee, contract, payroll, and calculation breakdown
router.get('/:id', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT pay.*,
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             e.email,
             e.status as employee_status,
             e.bank_name,
             e.bank_account_number,
             e.bank_ifsc_swift,
             e.tax_identifier,
             d.name as department_name,
             des.name as designation_name,
             p.name as payroll_name,
             p.period_start as payrun_period_start,
             p.period_end as payrun_period_end,
             p.status as payroll_status,
             ps.id as payslip_id,
             ps.payslip_number,
             ps.wage as payslip_base_wage,
             ps.gross_salary,
             ps.total_deductions,
             ps.net_salary,
             ps.working_days,
             ps.present_days,
             ps.paid_leave_days,
             ps.unpaid_leave_days,
             c.contract_type,
             c.wage as contract_wage,
             c.contract_start_date,
             c.contract_end_date,
             c.status as contract_status,
             ss.name as salary_structure_name
      FROM payments pay
      JOIN employees e ON e.id = pay.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      JOIN payrolls p ON p.id = pay.payroll_id
      LEFT JOIN payslips ps ON ps.payroll_id = pay.payroll_id AND ps.employee_id = pay.employee_id
      LEFT JOIN contracts c ON c.id = ps.contract_id
      LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
      WHERE pay.id = $1
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const payment = result.rows[0];

    // Fetch payslip calculation breakdown lines if available
    let lines = [];
    if (payment.payslip_id) {
      const linesRes = await query(
        `SELECT * FROM payslip_lines WHERE payslip_id = $1 ORDER BY sequence ASC, category ASC`,
        [payment.payslip_id]
      );
      lines = linesRes.rows;
    }

    res.json({
      success: true,
      payment: {
        ...payment,
        payslip_lines: lines
      }
    });
  } catch (err) {
    console.error('Fetch payment detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment details' });
  }
});

module.exports = router;
