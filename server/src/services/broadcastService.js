const nodemailer = require('nodemailer');
const Member = require('../models/Member');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Contact = require('../models/Contact');
const SuppressionList = require('../models/SuppressionList');
const BroadcastRecipient = require('../models/BroadcastRecipient');
const Broadcast = require('../models/Broadcast');

// Contacts aren't Members — most have no linked account at all — so they're
// represented here as the lightest shape createRecipients/sendBroadcast need:
// an _id (the linked Member's, if one exists, so BroadcastRecipient.member
// still points at a real Member and not a Contact), an email, and the
// Contact's own name so {{first_name}} still resolves even with no linked
// Member — sendBroadcast() falls back to this via recipient.recipientName.
function contactsToRecipients(contacts) {
  return contacts.map((c) => ({ _id: c.linkedMember || undefined, email: c.email, fullName: c.fullName }));
}

// Real public ticket purchases (the actual event booking flow guests use)
// live in Ticket, not Booking — Booking only ever gets written to by a
// separate, largely-unused member-dashboard-only booking flow. Most Ticket
// buyers are guest checkouts with no Member account at all, so this can't
// resolve through Member — it returns the same lightweight recipient shape
// contactsToRecipients() does. Note: Ticket.event_id is a fixed string (not
// an Event ref), so this can't filter by a specific selected Event the way
// Booking can — it reflects the one event ticket sales are currently wired
// to, not whichever Event a caller might pass in.
async function ticketBuyersToRecipients() {
  const tickets = await Ticket.find({ ticket_status: 'paid' }).select('email name member');
  return tickets.map((t) => ({ _id: t.member || undefined, email: t.email, fullName: t.name }));
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
    // Two independent systems can each have attendees: real public ticket
    // sales (Ticket, guest-checkout-friendly, not tied to the selected
    // Event) and the separate member-dashboard booking flow (Booking,
    // always a real Member, properly tied to the selected Event).
    const bookings = await Booking.find({ event: audience.eventId, status: 'paid' }).populate('member', 'email firstName lastName status');
    const bookingRecipients = bookings
      .filter((b) => b.member && b.member.status === 'active')
      .map((b) => ({ _id: b.member._id, email: b.member.email, fullName: `${b.member.firstName} ${b.member.lastName}` }));

    const seen = new Set();
    members = [...(await ticketBuyersToRecipients()), ...bookingRecipients].filter((m) => {
      const key = m.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  // Skip people who've already bought a ticket — e.g. a "book your tickets"
  // reminder sent to everyone shouldn't nag people who've already registered.
  // Meaningless (and skipped) for the event_attendees type itself, since
  // that audience IS the ticket buyers.
  if (audience.excludeEventAttendees && audience.type !== 'event_attendees') {
    const alreadyBought = new Set((await ticketBuyersToRecipients()).map((r) => r.email.toLowerCase()));
    members = members.filter((m) => !alreadyBought.has(m.email.toLowerCase()));
  }

  const suppressed = new Set((await SuppressionList.find().select('email')).map((s) => s.email));
  return members.filter((m) => !suppressed.has(m.email) && !m.unsubscribedAt);
}

async function estimateAudienceCount(audience) {
  const members = await resolveAudienceMembers(audience);
  return members.length;
}

// Splits a Contact's fullName into a { firstName, lastName } shape so it can
// be passed to renderPersonalized() the same way a real Member is — returns
// null (not personalized) when there's no name to work with.
function splitName(fullName) {
  if (!fullName?.trim()) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
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
  const docs = members.map((m) => ({ broadcast: broadcastId, member: m._id, email: m.email, recipientName: m.fullName || undefined }));
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
        const personalizeTarget = recipient.member || splitName(recipient.recipientName);
        const personalized = personalizeTarget
          ? renderPersonalized(broadcast.template.htmlContent, personalizeTarget, broadcast.personalizationVars)
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
