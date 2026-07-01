const express = require('express');
const router  = express.Router();

const paymentController     = require('../controllers/paymentController');
const membershipController  = require('../controllers/membershipController');
const ticketController      = require('../controllers/ticketController');
const donationController    = require('../controllers/donationController');
const sponsorshipController = require('../controllers/sponsorshipController');

const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// ── Health ────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Payments ──────────────────────────────────────────────────
router.post('/payments/create',            paymentLimiter,  paymentController.create);
router.post('/payments/webhook',           webhookLimiter,  paymentController.webhook);
router.get( '/payments/status/:paymentId',                  paymentController.status);

// ── Membership ────────────────────────────────────────────────
router.post('/membership/create',  paymentLimiter, membershipController.create);
router.get( '/membership/:id',                     membershipController.getById);

// ── Event Tickets ─────────────────────────────────────────────
router.post('/tickets/create',     paymentLimiter, ticketController.create);
router.get( '/tickets/:id',                        ticketController.getById);

// ── Donations ─────────────────────────────────────────────────
router.post('/donations/create',   paymentLimiter, donationController.create);
router.get( '/donations/:id',                      donationController.getById);

// ── Sponsorships ──────────────────────────────────────────────
router.post('/sponsorships/create', paymentLimiter, sponsorshipController.create);
router.get( '/sponsorships/:id',                    sponsorshipController.getById);

module.exports = router;
