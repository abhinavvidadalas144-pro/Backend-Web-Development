require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cookieConfig = require('./config/cookie');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use(cookieParser(cookieConfig.secret));
app.use('/auth', authRoutes);
app.use((error, req, res, next) => {
  console.error('Request handling failed:', error);
  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON' },
    });
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
