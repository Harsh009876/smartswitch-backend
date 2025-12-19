const express = require('express');
const router = express.Router();
const controller = require('../controllers/automation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/', controller.create);
router.get('/', controller.getAll);
router.delete('/:id', controller.delete);

module.exports = router;
