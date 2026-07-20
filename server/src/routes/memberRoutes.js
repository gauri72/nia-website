const express = require('express');
const router = express.Router();

const memberDashboardController = require('../controllers/member/memberDashboardController');
const memberMembershipController = require('../controllers/member/memberMembershipController');
const memberProfileController = require('../controllers/member/memberProfileController');
const notificationController = require('../controllers/member/notificationController');
const requireMemberAuth = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.use(requireMemberAuth);

router.get( '/dashboard', memberDashboardController.overview);

router.get(  '/membership',              memberMembershipController.getStatus);
router.patch('/membership/auto-renew',   memberMembershipController.setAutoRenew);
router.post( '/membership/renew',        paymentLimiter, memberMembershipController.renew);
router.post( '/membership/upgrade',      paymentLimiter, memberMembershipController.upgrade);
router.get(  '/membership/upgrade-preview/:tierId', memberMembershipController.previewUpgrade);
router.get(  '/membership/card.pdf',     memberMembershipController.downloadCard);
router.get(  '/membership/patron-pass.pdf', memberMembershipController.downloadPatronPass);

router.get(  '/notifications',               notificationController.list);
router.post('/notifications/mark-all-read',  notificationController.markAllRead);

router.patch('/profile',                     memberProfileController.updateProfile);
router.post( '/profile/change-password',     memberProfileController.changePassword);
router.patch('/profile/communication-prefs', memberProfileController.updateCommunicationPrefs);
router.post( '/profile/unsubscribe',         memberProfileController.unsubscribe);
router.delete('/profile',                    memberProfileController.deleteAccount);

module.exports = router;
