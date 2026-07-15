const mysql = require('mysql2/promise');
const fs = require('fs');

const ssl = process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: true,
  ...(process.env.DB_SSL_CA ? { ca: fs.readFileSync(process.env.DB_SSL_CA, 'utf8') } : {}),
} : undefined;

function boundedInteger(value, fallback, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
  waitForConnections: true,
  connectionLimit: boundedInteger(process.env.DB_CONNECTION_LIMIT, 10, 100),
  queueLimit: boundedInteger(process.env.DB_QUEUE_LIMIT, 100, 1000),
  connectTimeout: boundedInteger(process.env.DB_CONNECT_TIMEOUT_MS, 10000, 60000),
  decimalNumbers: false,
  dateStrings: true,
  timezone: 'Z',
});

/**
 * Test the database connection on startup.
 * Throws if MySQL is unreachable.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  console.log('MySQL connected, database:', process.env.DB_NAME);
  connection.release();
}

module.exports = { pool, testConnection };
