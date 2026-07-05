const Anthropic = require('@anthropic-ai/sdk');

// Returns null when no API key is configured — callers must handle this
// (AI features degrade gracefully instead of crashing the server).
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

module.exports = { getClient };
