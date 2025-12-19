const db = require('../config/db');

class Log {
    static async create({ device_uuid, user_id, switch_id, event_type, description, source }) {
        const result = await db.query(
            `INSERT INTO activity_logs (device_uuid, user_id, switch_id, event_type, description, source)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [device_uuid, user_id, switch_id, event_type, description, source]
        );
        return result.rows[0];
    }

    static async findByDevice(deviceUuid, limit = 50) {
        // Includes user name if user_id exists
        const result = await db.query(
            `SELECT l.*, u.name as user_name, u.email as user_email
             FROM activity_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.device_uuid = $1
             ORDER BY l.created_at DESC
             LIMIT $2`,
            [deviceUuid, limit]
        );
        return result.rows;
    }
}

module.exports = Log;
