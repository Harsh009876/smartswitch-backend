const Automation = require('../models/automation.model');
const scheduler = require('../services/scheduler.service');

exports.create = async (req, res) => {
    try {
        const { name, schedule, action } = req.body;
        // schedule: "0 8 * * *" (cron string)
        // action: { device_id, switch_index, action: 'ON' }

        const automation = await Automation.create(req.user.id, name, schedule, action);

        // Reload scheduler to pick up new job
        scheduler.reload();

        res.status(201).json(automation);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating automation' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const automations = await Automation.getAll(req.user.id);
        res.json(automations);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching automations' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await Automation.delete(id, req.user.id);

        scheduler.reload();

        res.json({ message: 'Deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error deleting automation' });
    }
};
