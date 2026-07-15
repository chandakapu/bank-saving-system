const { pool } = require('../config/database');

class Transaction {
  /**
   * Get all transactions for an account.
   */
  static async findByAccountId(accountId, { limit, offset }) {
    const [rows] = await pool.query(
      `SELECT id, type, amount, starting_balance, interest_earned, months_held,
              yearly_return, ending_balance, transaction_date, created_at
       FROM transactions
       WHERE account_id = ?
       ORDER BY transaction_date ASC, id ASC LIMIT ? OFFSET ?`,
      [accountId, limit, offset]
    );
    const [counts] = await pool.query('SELECT COUNT(*) AS total FROM transactions WHERE account_id = ?', [accountId]);
    return { rows, total: counts[0].total };
  }

}

module.exports = Transaction;
