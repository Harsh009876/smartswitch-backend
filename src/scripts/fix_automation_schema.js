const db = require('../config/db');

async function fixAutomationSchema() {
    try {
        console.log('🔧 Requesting Schema Fix for Automations...');

        await db.pool.query(`
            ALTER TABLE automations 
            ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
        `);
        console.log('✅ Added "is_enabled" column to automations table.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err);
        process.exit(1);
    }
}

fixAutomationSchema();
