const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, phone: user.phone },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

exports.register = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if (!email || !phone || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 🔍 Check existing user
        const exists = await pool.query(
            "SELECT id FROM users WHERE email=$1 OR phone=$2",
            [email, phone]
        );

        if (exists.rows.length > 0) {
            return res.status(409).json({
                message: "User already exists with this email or phone",
            });
        }

        // 🔐 Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // ✅ Insert user
        const result = await pool.query(
            `INSERT INTO users (email, phone, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, phone`,
            [email, phone, passwordHash]
        );

        const newUser = result.rows[0];
        const token = generateToken(newUser);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: newUser,
        });
    } catch (err) {
        console.error("REGISTER ERROR:", err.message);
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if ((!email && !phone) || !password) {
            return res.status(400).json({ message: "Email/Phone and Password required" });
        }

        const query = email
            ? "SELECT * FROM users WHERE email = $1"
            : "SELECT * FROM users WHERE phone = $1";
        const values = email ? [email] : [phone];

        const result = await pool.query(query, values);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user);
        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email, phone: user.phone }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err.message);
        res.status(500).json({ message: "Server error" });
    }
};
