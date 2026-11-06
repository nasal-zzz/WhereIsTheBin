const express = require('express');
const admin = require('../../controllers/admin/adminController');
const { requireLogin, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireLogin, requireRole(['moderator', 'admin', 'super-admin']));

router.get('/', admin.dashboard);
router.get('/facilities/:id', admin.show);
router.post('/facilities/:id/decision', admin.decide);
router.get('/audit', requireRole(['admin', 'super-admin']), admin.audit);

module.exports = router;