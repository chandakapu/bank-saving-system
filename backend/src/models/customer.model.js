const { pool } = require('../config/database');

class Customer {
  /**
   * Get all customers.
   */
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, created_at, updated_at FROM customers ORDER BY id ASC'
    );
    return rows;
  }

  /**
   * Get a single customer by ID.
   */
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, created_at, updated_at FROM customers WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new customer.
   */
  static async create({ name }) {
    const [result] = await pool.query(
      'INSERT INTO customers (name) VALUES (?)',
      [name]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update a customer's name.
   */
  static async update(id, { name }) {
    await pool.query(
      'UPDATE customers SET name = ? WHERE id = ?',
      [name, id]
    );
    return this.findById(id);
  }

  /**
   * Delete a customer by ID.
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM customers WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if a customer has any accounts (for delete guard).
   */
  static async hasAccounts(id) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM accounts WHERE customer_id = ?',
      [id]
    );
    return rows[0].count > 0;
  }
}

module.exports = Customer;
