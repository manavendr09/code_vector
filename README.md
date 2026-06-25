# Product Browsing API

A production-quality Node.js / Express / MySQL backend for browsing ~200 000 products with **cursor-based (keyset) pagination** that remains stable while data is concurrently inserted or updated.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Decisions](#design-decisions)
3. [Why Not OFFSET Pagination?](#why-not-offset-pagination)
4. [How Cursor Pagination Solves It](#how-cursor-pagination-solves-it)
5. [Project Structure](#project-structure)
6. [API Reference](#api-reference)
7. [Setup Instructions](#setup-instructions)
8. [Testing Pagination Stability](#testing-pagination-stability)

---

## Problem Statement

We need to serve a catalogue of **~200 000 products** to clients who browse page-by-page — possibly filtering by category — while the database is simultaneously receiving inserts and updates from other processes.

The two hard requirements are:

| Requirement | Constraint |
|---|---|
| **Correctness** | A user must never see the same product twice, nor silently skip a product, even if data changes between requests |
| **Performance** | Every page request must execute in constant time regardless of which page the user is on |

---

## Design Decisions

### MySQL

A relational database fits naturally: products have a fixed, well-defined schema, and we need deterministic ordering across a large dataset. MySQL's InnoDB engine supports the composite index scans that make keyset pagination efficient.

### Cursor Pagination (Keyset Pagination)

Instead of `LIMIT x OFFSET y`, each response includes a `nextCursor` token. The client sends the token back on the next request and the server turns it into a `WHERE` predicate that jumps directly to the next window — no rows are scanned twice.

### Composite Indexes

Two indexes are created to serve the two query shapes:

```sql
-- All products, ordered by recency
CREATE INDEX idx_products_updated_id
ON products(updated_at DESC, id DESC);

-- Products filtered by category, ordered by recency
CREATE INDEX idx_products_category_updated_id
ON products(category, updated_at DESC, id DESC);
```

MySQL resolves both the `WHERE (updated_at, id) < (?, ?)` predicate **and** the `ORDER BY updated_at DESC, id DESC` clause directly from the index — no sort step, no full-table scan.

### Batch Seeding

200 000 individual `INSERT` statements would take several minutes and stress the transaction log. Instead, the seed script groups rows into batches of 5 000 and emits a single multi-row `INSERT` per batch — reducing round-trips from 200 000 to just 40.

---

## Why Not OFFSET Pagination?

```sql
-- Classic OFFSET query
SELECT * FROM products
ORDER BY updated_at DESC, id DESC
LIMIT 20 OFFSET 3000;
```

### Problem 1 — Performance Degrades with Depth

MySQL must **read and discard** `OFFSET` rows before it can return the `LIMIT` rows you actually want. At page 150 it scans 3 020 rows. At page 10 000 it scans all 200 000 rows. Query time grows linearly (`O(n)`) with pagination depth — catastrophic at scale.

### Problem 2 — Duplicate Records When Data Is Inserted

```
State before page 2 request:
  Page 1 showed rows at offsets 0–19.

A new row is inserted at the top (offset 0).
Every existing row shifts down by 1.

Page 2 request asks for OFFSET 20:
  The row previously at offset 19 is now at offset 20.
  ❌ The user sees it again — a duplicate.
```

### Problem 3 — Missing Records When Data Is Deleted / Updated

```
State before page 2 request:
  Page 1 showed rows at offsets 0–19.

A row within offsets 0–19 is deleted.
Every row below it shifts up by 1.

Page 2 request asks for OFFSET 20:
  What was at offset 20 is now at offset 19 — already shown!
  What was at offset 21 is now at offset 20.
  ❌ The user never sees the row that was at offset 20 — it is skipped.
```

---

## How Cursor Pagination Solves It

```sql
-- Cursor query — jumps directly to the next window
SELECT * FROM products
WHERE  (updated_at, id) < (:cursor_updated_at, :cursor_id)
ORDER BY updated_at DESC, id DESC
LIMIT 20;
```

The cursor encodes the **actual data values** of the last row the client saw, not a volatile position number.

```
Page 1 returns rows, the last one has:
  updated_at = "2024-03-10 09:00:00"
  id         = 42857

nextCursor = base64({"updated_at":"2024-03-10T09:00:00.000Z","id":42857})

Client sends cursor → server queries:
  WHERE (updated_at, id) < ("2024-03-10 09:00:00", 42857)
```

Now consider concurrent mutations:

| Event | Effect on cursor query |
|---|---|
| New product inserted (future `updated_at`) | It sits **above** the cursor — not in the WHERE window → never duplicated |
| Existing product updated (bumped `updated_at`) | It moves **above** the cursor → the user won't see it again below the cursor |
| Product deleted | The WHERE clause simply skips it — no gaps created |

### Why the Compound Cursor `(updated_at, id)`?

`updated_at` alone is not unique — two products may have the same timestamp (e.g., bulk inserts). Adding `id` (globally unique via `AUTO_INCREMENT`) makes the cursor **globally unique** and eliminates ambiguity at every timestamp boundary.

---

## Project Structure

```
project/
├── src/
│   ├── app.js                      # Entry point: migrations → Express setup → listen
│   ├── db/
│   │   ├── pool.js                 # Shared mysql2 connection pool
│   │   └── migrate.js              # Idempotent table + index creation
│   ├── routes/
│   │   └── productRoutes.js        # URL surface area for /products
│   ├── controllers/
│   │   └── productController.js    # Request parsing, validation, response shaping
│   ├── services/
│   │   └── productService.js       # SQL query construction + business logic
│   └── utils/
│       └── cursor.js               # Base64 cursor encode / decode / validate
│
├── scripts/
│   └── seed.js                     # Batch-insert 200 000 products
│
├── .env                            # Local environment variables (git-ignored)
├── .env.example                    # Template for new contributors
├── package.json
└── README.md
```

---

## API Reference

### `GET /products`

Returns a page of products ordered by `(updated_at DESC, id DESC)`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Rows per page (max 100) |
| `category` | string | — | Filter by category |
| `cursor` | string | — | Opaque token from a previous `nextCursor` |

**Example requests**

```http
GET /products
GET /products?limit=50
GET /products?category=Electronics
GET /products?category=Electronics&limit=10
GET /products?cursor=eyJ1cGRhdGVkX2F0IjoiMjAyNC0wMy0xMFQwOTowMDowMC4wMDBaIiwiaWQiOjQyODU3fQ==
GET /products?category=Electronics&cursor=...
```

**Response**

```json
{
  "products": [
    {
      "id": 42857,
      "name": "Sleek Aluminum Keyboard",
      "category": "Electronics",
      "price": "149.99",
      "created_at": "2024-03-10T09:00:00.000Z",
      "updated_at": "2024-03-10T09:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ1cGRhdGVkX2F0IjoiMjAyNC0wMy0wOVQxNDozMDowMC4wMDBaIiwiaWQiOjM4OTIxfQ=="
}
```

`nextCursor` is `null` when there are no more pages.

---

### `POST /products/mock-update`

Randomly inserts and updates products to demonstrate pagination stability.

**Request body** (all fields optional)

```json
{
  "inserts": 5,
  "updates": 5
}
```

**Response**

```json
{
  "inserted": 5,
  "updated": 5,
  "message": "Inserted 5 and updated 5 products. Existing pagination cursors remain stable — no duplicates or gaps."
}
```

---

### `GET /health`

Lightweight health probe.

```json
{ "status": "ok", "timestamp": "2024-03-10T09:00:00.000Z" }
```

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **MySQL** ≥ 5.7 (or MariaDB ≥ 10.2)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=products_db
PORT=3000
```

### 3. Create the database

```sql
CREATE DATABASE products_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run migrations

Migrations run automatically when the server starts. You can also run them manually:

```bash
node src/db/migrate.js
```

This creates the `products` table and both composite indexes (idempotent — safe to run multiple times).

### 5. Run the seed script

```bash
npm run seed
```

Inserts **200 000 products** in batches of 5 000. Expected runtime: **< 60 seconds** on a local MySQL instance.

### 6. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000`.

---

## Testing Pagination Stability

### Manual test

```bash
# Page 1
curl "http://localhost:3000/products?limit=5" | jq .

# Copy nextCursor from page 1, then:
CURSOR="<paste cursor here>"
curl "http://localhost:3000/products?limit=5&cursor=$CURSOR" | jq .
```

### Demonstrate stability under concurrent writes

```bash
# 1. Grab page 1 and save the cursor
CURSOR=$(curl -s "http://localhost:3000/products?limit=5" | jq -r .nextCursor)

# 2. Mutate the database
curl -s -X POST http://localhost:3000/products/mock-update \
  -H "Content-Type: application/json" \
  -d '{"inserts": 10, "updates": 10}' | jq .

# 3. Continue to page 2 — no duplicates, no gaps
curl "http://localhost:3000/products?limit=5&cursor=$CURSOR" | jq .
```

The products on page 2 will be different from those on page 1, and none of the newly inserted/updated rows (which have future timestamps) will appear below the cursor — proving correctness.

---

## Cursor Format (internal)

```text
Decoded: { "updated_at": "2024-03-10T09:00:00.000Z", "id": 42857 }
Encoded: base64(JSON.stringify(above))
       = eyJ1cGRhdGVkX2F0IjoiMjAyNC0wMy0xMFQwOTowMDowMC4wMDBaIiwiaWQiOjQyODU3fQ==
```

The cursor is validated on decode: `updated_at` must parse as a valid ISO-8601 date, and `id` must be a positive integer. Malformed cursors return HTTP 400.
