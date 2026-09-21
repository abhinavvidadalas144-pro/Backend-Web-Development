/**
 * Posts router (already written). Mounted at /posts in app.js.
 */

const express = require('express');
const router = express.Router();

const auditWrite = require('../middleware/auditWrite');

const posts = [{ id: 1, title: 'Hello World' }];

// Public read — no audit middleware.
router.get('/', (req, res) => {
  res.json({ data: posts });
});

// Audit middleware runs only for POST requests.
router.post('/', auditWrite, (req, res) => {
  const post = {
    id: posts.length + 1,
    title: req.body.title || 'Untitled'
  };

  posts.push(post);

  res.status(201).json({ data: post });
});

module.exports = router;