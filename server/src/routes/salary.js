const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { computeSalary } = require('../engine/salaryEngine');

router.use(authenticate);

// GET /api/salary/structures - List all salary structures with rules count
router.get('/structures', async (req, res) => {
  try {
    const structures = await query(
      `SELECT ss.*, 
              COUNT(sr.id) as rules_count,
              COUNT(DISTINCT c.id) as active_contracts_count
       FROM salary_structures ss
       LEFT JOIN salary_rules sr ON sr.salary_structure_id = ss.id AND sr.is_active = TRUE
       LEFT JOIN contracts c ON c.salary_structure_id = ss.id AND c.status = 'ACTIVE'
       GROUP BY ss.id
       ORDER BY ss.name ASC`
    );

    res.json({ success: true, structures: structures.rows });
  } catch (err) {
    console.error('Fetch salary structures error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salary structures' });
  }
});

// GET /api/salary/structures/:id - Get structure with its ordered rules
router.get('/structures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const structRes = await query('SELECT * FROM salary_structures WHERE id = $1', [id]);
    if (structRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const rulesRes = await query(
      `SELECT * FROM salary_rules WHERE salary_structure_id = $1 ORDER BY sequence ASC`,
      [id]
    );

    res.json({
      success: true,
      structure: structRes.rows[0],
      rules: rulesRes.rows
    });
  } catch (err) {
    console.error('Fetch salary structure details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salary structure details' });
  }
});

// POST /api/salary/structures - Create Salary Structure (PAYROLL_ADMIN, ADMIN)
router.post('/structures', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { name, code, type, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Structure name and code are required' });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO salary_structures (id, name, code, type, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, name.trim(), code.trim().toUpperCase(), type || 'REGULAR', description || null]
    );

    await logAudit(req.user.id, 'CREATE_SALARY_STRUCTURE', 'salary_structures', id, { name, code }, req);
    res.status(201).json({ success: true, message: 'Salary structure created successfully', id });
  } catch (err) {
    console.error('Create salary structure error:', err);
    res.status(500).json({ success: false, message: 'Failed to create salary structure' });
  }
});

// POST /api/salary/rules - Create Salary Rule (PAYROLL_ADMIN, ADMIN)
router.post('/rules', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const {
      salary_structure_id,
      name,
      code,
      sequence,
      category,
      computation_type,
      fixed_amount,
      percentage,
      base_code,
      formula,
      condition
    } = req.body;

    if (!salary_structure_id || !name || !code || !category || !computation_type) {
      return res.status(400).json({ success: false, message: 'Structure ID, name, code, category, and computation type are required' });
    }

    const ruleId = uuidv4();
    await query(
      `INSERT INTO salary_rules (
        id, salary_structure_id, name, code, sequence, category, computation_type,
        fixed_amount, percentage, base_code, formula, condition, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        ruleId, salary_structure_id, name.trim(), code.trim().toUpperCase(),
        parseInt(sequence, 10) || 10, category, computation_type,
        parseFloat(fixed_amount) || 0, parseFloat(percentage) || 0,
        base_code || 'BASIC', formula || null, condition || null
      ]
    );

    await logAudit(req.user.id, 'CREATE_SALARY_RULE', 'salary_rules', ruleId, { name, code, salary_structure_id }, req);
    res.status(201).json({ success: true, message: 'Salary rule created successfully', ruleId });
  } catch (err) {
    console.error('Create salary rule error:', err);
    res.status(500).json({ success: false, message: 'Failed to create salary rule' });
  }
});

// PUT /api/salary/rules/:id - Update Salary Rule
router.put('/rules/:id', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, sequence, category, computation_type,
      fixed_amount, percentage, base_code, formula, condition, is_active
    } = req.body;

    await query(
      `UPDATE salary_rules SET
        name = $1, code = $2, sequence = $3, category = $4,
        computation_type = $5, fixed_amount = $6, percentage = $7,
        base_code = $8, formula = $9, condition = $10, is_active = $11,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        name, code ? code.toUpperCase() : code, parseInt(sequence, 10) || 10,
        category, computation_type, parseFloat(fixed_amount) || 0,
        parseFloat(percentage) || 0, base_code || 'BASIC',
        formula || null, condition || null, is_active !== false, id
      ]
    );

    await logAudit(req.user.id, 'UPDATE_SALARY_RULE', 'salary_rules', id, { name, code }, req);
    res.json({ success: true, message: 'Salary rule updated successfully' });
  } catch (err) {
    console.error('Update salary rule error:', err);
    res.status(500).json({ success: false, message: 'Failed to update salary rule' });
  }
});

// POST /api/salary/test-engine - Live Simulator to test salary computation for any wage & rule set
router.post('/test-engine', checkRole(ROLES.ADMIN, ROLES.PAYROLL_ADMIN, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { wage, salary_structure_id, workingDays, presentDays, unpaidLeaveDays } = req.body;

    const rulesRes = await query(
      `SELECT * FROM salary_rules WHERE salary_structure_id = $1 AND is_active = TRUE ORDER BY sequence ASC`,
      [salary_structure_id]
    );

    const simulation = computeSalary(
      { wage: parseFloat(wage) || 5000 },
      rulesRes.rows,
      {
        workingDays: parseFloat(workingDays) || 22,
        presentDays: parseFloat(presentDays) || 22,
        unpaidLeaveDays: parseFloat(unpaidLeaveDays) || 0
      }
    );

    res.json({ success: true, simulation });
  } catch (err) {
    console.error('Salary test simulation error:', err);
    res.status(500).json({ success: false, message: 'Simulation error' });
  }
});

module.exports = router;
