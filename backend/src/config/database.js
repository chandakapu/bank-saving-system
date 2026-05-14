const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DECIMAL as numbers instead of strings where appropriate
  decimalNumbers: false,
});

/**
 * Test the database connection on startup.
 * Throws if MySQL is unreachable.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  console.log('✅ MySQL connected — database:', process.env.DB_NAME);
  connection.release();
}

module.exports = { pool, testConnection };
