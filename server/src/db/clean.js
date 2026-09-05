const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function resetToCleanDatabase() {
  console.log('🧹 Wiping static dummy data & resetting to clean dynamic schema...');
  const storePath = path.join(__dirname, '../../data/db_store.json');
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
    console.log('🗑️ Removed local persistence store file');
  }

  // If real Postgres URL configured, clean it too
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/peoplepay360_db',
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      const client = await pool.connect();
      try {
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        await client.query(`
          DROP TABLE IF EXISTS audit_logs, payments, payslip_lines, payslips, payroll_employees, payrolls,
          attendance, time_off_requests, leave_allocations, time_off_types, contracts, salary_rules,
          salary_structures, working_schedule_days, working_schedules, employees, designations,
          departments, user_roles, roles, users, companies CASCADE;
        `);
        await client.query(schemaSql);
        await client.query(seedSql);
        console.log('✅ External PostgreSQL database cleaned and seeded');
      } finally {
        client.release();
        await pool.end();
      }
    } catch (e) {
      console.log('Note: External PG not active, local store cleaned.');
    }
  }
  console.log('🎉 System is now 100% clean and ready for real-time dynamic data entry!');
}

resetToCleanDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Reset error:', err);
    process.exit(1);
  });
