-- ============================================================
-- Bank Saving System - Database Migrations
-- Database: MySQL 8.0+
-- ============================================================

-- ============================================================
-- Migration 001: customers
-- ============================================================
CREATE TABLE customers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Migration 002: deposito_types
-- ============================================================
CREATE TABLE deposito_types (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  yearly_return  DECIMAL(5, 4) NOT NULL COMMENT 'Stored as decimal e.g. 0.0300 = 3%',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_deposito_rate CHECK (yearly_return > 0 AND yearly_return < 1)
);

-- ============================================================
-- Migration 003: accounts
-- ============================================================
CREATE TABLE accounts (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT UNSIGNED NOT NULL,
  deposito_type_id  INT UNSIGNED NOT NULL,
  yearly_return     DECIMAL(5, 4) NOT NULL,
  balance           DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_accounts_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_accounts_deposito
    FOREIGN KEY (deposito_type_id) REFERENCES deposito_types(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_account_balance CHECK (balance >= 0),
  CONSTRAINT chk_account_rate CHECK (yearly_return > 0 AND yearly_return < 1)
);

-- ============================================================
-- Migration 004: transactions
-- ============================================================
CREATE TABLE transactions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id       INT UNSIGNED NOT NULL,
  type             ENUM('deposit', 'withdrawal') NOT NULL,
  amount           DECIMAL(15, 2) NOT NULL,
  starting_balance DECIMAL(15, 2) NULL,
  interest_earned  DECIMAL(15, 2) NULL,
  months_held      INT UNSIGNED NULL,
  yearly_return    DECIMAL(5, 4) NULL,
  ending_balance   DECIMAL(15, 2) NULL COMMENT 'Only populated on withdrawal; includes interest',
  transaction_date DATE NOT NULL COMMENT 'User-supplied date of the transaction',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_transactions_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_transaction_amount CHECK (amount > 0),
  INDEX idx_transactions_account_date (account_id, transaction_date, id)
);

-- Authentication, abuse protection, and idempotent financial requests.
CREATE TABLE admins (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_username (username)
);

CREATE TABLE admin_sessions (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id   BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY idx_admin_sessions_expiry (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE login_attempts (
  attempt_hash BINARY(32) PRIMARY KEY,
  failures     SMALLINT UNSIGNED NOT NULL,
  reset_at     DATETIME(3) NOT NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_login_attempts_reset (reset_at)
);

CREATE TABLE idempotency_keys (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key  VARCHAR(128) NOT NULL,
  operation        VARCHAR(40) NOT NULL,
  account_id       INT UNSIGNED NOT NULL,
  request_hash     BINARY(32) NOT NULL,
  response_status  SMALLINT UNSIGNED NULL,
  response_body    JSON NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_idempotency_operation_key (operation, idempotency_key),
  KEY idx_idempotency_created (created_at),
  CONSTRAINT fk_idempotency_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE schema_migrations (
  name       VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE migration_locks (
  name        VARCHAR(100) PRIMARY KEY,
  owner       VARCHAR(100) NOT NULL,
  lease_until DATETIME(3) NOT NULL
);

INSERT INTO schema_migrations (name) VALUES ('005_backend_hardening');

-- ============================================================
-- Seed Data: deposito types (from the spec)
-- ============================================================
INSERT INTO deposito_types (name, yearly_return) VALUES
  ('Deposito Bronze', 0.0300),  -- 3% yearly
  ('Deposito Silver', 0.0500),  -- 5% yearly
  ('Deposito Gold',   0.0700);  -- 7% yearly

-- ============================================================
-- Notes on the ending_balance calculation (withdrawal)
-- ============================================================
-- monthly_return  = yearly_return / 12
-- months          = TIMESTAMPDIFF(MONTH, deposit_date, withdrawal_date)
-- ending_balance  = starting_balance + (starting_balance * months * monthly_return)
--
-- Example: balance = 10,000,000 | yearly_return = 5% | held 6 months
--   monthly_return = 0.05 / 12  = 0.004167
--   interest       = 10,000,000 * 6 * 0.004167 = 250,000
--   ending_balance = 10,000,000 + 250,000 = 10,250,000
--
-- This calculation is executed with exact decimal SQL inside the application's
-- account transaction, then stored for record-keeping.
-- ============================================================
