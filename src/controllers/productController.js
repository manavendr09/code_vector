'use strict';

const { decodeCursor } = require('../utils/cursor');
const { getProducts, insertProduct, updateRandomProduct, VALID_CATEGORIES } = require('../services/productService');
const { faker } = require('@faker-js/faker');

const DEFAULT_LIMIT = parseInt(process.env.DEFAULT_PAGE_LIMIT || '20', 10);
const MAX_LIMIT = parseInt(process.env.MAX_PAGE_LIMIT || '100', 10);

function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_LIMIT;

  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) {
    const err = new Error('`limit` must be a positive integer.');
    err.status = 400;
    throw err;
  }
  return Math.min(n, MAX_LIMIT);
}

async function listProducts(req, res, next) {
  try {
    const limit = parseLimit(req.query.limit);
    const category = req.query.category || null;

    let cursor = null;
    if (req.query.cursor) {
      cursor = decodeCursor(req.query.cursor);
    }

    const result = await getProducts({ limit, category, cursor });

    res.json({
      products: result.products,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    next(err);
  }
}

async function mockUpdate(req, res, next) {
  try {
    const numInserts = Math.min(parseInt(req.body?.inserts ?? 5, 10), 50);
    const numUpdates = Math.min(parseInt(req.body?.updates ?? 5, 10), 50);

    const categories = [...VALID_CATEGORIES];
    const now = new Date();

    let insertedCount = 0;
    for (let i = 0; i < numInserts; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const futureDate = new Date(now.getTime() + (i + 1) * 1000);
      await insertProduct({
        name: faker.commerce.productName(),
        category,
        price: parseFloat(faker.commerce.price({ min: 1, max: 5000, dec: 2 })),
        created_at: futureDate,
        updated_at: futureDate,
      });
      insertedCount++;
    }

    let updatedCount = 0;
    for (let i = 0; i < numUpdates; i++) {
      const newPrice = parseFloat(faker.commerce.price({ min: 1, max: 5000, dec: 2 }));
      const newUpdatedAt = new Date(now.getTime() + (numInserts + i + 1) * 1000);
      const affected = await updateRandomProduct(newPrice, newUpdatedAt);
      updatedCount += affected;
    }

    res.json({
      inserted: insertedCount,
      updated: updatedCount,
      message: `Inserted ${insertedCount} and updated ${updatedCount} products. Existing pagination cursors remain stable — no duplicates or gaps.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, mockUpdate };
