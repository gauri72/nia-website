const nodemailer = require('nodemailer');
const Member = require('../models/Member');
const Booking = require('../models/Booking');
const Contact = require('../models/Contact');
const SuppressionList = require('../models/SuppressionList');
const BroadcastRecipient = require('../models/BroadcastRecipient');
const Broadcast = require('../models/Broadcast');

// Contacts aren't Members — most have no linked account at all — so they're
// represented here as the lightest shape createRecipients/sendBroadcast need:
// an _id (the linked Member's, if one exists, so BroadcastRecipient.member
// still points at a real Member and not a Contact) and an email. sendBroadcast
// already falls back to the raw template with no personalization whenever
// recipient.member is unset, which is exactly what happens for the rest.
function contactsToRecipients(contacts) {
  return contacts.map((c) => ({ _id: c.linkedMember || undefined, email: c.email }));
}

// Broadcasts send from a separate mailbox (secretary@) from the rest of the
// app's transactional email (info@, handled entirely by emailService.js) —
// falls back to the shared EMAIL_* config if the BROADCAST_EMAIL_* vars
// aren't set, so this never breaks broadcasting if they're missing.
const BROADCAST_EMAIL_HOST = process.env.BROADCAST_EMAIL_HOST || process.env.EMAIL_HOST;
const BROADCAST_EMAIL_PORT = process.env.BROADCAST_EMAIL_PORT || process.env.EMAIL_PORT;
const BROADCAST_EMAIL_USER = process.env.BROADCAST_EMAIL_USER || process.env.EMAIL_USER;
const BROADCAST_EMAIL_PASS = process.env.BROADCAST_EMAIL_PASS || process.env.EMAIL_PASS;

function createTransporter() {
  return nodemailer.createTransport({
    host: BROADCAST_EMAIL_HOST,
    port: Number(BROADCAST_EMAIL_PORT) || 587,
    secure: String(BROADCAST_EMAIL_PORT) === '465',
    auth: { user: BROADCAST_EMAIL_USER, pass: BROADCAST_EMAIL_PASS },
  });
}

const FROM = `"NIA Netherlands" <${process.env.BROADCAST_EMAIL_FROM || BROADCAST_EMAIL_USER}>`;
// SiteGround's shared mailbox rejects bursts over ~10.5 msg/sec and hard-caps
// the mailbox at ~400 msgs/hour (locking it for the rest of that hour once hit) —
// 5 every 2s (~2.5/sec) stays well under the burst limit; MAX_PER_HOUR_WINDOW
// below keeps a whole broadcast under the hourly cap by pausing until it resets.
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;
const MAX_PER_HOUR_WINDOW = 350; // safety margin under the ~400/hour hard cap
const HOUR_MS = 60 * 60 * 1000;

// ── Resolve which members match an audience definition ─────────────
async function resolveAudienceMembers(audience) {
  let members = [];

  if (audience.type === 'all_members') {
    members = await Member.find({ status: 'active' });
  } else if (audience.type === 'tier') {
    members = await Member.find({ status: 'active', membershipTier: { $in: audience.tierIds || [] } });
  } else if (audience.type === 'event_attendees') {
    const bookings = await Booking.find({ event: audience.eventId, status: 'paid' }).select('member');
    const memberIds = [...new Set(bookings.map((b) => String(b.member)))];
    members = await Member.find({ _id: { $in: memberIds }, status: 'active' });
  } else if (audience.type === 'custom_list') {
    const filter = { status: 'active' };
    if (audience.memberIds?.length) filter._id = { $in: audience.memberIds };
    if (audience.joinedAfter) filter.createdAt = { ...filter.createdAt, $gte: new Date(audience.joinedAfter) };
    if (audience.joinedBefore) filter.createdAt = { ...filter.createdAt, $lte: new Date(audience.joinedBefore) };
    members = await Member.find(filter);
  } else if (audience.type === 'all_contacts') {
    members = contactsToRecipients(await Contact.find({}));
  } else if (audience.type === 'specific_contact') {
    members = contactsToRecipients(await Contact.find({ _id: { $in: audience.contactIds || [] } }));
  } else if (audience.type === 'sponsors') {
    members = contactsToRecipients(await Contact.find({ userType: 'sponsor_partner' }));
  } else if (audience.type === 'advisors') {
    members = contactsToRecipients(await Contact.find({ userType: 'advisory_council' }));
  } else if (audience.type === 'board_members') {
    members = contactsToRecipients(await Contact.find({ userType: 'board_member' }));
  }

  const suppressed = new Set((await SuppressionList.find().select('email')).map((s) => s.email));
  return members.filter((m) => !suppressed.has(m.email) && !m.unsubscribedAt);
}

async function estimateAudienceCount(audience) {
  const members = await resolveAudienceMembers(audience);
  return members.length;
}

// ── Personalization + tracking injection ────────────────────────────
function renderPersonalized(html, member, vars = {}) {
  const tokens = {
    first_name: member.firstName,
    last_name: member.lastName,
    membership_tier: member.membershipTier?.name || '',
    expiry_date: member.membershipExpiresAt ? new Date(member.membershipExpiresAt).toLocaleDateString('nl-NL') : '',
    ...vars,
  };
  let rendered = html;
  for (const [key, value] of Object.entries(tokens)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value ?? '');
  }
  return rendered;
}

function buildUnsubscribeUrl(trackingToken) {
  const base = process.env.BACKEND_URL || 'http://localhost:5050';
  return `${base}/api/unsubscribe?token=${trackingToken}`;
}

function injectTracking(html, trackingToken) {
  const base = process.env.BACKEND_URL || 'http://localhost:5050';
  const unsubscribeUrl = buildUnsubscribeUrl(trackingToken);
  let out = html.replaceAll('{{unsubscribe_url}}', unsubscribeUrl);

  // Rewrite <a href="..."> (except the unsubscribe link) into click-tracked redirects
  out = out.replace(/<a\s+([^>]*?)href="([^"]+)"/gi, (match, attrs, href) => {
    if (href.includes('/api/unsubscribe')) return match;
    const redirectUrl = `${base}/api/broadcasts/track/${trackingToken}/click?url=${encodeURIComponent(href)}`;
    return `<a ${attrs}href="${redirectUrl}"`;
  });

  // Open-tracking pixel
  const pixel = `<img src="${base}/api/broadcasts/track/${trackingToken}/open" width="1" height="1" alt="" style="display:none;">`;
  out = out.includes('</body>') ? out.replace('</body>', `${pixel}</body>`) : out + pixel;

  return out;
}

// ── Create recipient records for a broadcast (called once, at send/schedule time) ──
async function createRecipients(broadcastId, members) {
  const docs = members.map((m) => ({ broadcast: broadcastId, member: m._id, email: m.email }));
  if (docs.length === 0) return [];
  await BroadcastRecipient.insertMany(docs, { ordered: false }).catch(() => {}); // ignore dup-key races
  return BroadcastRecipient.find({ broadcast: broadcastId });
}

// ── Send a test email to the admin ──────────────────────────────────
// unsubscribeUrl is optional — when the caller has a real BroadcastRecipient
// token to test against, this sends the same List-Unsubscribe header a real
// send would, so Gmail/Outlook's native one-click unsubscribe can be verified
// even for templates with no visible unsubscribe link in the body.
async function sendTestEmail(to, subject, html, sampleVars = {}, unsubscribeUrl = null) {
  const transporter = createTransporter();
  const rendered = renderPersonalized(html, { firstName: 'Test', lastName: 'Member', membershipTier: null, membershipExpiresAt: null }, sampleVars)
    .replaceAll('{{unsubscribe_url}}', unsubscribeUrl || '#');
  const mailOptions = { from: FROM, to, subject: `[TEST] ${subject}`, html: rendered };
  if (unsubscribeUrl) {
    mailOptions.headers = { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  }
  await transporter.sendMail(mailOptions);
}

// ── Send (or resume sending) a broadcast to its pending recipients ──
async function sendBroadcast(broadcastId) {
  const broadcast = await Broadcast.findById(broadcastId).populate('template');
  if (!broadcast) throw new Error('Broadcast not found');

  broadcast.status = 'sending';
  await broadcast.save();

  const transporter = createTransporter();
  const recipients = await BroadcastRecipient.find({ broadcast: broadcastId, status: 'pending' }).populate({ path: 'member', populate: 'membershipTier' });

  let windowStart = Date.now();
  let windowAttempted = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Pause until the hourly window resets rather than letting the mailbox
    // provider start hard-rejecting everything for the rest of the hour.
    if (windowAttempted + batch.length > MAX_PER_HOUR_WINDOW) {
      const waitMs = HOUR_MS - (Date.now() - windowStart);
      if (waitMs > 0) {
        console.log(`[Broadcast] Hourly send cap reached (${windowAttempted} sent), pausing ${Math.ceil(waitMs / 60000)} min before continuing...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
      windowStart = Date.now();
      windowAttempted = 0;
    }
    windowAttempted += batch.length;

    await Promise.all(batch.map(async (recipient) => {
      try {
        const member = recipient.member;
        const personalized = member
          ? renderPersonalized(broadcast.template.htmlContent, member, broadcast.personalizationVars)
          : broadcast.template.htmlContent;
        const finalHtml = injectTracking(personalized, recipient.trackingToken);
        const unsubscribeUrl = buildUnsubscribeUrl(recipient.trackingToken);

        await transporter.sendMail({
          from: FROM, to: recipient.email, subject: broadcast.subject, html: finalHtml,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        });

        recipient.status = 'sent';
        recipient.sentAt = new Date();
        await recipient.save();
      } catch (err) {
        recipient.status = 'failed';
        recipient.errorMessage = err.message;
        await recipient.save();
      }
    }));
    if (i + BATCH_SIZE < recipients.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  // Recomputed from actual recipient statuses (rather than incremented by this
  // run's sentCount/failedCount) so stats stay correct across repeated
  // resendFailed() runs instead of double-counting recipients retried more than once.
  const [deliveredCount, currentFailedCount] = await Promise.all([
    BroadcastRecipient.countDocuments({ broadcast: broadcastId, status: { $in: ['sent', 'opened', 'clicked'] } }),
    BroadcastRecipient.countDocuments({ broadcast: broadcastId, status: 'failed' }),
  ]);

  broadcast.status = 'sent';
  broadcast.sentAt = new Date();
  broadcast.stats.sent = deliveredCount;
  broadcast.stats.failed = currentFailedCount;
  await broadcast.save();

  return broadcast;
}

// ── Retry recipients that hard-failed (e.g. rejected by the SMTP provider) ──
async function resendFailed(broadcastId) {
  const failed = await BroadcastRecipient.find({ broadcast: broadcastId, status: 'failed' });
  if (failed.length === 0) return 0;

  await BroadcastRecipient.updateMany(
    { _id: { $in: failed.map((r) => r._id) } },
    { status: 'pending', errorMessage: undefined },
  );

  const broadcast = await Broadcast.findById(broadcastId);
  broadcast.status = 'sending';
  await broadcast.save();

  sendBroadcast(broadcastId).catch((err) => console.error('[Broadcast] Resend-failed run failed:', err.message));
  return failed.length;
}

module.exports = {
  resolveAudienceMembers, estimateAudienceCount, renderPersonalized, injectTracking,
  createRecipients, sendTestEmail, sendBroadcast, resendFailed, buildUnsubscribeUrl,
};
