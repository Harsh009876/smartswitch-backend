const express = require('express');
const router = express.Router();
const controller = require('../controllers/firmware.controller');

// Device Endpoints (Usually secured by device_secret, kept open for simplicity here or add middleware)
router.post('/check', controller.checkUpdate);
router.post('/report', controller.reportUpdate);

// Admin Endpoint (Should be protected)
router.post('/upload', controller.upload);

module.exports = router;
