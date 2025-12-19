const db = require('../config/db');

class User {
    static async findByEmail(email) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findByPhone(phone) {
        const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async create({ email, phone, password_hash }) {
        const result = await db.query(
            'INSERT INTO users (email, phone, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [email, phone, password_hash]
        );
        return result.rows[0];
    }
}

module.exports = User;
