# Data Model: Bank Saving System

## Overview

The business domain uses four tables. Authentication, sessions, login throttling, idempotency, and migration tracking use supporting tables.

```
customers ──< accounts >── deposito_types
               │
               └──< transactions
```

A customer can have many accounts. Each account is tied to exactly one deposito type. Each account accumulates many transactions (deposits and withdrawals).

---

## Tables

### `customers`
Stores the people who hold accounts at the bank.

| Column | Type | Notes |
|---|---|---|
| `id` | INT UNSIGNED PK | Auto-increment |
| `name` | VARCHAR(100) | Customer's full name |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-set on update |

---

### `deposito_types`
The savings product catalogue. Each type has a different annual interest rate.

| Column | Type | Notes |
|---|---|---|
| `id` | INT UNSIGNED PK | Auto-increment |
| `name` | VARCHAR(100) | e.g. "Deposito Gold" |
| `yearly_return` | DECIMAL(5,4) | Stored as decimal: `0.0700` = 7% |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-set on update |

**Seed data:**
| Name | yearly_return |
|---|---|
| Deposito Bronze | 0.0300 |
| Deposito Silver | 0.0500 |
| Deposito Gold | 0.0700 |

---

### `accounts`
A savings account owned by a customer, with a chosen deposito type.

| Column | Type | Notes |
|---|---|---|
| `id` | INT UNSIGNED PK | Auto-increment |
| `customer_id` | INT UNSIGNED FK | → `customers.id` |
| `deposito_type_id` | INT UNSIGNED FK | → `deposito_types.id` |
| `yearly_return` | DECIMAL(5,4) | Rate snapshotted for this account's current product cycle |
| `balance` | DECIMAL(15,2) | Current balance in the account |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-set on update |

**Business rules:**
- One customer can have multiple accounts.
- One account has exactly one deposito type.

---

### `transactions`
An immutable log of every deposit and withdrawal. Never delete or update rows here — this is the audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | INT UNSIGNED PK | Auto-increment |
| `account_id` | INT UNSIGNED FK | → `accounts.id` |
| `type` | ENUM | `'deposit'` or `'withdrawal'` |
| `amount` | DECIMAL(15,2) | The money moved |
| `starting_balance` | DECIMAL(15,2) | Withdrawal audit value |
| `interest_earned` | DECIMAL(15,2) | Withdrawal audit value |
| `months_held` | INT UNSIGNED | Completed months applied to withdrawal |
| `yearly_return` | DECIMAL(5,4) | Snapshotted rate applied to withdrawal |
| `ending_balance` | DECIMAL(15,2) | NULL for deposits; calculated on withdrawal |
| `transaction_date` | DATE | User-supplied date |
| `created_at` | TIMESTAMP | When the record was created |

---

## The Withdrawal Calculation

When a customer withdraws, the system must calculate the **ending balance with interest**:

```
monthly_return  = yearly_return / 12
months          = number of months between deposit date and withdrawal date
ending_balance  = starting_balance + (starting_balance × months × monthly_return)
```

**Example:**
- Starting balance: Rp 10,000,000
- Deposito Silver (5% yearly)
- Held 6 months

```
monthly_return  = 0.05 / 12        = 0.004167
interest        = 10,000,000 × 6 × 0.004167 = Rp 250,000
ending_balance  = Rp 10,250,000
```

The `ending_balance` is stored in the transaction row for display and audit purposes. The `accounts.balance` is then updated to `0` (or the remaining amount if partial withdrawal is supported).

The ledger insert and balance update run in one database transaction while the account row is locked. Financial requests are keyed in `idempotency_keys`, so an ambiguous client retry cannot apply money twice.

## Supporting Tables

- `admins`: bcrypt password hashes for administrative identities.
- `admin_sessions`: hashes of opaque, expiring session tokens.
- `login_attempts`: shared login throttling across backend replicas.
- `idempotency_keys`: request hashes and committed financial responses.
- `schema_migrations`: completed additive migration versions.

---

## Design Decisions

**Why store `ending_balance` in `transactions`?**
So we can show the customer exactly what they received on any historical withdrawal, even if the interest rates change later.

**Why use `DECIMAL` for money?**
`FLOAT` and `DOUBLE` have rounding errors. `DECIMAL(15,2)` stores exact values.

**Why `ON DELETE RESTRICT` on foreign keys?**
Prevents accidentally deleting a customer who still has open accounts, or a deposito type that is still in use. Customer must close/reassign accounts first.
