const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Strict limiter for payment creation (prevent spam)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please try again in 15 minutes.' },
});

// Webhook limiter — generous for Mollie retries
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded.' },
});

// Auth limiter — strict, prevents credential-stuffing/brute-force on login/register/reset
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please try again in 15 minutes.' },
});

// AI limiter — tight, since each request is a real costed external call
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI generation rate limit reached. Please try again in an hour.' },
});

// Broadcast limiter — sending/scheduling/resending are real bulk-email actions
const broadcastLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many broadcast actions. Please try again in 15 minutes.' },
});

// Mollie sync limiter — guards against accidental repeated full-history imports
const mollieSyncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests. Please wait a few minutes before syncing again.' },
});

module.exports = {
  apiLimiter, paymentLimiter, webhookLimiter, authLimiter, aiLimiter, broadcastLimiter, mollieSyncLimiter,
};
