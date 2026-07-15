const Customer = require('../models/customer.model');
const Account = require('../models/account.model');
const validation = require('../lib/validation');

/**
 * GET /customers
 */
exports.getAll = async (req, res, next) => {
  try {
    const paging = validation.pagination(req.query);
    const { rows, total } = await Customer.findAll(paging);
    res.json(validation.paginated(rows, total, paging.page, paging.limit));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /customers/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(validation.positiveInteger(req.params.id, 'customer id'));
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /customers
 */
exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }

    const customer = await Customer.create({ name: name.trim() });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /customers/:id
 */
exports.update = async (req, res, next) => {
  try {
    const customerId = validation.positiveInteger(req.params.id, 'customer id');
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { name } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }

    const updated = await Customer.update(customerId, { name: name.trim() });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /customers/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const customerId = validation.positiveInteger(req.params.id, 'customer id');
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // 409 guard: cannot delete if customer has accounts
    const hasAccounts = await Customer.hasAccounts(customerId);
    if (hasAccounts) {
      return res.status(409).json({
        error: 'Cannot delete customer with existing accounts. Close all accounts first.',
      });
    }

    await Customer.delete(customerId);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /customers/:id/accounts
 */
exports.getAccounts = async (req, res, next) => {
  try {
    const customerId = validation.positiveInteger(req.params.id, 'customer id');
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const paging = validation.pagination(req.query);
    const accounts = await Account.findByCustomerId(customerId, paging);
    res.json(validation.paginated(accounts.rows, accounts.total, paging.page, paging.limit));
  } catch (err) {
    next(err);
  }
};
