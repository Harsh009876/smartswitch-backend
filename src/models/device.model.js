const db = require('../config/db');

class Device {
    static async findByDeviceId(deviceId) {
        const result = await db.query('SELECT * FROM devices WHERE device_id = $1', [deviceId]);
        return result.rows[0];
    }

    static async findByOwnerId(ownerId) {
        const result = await db.query('SELECT * FROM devices WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
        return result.rows;
    }

    static async findAllForUser(userId) {
        // Fetch Owned + Shared devices with roles
        const result = await db.query(
            `SELECT d.*, 'owner' as role 
             FROM devices d 
             WHERE d.owner_id = $1
             UNION
             SELECT d.*, m.role 
             FROM devices d 
             JOIN device_members m ON d.id = m.device_uuid 
             WHERE m.user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async bindDevice(deviceId, ownerId, profile, totalSwitches, newSecret) {
        const result = await db.query(
            `UPDATE devices 
             SET owner_id = $1, 
                 device_profile = $2, 
                 total_switches = $3, 
                 device_secret = $5, -- Rotate Secret
                 provisioned = TRUE, 
                 provisioning_token = NULL, 
                 provisioning_token_expiry = NULL,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE device_id = $4 RETURNING *`,
            [ownerId, profile, totalSwitches, deviceId, newSecret]
        );
        return result.rows[0];
    }

    static async saveProvisioningToken(deviceId, token) {
        // Valid for 15 minutes
        const result = await db.query(
            `UPDATE devices 
             SET provisioning_token = $1, 
                 provisioning_token_expiry = NOW() + INTERVAL '15 minutes' 
             WHERE device_id = $2 RETURNING *`,
            [token, deviceId]
        );
        return result.rows[0];
    }

    // Used for factory provisioning (inserting new devices into DB before shipping)
    static async create({ device_id, device_secret }) {
        const result = await db.query(
            'INSERT INTO devices (device_id, device_secret) VALUES ($1, $2) RETURNING *',
            [device_id, device_secret]
        );
        return result.rows[0];
    }

    static async updateHeartbeat(deviceId, localIp) {
        const result = await db.query(
            `UPDATE devices 
             SET last_seen = CURRENT_TIMESTAMP, 
                 is_online = TRUE,
                 local_ip = $2
             WHERE device_id = $1 RETURNING *`,
            [deviceId, localIp]
        );
        return result.rows[0];
    }

    static async markOfflineDevices(thresholdSeconds) {
        // e.g. thresholdSeconds = 60
        const result = await db.query(
            `UPDATE devices 
             SET is_online = FALSE,
                 local_ip = NULL
             WHERE is_online = TRUE 
               AND last_seen < (CURRENT_TIMESTAMP - make_interval(secs => $1)) 
             RETURNING id, device_id`,
            [thresholdSeconds]
        );
        return result.rows;
    }
}

module.exports = Device;
