const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initDb() {
    try {
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema migration...');
        await db.pool.query(schemaSql);
        console.log('Schema applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying schema:', err);
        process.exit(1);
    }
}

initDb();
