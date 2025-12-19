const Device = require('../models/device.model');
const Switch = require('../models/switch.model');
const redis = require('../config/redis');

exports.getMyDevices = async (req, res) => {
    try {
        const userId = req.user.id;
        const CACHE_KEY = `user:${userId}:devices`;

        // 1. Check Cache
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            console.log('⚡ Redis Cache Hit: My Devices');
            return res.json(JSON.parse(cached));
        }

        // 2. Fetch from DB
        const devices = await Device.findAllForUser(userId);

        const devicesWithSwitches = [];
        for (const dev of devices) {
            const switches = await Switch.getSwitchesByDeviceId(dev.id);
            devicesWithSwitches.push({ ...dev, switches });
        }

        // 3. Set Cache (Expire in 60s to allow near-realtime consistency but save DB logic)
        // Or infinite? No, better safe.
        await redis.setex(CACHE_KEY, 60, JSON.stringify(devicesWithSwitches));

        res.json(devicesWithSwitches);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleSwitch = async (req, res) => {
    try {
        const { switchId } = req.params;
        const { state } = req.body;

        // RBAC Check
        const db = require('../config/db');
        const result = await db.query(`
            SELECT s.*, d.owner_id, d.id as device_uuid 
            FROM switches s
            JOIN devices d ON s.device_id = d.id
            WHERE s.id = $1
        `, [switchId]); // switchId is UUID? Check if switch model uses UUID. Assuming yes from previous context.
        // Actually switchId might be the ID from switches table.

        const switchData = result.rows[0];

        if (!switchData) {
            return res.status(404).json({ message: 'Switch not found' });
        }

        let hasAccess = false;

        // 1. Owner
        if (switchData.owner_id === req.user.id) {
            hasAccess = true;
        } else {
            // 2./3. Member or Viewer?
            const memberRes = await db.query(
                'SELECT role FROM device_members WHERE device_uuid = $1 AND user_id = $2',
                [switchData.device_uuid, req.user.id]
            );
            if (memberRes.rows[0]) {
                const role = memberRes.rows[0].role;
                if (role === 'member') hasAccess = true; // Viewer cannot toggle
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized (Viewer/None)' });
        }

        const updatedSwitch = await Switch.updateState(switchId, state);

        // INVALIDATE CACHE
        // Who needs invalidation? The owner and any members?
        // Simple strategy: Invalidate Owner cache. Member caches are harder to track without list.
        // For now, simple clear of Owner.
        await redis.del(`user:${switchData.owner_id}:devices`);
        // Ideally we also clear cache for all members, but that requires querying members.
        // Optimization: Let cache expire naturally (60s) for members, or accept slight delay.

        // Send Socket Update
        const socketService = require('../services/socket.service');
        const Log = require('../models/log.model');

        // switchData.device_uuid has the UUID

        await socketService.emitToDevice(switchData.device_uuid, 'switch:toggle', {
            switch_index: switchData.switch_index,
            state: state
        });

        // Log Activity
        await Log.create({
            device_uuid: switchData.device_uuid,
            user_id: req.user.id,
            switch_id: switchData.switch_index, // Using switch_index vs DB ID? Use DB ID per schema for joins, but UI shows Index. 
            // Schema has `switch_id INTEGER`. Let's store DB ID `switchId` (PK of switch table)
            // Or store the user-friendly index? Let's use `switch_index` in description and real ID here.
            // Actually schema said switch_id INT. If joining with switches table, use PK. 
            // If just for display, index is easier. My plan said `switch_id`. 
            // Let's assume switch_id refers to the physical index for now as that's what user cares about ("Switch 1").
            // Alternatively, description handles readable part.
            event_type: 'TOGGLE',
            description: `Switch ${switchData.switch_index} turned ${state ? 'ON' : 'OFF'} by User`,
            source: 'APP'
        });

        res.json(updatedSwitch);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.heartbeat = async (req, res) => {
    try {
        const { device_id, device_secret, local_ip } = req.body;

        if (!device_id || !device_secret) {
            return res.status(400).json({ message: 'Missing credentials' });
        }

        const device = await Device.findByDeviceId(device_id);
        if (!device) {
            return res.status(404).json({ message: 'Device not found' });
        }

        if (device.device_secret !== device_secret) {
            return res.status(403).json({ message: 'Invalid secret' });
        }

        await Device.updateHeartbeat(device.id, local_ip || null);
        res.json({ status: 'ok' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
