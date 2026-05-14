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
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Migration 003: accounts
-- ============================================================
CREATE TABLE accounts (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id       INT UNSIGNED NOT NULL,
  deposito_type_id  INT UNSIGNED NOT NULL,
  balance           DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_accounts_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_accounts_deposito
    FOREIGN KEY (deposito_type_id) REFERENCES deposito_types(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- Migration 004: transactions
-- ============================================================
CREATE TABLE transactions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id       INT UNSIGNED NOT NULL,
  type             ENUM('deposit', 'withdrawal') NOT NULL,
  amount           DECIMAL(15, 2) NOT NULL,
  ending_balance   DECIMAL(15, 2) NULL COMMENT 'Only populated on withdrawal; includes interest',
  transaction_date DATE NOT NULL COMMENT 'User-supplied date of the transaction',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_transactions_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

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
-- This calculation is done in the application layer (Node.js),
-- then stored in transactions.ending_balance for record-keeping.
-- ============================================================
