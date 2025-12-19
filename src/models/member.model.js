const db = require('../config/db');

class Member {
    static async add(deviceUuid, userId, role) {
        const result = await db.query(
            `INSERT INTO device_members (device_uuid, user_id, role) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (device_uuid, user_id) DO UPDATE SET role = EXCLUDED.role
             RETURNING *`,
            [deviceUuid, userId, role]
        );
        return result.rows[0];
    }

    static async remove(deviceUuid, userId) {
        await db.query(
            'DELETE FROM device_members WHERE device_uuid = $1 AND user_id = $2',
            [deviceUuid, userId]
        );
    }

    static async list(deviceUuid) {
        // returning user details too
        const result = await db.query(
            `SELECT dm.*, u.email, u.name 
             FROM device_members dm
             JOIN users u ON dm.user_id = u.id
             WHERE dm.device_uuid = $1
             ORDER BY dm.created_at ASC`,
            [deviceUuid]
        );
        return result.rows;
    }

    static async getRole(deviceUuid, userId) {
        const result = await db.query(
            'SELECT role FROM device_members WHERE device_uuid = $1 AND user_id = $2',
            [deviceUuid, userId]
        );
        return result.rows[0] ? result.rows[0].role : null;
    }
}

module.exports = Member;
