const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Switch UX Migration...');

        // 1. Switches Table: Add position and icon
        await db.pool.query(`
            ALTER TABLE switches 
            ADD COLUMN IF NOT EXISTS position INT,
            ADD COLUMN IF NOT EXISTS icon VARCHAR(30) DEFAULT 'power';
        `);

        // Update existing rows to have position = switch_index if position is null
        await db.pool.query(`
            UPDATE switches SET position = switch_index WHERE position IS NULL;
        `);

        console.log('Updated switches table with position and icon.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
