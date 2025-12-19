const cron = require('node-cron');
const Automation = require('../models/automation.model');
const socketService = require('./socket.service');

// Store active cron tasks in memory: { automationId: cronTask }
const activeTasks = {};

const loadJobs = async () => {
    console.log("Scheduler: Loading jobs...");

    // Stop all existing tasks first (simple reload strategy)
    Object.values(activeTasks).forEach(task => task.stop());
    for (const id in activeTasks) delete activeTasks[id];

    try {
        const automations = await Automation.getAllEnabled(); // Need to implement this in Model
        console.log(`Scheduler: Found ${automations.length} active automations.`);

        automations.forEach(auto => {
            scheduleJob(auto);
        });
    } catch (e) {
        console.error("Scheduler Load Error:", e);
    }
};

const scheduleJob = (auto) => {
    // auto: { id, schedule_cron, device_id, switch_index, action }
    if (!cron.validate(auto.schedule_cron)) {
        console.error(`Invalid Cron: ${auto.schedule_cron} for Auto ID: ${auto.id}`);
        return;
    }

    const task = cron.schedule(auto.schedule_cron, async () => {
        console.log(`⏰ Executing Automation ${auto.id}: Device ${auto.device_id} Switch ${auto.switch_index} -> ${auto.action}`);

        try {
            await socketService.emitToDevice(auto.device_id, 'switch:toggle', {
                switch_index: auto.switch_index,
                state: auto.action === 'ON'
            });

            // Log Activity
            // We need device UUID for logging. `auto.device_id` is likely the UUID string from DB `device_id` column?
            // Wait, schema for automation usually links via UUID. Let's check automation model if needed.
            // Assuming `auto.device_id` is the UUID PK (device_uuid) based on standard FK practices.
            // If it is string ID, we need UUID.
            // Let's assume `auto.device_id` IS the UUID (as per usual FK).

            const Log = require('../models/log.model');
            await Log.create({
                device_uuid: auto.device_id,
                user_id: null, // Automation has no user context at runtime
                switch_id: auto.switch_index,
                event_type: 'AUTOMATION',
                description: `Automation executed: Switch ${auto.switch_index} turned ${auto.action}`,
                source: 'AUTOMATION'
            });

        } catch (e) {
            console.error("Execution Error:", e);
        }
    });

    activeTasks[auto.id] = task;
};

// Hook to call when automation is Created/Deleted
const reload = () => {
    loadJobs();
};

module.exports = { loadJobs, reload };
