const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const cookieConfig = require('../config/cookie');
const userRepository = require('../repositories/userRepository');
const sessionStore = require('../session/sessionStore');

function toSafeUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

async function login(email, password) {
  const user = await userRepository.findUserForAuthentication(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  const sessionId = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + cookieConfig.maxAge;
  sessionStore.create(sessionId, user.id, expiresAt);

  return { sessionId, user: toSafeUser(user) };
}

async function getUserForSession(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const user = await userRepository.findUserById(session.userId);
  if (!user) {
    sessionStore.destroy(sessionId);
    return null;
  }

  return toSafeUser(user);
}

module.exports = { login, getUserForSession, toSafeUser };
