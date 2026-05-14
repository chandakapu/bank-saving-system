const { pool } = require('../config/database');

class Account {
  /**
   * Get all accounts with customer and deposito type info (JOIN).
   */
  static async findAll() {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.balance,
        a.created_at,
        a.updated_at,
        c.id   AS customer_id,
        c.name AS customer_name,
        d.id   AS deposito_type_id,
        d.name AS deposito_type_name,
        d.yearly_return
      FROM accounts a
      JOIN customers c      ON a.customer_id = c.id
      JOIN deposito_types d  ON a.deposito_type_id = d.id
      ORDER BY a.id ASC
    `);
    return rows.map(this._formatRow);
  }

  /**
   * Get a single account by ID with JOINs.
   */
  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.balance,
        a.created_at,
        a.updated_at,
        c.id   AS customer_id,
        c.name AS customer_name,
        d.id   AS deposito_type_id,
        d.name AS deposito_type_name,
        d.yearly_return
      FROM accounts a
      JOIN customers c      ON a.customer_id = c.id
      JOIN deposito_types d  ON a.deposito_type_id = d.id
      WHERE a.id = ?
    `, [id]);
    return rows[0] ? this._formatRow(rows[0]) : null;
  }

  /**
   * Get a raw account row (no JOINs) — used internally for balance checks.
   */
  static async findRawById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Get all accounts for a specific customer.
   */
  static async findByCustomerId(customerId) {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.balance,
        a.created_at,
        a.updated_at,
        d.id   AS deposito_type_id,
        d.name AS deposito_type_name,
        d.yearly_return
      FROM accounts a
      JOIN deposito_types d ON a.deposito_type_id = d.id
      WHERE a.customer_id = ?
      ORDER BY a.id ASC
    `, [customerId]);
    return rows.map((row) => ({
      id: row.id,
      balance: row.balance,
      deposito_type: {
        id: row.deposito_type_id,
        name: row.deposito_type_name,
        yearly_return: row.yearly_return,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Create a new account.
   */
  static async create({ customer_id, deposito_type_id }) {
    const [result] = await pool.query(
      'INSERT INTO accounts (customer_id, deposito_type_id) VALUES (?, ?)',
      [customer_id, deposito_type_id]
    );
    // Return the raw insert result (matching API spec response shape)
    const [rows] = await pool.query(
      'SELECT id, balance, customer_id, deposito_type_id, created_at FROM accounts WHERE id = ?',
      [result.insertId]
    );
    return rows[0];
  }

  /**
   * Update the deposito type on an account.
   */
  static async update(id, { deposito_type_id }) {
    await pool.query(
      'UPDATE accounts SET deposito_type_id = ? WHERE id = ?',
      [deposito_type_id, id]
    );
    const [rows] = await pool.query(
      'SELECT id, deposito_type_id, updated_at FROM accounts WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /**
   * Update account balance directly (used after deposit/withdrawal).
   */
  static async updateBalance(id, newBalance) {
    await pool.query(
      'UPDATE accounts SET balance = ? WHERE id = ?',
      [newBalance, id]
    );
  }

  /**
   * Delete an account.
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM accounts WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if account has transactions (for delete guard).
   */
  static async hasTransactions(id) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }

  /**
   * Format a JOINed row into the nested API response shape.
   */
  static _formatRow(row) {
    return {
      id: row.id,
      balance: row.balance,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
      },
      deposito_type: {
        id: row.deposito_type_id,
        name: row.deposito_type_name,
        yearly_return: row.yearly_return,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

module.exports = Account;
