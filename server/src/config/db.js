const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let memDb = null;
let isInMemory = false;

// Create pg Pool
function createPgPool() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return new Pool({ connectionString });
  }
  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'peoplepay360_db',
  });
}

let pgClient = null;

// Initialize PostgreSQL Database or fallback to in-memory PostgreSQL engine
async function initDb() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const seedPath = path.join(__dirname, '../db/seed.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  try {
    const testPool = createPgPool();
    // Test connection with 2 second timeout
    const client = await Promise.race([
      testPool.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL connection timeout')), 2500))
    ]);

    pool = testPool;
    pgClient = testPool;
    console.log('✅ Connected to Local PostgreSQL Database');

    // Run schema and seed
    await client.query(schemaSql);
    
    // Check if roles table has data, if not seed it
    const roleCheck = await client.query('SELECT COUNT(*) FROM roles');
    if (parseInt(roleCheck.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial PostgreSQL data...');
      await client.query(seedSql);
      console.log('✅ Seed data populated successfully');
    }
    client.release();
    return { type: 'postgres' };
  } catch (err) {
    console.warn('⚠️ Could not connect to external PostgreSQL server:', err.message);
    console.log('🔄 Initializing resilient In-Memory PostgreSQL engine (pg-mem) with full schema and seed...');

    isInMemory = true;
    memDb = newDb();
    
    // Register custom pg functions in pg-mem
    memDb.public.registerFunction({
      name: 'current_database',
      implementation: () => 'peoplepay360_db'
    });

    memDb.public.registerFunction({
      name: 'to_char',
      args: [memDb.public.getType('date'), memDb.public.getType('text')],
      returns: memDb.public.getType('text'),
      implementation: (dateVal, formatStr) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    });

    // Execute schema and seed in pg-mem
    memDb.public.none(schemaSql);
    memDb.public.none(seedSql);

    // Create pg-compatible client interface from pg-mem
    const { Pool: MemPool } = memDb.adapters.createPg();
    pgClient = new MemPool();

    console.log('✅ In-Memory PostgreSQL database ready with 5 Roles, Master Data, Employees & Rules');
    return { type: 'pg-mem' };
  }
}

// Unified Query Function
async function query(text, params = []) {
  if (pgClient) {
    try {
      const res = await pgClient.query(text, params);
      return res;
    } catch (err) {
      console.error('SQL Query Error:', err.message, '\nQuery:', text, '\nParams:', params);
      throw err;
    }
  }

  throw new Error('Database is not initialized. Call initDb() first.');
}

module.exports = {
  initDb,
  query,
  isInMemoryMode: () => isInMemory
};
