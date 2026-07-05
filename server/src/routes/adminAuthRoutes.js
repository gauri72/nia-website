const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/auth/adminAuthController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login',           authLimiter, adminAuthController.login);
router.post('/forgot-password', authLimiter, adminAuthController.forgotPassword);
router.post('/reset-password',  authLimiter, adminAuthController.resetPassword);
router.get( '/me', requireAdminAuth,         adminAuthController.me);

module.exports = router;
