const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting heartbeat migration...');

        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
        `);
        console.log('Updated devices table with last_seen and is_online.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
