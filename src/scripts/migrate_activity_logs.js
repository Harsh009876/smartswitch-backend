const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Activity Logs Migration...');

        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_uuid UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for automation events
                switch_id INTEGER, -- Can be null if device-level event
                event_type VARCHAR(50) NOT NULL, -- TOGGLE, AUTOMATION, OTA, ERROR
                description TEXT,
                source VARCHAR(20) NOT NULL CHECK (source IN ('APP', 'DEVICE', 'AUTOMATION', 'SYSTEM')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_logs_device ON activity_logs(device_uuid);
            CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
        `);

        console.log('Created activity_logs table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
