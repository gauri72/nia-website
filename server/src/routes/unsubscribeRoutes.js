const express = require('express');
const router = express.Router();

const unsubscribeController = require('../controllers/email/unsubscribeController');

router.get('/unsubscribe', unsubscribeController.unsubscribe);
router.get('/broadcasts/track/:token/open', unsubscribeController.trackOpen);
router.get('/broadcasts/track/:token/click', unsubscribeController.trackClick);

module.exports = router;
