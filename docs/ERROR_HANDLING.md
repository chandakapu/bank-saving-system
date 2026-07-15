# Error Handling & Edge Cases: Bank Saving System

## HTTP error response shape
Every error returns a consistent JSON body:
```json
{ "error": "Human-readable message here" }
```

Authentication failures return `401`, rejected browser origins return `403`, and database-backed login throttling returns `429` with `Retry-After`.

---

## Validation errors (400)

| Endpoint | Condition | Error message |
|---|---|---|
| `POST /customers` | `name` missing or empty | `"Name is required"` |
| `POST /customers` | `name` longer than 100 chars | `"Name must be 100 characters or fewer"` |
| `POST /deposito-types` | `name` missing | `"Name is required"` |
| `POST /deposito-types` | `yearly_return` missing | `"yearly_return is required"` |
| `POST /deposito-types` | `yearly_return` ≤ 0 or ≥ 1 | `"yearly_return must be between 0 and 1 (e.g. 0.05 for 5%)"` |
| `POST /accounts` | `customer_id` missing | `"customer_id is required"` |
| `POST /accounts` | `deposito_type_id` missing | `"deposito_type_id is required"` |
| `POST /accounts/:id/deposit` | `amount` missing | `"Amount is required"` |
| `POST /accounts/:id/deposit` | `amount` ≤ 0 | `"Amount must be greater than 0"` |
| `POST /accounts/:id/deposit` | `transaction_date` missing | `"transaction_date is required"` |
| `POST /accounts/:id/deposit` | `transaction_date` in the future | `"transaction_date cannot be in the future"` |
| Financial operation | `Idempotency-Key` missing or malformed | `"Idempotency-Key is required and must be 1-128 safe characters"` |
| `POST /accounts/:id/withdraw` | `transaction_date` missing | `"transaction_date is required"` |
| `POST /accounts/:id/withdraw` | `transaction_date` before last deposit date | `"withdrawal_date must be after the deposit date"` |
| `POST /accounts/:id/withdraw` | account balance is 0 | `"Account balance is 0, nothing to withdraw"` |
| `POST /accounts/:id/withdraw` | no deposit found on account | `"No deposit found for this account"` |

---

## Not found errors (404)

| Condition | Error message |
|---|---|
| `GET/PUT/DELETE /customers/:id` — ID doesn't exist | `"Customer not found"` |
| `GET/PUT/DELETE /deposito-types/:id` — ID doesn't exist | `"Deposito type not found"` |
| `GET/PUT/DELETE /accounts/:id` — ID doesn't exist | `"Account not found"` |
| `GET /customers/:id/accounts` — customer doesn't exist | `"Customer not found"` |
| `GET/POST /accounts/:id/...` — account doesn't exist | `"Account not found"` |

---

## Conflict errors (409)

| Condition | Error message |
|---|---|
| `DELETE /customers/:id` — customer has accounts | `"Cannot delete customer with existing accounts. Close all accounts first."` |
| `DELETE /deposito-types/:id` — type is used by accounts | `"Cannot delete deposito type that is assigned to existing accounts."` |
| `DELETE /accounts/:id` — account has transactions | `"Cannot delete account with existing transactions."` |
| Financial operation | date is older than latest ledger entry | `"transaction_date cannot be older than the latest account transaction"` |
| `PUT /accounts/:id` | balance is nonzero | `"Account type cannot change while balance is nonzero"` |
| Financial operation | idempotency key reused with different input | `"Idempotency-Key was already used with a different request"` |

---

## Business logic edge cases

### Withdrawal calculation
| Case | Handling |
|---|---|
| Deposit date and withdrawal date are the same day | `months = 0`, interest = 0, `ending_balance = starting_balance` |
| Multiple deposits on the same account | Use the **most recent deposit date** as the start date for interest calculation |
| Withdrawal date is less than 1 month after deposit | `months = 0` (integer months only), no interest earned |
| Rate changes after account opening | Existing account uses its snapshotted rate |
| `yearly_return` stored as decimal but sent as percentage by mistake | Validate on input: reject values > 1. Document clearly in API spec. |

### Cascade delete protection
The database uses `ON DELETE RESTRICT` on all foreign keys. If the application layer somehow skips the 409 check, MySQL will throw an error. Catch this at the DB level too:
```js

if (err.code === 'ER_ROW_IS_REFERENCED_2') {
  return res.status(409).json({ error: 'Cannot delete: record is referenced by another table' });
}
```

---

## Global middleware error handler (Express)

Place this as the last middleware in your `app.js`:
```js
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'Cannot delete: record is in use' });
  }

  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Frontend edge cases

| Screen | Edge case | Handling |
|---|---|---|
| Customers list | No customers yet | Show empty state: "No customers yet. Add your first customer." |
| Accounts list | Customer has no accounts | Show empty state per customer |
| Deposit form | Account not selected | Disable submit button until all fields filled |
| Withdraw form | Account balance is 0 | Disable withdraw button, show tooltip: "Balance is zero" |
| Withdraw result | months = 0 | Show "0 months held — no interest earned" clearly |
| Any form | Network error | Show toast: "Something went wrong. Please try again." |
| Delete | Any 409 conflict | Show specific error message from API response |
