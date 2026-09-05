const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { computeSalary } = require('../engine/salaryEngine');

router.use(authenticate);

// GET /api/payroll/payruns - List all pay runs
router.get('/payruns', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { status, year } = req.query;

    let sql = `
      SELECT p.*, 
             ss.name as salary_structure_name,
             u1.first_name || ' ' || u1.last_name as creator_name,
             u2.first_name || ' ' || u2.last_name as validator_name
      FROM payrolls p
      LEFT JOIN salary_structures ss ON ss.id = p.salary_structure_id
      LEFT JOIN users u1 ON u1.id = p.created_by
      LEFT JOIN users u2 ON u2.id = p.validated_by
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (year) {
      params.push(`${year}-01-01`);
      params.push(`${year}-12-31`);
      sql += ` AND p.period_start >= $${params.length - 1} AND p.period_start <= $${params.length}`;
    }

    sql += ` ORDER BY p.period_start DESC, p.created_at DESC`;

    const payruns = await query(sql, params);
    res.json({ success: true, payruns: payruns.rows });
  } catch (err) {
    console.error('Fetch payruns error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pay runs' });
  }
});

// GET /api/payroll/payruns/:id - Get Pay Run details with selected employees and payslips
router.get('/payruns/:id', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;

    const prRes = await query(
      `SELECT p.*, ss.name as salary_structure_name,
              u1.first_name || ' ' || u1.last_name as creator_name,
              u2.first_name || ' ' || u2.last_name as validator_name
       FROM payrolls p
       LEFT JOIN salary_structures ss ON ss.id = p.salary_structure_id
       LEFT JOIN users u1 ON u1.id = p.created_by
       LEFT JOIN users u2 ON u2.id = p.validated_by
       WHERE p.id = $1`,
      [id]
    );

    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];

    // Selected Employees with active contract info and payslip (if computed)
    const empRes = await query(
      `SELECT pe.*, 
              e.first_name || ' ' || e.last_name as employee_name,
              e.employee_code,
              e.email as employee_email,
              e.profile_image,
              d.name as department_name,
              des.name as designation_name,
              c.wage as contract_wage,
              c.contract_type,
              ps.id as payslip_id,
              ps.payslip_number,
              ps.gross_salary,
              ps.total_deductions,
              ps.net_salary,
              ps.status as payslip_status,
              ps.working_days,
              ps.present_days,
              ps.unpaid_leave_days
       FROM payroll_employees pe
       JOIN employees e ON e.id = pe.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       LEFT JOIN contracts c ON c.id = pe.contract_id
       LEFT JOIN payslips ps ON ps.payroll_id = pe.payroll_id AND ps.employee_id = pe.employee_id
       WHERE pe.payroll_id = $1
       ORDER BY e.first_name ASC`,
      [id]
    );

    // Payments if marked PAID
    const paymentsRes = await query(
      `SELECT pay.*, e.first_name || ' ' || e.last_name as employee_name, e.employee_code
       FROM payments pay
       JOIN employees e ON e.id = pay.employee_id
       WHERE pay.payroll_id = $1`,
      [id]
    );

    res.json({
      success: true,
      payrun,
      employees: empRes.rows,
      payments: paymentsRes.rows
    });
  } catch (err) {
    console.error('Fetch payrun details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pay run details' });
  }
});

// POST /api/payroll/payruns - Create New Pay Run with Selected Employees
router.post('/payruns', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { name, period_start, period_end, salary_structure_id, employee_ids, notes } = req.body;

    if (!name || !period_start || !period_end || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, period start, period end, and at least one selected employee are required.'
      });
    }

    // Validate no duplicate active pay run for identical employees and period
    const duplicateCheck = await query(
      `SELECT pe.employee_id, e.first_name || ' ' || e.last_name as employee_name
       FROM payroll_employees pe
       JOIN payrolls p ON p.id = pe.payroll_id
       JOIN employees e ON e.id = pe.employee_id
       WHERE p.period_start = $1 AND p.period_end = $2 AND pe.employee_id = ANY($3) AND p.status != 'CANCELLED'`,
      [period_start, period_end, employee_ids]
    );

    if (duplicateCheck.rows.length > 0) {
      const dupNames = duplicateCheck.rows.map(r => r.employee_name).join(', ');
      return res.status(400).json({
        success: false,
        message: `Duplicate payroll detected! The following employees already belong to a pay run for period ${period_start} to ${period_end}: ${dupNames}`
      });
    }

    const payrunId = uuidv4();

    // Create Pay Run in DRAFT state
    await query(
      `INSERT INTO payrolls (
        id, name, period_start, period_end, salary_structure_id,
        status, employee_count, created_by, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [payrunId, name.trim(), period_start, period_end, salary_structure_id || null, employee_ids.length, req.user.id, notes || null]
    );

    // Link explicitly selected employees and find their applicable contract
    for (const empId of employee_ids) {
      const contractRes = await query(
        `SELECT id FROM contracts 
         WHERE employee_id = $1 AND status = 'ACTIVE' 
           AND contract_start_date <= $2 
           AND (contract_end_date IS NULL OR contract_end_date >= $3)
         ORDER BY contract_start_date DESC LIMIT 1`,
        [empId, period_end, period_start]
      );

      const contractId = contractRes.rows.length > 0 ? contractRes.rows[0].id : null;

      await query(
        `INSERT INTO payroll_employees (id, payroll_id, employee_id, contract_id, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [uuidv4(), payrunId, empId, contractId]
      );
    }

    await logAudit(req.user.id, 'CREATE_PAYRUN', 'payrolls', payrunId, { name, period_start, period_end, employee_count: employee_ids.length }, req);

    res.status(201).json({
      success: true,
      message: `Pay run "${name}" created with ${employee_ids.length} selected employees (State: DRAFT)`,
      payrunId
    });
  } catch (err) {
    console.error('Create payrun error:', err);
    res.status(500).json({ success: false, message: 'Failed to create pay run' });
  }
});

// PUT /api/payroll/payruns/:id - Update Pay Run (ADMIN, PAYROLL_ADMIN, PAYROLL_USER)
router.put('/payruns/:id', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, period_start, period_end, notes } = req.body;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    if (payrun.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Cannot update a pay run that has already been PAID' });
    }

    await query(
      `UPDATE payrolls SET
        name = COALESCE($1, name),
        period_start = COALESCE($2, period_start),
        period_end = COALESCE($3, period_end),
        notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name || null, period_start || null, period_end || null, notes || null, id]
    );

    await logAudit(req.user.id, 'UPDATE_PAYROLL', 'payrolls', id, { name }, req);
    res.json({ success: true, message: 'Pay run updated successfully' });
  } catch (err) {
    console.error('Update payrun error:', err);
    res.status(500).json({ success: false, message: 'Failed to update pay run' });
  }
});

// POST /api/payroll/payruns/:id/compute - Compute Payroll Engine
router.post('/payruns/:id/compute', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];

    if (payrun.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Cannot re-compute a payroll that has already been PAID.' });
    }

    // Fetch all selected employees for this pay run
    const selectedEmployees = await query(
      `SELECT pe.*, e.first_name, e.last_name, e.employee_code
       FROM payroll_employees pe
       JOIN employees e ON e.id = pe.employee_id
       WHERE pe.payroll_id = $1`,
      [id]
    );

    if (selectedEmployees.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No employees assigned to this pay run.' });
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    // Delete existing payslips for this pay run if re-computing
    await query('DELETE FROM payslips WHERE payroll_id = $1', [id]);

    for (const item of selectedEmployees.rows) {
      const empId = item.employee_id;

      // 1. Find contract applicable to period
      const contractRes = await query(
        `SELECT c.*, ss.id as structure_id
         FROM contracts c
         JOIN salary_structures ss ON ss.id = c.salary_structure_id
         WHERE c.employee_id = $1 AND c.status = 'ACTIVE'
           AND c.contract_start_date <= $2 
           AND (c.contract_end_date IS NULL OR c.contract_end_date >= $3)
         ORDER BY c.contract_start_date DESC LIMIT 1`,
        [empId, payrun.period_end, payrun.period_start]
      );

      if (contractRes.rows.length === 0) {
        throw new Error(`Employee ${item.first_name} ${item.last_name} (${item.employee_code}) has no active contract for period ${payrun.period_start} to ${payrun.period_end}`);
      }

      const contract = contractRes.rows[0];
      const structureId = payrun.salary_structure_id || contract.structure_id;

      // 2. Fetch salary rules for structure
      const rulesRes = await query(
        `SELECT * FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE ORDER BY sequence ASC`,
        [structureId]
      );

      if (rulesRes.rows.length === 0) {
        throw new Error(`Salary structure has no active rules defined.`);
      }

      // 3. Read attendance & time-off during period
      const attRes = await query(
        `SELECT 
          COUNT(*) as total_logged_days,
          COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days
         FROM attendance 
         WHERE employee_id = $1 AND date >= $2 AND date <= $3`,
        [empId, payrun.period_start, payrun.period_end]
      );

      const leaveRes = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN tot.is_paid = TRUE THEN tor.total_days ELSE 0 END), 0) as paid_leave_days,
          COALESCE(SUM(CASE WHEN tot.is_paid = FALSE THEN tor.total_days ELSE 0 END), 0) as unpaid_leave_days
         FROM time_off_requests tor
         JOIN time_off_types tot ON tot.id = tor.time_off_type_id
         WHERE tor.employee_id = $1 AND tor.status = 'APPROVED'
           AND tor.from_date >= $2 AND tor.to_date <= $3`,
        [empId, payrun.period_start, payrun.period_end]
      );

      const workingDays = 22; // Standard monthly working days baseline
      const rawPresent = parseFloat(attRes.rows[0]?.present_days || 0) + (parseFloat(attRes.rows[0]?.half_days || 0) * 0.5);
      const paidLeave = parseFloat(leaveRes.rows[0]?.paid_leave_days || 0);
      const unpaidLeave = parseFloat(leaveRes.rows[0]?.unpaid_leave_days || 0);
      const presentDays = rawPresent > 0 ? rawPresent : Math.max(0, workingDays - unpaidLeave);

      // 4. Compute via Salary Rule Engine
      const calculation = computeSalary(contract, rulesRes.rows, {
        workingDays,
        presentDays,
        paidLeaveDays: paidLeave,
        unpaidLeaveDays: unpaidLeave
      });

      // 5. Generate Payslip
      const payslipId = uuidv4();
      const periodStartStr = payrun.period_start instanceof Date ? payrun.period_start.toISOString().split('T')[0] : String(payrun.period_start);
      const periodEndStr = payrun.period_end instanceof Date ? payrun.period_end.toISOString().split('T')[0] : String(payrun.period_end);
      const payslipNum = `PAY-${periodStartStr.substring(0, 7).replace('-', '')}-${(item.employee_code || '').replace('EMP-', '')}`;

      await query(
        `INSERT INTO payslips (
          id, payroll_id, employee_id, contract_id, payslip_number,
          period_start, period_end, working_days, present_days,
          paid_leave_days, unpaid_leave_days, wage, gross_salary,
          total_deductions, net_salary, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'COMPUTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          payslipId, id, empId, contract.id, payslipNum,
          periodStartStr, periodEndStr, calculation.workingDays,
          calculation.presentDays, calculation.paidLeaveDays, calculation.unpaidLeaveDays,
          calculation.wage, calculation.grossSalary, calculation.totalDeductions,
          calculation.netSalary
        ]
      );

      // 6. Insert itemized payslip lines
      for (const line of calculation.lines) {
        await query(
          `INSERT INTO payslip_lines (
            id, payslip_id, salary_rule_id, rule_code, rule_name,
            category, sequence, computation_type, rate, amount, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          [
            uuidv4(), payslipId, line.salaryRuleId, line.ruleCode,
            line.ruleName, line.category, line.sequence, line.computationType,
            line.rate, line.amount
          ]
        );
      }

      totalGross += calculation.grossSalary;
      totalDeductions += calculation.totalDeductions;
      totalNet += calculation.netSalary;
    }

    // Update Pay Run status to COMPUTED
    await query(
      `UPDATE payrolls SET
        status = 'COMPUTED',
        total_gross = $1,
        total_deductions = $2,
        total_net = $3,
        employee_count = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [totalGross, totalDeductions, totalNet, selectedEmployees.rows.length, id]
    );

    await logAudit(req.user.id, 'COMPUTE_PAYROLL', 'payrolls', id, { totalGross, totalDeductions, totalNet, employeeCount: selectedEmployees.rows.length }, req);

    res.json({
      success: true,
      message: `Payroll computed successfully for ${selectedEmployees.rows.length} employee(s). State is now COMPUTED.`,
      summary: { totalGross, totalDeductions, totalNet }
    });
  } catch (err) {
    console.error('Compute payroll error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to compute payroll' });
  }
});

// POST /api/payroll/payruns/:id/validate - Validate Pay Run
router.post('/payruns/:id/validate', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    if (payrun.status !== 'COMPUTED') {
      return res.status(400).json({ success: false, message: `Only COMPUTED payrolls can be validated. Current status is ${payrun.status}` });
    }

    await query(
      `UPDATE payrolls SET status = 'VALIDATED', validated_by = $1, validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [req.user.id, id]
    );

    await query(`UPDATE payslips SET status = 'VALIDATED', updated_at = CURRENT_TIMESTAMP WHERE payroll_id = $1`, [id]);

    await logAudit(req.user.id, 'VALIDATE_PAYROLL', 'payrolls', id, { totalNet: payrun.total_net }, req);

    res.json({
      success: true,
      message: 'Pay run validated successfully. Ready for disbursement and payment.'
    });
  } catch (err) {
    console.error('Validate payroll error:', err);
    res.status(500).json({ success: false, message: 'Failed to validate payroll' });
  }
});

// POST /api/payroll/payruns/:id/mark-paid - Mark Payroll as PAID and Record Payments
router.post('/payruns/:id/mark-paid', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, reference, notes } = req.body;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    if (payrun.status !== 'VALIDATED') {
      return res.status(400).json({ success: false, message: `Only VALIDATED payrolls can be marked as PAID. Current status is ${payrun.status}` });
    }

    // Fetch all payslips for this pay run
    const payslips = await query('SELECT * FROM payslips WHERE payroll_id = $1', [id]);

    const todayStr = new Date().toISOString().split('T')[0];
    const txnRefBase = reference || `ACH-${Date.now()}`;

    // Record individual payment for each employee
    for (let i = 0; i < payslips.rows.length; i++) {
      const ps = payslips.rows[i];
      const txnRef = `${txnRefBase}-${i + 1}`;

      await query(
        `INSERT INTO payments (id, payroll_id, employee_id, amount, payment_date, payment_method, reference, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETED', $8, CURRENT_TIMESTAMP)`,
        [uuidv4(), id, ps.employee_id, ps.net_salary, todayStr, payment_method || 'BANK_TRANSFER', txnRef, notes || 'Salary disbursement']
      );
    }

    // Update Payslips to PAID
    await query(`UPDATE payslips SET status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE payroll_id = $1`, [id]);

    // Update Pay run to PAID
    await query(
      `UPDATE payrolls SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await logAudit(req.user.id, 'PAYROLL_PAID', 'payrolls', id, { totalNet: payrun.total_net, payment_method, count: payslips.rows.length }, req);

    res.json({
      success: true,
      message: `Payroll marked as PAID! ${payslips.rows.length} payment transaction records generated.`
    });
  } catch (err) {
    console.error('Mark paid error:', err);
    res.status(500).json({ success: false, message: 'Failed to record payroll payment' });
  }
});

module.exports = router;
