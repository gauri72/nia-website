const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { MEDIA_DIR } = require('../config/uploadPaths');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type. Allowed: JPEG, PNG, GIF, WEBP, SVG, PDF.'));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Render's web service filesystem is ephemeral — anything written to disk
// (including everything the diskStorage `upload` above saves) is wiped on
// every deploy/restart. For small images that need to survive deploys
// without a persistent disk or third-party storage, this keeps the file in
// memory (req.file.buffer) so the caller can embed it directly in Mongo
// instead of writing it to disk.
const uploadToMemory = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;
module.exports.uploadToMemory = uploadToMemory;
