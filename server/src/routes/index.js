const express = require('express');
const router  = express.Router();

const paymentController     = require('../controllers/paymentController');
const mollieWebhookController = require('../controllers/mollieWebhookController');
const membershipTierController = require('../controllers/admin/membershipTierController');
const membershipController  = require('../controllers/membershipController');
const ticketController      = require('../controllers/ticketController');
const donationController    = require('../controllers/donationController');
const sponsorshipController = require('../controllers/sponsorshipController');
const discountCodeController = require('../controllers/admin/discountCodeController');
const sponsorshipTierController = require('../controllers/admin/sponsorshipTierController');

const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

const memberAuthRoutes = require('./memberAuthRoutes');
const adminAuthRoutes  = require('./adminAuthRoutes');
const adminRoutes      = require('./adminRoutes');
const publicEventRoutes   = require('./publicEventRoutes');
const memberBookingRoutes = require('./memberBookingRoutes');
const memberRoutes        = require('./memberRoutes');
const emailRoutes         = require('./emailRoutes');
const unsubscribeRoutes   = require('./unsubscribeRoutes');

// ── Health ────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Payments ──────────────────────────────────────────────────
router.post('/payments/create',            paymentLimiter,  paymentController.create);
router.post('/payments/webhook',           webhookLimiter,  paymentController.webhook);
router.get( '/payments/status/:paymentId',                  paymentController.status);

// ── Mollie Import — real-time webhook (separate from the payments webhook above) ──
router.post('/mollie/webhook',             webhookLimiter,  mollieWebhookController.webhook);

// ── Membership ────────────────────────────────────────────────
router.post('/membership/create',  paymentLimiter, membershipController.create);
router.get( '/membership/:id',                     membershipController.getById);

// ── Event Tickets ─────────────────────────────────────────────
router.post('/tickets/create',     paymentLimiter, ticketController.create);
router.post('/tickets/preview-discount', paymentLimiter, ticketController.previewDiscount);
router.get( '/tickets/:id',                        ticketController.getById);

// ── Donations ─────────────────────────────────────────────────
router.post('/donations/create',   paymentLimiter, donationController.create);
router.get( '/donations/:id',                      donationController.getById);

// ── Sponsorships ──────────────────────────────────────────────
router.post('/sponsorships/create', paymentLimiter, sponsorshipController.create);
router.get( '/sponsorships/:id',                    sponsorshipController.getById);

// ── Auth (Member + Admin) ───────────────────────────────────────
router.use('/member-auth', memberAuthRoutes);
router.use('/admin-auth',  adminAuthRoutes);
router.use('/admin',       adminRoutes);
router.get('/membership-tiers', membershipTierController.publicList);
router.get('/sponsorship-tiers', sponsorshipTierController.publicList);
router.post('/discount-codes/preview', discountCodeController.preview);

router.use('/events',      publicEventRoutes);
router.use('/bookings',    memberBookingRoutes);
router.use('/member',      memberRoutes);
router.use('/',            unsubscribeRoutes);
router.use('/',            emailRoutes);

module.exports = router;
