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

// GET /api/users - List all users with roles, employee info, department, designation & wage
router.get('/', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const users = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, u.created_at,
              r.id as role_id, r.code as role_code, r.name as role_name,
              e.id as employee_id, e.employee_code,
              d.name as department_name, d.id as department_id,
              des.name as designation_name, des.id as designation_id,
              c.wage as monthly_wage, c.id as contract_id, c.salary_structure_id, c.working_schedule_id
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
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

// POST /api/users - Create a new user with role & linked employee profile (ADMIN only)
router.post('/', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      roleId,
      departmentId,
      designationId,
      monthlyWage,
      salaryStructureId,
      workingScheduleId
    } = req.body;

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

    // Check / create linked Employee record
    const existingEmp = await query('SELECT id FROM employees WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    let empId;
    if (existingEmp.rows.length === 0) {
      const countRes = await query('SELECT COUNT(*) FROM employees');
      const empNum = parseInt(countRes.rows[0].count, 10) + 1001;
      const employee_code = `EMP-${empNum}`;
      empId = uuidv4();
      await query(
        `INSERT INTO employees (
          id, user_id, employee_code, first_name, last_name, email, phone,
          department_id, designation_id,
          joining_date, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          empId, userId, employee_code, firstName.trim(), lastName.trim(), email.trim().toLowerCase(), phone || null,
          departmentId || null, designationId || null
        ]
      );
    } else {
      empId = existingEmp.rows[0].id;
      await query(
        `UPDATE employees SET
          user_id = $1,
          department_id = COALESCE($2, department_id),
          designation_id = COALESCE($3, designation_id),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [userId, departmentId || null, designationId || null, empId]
      );
    }

    // If monthlyWage is provided, create or update active contract
    const wageNum = parseFloat(monthlyWage);
    if (!isNaN(wageNum) && wageNum > 0) {
      let structId = salaryStructureId;
      if (!structId) {
        const sRes = await query('SELECT id FROM salary_structures WHERE is_active = TRUE LIMIT 1');
        structId = sRes.rows[0]?.id;
      }
      let schedId = workingScheduleId;
      if (!schedId) {
        const scRes = await query('SELECT id FROM working_schedules WHERE is_active = TRUE LIMIT 1');
        schedId = scRes.rows[0]?.id;
      }

      if (structId && schedId) {
        const existingCont = await query('SELECT id FROM contracts WHERE employee_id = $1 AND status = $2', [empId, 'ACTIVE']);
        if (existingCont.rows.length === 0) {
          await query(
            `INSERT INTO contracts (id, employee_id, contract_start_date, contract_type, salary_structure_id, wage, working_schedule_id, status, created_at)
             VALUES ($1, $2, CURRENT_DATE, 'PERMANENT', $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP)`,
            [uuidv4(), empId, structId, wageNum, schedId]
          );
        } else {
          await query(
            `UPDATE contracts SET wage = $1, salary_structure_id = $2, working_schedule_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [wageNum, structId, schedId, existingCont.rows[0].id]
          );
        }
      }
    }

    // Ensure default leave allocations exist for this employee
    const leaveTypes = await query('SELECT * FROM time_off_types WHERE is_allocation_required = TRUE AND is_active = TRUE');
    const currentYear = new Date().getFullYear();
    for (const lt of leaveTypes.rows) {
      const existingAlloc = await query('SELECT id FROM leave_allocations WHERE employee_id = $1 AND time_off_type_id = $2 AND year = $3', [empId, lt.id, currentYear]);
      if (existingAlloc.rows.length === 0) {
        const days = parseFloat(lt.default_days_per_year) || 12;
        await query(
          `INSERT INTO leave_allocations (id, employee_id, time_off_type_id, year, allocated_days, used_days, remaining_days, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 0, $6, 'ACTIVE', CURRENT_TIMESTAMP)`,
          [uuidv4(), empId, lt.id, currentYear, days, days]
        );
      }
    }

    await logAudit(req.user.id, 'CREATE_USER', 'users', userId, { email, firstName, lastName, roleId, departmentId, designationId, monthlyWage }, req);

    res.status(201).json({
      success: true,
      message: 'User created and employee profile linked successfully',
      userId,
      employeeId: empId
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user / role assignment & linked profile (ADMIN only)
router.put('/:id', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, phone, isActive, roleId, password,
      departmentId, designationId, monthlyWage, salaryStructureId, workingScheduleId
    } = req.body;

    // Update user info
    let updateQuery = `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP`;
    const params = [firstName || null, lastName || null, phone || null, isActive !== undefined ? isActive : null];

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
      await query('INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', [urId, id, roleId]);
    }

    // Also update linked employee profile if department/designation passed
    const empRes = await query('SELECT id FROM employees WHERE user_id = $1', [id]);
    if (empRes.rows.length > 0) {
      const empId = empRes.rows[0].id;
      if (departmentId !== undefined || designationId !== undefined || firstName || lastName || phone) {
        await query(
          `UPDATE employees SET
            department_id = COALESCE($1, department_id),
            designation_id = COALESCE($2, designation_id),
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            phone = COALESCE($5, phone),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [departmentId || null, designationId || null, firstName || null, lastName || null, phone || null, empId]
        );
      }

      // Update wage / contract if passed
      const wageNum = parseFloat(monthlyWage);
      if (!isNaN(wageNum)) {
        let structId = salaryStructureId;
        if (!structId) {
          const sRes = await query('SELECT id FROM salary_structures WHERE is_active = TRUE LIMIT 1');
          structId = sRes.rows[0]?.id;
        }
        let schedId = workingScheduleId;
        if (!schedId) {
          const scRes = await query('SELECT id FROM working_schedules WHERE is_active = TRUE LIMIT 1');
          schedId = scRes.rows[0]?.id;
        }

        const activeCont = await query('SELECT id FROM contracts WHERE employee_id = $1 AND status = $2', [empId, 'ACTIVE']);
        if (activeCont.rows.length > 0) {
          await query(
            `UPDATE contracts SET wage = $1, salary_structure_id = COALESCE($2, salary_structure_id), working_schedule_id = COALESCE($3, working_schedule_id), updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [wageNum, structId || null, schedId || null, activeCont.rows[0].id]
          );
        } else if (structId && schedId) {
          await query(
            `INSERT INTO contracts (id, employee_id, contract_start_date, contract_type, salary_structure_id, wage, working_schedule_id, status, created_at)
             VALUES ($1, $2, CURRENT_DATE, 'PERMANENT', $3, $4, $5, 'ACTIVE', CURRENT_TIMESTAMP)`,
            [uuidv4(), empId, structId, wageNum, schedId]
          );
        }
      }
    }

    await logAudit(req.user.id, 'UPDATE_USER', 'users', id, { firstName, lastName, isActive, roleId, departmentId, designationId, monthlyWage }, req);

    res.json({ success: true, message: 'User and linked profile updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete a user (ADMIN only)
router.delete('/:id', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    // Guard against deleting static admin account or self
    const targetUser = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = targetUser.rows[0];
    if (u.id === 'usr-admin' || u.email.toLowerCase() === 'admin@peoplepay360.com') {
      return res.status(400).json({ success: false, message: 'Cannot delete the primary System Administrator account' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account' });
    }

    // Unlink employee profile if attached
    await query('UPDATE employees SET user_id = NULL WHERE user_id = $1', [id]);
    // Delete user roles
    await query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    await logAudit(req.user.id, 'DELETE_USER', 'users', id, { email: u.email, name: `${u.first_name} ${u.last_name}` }, req);

    res.json({ success: true, message: `User "${u.first_name} ${u.last_name}" (${u.email}) deleted successfully` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// PUT /api/users/roles/:id - Update Role details & description (ADMIN only)
router.put('/roles/:id', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, name } = req.body;

    await query(
      `UPDATE roles SET
        description = COALESCE($1, description),
        name = COALESCE($2, name)
       WHERE id = $3`,
      [description || null, name || null, id]
    );

    await logAudit(req.user.id, 'UPDATE_ROLE', 'roles', id, { description, name }, req);
    res.json({ success: true, message: 'Role configuration updated successfully' });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

module.exports = router;
