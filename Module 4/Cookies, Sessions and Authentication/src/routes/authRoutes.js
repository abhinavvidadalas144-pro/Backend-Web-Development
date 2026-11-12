const express = require('express');
const authController = require('../controllers/authController');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', requireSession, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
