const express = require('express');
const router = express.Router();
const factoryController = require('../controllers/factory.controller');

// Protected by Controller logic (or add middleware here)
router.post('/register', factoryController.registerDevice);

module.exports = router;
