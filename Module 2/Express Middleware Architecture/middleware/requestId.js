/**
 * requestId middleware [mount GLOBALLY in app.js]
 */

const { randomUUID } = require('crypto');

module.exports = function requestId(req, res, next) {
  const id = randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);

  next();
};