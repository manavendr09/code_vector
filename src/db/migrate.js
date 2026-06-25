'use strict';

/**
 * db/migrate.js
 *
 * Creates the products table and its supporting indexes if they do not
 * already exist.  Running this file is idempotent — it is safe to call
 * on every server start via app.js, or manually with `node src/db/migrate.js`.
 *
 * Index design rationale
 * ──────────────────────
 * The API returns products ordered by (updated_at DESC, id DESC).
 * Cursor pagination advances the window with:
 *
 *   WHERE (updated_at, id) < (:cursor_updated_at, :cursor_id)
 *   ORDER BY updated_at DESC, id DESC
 *
 * Without a covering index MySQL would perform a full-table scan, sort all
 * 200 000 rows on every request, then discard everything before the cursor.
 *
 * The two composite indexes below let MySQL satisfy both the WHERE predicate
 * and the ORDER BY entirely from the index (an "index range scan"), touching
 * only the rows after the cursor and capped by LIMIT.
 *
 *  idx_products_updated_id
 *    Used for requests that do NOT filter by category.
 *
 *  idx_products_category_updated_id
 *    Used for requests that DO filter by category.  By placing category as
 *    the leading column MySQL can first narrow to that category, then scan
 *    chronologically — no additional sort step required.
 */

const pool = require('./pool');

async function migrate() {
  // Create the table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id         BIGINT         NOT NULL AUTO_INCREMENT,
      name       VARCHAR(255)   NOT NULL,
      category   VARCHAR(100)   NOT NULL,
      price      DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Global pagination index (no category filter)
  await pool.query(`
    CREATE INDEX idx_products_updated_id
    ON products(updated_at DESC, id DESC);
  `).catch(err => {
    // Error 1061 = duplicate key name → index already exists, safe to ignore
    if (err.errno !== 1061) throw err;
  });

  // Category-scoped pagination index
  await pool.query(`
    CREATE INDEX idx_products_category_updated_id
    ON products(category, updated_at DESC, id DESC);
  `).catch(err => {
    if (err.errno !== 1061) throw err;
  });

  console.log('✅  Migration complete — table and indexes are ready.');
}

// Allow running as a standalone script: `node src/db/migrate.js`
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { migrate };
