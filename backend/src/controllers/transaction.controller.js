const Transaction = require('../models/transaction.model');
const Account = require('../models/account.model');
const validation = require('../lib/validation');
const HttpError = require('../lib/httpError');

/**
 * GET /accounts/:id/transactions
 */
exports.getByAccountId = async (req, res, next) => {
  try {
    const accountId = validation.positiveInteger(req.params.id, 'account id');
    const account = await Account.findRawById(accountId);
    if (!account) {
      throw new HttpError(404, 'Account not found');
    }

    const paging = validation.pagination(req.query);
    const { rows, total } = await Transaction.findByAccountId(accountId, paging);
    res.json(validation.paginated(rows, total, paging.page, paging.limit));
  } catch (err) {
    next(err);
  }
};
