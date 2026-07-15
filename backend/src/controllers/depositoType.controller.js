const DepositoType = require('../models/depositoType.model');
const validation = require('../lib/validation');

function rate(value) {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^(?:0(?:\.\d{1,4})?|1(?:\.0{1,4})?)$/.test(text) || Number(text) <= 0 || Number(text) >= 1) {
    const error = new Error('yearly_return must be greater than 0 and less than 1 with at most four decimal places');
    error.expose = true;
    error.statusCode = 400;
    throw error;
  }
  return Number(text).toFixed(4);
}

/**
 * GET /deposito-types
 */
exports.getAll = async (req, res, next) => {
  try {
    const paging = validation.pagination(req.query);
    const { rows, total } = await DepositoType.findAll(paging);
    res.json(validation.paginated(rows, total, paging.page, paging.limit));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /deposito-types/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const type = await DepositoType.findById(validation.positiveInteger(req.params.id, 'deposito type id'));
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

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or fewer' });
    }
    if (yearly_return === undefined || yearly_return === null) {
      return res.status(400).json({ error: 'yearly_return is required' });
    }

    const type = await DepositoType.create({ name: name.trim(), yearly_return: rate(yearly_return) });
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
    const typeId = validation.positiveInteger(req.params.id, 'deposito type id');
    const existing = await DepositoType.findById(typeId);
    if (!existing) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    const { name, yearly_return } = req.body;

    if (yearly_return !== undefined) {
      rate(yearly_return);
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) {
      return res.status(400).json({ error: 'Name must be 1 to 100 characters' });
    }
    const updated = await DepositoType.update(typeId, {
      name: name !== undefined ? name.trim() : undefined,
      yearly_return: yearly_return !== undefined ? rate(yearly_return) : undefined,
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
    const typeId = validation.positiveInteger(req.params.id, 'deposito type id');
    const existing = await DepositoType.findById(typeId);
    if (!existing) {
      return res.status(404).json({ error: 'Deposito type not found' });
    }

    // 409 guard: cannot delete if type is assigned to accounts
    const inUse = await DepositoType.isInUse(typeId);
    if (inUse) {
      return res.status(409).json({
        error: 'Cannot delete deposito type that is assigned to existing accounts.',
      });
    }

    await DepositoType.delete(typeId);
    res.json({ message: 'Deposito type deleted successfully' });
  } catch (err) {
    next(err);
  }
};
