const express = require('express');
const router = express.Router();
const { adminToken } = require('../config');

// POST /api/auth/login — 校验 token
router.post('/login', (req, res) => {
  const { token } = req.body;
  if (token === adminToken) {
    res.json({ success: true });
  } else {
    res.status(401).json({ message: '密码错误' });
  }
});

module.exports = router;
