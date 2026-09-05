const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { computeSalary } = require('../engine/salaryEngine');

router.use(authenticate);

// ==============================================================================
// HELPERS
// ==============================================================================

/**
 * Standardize pay run status for display and logic
 * Canonical lifecycle: DRAFT -> COMPUTING -> REVIEW -> FINALIZED -> PAID
 */
function normalizeStatus(status) {
  if (!status) return 'DRAFT';
  const s = String(status).toUpperCase();
  if (s === 'COMPUTED') return 'REVIEW';
  if (s === 'VALIDATED') return 'FINALIZED';
  return s;
}

function toISODateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return String(val).split('T')[0];
}

/**
 * Calculate scheduled working days between two ISO date strings (inclusive)
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @param {Array<string>} workingDaysList - e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
 */
function calculateWorkingDays(startDateStr, endDateStr, workingDaysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
  if (!startDateStr || !endDateStr) return 22;

  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 22;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const allowedDays = new Set(
    workingDaysList && workingDaysList.length > 0
      ? workingDaysList.map(d => d.trim().toLowerCase())
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  );

  let workingDays = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayName = dayNames[curr.getUTCDay()].toLowerCase();
    if (allowedDays.has(dayName)) {
      workingDays++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return Math.max(1, workingDays);
}

/**
 * Perform comprehensive pre-finalization validation checks
 * Returns { blockingErrors: string[], warnings: string[], canFinalize: boolean }
 */
async function validatePayRunReadiness(payrunId) {
  const blockingErrors = [];
  const warnings = [];

  const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [payrunId]);
  if (prRes.rows.length === 0) {
    return { blockingErrors: ['Pay run not found.'], warnings: [], canFinalize: false };
  }

  const payrun = prRes.rows[0];
  const normStatus = normalizeStatus(payrun.status);

  // If already FINALIZED or PAID, payroll is locked and already finalized; no blocking errors
  if (normStatus === 'FINALIZED' || normStatus === 'PAID') {
    return {
      blockingErrors: [],
      warnings: [],
      canFinalize: false,
      isLocked: true
    };
  }

  // Check 1: Must be in REVIEW state
  if (normStatus === 'DRAFT') {
    blockingErrors.push('Pay run has not been computed yet. You must compute payroll before it can be finalized.');
  } else if (normStatus !== 'REVIEW') {
    blockingErrors.push(`Pay run must be in REVIEW status (currently ${normStatus}). You must compute payroll first.`);
  }

  // Check 2: At least 1 employee assigned
  const empRes = await query(
    `SELECT pe.*, e.id as emp_id, e.first_name, e.last_name, e.employee_code,
            e.bank_account_number, e.tax_identifier, e.status as employee_status,
            c.id as contract_id, c.wage, c.salary_structure_id as contract_struct_id,
            ps.id as payslip_id, ps.gross_salary, ps.total_deductions, ps.net_salary,
            ps.working_days, ps.present_days, ps.paid_leave_days, ps.unpaid_leave_days
     FROM payroll_employees pe
     JOIN employees e ON e.id = pe.employee_id
     LEFT JOIN contracts c ON c.id = pe.contract_id
     LEFT JOIN payslips ps ON ps.payroll_id = pe.payroll_id AND ps.employee_id = pe.employee_id
     WHERE pe.payroll_id = $1`,
    [payrunId]
  );

  if (empRes.rows.length === 0) {
    blockingErrors.push('Pay run has zero employees assigned. At least one eligible employee is required.');
    return { blockingErrors, warnings, canFinalize: false };
  }

  // Check each assigned employee
  for (const row of empRes.rows) {
    const empLabel = `${row.first_name || 'Unknown'} ${row.last_name || ''} (${row.employee_code || row.emp_id})`;

    // Contract check
    if (!row.contract_id) {
      // Try to see if an active contract exists covering the period
      const activeContract = await query(
        `SELECT id, salary_structure_id FROM contracts
         WHERE employee_id = $1 AND status = 'ACTIVE'
           AND contract_start_date <= $2
           AND (contract_end_date IS NULL OR contract_end_date >= $3)
         ORDER BY contract_start_date DESC LIMIT 1`,
        [row.emp_id, payrun.period_end, payrun.period_start]
      );

      if (activeContract.rows.length === 0) {
        blockingErrors.push(`${empLabel}: Missing active employment contract covering pay period ${toISODateString(payrun.period_start)} to ${toISODateString(payrun.period_end)}.`);
        continue;
      }
    }

    // Salary Structure Check
    const structureId = payrun.salary_structure_id || row.contract_struct_id;
    if (!structureId) {
      blockingErrors.push(`${empLabel}: No salary structure linked to contract or pay run.`);
      continue;
    }

    // Rules check
    const rulesRes = await query(
      `SELECT COUNT(*) as count FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE`,
      [structureId]
    );
    if (parseInt(rulesRes.rows[0]?.count || 0, 10) === 0) {
      blockingErrors.push(`${empLabel}: Salary structure has no active rules defined.`);
    }

    // Payslip check
    if (!row.payslip_id) {
      blockingErrors.push(`${empLabel}: Payroll has not been computed yet.`);
    } else {
      const netSalary = parseFloat(row.net_salary || 0);
      if (isNaN(netSalary) || netSalary < 0) {
        blockingErrors.push(`${empLabel}: Invalid or negative net salary ($${netSalary.toFixed(2)}). Deductions exceed gross earnings.`);
      } else if (netSalary === 0) {
        warnings.push(`${empLabel}: Net salary computed to $0.00.`);
      }
    }

    // Warnings: Missing master details
    if (!row.bank_account_number) {
      warnings.push(`${empLabel}: Missing bank account number for direct disbursement.`);
    }
    if (!row.tax_identifier) {
      warnings.push(`${empLabel}: Missing tax identification number.`);
    }
  }

  // Duplicate Check across other non-cancelled pay runs
  const dupCheck = await query(
    `SELECT e.first_name || ' ' || e.last_name as emp_name, e.employee_code, p.name as other_run_name
     FROM payroll_employees pe
     JOIN payrolls p ON p.id = pe.payroll_id
     JOIN employees e ON e.id = pe.employee_id
     WHERE pe.employee_id = ANY($1)
       AND p.id != $2
       AND p.period_start = $3 AND p.period_end = $4
       AND p.status NOT IN ('CANCELLED', 'DRAFT')`,
    [empRes.rows.map(r => r.emp_id), payrunId, payrun.period_start, payrun.period_end]
  );

  if (dupCheck.rows.length > 0) {
    for (const dup of dupCheck.rows) {
      blockingErrors.push(`${dup.emp_name} (${dup.employee_code}): Already processed in finalized pay run "${dup.other_run_name}" for this period.`);
    }
  }

  return {
    blockingErrors,
    warnings,
    canFinalize: blockingErrors.length === 0
  };
}

// ==============================================================================
// ROUTES
// ==============================================================================

// GET /api/payroll/eligibility - Dynamic payroll eligibility check for all active employees for given period
router.get('/eligibility', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { period_start, period_end } = req.query;

    if (!period_start || !period_end) {
      return res.status(400).json({ success: false, message: 'period_start and period_end query parameters are required.' });
    }

    const pStartStr = toISODateString(period_start);
    const pEndStr = toISODateString(period_end);

    // Fetch all active employees from the employee database
    const empRes = await query(
      `SELECT e.*, d.name as department_name, des.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       WHERE e.status = 'ACTIVE'
       ORDER BY e.first_name ASC, e.last_name ASC`
    );

    const eligibleEmployees = [];
    const ineligibleEmployees = [];

    for (const emp of empRes.rows) {
      const empId = emp.id;
      const blockingReasons = [];
      const warnings = [];

      // 1. Period-specific contract lookup (strictly matching the pay period!)
      // Must cover period_start to period_end:
      // contract_start_date <= period_end AND (contract_end_date IS NULL OR contract_end_date >= period_start)
      const contractRes = await query(
        `SELECT c.*, ss.name as salary_structure_name, ss.code as salary_structure_code
         FROM contracts c
         LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
         WHERE c.employee_id = $1 AND c.status = 'ACTIVE'
           AND c.contract_start_date <= $2
           AND (c.contract_end_date IS NULL OR c.contract_end_date >= $3)
         ORDER BY c.contract_start_date DESC LIMIT 1`,
        [empId, pEndStr, pStartStr]
      );

      let matchedContract = null;

      if (contractRes.rows.length === 0) {
        blockingReasons.push('No valid contract found for selected payroll period.');
      } else {
        matchedContract = contractRes.rows[0];
        const wage = parseFloat(matchedContract.wage);
        if (isNaN(wage) || wage <= 0) {
          blockingReasons.push('Contract salary is missing or zero.');
        }

        if (!matchedContract.salary_structure_id) {
          blockingReasons.push('No salary structure assigned to contract.');
        } else {
          // Check active rules count
          const rulesRes = await query(
            `SELECT COUNT(*) as count FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE`,
            [matchedContract.salary_structure_id]
          );
          if (parseInt(rulesRes.rows[0]?.count || 0, 10) === 0) {
            blockingReasons.push(`Salary structure "${matchedContract.salary_structure_name || ''}" has no active rules defined.`);
          }
        }
      }

      // 2. Check duplicate payslips for this employee + pay period
      const dupRes = await query(
        `SELECT ps.id, p.name as payroll_name, p.status as payroll_status
         FROM payslips ps
         JOIN payrolls p ON p.id = ps.payroll_id
         WHERE ps.employee_id = $1
           AND p.period_start = $2 AND p.period_end = $3
           AND p.status != 'CANCELLED'
         LIMIT 1`,
        [empId, pStartStr, pEndStr]
      );

      if (dupRes.rows.length > 0) {
        blockingReasons.push(`Payslip already exists for this period in pay run "${dupRes.rows[0].payroll_name}".`);
      }

      // 3. Bank Account Validation (Warning prior to finalization/disbursement)
      if (!emp.bank_account_number || !emp.bank_name) {
        warnings.push('Missing bank account details (A/C missing).');
      }
      if (!emp.tax_identifier) {
        warnings.push('Missing tax identification number.');
      }

      const isReady = blockingReasons.length === 0;

      const employeeStatusObj = {
        id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        department_name: emp.department_name,
        designation_name: emp.designation_name,
        contract_wage: matchedContract ? parseFloat(matchedContract.wage || 0) : 0,
        structure_name: matchedContract ? matchedContract.salary_structure_name : null,
        contract_type: matchedContract ? matchedContract.contract_type : null,
        contract: matchedContract ? {
          id: matchedContract.id,
          wage: parseFloat(matchedContract.wage || 0),
          contract_type: matchedContract.contract_type,
          contract_start_date: matchedContract.contract_start_date,
          contract_end_date: matchedContract.contract_end_date,
          salary_structure_name: matchedContract.salary_structure_name,
          salary_structure_id: matchedContract.salary_structure_id
        } : null,
        is_payroll_ready: isReady,
        blocking_reason: blockingReasons.join(' • '),
        blocking_reasons: blockingReasons,
        warnings: warnings
      };

      if (isReady) {
        eligibleEmployees.push(employeeStatusObj);
      } else {
        ineligibleEmployees.push(employeeStatusObj);
      }
    }

    res.json({
      success: true,
      period_start: pStartStr,
      period_end: pEndStr,
      total_active_employees: empRes.rows.length,
      eligible_count: eligibleEmployees.length,
      ineligible_count: ineligibleEmployees.length,
      eligible: eligibleEmployees,
      ineligible: ineligibleEmployees,
      all: [...eligibleEmployees, ...ineligibleEmployees]
    });
  } catch (err) {
    console.error('Check payroll eligibility error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify payroll eligibility: ' + err.message });
  }
});

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
      const normQuery = normalizeStatus(status);
      params.push(normQuery);
      // Support matching legacy or normalized status
      if (normQuery === 'REVIEW') {
        sql += ` AND (p.status = 'REVIEW' OR p.status = 'COMPUTED')`;
      } else if (normQuery === 'FINALIZED') {
        sql += ` AND (p.status = 'FINALIZED' OR p.status = 'VALIDATED')`;
      } else {
        sql += ` AND p.status = $${params.length}`;
      }
    }

    if (year) {
      params.push(`${year}-01-01`);
      params.push(`${year}-12-31`);
      sql += ` AND p.period_start >= $${params.length - 1} AND p.period_start <= $${params.length}`;
    }

    sql += ` ORDER BY p.period_start DESC, p.created_at DESC`;

    const payruns = await query(sql, params);
    
    // Normalize status in output
    const formatted = payruns.rows.map(pr => ({
      ...pr,
      normalized_status: normalizeStatus(pr.status),
      display_status: normalizeStatus(pr.status)
    }));

    res.json({ success: true, payruns: formatted });
  } catch (err) {
    console.error('Fetch payruns error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pay runs' });
  }
});

// GET /api/payroll/payruns/:id - Get Pay Run details with selected employees, payslips, and validation
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

    const payrun = {
      ...prRes.rows[0],
      normalized_status: normalizeStatus(prRes.rows[0].status),
      display_status: normalizeStatus(prRes.rows[0].status)
    };

    // Selected Employees with active contract info and payslip
    const empRes = await query(
      `SELECT pe.*, 
              e.first_name || ' ' || e.last_name as employee_name,
              e.first_name,
              e.last_name,
              e.employee_code,
              e.email as employee_email,
              e.profile_image,
              e.bank_name,
              e.bank_account_number,
              e.bank_ifsc_swift,
              e.tax_identifier,
              d.name as department_name,
              des.name as designation_name,
              c.wage as contract_wage,
              c.contract_type,
              c.salary_structure_id as employee_salary_structure_id,
              ss.name as employee_structure_name,
              ps.id as payslip_id,
              ps.payslip_number,
              ps.gross_salary,
              ps.total_deductions,
              ps.net_salary,
              ps.status as payslip_status,
              ps.working_days,
              ps.present_days,
              ps.paid_leave_days,
              ps.unpaid_leave_days
       FROM payroll_employees pe
       JOIN employees e ON e.id = pe.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       LEFT JOIN contracts c ON c.id = pe.contract_id
       LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
       LEFT JOIN payslips ps ON ps.payroll_id = pe.payroll_id AND ps.employee_id = pe.employee_id
       WHERE pe.payroll_id = $1
       ORDER BY e.first_name ASC`,
      [id]
    );

    // Fetch itemized lines for all payslips in this run
    const payslipIds = empRes.rows.map(e => e.payslip_id).filter(Boolean);
    let linesByPayslip = {};
    if (payslipIds.length > 0) {
      const linesRes = await query(
        `SELECT * FROM payslip_lines WHERE payslip_id = ANY($1) ORDER BY sequence ASC`,
        [payslipIds]
      );
      for (const line of linesRes.rows) {
        if (!linesByPayslip[line.payslip_id]) linesByPayslip[line.payslip_id] = [];
        linesByPayslip[line.payslip_id].push(line);
      }
    }

    // Format employee list with derived payable days and warnings (deduplicated by emp_id)
    const seenEmpIds = new Set();
    const uniqueEmpRows = empRes.rows.filter(row => {
      if (seenEmpIds.has(row.emp_id)) return false;
      seenEmpIds.add(row.emp_id);
      return true;
    });

    const formattedEmployees = uniqueEmpRows.map(emp => {
      const wDays = parseFloat(emp.working_days) || 22;
      const pDays = parseFloat(emp.present_days) || 0;
      const plDays = parseFloat(emp.paid_leave_days) || 0;
      const uplDays = parseFloat(emp.unpaid_leave_days) || 0;
      const payableDays = Math.min(wDays, Math.max(0, pDays + plDays));

      const warnings = [];
      if (!emp.bank_account_number) warnings.push('Missing bank details');
      if (!emp.tax_identifier) warnings.push('Missing tax ID');
      if (emp.payslip_id && parseFloat(emp.net_salary || 0) <= 0) warnings.push('Zero or low net pay');
      if (!emp.contract_wage) warnings.push('Contract wage is $0');

      return {
        ...emp,
        working_days: wDays,
        present_days: pDays,
        paid_leave_days: plDays,
        unpaid_leave_days: uplDays,
        payable_days: payableDays,
        lines: linesByPayslip[emp.payslip_id] || [],
        warnings
      };
    });

    // Payments if marked PAID
    const paymentsRes = await query(
      `SELECT pay.*, e.first_name || ' ' || e.last_name as employee_name, e.employee_code
       FROM payments pay
       JOIN employees e ON e.id = pay.employee_id
       WHERE pay.payroll_id = $1`,
      [id]
    );

    // Validation readiness check
    const validation = await validatePayRunReadiness(id);

    // KPI Summary calculations
    const empCount = formattedEmployees.length;
    const grossTotal = parseFloat(payrun.total_gross || 0);
    const deductionsTotal = parseFloat(payrun.total_deductions || 0);
    const netTotal = parseFloat(payrun.total_net || 0);
    const avgNet = empCount > 0 ? (netTotal / empCount) : 0;

    const kpis = {
      employee_count: empCount,
      total_gross: grossTotal,
      total_deductions: deductionsTotal,
      total_net: netTotal,
      average_net: Math.round(avgNet * 100) / 100,
      blocking_error_count: validation.blockingErrors.length,
      warning_count: validation.warnings.length
    };

    res.json({
      success: true,
      payrun,
      employees: formattedEmployees,
      payments: paymentsRes.rows,
      validation,
      kpis
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

    if (new Date(period_start) > new Date(period_end)) {
      return res.status(400).json({
        success: false,
        message: 'Period Start date cannot be later than Period End date.'
      });
    }

    // Validate no duplicate active pay run for identical employees and period
    const duplicateCheck = await query(
      `SELECT pe.employee_id, e.first_name || ' ' || e.last_name as employee_name, p.name as existing_run_name
       FROM payroll_employees pe
       JOIN payrolls p ON p.id = pe.payroll_id
       JOIN employees e ON e.id = pe.employee_id
       WHERE p.period_start = $1 AND p.period_end = $2 
         AND pe.employee_id = ANY($3) 
         AND p.status != 'CANCELLED'`,
      [period_start, period_end, employee_ids]
    );

    if (duplicateCheck.rows.length > 0) {
      const dupNames = duplicateCheck.rows.map(r => `${r.employee_name} (in "${r.existing_run_name}")`).join(', ');
      return res.status(400).json({
        success: false,
        message: `Duplicate payroll detected! The following employee(s) already belong to an active pay run for period ${period_start} to ${period_end}: ${dupNames}`
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

    // Link explicitly selected employees (deduplicated) and find their applicable contract
    const uniqueEmpIds = Array.from(new Set(employee_ids));
    for (const empId of uniqueEmpIds) {
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
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (payroll_id, employee_id) DO NOTHING`,
        [uuidv4(), payrunId, empId, contractId]
      );
    }

    await logAudit(req.user.id, 'CREATE_PAYRUN', 'payrolls', payrunId, { name, period_start, period_end, employee_count: employee_ids.length }, req);

    res.status(201).json({
      success: true,
      message: `Pay run "${name}" created with ${employee_ids.length} selected employee(s) (State: DRAFT)`,
      payrunId
    });
  } catch (err) {
    console.error('Create payrun error:', err);
    res.status(500).json({ success: false, message: 'Failed to create pay run: ' + err.message });
  }
});

// PUT /api/payroll/payruns/:id - Update Pay Run metadata
router.put('/payruns/:id', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, period_start, period_end, notes } = req.body;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    const normStatus = normalizeStatus(payrun.status);

    if (normStatus === 'FINALIZED' || normStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: `Cannot modify a pay run that is ${normStatus}. Pay runs in this state are locked.`
      });
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
    res.json({ success: true, message: 'Pay run details updated successfully.' });
  } catch (err) {
    console.error('Update payrun error:', err);
    res.status(500).json({ success: false, message: 'Failed to update pay run: ' + err.message });
  }
});

// POST /api/payroll/payruns/:id/compute - Compute Payroll Engine (Transitions to REVIEW)
router.post('/payruns/:id/compute', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  const { id } = req.params;
  let previousStatus = 'DRAFT';

  try {
    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found.' });
    }

    const payrun = prRes.rows[0];
    previousStatus = payrun.status;
    const normStatus = normalizeStatus(payrun.status);

    // State machine guards
    if (normStatus === 'COMPUTING') {
      return res.status(409).json({
        success: false,
        message: 'A payroll calculation is currently in progress for this pay run. Please wait.'
      });
    }

    if (normStatus === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        message: 'This pay run is FINALIZED and locked. Recalculation is not permitted.'
      });
    }

    if (normStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This pay run is already PAID. Recalculation is not permitted.'
      });
    }

    // Set transient concurrency lock: COMPUTING
    await query(`UPDATE payrolls SET status = 'COMPUTING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    // Fetch assigned employees
    const selectedEmployees = await query(
      `SELECT pe.*, e.first_name, e.last_name, e.employee_code, e.id as emp_id
       FROM payroll_employees pe
       JOIN employees e ON e.id = pe.employee_id
       WHERE pe.payroll_id = $1`,
      [id]
    );

    if (selectedEmployees.rows.length === 0) {
      await query(`UPDATE payrolls SET status = $1 WHERE id = $2`, [previousStatus, id]);
      return res.status(400).json({ success: false, message: 'No employees assigned to this pay run.' });
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    // Delete existing provisional payslips and lines for this pay run
    await query('DELETE FROM payslips WHERE payroll_id = $1', [id]);

    // Compute for each employee
    for (const item of selectedEmployees.rows) {
      const empId = item.employee_id;

      // 1. Find contract applicable to period
      const contractRes = await query(
        `SELECT c.*, ss.id as structure_id, ws.working_days as schedule_working_days
         FROM contracts c
         JOIN salary_structures ss ON ss.id = c.salary_structure_id
         LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
         WHERE c.employee_id = $1 AND c.status = 'ACTIVE'
           AND c.contract_start_date <= $2 
           AND (c.contract_end_date IS NULL OR c.contract_end_date >= $3)
         ORDER BY c.contract_start_date DESC LIMIT 1`,
        [empId, toISODateString(payrun.period_end), toISODateString(payrun.period_start)]
      );

      if (contractRes.rows.length === 0) {
        await query(`UPDATE payrolls SET status = $1 WHERE id = $2`, [previousStatus || 'DRAFT', id]);
        return res.status(400).json({
          success: false,
          message: `Cannot compute payroll: Employee ${item.first_name} ${item.last_name} (${item.employee_code}) has no active contract for period ${toISODateString(payrun.period_start)} to ${toISODateString(payrun.period_end)}. Please assign an active contract or remove them from the pay run batch.`
        });
      }

      const contract = contractRes.rows[0];
      const structureId = payrun.salary_structure_id || contract.structure_id;

      // 2. Fetch salary rules
      const rulesRes = await query(
        `SELECT * FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE ORDER BY sequence ASC`,
        [structureId]
      );

      if (rulesRes.rows.length === 0) {
        await query(`UPDATE payrolls SET status = $1 WHERE id = $2`, [previousStatus || 'DRAFT', id]);
        return res.status(400).json({
          success: false,
          message: `Cannot compute payroll: Salary structure for employee ${item.first_name} ${item.last_name} (${item.employee_code}) has no active rules defined.`
        });
      }

      // 3. Determine dynamic working days in period from schedule
      const schedDaysList = contract.schedule_working_days ? contract.schedule_working_days.split(',') : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const workingDays = calculateWorkingDays(payrun.period_start, payrun.period_end, schedDaysList);

      // 4. Read attendance & time-off during period
      const attRes = await query(
        `SELECT 
          COUNT(*) as total_logged_days,
          COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days,
          COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent_days,
          COALESCE(SUM(CASE WHEN overtime_hours > 0 THEN overtime_hours WHEN worked_hours > 8.0 THEN worked_hours - 8.0 ELSE 0 END), 0) as total_overtime_hours
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

      const totalLogged = parseFloat(attRes.rows[0]?.total_logged_days || 0);
      const rawPresent = parseFloat(attRes.rows[0]?.present_days || 0) + (parseFloat(attRes.rows[0]?.half_days || 0) * 0.5);
      const paidLeave = parseFloat(leaveRes.rows[0]?.paid_leave_days || 0);
      const unpaidLeave = parseFloat(leaveRes.rows[0]?.unpaid_leave_days || 0);
      const overtimeHours = parseFloat(attRes.rows[0]?.total_overtime_hours || 0);

      // If no attendance was logged at all for the entire period, assume standard full attendance minus unpaid leave
      const presentDays = totalLogged > 0 ? rawPresent : Math.max(0, workingDays - unpaidLeave);

      // 5. Compute via Salary Rule Engine
      const calculation = computeSalary(contract, rulesRes.rows, {
        workingDays,
        presentDays,
        paidLeaveDays: paidLeave,
        unpaidLeaveDays: unpaidLeave,
        overtimeHours: overtimeHours
      });

      // 6. Generate Payslip record
      const payslipId = uuidv4();
      const periodStartStr = payrun.period_start instanceof Date ? payrun.period_start.toISOString().split('T')[0] : String(payrun.period_start);
      const periodEndStr = payrun.period_end instanceof Date ? payrun.period_end.toISOString().split('T')[0] : String(payrun.period_end);
      const empCodeClean = (item.employee_code || item.emp_id).replace('EMP-', '');
      const payslipNum = `PAY-${periodStartStr.substring(0, 7).replace('-', '')}-${empCodeClean}-${id.slice(0, 4)}`;

      await query(
        `INSERT INTO payslips (
          id, payroll_id, employee_id, contract_id, payslip_number,
          period_start, period_end, working_days, present_days,
          paid_leave_days, unpaid_leave_days, wage, gross_salary,
          total_deductions, net_salary, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'REVIEW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          payslipId, id, empId, contract.id, payslipNum,
          periodStartStr, periodEndStr, calculation.workingDays,
          calculation.presentDays, calculation.paidLeaveDays, calculation.unpaidLeaveDays,
          calculation.wage, calculation.grossSalary, calculation.totalDeductions,
          calculation.netSalary
        ]
      );

      // 7. Insert itemized payslip lines
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

    // Consistent rounding for pay run totals
    totalGross = Math.round(totalGross * 100) / 100;
    totalDeductions = Math.round(totalDeductions * 100) / 100;
    totalNet = Math.round(totalNet * 100) / 100;

    // Transition state to REVIEW (and backwards-compatible COMPUTED)
    await query(
      `UPDATE payrolls SET
        status = 'REVIEW',
        total_gross = $1,
        total_deductions = $2,
        total_net = $3,
        employee_count = $4,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [totalGross, totalDeductions, totalNet, selectedEmployees.rows.length, id]
    );

    await logAudit(req.user.id, 'COMPUTE_PAYROLL', 'payrolls', id, { totalGross, totalDeductions, totalNet, count: selectedEmployees.rows.length }, req);

    res.json({
      success: true,
      message: `Payroll computed successfully for ${selectedEmployees.rows.length} employee(s). Pay run is now in REVIEW status.`,
      summary: { totalGross, totalDeductions, totalNet, employeeCount: selectedEmployees.rows.length }
    });
  } catch (err) {
    console.error('Compute payroll error:', err);
    // Roll back to previous state if computation crashed
    await query(`UPDATE payrolls SET status = $1 WHERE id = $2`, [previousStatus || 'DRAFT', id]);
    res.status(500).json({ success: false, message: err.message || 'Failed to compute payroll' });
  }
});

// POST /api/payroll/payruns/:id/finalize - Finalize & Lock Pay Run (Requires REVIEW state)
// Also aliased to /validate for backwards compatibility
const handleFinalize = async (req, res) => {
  try {
    const { id } = req.params;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    const normStatus = normalizeStatus(payrun.status);

    if (normStatus === 'FINALIZED') {
      return res.status(400).json({ success: false, message: 'This pay run is already FINALIZED.' });
    }

    if (normStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'This pay run is already PAID.' });
    }

    if (normStatus !== 'REVIEW') {
      return res.status(400).json({
        success: false,
        message: `Only pay runs in REVIEW status can be finalized. Current status is ${normStatus}. Please compute payroll first.`
      });
    }

    // Run thorough blocking validation
    const readiness = await validatePayRunReadiness(id);
    if (!readiness.canFinalize) {
      return res.status(400).json({
        success: false,
        message: 'Cannot finalize pay run due to blocking validation errors.',
        blockingErrors: readiness.blockingErrors,
        warnings: readiness.warnings
      });
    }

    // Lock pay run: state = FINALIZED
    await query(
      `UPDATE payrolls SET
        status = 'FINALIZED',
        validated_by = $1,
        validated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, id]
    );

    // Lock all associated payslips: status = FINALIZED
    await query(`UPDATE payslips SET status = 'FINALIZED', updated_at = CURRENT_TIMESTAMP WHERE payroll_id = $1`, [id]);

    await logAudit(req.user.id, 'FINALIZE_PAYROLL', 'payrolls', id, { totalNet: payrun.total_net }, req);

    res.json({
      success: true,
      message: 'Pay run finalized and locked successfully! Generated payslips are now immutable and ready for disbursement.',
      summary: {
        totalGross: payrun.total_gross,
        totalDeductions: payrun.total_deductions,
        totalNet: payrun.total_net,
        employeeCount: payrun.employee_count,
        warnings: readiness.warnings
      }
    });
  } catch (err) {
    console.error('Finalize payroll error:', err);
    res.status(500).json({ success: false, message: 'Failed to finalize pay run: ' + err.message });
  }
};

router.post('/payruns/:id/finalize', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), handleFinalize);
router.post('/payruns/:id/validate', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), handleFinalize);

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
    const normStatus = normalizeStatus(payrun.status);

    if (normStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'This pay run is already marked as PAID.' });
    }

    if (normStatus !== 'FINALIZED') {
      return res.status(400).json({
        success: false,
        message: `Only FINALIZED pay runs can be marked as PAID. Current status is ${normStatus}. Please finalize the pay run first.`
      });
    }

    // Fetch all payslips for this pay run
    const payslips = await query('SELECT * FROM payslips WHERE payroll_id = $1', [id]);
    if (payslips.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No payslips found for this pay run.' });
    }

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
      message: `Payroll marked as PAID! ${payslips.rows.length} payment disbursement transaction(s) recorded.`
    });
  } catch (err) {
    console.error('Mark paid error:', err);
    res.status(500).json({ success: false, message: 'Failed to record payroll payment: ' + err.message });
  }
});

// POST /api/payroll/payruns/:id/employees/:employeeId/recalculate - Recalculate single employee in REVIEW
router.post('/payruns/:id/employees/:employeeId/recalculate', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found' });
    }

    const payrun = prRes.rows[0];
    const normStatus = normalizeStatus(payrun.status);

    if (normStatus === 'FINALIZED' || normStatus === 'PAID') {
      return res.status(400).json({ success: false, message: `Cannot recalculate employee in ${normStatus} pay run.` });
    }

    // Fetch contract
    const contractRes = await query(
      `SELECT c.*, ss.id as structure_id, ws.working_days as schedule_working_days
       FROM contracts c
       JOIN salary_structures ss ON ss.id = c.salary_structure_id
       LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
       WHERE c.employee_id = $1 AND c.status = 'ACTIVE'
         AND c.contract_start_date <= $2 
         AND (c.contract_end_date IS NULL OR c.contract_end_date >= $3)
       ORDER BY c.contract_start_date DESC LIMIT 1`,
       [employeeId, toISODateString(payrun.period_end), toISODateString(payrun.period_start)]
    );

    if (contractRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Employee has no active contract for this period.' });
    }

    const contract = contractRes.rows[0];
    const structureId = payrun.salary_structure_id || contract.structure_id;

    const rulesRes = await query(
      `SELECT * FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE ORDER BY sequence ASC`,
      [structureId]
    );

    const schedDaysList = contract.schedule_working_days ? contract.schedule_working_days.split(',') : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const workingDays = calculateWorkingDays(payrun.period_start, payrun.period_end, schedDaysList);

    const attRes = await query(
      `SELECT 
        COUNT(*) as total_logged_days,
        COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days,
        COALESCE(SUM(CASE WHEN overtime_hours > 0 THEN overtime_hours WHEN worked_hours > 8.0 THEN worked_hours - 8.0 ELSE 0 END), 0) as total_overtime_hours
       FROM attendance 
       WHERE employee_id = $1 AND date >= $2 AND date <= $3`,
      [employeeId, payrun.period_start, payrun.period_end]
    );

    const leaveRes = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN tot.is_paid = TRUE THEN tor.total_days ELSE 0 END), 0) as paid_leave_days,
        COALESCE(SUM(CASE WHEN tot.is_paid = FALSE THEN tor.total_days ELSE 0 END), 0) as unpaid_leave_days
       FROM time_off_requests tor
       JOIN time_off_types tot ON tot.id = tor.time_off_type_id
       WHERE tor.employee_id = $1 AND tor.status = 'APPROVED'
         AND tor.from_date >= $2 AND tor.to_date <= $3`,
      [employeeId, payrun.period_start, payrun.period_end]
    );

    const totalLogged = parseFloat(attRes.rows[0]?.total_logged_days || 0);
    const rawPresent = parseFloat(attRes.rows[0]?.present_days || 0) + (parseFloat(attRes.rows[0]?.half_days || 0) * 0.5);
    const paidLeave = parseFloat(leaveRes.rows[0]?.paid_leave_days || 0);
    const unpaidLeave = parseFloat(leaveRes.rows[0]?.unpaid_leave_days || 0);
    const overtimeHours = parseFloat(attRes.rows[0]?.total_overtime_hours || 0);
    const presentDays = totalLogged > 0 ? rawPresent : Math.max(0, workingDays - unpaidLeave);

    const calculation = computeSalary(contract, rulesRes.rows, {
      workingDays,
      presentDays,
      paidLeaveDays: paidLeave,
      unpaidLeaveDays: unpaidLeave,
      overtimeHours: overtimeHours
    });

    // Delete existing payslip for this employee
    await query('DELETE FROM payslips WHERE payroll_id = $1 AND employee_id = $2', [id, employeeId]);

    const payslipId = uuidv4();
    const periodStartStr = payrun.period_start instanceof Date ? payrun.period_start.toISOString().split('T')[0] : String(payrun.period_start);
    const periodEndStr = payrun.period_end instanceof Date ? payrun.period_end.toISOString().split('T')[0] : String(payrun.period_end);
    const payslipNum = `PAY-${periodStartStr.substring(0, 7).replace('-', '')}-${employeeId.slice(0, 6)}`;

    await query(
      `INSERT INTO payslips (
        id, payroll_id, employee_id, contract_id, payslip_number,
        period_start, period_end, working_days, present_days,
        paid_leave_days, unpaid_leave_days, wage, gross_salary,
        total_deductions, net_salary, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'REVIEW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        payslipId, id, employeeId, contract.id, payslipNum,
        periodStartStr, periodEndStr, calculation.workingDays,
        calculation.presentDays, calculation.paidLeaveDays, calculation.unpaidLeaveDays,
        calculation.wage, calculation.grossSalary, calculation.totalDeductions,
        calculation.netSalary
      ]
    );

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

    // Recalculate totals for pay run
    const allPayslips = await query('SELECT gross_salary, total_deductions, net_salary FROM payslips WHERE payroll_id = $1', [id]);
    let tGross = 0, tDed = 0, tNet = 0;
    for (const p of allPayslips.rows) {
      tGross += parseFloat(p.gross_salary || 0);
      tDed += parseFloat(p.total_deductions || 0);
      tNet += parseFloat(p.net_salary || 0);
    }

    await query(
      `UPDATE payrolls SET total_gross = $1, total_deductions = $2, total_net = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [Math.round(tGross * 100) / 100, Math.round(tDed * 100) / 100, Math.round(tNet * 100) / 100, id]
    );

    res.json({
      success: true,
      message: 'Employee salary recalculated successfully.',
      calculation
    });
  } catch (err) {
    console.error('Recalculate employee error:', err);
    res.status(500).json({ success: false, message: 'Failed to recalculate employee: ' + err.message });
  }
});

// POST /api/payroll/payruns/:id/send-payslips - Send bulk digital payslip notifications
router.post('/payruns/:id/send-payslips', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;

    const prRes = await query('SELECT * FROM payrolls WHERE id = $1', [id]);
    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pay run not found.' });
    }

    const payslipsRes = await query(
      `SELECT ps.*, e.first_name, e.last_name, e.email
       FROM payslips ps
       JOIN employees e ON e.id = ps.employee_id
       WHERE ps.payroll_id = $1`,
      [id]
    );

    if (payslipsRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No payslips found in this pay run batch.' });
    }

    await logAudit(req.user.id, 'SEND_PAYSLIPS_BULK', 'payrolls', id, { count: payslipsRes.rows.length }, req);

    res.json({
      success: true,
      message: `Digital payslips & email notifications successfully dispatched to all ${payslipsRes.rows.length} employee(s).`,
      count: payslipsRes.rows.length
    });
  } catch (err) {
    console.error('Send payslips error:', err);
    res.status(500).json({ success: false, message: 'Failed to dispatch payslips: ' + err.message });
  }
});

module.exports = router;
