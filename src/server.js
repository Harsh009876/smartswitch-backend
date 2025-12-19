const app = require('./app');
const config = require('./config/env');
const db = require('./config/db');

// Check DB Connection
db.pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    } else {
        console.log("Database connected successfully. Time:", res.rows[0].now);
    }
});

const socketService = require('./services/socket.service');
const scheduler = require('./services/scheduler.service');

const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);

    // Initialize Socket.IO
    socketService.init(server);

    // Initialize Scheduler
    scheduler.loadJobs();

    // Background Task: Mark offline devices
    const Device = require('./models/device.model');
    setInterval(async () => {
        try {
            const offlineDevices = await Device.markOfflineDevices(60); // 60 seconds threshold
            if (offlineDevices.length > 0) {
                console.log(`Marked ${offlineDevices.length} devices offline:`, offlineDevices.map(d => d.device_id));
            }
        } catch (e) {
            console.error("Error in offline check:", e.message);
        }
    }, 60000); // Check every 60 seconds
});
