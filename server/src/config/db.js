const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { newDb } = require('pg-mem');

dotenv.config();

const TABLE_ORDER = [
  'companies',
  'roles',
  'users',
  'user_roles',
  'departments',
  'designations',
  'working_schedules',
  'working_schedule_days',
  'salary_structures',
  'salary_rules',
  'employees',
  'contracts',
  'attendance',
  'time_off_types',
  'leave_allocations',
  'time_off_requests',
  'payrolls',
  'payroll_employees',
  'payslips',
  'payslip_lines',
  'payments',
  'audit_logs'
];

const DB_STORE_PATH = path.join(__dirname, '../../data/db_store.json');
fs.mkdirSync(path.dirname(DB_STORE_PATH), { recursive: true });

let activePool = null;
let isPgMem = false;
let saveDebounceTimer = null;

// Dump all tables from in-memory DB to JSON
async function dumpAllTables() {
  if (!activePool) return {};
  const dump = {};
  for (const tbl of TABLE_ORDER) {
    try {
      const res = await activePool.query(`SELECT * FROM "${tbl}"`);
      dump[tbl] = res.rows || [];
    } catch (e) {
      dump[tbl] = [];
    }
  }
  return dump;
}

// Debounced disk save for pg-mem mode
function scheduleDiskSave() {
  if (!isPgMem) return;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      const data = await dumpAllTables();
      fs.writeFileSync(DB_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB] Failed to persist database state to disk:', err.message);
    }
  }, 50);
}

// Restore all tables from JSON dump
async function restoreFromDump(dump) {
  for (const tbl of TABLE_ORDER) {
    const rows = dump[tbl] || [];
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      const colNames = cols.map(c => `"${c}"`).join(', ');
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const vals = cols.map(c => row[c]);
      try {
        await activePool.query(
          `INSERT INTO "${tbl}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          vals
        );
      } catch (err) {
        console.warn(`[DB] Restore warning for table ${tbl}:`, err.message);
      }
    }
  }
}

// Initialize database
async function initDb() {
  const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');

  // 1. Try real PostgreSQL if configured
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    try {
      console.log('🔌 Connecting to PostgreSQL...');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
      });
      await pool.query('SELECT NOW()');
      console.log('✅ Connected to external PostgreSQL database');
      activePool = pool;
      isPgMem = false;

      // Ensure schema is executed
      await activePool.query(schemaSql);
      try {
        await activePool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5, 2) DEFAULT 0.00');
      } catch (mErr) {}
      const rolesCheck = await activePool.query('SELECT COUNT(*) as count FROM roles');
      if (parseInt(rolesCheck.rows[0]?.count || 0, 10) === 0) {
        console.log('🌱 Seeding master static config...');
        await activePool.query(seedSql);
      }
      return { type: 'postgres' };
    } catch (pgErr) {
      console.warn('⚠️ Could not connect to external PostgreSQL, falling back to persistent memory DB:', pgErr.message);
    }
  }

  // 2. In-Memory PostgreSQL (pg-mem) with file persistence
  console.log('🚀 Initializing PostgreSQL engine (pg-mem with JSON persistence)...');
  const memDb = newDb();

  memDb.public.registerFunction({
    name: 'current_database',
    implementation: () => 'peoplepay360_db'
  });

  memDb.public.none(schemaSql);

  const { Pool: MemPool } = memDb.adapters.createPg();
  activePool = new MemPool();
  isPgMem = true;

  if (fs.existsSync(DB_STORE_PATH)) {
    try {
      const savedData = JSON.parse(fs.readFileSync(DB_STORE_PATH, 'utf8'));
      await restoreFromDump(savedData);
      console.log('📂 Restored database state from local persistence store');
    } catch (err) {
      console.warn('⚠️ Could not restore saved store, running fresh seed:', err.message);
      await activePool.query(seedSql);
      const initialDump = await dumpAllTables();
      fs.writeFileSync(DB_STORE_PATH, JSON.stringify(initialDump, null, 2), 'utf8');
    }
  } else {
    console.log('🌱 Running minimal static seed (Admin only + configs)...');
    await activePool.query(seedSql);
    const initialDump = await dumpAllTables();
    fs.writeFileSync(DB_STORE_PATH, JSON.stringify(initialDump, null, 2), 'utf8');
    console.log('💾 Initial database state saved to disk');
  }

  console.log('✅ Database is ready and operational');
  return { type: 'pg-mem' };
}

// Universal query runner
async function query(sql, params = []) {
  if (!activePool) {
    throw new Error('Database not initialized. Call initDb() first.');
  }

  try {
    const result = await activePool.query(sql, params);

    // If writing in pg-mem mode, trigger debounced backup
    if (isPgMem && /^\s*(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql)) {
      scheduleDiskSave();
    }

    return {
      rows: result.rows || [],
      rowCount: result.rowCount !== undefined ? result.rowCount : (result.rows ? result.rows.length : 0)
    };
  } catch (err) {
    console.error(`[DB Error] ${err.message}\nQuery: ${sql.substring(0, 150)}...`);
    throw err;
  }
}

// Clean database back to initial seed state
async function cleanDb() {
  if (fs.existsSync(DB_STORE_PATH)) {
    fs.unlinkSync(DB_STORE_PATH);
  }
  return await initDb();
}

module.exports = {
  initDb,
  query,
  cleanDb,
  isInMemoryMode: () => isPgMem,
  getPool: () => activePool
};
