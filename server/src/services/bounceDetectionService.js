const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const BroadcastRecipient = require('../models/BroadcastRecipient');
const Broadcast = require('../models/Broadcast');
const SuppressionList = require('../models/SuppressionList');
const BounceScanState = require('../models/BounceScanState');

// This app sends broadcast email over plain SMTP with no delivery-webhook
// support from the provider, so bounces never reach the app on their own —
// a bounced message instead lands as a Delivery Status Notification (DSN)
// in the sending mailbox's own inbox. This scans that inbox over IMAP,
// looking for those and reconciling them against BroadcastRecipient.
const IMAP_HOST = process.env.BROADCAST_EMAIL_IMAP_HOST || process.env.BROADCAST_EMAIL_HOST || process.env.EMAIL_HOST;
const IMAP_PORT = Number(process.env.BROADCAST_EMAIL_IMAP_PORT) || 993;
const IMAP_USER = process.env.BROADCAST_EMAIL_USER || process.env.EMAIL_USER;
const IMAP_PASS = process.env.BROADCAST_EMAIL_PASS || process.env.EMAIL_PASS;
const MAILBOX_LABEL = IMAP_USER || 'broadcast-mailbox';

const BOUNCE_SUBJECT_PATTERNS = [
  'undelivered mail returned to sender',
  'delivery status notification (failure)',
  'delivery status notification (delay)',
  'mail delivery failed',
  'mail delivery subsystem',
  'returned mail',
  'undeliverable',
  'failure notice',
];

function looksLikeBounce(parsed) {
  const from = (parsed.from?.text || '').toLowerCase();
  const subject = (parsed.subject || '').toLowerCase();
  if (from.includes('mailer-daemon') || from.includes('postmaster')) return true;
  return BOUNCE_SUBJECT_PATTERNS.some((s) => subject.includes(s));
}

// Standard DSNs (RFC 3464) carry a message/delivery-status part with a
// Final-Recipient header; mailparser merges that part's raw text into
// parsed.text by default, so a direct regex is enough — no need to walk
// attachments. Falls back to loose body-text scanning for bounces that
// don't follow the DSN format (older/nonstandard MTAs).
function extractFailedRecipient(parsed) {
  const body = parsed.text || '';

  const dsnMatch = body.match(/Final-Recipient:\s*rfc822;\s*([^\s,;]+@[^\s,;]+)/i);
  if (dsnMatch) return dsnMatch[1].replace(/[<>.,;]+$/, '').toLowerCase();

  const fallbackPatterns = [
    /(?:failed|undeliverable|does not exist|user unknown|no such user)[^\n]{0,80}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[^\n]{0,80}?(?:failed|undeliverable|does not exist|user unknown|no such user)/i,
  ];
  for (const re of fallbackPatterns) {
    const m = body.match(re);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

// Finds the most recent non-terminal recipient row for this email (across
// any broadcast — a DSN doesn't reliably tell us which send it came from)
// and flips it to bounced, keeping stats.sent/stats.bounced consistent and
// suppressing the address from all future broadcasts.
async function markRecipientBounced(email, subject) {
  const recipient = await BroadcastRecipient.findOne({
    email, status: { $nin: ['bounced', 'unsubscribed'] },
  }).sort('-createdAt');
  if (!recipient) return false;

  const wasCountedAsSent = ['sent', 'opened', 'clicked'].includes(recipient.status);

  recipient.status = 'bounced';
  recipient.bouncedAt = new Date();
  recipient.errorMessage = subject || 'Bounce notification received';
  await recipient.save();

  const inc = { 'stats.bounced': 1 };
  if (wasCountedAsSent) inc['stats.sent'] = -1;
  await Broadcast.findByIdAndUpdate(recipient.broadcast, { $inc: inc });

  await SuppressionList.findOneAndUpdate(
    { email },
    { email, reason: 'bounced', broadcast: recipient.broadcast, member: recipient.member, suppressedAt: new Date() },
    { upsert: true, new: true },
  );
  return true;
}

async function scanForBounces() {
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
    console.log('[BounceDetection] Skipped — no IMAP credentials configured (BROADCAST_EMAIL_IMAP_HOST/USER/PASS)');
    return { scanned: 0, bounced: 0, skipped: true };
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });

  let scanned = 0;
  let bounced = 0;

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uidValidity = String(client.mailbox.uidValidity);
      let state = await BounceScanState.findOne({ mailbox: MAILBOX_LABEL });

      if (!state) {
        // First run ever for this mailbox — don't backfill years of history,
        // just establish a baseline and start watching from here forward.
        state = await BounceScanState.create({
          mailbox: MAILBOX_LABEL, uidValidity, lastUid: client.mailbox.uidNext - 1,
        });
        console.log(`[BounceDetection] First run for ${MAILBOX_LABEL} — baseline set at UID ${state.lastUid}, no historical backfill`);
      } else if (state.uidValidity !== uidValidity) {
        // Mailbox was rebuilt server-side — old UIDs no longer mean anything.
        state.uidValidity = uidValidity;
        state.lastUid = client.mailbox.uidNext - 1;
        await state.save();
        console.log(`[BounceDetection] UIDVALIDITY changed for ${MAILBOX_LABEL} — baseline reset`);
      } else {
        const searchRange = `${state.lastUid + 1}:*`;
        const uids = (await client.search({ uid: searchRange }, { uid: true })) || [];

        let maxUid = state.lastUid;
        for (const uid of uids) {
          if (uid <= state.lastUid) continue; // IMAP's trailing '*' can re-match the boundary UID
          maxUid = Math.max(maxUid, uid);
          scanned++;

          try {
            const { content } = await client.download(uid, undefined, { uid: true });
            const parsed = await simpleParser(content);

            if (!looksLikeBounce(parsed)) continue;
            const failedEmail = extractFailedRecipient(parsed);
            if (!failedEmail) continue;

            if (await markRecipientBounced(failedEmail, parsed.subject)) bounced++;
          } catch (err) {
            console.error(`[BounceDetection] Failed to process UID ${uid}:`, err.message);
          }
        }

        state.lastUid = maxUid;
        await state.save();
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }

  console.log(`[BounceDetection] Scanned ${scanned} new message(s), matched ${bounced} bounce(s)`);
  return { scanned, bounced, skipped: false };
}

module.exports = { scanForBounces };
