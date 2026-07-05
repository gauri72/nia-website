const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MEDIA_DIR = path.join(UPLOADS_ROOT, 'media');

module.exports = { UPLOADS_ROOT, MEDIA_DIR };
