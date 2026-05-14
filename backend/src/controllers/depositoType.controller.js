const DepositoType = require('../models/depositoType.model');

/**
 * GET /deposito-types
 */
exports.getAll = async (req, res, next) => {
  try {
    const types = await DepositoType.findAll();
    res.json(types);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /deposito-types/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const type = await DepositoType.findById(req.params.id);
    if (!type) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }
    res.json(type);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /deposito-types
 */
exports.create = async (req, res, next) => {
  try {
    const { name, yearly_return } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (yearly_return === undefined || yearly_return === null) {
      return res.status(400).json({ error: 'yearly_return is required' });
    }

    const rate = parseFloat(yearly_return);
    if (isNaN(rate) || rate <= 0 || rate >= 1) {
      return res.status(400).json({
        error: 'yearly_return must be between 0 and 1 (e.g. 0.05 for 5%)',
      });
    }

    const type = await DepositoType.create({ name: name.trim(), yearly_return: rate });
    res.status(201).json(type);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /deposito-types/:id
 */
exports.update = async (req, res, next) => {
  try {
    const existing = await DepositoType.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    const { name, yearly_return } = req.body;

    if (yearly_return !== undefined) {
      const rate = parseFloat(yearly_return);
      if (isNaN(rate) || rate <= 0 || rate >= 1) {
        return res.status(400).json({
          error: 'yearly_return must be between 0 and 1 (e.g. 0.05 for 5%)',
        });
      }
    }

    const updated = await DepositoType.update(req.params.id, {
      name: name ? name.trim() : undefined,
      yearly_return: yearly_return !== undefined ? parseFloat(yearly_return) : undefined,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /deposito-types/:id
 */
exports.delete = async (req, res, next) => {
  try {
    const existing = await DepositoType.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    // 409 guard: cannot delete if type is assigned to accounts
    const inUse = await DepositoType.isInUse(req.params.id);
    if (inUse) {
      return res.status(409).json({
        error: 'Cannot delete deposito type that is assigned to existing accounts.',
      });
    }

    await DepositoType.delete(req.params.id);
    res.json({ message: 'Deposito type deleted successfully' });
  } catch (err) {
    next(err);
  }
};
