const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting OTA Migration...');

        // 1. Devices Table: Add firmware_version
        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(20) DEFAULT '1.0.0';
        `);
        console.log('Updated devices table with firmware_version.');

        // 2. Firmware Updates Table
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS firmware_updates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version VARCHAR(20) NOT NULL, -- SemVer e.g '1.2.0'
                file_url TEXT NOT NULL,
                checksum VARCHAR(64) NOT NULL, -- SHA-256
                device_profile VARCHAR(50) NOT NULL, -- e.g. 'SWITCH_4'
                is_mandatory BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(device_profile, version)
            );
        `);
        console.log('Created firmware_updates table.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
