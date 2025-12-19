const crypto = require('crypto');

/**
 * Generates a numeric OTP of given length using crypto
 * @param {number} length - Length of OTP, default 6
 * @returns {string} - The generated OTP
 */
const generateOtp = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += crypto.randomInt(0, 10).toString();
    }
    return otp;
};

module.exports = { generateOtp };
