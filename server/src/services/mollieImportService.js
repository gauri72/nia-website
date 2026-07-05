const { createMollieClient } = require('@mollie/api-client');
const { encrypt, decrypt } = require('../config/encryption');
const { hashPassword, generateRawToken } = require('./authService');

const MollieConfig = require('../models/MollieConfig');
const MollieTransaction = require('../models/MollieTransaction');
const MollieImportLog = require('../models/MollieImportLog');
const ManualReviewQueue = require('../models/ManualReviewQueue');
const TierMappingRule = require('../models/TierMappingRule');
const Member = require('../models/Member');
const MembershipTier = require('../models/MembershipTier');
const Membership = require('../models/Membership');
const Ticket = require('../models/Ticket');
const Donation = require('../models/Donation');
const Sponsorship = require('../models/Sponsorship');

// Maps a payment's metadata.type (set by NIA's own mollieService.createPayment) back to the
// legacy collection that holds the real customer name/email captured at checkout time.
// Mollie's own payment object rarely carries billing details (NIA never sets billingEmail),
// so the local record — not Mollie — is the source of truth for customer identity.
const LOCAL_MODELS = {
  membership: Membership,
  event_ticket: Ticket,
  donation: Donation,
  sponsorship: Sponsorship,
};

// ── Connection management ──────────────────────────────────────────
async function getMollieConfig() {
  return MollieConfig.findOne({ singleton: 'mollie_config' });
}

async function getConfiguredClient() {
  const config = await getMollieConfig();
  if (!config) {
    const err = new Error('Mollie is not connected. Add an API key in Settings first.');
    err.status = 400;
    throw err;
  }
  const apiKey = decrypt(config.apiKeyEncrypted);
  return createMollieClient({ apiKey });
}

async function connect({ apiKey, adminId }) {
  if (!apiKey || !/^(live|test)_/.test(apiKey)) {
    const err = new Error('Invalid Mollie API key format — must start with "live_" or "test_"');
    err.status = 400;
    throw err;
  }
  const mode = apiKey.startsWith('live_') ? 'live' : 'test';
  const client = createMollieClient({ apiKey });

  // profiles.getCurrent() both validates the key and gives us a name to display.
  // organizations.getCurrent() looks like the more obvious choice but 403s for the
  // profile-restricted API keys Mollie issues by default (only OAuth tokens with an
  // organizations.read scope can call it) — profiles.getCurrent() works for both.
  const profile = await client.profiles.getCurrent();

  const config = await MollieConfig.findOneAndUpdate(
    { singleton: 'mollie_config' },
    {
      apiKeyEncrypted: encrypt(apiKey),
      mode,
      accountName: profile.name,
      connectedAt: new Date(),
      updatedBy: adminId,
    },
    { upsert: true, new: true },
  );
  return { mode: config.mode, accountName: config.accountName, connectedAt: config.connectedAt };
}

async function getStatus() {
  const config = await getMollieConfig();
  if (!config) return { connected: false };
  return {
    connected: true,
    mode: config.mode,
    accountName: config.accountName,
    connectedAt: config.connectedAt,
  };
}

// ── Fetching from Mollie ───────────────────────────────────────────
// Mollie's payments list has no server-side status filter, so we page through everything
// via the SDK's auto-paginating iterator and filter client-side.
async function fetchAllPayments() {
  const client = await getConfiguredClient();
  const results = [];
  for await (const payment of client.payments.iterate()) {
    results.push(payment);
  }
  return results;
}

function extractMeta(payment) {
  const metadata = payment.metadata || {};
  return {
    type: metadata.type || null,
    referenceId: metadata.referenceId || null,
    amount: Number(payment.amount.value),
    currency: payment.amount.currency,
    description: payment.description,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
    mollieCreatedAt: payment.createdAt ? new Date(payment.createdAt) : null,
    // Recovered from Mollie's own payment object for transactions this app never created —
    // e.g. the live site's WordPress plugins (Gravity Forms, WooCommerce) set these directly.
    wpEmail: payment.billingAddress?.email || null,
    // consumerName covers iDEAL/bank-transfer, cardHolder covers credit card payments
    wpConsumerName: payment.details?.consumerName || payment.details?.cardHolder || null,
  };
}

function cleanConsumerName(raw) {
  if (!raw) return null;
  const firstParty = raw.split(',')[0].trim(); // joint bank accounts list both names — take the first
  return firstParty.replace(/^(Hr|Mw|Dhr|Mevr|Mr|Mrs|Ms)\.?\s+/i, '').trim() || null;
}

// Infers the originating legacy plugin from the URLs Mollie stores on the payment, for
// transactions with no metadata.type (i.e. not created by this app's own checkout flows).
function inferLegacyType(payment) {
  const urls = `${payment.webhookUrl || ''} ${payment.redirectUrl || ''}`.toLowerCase();
  if (urls.includes('gravityforms') || urls.includes('/membership/')) return 'membership';
  if (urls.includes('woocommerce') || urls.includes('wp-json/mollie') || urls.includes('order-received') || urls.includes('checkout')) return 'event_ticket';
  return null;
}

async function resolveLocalRecord(type, referenceId) {
  const Model = LOCAL_MODELS[type];
  if (!Model || !referenceId) return null;
  try {
    return await Model.findById(referenceId);
  } catch {
    return null; // malformed id
  }
}

function identityFromLocalRecord(type, record) {
  if (type === 'sponsorship') {
    return { email: record.email, name: record.contactPerson || record.sponsorName };
  }
  return { email: record.email, name: record.name };
}

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Member';
  const lastName = parts.join(' ') || '-';
  return { firstName, lastName };
}

// ── Tier mapping fallback (only used for orphaned/unmatched payments) ──
async function tryTierMapping(amount, description) {
  const rules = await TierMappingRule.find({ isActive: true }).sort('sortOrder');
  const desc = (description || '').toLowerCase();
  const matches = rules.filter((r) => (
    r.matchType === 'amount'
      ? Number(r.matchValue) === Number(amount)
      : desc.includes(r.matchValue.toLowerCase())
  ));
  return matches.length === 1 ? matches[0].membershipTier : null; // none or ambiguous -> no suggestion
}

async function resolveTierForMembership(record) {
  return MembershipTier.findOne({ slug: record.plan })
    || MembershipTier.findOne({ name: new RegExp(`^${record.plan}$`, 'i') });
}

// ── Member matching/creation ────────────────────────────────────────
async function matchOrCreateMember({ email, name, paymentId }) {
  const normalizedEmail = email.trim().toLowerCase();
  let member = await Member.findOne({ email: normalizedEmail });
  let created = false;

  if (!member) {
    const { firstName, lastName } = splitName(name);
    const tempPassword = generateRawToken().slice(0, 20);
    member = await Member.create({
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash: await hashPassword(tempPassword),
      status: 'active',
      source: 'mollie_import',
      importedAt: new Date(),
      lastImportPaymentId: paymentId,
    });
    created = true;
  } else {
    // Same email, possibly a different name on this transaction — log the conflict, keep the
    // existing member record as-is (don't silently overwrite a name the member may have set themselves).
    const { firstName } = splitName(name);
    if (firstName && firstName.toLowerCase() !== member.firstName?.toLowerCase()) {
      console.warn(`[MollieImport] Name conflict for ${normalizedEmail}: existing="${member.firstName} ${member.lastName}" incoming="${name}"`);
    }
    member.lastImportPaymentId = paymentId;
    await member.save();
  }

  return { member, created };
}

// ── Core single-payment processing (shared by bulk import + webhook) ──
async function processTransaction(payment, importLogId = null) {
  const existingTxn = await MollieTransaction.findOne({ paymentId: payment.id });
  if (existingTxn) {
    return { outcome: 'skipped', reason: 'already imported', transaction: existingTxn };
  }

  const meta = extractMeta(payment);
  const baseFields = {
    paymentId: payment.id,
    type: meta.type,
    referenceId: meta.referenceId,
    amount: meta.amount,
    currency: meta.currency,
    status: payment.status,
    description: meta.description,
    metadata: payment.metadata,
    paidAt: meta.paidAt,
    mollieCreatedAt: meta.mollieCreatedAt,
    importLog: importLogId,
  };

  if (payment.status !== 'paid') {
    const txn = await MollieTransaction.create({ ...baseFields, importStatus: 'skipped' });
    return { outcome: 'skipped', transaction: txn };
  }

  const localRecord = meta.type && meta.referenceId
    ? await resolveLocalRecord(meta.type, meta.referenceId)
    : null;

  if (!localRecord) {
    const legacyType = meta.type || inferLegacyType(payment);
    const legacyName = cleanConsumerName(meta.wpConsumerName);
    const legacyEmail = meta.wpEmail;

    if (legacyEmail) {
      // Recovered enough identity straight from Mollie (WordPress plugins set billingAddress.email) —
      // auto-create/match a Member the same way we do for this app's own matched payments.
      const { member, created } = await matchOrCreateMember({ email: legacyEmail, name: legacyName, paymentId: payment.id });

      if (legacyType === 'membership') {
        const tierId = await tryTierMapping(meta.amount, meta.description);
        if (tierId) member.membershipTier = tierId;
        member.membershipStatus = 'active';
        await member.save();
      }

      const txn = await MollieTransaction.create({
        ...baseFields,
        type: legacyType || baseFields.type,
        email: legacyEmail.toLowerCase(),
        name: legacyName,
        importStatus: created ? 'created' : 'updated',
        member: member._id,
      });
      return { outcome: created ? 'created' : 'updated', transaction: txn, member };
    }

    // No email recoverable — flag for review, pre-filled with whatever we found (e.g. a bank account holder name)
    const txn = await MollieTransaction.create({ ...baseFields, type: legacyType || baseFields.type, name: legacyName, importStatus: 'flagged' });
    const suggestedTierId = await tryTierMapping(meta.amount, meta.description);
    await ManualReviewQueue.create({
      transaction: txn._id,
      name: legacyName,
      amount: meta.amount,
      description: meta.description,
      reason: legacyName
        ? 'Recovered a name from the payment’s bank details but no email address — admin must supply one'
        : (!meta.type ? 'No metadata on payment — cannot determine payment type' : 'No matching local record found for this payment (orphaned transaction)'),
      resolution: suggestedTierId ? { suggestedTierId } : undefined,
    });
    return { outcome: 'flagged', transaction: txn };
  }

  const { email, name } = identityFromLocalRecord(meta.type, localRecord);
  if (!email) {
    const txn = await MollieTransaction.create({ ...baseFields, importStatus: 'flagged' });
    await ManualReviewQueue.create({
      transaction: txn._id,
      name,
      amount: meta.amount,
      description: meta.description,
      reason: 'Matched local record has no email address',
    });
    return { outcome: 'flagged', transaction: txn };
  }

  const { member, created } = await matchOrCreateMember({ email, name, paymentId: payment.id });

  // Link the legacy payment record to the member for traceability + de-dup on repeat syncs
  localRecord.member = member._id;
  await localRecord.save();

  if (meta.type === 'membership') {
    const tier = await resolveTierForMembership(localRecord);
    if (tier) member.membershipTier = tier._id;
    member.membershipStatus = 'active';
    member.currentMembershipRecord = localRecord._id;
    await member.save();
  }

  const txn = await MollieTransaction.create({
    ...baseFields,
    email: email.toLowerCase(),
    name,
    importStatus: created ? 'created' : 'updated',
    member: member._id,
  });

  return { outcome: created ? 'created' : 'updated', transaction: txn, member };
}

// ── Preview (Sync Now) ──────────────────────────────────────────────
async function preview() {
  const payments = (await fetchAllPayments()).filter((p) => p.status === 'paid');
  const existingIds = new Set(
    (await MollieTransaction.find({ paymentId: { $in: payments.map((p) => p.id) } }).select('paymentId'))
      .map((t) => t.paymentId),
  );

  const rows = [];
  for (const payment of payments) {
    const meta = extractMeta(payment);
    const alreadyImported = existingIds.has(payment.id);
    let email = null;
    let name = null;
    let localMatch = false;
    let type = meta.type;
    let source = 'app'; // 'app' | 'recovered' | 'unmatched'

    if (!alreadyImported && meta.type && meta.referenceId) {
      const localRecord = await resolveLocalRecord(meta.type, meta.referenceId);
      if (localRecord) {
        ({ email, name } = identityFromLocalRecord(meta.type, localRecord));
        localMatch = Boolean(email);
      }
    } else if (!alreadyImported && !meta.type) {
      type = inferLegacyType(payment);
      name = cleanConsumerName(meta.wpConsumerName);
      email = meta.wpEmail;
      localMatch = Boolean(email);
      source = email ? 'recovered' : 'unmatched';
    }

    rows.push({
      paymentId: payment.id,
      type,
      email,
      name,
      localMatch,
      source,
      amount: meta.amount,
      currency: meta.currency,
      status: payment.status,
      description: meta.description,
      paidAt: meta.paidAt,
      alreadyImported,
    });
  }
  return rows;
}

// ── Confirm Import (manual sync) ────────────────────────────────────
async function runImport({ paymentIds, triggeredBy, adminId }) {
  const log = await MollieImportLog.create({ triggeredBy, triggeredByAdmin: adminId, status: 'running' });
  const client = await getConfiguredClient();

  let created = 0;
  let updated = 0;
  let flagged = 0;
  let skipped = 0;

  try {
    for (const paymentId of paymentIds) {
      try {
        const payment = await client.payments.get(paymentId);
        const result = await processTransaction(payment, log._id);
        if (result.outcome === 'created') created += 1;
        else if (result.outcome === 'updated') updated += 1;
        else if (result.outcome === 'flagged') flagged += 1;
        else skipped += 1;
      } catch (err) {
        console.error(`[MollieImport] Failed to process ${paymentId}:`, err.message);
        skipped += 1;
      }
    }
    log.totalFetched = paymentIds.length;
    log.created = created;
    log.updated = updated;
    log.flagged = flagged;
    log.skipped = skipped;
    log.status = 'completed';
    await log.save();
    return log;
  } catch (err) {
    log.status = 'failed';
    log.error = err.message;
    await log.save();
    throw err;
  }
}

// ── Single-payment processing for the real-time webhook ────────────
async function processWebhookPayment(paymentId) {
  const client = await getConfiguredClient();
  // Fetching the payment directly from Mollie by ID *is* the authenticity check —
  // Mollie's own recommended webhook-verification pattern (no signature header to check).
  const payment = await client.payments.get(paymentId);
  const log = await MollieImportLog.create({ triggeredBy: 'webhook', status: 'running' });
  const result = await processTransaction(payment, log._id);
  log.totalFetched = 1;
  log.created = result.outcome === 'created' ? 1 : 0;
  log.updated = result.outcome === 'updated' ? 1 : 0;
  log.flagged = result.outcome === 'flagged' ? 1 : 0;
  log.skipped = result.outcome === 'skipped' ? 1 : 0;
  log.status = 'completed';
  await log.save();
  return result;
}

// ── Manual review queue resolution ──────────────────────────────────
async function resolveReviewItem({ id, action, email, name, membershipTierId, adminId }) {
  const item = await ManualReviewQueue.findById(id);
  if (!item) {
    const err = new Error('Review item not found');
    err.status = 404;
    throw err;
  }

  if (action === 'ignore') {
    item.status = 'ignored';
    item.resolvedAt = new Date();
    item.resolvedBy = adminId;
    await item.save();
    return { item };
  }

  if (action === 'assign_tier' || action === 'mark_processed') {
    let member = null;
    if (email) {
      const txn = await MollieTransaction.findById(item.transaction);
      const result = await matchOrCreateMember({ email, name: name || item.name, paymentId: txn?.paymentId });
      member = result.member;
      if (action === 'assign_tier' && membershipTierId) {
        member.membershipTier = membershipTierId;
        member.membershipStatus = 'active';
        await member.save();
      }
      if (txn) {
        txn.importStatus = 'created';
        txn.member = member._id;
        txn.email = email.toLowerCase();
        txn.name = name || item.name;
        await txn.save();
      }
    }
    item.status = 'resolved';
    item.resolvedAt = new Date();
    item.resolvedBy = adminId;
    item.resolution = { action, email, membershipTierId };
    await item.save();
    return { item, member };
  }

  const err = new Error('Unknown action');
  err.status = 400;
  throw err;
}

module.exports = {
  connect,
  getStatus,
  preview,
  runImport,
  processWebhookPayment,
  resolveReviewItem,
};
