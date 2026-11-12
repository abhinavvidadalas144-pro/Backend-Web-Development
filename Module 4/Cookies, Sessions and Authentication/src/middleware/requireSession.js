const { COOKIE_NAME } = require('../config/cookie');
const authService = require('../services/authService');

module.exports = async function requireSession(req, res, next) {
  const sessionId = req.signedCookies[COOKIE_NAME];
  if (typeof sessionId !== 'string') {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
    });
  }

  try {
    const user = await authService.getUserForSession(sessionId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
    }

    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
