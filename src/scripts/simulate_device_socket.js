const io = require('socket.io-client');

const DEVICE_ID = 'DEVICE_123';
const DEVICE_SECRET = 'SECRET_123';
const SERVER_URL = 'http://localhost:3000';

const socket = io(SERVER_URL, {
    auth: {
        device_id: DEVICE_ID,
        device_secret: DEVICE_SECRET
    }
});

socket.on('connect', () => {
    console.log(`✅ Device ${DEVICE_ID} Connected via Socket!`);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

socket.on('switch:toggle', (data) => {
    console.log(`⚡ Command Received: Switch ${data.switch_index} -> ${data.state}`);

    // Simulate relay delay
    setTimeout(() => {
        console.log(`<<< Emitting ACK for Switch ${data.switch_index}`);
        socket.emit('device:ack', {
            switch_index: data.switch_index,
            state: data.state
        });
    }, 500);
});

socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
});
