const crypto = require('crypto');
const { pool } = require('../config/database');
const Account = require('../models/account.model');
const HttpError = require('../lib/httpError');
const validation = require('../lib/validation');

function id(req) {
  return validation.positiveInteger(req.params.id, 'account id');
}

function keyAndHash(req, operation, accountId, body) {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[A-Za-z0-9._:-]{1,128}$/.test(key)) {
    throw new HttpError(400, 'Idempotency-Key is required and must be 1-128 safe characters');
  }
  return { key, hash: crypto.createHash('sha256').update(JSON.stringify({ operation, accountId, ...body })).digest() };
}

async function replay(operation, key, hash) {
  const [rows] = await pool.query(
    'SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE operation = ? AND idempotency_key = ?',
    [operation, key]
  );
  if (!rows[0] || !crypto.timingSafeEqual(rows[0].request_hash, hash)) {
    throw new HttpError(409, 'Idempotency-Key was already used with a different request');
  }
  if (rows[0].response_status === null) throw new HttpError(409, 'Idempotent request is still in progress');
  const body = typeof rows[0].response_body === 'string' ? JSON.parse(rows[0].response_body) : rows[0].response_body;
  return { status: rows[0].response_status, body };
}

async function financialMutation(req, res, next, operation, normalized, execute) {
  let connection;
  const accountId = id(req);
  const { key, hash } = keyAndHash(req, operation, accountId, normalized);
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.query('SELECT id FROM accounts WHERE id = ? FOR UPDATE', [accountId]);
    if (!existing[0]) throw new HttpError(404, 'Account not found');
    try {
      await connection.query(
        'INSERT INTO idempotency_keys (idempotency_key, operation, account_id, request_hash) VALUES (?, ?, ?, ?)',
        [key, operation, accountId, hash]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      await connection.rollback();
      connection.release();
      connection = null;
      const prior = await replay(operation, key, hash);
      return res.status(prior.status).json(prior.body);
    }
    const body = await execute(connection, accountId, normalized);
    await connection.query(
      'UPDATE idempotency_keys SET response_status = 201, response_body = ? WHERE operation = ? AND idempotency_key = ?',
      [JSON.stringify(body), operation, key]
    );
    await connection.commit();
    return res.status(201).json(body);
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const paging = validation.pagination(req.query);
    const { rows, total } = await Account.findAll(paging);
    res.json(validation.paginated(rows, total, paging.page, paging.limit));
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const account = await Account.findById(id(req));
    if (!account) throw new HttpError(404, 'Account not found');
    res.json(account);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const customerId = validation.positiveInteger(req.body.customer_id, 'customer_id');
    const typeId = validation.positiveInteger(req.body.deposito_type_id, 'deposito_type_id');
    const [customer] = await pool.query('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (!customer[0]) throw new HttpError(404, 'Customer not found');
    const [result] = await pool.query(
      `INSERT INTO accounts (customer_id, deposito_type_id, yearly_return)
       SELECT ?, id, yearly_return FROM deposito_types WHERE id = ?`,
      [customerId, typeId]
    );
    if (!result.affectedRows) throw new HttpError(404, 'Deposito type not found');
    res.status(201).json(await Account.findById(result.insertId));
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  let connection;
  try {
    const accountId = id(req);
    const typeId = validation.positiveInteger(req.body.deposito_type_id, 'deposito_type_id');
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [accounts] = await connection.query('SELECT balance FROM accounts WHERE id = ? FOR UPDATE', [accountId]);
    if (!accounts[0]) throw new HttpError(404, 'Account not found');
    if (accounts[0].balance !== '0.00') throw new HttpError(409, 'Account type cannot change while balance is nonzero');
    const [types] = await connection.query('SELECT yearly_return FROM deposito_types WHERE id = ?', [typeId]);
    if (!types[0]) throw new HttpError(404, 'Deposito type not found');
    await connection.query('UPDATE accounts SET deposito_type_id = ?, yearly_return = ? WHERE id = ?', [typeId, types[0].yearly_return, accountId]);
    await connection.commit();
    connection.release();
    connection = null;
    res.json(await Account.findById(accountId));
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally { if (connection) connection.release(); }
};

exports.delete = async (req, res, next) => {
  try {
    const accountId = id(req);
    const [result] = await pool.query('DELETE FROM accounts WHERE id = ?', [accountId]);
    if (!result.affectedRows) throw new HttpError(404, 'Account not found');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) { next(error); }
};

exports.deposit = async (req, res, next) => {
  try {
    const normalized = { amount: validation.money(req.body.amount), transaction_date: validation.date(req.body.transaction_date) };
    return financialMutation(req, res, next, 'deposit', normalized, async (connection, accountId, values) => {
      const [accounts] = await connection.query('SELECT balance FROM accounts WHERE id = ? FOR UPDATE', [accountId]);
      if (!accounts[0]) throw new HttpError(404, 'Account not found');
      const [latest] = await connection.query('SELECT transaction_date FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 1', [accountId]);
      if (latest[0] && values.transaction_date < String(latest[0].transaction_date).slice(0, 10)) throw new HttpError(409, 'transaction_date cannot be older than the latest account transaction');
      const [insert] = await connection.query("INSERT INTO transactions (account_id, type, amount, transaction_date) VALUES (?, 'deposit', ?, ?)", [accountId, values.amount, values.transaction_date]);
      await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [values.amount, accountId]);
      const [updated] = await connection.query('SELECT balance FROM accounts WHERE id = ?', [accountId]);
      return { transaction_id: insert.insertId, type: 'deposit', amount: values.amount, new_balance: updated[0].balance, transaction_date: values.transaction_date };
    });
  } catch (error) { next(error); }
};

exports.withdraw = async (req, res, next) => {
  try {
    const normalized = { transaction_date: validation.date(req.body.transaction_date) };
    return financialMutation(req, res, next, 'withdrawal', normalized, async (connection, accountId, values) => {
      const [accounts] = await connection.query('SELECT balance, yearly_return FROM accounts WHERE id = ? FOR UPDATE', [accountId]);
      const account = accounts[0];
      if (!account) throw new HttpError(404, 'Account not found');
      if (account.balance === '0.00') throw new HttpError(409, 'Account balance is 0, nothing to withdraw');
      const [latest] = await connection.query('SELECT transaction_date FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 1', [accountId]);
      if (latest[0] && values.transaction_date < String(latest[0].transaction_date).slice(0, 10)) throw new HttpError(409, 'transaction_date cannot be older than the latest account transaction');
      const [deposits] = await connection.query("SELECT transaction_date FROM transactions WHERE account_id = ? AND type = 'deposit' ORDER BY transaction_date DESC, id DESC LIMIT 1", [accountId]);
      if (!deposits[0]) throw new HttpError(409, 'No deposit found for this account');
      const [calculated] = await connection.query(
        `SELECT TIMESTAMPDIFF(MONTH, ?, ?) AS months_held,
                CAST(ROUND(? * TIMESTAMPDIFF(MONTH, ?, ?) * ? / 12, 2) AS DECIMAL(15,2)) AS interest_earned,
                CAST(ROUND(? + (? * TIMESTAMPDIFF(MONTH, ?, ?) * ? / 12), 2) AS DECIMAL(15,2)) AS ending_balance`,
        [deposits[0].transaction_date, values.transaction_date, account.balance, deposits[0].transaction_date, values.transaction_date, account.yearly_return,
          account.balance, account.balance, deposits[0].transaction_date, values.transaction_date, account.yearly_return]
      );
      const calc = calculated[0];
      const [insert] = await connection.query(
        `INSERT INTO transactions (account_id, type, amount, starting_balance, interest_earned, months_held, yearly_return, ending_balance, transaction_date)
         VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, ?, ?)`,
        [accountId, account.balance, account.balance, calc.interest_earned, calc.months_held, account.yearly_return, calc.ending_balance, values.transaction_date]
      );
      await connection.query('UPDATE accounts SET balance = 0.00 WHERE id = ?', [accountId]);
      return { transaction_id: insert.insertId, type: 'withdrawal', starting_balance: account.balance, months_held: calc.months_held,
        yearly_return: account.yearly_return, interest_earned: calc.interest_earned, ending_balance: calc.ending_balance, transaction_date: values.transaction_date };
    });
  } catch (error) { next(error); }
};
