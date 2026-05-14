const { pool } = require('../config/database');

class Transaction {
  /**
   * Get all transactions for an account.
   */
  static async findByAccountId(accountId) {
    const [rows] = await pool.query(
      `SELECT id, type, amount, ending_balance, transaction_date, created_at
       FROM transactions
       WHERE account_id = ?
       ORDER BY created_at ASC`,
      [accountId]
    );
    return rows;
  }

  /**
   * Insert a deposit transaction.
   */
  static async createDeposit({ account_id, amount, transaction_date }) {
    const [result] = await pool.query(
      `INSERT INTO transactions (account_id, type, amount, transaction_date)
       VALUES (?, 'deposit', ?, ?)`,
      [account_id, amount, transaction_date]
    );
    return result.insertId;
  }

  /**
   * Insert a withdrawal transaction (with ending_balance).
   */
  static async createWithdrawal({ account_id, amount, ending_balance, transaction_date }) {
    const [result] = await pool.query(
      `INSERT INTO transactions (account_id, type, amount, ending_balance, transaction_date)
       VALUES (?, 'withdrawal', ?, ?, ?)`,
      [account_id, amount, ending_balance, transaction_date]
    );
    return result.insertId;
  }

  /**
   * Get the most recent deposit for an account.
   * Used to determine the start date for interest calculation.
   */
  static async getLastDeposit(accountId) {
    const [rows] = await pool.query(
      `SELECT id, amount, transaction_date, created_at
       FROM transactions
       WHERE account_id = ? AND type = 'deposit'
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT 1`,
      [accountId]
    );
    return rows[0] || null;
  }
}

module.exports = Transaction;
