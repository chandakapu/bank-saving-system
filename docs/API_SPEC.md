# API Specification: Bank Saving System

## Base URL
```
http://localhost:3000/api/v1
```

## Conventions
- All request/response bodies are JSON
- Dates use `YYYY-MM-DD` format
- Money values are numbers with 2 decimal places (e.g. `10000000.00`)
- `yearly_return` is a decimal (e.g. `0.0300` = 3%)
- Successful creates return `201 Created`
- Successful reads/updates return `200 OK`
- Successful deletes return `200 OK` with a message
- Errors return a consistent shape: `{ "error": "message here" }`

---

## 1. Customers

### `GET /customers`
Get all customers.

**Response `200`**
```json
[
  { "id": 1, "name": "Budi Santoso", "created_at": "2024-01-10T08:00:00Z" },
  { "id": 2, "name": "Siti Rahayu", "created_at": "2024-01-11T09:00:00Z" }
]
```

---

### `GET /customers/:id`
Get a single customer by ID.

**Response `200`**
```json
{ "id": 1, "name": "Budi Santoso", "created_at": "2024-01-10T08:00:00Z" }
```

**Response `404`**
```json
{ "error": "Customer not found" }
```

---

### `POST /customers`
Create a new customer.

**Request body**
```json
{ "name": "Budi Santoso" }
```

**Response `201`**
```json
{ "id": 1, "name": "Budi Santoso", "created_at": "2024-01-10T08:00:00Z" }
```

**Response `400`**
```json
{ "error": "Name is required" }
```

---

### `PUT /customers/:id`
Update a customer's name.

**Request body**
```json
{ "name": "Budi Santoso Updated" }
```

**Response `200`**
```json
{ "id": 1, "name": "Budi Santoso Updated", "updated_at": "2024-02-01T10:00:00Z" }
```

---

### `DELETE /customers/:id`
Delete a customer.

**Response `200`**
```json
{ "message": "Customer deleted successfully" }
```

**Response `409`** *(has existing accounts)*
```json
{ "error": "Cannot delete customer with existing accounts" }
```

---

## 2. Deposito Types

### `GET /deposito-types`
Get all deposito types.

**Response `200`**
```json
[
  { "id": 1, "name": "Deposito Bronze", "yearly_return": "0.0300" },
  { "id": 2, "name": "Deposito Silver", "yearly_return": "0.0500" },
  { "id": 3, "name": "Deposito Gold",   "yearly_return": "0.0700" }
]
```

---

### `GET /deposito-types/:id`
Get a single deposito type.

**Response `200`**
```json
{ "id": 2, "name": "Deposito Silver", "yearly_return": "0.0500" }
```

---

### `POST /deposito-types`
Create a new deposito type.

**Request body**
```json
{ "name": "Deposito Platinum", "yearly_return": 0.0900 }
```

**Response `201`**
```json
{ "id": 4, "name": "Deposito Platinum", "yearly_return": "0.0900" }
```

**Response `400`**
```json
{ "error": "yearly_return must be a positive number less than 1" }
```

---

### `PUT /deposito-types/:id`
Update a deposito type.

**Request body**
```json
{ "name": "Deposito Platinum Plus", "yearly_return": 0.1000 }
```

**Response `200`**
```json
{ "id": 4, "name": "Deposito Platinum Plus", "yearly_return": "0.1000" }
```

---

### `DELETE /deposito-types/:id`
Delete a deposito type.

**Response `200`**
```json
{ "message": "Deposito type deleted successfully" }
```

**Response `409`** *(in use by accounts)*
```json
{ "error": "Cannot delete deposito type that is assigned to existing accounts" }
```

---

## 3. Accounts

### `GET /accounts`
Get all accounts (with customer and deposito type info).

**Response `200`**
```json
[
  {
    "id": 1,
    "balance": "5000000.00",
    "customer": { "id": 1, "name": "Budi Santoso" },
    "deposito_type": { "id": 2, "name": "Deposito Silver", "yearly_return": "0.0500" },
    "created_at": "2024-01-15T08:00:00Z"
  }
]
```

---

### `GET /accounts/:id`
Get a single account.

**Response `200`**
```json
{
  "id": 1,
  "balance": "5000000.00",
  "customer": { "id": 1, "name": "Budi Santoso" },
  "deposito_type": { "id": 2, "name": "Deposito Silver", "yearly_return": "0.0500" },
  "created_at": "2024-01-15T08:00:00Z"
}
```

---

### `GET /customers/:id/accounts`
Get all accounts belonging to a specific customer.

**Response `200`**
```json
[
  {
    "id": 1,
    "balance": "5000000.00",
    "deposito_type": { "id": 2, "name": "Deposito Silver", "yearly_return": "0.0500" }
  },
  {
    "id": 3,
    "balance": "12000000.00",
    "deposito_type": { "id": 3, "name": "Deposito Gold", "yearly_return": "0.0700" }
  }
]
```

---

### `POST /accounts`
Open a new account for a customer.

**Request body**
```json
{
  "customer_id": 1,
  "deposito_type_id": 2
}
```

**Response `201`**
```json
{
  "id": 1,
  "balance": "0.00",
  "customer_id": 1,
  "deposito_type_id": 2,
  "created_at": "2024-01-15T08:00:00Z"
}
```

**Response `404`**
```json
{ "error": "Customer not found" }
```

---

### `PUT /accounts/:id`
Update the deposito type on an account.

**Request body**
```json
{ "deposito_type_id": 3 }
```

**Response `200`**
```json
{ "id": 1, "deposito_type_id": 3, "updated_at": "2024-02-01T10:00:00Z" }
```

---

### `DELETE /accounts/:id`
Delete an account.

**Response `200`**
```json
{ "message": "Account deleted successfully" }
```

**Response `409`** *(has transaction history)*
```json
{ "error": "Cannot delete account with existing transactions" }
```

---

## 4. Transactions

### `GET /accounts/:id/transactions`
Get all transactions for an account.

**Response `200`**
```json
[
  {
    "id": 1,
    "type": "deposit",
    "amount": "5000000.00",
    "ending_balance": null,
    "transaction_date": "2024-01-15",
    "created_at": "2024-01-15T08:00:00Z"
  },
  {
    "id": 2,
    "type": "withdrawal",
    "amount": "5000000.00",
    "ending_balance": "5125000.00",
    "transaction_date": "2024-07-15",
    "created_at": "2024-07-15T10:00:00Z"
  }
]
```

---

### `POST /accounts/:id/deposit`
Deposit money into an account.

**Request body**
```json
{
  "amount": 5000000,
  "transaction_date": "2024-01-15"
}
```

**Response `201`**
```json
{
  "transaction_id": 1,
  "type": "deposit",
  "amount": "5000000.00",
  "new_balance": "5000000.00",
  "transaction_date": "2024-01-15"
}
```

**Response `400`**
```json
{ "error": "Amount must be greater than 0" }
```

---

### `POST /accounts/:id/withdraw`
Withdraw from an account. System calculates ending balance with interest.

**Request body**
```json
{
  "transaction_date": "2024-07-15"
}
```

> Note: No `amount` field — the system withdraws the full balance and calculates
> the ending amount including interest. Partial withdrawal can be a future feature.

**Response `201`**
```json
{
  "transaction_id": 2,
  "type": "withdrawal",
  "starting_balance": "5000000.00",
  "months_held": 6,
  "monthly_return": "0.004167",
  "interest_earned": "125000.00",
  "ending_balance": "5125000.00",
  "transaction_date": "2024-07-15"
}
```

**Response `400`**
```json
{ "error": "No deposit found for this account to calculate interest from" }
```

**Response `400`**
```json
{ "error": "Account balance is 0, nothing to withdraw" }
```

---

## Error Reference

| HTTP Code | Meaning |
|---|---|
| `400` | Bad request — missing or invalid input |
| `404` | Resource not found |
| `409` | Conflict — operation blocked by a business rule |
| `500` | Server error |
