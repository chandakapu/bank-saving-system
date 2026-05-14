# Class Diagram — Bank Saving System

```mermaid
classDiagram
  class Customer {
    +Int id
    +String name
    +Timestamp createdAt
    +Timestamp updatedAt
    +getAccounts() Account[]
    +create() Customer
    +update() Customer
    +delete() Boolean
  }

  class DepositoType {
    +Int id
    +String name
    +Decimal yearlyReturn
    +Timestamp createdAt
    +Timestamp updatedAt
    +getMonthlyReturn() Decimal
    +create() DepositoType
    +update() DepositoType
    +delete() Boolean
  }

  class Account {
    +Int id
    +Int customerId
    +Int depositoTypeId
    +Decimal balance
    +Timestamp createdAt
    +Timestamp updatedAt
    +deposit(amount, date) Transaction
    +withdraw(date) Transaction
    +getTransactions() Transaction[]
    +getLastDepositDate() Date
  }

  class Transaction {
    +Int id
    +Int accountId
    +Enum type
    +Decimal amount
    +Decimal endingBalance
    +Date transactionDate
    +Timestamp createdAt
    +calculateEndingBalance() Decimal
  }

  Customer "1" --> "0..*" Account : owns
  DepositoType "1" --> "0..*" Account : assigned to
  Account "1" --> "0..*" Transaction : records
```

## Method notes

| Class | Method | Notes |
|---|---|---|
| `DepositoType` | `getMonthlyReturn()` | Returns `yearlyReturn / 12` |
| `Account` | `deposit(amount, date)` | Increases balance, inserts transaction row |
| `Account` | `withdraw(date)` | Calls `calculateEndingBalance`, sets balance to 0, inserts transaction row |
| `Account` | `getLastDepositDate()` | Fetches the most recent deposit `transaction_date` for interest calculation |
| `Transaction` | `calculateEndingBalance()` | `balance + (balance × months × monthlyReturn)` |
