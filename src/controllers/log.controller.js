const Log = require('../models/log.model');
const Device = require('../models/device.model');
const Member = require('../models/member.model'); // For permission check if needed

exports.getLogs = async (req, res) => {
    try {
        const { id: deviceId } = req.params;

        // 1. Resolve Device UUID
        const device = await Device.findByDeviceId(deviceId);
        if (!device) return res.status(404).json({ message: 'Device not found' });

        // 2. Check Permission (Owner or Member can view logs)
        let hasAccess = false;
        if (device.owner_id === req.user.id) {
            hasAccess = true;
        } else {
            const role = await Member.getRole(device.id, req.user.id);
            if (role) hasAccess = true; // Any member/viewer can see logs? Yes, usually fine.
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized to view logs' });
        }

        const logs = await Log.findByDevice(device.id);
        res.json(logs);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching logs' });
    }
};
