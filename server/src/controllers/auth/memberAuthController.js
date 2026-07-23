const Member = require('../../models/Member');
const { hashPassword, comparePassword, signToken, generateRawToken } = require('../../services/authService');
const { sendMemberVerificationEmail, sendMemberPasswordResetEmail, sendWelcomeEmail } = require('../../services/emailService');

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function publicMember(member) {
  return {
    id: member._id,
    memberId: member.memberId,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    address: member.address,
    profilePhotoUrl: member.profilePhotoUrl,
    emailVerified: member.emailVerified,
    membershipTier: member.membershipTier,
    membershipStatus: member.membershipStatus,
    membershipExpiresAt: member.membershipExpiresAt,
    autoRenew: member.autoRenew,
    communicationPrefs: member.communicationPrefs,
    unsubscribedAt: member.unsubscribedAt,
  };
}

// ── POST /api/member-auth/register ─────────────────────────────
async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'firstName, lastName, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await Member.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateRawToken();

    const member = await Member.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      passwordHash,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/dashboard/verify-email?token=${verificationToken}`;
    sendMemberVerificationEmail(member, verifyUrl).catch(err =>
      console.error('[MemberAuth] Failed to send verification email:', err.message)
    );

    return res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/member-auth/verify-email?token=... ─────────────────
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (typeof token !== 'string' || !token) return res.status(400).json({ error: 'Token is required' });

    const member = await Member.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!member) return res.status(400).json({ error: 'Invalid or expired verification link' });

    member.emailVerified = true;
    member.emailVerificationToken = undefined;
    member.emailVerificationExpires = undefined;
    await member.save();

    sendWelcomeEmail(member).catch((err) => console.error('[MemberAuth] Failed to send welcome email:', err.message));

    return res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member-auth/login ─────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const member = await Member.findOne({ email: email.trim().toLowerCase() });
    if (!member || !(await comparePassword(password, member.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (member.status !== 'active') {
      return res.status(403).json({ error: 'This account is not active. Please contact NIA support.' });
    }
    if (!member.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    member.lastLoginAt = new Date();
    await member.save();

    const token = signToken({ id: member._id.toString(), kind: 'member', tokenVersion: member.tokenVersion });
    return res.json({ token, member: publicMember(member) });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member-auth/forgot-password ───────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

    const member = await Member.findOne({ email: email.trim().toLowerCase() });
    // Always return 200 — don't leak whether an email is registered
    if (member) {
      const resetToken = generateRawToken();
      member.passwordResetToken = resetToken;
      member.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await member.save();

      const resetUrl = `${process.env.FRONTEND_URL}/dashboard/reset-password?token=${resetToken}`;
      sendMemberPasswordResetEmail(member, resetUrl).catch(err =>
        console.error('[MemberAuth] Failed to send reset email:', err.message)
      );
    }

    return res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/member-auth/reset-password ─────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const member = await Member.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!member) return res.status(400).json({ error: 'Invalid or expired reset link' });

    member.passwordHash = await hashPassword(password);
    member.passwordResetToken = undefined;
    member.passwordResetExpires = undefined;
    member.tokenVersion = (member.tokenVersion || 0) + 1;
    await member.save();

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/member-auth/me ───────────────────────────────────────
async function me(req, res, next) {
  try {
    const member = await Member.findById(req.member.id).populate('membershipTier');
    if (!member) return res.status(404).json({ error: 'Member not found' });
    return res.json(publicMember(member));
  } catch (err) {
    next(err);
  }
}

module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, me };
