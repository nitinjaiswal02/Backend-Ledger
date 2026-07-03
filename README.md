# Backend Ledger

A backend system built to understand how real-world **banking transactions** work under the hood — implemented using a **double-entry ledger system**, atomic MongoDB transactions, and idempotent transaction handling.

This project is a learning/portfolio implementation of core banking-system concepts: accounts, ledgers, money transfers, balance derivation, and transaction integrity.

---

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth-routes)
  - [Accounts](#account-routes)
  - [Transactions](#transaction-routes)
- [Transaction Flow](#transaction-flow-10-step)
- [Data Models](#data-models)
- [Security Notes](#security-notes)
- [Future Improvements](#future-improvements)

---

## Overview

Instead of storing a `balance` field directly on an account (which is prone to race conditions and inconsistency), this system derives an account's balance dynamically from an **immutable ledger** of `DEBIT` and `CREDIT` entries — the same principle used in real accounting/banking systems.

Every money movement creates:
1. A `transaction` record (the "what happened")
2. Two `ledger` entries — one `DEBIT` and one `CREDIT` (the "double-entry" proof of movement)

This ensures the system is auditable, tamper-resistant, and consistent.

## Key Concepts

- **Double-entry ledger** — every transaction produces a balanced DEBIT + CREDIT pair, and ledger entries are immutable once created (updates/deletes are blocked at the schema level via Mongoose pre-hooks).
- **Derived balance** — an account's balance is not stored; it's calculated on demand via MongoDB aggregation over its ledger entries.
- **Idempotency keys** — every transaction request includes a client-generated `idempotencyKey` to prevent duplicate transactions from retries or network issues.
- **Atomicity** — transaction creation, debit entry, credit entry, and status update all happen inside a single MongoDB session/transaction, so a failure at any step rolls back the entire operation.
- **System user** — a special internal user (`systemUser: true`) used to seed initial funds into new accounts, protected by a dedicated middleware.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT (JSON Web Tokens) + HTTP-only cookies
- **Password Hashing:** bcrypt
- **Email:** Custom email service (transaction & registration notifications)
- **Other:** cookie-parser, dotenv

## Project Structure

```
backend-ledger/
├── src/
│   ├── config/
│   │   └── db.js                      # MongoDB connection setup
│   ├── controllers/
│   │   ├── account.controller.js      # Account creation logic
│   │   ├── auth.controller.js         # Register / Login logic
│   │   └── transaction.controller.js  # Core transfer & ledger logic
│   ├── middlewares/
│   │   └── auth.middleware.js         # JWT auth + system-user auth
│   ├── models/
│   │   ├── account.model.js           # Account schema + getBalance()
│   │   ├── ledger.model.js            # Immutable ledger entry schema
│   │   ├── transaction.model.js       # Transaction schema
│   │   └── user.model.js              # User schema + password hashing
│   ├── routes/
│   │   ├── account.routes.js
│   │   ├── auth.routes.js
│   │   └── transaction.routes.js
│   ├── services/
│   │   └── email.service.js           # Email notifications
│   └── app.js                         # Express app setup
├── .env.example
├── .gitignore
├── package.json
└── server.js                          # Entry point
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local instance or MongoDB Atlas — must support transactions, i.e. run as a replica set)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/backend-ledger.git
cd backend-ledger

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# then fill in the required values (see below)

# Start the server
node server.js
```

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

| Variable      | Description                                      |
|---------------|-----------------------------------------------------|
| `MONGO_URI`   | MongoDB connection string                            |
| `JWT_SECRET`  | Secret key used to sign/verify JWT auth tokens        |
| `EMAIL_USER`  | Email account used to send notification emails        |
| `EMAIL_PASS`  | Password/app-password for the email account           |

## API Endpoints

All protected routes require a valid JWT, sent either as an `Authorization: Bearer <token>` header or as an HTTP-only `token` cookie (set automatically on login/register).

### Auth Routes
Base path: `/api/auth`

| Method | Endpoint     | Auth Required | Description                     |
|--------|--------------|----------------|-----------------------------------|
| POST   | `/register`  | No             | Register a new user account        |
| POST   | `/login`     | No             | Log in and receive a JWT token     |

**Register — Request body**
```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "name": "User Name"
}
```

**Login — Request body**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Both endpoints respond with the user object (excluding the password) and a JWT token, and set the token as an HTTP-only cookie.

```json
// Response (201 for register, 200 for login)
{
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "<jwt>"
}
```

### Account Routes
Base path: `/api/accounts`

| Method | Endpoint | Auth Required | Description                                    |
|--------|----------|----------------|---------------------------------------------------|
| POST   | `/`      | Yes            | Create a new account for the authenticated user     |

**Create Account — Request body**
```json
{
  "currency": "INR"
}
```

**Response (201)**
```json
{
  "account": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0e",
    "user": "665f1a2b3c4d5e6f7a8b9c0d",
    "status": "ACTIVE",
    "currency": "INR",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```
The account is automatically linked to the authenticated user (`req.user._id`) and defaults to `status: "ACTIVE"`.

### Transaction Routes
Base path: `/api/transactions`

| Method | Endpoint                  | Auth Required         | Description                                        |
|--------|-----------------------------|--------------------------|--------------------------------------------------------|
| POST   | `/`                        | Yes (user)               | Transfer funds between two accounts                     |
| POST   | `/system/initial-funds`    | Yes (system user only)   | Seed initial funds into a user's account from the system account |

**Create Transaction — Request body**
```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 500,
  "idempotencyKey": "<unique-client-generated-key>"
}
```

**Response (201)**
```json
{
  "message": "Transaction completed successfully",
  "transaction": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0f",
    "fromAccount": "...",
    "toAccount": "...",
    "amount": 500,
    "status": "COMPLETED",
    "idempotencyKey": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response codes**
| Status | Meaning                                                        |
|--------|--------------------------------------------------------------------|
| 201    | Transaction completed successfully                                    |
| 200    | Duplicate request — a transaction with this key is still `PENDING`    |
| 400    | Missing fields, inactive account(s), or insufficient balance          |
| 404    | `fromAccount` or `toAccount` not found                                 |
| 409    | Duplicate request — a transaction with this key already `COMPLETED`   |
| 500    | Previous transaction with this key was `FAILED` or `REVERSED`         |

**Create Initial Funds Transaction — Request body**
```json
{
  "toAccount": "<accountId>",
  "amount": 1000,
  "idempotencyKey": "<unique-client-generated-key>"
}
```
Restricted to requests authenticated as the internal `systemUser`, and moves funds from the system's own account into the target user's account.

## Transaction Flow (10-step)

Every transfer (`POST /api/transactions`) follows this flow to guarantee correctness:

1. **Validate request** — ensure `fromAccount`, `toAccount`, `amount`, and `idempotencyKey` are present.
2. **Validate idempotency key** — if a transaction with the same key already exists, return its existing status instead of creating a duplicate.
3. **Check account status** — both accounts must be `ACTIVE`.
4. **Derive sender balance** — calculated from the ledger via aggregation (`account.getBalance()`); reject if insufficient.
5. **Create transaction (`PENDING`)** — inside a MongoDB session/transaction.
6. **Create `DEBIT` ledger entry** — for the sender's account, within the same session.
7. **Create `CREDIT` ledger entry** — for the receiver's account, within the same session.
8. **Mark transaction `COMPLETED`** — update and save within the same session.
9. **Commit the MongoDB session** — persists all changes atomically; if any prior step throws, the entire operation rolls back and no partial state is written.
10. **Send email notification** — informs the sender of the completed transaction (non-blocking; failures here don't roll back the transaction since it's already committed).

> **Implementation note:** Steps 5–8 use Mongoose's array-form `Model.create([{...}], { session })` rather than the single-object form. This is required whenever a session is passed to `.create()` — the array form ensures the document and session are correctly associated (the non-array form silently misinterprets the options object as a second document to validate, causing confusing validation errors).

## Data Models

### User
- `email`, `password` (hashed via bcrypt, excluded from queries by default), `name`
- `systemUser` — boolean flag marking the internal system account, immutable after creation

### Account
- `user` (ref → User), `status` (`ACTIVE` / `FROZEN` / `CLOSED`), `currency`
- `getBalance()` — instance method that aggregates ledger entries to compute the current balance (sum of CREDITs minus sum of DEBITs)

### Transaction
- `fromAccount`, `toAccount` (refs → Account)
- `amount`, `status` (`PENDING` / `COMPLETED` / `FAILED` / `REVERSED`)
- `idempotencyKey` — unique, used to prevent duplicate processing

### Ledger
- `account` (ref → Account), `transaction` (ref → Transaction)
- `amount`, `type` (`DEBIT` / `CREDIT`)
- **Immutable** — all update/delete operations (`updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `findOneAndReplace`, `remove`) are blocked at the schema level via Mongoose pre-hooks, preserving an accurate financial audit trail

## Security Notes

- Passwords are hashed with bcrypt before being saved and are never returned in query results by default.
- JWTs are issued on register/login (valid for 3 days) and can be sent via `Authorization` header or HTTP-only cookie.
- Ledger entries cannot be modified or deleted once created, protecting the integrity of financial records.
- System-level operations (like initial fund seeding) are locked behind a separate `authSystemuserMiddleware` that verifies the `systemUser` flag.
- Money transfers run inside MongoDB transactions, so a partial failure (e.g. the debit entry succeeds but the credit entry fails) never leaves the ledger in an inconsistent state.

## Future Improvements

- Add transaction reversal endpoint
- Add account balance/ledger history GET endpoints
- Add pagination and filtering for transaction history
- Rate-limiting on auth routes
- Automated tests for the transfer flow and rollback scenarios

---

**Note:** This project was built as a learning exercise to understand how banking/ledger systems handle consistency, atomicity, and auditability — not intended for production use as-is.
