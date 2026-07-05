const express = require('express');
const router = express.Router();

const memberEventController = require('../controllers/member/memberEventController');

router.get('/', memberEventController.list);
router.get('/:slug', memberEventController.getBySlug);

module.exports = router;
