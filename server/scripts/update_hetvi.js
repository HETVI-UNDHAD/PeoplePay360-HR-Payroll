const { initDb, query } = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

async function updateHetvi() {
  await initDb();
  const empRes = await query("SELECT id, user_id FROM employees WHERE employee_code = 'EMP-1001'");
  if (empRes.rows.length > 0) {
    const empId = empRes.rows[0].id;
    await query(
      "UPDATE employees SET department_id = 'dept-eng', designation_id = 'desig-eng-1', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [empId]
    );
    const structRes = await query("SELECT id FROM salary_structures WHERE is_active = TRUE LIMIT 1");
    const schedRes = await query("SELECT id FROM working_schedules WHERE is_active = TRUE LIMIT 1");
    const contRes = await query("SELECT id FROM contracts WHERE employee_id = $1", [empId]);
    if (contRes.rows.length === 0) {
      await query(
        "INSERT INTO contracts (id, employee_id, contract_start_date, contract_type, salary_structure_id, wage, working_schedule_id, status, created_at) VALUES ($1, $2, CURRENT_DATE, 'PERMANENT', $3, 7500, $4, 'ACTIVE', CURRENT_TIMESTAMP)",
        [uuidv4(), empId, structRes.rows[0].id, schedRes.rows[0].id]
      );
    } else {
      await query("UPDATE contracts SET wage = 7500, status = 'ACTIVE' WHERE employee_id = $1", [empId]);
    }
    console.log('✅ Hetvi EMP-1001 profile and contract updated!');
  }
  process.exit(0);
}
updateHetvi();
