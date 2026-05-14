const Account = require('../models/account.model');
const Customer = require('../models/customer.model');
const DepositoType = require('../models/depositoType.model');
const Transaction = require('../models/transaction.model');

/**
 * GET /accounts
 */
exports.getAll = async (req, res, next) => {
  try {
    const accounts = await Account.findAll();
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /accounts/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /accounts
 */
exports.create = async (req, res, next) => {
  try {
    const { customer_id, deposito_type_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    if (!deposito_type_id) {
      return res.status(400).json({ error: 'deposito_type_id is required' });
    }

    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Verify deposito type exists
    const depositoType = await DepositoType.findById(deposito_type_id);
    if (!depositoType) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    const account = await Account.create({ customer_id, deposito_type_id });
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /accounts/:id
 */
exports.update = async (req, res, next) => {
  try {
    const existing = await Account.findRawById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { deposito_type_id } = req.body;
    if (!deposito_type_id) {
      return res.status(400).json({ error: 'deposito_type_id is required' });
    }

    // Verify deposito type exists
    const depositoType = await DepositoType.findById(deposito_type_id);
    if (!depositoType) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    const updated = await Account.update(req.params.id, { deposito_type_id });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /accounts/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const existing = await Account.findRawById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // 409 guard: cannot delete if account has transactions
    const hasTx = await Account.hasTransactions(req.params.id);
    if (hasTx) {
      return res.status(409).json({
        error: 'Cannot delete account with existing transactions.',
      });
    }

    await Account.delete(req.params.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /accounts/:id/deposit
 *
 * Deposits money into an account.
 */
exports.deposit = async (req, res, next) => {
  try {
    const account = await Account.findRawById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { amount, transaction_date } = req.body;

    // Validation
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (!transaction_date) {
      return res.status(400).json({ error: 'transaction_date is required' });
    }

    // Cannot be in the future
    const txDate = new Date(transaction_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (txDate > today) {
      return res.status(400).json({ error: 'transaction_date cannot be in the future' });
    }

    // Create deposit transaction
    const transactionId = await Transaction.createDeposit({
      account_id: account.id,
      amount: numAmount,
      transaction_date,
    });

    // Update account balance
    const newBalance = parseFloat(account.balance) + numAmount;
    await Account.updateBalance(account.id, newBalance);

    res.status(201).json({
      transaction_id: transactionId,
      type: 'deposit',
      amount: numAmount.toFixed(2),
      new_balance: newBalance.toFixed(2),
      transaction_date,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /accounts/:id/withdraw
 *
 * Full withdrawal with interest calculation.
 * Follows the sequence diagram flow exactly:
 * 1. Fetch account → 404
 * 2. balance == 0 → 400
 * 3. Fetch last deposit → 400 if none
 * 4. Calculate ending_balance = balance + (balance × months × monthly_return)
 * 5. INSERT withdrawal transaction
 * 6. UPDATE account balance to 0
 * 7. Return 201 with full breakdown
 */
exports.withdraw = async (req, res, next) => {
  try {
    // Step 1: Fetch account
    const account = await Account.findRawById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { transaction_date } = req.body;
    if (!transaction_date) {
      return res.status(400).json({ error: 'transaction_date is required' });
    }

    // Step 2: Guard — balance is 0
    const balance = parseFloat(account.balance);
    if (balance === 0) {
      return res.status(400).json({ error: 'Account balance is 0, nothing to withdraw' });
    }

    // Step 3: Fetch last deposit
    const lastDeposit = await Transaction.getLastDeposit(account.id);
    if (!lastDeposit) {
      return res.status(400).json({ error: 'No deposit found for this account' });
    }

    // Validate withdrawal date is after deposit date
    const depositDate = new Date(lastDeposit.transaction_date);
    const withdrawDate = new Date(transaction_date);
    if (withdrawDate < depositDate) {
      return res.status(400).json({ error: 'withdrawal_date must be after the deposit date' });
    }

    // Step 4: Get deposito type and calculate interest
    const depositoType = await DepositoType.findById(account.deposito_type_id);
    const yearlyReturn = parseFloat(depositoType.yearly_return);
    const monthlyReturn = yearlyReturn / 12;

    // Calculate months between deposit and withdrawal (integer months)
    const monthsHeld =
      (withdrawDate.getFullYear() - depositDate.getFullYear()) * 12 +
      (withdrawDate.getMonth() - depositDate.getMonth());

    const interestEarned = balance * monthsHeld * monthlyReturn;
    const endingBalance = balance + interestEarned;

    // Step 5: Insert withdrawal transaction
    const transactionId = await Transaction.createWithdrawal({
      account_id: account.id,
      amount: balance,
      ending_balance: endingBalance,
      transaction_date,
    });

    // Step 6: Set account balance to 0
    await Account.updateBalance(account.id, 0);

    // Step 7: Return full breakdown
    res.status(201).json({
      transaction_id: transactionId,
      type: 'withdrawal',
      starting_balance: balance.toFixed(2),
      months_held: monthsHeld,
      monthly_return: monthlyReturn.toFixed(6),
      interest_earned: interestEarned.toFixed(2),
      ending_balance: endingBalance.toFixed(2),
      transaction_date,
    });
  } catch (err) {
    next(err);
  }
};
