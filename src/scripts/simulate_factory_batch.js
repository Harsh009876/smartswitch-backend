const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/factory/register';
const API_KEY = 'FACTORY_SECRET_KEY_123'; // Matches controller default

async function runBatch() {
    try {
        console.log('🏭 Starting Factory Batch for 5 Devices...');

        const response = await axios.post(API_URL,
            { count: 5, batch_id: 'BATCH_2025_001' },
            { headers: { 'x-factory-api-key': API_KEY } }
        );

        const data = response.data;
        console.log(`✅ Successfully created ${data.created} devices.`);

        console.log('\n--- QR CODES (Print these on labels) ---');
        data.devices.forEach((d, i) => {
            console.log(`[${i + 1}] ID: ${d.device_id} | QR: ${d.qr_string}`);
        });
        console.log('------------------------------------------\n');

        // Optional: Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `factory_batch_${timestamp}.json`;
        fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
        console.log(`💾 Saved batch data to ${filename}`);

    } catch (e) {
        console.error('❌ Batch Failed:', e.response ? e.response.data : e.message);
    }
}

runBatch();
