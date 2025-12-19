const db = require('../config/db');

class Firmware {
    static async getLatest(profile) {
        const result = await db.query(
            `SELECT * FROM firmware_updates 
             WHERE device_profile = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [profile]
        );
        return result.rows[0];
    }

    static async create({ version, file_url, checksum, device_profile, is_mandatory }) {
        const result = await db.query(
            `INSERT INTO firmware_updates 
             (version, file_url, checksum, device_profile, is_mandatory)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [version, file_url, checksum, device_profile, is_mandatory]
        );
        return result.rows[0];
    }

    static async updateDeviceVersion(deviceId, version) {
        // Simple legacy update
        const result = await db.query(
            `UPDATE devices 
             SET firmware_version = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE device_id = $2 RETURNING *`,
            [version, deviceId]
        );
        return result.rows[0];
    }

    static async logInstall(deviceId, version, slot, status, reason = null) {
        // Get UUID first
        const dev = await db.query('SELECT id FROM devices WHERE device_id = $1', [deviceId]);
        if (!dev.rows[0]) return;

        await db.query(
            `INSERT INTO firmware_install_logs (device_uuid, firmware_version, slot_used, status, reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [dev.rows[0].id, version, slot, status, reason]
        );
    }

    static async updateSlots(deviceId, activeSlot, prevSlot, lastGood) {
        await db.query(
            `UPDATE devices 
             SET active_firmware_slot = $2, 
                 previous_firmware_slot = $3,
                 last_known_good_firmware = $4,
                 ota_in_progress = FALSE,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE device_id = $1`,
            [deviceId, activeSlot, prevSlot, lastGood]
        );
    }

    static async setOTAInProgress(deviceId, inProgress) {
        await db.query(
            `UPDATE devices SET ota_in_progress = $2 WHERE device_id = $1`,
            [deviceId, inProgress]
        );
    }
}

module.exports = Firmware;
