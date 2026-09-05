const { initDb, query } = require('../src/config/db');
const { v4: uuidv4 } = require('uuid');

async function sync() {
  await initDb();
  const emps = await query('SELECT id FROM employees');
  const leaveTypes = await query('SELECT * FROM time_off_types WHERE is_allocation_required = TRUE AND is_active = TRUE');
  const currentYear = new Date().getFullYear();

  for (const emp of emps.rows) {
    for (const lt of leaveTypes.rows) {
      const existing = await query('SELECT id FROM leave_allocations WHERE employee_id = $1 AND time_off_type_id = $2 AND year = $3', [emp.id, lt.id, currentYear]);
      if (existing.rows.length === 0) {
        const days = parseFloat(lt.default_days_per_year) || 12;
        await query(
          `INSERT INTO leave_allocations (id, employee_id, time_off_type_id, year, allocated_days, used_days, remaining_days, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 0, $6, 'ACTIVE', CURRENT_TIMESTAMP)`,
          [uuidv4(), emp.id, lt.id, currentYear, days, days]
        );
        console.log(`Allocated ${days} days of ${lt.code} to employee ${emp.id}`);
      }
    }
  }
  console.log('Sync complete!');
  process.exit(0);
}
sync();
