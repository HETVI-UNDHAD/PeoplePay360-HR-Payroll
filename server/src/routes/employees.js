const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(authenticate);

// GET /api/employees - List employees (Role filtered)
router.get('/', async (req, res) => {
  try {
    const { department_id, status, search } = req.query;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    // If role is EMPLOYEE, restrict strictly to own profile
    if (userRole === ROLES.EMPLOYEE) {
      if (!userEmpId) {
        return res.json({ success: true, employees: [] });
      }
      const selfRes = await query(
        `SELECT e.*, d.name as department_name, des.name as designation_name,
                c.id as active_contract_id, c.wage, c.contract_type, ss.name as salary_structure_name,
                r.code as role_code, r.name as role_name, r.id as role_id
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN designations des ON des.id = e.designation_id
         LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
         LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
         LEFT JOIN users u ON u.id = e.user_id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE e.id = $1`,
        [userEmpId]
      );
      return res.json({ success: true, employees: selfRes.rows });
    }

    // HR_MANAGER, ADMIN, PAYROLL_ADMIN, PAYROLL_USER can view list
    let sql = `
      SELECT e.*, 
             d.name as department_name, 
             des.name as designation_name,
             m.first_name || ' ' || m.last_name as manager_name,
             c.id as active_contract_id, c.wage, c.contract_type, c.status as contract_status,
             ss.name as salary_structure_name, ss.id as salary_structure_id,
             ws.name as working_schedule_name, ws.id as working_schedule_id,
             r.code as role_code, r.name as role_name, r.id as role_id
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN designations des ON des.id = e.designation_id
      LEFT JOIN employees m ON m.id = e.manager_id
      LEFT JOIN contracts c ON c.employee_id = e.id AND c.status = 'ACTIVE'
      LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
      LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
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

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(e.first_name || ' ' || e.last_name) LIKE $${params.length} OR LOWER(e.employee_code) LIKE $${params.length} OR LOWER(e.email) LIKE $${params.length})`;
    }

    sql += ` ORDER BY e.first_name ASC`;

    const employees = await query(sql, params);
    res.json({ success: true, employees: employees.rows });
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - Get 360° Employee Details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userEmpId = req.user.employeeId;

    // Security check: Employee can only view own profile
    if (userRole === ROLES.EMPLOYEE && id !== userEmpId) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own profile.' });
    }

    // 1. Employee Info
    const empRes = await query(
      `SELECT e.*, d.name as department_name, des.name as designation_name,
              m.first_name || ' ' || m.last_name as manager_name,
              u.email as user_email, u.is_active as user_active,
              r.id as role_id, r.code as role_code, r.name as role_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN designations des ON des.id = e.designation_id
       LEFT JOIN employees m ON m.id = e.manager_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE e.id = $1`,
      [id]
    );

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const employee = empRes.rows[0];

    // 2. Contracts
    const contractsRes = await query(
      `SELECT c.*, ss.name as salary_structure_name, ss.code as salary_structure_code,
              ws.name as working_schedule_name
       FROM contracts c
       LEFT JOIN salary_structures ss ON ss.id = c.salary_structure_id
       LEFT JOIN working_schedules ws ON ws.id = c.working_schedule_id
       WHERE c.employee_id = $1
       ORDER BY c.contract_start_date DESC`,
      [id]
    );

    // 3. Leave Allocations
    const allocationsRes = await query(
      `SELECT la.*, tot.name as leave_type_name, tot.code as leave_type_code, tot.color_code, tot.is_paid
       FROM leave_allocations la
       JOIN time_off_types tot ON tot.id = la.time_off_type_id
       WHERE la.employee_id = $1
       ORDER BY la.year DESC`,
      [id]
    );

    // 4. Recent Attendance (Last 30 records)
    const attendanceRes = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30`,
      [id]
    );

    // 5. Recent Time Off Requests
    const timeOffRes = await query(
      `SELECT tor.*, tot.name as leave_type_name, tot.color_code
       FROM time_off_requests tor
       JOIN time_off_types tot ON tot.id = tor.time_off_type_id
       WHERE tor.employee_id = $1
       ORDER BY tor.from_date DESC LIMIT 20`,
      [id]
    );

    // 6. Payslips
    const payslipsRes = await query(
      `SELECT ps.*, p.name as payroll_name
       FROM payslips ps
       JOIN payrolls p ON p.id = ps.payroll_id
       WHERE ps.employee_id = $1
       ORDER BY ps.period_start DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      employee,
      contracts: contractsRes.rows,
      allocations: allocationsRes.rows,
      attendance: attendanceRes.rows,
      timeOffRequests: timeOffRes.rows,
      payslips: payslipsRes.rows
    });
  } catch (err) {
    console.error('Fetch employee details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
  }
});

// POST /api/employees - Create Employee (ADMIN, HR_MANAGER, PAYROLL_USER)
router.post('/', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      department_id,
      designation_id,
      manager_id,
      joining_date,
      status,
      profile_image,
      gender,
      date_of_birth,
      address,
      bank_name,
      bank_account_number,
      bank_ifsc_swift,
      tax_identifier,
      role_id,
      role_code,
      create_contract,
      contract_type,
      wage,
      salary_structure_id,
      working_schedule_id
    } = req.body;

    if (!first_name || !last_name || !email || !joining_date) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, and joining date are required' });
    }

    // Check duplicate email
    const existing = await query('SELECT id FROM employees WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An employee with this email already exists' });
    }

    // Generate unique employee code
    const countRes = await query('SELECT COUNT(*) FROM employees');
    const empNum = parseInt(countRes.rows[0].count, 10) + 1001;
    const employee_code = `EMP-${empNum}`;

    const empId = uuidv4();

    // 1. Link to existing User account or create a new one
    const userRes = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    let userId;
    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
    } else {
      userId = uuidv4();
      const defaultPassword = await bcrypt.hash('Employee@123', 10);
      await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)`,
        [userId, email.trim().toLowerCase(), defaultPassword, first_name.trim(), last_name.trim(), phone || null]
      );
    }

    // Determine target role (from role_id, role_code, or default EMPLOYEE)
    let targetRoleId = role_id;
    if (!targetRoleId && role_code) {
      const rRes = await query('SELECT id FROM roles WHERE code = $1', [role_code]);
      if (rRes.rows.length > 0) targetRoleId = rRes.rows[0].id;
    }
    if (!targetRoleId) {
      const empRoleRes = await query("SELECT id FROM roles WHERE code = 'EMPLOYEE'");
      if (empRoleRes.rows.length > 0) targetRoleId = empRoleRes.rows[0].id;
    }

    if (targetRoleId) {
      await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      await query(
        `INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [uuidv4(), userId, targetRoleId]
      );
    }

    // 2. Create Employee
    await query(
      `INSERT INTO employees (
        id, user_id, employee_code, first_name, last_name, email, phone,
        department_id, designation_id, manager_id, joining_date, status,
        profile_image, gender, date_of_birth, address, bank_name,
        bank_account_number, bank_ifsc_swift, tax_identifier, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        empId, userId, employee_code, first_name.trim(), last_name.trim(), email.trim().toLowerCase(),
        phone || null, department_id || null, designation_id || null, manager_id || null,
        joining_date, status || 'ACTIVE', profile_image || null, gender || null,
        date_of_birth || null, address || null, bank_name || null,
        bank_account_number || null, bank_ifsc_swift || null, tax_identifier || null
      ]
    );

    // 3. Create initial contract if requested or if wage is provided
    const numericWage = parseFloat(wage);
    if (create_contract || (!isNaN(numericWage) && numericWage > 0)) {
      let structId = salary_structure_id;
      if (!structId) {
        const sRes = await query('SELECT id FROM salary_structures WHERE is_active = TRUE LIMIT 1');
        structId = sRes.rows[0]?.id;
      }
      let schedId = working_schedule_id;
      if (!schedId) {
        const scRes = await query('SELECT id FROM working_schedules WHERE is_active = TRUE LIMIT 1');
        schedId = scRes.rows[0]?.id;
      }

      if (structId && schedId) {
        const contractId = uuidv4();
        await query(
          `INSERT INTO contracts (id, employee_id, contract_start_date, contract_type, salary_structure_id, wage, working_schedule_id, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', CURRENT_TIMESTAMP)`,
          [contractId, empId, joining_date, contract_type || 'PERMANENT', structId, !isNaN(numericWage) ? numericWage : 0, schedId]
        );
      }
    }

    // 4. Create default leave allocations
    const leaveTypes = await query('SELECT * FROM time_off_types WHERE is_allocation_required = TRUE AND is_active = TRUE');
    const currentYear = new Date().getFullYear();
    for (const lt of leaveTypes.rows) {
      const allocId = uuidv4();
      const days = parseFloat(lt.default_days_per_year) || 12;
      await query(
        `INSERT INTO leave_allocations (id, employee_id, time_off_type_id, year, allocated_days, used_days, remaining_days, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, 'ACTIVE', CURRENT_TIMESTAMP)`,
        [allocId, empId, lt.id, currentYear, days, days]
      );
    }

    await logAudit(req.user.id, 'CREATE_EMPLOYEE', 'employees', empId, { employee_code, first_name, last_name, email, role: role_code }, req);

    res.status(201).json({
      success: true,
      message: `Employee ${first_name} ${last_name} (${employee_code}) created successfully`,
      employeeId: empId,
      employeeCode: employee_code
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - Update Employee & Contract & Role
router.put('/:id', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, department_id, designation_id,
      manager_id, joining_date, status, profile_image, gender, date_of_birth,
      address, bank_name, bank_account_number, bank_ifsc_swift, tax_identifier,
      role_id, role_code, wage, salary_structure_id, working_schedule_id, contract_type
    } = req.body;

    // 1. Update Employee record
    await query(
      `UPDATE employees SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        department_id = $5,
        designation_id = $6,
        manager_id = $7,
        joining_date = COALESCE($8, joining_date),
        status = COALESCE($9, status),
        profile_image = COALESCE($10, profile_image),
        gender = COALESCE($11, gender),
        date_of_birth = $12,
        address = COALESCE($13, address),
        bank_name = COALESCE($14, bank_name),
        bank_account_number = COALESCE($15, bank_account_number),
        bank_ifsc_swift = COALESCE($16, bank_ifsc_swift),
        tax_identifier = COALESCE($17, tax_identifier),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $18`,
      [
        first_name || null, last_name || null, email ? email.trim().toLowerCase() : null, phone || null,
        department_id || null, designation_id || null, manager_id || null, joining_date || null,
        status || null, profile_image || null, gender || null, date_of_birth || null,
        address || null, bank_name || null, bank_account_number || null, bank_ifsc_swift || null,
        tax_identifier || null, id
      ]
    );

    // 2. Update or create active contract if wage is specified
    if (wage !== undefined && wage !== null && wage !== '') {
      const numericWage = parseFloat(wage);
      if (!isNaN(numericWage)) {
        let structId = salary_structure_id;
        if (!structId) {
          const sRes = await query('SELECT id FROM salary_structures WHERE is_active = TRUE LIMIT 1');
          structId = sRes.rows[0]?.id;
        }
        let schedId = working_schedule_id;
        if (!schedId) {
          const scRes = await query('SELECT id FROM working_schedules WHERE is_active = TRUE LIMIT 1');
          schedId = scRes.rows[0]?.id;
        }

        const activeCont = await query('SELECT id FROM contracts WHERE employee_id = $1 AND status = $2', [id, 'ACTIVE']);
        if (activeCont.rows.length > 0) {
          await query(
            `UPDATE contracts SET
              wage = $1,
              salary_structure_id = COALESCE($2, salary_structure_id),
              working_schedule_id = COALESCE($3, working_schedule_id),
              contract_type = COALESCE($4, contract_type),
              updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [numericWage, structId || null, schedId || null, contract_type || null, activeCont.rows[0].id]
          );
        } else if (structId && schedId) {
          await query(
            `INSERT INTO contracts (id, employee_id, contract_start_date, contract_type, salary_structure_id, wage, working_schedule_id, status, created_at)
             VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, 'ACTIVE', CURRENT_TIMESTAMP)`,
            [uuidv4(), id, contract_type || 'PERMANENT', structId, numericWage, schedId]
          );
        }
      }
    }

    // 3. Update User account & Role if applicable
    const empUserRes = await query('SELECT user_id FROM employees WHERE id = $1', [id]);
    if (empUserRes.rows.length > 0 && empUserRes.rows[0].user_id) {
      const targetUserId = empUserRes.rows[0].user_id;

      if (first_name || last_name || email || phone) {
        await query(
          `UPDATE users SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [first_name || null, last_name || null, email ? email.trim().toLowerCase() : null, phone || null, targetUserId]
        );
      }

      let targetRoleId = role_id;
      if (!targetRoleId && role_code) {
        const rRes = await query('SELECT id FROM roles WHERE code = $1', [role_code]);
        if (rRes.rows.length > 0) targetRoleId = rRes.rows[0].id;
      }
      if (targetRoleId) {
        await query('DELETE FROM user_roles WHERE user_id = $1', [targetUserId]);
        await query(
          `INSERT INTO user_roles (id, user_id, role_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [uuidv4(), targetUserId, targetRoleId]
        );
      }
    }

    await logAudit(req.user.id, 'UPDATE_EMPLOYEE', 'employees', id, { first_name, last_name, status, role_code, wage }, req);
    res.json({ success: true, message: 'Employee and contract details updated successfully' });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Delete Employee (ADMIN, HR_MANAGER, PAYROLL_USER)
router.delete('/:id', checkRole(ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.PAYROLL_USER), async (req, res) => {
  try {
    const { id } = req.params;
    const empRes = await query('SELECT e.*, u.email as user_email FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1', [id]);
    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const emp = empRes.rows[0];
    if (emp.user_email === 'admin@peoplepay360.com') {
      return res.status(403).json({ success: false, message: 'Cannot delete primary system Administrator' });
    }

    // Clean up dependent records safely
    await query('DELETE FROM payments WHERE employee_id = $1', [id]);
    await query('DELETE FROM payslip_lines WHERE payslip_id IN (SELECT id FROM payslips WHERE employee_id = $1)', [id]);
    await query('DELETE FROM payslips WHERE employee_id = $1', [id]);
    await query('DELETE FROM payroll_employees WHERE employee_id = $1', [id]);
    await query('DELETE FROM time_off_requests WHERE employee_id = $1', [id]);
    await query('DELETE FROM leave_allocations WHERE employee_id = $1', [id]);
    await query('DELETE FROM attendance WHERE employee_id = $1', [id]);
    await query('DELETE FROM contracts WHERE employee_id = $1', [id]);
    await query('DELETE FROM employees WHERE id = $1', [id]);

    if (emp.user_id) {
      await query('DELETE FROM user_roles WHERE user_id = $1', [emp.user_id]);
      await query('DELETE FROM users WHERE id = $1', [emp.user_id]);
    }

    await logAudit(req.user.id, 'DELETE_EMPLOYEE', 'employees', id, { employee_code: emp.employee_code, name: `${emp.first_name} ${emp.last_name}` }, req);
    res.json({ success: true, message: `Employee ${emp.first_name} ${emp.last_name} deleted successfully` });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
});

module.exports = router;
