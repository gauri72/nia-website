const Broadcast = require('../../models/Broadcast');
const BroadcastRecipient = require('../../models/BroadcastRecipient');
const EmailTemplate = require('../../models/EmailTemplate');
const {
  resolveAudienceMembers, estimateAudienceCount, createRecipients, sendTestEmail, sendBroadcast, resendFailed, buildUnsubscribeUrl,
} = require('../../services/broadcastService');
const { scanForBounces } = require('../../services/bounceDetectionService');

// Client sends empty-string/empty-array placeholders for fields irrelevant to the
// selected audience type (e.g. eventId: "" when type is "all_members") — Mongoose's
// ObjectId cast rejects "" outright, so strip anything falsy before it reaches the model.
function sanitizeAudience(audience) {
  return {
    type: audience.type,
    tierIds: (audience.tierIds || []).filter(Boolean),
    eventId: audience.eventId || undefined,
    memberIds: (audience.memberIds || []).filter(Boolean),
    contactIds: (audience.contactIds || []).filter(Boolean),
    joinedAfter: audience.joinedAfter || undefined,
    joinedBefore: audience.joinedBefore || undefined,
  };
}

// ── GET /api/broadcasts ───────────────────────────────────────────
async function list(req, res, next) {
  try {
    const broadcasts = await Broadcast.find().populate('template', 'name').sort('-createdAt');
    return res.json(broadcasts);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/broadcasts/:id ───────────────────────────────────────
async function getById(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id).populate('template');
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    return res.json(broadcast);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/broadcasts/:id/recipients ────────────────────────────
async function recipients(req, res, next) {
  try {
    const list = await BroadcastRecipient.find({ broadcast: req.params.id })
      .populate('member', 'firstName lastName email').sort('-createdAt');
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/estimate-audience ────────────────────────
async function estimateAudience(req, res, next) {
  try {
    const count = await estimateAudienceCount(sanitizeAudience(req.body.audience || {}));
    return res.json({ count });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts ──────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { name, templateId, subject, previewText, audience, personalizationVars, scheduledAt, timezone } = req.body;
    if (!name?.trim() || !templateId || !subject?.trim() || !audience?.type) {
      return res.status(400).json({ error: 'name, templateId, subject and audience are required' });
    }

    const template = await EmailTemplate.findById(templateId);
    if (!template) return res.status(400).json({ error: 'Invalid template' });

    const cleanAudience = sanitizeAudience(audience);
    const estimatedRecipients = await estimateAudienceCount(cleanAudience);

    const broadcast = await Broadcast.create({
      name: name.trim(), template: template._id, subject: subject.trim(), previewText,
      audience: cleanAudience, personalizationVars,
      scheduledAt: scheduledAt || undefined,
      timezone: timezone || 'Europe/Amsterdam',
      status: scheduledAt ? 'scheduled' : 'draft',
      createdBy: req.admin.id,
      stats: { totalRecipients: estimatedRecipients },
    });

    return res.status(201).json(broadcast);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/broadcasts/:id ─────────────────────────────────────
// Draft-only edits as the composer wizard steps through audience/subject/etc.
async function update(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status !== 'draft') return res.status(400).json({ error: 'Only draft broadcasts can be edited' });

    const { name, templateId, subject, previewText, audience, personalizationVars } = req.body || {};
    if (name !== undefined) broadcast.name = name.trim();
    if (templateId !== undefined) broadcast.template = templateId;
    if (subject !== undefined) broadcast.subject = subject.trim();
    if (previewText !== undefined) broadcast.previewText = previewText;
    if (audience !== undefined) {
      const cleanAudience = sanitizeAudience(audience);
      broadcast.audience = cleanAudience;
      broadcast.stats.totalRecipients = await estimateAudienceCount(cleanAudience);
    }
    if (personalizationVars !== undefined) broadcast.personalizationVars = personalizationVars;

    await broadcast.save();
    return res.json(broadcast);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/send-test ────────────────────────────
async function sendTest(req, res, next) {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

    const broadcast = await Broadcast.findById(req.params.id).populate('template');
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });

    // A real BroadcastRecipient (not just a fabricated token) so the test send's
    // List-Unsubscribe header points at a link that genuinely works if clicked —
    // same as what a real recipient would get.
    const normalizedEmail = email.trim().toLowerCase();
    let recipient = await BroadcastRecipient.findOne({ broadcast: broadcast._id, email: normalizedEmail });
    if (!recipient) recipient = await BroadcastRecipient.create({ broadcast: broadcast._id, email: normalizedEmail });
    const unsubscribeUrl = buildUnsubscribeUrl(recipient.trackingToken);

    await sendTestEmail(email.trim(), broadcast.subject, broadcast.template.htmlContent, broadcast.personalizationVars, unsubscribeUrl);

    await Broadcast.findByIdAndUpdate(req.params.id, { $addToSet: { testSendEmails: email.trim() } });
    return res.json({ message: `Test email sent to ${email}` });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/send ─────────────────────────────────
// Sends immediately, or (re)schedules if scheduledAt is provided and in the future.
async function send(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (!['draft', 'scheduled'].includes(broadcast.status)) {
      return res.status(400).json({ error: `Broadcast is already ${broadcast.status}` });
    }

    const { scheduledAt } = req.body || {};
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      broadcast.scheduledAt = new Date(scheduledAt);
      broadcast.status = 'scheduled';
      await broadcast.save();
      return res.json(broadcast);
    }

    const members = await resolveAudienceMembers(broadcast.audience);
    await createRecipients(broadcast._id, members);
    broadcast.stats.totalRecipients = members.length;
    await broadcast.save();

    // Fire-and-forget: sending hundreds of emails shouldn't block the HTTP response.
    sendBroadcast(broadcast._id).catch((err) => console.error('[Broadcast] Send failed:', err.message));

    return res.json({ message: 'Broadcast is being sent', recipientCount: members.length });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/cancel ───────────────────────────────
async function cancel(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status !== 'scheduled') return res.status(400).json({ error: 'Only scheduled broadcasts can be canceled' });

    broadcast.status = 'canceled';
    await broadcast.save();
    return res.json(broadcast);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/resend ───────────────────────────────
// Resends to recipients who received it but never opened it.
async function resend(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status !== 'sent') return res.status(400).json({ error: 'Only sent broadcasts can be resent' });

    const unopened = await BroadcastRecipient.find({ broadcast: broadcast._id, status: 'sent' });
    if (unopened.length === 0) return res.json({ message: 'No unopened recipients to resend to' });

    await BroadcastRecipient.updateMany({ _id: { $in: unopened.map((r) => r._id) } }, { status: 'pending' });
    broadcast.status = 'sending';
    await broadcast.save();

    sendBroadcast(broadcast._id).catch((err) => console.error('[Broadcast] Resend failed:', err.message));

    return res.json({ message: `Resending to ${unopened.length} recipient(s)` });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/resend-failed ────────────────────────
// Retries recipients whose send outright failed (e.g. SMTP-provider rejection),
// as opposed to /resend which targets successfully-sent-but-unopened recipients.
async function resendFailedRecipients(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status !== 'sent') return res.status(400).json({ error: 'Only sent broadcasts can be retried' });

    const count = await resendFailed(req.params.id);
    if (count === 0) return res.json({ message: 'No failed recipients to retry' });

    return res.json({ message: `Retrying ${count} failed recipient(s)` });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/:id/duplicate ────────────────────────────
async function duplicate(req, res, next) {
  try {
    const original = await Broadcast.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Broadcast not found' });

    const copy = await Broadcast.create({
      name: `${original.name} (Copy)`, template: original.template, subject: original.subject,
      previewText: original.previewText, audience: original.audience,
      personalizationVars: original.personalizationVars, status: 'draft', createdBy: req.admin.id,
    });

    return res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/broadcasts/:id/analytics ─────────────────────────────
async function analytics(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });

    const total = broadcast.stats.sent || 0;
    const rate = (n) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

    return res.json({
      ...broadcast.stats.toObject(),
      openRate: rate(broadcast.stats.opened),
      clickRate: rate(broadcast.stats.clicked),
      bounceRate: rate(broadcast.stats.bounced),
      unsubscribeRate: rate(broadcast.stats.unsubscribed),
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/broadcasts/scan-bounces ─────────────────────────────
// Manual trigger for the same check that also runs automatically every
// 15 minutes (schedulerService) — lets an admin get fresh numbers on demand
// (e.g. right after a send) instead of waiting for the next scheduled pass.
async function scanBounces(req, res, next) {
  try {
    const result = await scanForBounces();
    if (result.skipped) return res.status(400).json({ error: 'Bounce scanning is not configured (missing IMAP credentials)' });
    return res.json({ message: `Scanned ${result.scanned} new message(s), found ${result.bounced} bounce(s)`, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, recipients, estimateAudience, create, update, sendTest, send, cancel, resend, resendFailedRecipients, duplicate, analytics, scanBounces };
