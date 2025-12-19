const db = require('../config/db');

async function fixSchema() {
    try {
        console.log('🔧 Starting DB Schema Fix...');

        // 1. Fix Automations Table
        await db.pool.query(`
            ALTER TABLE automations 
            ADD COLUMN IF NOT EXISTS schedule_cron VARCHAR(50);
        `);
        console.log('✅ Fixed automations table (added schedule_cron).');

        // 2. Fix Devices Table (Base + Migrations)
        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS device_id VARCHAR(50) UNIQUE,
            ADD COLUMN IF NOT EXISTS device_secret VARCHAR(100),
            ADD COLUMN IF NOT EXISTS owner_id UUID,
            ADD COLUMN IF NOT EXISTS local_ip VARCHAR(50),
            ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS device_profile VARCHAR(50),
            ADD COLUMN IF NOT EXISTS total_switches INT,
            ADD COLUMN IF NOT EXISTS provisioned BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS provisioning_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS provisioning_token_expiry TIMESTAMP,
            ADD COLUMN IF NOT EXISTS active_firmware_slot INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS ota_in_progress BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Fixed devices table (added missing columns).');

        // 3. Fix Switches Table
        await db.pool.query(`
            ALTER TABLE switches 
            ADD COLUMN IF NOT EXISTS relay_gpio INT,
            ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'lightbulb',
            ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
        `);
        console.log('✅ Fixed switches table.');

        console.log('🎉 Schema fix completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err);
        process.exit(1);
    }
}

fixSchema();
