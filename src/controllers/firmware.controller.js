const Firmware = require('../models/firmware.model');

// Compare SemVer (Simple implementation)
const isNewer = (current, latest) => {
    if (!current || !latest) return false;
    const cParts = current.split('.').map(Number);
    const lParts = latest.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (lParts[i] > cParts[i]) return true;
        if (lParts[i] < cParts[i]) return false;
    }
    return false;
};

exports.checkUpdate = async (req, res) => {
    try {
        const { device_profile, current_version, device_id } = req.body;
        // Need device_id to set OTA in progress flag if we found an update

        const latest = await Firmware.getLatest(device_profile);

        if (latest && isNewer(current_version, latest.version)) {
            // Optional: Mark OTA in progress here or when device confirms start?
            // Marking here assumes device WILL proceed. Safe for now.
            if (device_id) {
                await Firmware.setOTAInProgress(device_id, true);
                await Firmware.logInstall(device_id, latest.version, 'UNKNOWN', 'started', 'Check Update');
            }

            res.json({
                update_available: true,
                version: latest.version,
                url: latest.file_url,
                checksum: latest.checksum,
                mandatory: latest.is_mandatory
            });
        } else {
            res.json({ update_available: false });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error checking updates' });
    }
};

exports.reportUpdate = async (req, res) => {
    try {
        const { device_id, status, version, slot_used, previous_slot } = req.body;
        // status: 'success' | 'failed' | 'rolled_back'
        // slot_used: 'A' or 'B' (The slot we TRIED to boot)

        console.log(`📡 Device ${device_id} OTA Report: ${status} (${version}) Slot: ${slot_used}`);

        if (status === 'success') {
            // Success: Make active slot = slot_used
            // previous slot = previous_slot (or active before switch)
            // last_good = version
            await Firmware.updateSlots(device_id, slot_used, previous_slot, version);
            await Firmware.updateDeviceVersion(device_id, version); // Keep legacy column updated too
            await Firmware.logInstall(device_id, version, slot_used, 'success');
        } else {
            // Failed/Rolled Back:
            // Active slot remains OLD slot (implied, or we can enforce it if device tells us current active)
            // We just log it and clear OTA flag
            await Firmware.setOTAInProgress(device_id, false);
            await Firmware.logInstall(device_id, version, slot_used, 'rolled_back', 'Device reported failure');
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error reporting update' });
    }
};

// Admin only (Mocked for now)
exports.upload = async (req, res) => {
    try {
        const firmware = await Firmware.create(req.body);
        res.status(201).json(firmware);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error uploading firmware' });
    }
};
