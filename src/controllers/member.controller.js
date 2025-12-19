const Member = require('../models/member.model');
const Device = require('../models/device.model');
const User = require('../models/user.model');
// Assuming User model exists and has findByEmail? Need to verify.
// If User model doesn't handle findByEmail, I might need to add it or do raw query.
// Let's assume User.findByEmail exists or use db query here effectively.

const db = require('../config/db'); // Direct DB access for user lookup if needed

exports.listMembers = async (req, res) => {
    try {
        const { id: deviceId } = req.params; // This is string ID usually, need UUID

        // 1. Get Device UUID
        const device = await Device.findByDeviceId(deviceId); // Returns row with id (UUID)
        if (!device) return res.status(404).json({ message: 'Device not found' });

        // 2. Add Owner to list? Or separate? 
        // Logic: Return owner + members
        // Actually, just members table. Owner is implicit. UI can show owner separately.

        const members = await Member.list(device.id);
        res.json(members);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching members' });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { id: deviceId } = req.params;
        const { email, role } = req.body;

        if (!['member', 'viewer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const device = await Device.findByDeviceId(deviceId);
        if (!device) return res.status(404).json({ message: 'Device not found' });

        // Check Permissions: Only Owner can add
        if (device.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can add members' });
        }

        // Find User by Email
        const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        const targetUser = userRes.rows[0];

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.id === device.owner_id) {
            return res.status(400).json({ message: 'Cannot add owner as member' });
        }

        const member = await Member.add(device.id, targetUser.id, role);
        res.json(member);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error adding member' });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { id: deviceId, userId } = req.params;

        const device = await Device.findByDeviceId(deviceId);
        if (!device) return res.status(404).json({ message: 'Device not found' });

        // Check Permissions: Only Owner can remove
        if (device.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Only owner can remove members' });
        }

        await Member.remove(device.id, userId);
        res.json({ message: 'Member removed' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error removing member' });
    }
};
