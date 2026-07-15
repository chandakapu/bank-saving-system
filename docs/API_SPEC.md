# API Specification

## Base URL

Use `/api/v1` through the frontend origin. Docker and Vercel proxy this path to the backend.

## Authentication

All endpoints except `GET /health` and `POST /auth/login` require the `admin_session` HTTP-only cookie. Browser requests use `credentials: include`. Unsafe requests must carry an allowed `Origin` header.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Create a 12-hour administrator session from `{ "username", "password" }` |
| `GET` | `/auth/session` | Return the authenticated administrator |
| `POST` | `/auth/logout` | Revoke the current session |
| `GET` | `/health` | Public service health |

Login attempts are rate-limited in the database across replicas. Cookies are secure, HTTP-only, same-site, and scoped to `/api/v1`.

## Conventions

- JSON request and response bodies
- Dates strictly use `YYYY-MM-DD` and cannot be future or older than the account's latest transaction
- Money accepts positive values with at most two decimal places
- IDs are positive integers
- Errors use `{ "error": "message" }`
- Collection endpoints accept `page` and `limit`; `limit` is at most 100

Collection response:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

## Resources

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/customers` | Paginated customers |
| `GET` | `/customers/:id` | Customer detail |
| `POST` | `/customers` | Create from `{ "name" }` |
| `PUT` | `/customers/:id` | Update name |
| `DELETE` | `/customers/:id` | Delete when no accounts exist |
| `GET` | `/customers/:id/accounts` | Paginated customer accounts |
| `GET` | `/deposito-types` | Paginated product catalogue |
| `GET` | `/deposito-types/:id` | Product detail |
| `POST` | `/deposito-types` | Create from `name` and decimal `yearly_return` |
| `PUT` | `/deposito-types/:id` | Update catalogue terms for future account selections |
| `DELETE` | `/deposito-types/:id` | Delete when unused |
| `GET` | `/accounts` | Paginated joined accounts |
| `GET` | `/accounts/:id` | Account detail |
| `POST` | `/accounts` | Open from `customer_id` and `deposito_type_id` |
| `PUT` | `/accounts/:id` | Change product only while balance is zero; refreshes rate snapshot |
| `DELETE` | `/accounts/:id` | Delete when no ledger exists |
| `GET` | `/accounts/:id/transactions` | Paginated immutable ledger |

## Financial Operations

Both operations require a unique `Idempotency-Key` header. Reusing a key with the same request safely replays the original response; reusing it with different input returns `409`.

### Deposit

`POST /accounts/:id/deposit`

```json
{ "amount": "5000000.00", "transaction_date": "2026-01-15" }
```

### Full Withdrawal

`POST /accounts/:id/withdraw`

```json
{ "transaction_date": "2026-07-15" }
```

The database transaction locks the account, calculates completed calendar months with `TIMESTAMPDIFF(MONTH, ...)`, applies the account's snapshotted yearly rate, inserts the immutable audit row, and sets the account balance to zero atomically.

## Status Codes

| Code | Meaning |
|---|---|
| `200`, `201`, `204` | Success |
| `400` | Invalid JSON, identifier, date, money, or range |
| `401` | Missing, invalid, or expired session |
| `403` | Origin rejected |
| `404` | Resource not found |
| `409` | Business-rule or idempotency conflict |
| `429` | Login rate limit |
| `500` | Unexpected server error |
