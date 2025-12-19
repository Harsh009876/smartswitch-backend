const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
// const rateLimiter = require('../middlewares/rateLimiter'); 
// Can re-enable rate limiter if needed

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
