const Transaction = require('../models/transaction.model');
const Account = require('../models/account.model');

/**
 * GET /accounts/:id/transactions
 */
exports.getByAccountId = async (req, res, next) => {
  try {
    const account = await Account.findRawById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactions = await Transaction.findByAccountId(req.params.id);
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};
