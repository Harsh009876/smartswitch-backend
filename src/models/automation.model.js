const db = require('../config/db');

class Automation {
    static async create(userId, name, CronExpression, action) {
        // action: { device_id, switch_index, action: 'ON'/'OFF' }
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Insert Automation
            const autoResult = await client.query(
                `INSERT INTO automations (user_id, name, schedule_cron) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [userId, name, CronExpression]
            );
            const automation = autoResult.rows[0];

            // Insert Action
            await client.query(
                `INSERT INTO automation_actions (automation_id, device_id, switch_index, action)
                 VALUES ($1, $2, $3, $4)`,
                [automation.id, action.device_id, action.switch_index, action.action]
            );

            await client.query('COMMIT');
            return automation;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    static async getAll(userId) {
        // Fetch automations with their actions
        // Minimal join for now (single action assumption)
        const query = `
            SELECT a.*, 
                   act.device_id, act.switch_index, act.action,
                   d.device_id as device_serial, d.name as device_name
            FROM automations a
            JOIN automation_actions act ON a.id = act.automation_id
            JOIN devices d ON act.device_id = d.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async delete(id, userId) {
        // Cascade delete handles actions
        const result = await db.query(
            'DELETE FROM automations WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );
        return result.rows[0];
    }

    // For Scheduler to load all enabled jobs
    static async getAllEnabled() {
        const query = `
            SELECT a.id, a.schedule_cron, a.user_id,
                   act.device_id, act.switch_index, act.action
            FROM automations a
            JOIN automation_actions act ON a.id = act.automation_id
            WHERE a.is_enabled = TRUE
        `;
        const result = await db.query(query);
        return result.rows;
    }
}

module.exports = Automation;
