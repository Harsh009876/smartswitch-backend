const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Device = require('../models/device.model');
const db = require('../config/db'); // Access to DB for switch updates

let io;

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow all for now (App/Dev)
            methods: ["GET", "POST"]
        }
    });

    console.log("Socket.IO initialized");

    io.on('connection', async (socket) => {
        const { auth } = socket.handshake;

        // --- DEVICE CONNECTION ---
        if (auth && auth.device_id && auth.device_secret) {
            try {
                const device = await Device.findByDeviceId(auth.device_id);
                if (device && device.device_secret === auth.device_secret) {
                    socket.join(`device:${device.id}`); // Room: device:UUID (DB ID)
                    socket.device = device;
                    console.log(`🔌 Device Connected: ${device.device_id}`);

                    // Handle ACK from Device
                    socket.on('device:ack', async (data) => {
                        // data: { switch_index, state }
                        console.log(`ACK from ${device.device_id}:`, data);

                        // Update DB (Optional but good for consistency)
                        // Using raw query for speed or model if available
                        // Assuming switch_index maps to database column
                        try {
                            await db.query(
                                `UPDATE switches SET is_on = $1 
                                 WHERE device_id = $2 AND switch_index = $3`,
                                [data.state, device.id, data.switch_index]
                            );

                            // Broadcast to User(s)
                            // We can emit to a room based on owner_id
                            if (device.owner_id) {
                                io.to(`user:${device.owner_id}`).emit('device:update', {
                                    device_id: device.device_id,
                                    switch_index: data.switch_index, // or switch_id if we fetch it
                                    state: data.state
                                });
                            }
                        } catch (e) {
                            console.error("Error processing ACK:", e);
                        }
                    });

                    socket.on('disconnect', () => {
                        console.log(`Device Disconnected: ${device.device_id}`);
                    });
                } else {
                    console.log(`Invalid Device Auth: ${auth.device_id}`);
                    socket.disconnect();
                }
            } catch (e) {
                console.error("Socket Device Auth Error:", e);
                socket.disconnect();
            }
        }
        // --- USER CONNECTION ---
        else if (auth && auth.token) {
            try {
                // Verify Token
                const decoded = jwt.verify(auth.token, config.jwt.secret);
                const userId = decoded.id;
                socket.join(`user:${userId}`);
                socket.userId = userId;
                console.log(`👤 User Connected: ${userId}`);

                // Handle Toggle Request
                socket.on('switch:toggle', async (data) => {
                    // data: { device_id, switch_index, state } (device_id is the string ID e.g. SW001)
                    console.log(`Toggle Req from User ${userId}:`, data);

                    try {
                        // verify ownership
                        // We need the DB ID of the device to emit to the room `device:DB_ID`
                        // OR we map device_id string to the room? 
                        // Let's verify via DB first.
                        const device = await Device.findByDeviceId(data.device_id);

                        if (device && device.owner_id === userId) {
                            // Emit to Device
                            // Room name uses DB ID (UUID) from previous step: `device:${device.id}`
                            io.to(`device:${device.id}`).emit('switch:toggle', {
                                switch_index: data.switch_index,
                                state: data.state
                            });
                        } else {
                            console.log("Unauthorized Toggle Attempt");
                            socket.emit('error', { message: "Unauthorized or Device not found" });
                        }
                    } catch (e) {
                        console.error("Toggle Error:", e);
                    }
                });

                socket.on('disconnect', () => {
                    console.log(`User Disconnected: ${userId}`);
                });

            } catch (e) {
                console.log("Socket User Auth Failed");
                socket.disconnect();
            }
        } else {
            // Unknown
            socket.disconnect();
        }
    });
};

// Helper to emit events to devices from other services (e.g. Schedule)
const emitToDevice = async (deviceId, event, data) => {
    if (!io) return false;
    // deviceId here is the Database UUID
    io.to(`device:${deviceId}`).emit(event, data);
    console.log(`📡 Emitted ${event} to device:${deviceId}`, data);
    return true;
};

module.exports = { init, emitToDevice };
