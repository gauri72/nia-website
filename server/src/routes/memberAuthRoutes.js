const express = require('express');
const router = express.Router();

const memberAuthController = require('../controllers/auth/memberAuthController');
const requireMemberAuth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, memberAuthController.register);
router.get( '/verify-email',                memberAuthController.verifyEmail);
router.post('/login',        authLimiter, memberAuthController.login);
router.post('/forgot-password', authLimiter, memberAuthController.forgotPassword);
router.post('/reset-password',  authLimiter, memberAuthController.resetPassword);
router.get( '/me', requireMemberAuth,        memberAuthController.me);

module.exports = router;
