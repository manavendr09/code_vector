'use strict';

/**
 * scripts/seed.js
 *
 * Populates the `products` table with 200 000 realistic fake products.
 *
 * Performance strategy — batch inserts
 * ──────────────────────────────────────
 * Inserting rows one-by-one sends a separate round-trip to MySQL for each
 * row.  With 200 000 rows and even a 1 ms round-trip that would take > 3
 * minutes and create enormous log pressure.
 *
 * Instead we collect BATCH_SIZE rows in memory and emit a single
 * multi-row INSERT:
 *
 *   INSERT INTO products (name, category, price, created_at, updated_at)
 *   VALUES (?, ?, ?, ?, ?),
 *          (?, ?, ?, ?, ?),
 *          ...                  ← BATCH_SIZE rows
 *
 * This reduces round-trips from 200 000 to 200 000 / 5 000 = 40,
 * and lets MySQL's InnoDB engine pipeline the writes efficiently.
 *
 * mysql2 accepts the nested-array form [[v1,v2,...], [v1,v2,...], ...]
 * automatically when combined with the multi-row INSERT template.
 *
 * Typical runtime on a local machine: < 30 seconds for 200 000 rows.
 */

require('dotenv').config();

const mysql  = require('mysql2/promise');
const { faker } = require('@faker-js/faker');

// ─── Configuration ─────────────────────────────────────────────────────────────

const TOTAL_ROWS  = 200_000;
const BATCH_SIZE  = 5_000;   // rows per INSERT statement

const CATEGORIES = [
  'Electronics', 'Fashion', 'Books', 'Sports',
  'Home', 'Beauty', 'Toys', 'Automotive',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Return a random element from an array. */
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return a random Date within the past `days` days.
 * Spreading timestamps over two years makes the pagination ordering visually
 * interesting and exercises the index across a wide range of values.
 */
function randomDate(daysBack = 730) {
  const ms = Date.now() - Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(ms);
}

/** Format a Date as a MySQL TIMESTAMP string: 'YYYY-MM-DD HH:MM:SS'. */
function toMysqlTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  // Use a direct connection (not a pool) since this is a one-shot script.
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'products_db',

    // Allow sending many-parameter VALUES lists
    multipleStatements: false,
  });

  console.log(`🌱  Seeding ${TOTAL_ROWS.toLocaleString()} products in batches of ${BATCH_SIZE.toLocaleString()}…`);

  const startTime = Date.now();
  let inserted    = 0;

  try {
    while (inserted < TOTAL_ROWS) {
      const remaining = TOTAL_ROWS - inserted;
      const size      = Math.min(BATCH_SIZE, remaining);

      // Build an array of value tuples for this batch.
      // Each tuple maps to one VALUES row: (name, category, price, created_at, updated_at)
      const rows = [];
      for (let i = 0; i < size; i++) {
        const createdAt  = randomDate(730);
        // updated_at is often the same as created_at but occasionally later,
        // simulating real-world edit patterns.
        const updatedAt  = Math.random() < 0.3
          ? new Date(createdAt.getTime() + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
          : createdAt;

        rows.push([
          faker.commerce.productName(),
          randomItem(CATEGORIES),
          parseFloat(faker.commerce.price({ min: 1, max: 5000, dec: 2 })),
          toMysqlTimestamp(createdAt),
          toMysqlTimestamp(updatedAt < new Date() ? updatedAt : new Date()),
        ]);
      }

      // mysql2 expands a nested array into multi-row VALUES automatically.
      await conn.query(
        `INSERT INTO products (name, category, price, created_at, updated_at) VALUES ?`,
        [rows],
      );

      inserted += size;

      // Progress indicator
      const pct     = ((inserted / TOTAL_ROWS) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r   ${inserted.toLocaleString()} / ${TOTAL_ROWS.toLocaleString()} (${pct}%) — ${elapsed}s elapsed`);
    }
  } finally {
    await conn.end();
  }

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅  Done! Inserted ${TOTAL_ROWS.toLocaleString()} rows in ${totalSec}s.`);
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
