const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// 1. Employee Report (Real-time workforce roster)
router.get('/employees', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { department_id, status } = req.query;

    let sql = `
      SELECT e.employee_code as "Employee Code",
             e.first_name || ' ' || e.last_name as "Full Name",
             e.email as "Work Email",
             e.phone as "Phone Number",
             d.name as "Department",
             des.name as "Designation",
             e.status as "Employee Status",
             c.contract_type as "Contract Type",
             COALESCE(c.wage, 0) as "Monthly Base Wage",
             ss.name as "Salary Structure",
             ws.name as "Working Schedule",
             COALESCE(e.bank_name, 'Not Set') as "Bank Name",
             COALESCE(e.bank_account_number, 'Missing') as "Account Number",
             TO_CHAR(e.joining_date, 'Mon DD, YYYY') as "Joining Date"
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

// 2. Attendance Report (Real-time punch audit)
router.get('/attendance', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { start_date, end_date, department_id, status } = req.query;

    let sql = `
      SELECT TO_CHAR(a.date, 'Mon DD, YYYY') as "Date",
             e.employee_code as "Employee Code",
             e.first_name || ' ' || e.last_name as "Employee Name",
             d.name as "Department",
             a.status as "Attendance Status",
             TO_CHAR(a.check_in, 'HH12:MI AM') as "Check In",
             TO_CHAR(a.check_out, 'HH12:MI AM') as "Check Out",
             COALESCE(a.worked_hours, 0) as "Hours Worked",
             COALESCE(a.notes, '—') as "Audit Notes"
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

// 3. Time-Off Report (Real-time leave utilization)
router.get('/timeoff', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { start_date, end_date, status, department_id } = req.query;

    let sql = `
      SELECT e.employee_code as "Employee Code",
             e.first_name || ' ' || e.last_name as "Employee Name",
             d.name as "Department",
             tot.name as "Leave Type",
             CASE WHEN tot.is_paid THEN 'Paid' ELSE 'Unpaid' END as "Policy Type",
             TO_CHAR(tor.from_date, 'Mon DD, YYYY') as "Start Date",
             TO_CHAR(tor.to_date, 'Mon DD, YYYY') as "End Date",
             tor.total_days as "Duration (Days)",
             tor.status as "Approval Status",
             COALESCE(tor.reason, '—') as "Reason",
             COALESCE(u.first_name || ' ' || u.last_name, 'Pending Review') as "Approved / Reviewed By"
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

// 4. Payroll Summary Report (Real-time pay runs ledger)
router.get('/payroll-summary', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { year } = req.query;

    let sql = `
      SELECT p.name as "Pay Run Name",
             TO_CHAR(p.period_start, 'Mon DD, YYYY') as "Period Start",
             TO_CHAR(p.period_end, 'Mon DD, YYYY') as "Period End",
             p.status as "Batch Status",
             COALESCE(p.employee_count, 0) as "Employees Included",
             COALESCE(p.total_gross, 0) as "Total Gross Payout",
             COALESCE(p.total_deductions, 0) as "Total Deductions",
             COALESCE(p.total_net, 0) as "Total Net Disbursed",
             COALESCE(ss.name, 'Default Structure') as "Salary Structure",
             CASE WHEN p.paid_at IS NOT NULL THEN TO_CHAR(p.paid_at, 'Mon DD, YYYY HH12:MI AM') ELSE 'Unpaid' END as "Disbursement Timestamp"
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

// 5. Tax and Deductions Report (Real-time statutory breakdown)
router.get('/tax-deductions', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { payroll_id } = req.query;

    let sql = `
      SELECT psl.rule_name as "Deduction Component",
             psl.rule_code as "Rule Code",
             ps.payslip_number as "Payslip Number",
             e.employee_code as "Employee Code",
             e.first_name || ' ' || e.last_name as "Employee Name",
             p.name as "Payroll Batch",
             COALESCE(psl.amount, 0) as "Deduction Amount",
             TO_CHAR(p.period_start, 'Mon YYYY') as "Payroll Month"
      FROM payslip_lines psl
      JOIN payslips ps ON ps.id = psl.payslip_id
      JOIN payrolls p ON p.id = ps.payroll_id
      JOIN employees e ON e.id = ps.employee_id
      WHERE psl.category = 'DEDUCTION'
    `;
    const params = [];

    if (payroll_id) {
      params.push(payroll_id);
      sql += ` AND ps.payroll_id = $${params.length}`;
    }

    sql += ` ORDER BY psl.amount DESC`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Tax deduction report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate tax report' });
  }
});

// 6. Salary Cost by Department Report (Real-time department expenditure audit)
router.get('/department-costs', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const sql = `
      SELECT d.name as "Department Name",
             d.code as "Department Code",
             COUNT(DISTINCT e.id) as "Active Headcount",
             COALESCE(SUM(c.wage), 0) as "Total Base Contract Wages",
             COALESCE(SUM(ps.gross_salary), 0) as "Gross Salary Disbursed",
             COALESCE(SUM(ps.total_deductions), 0) as "Total Deductions",
             COALESCE(SUM(ps.net_salary), 0) as "Net Salary Disbursed"
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
      LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
      LEFT JOIN payslips ps ON ps.employee_id = e.id AND ps.status = 'PAID'
      GROUP BY d.id, d.name, d.code
      ORDER BY "Total Base Contract Wages" DESC
    `;

    const result = await query(sql);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Department costs report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate department cost report' });
  }
});

module.exports = router;
