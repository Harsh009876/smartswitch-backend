const db = require('../config/db');
const { generateOtp } = require('../utils/otpGenerator');
const { addMinutes, isExpired } = require('../utils/time');
const smsService = require('./sms.service');
const { v4: uuidv4 } = require('uuid');

class OtpService {

    /**
     * Send OTP
     * @param {string} phoneNumber
     */
    async sendOtp(phoneNumber) {
        const otp = generateOtp(6);
        const expiresAt = addMinutes(5);

        // 1️⃣ Invalidate previous OTPs
        await db.query(
            `
      UPDATE otp_sessions
      SET verified = TRUE
      WHERE phone = $1 AND verified = FALSE
      `,
            [phoneNumber]
        );

        // 2️⃣ Save new OTP
        await db.query(
            `
      INSERT INTO otp_sessions (
        id,
        phone,
        otp_code,
        expires_at,
        verified
      )
      VALUES ($1, $2, $3, $4, FALSE)
      `,
            [uuidv4(), phoneNumber, otp, expiresAt]
        );

        // 3️⃣ Send SMS
        const sent = await smsService.sendSms(phoneNumber, otp);
        if (!sent) {
            throw new Error('Failed to send SMS');
        }

        return { success: true, message: 'OTP sent successfully' };
    }

    /**
     * Verify OTP
     * @param {string} phoneNumber
     * @param {string} otp
     */
    async verifyOtp(phoneNumber, otp) {

        const result = await db.query(
            `
      SELECT *
      FROM otp_sessions
      WHERE phone = $1 AND verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1
      `,
            [phoneNumber]
        );

        if (result.rows.length === 0) {
            return { valid: false, message: 'No active OTP found' };
        }

        const session = result.rows[0];

        if (session.otp_code !== otp) {
            return { valid: false, message: 'Invalid OTP' };
        }

        if (isExpired(session.expires_at)) {
            return { valid: false, message: 'OTP expired' };
        }

        await db.query(
            `
      UPDATE otp_sessions
      SET verified = TRUE
      WHERE id = $1
      `,
            [session.id]
        );

        return { valid: true, message: 'OTP verified' };
    }

    /**
     * Find or create user
     * @param {string} phoneNumber
     */
    async findOrCreateUser(phoneNumber) {

        const userResult = await db.query(
            `SELECT * FROM users WHERE phone = $1`,
            [phoneNumber]
        );

        if (userResult.rows.length > 0) {
            return userResult.rows[0];
        }

        const newUser = await db.query(
            `
      INSERT INTO users (id, phone)
      VALUES ($1, $2)
      RETURNING *
      `,
            [uuidv4(), phoneNumber]
        );

        return newUser.rows[0];
    }
}

module.exports = new OtpService();
