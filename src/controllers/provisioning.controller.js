const jwt = require('jsonwebtoken');
const Device = require('../models/device.model');
const Switch = require('../models/switch.model');
const config = require('../config/env');

// App calls this to get a temporary token to pass to the device via BLE
exports.getProvisioningToken = async (req, res) => {
    try {
        const { device_id } = req.body;

        if (!device_id) {
            return res.status(400).json({ message: 'Device ID is required' });
        }

        // Check if device exists
        const device = await Device.findByDeviceId(device_id);
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        if (device.provisioned) {
            return res.status(409).json({ message: 'Device already provisioned' });
        }

        // Create a short-lived token containing user ID
        const token = jwt.sign(
            { id: req.user.id, device_id: device_id, scope: 'provisioning' },
            config.jwt.secret,
            { expiresIn: '15m' } // Valid for 15 minutes setup window
        );

        // Store token in DB
        await Device.saveProvisioningToken(device.id, token);

        res.json({ provisioning_token: token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Device calls this (via WiFi) to bind itself to the user
exports.bindDevice = async (req, res) => {
    // Helper to log attempts
    const logAttempt = async (status, reason = null) => {
        try {
            await Device.logProvisioningAttempt(
                req.body.device_id || 'unknown',
                req.ip || req.connection.remoteAddress,
                status,
                reason
            );
        } catch (e) {
            console.error("Logging failed:", e);
        }
    };

    try {
        const {
            device_id,
            device_secret,
            provisioning_token,
            device_profile,
            total_switches,
            relay_map
        } = req.body;

        if (!device_id || !device_secret || !provisioning_token) {
            await logAttempt('failed', 'Missing required fields');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 1. Verify Device Credentials
        let device = await Device.findByDeviceId(device_id);

        if (!device) {
            await logAttempt('failed', 'Device not found');
            return res.status(404).json({ message: 'Device not found (Invalid ID)' });
        }

        if (device.device_secret !== device_secret) {
            await logAttempt('failed', 'Invalid Secret');
            return res.status(403).json({ message: 'Invalid device secret' });
        }

        // 2. Verify Provisioning Token (DB Check & Expiry)
        if (device.provisioning_token !== provisioning_token) {
            await logAttempt('failed', 'Token Mismatch');
            return res.status(403).json({ message: 'Invalid or expired provisioning token' });
        }

        // Check Expiry (Database Timestamp)
        const now = new Date();
        const expiry = new Date(device.provisioning_token_expiry);
        if (now > expiry) {
            await logAttempt('expired', 'Token Expired');
            return res.status(403).json({ message: 'Provisioning token has expired' });
        }

        // Also verify JWT structure/expiry (Double Check)
        let decoded;
        try {
            decoded = jwt.verify(provisioning_token, config.jwt.secret);
        } catch (e) {
            await logAttempt('failed', 'JWT Invalid/Expired');
            return res.status(403).json({ message: 'Token expired or invalid' });
        }

        if (decoded.scope !== 'provisioning') {
            await logAttempt('failed', 'Invalid Scope');
            return res.status(403).json({ message: 'Invalid token scope' });
        }

        const userId = decoded.id;

        // 3. Bind Device
        // Check if already owned?
        if (device.owner_id && device.owner_id !== userId) {
            await logAttempt('failed', 'Already Owned');
            return res.status(409).json({ message: 'Device already registered to another user' });
        }

        // Generate New Secret
        const crypto = require('crypto');
        const newSecret = crypto.randomBytes(16).toString('hex'); // 32 chars

        const updatedDevice = await Device.bindDevice(
            device_id,
            userId,
            device_profile || 'Unknown Profile',
            total_switches || 0,
            newSecret
        );

        // 4. Auto-create switches based on profile
        const existingSwitches = await Switch.getSwitchesByDeviceId(updatedDevice.id);

        if (existingSwitches.length === 0 && total_switches > 0 && Array.isArray(relay_map)) {
            const switchesToCreate = [];
            for (let i = 0; i < total_switches; i++) {
                switchesToCreate.push({
                    device_id: updatedDevice.id,
                    switch_index: i + 1,
                    label: `Switch ${i + 1}`,
                    relay_gpio: relay_map[i] || 0
                });
            }
            await Switch.createBatch(switchesToCreate);
        }

        await logAttempt('success');

        // Return New Secret to Device
        res.json({
            message: 'Device bound successfully',
            device: updatedDevice,
            new_device_secret: newSecret
        });

    } catch (err) {
        console.error(err);
        await logAttempt('error', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};
