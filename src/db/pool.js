'use strict';

/**
 * db/pool.js
 *
 * Creates a single shared MySQL connection pool for the entire application.
 * Using a pool (rather than a single persistent connection) means:
 *   - Multiple requests can be served concurrently without waiting.
 *   - Idle connections are returned to the pool and reused, avoiding
 *     the overhead of opening a new TCP connection per request.
 *   - mysql2 will automatically reconnect if a connection is dropped.
 *
 * We export the promise-based API (`pool.promise()`) so every caller
 * can use async/await without extra wrapping.
 */

require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '26172617',
  database: process.env.DB_NAME || 'products_db',

  // Keep enough connections open to handle typical concurrency.
  // Requests that arrive when all connections are busy will queue
  // automatically rather than fail immediately.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,           // unlimited queue depth

  // Return dates as JavaScript Date objects, not raw strings.
  // This keeps cursor serialisation simple (ISO-8601 strings via .toISOString()).
  dateStrings: false,

  // Automatically reconnect dropped connections.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,    // first keep-alive probe after 10 s
});

// Export the promise-based pool so callers can `await pool.query(...)`.
module.exports = pool.promise();
