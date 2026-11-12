const { COOKIE_NAME, cookieOptions, clearCookieOptions } = require('../config/cookie');
const authService = require('../services/authService');
const sessionStore = require('../session/sessionStore');

const INVALID_CREDENTIALS = {
  error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'A valid email and password are required' },
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'A valid email and password are required' },
    });
  }

  try {
    const result = await authService.login(normalizedEmail, password);
    if (!result) return res.status(401).json(INVALID_CREDENTIALS);

    res.cookie(COOKIE_NAME, result.sessionId, {
      ...cookieOptions,
      signed: true,
    });
    return res.status(200).json({ user: result.user });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.status(200).json({ user: req.authUser });
}

function logout(req, res) {
  const sessionId = req.signedCookies[COOKIE_NAME];
  if (typeof sessionId === 'string') sessionStore.destroy(sessionId);

  res.clearCookie(COOKIE_NAME, clearCookieOptions);
  return res.status(204).end();
}

module.exports = { login, me, logout };
