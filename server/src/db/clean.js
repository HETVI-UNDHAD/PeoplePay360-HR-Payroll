const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function resetToCleanDatabase() {
  console.log('🧹 Wiping static dummy data & resetting to clean dynamic schema...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/peoplepay360_db'
  });

  const client = await pool.connect();

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

    // Drop all existing tables cleanly with CASCADE
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS payslip_lines CASCADE;
      DROP TABLE IF EXISTS payslips CASCADE;
      DROP TABLE IF EXISTS payroll_employees CASCADE;
      DROP TABLE IF EXISTS payrolls CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS time_off_requests CASCADE;
      DROP TABLE IF EXISTS leave_allocations CASCADE;
      DROP TABLE IF EXISTS time_off_types CASCADE;
      DROP TABLE IF EXISTS contracts CASCADE;
      DROP TABLE IF EXISTS salary_rules CASCADE;
      DROP TABLE IF EXISTS salary_structures CASCADE;
      DROP TABLE IF EXISTS working_schedule_days CASCADE;
      DROP TABLE IF EXISTS working_schedules CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS designations CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS user_roles CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS companies CASCADE;
    `);

    // Recreate schema
    await client.query(schemaSql);
    console.log('✅ Fresh relational tables created');

    // Run clean dynamic seed
    await client.query(seedSql);
    console.log('✅ Clean dynamic master records initialized (Admin: admin@peoplepay360.com / password123)');

    console.log('🎉 Database is now 100% clean and ready for real-time dynamic data entry!');
  } catch (err) {
    console.error('❌ Error resetting database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

resetToCleanDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
