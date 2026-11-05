const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../../controllers/web/authController');
const contribute = require('../../controllers/web/contributeController');
const { requireLogin } = require('../../middleware/auth');

const router = express.Router();
const limiter = (limit, windowMs) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false });
const authLimiter = limiter(10, 15 * 60 * 1000);
const submitLimiter = limiter(10, 60 * 60 * 1000);

router.get('/register', auth.showRegister);
router.post('/register', authLimiter, auth.register);
router.get('/login', auth.showLogin);
router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);

router.get('/add', requireLogin, contribute.showAdd);
router.post('/add', requireLogin, submitLimiter, contribute.submitAdd);
router.get('/my', requireLogin, contribute.myContributions);

module.exports = router;
