const COOKIE_NAME = 'sid';
const DEFAULT_SESSION_MAX_AGE_MS = 86400000;

function buildCookieConfig(env = process.env) {
  const secret = env.COOKIE_SECRET;
  if (
    typeof secret !== 'string'
    || secret.length < 32
    || secret === 'replace-with-a-long-random-secret'
  ) {
    throw new Error('COOKIE_SECRET must be a non-placeholder value of at least 32 characters');
  }

  const maxAge = Number(env.SESSION_MAX_AGE_MS || DEFAULT_SESSION_MAX_AGE_MS);
  if (!Number.isSafeInteger(maxAge) || maxAge <= 0) {
    throw new Error('SESSION_MAX_AGE_MS must be a positive integer');
  }

  if (env.COOKIE_SECURE !== undefined && !['true', 'false'].includes(env.COOKIE_SECURE)) {
    throw new Error('COOKIE_SECURE must be true or false');
  }

  const secure = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge,
  };
  const clearCookieOptions = {
    path: cookieOptions.path,
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
  };

  return { secret, maxAge, cookieOptions, clearCookieOptions };
}

const config = buildCookieConfig();

module.exports = {
  COOKIE_NAME,
  ...config,
  buildCookieConfig,
};
