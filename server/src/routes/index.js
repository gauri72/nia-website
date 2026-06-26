const express = require('express');
const router = express.Router();

// Mount domain routers here as the site grows
// e.g. router.use('/events', require('./events'));

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = router;
