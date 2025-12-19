const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting LAN IP migration...');

        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS local_ip VARCHAR(50);
        `);
        console.log('Updated devices table with local_ip.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
