const Device = require('../models/device.model');
const crypto = require('crypto');

// Factory API Key (In production, load from ENV)
const FACTORY_API_KEY = process.env.FACTORY_API_KEY || 'FACTORY_SECRET_KEY_123';

exports.registerDevice = async (req, res) => {
    try {
        // 1. Security Check
        const apiKey = req.header('x-factory-api-key');
        if (apiKey !== FACTORY_API_KEY) {
            return res.status(403).json({ message: 'Unauthorized Factory Access' });
        }

        const { batch_id, count = 1, profile = 'SWITCH_4' } = req.body;

        const results = [];

        for (let i = 0; i < count; i++) {
            // 2. Generate Credentials
            const deviceId = `DEV_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            const deviceSecret = crypto.randomBytes(16).toString('hex');

            // 3. Create Device in DB
            // We use Device.create factory method which needs to be robust
            // Standard Device.create handles insertion.
            // We might need to update Device.create to handle 'device_profile' if not default.
            // But usually factory creates distinct ID/Secret, and provisioning sets the profile?
            // "Factory-only API to register devices... Generate device_id + device_secret"
            // Let's assume Profile is set at factory or default.
            // Let's use the existing Device.create which takes { device_id, device_secret }.

            await Device.create({ device_id: deviceId, device_secret: deviceSecret });

            // 4. Generate QR String
            // Format: IOT_PROV;{device_id};{device_secret}
            const qrString = `IOT_PROV;${deviceId};${deviceSecret}`;

            results.push({
                device_id: deviceId,
                device_secret: deviceSecret,
                qr_string: qrString
            });
        }

        res.json({
            batch_id: batch_id || 'MANUAL',
            created: results.length,
            devices: results
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Factory Registration Error' });
    }
};
