'use strict';

/**
 * routes/productRoutes.js
 *
 * Defines the URL surface area for the products domain.
 * Keeping routes in their own file makes it easy to add versioning (e.g.
 * mount at /api/v1/products) or middleware (e.g. auth) without touching
 * the controller logic.
 */

const express    = require('express');
const controller = require('../controllers/productController');

const router = express.Router();

/**
 * GET /products
 * List products with cursor-based pagination.
 * See productController.listProducts for full parameter documentation.
 */
router.get('/', controller.listProducts);

/**
 * POST /products/mock-update
 * Randomly insert / update products to demonstrate pagination stability.
 * Defined before the /:id route (if we ever add one) so Express does not
 * accidentally treat "mock-update" as an id parameter.
 */
router.post('/mock-update', controller.mockUpdate);

module.exports = router;
