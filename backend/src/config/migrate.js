const { pool } = require('./database');

const migrationName = '005_backend_hardening';
const lockName = `${migrationName}_lock`;
const lockOwner = `${process.pid}-${Date.now()}-${Math.random()}`;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function tableExists(connection, table) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return Boolean(rows[0]);
}

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return Boolean(rows[0]);
}

async function indexExists(connection, table, index) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, index]
  );
  return Boolean(rows[0]);
}

async function constraintExists(connection, table, constraint) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ?`,
    [table, constraint]
  );
  return Boolean(rows[0]);
}

async function addCheck(connection, table, name, expression) {
  if (!await constraintExists(connection, table, name)) {
    await connection.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`);
  }
}

async function addColumn(connection, table, column, definition) {
  if (!await columnExists(connection, table, column)) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function runMigrations() {
  const connection = await pool.getConnection();
  let leaseTimer;
  try {
    if (await tableExists(connection, 'schema_migrations')) {
      const [applied] = await connection.query('SELECT 1 FROM schema_migrations WHERE name = ?', [migrationName]);
      if (applied[0]) return;
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS migration_locks (
      name VARCHAR(100) PRIMARY KEY, owner VARCHAR(100) NOT NULL, lease_until DATETIME(3) NOT NULL
    )`);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await connection.query(
        `INSERT INTO migration_locks (name, owner, lease_until) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 5 MINUTE))
         ON DUPLICATE KEY UPDATE
           owner = IF(lease_until <= UTC_TIMESTAMP(3), VALUES(owner), owner),
           lease_until = IF(lease_until <= UTC_TIMESTAMP(3), VALUES(lease_until), lease_until)`,
        [lockName, lockOwner]
      );
      const [locks] = await connection.query('SELECT owner FROM migration_locks WHERE name = ?', [lockName]);
      if (locks[0]?.owner === lockOwner) break;
      const [applied] = await connection.query('SELECT 1 FROM schema_migrations WHERE name = ?', [migrationName]);
      if (applied[0]) return;
      if (attempt === 59) throw new Error('Timed out waiting for database migration lock');
      await wait(1000);
    }
    const [appliedAfterLock] = await connection.query('SELECT 1 FROM schema_migrations WHERE name = ?', [migrationName]);
    if (appliedAfterLock[0]) return;
    leaseTimer = setInterval(() => {
      pool.query(
        'UPDATE migration_locks SET lease_until = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 5 MINUTE) WHERE name = ? AND owner = ?',
        [lockName, lockOwner]
      ).catch((error) => console.error('Failed to renew migration lock:', error.message));
    }, 60_000);
    leaseTimer.unref();

    await addColumn(connection, 'accounts', 'yearly_return', 'DECIMAL(5,4) NULL AFTER deposito_type_id');
    await connection.query(`UPDATE accounts a JOIN deposito_types d ON d.id = a.deposito_type_id
      SET a.yearly_return = d.yearly_return WHERE a.yearly_return IS NULL`);
    await connection.query('ALTER TABLE accounts MODIFY COLUMN yearly_return DECIMAL(5,4) NOT NULL');
    await addCheck(connection, 'deposito_types', 'chk_deposito_rate', 'yearly_return > 0 AND yearly_return < 1');
    await addCheck(connection, 'accounts', 'chk_account_balance', 'balance >= 0');
    await addCheck(connection, 'accounts', 'chk_account_rate', 'yearly_return > 0 AND yearly_return < 1');

    await addColumn(connection, 'transactions', 'starting_balance', 'DECIMAL(15,2) NULL AFTER amount');
    await addColumn(connection, 'transactions', 'interest_earned', 'DECIMAL(15,2) NULL AFTER starting_balance');
    await addColumn(connection, 'transactions', 'months_held', 'INT UNSIGNED NULL AFTER interest_earned');
    await addColumn(connection, 'transactions', 'yearly_return', 'DECIMAL(5,4) NULL AFTER months_held');
    if (!await indexExists(connection, 'transactions', 'idx_transactions_account_date')) {
      await connection.query('ALTER TABLE transactions ADD INDEX idx_transactions_account_date (account_id, transaction_date, id)');
    }
    await addCheck(connection, 'transactions', 'chk_transaction_amount', 'amount > 0');

    await connection.query(`CREATE TABLE IF NOT EXISTS admins (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_admins_username (username)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS admin_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, admin_id BIGINT UNSIGNED NOT NULL,
      token_hash BINARY(32) NOT NULL, expires_at DATETIME(3) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_admin_sessions_token (token_hash), KEY idx_admin_sessions_expiry (expires_at),
      CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS login_attempts (
      attempt_hash BINARY(32) PRIMARY KEY, failures SMALLINT UNSIGNED NOT NULL,
      reset_at DATETIME(3) NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_login_attempts_reset (reset_at)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, idempotency_key VARCHAR(128) NOT NULL,
      operation VARCHAR(40) NOT NULL, account_id INT UNSIGNED NOT NULL, request_hash BINARY(32) NOT NULL,
      response_status SMALLINT UNSIGNED NULL, response_body JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_idempotency_operation_key (operation, idempotency_key),
      KEY idx_idempotency_created (created_at),
      CONSTRAINT fk_idempotency_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    )`);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [migrationName]);
  } finally {
    if (leaseTimer) clearInterval(leaseTimer);
    try {
      await connection.query('DELETE FROM migration_locks WHERE name = ? AND owner = ?', [lockName, lockOwner]);
    } catch {
      // The migration may have failed before the lock table was available.
    }
    connection.release();
  }
}

module.exports = { runMigrations };
