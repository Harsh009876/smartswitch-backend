const otpService = require('../services/otp.service');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Handle Send OTP Request
 */
const sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Call Service
        const result = await otpService.sendOtp(phone);

        return res.json(result);
    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ error: "Failed to send OTP" });
    }
};

/**
 * Handle Verify OTP Request
 */
const verifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: "Phone and OTP are required" });
        }

        // 1. Verify OTP
        const verification = await otpService.verifyOtp(phone, otp);

        if (!verification.valid) {
            return res.status(400).json({ error: verification.message });
        }

        // 2. Find or Create User
        const user = await otpService.findOrCreateUser(phone);

        // 3. Generate JWT
        const token = jwt.sign(
            { id: user.id, phone: user.phone_number },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                phone: user.phone_number
            }
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ error: "Failed to verify OTP" });
    }
};

module.exports = { sendOtp, verifyOtp };
