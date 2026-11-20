const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } = require('crypto');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_FIELDS = '+otpHash +otpPurpose +otpExpiresAt +otpSentAt +otpAttempts +otpChallengeHash';

function hashValue(value) {
  return createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
}

function hashOtp(email, otp, challengeToken) {
  return hashValue(`${email}:${challengeToken}:${otp}`);
}

function matchesHash(expected, actual) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function clearOtpCode(user) {
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpSentAt = undefined;
  user.otpAttempts = 0;
}

function clearOtp(user) {
  clearOtpCode(user);
  user.otpPurpose = undefined;
  user.otpChallengeHash = undefined;
}

function createSession(user, res) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 });
  return res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}

function deliverOtpInBackground(user, otp, purpose, challengeToken) {
  setImmediate(() => {
    sendOtpEmail({ to: user.email, name: user.name, otp, purpose }).catch(async error => {
      console.error('Background OTP email delivery failed:', error.code || error.message);
      try {
        const latestUser = await User.findById(user._id).select(OTP_FIELDS);
        const expectedChallengeHash = hashValue(`${user.email}:${challengeToken}`);
        if (!latestUser || !matchesHash(latestUser.otpChallengeHash, expectedChallengeHash)) return;
        clearOtpCode(latestUser);
        await latestUser.save();
      } catch (cleanupError) {
        console.error('Could not clear failed OTP delivery state:', cleanupError.message);
      }
    });
  });
}

async function issueOtp(user, purpose) {
  const now = Date.now();
  const cooldownRemaining = user.otpSentAt
    ? OTP_RESEND_COOLDOWN_MS - (now - user.otpSentAt.getTime())
    : 0;
  if (cooldownRemaining > 0) {
    return { sent: false, retryAfterSeconds: Math.ceil(cooldownRemaining / 1000) };
  }

  const otp = String(randomInt(100000, 1000000));
  const challengeToken = randomBytes(32).toString('hex');
  user.otpHash = hashOtp(user.email, otp, challengeToken);
  user.otpChallengeHash = hashValue(`${user.email}:${challengeToken}`);
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(now + OTP_EXPIRY_MS);
  user.otpSentAt = new Date(now);
  user.otpAttempts = 0;
  await user.save();
  deliverOtpInBackground(user, otp, purpose, challengeToken);
  return { sent: true, challengeToken };
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters' });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: 'client',
      emailVerified: false
    });
    const delivery = await issueOtp(user, 'verify-email');
    return res.status(201).json({
      message: 'Your verification code is on its way. Check your inbox in a moment.',
      verificationRequired: true,
      email: user.email,
      purpose: 'verify-email',
      challengeToken: delivery.challengeToken
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(OTP_FIELDS);
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    const purpose = user.emailVerified ? 'login' : 'verify-email';
    const delivery = await issueOtp(user, purpose);
    if (!delivery.sent) {
      return res.status(429).json({ message: `A code was sent recently. Try signing in again in ${delivery.retryAfterSeconds} seconds.` });
    }
    return res.json({
      message: 'Your verification code is on its way. Check your inbox in a moment.',
      verificationRequired: true,
      email: user.email,
      purpose,
      challengeToken: delivery.challengeToken
    });
  } catch (error) {
    return next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : '';
    if (!email || !/^\d{6}$/.test(otp) || !/^[a-f0-9]{64}$/i.test(challengeToken)) {
      return res.status(400).json({ message: 'Enter the six-digit verification code for your active sign-in' });
    }

    const user = await User.findOne({ email }).select(OTP_FIELDS);
    const challengeHash = hashValue(`${email}:${challengeToken}`);
    if (!user || !user.otpChallengeHash || !matchesHash(user.otpChallengeHash, challengeHash)) {
      return res.status(400).json({ message: 'Verification session expired. Start the sign-in or registration process again.' });
    }
    if (!user.otpHash || !user.otpPurpose) {
      return res.status(400).json({ message: 'No active verification code. Request a new code.' });
    }
    if (!user.otpExpiresAt || user.otpExpiresAt.getTime() <= Date.now()) {
      clearOtpCode(user);
      await user.save();
      return res.status(400).json({ message: 'Verification code expired. Request a new code.' });
    }
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      clearOtpCode(user);
      await user.save();
      return res.status(429).json({ message: 'Too many incorrect attempts. Request a new verification code.' });
    }

    const matches = matchesHash(user.otpHash, hashOtp(user.email, otp, challengeToken));
    if (!matches) {
      user.otpAttempts += 1;
      const attemptsRemaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
      if (attemptsRemaining === 0) {
        clearOtpCode(user);
        await user.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. Request a new verification code.' });
      }
      await user.save();
      return res.status(400).json({ message: `Incorrect code. ${attemptsRemaining} attempts remaining.` });
    }

    if (user.otpPurpose === 'verify-email') user.emailVerified = true;
    if (user.otpPurpose === 'login' && !user.emailVerified) {
      clearOtp(user);
      await user.save();
      return res.status(400).json({ message: 'Verify your email address before signing in.' });
    }
    clearOtp(user);
    await user.save();
    return createSession(user, res);
  } catch (error) {
    return next(error);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : '';
    if (!email || !/^[a-f0-9]{64}$/i.test(challengeToken)) {
      return res.status(400).json({ message: 'An active verification session is required' });
    }
    const user = await User.findOne({ email }).select(OTP_FIELDS);
    const challengeHash = hashValue(`${email}:${challengeToken}`);
    if (!user || !user.otpPurpose || !user.otpChallengeHash || !matchesHash(user.otpChallengeHash, challengeHash)) {
      return res.status(400).json({ message: 'Verification session expired. Start the sign-in or registration process again.' });
    }

    const purpose = user.otpPurpose;
    const delivery = await issueOtp(user, purpose);
    if (!delivery.sent) {
      return res.status(429).json({
        message: `Wait ${delivery.retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds: delivery.retryAfterSeconds
      });
    }
    return res.json({
      message: 'Your new verification code is on its way.',
      challengeToken: delivery.challengeToken
    });
  } catch (error) {
    return next(error);
  }
};

exports.me = (req, res) => res.json({ user: req.user });
exports.logout = async (req, res, next) => {
  try {
    const tokenHash = createHash('sha256').update(req.authToken).digest('hex');
    await TokenBlacklist.updateOne(
      { tokenHash },
      { $setOnInsert: { tokenHash, expiresAt: req.authTokenExpiresAt } },
      { upsert: true }
    );
    res.clearCookie('token', {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    }).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};
