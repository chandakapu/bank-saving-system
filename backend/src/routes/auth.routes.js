const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.get('/session', requireAuth, auth.session);

module.exports = router;
