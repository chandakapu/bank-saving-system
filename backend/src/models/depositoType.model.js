const { pool } = require('../config/database');

class DepositoType {
  /**
   * Get all deposito types.
   */
  static async findAll({ limit, offset }) {
    const [rows] = await pool.query(
      'SELECT id, name, yearly_return, created_at, updated_at FROM deposito_types ORDER BY id ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [counts] = await pool.query('SELECT COUNT(*) AS total FROM deposito_types');
    return { rows, total: counts[0].total };
  }

  /**
   * Get a single deposito type by ID.
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, yearly_return, created_at, updated_at FROM deposito_types WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new deposito type.
   */
  static async create({ name, yearly_return }) {
    const [result] = await pool.query(
      'INSERT INTO deposito_types (name, yearly_return) VALUES (?, ?)',
      [name, yearly_return]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update a deposito type.
   */
  static async update(id, { name, yearly_return }) {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (yearly_return !== undefined) {
      fields.push('yearly_return = ?');
      values.push(yearly_return);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(
      `UPDATE deposito_types SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  /**
   * Delete a deposito type by ID.
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM deposito_types WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if a deposito type is assigned to any accounts (for delete guard).
   */
  static async isInUse(id) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM accounts WHERE deposito_type_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }
}

module.exports = DepositoType;
