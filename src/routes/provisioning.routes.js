const express = require('express');
const router = express.Router();
const provisioningController = require('../controllers/provisioning.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Validated User requests a token to give to the device
router.post('/request', authMiddleware, provisioningController.getProvisioningToken);

// Device calls this to bind (No auth middleware here, device uses secrets)
router.post('/confirm', provisioningController.bindDevice);

module.exports = router;
