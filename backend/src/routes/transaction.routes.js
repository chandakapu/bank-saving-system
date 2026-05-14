const router = require('express').Router();
const transactionController = require('../controllers/transaction.controller');

// GET /accounts/:id/transactions
router.get('/:id/transactions', transactionController.getByAccountId);

module.exports = router;
