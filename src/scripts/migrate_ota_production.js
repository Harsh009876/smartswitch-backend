const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting Production OTA Migration...');

        // 1. Devices Table: Add A/B Slot columns
        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS active_firmware_slot CHAR(1) DEFAULT 'A', -- 'A' or 'B'
            ADD COLUMN IF NOT EXISTS previous_firmware_slot CHAR(1),
            ADD COLUMN IF NOT EXISTS last_known_good_firmware VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ota_in_progress BOOLEAN DEFAULT FALSE;
        `);
        console.log('Updated devices table with A/B slot columns.');

        // 2. Firmware Install Logs Table
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS firmware_install_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                device_id VARCHAR(50) NOT NULL, -- using device_id string or UUID? Let's use string for easy query or UUID if FK. 
                -- devices table uses UUID as PK but device_id as unique string. Let's use UUID FK for consistency if possible, or string.
                -- Device.model uses bindDevice with device_id string. 
                -- Let's stick to devices(id) UUID FK for integrity.
                device_uuid UUID REFERENCES devices(id) ON DELETE CASCADE,
                firmware_version VARCHAR(20) NOT NULL,
                slot_used CHAR(1) NOT NULL,
                status VARCHAR(20) NOT NULL, -- 'started', 'success', 'failed', 'rolled_back'
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created firmware_install_logs table.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
