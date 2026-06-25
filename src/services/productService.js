'use strict';

const pool = require('../db/pool');
const { encodeCursor } = require('../utils/cursor');

const VALID_CATEGORIES = new Set([
  'Electronics', 'Fashion', 'Books', 'Sports',
  'Home', 'Beauty', 'Toys', 'Automotive',
]);

async function getProducts({ limit, category, cursor }) {
  if (category && !VALID_CATEGORIES.has(category)) {
    const err = new Error(`Invalid category: "${category}".`);
    err.status = 400;
    throw err;
  }

  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (cursor) {
    conditions.push('(updated_at, id) < (?, ?)');
    params.push(cursor.updated_at, cursor.id);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const fetchLimit = limit + 1;
  params.push(fetchLimit);

  const sql = `
    SELECT id, name, category, price, created_at, updated_at
    FROM products
    ${whereClause}
    ORDER BY updated_at DESC, id DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(sql, params);

  const hasNextPage = rows.length > fetchLimit - 1;
  const products = hasNextPage ? rows.slice(0, limit) : rows;

  let nextCursor = null;
  if (hasNextPage) {
    const last = products[products.length - 1];
    nextCursor = encodeCursor({ updated_at: last.updated_at, id: last.id });
  }

  return { products, nextCursor };
}

async function insertProduct(data) {
  const [result] = await pool.query(
    `INSERT INTO products (name, category, price, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.category, data.price, data.created_at, data.updated_at],
  );
  return result.insertId;
}

async function updateRandomProduct(newPrice, newUpdatedAt) {
  const [rows] = await pool.query(
    `SELECT id FROM products ORDER BY RAND() LIMIT 1`,
  );
  if (!rows.length) return 0;

  const [result] = await pool.query(
    `UPDATE products SET price = ?, updated_at = ? WHERE id = ?`,
    [newPrice, newUpdatedAt, rows[0].id],
  );
  return result.affectedRows;
}

module.exports = { getProducts, insertProduct, updateRandomProduct, VALID_CATEGORIES };
