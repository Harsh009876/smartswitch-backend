const io = require('socket.io-client');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DEVICE_ID = 'DEVICE_123';
const DEVICE_SECRET = 'SECRET_123';
const SERVER_URL = 'http://localhost:3000';
const LOCAL_PORT = 8080; // Simulating Device Port
const LOCAL_IP = '10.0.2.2'; // Use 10.0.2.2 for Android Emulator to reach Host
const STATE_FILE = path.join(__dirname, 'device_state.json');

// --- STATE MANAGEMENT (NVS Simulation) ---
let RELAY_STATES = { 1: false, 2: false, 3: false, 4: false }; // Defaults

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            RELAY_STATES = JSON.parse(fs.readFileSync(STATE_FILE));
            console.log('💾 [NVS] Loaded State:', RELAY_STATES);
        } else {
            console.log('✨ [NVS] Factory Default (All OFF)');
        }
    } catch (e) {
        console.error('State Load Error:', e.message);
    }
}

function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(RELAY_STATES));
        // console.log('💾 [NVS] State Saved');
    } catch (e) { console.error('State Save Error:', e.message); }
}

// Load immediately on boot
loadState();

// --- 1. SOCKET.IO CONNECTION ---
const socket = io(SERVER_URL, {
    auth: {
        device_id: DEVICE_ID,
        device_secret: DEVICE_SECRET
    }
});

socket.on('connect', () => {
    console.log(`✅ [Socket] Connected`);

    // SYNC: Report full state to cloud on reconnect (Power recovery)
    console.log('🔄 Syncing State to Cloud...');
    Object.keys(RELAY_STATES).forEach(key => {
        // Only send if ON? Or send all? Sending all ensures consistency.
        sendAck(parseInt(key), RELAY_STATES[key]);
    });
});

socket.on('switch:toggle', (data) => {
    console.log(`⚡ [Socket] Command: Switch ${data.switch_index} -> ${data.state}`);

    // Update & Save
    RELAY_STATES[data.switch_index] = data.state;
    saveState();

    sendAck(data.switch_index, data.state);
});

function sendAck(index, state) {
    socket.emit('device:ack', {
        switch_index: index,
        state: state
    });
    // console.log(`<<< [Socket] PID ACK Sent`); // Reduce noise
}

// --- 2. LOCAL HTTP SERVER (LAN) ---
app.post('/switch', (req, res) => {
    const { switch_index, state } = req.body;
    console.log(`🌐 [LAN] Command: Switch ${switch_index} -> ${state}`);

    // Update & Save
    RELAY_STATES[switch_index] = state;
    saveState();

    // Send Socket ACK anyway to keep cloud in sync (optional but good practice)
    sendAck(switch_index, state);

    res.json({ status: 'ok' });
});

app.listen(LOCAL_PORT, () => {
    console.log(`🚀 [Device] HTTP Server running on port ${LOCAL_PORT}`);
});

// --- 3. HEARTBEAT LOOP & OTA ---
let CURRENT_VERSION = '1.0.0'; // Factory
let ACTIVE_SLOT = 'A'; // Start on A
let PENDING_REBOOT_SLOT = null;

setInterval(async () => {
    try {
        // Heartbeat
        await axios.post(`${SERVER_URL}/api/device/heartbeat`, {
            device_id: DEVICE_ID,
            device_secret: DEVICE_SECRET,
            local_ip: `${LOCAL_IP}:${LOCAL_PORT}`
        });
        process.stdout.write('.');

        // OTA Check (Mocking occasional check)
        if (Math.random() > 0.7) {
            const otaRes = await axios.post(`${SERVER_URL}/api/firmware/check`, {
                device_id: DEVICE_ID,
                device_profile: 'SWITCH_4',
                current_version: CURRENT_VERSION
            });

            if (otaRes.data.update_available) {
                const NEW_VERSION = otaRes.data.version;
                console.log(`\n🚀 OTA Update Available: ${NEW_VERSION} (Mandatory: ${otaRes.data.mandatory})`);

                // Determine Target Slot
                const TARGET_SLOT = ACTIVE_SLOT === 'A' ? 'B' : 'A';
                console.log(`💿 Flashing to Inactive Slot: ${TARGET_SLOT}`);

                console.log(`⬇️  Downloading ${otaRes.data.url}...`);

                // Simulate download and verify
                setTimeout(async () => {
                    console.log(`📦 Verifying Checksum (${otaRes.data.checksum})... OK`);
                    console.log(`🔄 Rebooting to Slot ${TARGET_SLOT}...`);

                    // SIMULATE BOOT
                    // 20% Chance of Failure (Rollback test)
                    const bootSuccess = Math.random() > 0.2;

                    if (bootSuccess) {
                        const PREV_SLOT = ACTIVE_SLOT;
                        ACTIVE_SLOT = TARGET_SLOT;
                        CURRENT_VERSION = NEW_VERSION;
                        console.log(`✅ Boot Success! Active Slot: ${ACTIVE_SLOT}. Version: ${CURRENT_VERSION}`);

                        await axios.post(`${SERVER_URL}/api/firmware/report`, {
                            device_id: DEVICE_ID,
                            status: 'success',
                            version: CURRENT_VERSION,
                            slot_used: ACTIVE_SLOT,
                            previous_slot: PREV_SLOT
                        });
                    } else {
                        console.error(`💥 Boot Failed on Slot ${TARGET_SLOT}! Triggering Watchdog Rollback...`);
                        console.log(`🔙 Reverting to Slot ${ACTIVE_SLOT} (Version: ${CURRENT_VERSION})`);

                        // Report Rollback
                        await axios.post(`${SERVER_URL}/api/firmware/report`, {
                            device_id: DEVICE_ID,
                            status: 'rolled_back',
                            version: NEW_VERSION, // The bad version we tried
                            slot_used: TARGET_SLOT,
                            previous_slot: ACTIVE_SLOT
                        });
                    }
                }, 4000); // 4s Install Time
            }
        }

    } catch (e) {
        console.error('\n💔 Heartbeat/OTA Failed:', e.message);
    }
}, 10000); // Every 10s

