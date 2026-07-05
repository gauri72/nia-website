const express = require('express');
const router = express.Router();

const emailTemplateController = require('../controllers/email/emailTemplateController');
const aiTemplateController = require('../controllers/email/aiTemplateController');
const broadcastController = require('../controllers/email/broadcastController');
const suppressionListController = require('../controllers/email/suppressionListController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const { aiLimiter, broadcastLimiter } = require('../middleware/rateLimiter');

router.use(requireAdminAuth);

router.get(   '/email-templates',            emailTemplateController.list);
router.post(  '/email-templates',            emailTemplateController.create);
router.get(   '/email-templates/:id',        emailTemplateController.getById);
router.put(   '/email-templates/:id',        emailTemplateController.update);
router.post(  '/email-templates/:id/duplicate', emailTemplateController.duplicate);
router.delete('/email-templates/:id',        emailTemplateController.remove);

router.post(  '/ai/generate-template', aiLimiter, aiTemplateController.generate);

// ── Broadcasts ──────────────────────────────────────────────────
router.get(   '/broadcasts',                   broadcastController.list);
router.post(  '/broadcasts',                   broadcastController.create);
router.post(  '/broadcasts/estimate-audience',  broadcastController.estimateAudience);
router.get(   '/broadcasts/:id',                broadcastController.getById);
router.patch( '/broadcasts/:id',                broadcastController.update);
router.get(   '/broadcasts/:id/recipients',     broadcastController.recipients);
router.get(   '/broadcasts/:id/analytics',      broadcastController.analytics);
router.post(  '/broadcasts/:id/send-test',      broadcastLimiter, broadcastController.sendTest);
router.post(  '/broadcasts/:id/send',           broadcastLimiter, broadcastController.send);
router.post(  '/broadcasts/:id/cancel',         broadcastController.cancel);
router.post(  '/broadcasts/:id/resend',         broadcastLimiter, broadcastController.resend);
router.post(  '/broadcasts/:id/duplicate',      broadcastController.duplicate);

// ── Suppression List ────────────────────────────────────────────
router.get(   '/suppression-list',                 suppressionListController.list);
router.post(  '/suppression-list/:id/resubscribe', suppressionListController.resubscribe);

module.exports = router;
