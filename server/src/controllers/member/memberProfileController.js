const Member = require('../../models/Member');
const SuppressionList = require('../../models/SuppressionList');
const { hashPassword, comparePassword } = require('../../services/authService');

const SAFE_FIELDS = '-passwordHash -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires';

// ── PATCH /api/member/profile ─────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone, address, profilePhotoUrl } = req.body;
    const update = {};
    if (firstName !== undefined) update.firstName = firstName.trim();
    if (lastName !== undefined) update.lastName = lastName.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (address !== undefined) update.address = address.trim();
    if (profilePhotoUrl !== undefined) update.profilePhotoUrl = profilePhotoUrl;

    const member = await Member.findByIdAndUpdate(req.member.id, update, { new: true, runValidators: true })
      .select(SAFE_FIELDS).populate('membershipTier');
    return res.json(member);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member/profile/change-password ──────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const member = await Member.findById(req.member.id);
    if (!(await comparePassword(currentPassword, member.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    member.passwordHash = await hashPassword(newPassword);
    await member.save();
    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/member/profile/communication-prefs ──────────────────
async function updateCommunicationPrefs(req, res, next) {
  try {
    const { newsletter, eventReminders, promotional } = req.body;
    const update = {};
    if (newsletter !== undefined) update['communicationPrefs.newsletter'] = newsletter;
    if (eventReminders !== undefined) update['communicationPrefs.eventReminders'] = eventReminders;
    if (promotional !== undefined) update['communicationPrefs.promotional'] = promotional;

    const member = await Member.findByIdAndUpdate(req.member.id, update, { new: true }).select(SAFE_FIELDS);
    return res.json(member);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member/profile/unsubscribe ────────────────────────────
async function unsubscribe(req, res, next) {
  try {
    const member = await Member.findById(req.member.id);
    member.unsubscribedAt = new Date();
    member.communicationPrefs.newsletter = false;
    member.communicationPrefs.promotional = false;
    await member.save();

    await SuppressionList.findOneAndUpdate(
      { email: member.email },
      { email: member.email, reason: 'unsubscribed', member: member._id, suppressedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ message: 'You have been unsubscribed from broadcast emails' });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/member/profile ────────────────────────────────────
async function deleteAccount(req, res, next) {
  try {
    await Member.findByIdAndUpdate(req.member.id, { status: 'deleted' });
    return res.json({ message: 'Your account has been deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateProfile, changePassword, updateCommunicationPrefs, unsubscribe, deleteAccount };
