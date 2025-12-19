const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Device Members Migration...');

        // 1. Create Device Members Table
        // Note: We use device_id string or device UUID? 
        // Existing tables: devices(id UUID PK), users(id UUID PK).
        // Best to use UUID Foreign Keys.

        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS device_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_uuid UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'viewer')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(device_uuid, user_id)
            );
        `);

        console.log('Created device_members table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
