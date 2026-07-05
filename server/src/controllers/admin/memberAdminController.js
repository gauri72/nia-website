const Member = require('../../models/Member');
const MembershipTier = require('../../models/MembershipTier');
const MollieTransaction = require('../../models/MollieTransaction');
const { hashPassword, generateRawToken } = require('../../services/authService');
const { sendMemberPasswordResetEmail } = require('../../services/emailService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const SENSITIVE_FIELDS = '-passwordHash -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires';

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// For Mollie-imported members, `createdAt` is when the import ran, not when they actually
// paid. Attach the real transaction date(s) from MollieTransaction so the admin sees the
// date that matters — falls back to nothing (UI uses createdAt) for organically-registered members.
async function attachTransactionDates(members) {
  const memberIds = members.map((m) => m._id);
  const earliest = await MollieTransaction.aggregate([
    { $match: { member: { $in: memberIds }, paidAt: { $ne: null } } },
    { $group: { _id: '$member', transactionDate: { $min: '$paidAt' } } },
  ]);
  const dateMap = new Map(earliest.map((e) => [String(e._id), e.transactionDate]));
  return members.map((m) => ({ ...m, transactionDate: dateMap.get(String(m._id)) || null }));
}

function buildFilter({ search, status, tier }) {
  const filter = { status: { $ne: 'deleted' } };
  if (search?.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { memberId: re }];
  }
  if (status?.trim()) filter.membershipStatus = status.trim();
  if (tier?.trim()) filter.membershipTier = tier.trim();
  return filter;
}

// ── GET /api/admin/members ──────────────────────────────────────
async function list(req, res, next) {
  try {
    const { search, status, tier, sort = '-createdAt', page = 1, limit = 25 } = req.query;
    const filter = buildFilter({ search, status, tier });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [members, total] = await Promise.all([
      Member.find(filter)
        .select(SENSITIVE_FIELDS)
        .populate('membershipTier', 'name color')
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Member.countDocuments(filter),
    ]);

    const membersWithDates = await attachTransactionDates(members);
    return res.json({ members: membersWithDates, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/members/export ───────────────────────────────
async function exportCsv(req, res, next) {
  try {
    const { search, status, tier } = req.query;
    const filter = buildFilter({ search, status, tier });
    const members = await Member.find(filter).populate('membershipTier', 'name').sort('-createdAt').lean();
    const membersWithDates = await attachTransactionDates(members);

    const header = ['Member ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Membership Tier', 'Membership Status', 'Expiry Date', 'Joined Date', 'Mollie Transaction Date'];
    const rows = membersWithDates.map((m) => [
      m.memberId, m.firstName, m.lastName, m.email, m.phone || '',
      m.membershipTier?.name || '', m.membershipStatus,
      m.membershipExpiresAt ? new Date(m.membershipExpiresAt).toISOString().slice(0, 10) : '',
      new Date(m.createdAt).toISOString().slice(0, 10),
      m.transactionDate ? new Date(m.transactionDate).toISOString().slice(0, 10) : '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nia-members-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/admin/members/:id ───────────────────────────────────
async function getById(req, res, next) {
  try {
    const member = await Member.findById(req.params.id).select(SENSITIVE_FIELDS).populate('membershipTier').lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const [withDate] = await attachTransactionDates([member]);
    return res.json(withDate);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/members ───────────────────────────────────────
async function create(req, res, next) {
  try {
    const { firstName, lastName, email, phone, membershipTier } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'firstName, lastName and email are required' });
    }

    const existing = await Member.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: 'A member with this email already exists' });

    if (membershipTier) {
      const tierExists = await MembershipTier.findById(membershipTier);
      if (!tierExists) return res.status(400).json({ error: 'Invalid membership tier' });
    }

    // Admin-added members skip email verification; a random password is set and
    // a reset link is emailed immediately so they can choose their own password.
    const tempPassword = generateRawToken();
    const resetToken = generateRawToken();

    const member = await Member.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      passwordHash: await hashPassword(tempPassword),
      emailVerified: true,
      membershipTier: membershipTier || undefined,
      membershipStatus: membershipTier ? 'active' : 'none',
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${process.env.FRONTEND_URL}/dashboard/reset-password?token=${resetToken}`;
    sendMemberPasswordResetEmail(member, resetUrl).catch((err) =>
      console.error('[MemberAdmin] Failed to send welcome/reset email:', err.message)
    );

    const safeMember = await Member.findById(member._id).select(SENSITIVE_FIELDS);
    return res.status(201).json(safeMember);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/members/:id ───────────────────────────────────
async function update(req, res, next) {
  try {
    const { firstName, lastName, phone, address, membershipTier, membershipStatus, membershipExpiresAt, autoRenew } = req.body;

    if (membershipTier) {
      const tierExists = await MembershipTier.findById(membershipTier);
      if (!tierExists) return res.status(400).json({ error: 'Invalid membership tier' });
    }

    const update = {};
    if (firstName !== undefined) update.firstName = firstName.trim();
    if (lastName !== undefined) update.lastName = lastName.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (address !== undefined) update.address = address.trim();
    if (membershipTier !== undefined) update.membershipTier = membershipTier || null;
    if (membershipStatus !== undefined) update.membershipStatus = membershipStatus;
    if (membershipExpiresAt !== undefined) update.membershipExpiresAt = membershipExpiresAt || null;
    if (autoRenew !== undefined) update.autoRenew = autoRenew;

    const member = await Member.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select(SENSITIVE_FIELDS)
      .populate('membershipTier');
    if (!member) return res.status(404).json({ error: 'Member not found' });

    return res.json(member);
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/admin/members/:id/status ─────────────────────────────
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'status must be active, suspended or deleted' });
    }

    const member = await Member.findByIdAndUpdate(req.params.id, { status }, { new: true }).select(SENSITIVE_FIELDS);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    return res.json(member);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, exportCsv, getById, create, update, updateStatus };
