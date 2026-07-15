const HttpError = require('./httpError');

function positiveInteger(value, name = 'id') {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new HttpError(400, `${name} must be a positive integer`);
  }
  return Number(text);
}

function money(value) {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    throw new HttpError(400, 'amount must be a positive monetary value with at most two decimal places');
  }
  const [whole, fraction = ''] = text.split('.');
  const normalized = `${whole}.${fraction.padEnd(2, '0')}`;
  if (normalized === '0.00' || whole.length > 13) {
    throw new HttpError(400, 'amount must be greater than 0 and fit DECIMAL(15,2)');
  }
  return normalized;
}

function date(value, name = 'transaction_date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${name} must use YYYY-MM-DD format`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${name} is not a valid date`);
  }
  if (value > new Date().toISOString().slice(0, 10)) {
    throw new HttpError(400, `${name} cannot be in the future`);
  }
  return value;
}

function pagination(query) {
  const parse = (value, fallback, name) => {
    if (value === undefined) return fallback;
    return positiveInteger(value, name);
  };
  const page = parse(query.page, 1, 'page');
  const limit = parse(query.limit, 20, 'limit');
  if (page > 1000000) throw new HttpError(400, 'page must be at most 1000000');
  if (limit > 100) throw new HttpError(400, 'limit must be at most 100');
  return { page, limit, offset: (page - 1) * limit };
}

function paginated(data, total, page, limit) {
  return { data, pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) } };
}

module.exports = { positiveInteger, money, date, pagination, paginated };
