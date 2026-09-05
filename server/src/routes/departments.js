const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/departments - List all departments with count of employees
router.get('/', async (req, res) => {
  try {
    const depts = await query(
      `SELECT d.*, 
              COUNT(DISTINCT e.id) as employee_count,
              COUNT(DISTINCT des.id) as designation_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
       LEFT JOIN designations des ON des.department_id = d.id
       GROUP BY d.id
       ORDER BY d.name ASC`
    );

    res.json({ success: true, departments: depts.rows });
  } catch (err) {
    console.error('Fetch departments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// POST /api/departments - Create department (ADMIN, HR_MANAGER)
router.post('/', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });

    const id = uuidv4();
    await query(
      `INSERT INTO departments (id, company_id, name, code, is_active)
       VALUES ($1, 'comp-001', $2, $3, TRUE)`,
      [id, name.trim(), (code || name.substring(0, 3)).toUpperCase()]
    );

    await logAudit(req.user.id, 'CREATE_DEPARTMENT', 'departments', id, { name, code }, req);
    res.status(201).json({ success: true, message: 'Department created successfully', id });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
});

// PUT /api/departments/:id - Update department
router.put('/:id', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, is_active } = req.body;

    await query(
      `UPDATE departments SET name = $1, code = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [name, code, is_active !== false, id]
    );

    await logAudit(req.user.id, 'UPDATE_DEPARTMENT', 'departments', id, { name, code, is_active }, req);
    res.json({ success: true, message: 'Department updated successfully' });
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

// GET /api/departments/designations - List all designations
router.get('/designations/all', async (req, res) => {
  try {
    const desigs = await query(
      `SELECT des.*, d.name as department_name, COUNT(e.id) as employee_count
       FROM designations des
       LEFT JOIN departments d ON d.id = des.department_id
       LEFT JOIN employees e ON e.designation_id = des.id AND e.status = 'ACTIVE'
       GROUP BY des.id, d.name
       ORDER BY des.name ASC`
    );
    res.json({ success: true, designations: desigs.rows });
  } catch (err) {
    console.error('Fetch designations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch designations' });
  }
});

// POST /api/departments/designations - Create designation
router.post('/designations', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const { department_id, name, code, description } = req.body;
    if (!name || !department_id) {
      return res.status(400).json({ success: false, message: 'Name and Department ID are required' });
    }

    const id = uuidv4();
    await query(
      `INSERT INTO designations (id, department_id, name, code, description, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [id, department_id, name.trim(), code || null, description || null]
    );

    await logAudit(req.user.id, 'CREATE_DESIGNATION', 'designations', id, { name, department_id }, req);
    res.status(201).json({ success: true, message: 'Designation created successfully', id });
  } catch (err) {
    console.error('Create designation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create designation' });
  }
});

module.exports = router;
