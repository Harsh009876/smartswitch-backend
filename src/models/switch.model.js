const db = require('../config/db');

class Switch {
    static async getSwitchesByDeviceId(deviceId) {
        const result = await db.query(
            'SELECT * FROM switches WHERE device_id = $1 ORDER BY position ASC, switch_index ASC',
            [deviceId]
        );
        return result.rows;
    }

    static async updateState(id, state) {
        const result = await db.query(
            'UPDATE switches SET state = $1 WHERE id = $2 RETURNING *',
            [state, id]
        );
        return result.rows[0];
    }

    static async updateConfig(id, { label, icon }) {
        const result = await db.query(
            'UPDATE switches SET label = COALESCE($1, label), icon = COALESCE($2, icon) WHERE id = $3 RETURNING *',
            [label, icon, id]
        );
        return result.rows[0];
    }

    static async updatePosition(id, position) {
        await db.query(
            'UPDATE switches SET position = $1 WHERE id = $2',
            [position, id]
        );
    }

    static async create({ device_id, switch_index, label, relay_gpio }) {
        // Default position to index
        const result = await db.query(
            'INSERT INTO switches (device_id, switch_index, label, relay_gpio, state, position) VALUES ($1, $2, $3, $4, FALSE, $2) RETURNING *',
            [device_id, switch_index, label, relay_gpio]
        );
        return result.rows[0];
    }

    static async createBatch(switchesData) {
        const created = [];
        for (const s of switchesData) {
            created.push(await this.create(s));
        }
        return created;
    }
}

module.exports = Switch;
