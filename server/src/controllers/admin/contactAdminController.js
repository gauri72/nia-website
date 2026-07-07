const Contact = require('../../models/Contact');
const Member = require('../../models/Member');
const MembershipTier = require('../../models/MembershipTier');
const { hashPassword, generateRawToken } = require('../../services/authService');
const { sendMemberPasswordResetEmail, sendMembershipPaymentConfirmation } = require('../../services/emailService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// ── GET /api/admin/contacts ────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { search, userType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (userType) filter.userType = userType;
    if (search) {
      filter.$or = [
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      Contact.find(filter).sort('fullName').skip((page - 1) * limit).limit(Number(limit)),
      Contact.countDocuments(filter),
    ]);

    const counts = await Contact.aggregate([{ $group: { _id: '$userType', count: { $sum: 1 } } }]);
    const byType = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});

    return res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit), byType });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/contacts ────────────────────────────────────────
async function create(req, res, next) {
  try {
    const { fullName, email, phone, userType, notes } = req.body;
    if (!fullName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'fullName and email are required' });
    }
    const existing = await Contact.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const contact = await Contact.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      userType: userType || 'user',
      notes: notes?.trim(),
    });
    return res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/admin/contacts/:id ────────────────────────────────────
async function update(req, res, next) {
  try {
    const { fullName, email, phone, userType, notes } = req.body;
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'User not found' });

    if (fullName !== undefined) contact.fullName = fullName.trim();
    if (email !== undefined) contact.email = email.trim().toLowerCase();
    if (phone !== undefined) contact.phone = phone.trim();
    if (userType !== undefined) contact.userType = userType;
    if (notes !== undefined) contact.notes = notes.trim();

    await contact.save();
    return res.json(contact);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/admin/contacts/:id ──────────────────────────────────
async function remove(req, res, next) {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin/contacts/:id/convert-to-member ──────────────────
// Mirrors memberAdminController.create() exactly (same account-setup email,
// same optional tier-grant confirmation) so a converted User becomes a real
// Member the same way manually adding one does today.
async function convertToMember(req, res, next) {
  try {
    const { firstName, lastName, phone, membershipTier, membershipExpiresAt } = req.body;
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'User not found' });
    if (contact.linkedMember) return res.status(400).json({ error: 'This user has already been converted to a member' });

    const existingMember = await Member.findOne({ email: contact.email });
    if (existingMember) return res.status(409).json({ error: 'A member with this email already exists' });

    let tier = null;
    if (membershipTier) {
      tier = await MembershipTier.findById(membershipTier);
      if (!tier) return res.status(400).json({ error: 'Invalid membership tier' });
    }

    const tempPassword = generateRawToken();
    const resetToken = generateRawToken();

    const member = await Member.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: contact.email,
      phone: (phone ?? contact.phone)?.trim(),
      passwordHash: await hashPassword(tempPassword),
      emailVerified: true,
      membershipTier: membershipTier || undefined,
      // Always active — the Members list only shows active members, and marking
      // someone as a Member from the Users list should make them show up there.
      membershipStatus: 'active',
      membershipExpiresAt: membershipTier && membershipExpiresAt ? new Date(membershipExpiresAt) : undefined,
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${process.env.FRONTEND_URL}/dashboard/reset-password?token=${resetToken}`;
    sendMemberPasswordResetEmail(member, resetUrl).catch((err) =>
      console.error('[ContactAdmin] Failed to send welcome/reset email:', err.message)
    );
    if (tier) {
      sendMembershipPaymentConfirmation({ member, membershipTier: tier, type: 'manual' }).catch((err) =>
        console.error('[ContactAdmin] Failed to send membership confirmation email:', err.message)
      );
    }

    contact.linkedMember = member._id;
    contact.convertedToMemberAt = new Date();
    await contact.save();

    return res.status(201).json({ member, contact });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, convertToMember };
