const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// 1. Employee Report
router.get('/employees', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { department_id, status } = req.query;

    let sql = `
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
             e.joining_date, e.status, e.gender, e.bank_name, e.bank_account_number,
             d.name as department_name, des.name as designation_name,
             c.wage, c.contract_type, ss.name as salary_structure_name, ws.name as schedule_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
      LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
      LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    sql += ` ORDER BY e.joining_date DESC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Employee report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate employee report' });
  }
});

// 2. Attendance Report
router.get('/attendance', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { start_date, end_date, department_id, status } = req.query;

    let sql = `
      SELECT a.date, a.check_in, a.check_out, a.worked_hours, a.status, a.notes,
             e.employee_code, e.first_name || ' ' || e.last_name as employee_name,
             d.name as department_name
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND a.date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND a.date <= $${params.length}`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.date DESC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report' });
  }
});

// 3. Time-Off Report
router.get('/timeoff', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { start_date, end_date, status, department_id } = req.query;

    let sql = `
      SELECT tor.*, e.employee_code, e.first_name || ' ' || e.last_name as employee_name,
             d.name as department_name, tot.name as leave_type_name, tot.is_paid,
             u.first_name || ' ' || u.last_name as reviewer_name
      FROM time_off_requests tor
      JOIN employees e ON e.id = tor.employee_id
      JOIN time_off_types tot ON tot.id = tor.time_off_type_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = tor.reviewed_by
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND tor.from_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND tor.to_date <= $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND tor.status = $${params.length}`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND e.department_id = $${params.length}`;
    }

    sql += ` ORDER BY tor.from_date DESC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Time-off report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate time-off report' });
  }
});

// 4. Payroll Summary Report
router.get('/payroll-summary', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { year } = req.query;

    let sql = `
      SELECT p.id, p.name, p.period_start, p.period_end, p.status,
             p.employee_count, p.total_gross, p.total_deductions, p.total_net,
             p.paid_at, ss.name as salary_structure_name
      FROM payrolls p
      LEFT JOIN salary_structures ss ON ss.id = p.salary_structure_id
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      params.push(`${year}-01-01`);
      params.push(`${year}-12-31`);
      sql += ` AND p.period_start >= $${params.length - 1} AND p.period_start <= $${params.length}`;
    }

    sql += ` ORDER BY p.period_start DESC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Payroll summary report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate payroll summary' });
  }
});

// 5. Tax and Deductions Report
router.get('/tax-deductions', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { payroll_id } = req.query;

    let sql = `
      SELECT psl.rule_name, psl.rule_code, psl.category,
             COUNT(psl.id) as total_occurrences,
             SUM(psl.amount) as total_amount,
             p.name as payroll_name, p.period_start, p.period_end
      FROM payslip_lines psl
      JOIN payslips ps ON ps.id = psl.payslip_id
      JOIN payrolls p ON p.id = ps.payroll_id
      WHERE psl.category = 'DEDUCTION'
    `;
    const params = [];

    if (payroll_id) {
      params.push(payroll_id);
      sql += ` AND ps.payroll_id = $${params.length}`;
    }

    sql += ` GROUP BY psl.rule_name, psl.rule_code, psl.category, p.name, p.period_start, p.period_end ORDER BY total_amount DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Tax deduction report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate tax report' });
  }
});

// 6. Salary Cost by Department Report
router.get('/department-costs', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const sql = `
      SELECT d.name as department_name, d.code as department_code,
             COUNT(DISTINCT e.id) as total_employees,
             COALESCE(SUM(c.wage), 0) as total_base_wages,
             COALESCE(SUM(ps.gross_salary), 0) as total_gross_disbursed,
             COALESCE(SUM(ps.total_deductions), 0) as total_deductions,
             COALESCE(SUM(ps.net_salary), 0) as total_net_disbursed
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
      LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
      LEFT JOIN payslips ps ON ps.employee_id = e.id AND ps.status = 'PAID'
      GROUP BY d.id, d.name, d.code
      ORDER BY total_base_wages DESC
    `;

    const result = await query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Department costs report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate department cost report' });
  }
});

module.exports = router;
