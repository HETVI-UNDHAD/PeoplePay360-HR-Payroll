const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/contracts - List contracts
router.get('/', async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    let sql = `
      SELECT c.*, 
             e.first_name || ' ' || e.last_name as employee_name,
             e.employee_code,
             d.name as department_name,
             ss.name as salary_structure_name,
             ss.code as salary_structure_code,
             ws.name as working_schedule_name
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
      LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === ROLES.EMPLOYEE) {
      params.push(userEmpId);
      sql += ` AND c.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      sql += ` AND c.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    sql += ` ORDER BY c.contract_start_date DESC`;

    const contracts = await query(sql, params);
    res.json({ success: true, contracts: contracts.rows });
  } catch (err) {
    console.error('Fetch contracts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contracts' });
  }
});

// POST /api/contracts - Create contract (ADMIN, HR_MANAGER, PAYROLL_ADMIN, PAYROLL_USER)
router.post('/', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const {
      employee_id,
      contract_start_date,
      contract_end_date,
      contract_type,
      salary_structure_id,
      wage,
      working_schedule_id,
      status,
      notes
    } = req.body;

    if (!employee_id || !contract_start_date || !salary_structure_id || !working_schedule_id || wage === undefined) {
      return res.status(400).json({ success: false, message: 'Employee, start date, salary structure, schedule, and wage are required' });
    }

    // If new contract is ACTIVE, optionally expire previous active contracts
    if (status === 'ACTIVE') {
      await query(
        `UPDATE contracts SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP 
         WHERE employee_id = $1 AND status = 'ACTIVE'`,
        [employee_id]
      );
    }

    const contractId = uuidv4();
    await query(
      `INSERT INTO contracts (
        id, employee_id, contract_start_date, contract_end_date,
        contract_type, salary_structure_id, wage, working_schedule_id,
        status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        contractId, employee_id, contract_start_date, contract_end_date || null,
        contract_type || 'PERMANENT', salary_structure_id, parseFloat(wage) || 0,
        working_schedule_id, status || 'ACTIVE', notes || null
      ]
    );

    await logAudit(req.user.id, 'CREATE_CONTRACT', 'contracts', contractId, { employee_id, wage, salary_structure_id }, req);

    res.status(201).json({ success: true, message: 'Contract created successfully', contractId });
  } catch (err) {
    console.error('Create contract error:', err);
    res.status(500).json({ success: false, message: 'Failed to create contract' });
  }
});

// PUT /api/contracts/:id - Update contract (ADMIN, HR_MANAGER, PAYROLL_ADMIN, PAYROLL_USER)
router.put('/:id', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_start_date,
      contract_end_date,
      contract_type,
      salary_structure_id,
      wage,
      working_schedule_id,
      status,
      notes
    } = req.body;

    await query(
      `UPDATE contracts SET
        contract_start_date = $1, contract_end_date = $2, contract_type = $3,
        salary_structure_id = $4, wage = $5, working_schedule_id = $6,
        status = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        contract_start_date, contract_end_date || null, contract_type,
        salary_structure_id, parseFloat(wage) || 0, working_schedule_id,
        status, notes || null, id
      ]
    );

    await logAudit(req.user.id, 'UPDATE_CONTRACT', 'contracts', id, { wage, status }, req);
    res.json({ success: true, message: 'Contract updated successfully' });
  } catch (err) {
    console.error('Update contract error:', err);
    res.status(500).json({ success: false, message: 'Failed to update contract' });
  }
});

module.exports = router;
