const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

exports.hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

exports.comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// HMAC Signing for device commands (if we use it later)
// data: string payload
// secret: device_secret
exports.signDeviceCommand = (data, secret) => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};
