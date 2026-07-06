const express = require('express');
const router = express.Router();

const memberBookingController = require('../controllers/member/memberBookingController');
const requireMemberAuth = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.use(requireMemberAuth);

router.post('/create', paymentLimiter, memberBookingController.create);
router.post('/preview-discount', paymentLimiter, memberBookingController.previewDiscount);
router.get( '/mine',                   memberBookingController.listMine);
router.get( '/:id',                    memberBookingController.getById);
router.get( '/:id/ticket.pdf',         memberBookingController.downloadTicketPdf);
router.get( '/:id/qrcode',             memberBookingController.getQrCode);
router.post('/:id/cancel',             memberBookingController.cancel);

module.exports = router;
