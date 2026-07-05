const mollieImportService = require('../../services/mollieImportService');
const { toCsv } = require('../../services/reportService');
const MollieImportLog = require('../../models/MollieImportLog');
const MollieTransaction = require('../../models/MollieTransaction');
const ManualReviewQueue = require('../../models/ManualReviewQueue');
const MollieWebhookLog = require('../../models/MollieWebhookLog');
const TierMappingRule = require('../../models/TierMappingRule');

// ── POST /api/admin/mollie/connect ─────────────────────────────────
async function connect(req, res, next) {
  try {
    const { apiKey } = req.body || {};
    const result = await mollieImportService.connect({ apiKey, adminId: req.admin.id });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/status ───────────────────────────────────
async function status(req, res, next) {
  try {
    const result = await mollieImportService.getStatus();
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/mollie/sync — fetch + preview, no writes ──────
async function sync(req, res, next) {
  try {
    const rows = await mollieImportService.preview();
    return res.json({ transactions: rows });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/mollie/import — process selected rows ─────────
async function importTransactions(req, res, next) {
  try {
    const { paymentIds } = req.body || {};
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: 'paymentIds must be a non-empty array' });
    }
    const log = await mollieImportService.runImport({
      paymentIds,
      triggeredBy: 'manual',
      adminId: req.admin.id,
    });
    return res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/import-history ───────────────────────────
async function importHistory(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const [logs, total] = await Promise.all([
      MollieImportLog.find().sort('-createdAt').skip((page - 1) * limit).limit(limit),
      MollieImportLog.countDocuments(),
    ]);
    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/import-history/:id ───────────────────────
async function importHistoryDetail(req, res, next) {
  try {
    const log = await MollieImportLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Import run not found' });
    const transactions = await MollieTransaction.find({ importLog: log._id }).sort('-createdAt');
    return res.json({ log, transactions });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/review-queue ──────────────────────────────
async function reviewQueue(req, res, next) {
  try {
    const status = req.query.status || 'pending';
    const items = await ManualReviewQueue.find({ status }).sort('-createdAt').populate('transaction');
    return res.json(items);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/mollie/review-queue/:id ─────────────────────────
async function resolveReviewQueueItem(req, res, next) {
  try {
    const { action, email, name, membershipTierId } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action is required' });
    const result = await mollieImportService.resolveReviewItem({
      id: req.params.id, action, email, name, membershipTierId, adminId: req.admin.id,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/webhook-log ───────────────────────────────
async function webhookLog(req, res, next) {
  try {
    const logs = await MollieWebhookLog.find().sort('-receivedAt').limit(100);
    return res.json(logs);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/transactions ──────────────────────────────
async function transactions(req, res, next) {
  try {
    const { status: importStatus, type, search, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (importStatus) filter.importStatus = importStatus;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { email: new RegExp(search, 'i') },
        { name: new RegExp(search, 'i') },
        { paymentId: new RegExp(search, 'i') },
      ];
    }
    const [items, total] = await Promise.all([
      MollieTransaction.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
      MollieTransaction.countDocuments(filter),
    ]);
    return res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/mollie/transactions/export ───────────────────────
async function exportTransactions(req, res, next) {
  try {
    const items = await MollieTransaction.find().sort('-createdAt');
    const headers = ['Payment ID', 'Type', 'Email', 'Name', 'Amount', 'Currency', 'Status', 'Import Status', 'Paid At'];
    const rows = items.map((t) => [
      t.paymentId, t.type || '', t.email || '', t.name || '', t.amount.toFixed(2), t.currency,
      t.status, t.importStatus, t.paidAt ? new Date(t.paidAt).toLocaleString() : '',
    ]);
    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mollie-transactions.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

// ── GET/POST /api/admin/mollie/tier-mapping ─────────────────────────
async function listTierMapping(req, res, next) {
  try {
    const rules = await TierMappingRule.find().sort('sortOrder').populate('membershipTier', 'name');
    return res.json(rules);
  } catch (err) {
    next(err);
  }
}

async function createTierMapping(req, res, next) {
  try {
    const { matchType, matchValue, membershipTier } = req.body || {};
    if (!matchType || !matchValue || !membershipTier) {
      return res.status(400).json({ error: 'matchType, matchValue and membershipTier are required' });
    }
    const rule = await TierMappingRule.create({ matchType, matchValue, membershipTier });
    return res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function deleteTierMapping(req, res, next) {
  try {
    await TierMappingRule.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  connect, status, sync, importTransactions, importHistory, importHistoryDetail,
  reviewQueue, resolveReviewQueueItem, webhookLog, transactions, exportTransactions,
  listTierMapping, createTierMapping, deleteTierMapping,
};
