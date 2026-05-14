#!/bin/bash
# Full API Test Suite — Bank Saving System
BASE="http://localhost:3000/api/v1"
H="Content-Type: application/json"
PASS=0; FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc (expected: $expected)"
    echo "     got: $actual"
    ((FAIL++))
  fi
}

echo ""
echo "=========================================="
echo "  1. CUSTOMERS API"
echo "=========================================="

# POST /customers — create
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/customers" -H "$H" -d '{"name":"Budi Santoso"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /customers → 201" "201" "$CODE"
check "  returns name" "Budi Santoso" "$BODY"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/customers" -H "$H" -d '{"name":"Siti Rahayu"}')
CODE=$(echo "$R" | tail -1)
check "POST /customers #2 → 201" "201" "$CODE"

# POST /customers — validation
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/customers" -H "$H" -d '{}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /customers (no name) → 400" "400" "$CODE"
check "  error message" "Name is required" "$BODY"

# GET /customers
R=$(curl -s "$BASE/customers")
check "GET /customers → has Budi" "Budi Santoso" "$R"
check "GET /customers → has Siti" "Siti Rahayu" "$R"

# GET /customers/1
R=$(curl -s -w "\n%{http_code}" "$BASE/customers/1")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "GET /customers/1 → 200" "200" "$CODE"
check "  returns Budi" "Budi Santoso" "$BODY"

# GET /customers/999 — not found
R=$(curl -s -w "\n%{http_code}" "$BASE/customers/999")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "GET /customers/999 → 404" "404" "$CODE"
check "  error message" "Customer not found" "$BODY"

# PUT /customers/1
R=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/customers/1" -H "$H" -d '{"name":"Budi Santoso Updated"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "PUT /customers/1 → 200" "200" "$CODE"
check "  returns updated name" "Budi Santoso Updated" "$BODY"

# Restore name
curl -s -X PUT "$BASE/customers/1" -H "$H" -d '{"name":"Budi Santoso"}' > /dev/null

echo ""
echo "=========================================="
echo "  2. DEPOSITO TYPES API"
echo "=========================================="

# GET /deposito-types — seeded data
R=$(curl -s "$BASE/deposito-types")
check "GET /deposito-types → has Bronze" "Deposito Bronze" "$R"
check "GET /deposito-types → has Silver" "Deposito Silver" "$R"
check "GET /deposito-types → has Gold" "Deposito Gold" "$R"

# GET /deposito-types/2
R=$(curl -s -w "\n%{http_code}" "$BASE/deposito-types/2")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "GET /deposito-types/2 → 200" "200" "$CODE"
check "  returns Silver" "Deposito Silver" "$BODY"

# POST /deposito-types — create
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/deposito-types" -H "$H" -d '{"name":"Deposito Platinum","yearly_return":0.0900}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /deposito-types → 201" "201" "$CODE"
check "  returns Platinum" "Deposito Platinum" "$BODY"

# POST /deposito-types — invalid rate
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/deposito-types" -H "$H" -d '{"name":"Bad","yearly_return":5.0}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /deposito-types (rate > 1) → 400" "400" "$CODE"
check "  error about rate" "between 0 and 1" "$BODY"

# DELETE /deposito-types/4 — Platinum (no accounts using it)
R=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/deposito-types/4")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "DELETE /deposito-types/4 → 200" "200" "$CODE"
check "  success message" "deleted successfully" "$BODY"

echo ""
echo "=========================================="
echo "  3. ACCOUNTS API"
echo "=========================================="

# POST /accounts — open account
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts" -H "$H" -d '{"customer_id":1,"deposito_type_id":2}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /accounts → 201" "201" "$CODE"
check "  balance is 0.00" "0.00" "$BODY"

# POST /accounts — customer not found
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts" -H "$H" -d '{"customer_id":999,"deposito_type_id":1}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST /accounts (bad customer) → 404" "404" "$CODE"
check "  error message" "Customer not found" "$BODY"

# GET /accounts
R=$(curl -s "$BASE/accounts")
check "GET /accounts → has customer info" "Budi Santoso" "$R"
check "GET /accounts → has deposito info" "Deposito Silver" "$R"

# GET /accounts/1
R=$(curl -s -w "\n%{http_code}" "$BASE/accounts/1")
CODE=$(echo "$R" | tail -1)
check "GET /accounts/1 → 200" "200" "$CODE"

# GET /customers/1/accounts
R=$(curl -s "$BASE/customers/1/accounts")
check "GET /customers/1/accounts → has data" "Deposito Silver" "$R"

# DELETE /customers/1 — should fail (has accounts)
R=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/customers/1")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "DELETE /customers/1 (has accounts) → 409" "409" "$CODE"
check "  conflict message" "Cannot delete customer" "$BODY"

echo ""
echo "=========================================="
echo "  4. TRANSACTIONS API (Deposit + Withdraw)"
echo "=========================================="

# POST /accounts/1/deposit
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts/1/deposit" -H "$H" -d '{"amount":5000000,"transaction_date":"2024-01-15"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST deposit → 201" "201" "$CODE"
check "  amount 5000000.00" "5000000.00" "$BODY"
check "  new_balance 5000000.00" "5000000.00" "$BODY"
check "  type deposit" "deposit" "$BODY"

# POST /accounts/1/deposit — validation
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts/1/deposit" -H "$H" -d '{"amount":-100,"transaction_date":"2024-01-15"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST deposit (negative amount) → 400" "400" "$CODE"
check "  error message" "Amount must be greater than 0" "$BODY"

# GET /accounts/1/transactions
R=$(curl -s "$BASE/accounts/1/transactions")
check "GET transactions → has deposit" "deposit" "$R"

# POST /accounts/1/withdraw — the core logic
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts/1/withdraw" -H "$H" -d '{"transaction_date":"2024-07-15"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST withdraw → 201" "201" "$CODE"
check "  starting_balance 5000000.00" "5000000.00" "$BODY"
check "  months_held 6" "months_held" "$BODY"
check "  interest_earned 125000" "125000" "$BODY"
check "  ending_balance 5125000" "5125000" "$BODY"
check "  type withdrawal" "withdrawal" "$BODY"

# Verify account balance is now 0
R=$(curl -s "$BASE/accounts/1")
check "Account balance now 0" "0.00" "$R"

# POST withdraw again — should fail (balance is 0)
R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/accounts/1/withdraw" -H "$H" -d '{"transaction_date":"2024-08-15"}')
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "POST withdraw (balance 0) → 400" "400" "$CODE"
check "  error message" "balance is 0" "$BODY"

# DELETE account — should fail (has transactions)
R=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE/accounts/1")
CODE=$(echo "$R" | tail -1); BODY=$(echo "$R" | head -1)
check "DELETE /accounts/1 (has tx) → 409" "409" "$CODE"
check "  conflict message" "Cannot delete account" "$BODY"

echo ""
echo "=========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "=========================================="
