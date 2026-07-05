const { generateEmailTemplate, AIError } = require('../../services/claudeService');

// ── POST /api/ai/generate-template ─────────────────────────────────
async function generate(req, res, next) {
  try {
    const { prompt, type, colorScheme } = req.body;
    const result = await generateEmailTemplate({ prompt, type, colorScheme });
    return res.json(result);
  } catch (err) {
    if (err instanceof AIError) {
      const status = err.code === 'AI_NOT_CONFIGURED' ? 503
        : err.code === 'INVALID_INPUT' ? 400
        : err.code === 'AI_RATE_LIMITED' ? 429
        : 502;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    next(err);
  }
}

module.exports = { generate };
