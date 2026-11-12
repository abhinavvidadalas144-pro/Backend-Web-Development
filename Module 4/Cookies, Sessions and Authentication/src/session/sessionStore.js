const sessions = new Map();

function create(sessionId, userId, expiresAt) {
  sessions.set(sessionId, { userId, expiresAt });
}

function get(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { ...session };
}

function destroy(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { create, get, destroy };
