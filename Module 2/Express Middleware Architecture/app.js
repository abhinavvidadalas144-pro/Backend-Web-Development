/**
 * Express Middleware Architecture — Build the Pipeline
 */

const express = require('express');

const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

const requestId = require('./middleware/requestId');
const logger = require('./middleware/logger');
const timing = require('./middleware/timing');

const app = express();

app.use(express.json());

// Global observability middleware.
// Order matters: requestId must run before logger and timing.
app.use(requestId);
app.use(logger);
app.use(timing);

// Routers
app.use('/posts', postsRouter);
app.use('/users', usersRouter);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

module.exports = app;