const express = require('express');
const router = express.Router();

const memberAdminController = require('../controllers/admin/memberAdminController');
const membershipTierController = require('../controllers/admin/membershipTierController');
const adminProfileController = require('../controllers/admin/adminProfileController');
const dashboardController = require('../controllers/admin/dashboardController');
const notificationController = require('../controllers/admin/notificationController');
const mediaController = require('../controllers/admin/mediaController');
const upload = require('../middleware/upload');
const contentController = require('../controllers/admin/contentController');
const reportController = require('../controllers/admin/reportController');
const eventAdminController = require('../controllers/admin/eventAdminController');
const ticketTypeController = require('../controllers/admin/ticketTypeController');
const bookingAdminController = require('../controllers/admin/bookingAdminController');
const mollieImportController = require('../controllers/admin/mollieImportController');
const legacyTicketController = require('../controllers/admin/legacyTicketController');
const vipPassController = require('../controllers/admin/vipPassController');
const guestListController = require('../controllers/admin/guestListController');
const discountCodeController = require('../controllers/admin/discountCodeController');
const sponsorshipAdminController = require('../controllers/admin/sponsorshipAdminController');
const sponsorshipTierController = require('../controllers/admin/sponsorshipTierController');
const donationAdminController = require('../controllers/admin/donationAdminController');
const contactAdminController = require('../controllers/admin/contactAdminController');
const scanController = require('../controllers/admin/scanController');
const sponsorLogoController = require('../controllers/admin/sponsorLogoController');
const { requireAdminAuth, requireRole } = require('../middleware/adminAuth');
const { mollieSyncLimiter } = require('../middleware/rateLimiter');

router.use(requireAdminAuth);

// door_staff accounts are scan-only — denied by default here rather than
// requiring every other route in this router to remember an explicit
// requireRole call. Any future route added below this line is safe by
// default too, since it isn't under /scan/ unless deliberately placed there.
router.use((req, res, next) => {
  if (req.admin.role !== 'door_staff') return next();
  if (req.path.startsWith('/scan/') || req.path === '/profile/change-password') return next();
  return res.status(403).json({ error: 'This account can only be used for check-in scanning.' });
});

// ── Dashboard ─────────────────────────────────────────────────
router.get('/dashboard', dashboardController.overview);

// ── Ticket & Membership Scanning ────────────────────────────────
router.post('/scan/lookup',   scanController.lookup);
router.post('/scan/check-in', scanController.checkIn);
router.post('/scan/undo',     scanController.undoCheckIn);
router.get( '/scan/roster',   scanController.roster);
router.get( '/scan/search',   scanController.search);
router.get( '/scan/log',      scanController.log);
router.get( '/scan/stats',    scanController.stats);

// ── Users (community contact list — separate from Members) ────
router.get(   '/contacts',                       contactAdminController.list);
router.post(  '/contacts',                       contactAdminController.create);
router.put(   '/contacts/:id',                   contactAdminController.update);
router.delete('/contacts/:id',                   requireRole(['super_admin']), contactAdminController.remove);
router.post(  '/contacts/:id/convert-to-member', contactAdminController.convertToMember);
router.post(  '/contacts/:id/reset-member-account', requireRole(['super_admin']), contactAdminController.resetMemberAccount);

// ── Members ───────────────────────────────────────────────────
router.get(   '/members/export',    memberAdminController.exportCsv); // before /:id
router.get(   '/members',           memberAdminController.list);
router.post(  '/members',           memberAdminController.create);
router.get(   '/members/:id',       memberAdminController.getById);
router.patch( '/members/:id',       memberAdminController.update);
router.patch( '/members/:id/status', requireRole(['super_admin']), memberAdminController.updateStatus);
router.post(  '/members/:id/resend-membership-email', memberAdminController.resendMembershipEmail);
router.get(   '/members/:id/patron-pass',             memberAdminController.downloadPatronPass);
router.post(  '/members/:id/void-membership',         requireRole(['super_admin']), memberAdminController.voidMembership);
router.get(   '/members/:id/upgrade-preview/:tierId', memberAdminController.previewUpgrade);
router.post(  '/members/:id/upgrade-membership',      memberAdminController.generateUpgradeLink);

// ── Membership Tiers ──────────────────────────────────────────
router.get(   '/membership-tiers',      membershipTierController.list);
router.post(  '/membership-tiers',      requireRole(['super_admin']), membershipTierController.create);
router.put(   '/membership-tiers/:id',  requireRole(['super_admin']), membershipTierController.update);
router.delete('/membership-tiers/:id',  requireRole(['super_admin']), membershipTierController.remove);

// ── Discount Codes ──────────────────────────────────────────────
router.get(   '/discount-codes',      discountCodeController.list);
router.post(  '/discount-codes',      requireRole(['super_admin']), discountCodeController.create);
router.put(   '/discount-codes/:id',  requireRole(['super_admin']), discountCodeController.update);
router.delete('/discount-codes/:id',  requireRole(['super_admin']), discountCodeController.remove);

// ── Events ────────────────────────────────────────────────────
router.get(   '/events',                       eventAdminController.list);
router.post(  '/events',                       eventAdminController.create);
router.get(   '/events/:id',                   eventAdminController.getById);
router.patch( '/events/:id',                   eventAdminController.update);
router.patch( '/events/:id/publish',           eventAdminController.publish);
router.patch( '/events/:id/unpublish',         eventAdminController.unpublish);
router.post(  '/events/:id/duplicate',         eventAdminController.duplicate);
router.delete('/events/:id',                   requireRole(['super_admin']), eventAdminController.remove);
router.get(   '/events/:id/attendees',         eventAdminController.attendees);
router.get(   '/events/:id/attendees/export',  eventAdminController.attendeesExportCsv);

// ── Ticket Types (nested under events) ───────────────────────────
router.get(   '/events/:eventId/ticket-types', ticketTypeController.list);
router.post(  '/events/:eventId/ticket-types', requireRole(['super_admin']), ticketTypeController.create);
router.put(   '/ticket-types/:id',             requireRole(['super_admin']), ticketTypeController.update);
router.delete('/ticket-types/:id',             requireRole(['super_admin']), ticketTypeController.remove);

// ── Bookings ──────────────────────────────────────────────────
router.get(   '/bookings',                     bookingAdminController.list);
router.post(  '/bookings/manual',              bookingAdminController.manualBooking);
router.get(   '/bookings/:id',                 bookingAdminController.getById);
router.get(   '/bookings/:id/ticket.pdf',      bookingAdminController.downloadTicketPdf);
router.post(  '/bookings/:id/refund',          requireRole(['super_admin']), bookingAdminController.refund);

// ── Reports ──────────────────────────────────────────────────────
router.get('/reports/:type/export', reportController.exportReport); // before /:type
router.get('/reports/:type',        reportController.get);

// ── Content Management ──────────────────────────────────────────
router.get('/content',      contentController.list);
router.put('/content/:key', contentController.upsert);

// ── Media Manager ──────────────────────────────────────────────
router.get(   '/media',              mediaController.list);
router.post(  '/media/upload',       upload.single('file'), mediaController.upload);
router.delete('/media/:filename',    mediaController.remove);

// ── Notifications ─────────────────────────────────────────────
router.get( '/notifications', notificationController.list);
router.post('/notifications/mark-all-read', notificationController.markAllRead);

// ── Own profile ────────────────────────────────────────────────
router.patch('/profile', adminProfileController.updateProfile);
router.post( '/profile/change-password', adminProfileController.changePassword);

// ── Ticket Sales (legacy public-site ticket flow) ────────────────
router.get( '/legacy-tickets',                legacyTicketController.list);
router.get( '/legacy-tickets/door-list',       legacyTicketController.doorList);
router.get( '/legacy-tickets/:id',             legacyTicketController.getById);
router.get( '/legacy-tickets/:id/pdf',         legacyTicketController.downloadPdf);
router.get( '/legacy-tickets/:id/qr',          legacyTicketController.downloadQr);
router.post('/legacy-tickets/:id/resend-email', legacyTicketController.resendEmail);
router.get( '/legacy-tickets/:id/email-preview', legacyTicketController.emailPreview);
router.patch('/legacy-tickets/:id',            requireRole(['super_admin']), legacyTicketController.updateTicket);
router.post('/legacy-tickets/:id/refund',      requireRole(['super_admin']), legacyTicketController.refund);
router.post('/legacy-tickets/:id/void',        requireRole(['super_admin']), legacyTicketController.voidTicket);
router.post('/vip-passes',                     requireRole(['super_admin']), vipPassController.create);

// ── Guest List (artists / invited guests / chief guests) ────────────
router.get(   '/guest-list',                   guestListController.list);
router.post(  '/guest-list',                   requireRole(['super_admin']), guestListController.create);
router.post(  '/guest-list/:id/check-in',      guestListController.toggleCheckIn);
router.delete('/guest-list/:id',               requireRole(['super_admin']), guestListController.remove);

// ── Sponsorships ──────────────────────────────────────────────────
router.get(   '/sponsorships',            sponsorshipAdminController.list);
router.get(   '/sponsorships/:id',        sponsorshipAdminController.getById);
router.post(  '/sponsorships/:id/resend-email',         sponsorshipAdminController.resendEmail);
router.post(  '/sponsorships/:id/complimentary-tickets', requireRole(['super_admin']), sponsorshipAdminController.sendComplimentaryTickets);
router.get(   '/sponsorship-tiers',       sponsorshipTierController.list);
router.post(  '/sponsorship-tiers',       requireRole(['super_admin']), sponsorshipTierController.create);
router.put(   '/sponsorship-tiers/:id',   requireRole(['super_admin']), sponsorshipTierController.update);
router.delete('/sponsorship-tiers/:id',   requireRole(['super_admin']), sponsorshipTierController.remove);
router.get(   '/sponsor-logos',           sponsorLogoController.list);
router.post(  '/sponsor-logos',           requireRole(['super_admin']), upload.uploadToMemory.single('logo'), sponsorLogoController.create);
router.put(   '/sponsor-logos/:id',       requireRole(['super_admin']), upload.uploadToMemory.single('logo'), sponsorLogoController.update);
router.delete('/sponsor-logos/:id',       requireRole(['super_admin']), sponsorLogoController.remove);

// ── Donations ───────────────────────────────────────────────────
router.get('/donations',     donationAdminController.list);
router.get('/donations/:id', donationAdminController.getById);

// ── Mollie Import ──────────────────────────────────────────────
router.post('/mollie/connect',   requireRole(['super_admin']), mollieImportController.connect);
router.get( '/mollie/status',                                  mollieImportController.status);
router.post('/mollie/sync',      mollieSyncLimiter,             mollieImportController.sync);
router.post('/mollie/import',                                  mollieImportController.importTransactions);
router.get( '/mollie/import-history',                          mollieImportController.importHistory);
router.get( '/mollie/import-history/:id',                      mollieImportController.importHistoryDetail);
router.get( '/mollie/review-queue',                            mollieImportController.reviewQueue);
router.put( '/mollie/review-queue/:id',                        mollieImportController.resolveReviewQueueItem);
router.get( '/mollie/webhook-log',                             mollieImportController.webhookLog);
router.get( '/mollie/transactions/export',                    mollieImportController.exportTransactions); // before /transactions
router.get( '/mollie/transactions/years',                     mollieImportController.transactionYears); // before /transactions
router.post('/mollie/transactions/refresh-settlements', mollieSyncLimiter, mollieImportController.refreshSettlements);
router.get( '/mollie/transactions',                            mollieImportController.transactions);
router.get( '/mollie/tier-mapping',                            mollieImportController.listTierMapping);
router.post('/mollie/tier-mapping',                            requireRole(['super_admin']), mollieImportController.createTierMapping);
router.delete('/mollie/tier-mapping/:id',                      requireRole(['super_admin']), mollieImportController.deleteTierMapping);

module.exports = router;
