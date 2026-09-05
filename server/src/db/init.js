const { initDb } = require('../config/db');

async function main() {
  console.log('🚀 Initializing PeoplePay360 Database...');
  try {
    const result = await initDb();
    console.log(`✨ Database successfully initialized using ${result.type.toUpperCase()}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  }
}

main();
