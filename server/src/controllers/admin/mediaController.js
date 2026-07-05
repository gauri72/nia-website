const fs = require('fs');
const path = require('path');
const { MEDIA_DIR } = require('../../config/uploadPaths');

// Guards against path traversal — the filename must resolve to a direct child of MEDIA_DIR.
function safeFilePath(filename) {
  const resolved = path.resolve(MEDIA_DIR, filename);
  if (path.dirname(resolved) !== MEDIA_DIR) return null;
  return resolved;
}

// ── GET /api/admin/media ──────────────────────────────────────────
async function list(req, res, next) {
  try {
    const files = await fs.promises.readdir(MEDIA_DIR);
    const items = await Promise.all(files.map(async (filename) => {
      const stat = await fs.promises.stat(path.join(MEDIA_DIR, filename));
      return {
        filename,
        url: `${process.env.BACKEND_URL || 'http://localhost:5050'}/uploads/media/${filename}`,
        size: stat.size,
        uploadedAt: stat.birthtime,
      };
    }));
    items.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return res.json(items);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/media/upload ──────────────────────────────────
async function upload(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    return res.status(201).json({
      filename: req.file.filename,
      url: `${process.env.BACKEND_URL || 'http://localhost:5050'}/uploads/media/${req.file.filename}`,
      size: req.file.size,
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/media/:filename ──────────────────────────────
async function remove(req, res, next) {
  try {
    const filePath = safeFilePath(req.params.filename);
    if (!filePath) return res.status(400).json({ error: 'Invalid filename' });
    await fs.promises.unlink(filePath).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
    return res.json({ message: 'File deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, remove };
