# API to Screen Mapping

This document fulfills the requirement: **"APIs call every screen"**. It explicitly maps the visual screens defined in the wireframes (`wireframes.html`) to the backend REST API endpoints defined in `API_SPEC.md`.

The login screen calls `POST /auth/login`; application startup calls `GET /auth/session` and `GET /health`; sign-out calls `POST /auth/logout`. All collection loads follow pagination until all pages needed by the dashboard are available.

## 1. Customers Screen
Used for managing the bank's customers.
*   **Load Data:** `GET /customers` (Populates the main data table)
*   **Add Customer:** `POST /customers` (Triggered on save in the 'Add customer' form)
*   **Edit Customer:** `PUT /customers/:id` (Triggered by the edit icon)
*   **Delete Customer:** `DELETE /customers/:id` (Triggered by the trash icon)

## 2. Deposito Types Screen
Used for managing the available deposito packets and their interest rates.
*   **Load Data:** `GET /deposito-types` (Populates the deposito table)
*   **Add Deposito:** `POST /deposito-types` (Triggered on save in the 'Add deposito type' form)
*   **Edit Deposito:** `PUT /deposito-types/:id` (Triggered by the edit icon)
*   **Delete Deposito:** `DELETE /deposito-types/:id` (Triggered by the trash icon)

## 3. Accounts Screen
Used for opening and managing customer accounts tied to specific deposito types.
*   **Load Data:** `GET /accounts` (Populates the accounts table with joined customer/deposito data)
*   **Open Account Form:** 
    *   Calls `GET /customers` (To populate the customer selection dropdown)
    *   Calls `GET /deposito-types` (To populate the deposito type dropdown)
*   **Submit Account:** `POST /accounts` (Submits the form data)
*   **Edit Account:** `PUT /accounts/:id` (Updates the assigned deposito type)
*   **Delete Account:** `DELETE /accounts/:id`

## 4. Deposit Screen
Dedicated screen for adding funds to an existing account.
*   **Load Form Data:** `GET /accounts` (Populates the account selection dropdown)
*   **Confirm Deposit:** `POST /accounts/:id/deposit` (Submits the deposit amount/date with an idempotency key)

## 5. Withdraw Screen
Dedicated screen for withdrawing all funds and calculating the interest.
*   **Load Form Data:** `GET /accounts` (Populates the account selection dropdown)
*   **Calculate & Withdraw:** `POST /accounts/:id/withdraw` (Submits the withdrawal date with an idempotency key, and returns the calculated starting balance, months held, interest earned, and ending balance to display in the UI result card).

## 6. Transactions Screen
Used for viewing the ledger/history of deposits and withdrawals.
*   **Load Filters:** `GET /accounts` (Populates the "Filter by account" dropdown)
*   **Load Data (Filtered):** `GET /accounts/:id/transactions` (Populates the table with the transaction history for the selected account)
