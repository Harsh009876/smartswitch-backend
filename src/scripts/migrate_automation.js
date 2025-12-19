const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Automation Migration...');

        // Automations Table
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS automations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                is_enabled BOOLEAN DEFAULT TRUE,
                schedule_cron VARCHAR(50) NOT NULL, -- e.g. "0 8 * * *"
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Actions Table (One automation can trigger multiple actions, though UI might limit to 1 for now)
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS automation_actions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
                device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
                switch_index INTEGER NOT NULL,
                action VARCHAR(10) NOT NULL, -- "ON" or "OFF"
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Created automations and automation_actions tables.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
