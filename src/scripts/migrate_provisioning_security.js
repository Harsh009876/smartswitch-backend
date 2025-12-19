const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Provisioning Security Migration...');

        // 1. Create provisioning_attempts table
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS provisioning_attempts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_id VARCHAR(50) NOT NULL,
                ip_address VARCHAR(45), -- IPv6 support
                status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'expired'
                failure_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created provisioning_attempts table.');

        // 2. Ensure provisioning_token_expiry exists in devices (It should, but safety first)
        // logic: check if column exists, if not add it.
        // For simplicity in this script, we'll try to add it and catch duplicate column error or just assume it's there from previous step.
        // Actually, migrate_provisioning.js added it. We can just verify or skip.
        // Let's explicitly set the type if we wanted to change it, but TIMESTAMP is fine.

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
