const db = require('../config/db');
const bcrypt = require('bcrypt');
const { signToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');

class AuthService {

    async register({ email, phone, password }) {
        const hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (id, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, phone`,
            [uuidv4(), email, phone, hash]
        );

        const user = result.rows[0];
        const token = signToken({ userId: user.id });

        return { user, token };
    }

    async login({ emailOrPhone, password }) {
        const result = await db.query(
            `SELECT * FROM users
       WHERE email = $1 OR phone = $1`,
            [emailOrPhone]
        );

        if (result.rows.length === 0)
            throw new Error('User not found');

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match)
            throw new Error('Invalid password');

        const token = signToken({ userId: user.id });

        return {
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone
            },
            token
        };
    }
}

module.exports = new AuthService();
