const { pool } = require('../config/database');

class Account {
  /**
   * Get all accounts with customer and deposito type info (JOIN).
   */
  static async findAll({ limit, offset }) {
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
        a.yearly_return
      FROM accounts a
      JOIN customers c      ON a.customer_id = c.id
      JOIN deposito_types d  ON a.deposito_type_id = d.id
      ORDER BY a.id ASC LIMIT ? OFFSET ?
    `, [limit, offset]);
    const [counts] = await pool.query('SELECT COUNT(*) AS total FROM accounts');
    return { rows: rows.map(this._formatRow), total: counts[0].total };
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
        a.yearly_return
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
  static async findByCustomerId(customerId, { limit, offset }) {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.balance,
        a.created_at,
        a.updated_at,
        d.id   AS deposito_type_id,
        d.name AS deposito_type_name,
        a.yearly_return
      FROM accounts a
      JOIN deposito_types d ON a.deposito_type_id = d.id
      WHERE a.customer_id = ?
      ORDER BY a.id ASC LIMIT ? OFFSET ?
    `, [customerId, limit, offset]);
    const [counts] = await pool.query('SELECT COUNT(*) AS total FROM accounts WHERE customer_id = ?', [customerId]);
    return { rows: rows.map((row) => ({
      id: row.id,
      balance: row.balance,
      deposito_type: {
        id: row.deposito_type_id,
        name: row.deposito_type_name,
        yearly_return: row.yearly_return,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })), total: counts[0].total };
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
