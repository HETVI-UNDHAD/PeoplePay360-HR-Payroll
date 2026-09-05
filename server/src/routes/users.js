const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// All routes require authentication
router.use(authenticate);

// GET /api/users - List all users (ADMIN only)
router.get('/', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const users = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, u.created_at,
              r.id as role_id, r.code as role_code, r.name as role_name,
              e.id as employee_id, e.employee_code, d.name as department_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY u.created_at DESC`
    );

    res.json({ success: true, users: users.rows });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET /api/users/roles - List all available roles
router.get('/roles', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER), async (req, res) => {
  try {
    const roles = await query('SELECT * FROM roles ORDER BY name ASC');
    res.json({ success: true, roles: roles.rows });
  } catch (err) {
    console.error('Fetch roles error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// POST /api/users - Create a new user with role (ADMIN only)
router.post('/', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, roleId } = req.body;

    if (!email || !password || !firstName || !lastName || !roleId) {
      return res.status(400).json({ success: false, message: 'All required fields (email, password, name, role) must be provided' });
    }

    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, email.trim().toLowerCase(), hashedPassword, firstName.trim(), lastName.trim(), phone || null]
    );

    // Assign role
    const urId = uuidv4();
    await query(
      `INSERT INTO user_roles (id, user_id, role_id, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [urId, userId, roleId]
    );

    await logAudit(req.user.id, 'CREATE_USER', 'users', userId, { email, firstName, lastName, roleId }, req);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user / role assignment (ADMIN only)
router.put('/:id', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, isActive, roleId, password } = req.body;

    // Update user info
    let updateQuery = `UPDATE users SET first_name = $1, last_name = $2, phone = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP`;
    const params = [firstName, lastName, phone, isActive];

    if (password && password.trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $5 WHERE id = $6`;
      params.push(hashedPassword, id);
    } else {
      updateQuery += ` WHERE id = $5`;
      params.push(id);
    }

    await query(updateQuery, params);

    // Update role if changed
    if (roleId) {
      await query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      const urId = uuidv4();
      await query('INSERT INTO user_roles (id, user_id, role_id) VALUES ($1, $2, $3)', [urId, id, roleId]);
    }

    await logAudit(req.user.id, 'UPDATE_USER', 'users', id, { firstName, lastName, isActive, roleId }, req);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

module.exports = router;
