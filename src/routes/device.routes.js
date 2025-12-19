const express = require('express');
const router = express.Router();
const switchController = require('../controllers/switch.controller');
const deviceController = require('../controllers/device.controller');
const memberController = require('../controllers/member.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public/Device routes (No User Auth)
router.post('/device/heartbeat', deviceController.heartbeat);

router.use(authMiddleware); // Protect all routes below

router.get('/my-devices', deviceController.getMyDevices);
router.put('/switch/:switchId', deviceController.toggleSwitch);

// Switch UX Routes
router.patch('/switch/:switchId', switchController.update);
router.patch('/device/:id/reorder', switchController.reorder);

// Member Management Routes
router.get('/device/:id/members', memberController.listMembers);
router.post('/device/:id/members', memberController.addMember);
router.delete('/device/:id/members/:userId', memberController.removeMember);

// Activity Logs
const logController = require('../controllers/log.controller');
router.get('/device/:id/logs', logController.getLogs);

module.exports = router;
