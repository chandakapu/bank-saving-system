-- Additive hardening migration for existing MySQL 8.0+/TiDB installations.
-- Run once after migrations.sql. DDL may auto-commit; take a backup first.

ALTER TABLE accounts
  ADD COLUMN yearly_return DECIMAL(5,4) NULL AFTER deposito_type_id;

UPDATE accounts a
JOIN deposito_types d ON d.id = a.deposito_type_id
SET a.yearly_return = d.yearly_return
WHERE a.yearly_return IS NULL;

ALTER TABLE accounts
  MODIFY COLUMN yearly_return DECIMAL(5,4) NOT NULL;

ALTER TABLE deposito_types ADD CONSTRAINT chk_deposito_rate CHECK (yearly_return > 0 AND yearly_return < 1);
ALTER TABLE accounts ADD CONSTRAINT chk_account_balance CHECK (balance >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_account_rate CHECK (yearly_return > 0 AND yearly_return < 1);

ALTER TABLE transactions ADD COLUMN starting_balance DECIMAL(15,2) NULL AFTER amount;
ALTER TABLE transactions ADD COLUMN interest_earned DECIMAL(15,2) NULL AFTER starting_balance;
ALTER TABLE transactions ADD COLUMN months_held INT UNSIGNED NULL AFTER interest_earned;
ALTER TABLE transactions ADD COLUMN yearly_return DECIMAL(5,4) NULL AFTER months_held;
ALTER TABLE transactions ADD INDEX idx_transactions_account_date (account_id, transaction_date, id);
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_amount CHECK (amount > 0);

CREATE TABLE admins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_username (username)
);

CREATE TABLE admin_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY idx_admin_sessions_expiry (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE login_attempts (
  attempt_hash BINARY(32) PRIMARY KEY,
  failures SMALLINT UNSIGNED NOT NULL,
  reset_at DATETIME(3) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_login_attempts_reset (reset_at)
);

CREATE TABLE idempotency_keys (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(128) NOT NULL,
  operation VARCHAR(40) NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  request_hash BINARY(32) NOT NULL,
  response_status SMALLINT UNSIGNED NULL,
  response_body JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_idempotency_operation_key (operation, idempotency_key),
  KEY idx_idempotency_created (created_at),
  CONSTRAINT fk_idempotency_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE schema_migrations (
  name VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE migration_locks (
  name VARCHAR(100) PRIMARY KEY,
  owner VARCHAR(100) NOT NULL,
  lease_until DATETIME(3) NOT NULL
);

INSERT INTO schema_migrations (name) VALUES ('005_backend_hardening');
