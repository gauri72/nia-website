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

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const FROM = `"NIA Netherlands" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 2000; // spacing sends protects the SMTP mailbox from provider-side rate limiting

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

function injectTracking(html, trackingToken) {
  const base = process.env.BACKEND_URL || 'http://localhost:5050';
  const unsubscribeUrl = `${base}/api/unsubscribe?token=${trackingToken}`;
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
async function sendTestEmail(to, subject, html, sampleVars = {}) {
  const transporter = createTransporter();
  const rendered = renderPersonalized(html, { firstName: 'Test', lastName: 'Member', membershipTier: null, membershipExpiresAt: null }, sampleVars)
    .replaceAll('{{unsubscribe_url}}', '#');
  await transporter.sendMail({ from: FROM, to, subject: `[TEST] ${subject}`, html: rendered });
}

// ── Send (or resume sending) a broadcast to its pending recipients ──
async function sendBroadcast(broadcastId) {
  const broadcast = await Broadcast.findById(broadcastId).populate('template');
  if (!broadcast) throw new Error('Broadcast not found');

  broadcast.status = 'sending';
  await broadcast.save();

  const transporter = createTransporter();
  const recipients = await BroadcastRecipient.find({ broadcast: broadcastId, status: 'pending' }).populate({ path: 'member', populate: 'membershipTier' });

  let sentCount = 0, failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (recipient) => {
      try {
        const member = recipient.member;
        const personalized = member
          ? renderPersonalized(broadcast.template.htmlContent, member, broadcast.personalizationVars)
          : broadcast.template.htmlContent;
        const finalHtml = injectTracking(personalized, recipient.trackingToken);

        await transporter.sendMail({ from: FROM, to: recipient.email, subject: broadcast.subject, html: finalHtml });

        recipient.status = 'sent';
        recipient.sentAt = new Date();
        await recipient.save();
        sentCount++;
      } catch (err) {
        recipient.status = 'failed';
        recipient.errorMessage = err.message;
        await recipient.save();
        failedCount++;
      }
    }));
    if (i + BATCH_SIZE < recipients.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  broadcast.status = 'sent';
  broadcast.sentAt = new Date();
  broadcast.stats.sent = (broadcast.stats.sent || 0) + sentCount;
  broadcast.stats.failed = (broadcast.stats.failed || 0) + failedCount;
  await broadcast.save();

  return broadcast;
}

module.exports = {
  resolveAudienceMembers, estimateAudienceCount, renderPersonalized, injectTracking,
  createRecipients, sendTestEmail, sendBroadcast,
};
