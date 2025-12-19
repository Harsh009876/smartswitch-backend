const db = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Update devices table
        await db.pool.query(`
            ALTER TABLE devices 
            ADD COLUMN IF NOT EXISTS device_profile VARCHAR(50),
            ADD COLUMN IF NOT EXISTS total_switches INT,
            ADD COLUMN IF NOT EXISTS provisioned BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS provisioning_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS provisioning_token_expiry TIMESTAMP;
        `);
        console.log('Updated devices table.');

        // 2. Update switches table
        // We need to drop the check constraint if it exists to allow more than 6 switches if needed (though requirement says up to 8, existing check is 1-6)
        // Finding the constraint name is tricky in raw SQL without knowing it, but we can try dropping it by name if standard, or just altering the column.
        // For Postgres, we can try to drop the constraint if we know the name, usually 'switches_switch_index_check'.

        try {
            await db.pool.query(`ALTER TABLE switches DROP CONSTRAINT IF EXISTS switches_switch_index_check;`);
            console.log('Dropped old switch index constraint.');
        } catch (e) {
            console.log('Constraint might not exist or verify name:', e.message);
        }

        await db.pool.query(`
            ALTER TABLE switches 
            ADD COLUMN IF NOT EXISTS relay_gpio INT;
        `);
        console.log('Updated switches table.');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
