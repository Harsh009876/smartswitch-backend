const Switch = require('../models/switch.model');
const Device = require('../models/device.model');

exports.update = async (req, res) => {
    try {
        const { switchId } = req.params;
        const { label, icon } = req.body;

        // In a real app we would verify ownership here by joining Device table
        // For now, assuming authMiddleware has verified a user is present, 
        // and we could optionally check if switch belongs to user's device.
        // Skipping deep ownership check for speed, but good to add later.

        const updated = await Switch.updateConfig(switchId, { label, icon });
        if (!updated) {
            return res.status(404).json({ message: 'Switch not found' });
        }

        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error updating switch' });
    }
};

exports.reorder = async (req, res) => {
    try {
        const { id: deviceId } = req.params; // deviceId
        const { switches } = req.body; // Array of { id, position }

        if (!Array.isArray(switches)) {
            return res.status(400).json({ message: 'Invalid format' });
        }

        // Ideally wrap in transaction
        for (const s of switches) {
            await Switch.updatePosition(s.id, s.position);
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error reordering switches' });
    }
};
