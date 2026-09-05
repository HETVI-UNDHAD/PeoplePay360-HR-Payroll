const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/payslips - List payslips
router.get('/', async (req, res) => {
  try {
    const { employee_id, payroll_id, status, year } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    let sql = `
      SELECT ps.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             e.email as employee_email,
             d.name as department_name,
             des.name as designation_name,
             p.name as payroll_name,
             c.contract_type
      FROM payslips ps
      JOIN employees e ON e.id = ps.employee_id
      JOIN payrolls p ON p.id = ps.payroll_id
      JOIN contracts c ON c.id = ps.contract_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      WHERE 1=1
    `;
    const params = [];

    // Security check: Employee and HR Manager can only view own personal payslips
    if (userRole === ROLES.EMPLOYEE || userRole === ROLES.HR_MANAGER) {
      if (!userEmpId) {
        return res.json({ success: true, payslips: [] });
      }
      params.push(userEmpId);
      sql += ` AND ps.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND ps.employee_id = $${params.length}`;
    }

    if (payroll_id) {
      params.push(payroll_id);
      sql += ` AND ps.payroll_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND ps.status = $${params.length}`;
    }

    if (year) {
      params.push(`${year}-01-01`);
      params.push(`${year}-12-31`);
      sql += ` AND ps.period_start >= $${params.length - 1} AND ps.period_start <= $${params.length}`;
    }

    sql += ` ORDER BY ps.period_start DESC, ps.created_at DESC`;

    const payslips = await query(sql, params);
    res.json({ success: true, payslips: payslips.rows });
  } catch (err) {
    console.error('Fetch payslips error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
});

// GET /api/payslips/:id - Get full payslip with lines and company details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    const psRes = await query(
      `SELECT ps.*, 
              e.first_name || ' ' || e.last_name as employee_name,
              e.employee_code,
              e.email as employee_email,
              e.phone as employee_phone,
              e.joining_date,
              e.bank_name,
              e.bank_account_number,
              e.bank_ifsc_swift,
              e.tax_identifier,
              d.name as department_name,
              des.name as designation_name,
              p.name as payroll_name,
              c.contract_type,
              c.wage as base_wage,
              ss.name as salary_structure_name
       FROM payslips ps
       JOIN employees e ON e.id = ps.employee_id
       JOIN payrolls p ON p.id = ps.payroll_id
       JOIN contracts c ON c.id = ps.contract_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
       WHERE ps.id = $1`,
      [id]
    );

    if (psRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const payslip = psRes.rows[0];

    // Security check: Employee and HR Manager can only view own payslip
    if ((userRole === ROLES.EMPLOYEE || userRole === ROLES.HR_MANAGER) && payslip.employee_id !== userEmpId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own payslips.' });
    }

    // Fetch lines ordered by sequence
    const linesRes = await query(
      `SELECT * FROM payslip_lines WHERE payslip_id = $1 ORDER BY sequence ASC`,
      [id]
    );

    // Fetch company info
    const compRes = await query('SELECT * FROM companies LIMIT 1');

    res.json({
      success: true,
      payslip,
      lines: linesRes.rows,
      company: compRes.rows[0] || {
        name: 'PeoplePay360 Global Technologies Inc.',
        address: '100 Enterprise Way, Suite 400, San Francisco, CA 94105',
        currency_symbol: '$',
        email: 'payroll@peoplepay360.com'
      }
    });
  } catch (err) {
    console.error('Fetch payslip details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payslip details' });
  }
});

module.exports = router;
