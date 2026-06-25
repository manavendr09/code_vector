'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { migrate } = require('./db/migrate');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/products', productRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const isClient = status >= 400 && status < 500;

  if (!isClient) {
    console.error('Unhandled error:', err);
  }

  res.status(status).json({
    error: isClient
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
  });
});

async function bootstrap() {
  try {
    console.log('🔄  Running database migrations...');
    await migrate();

    app.listen(PORT, () => {
      console.log(`🚀  Server running on http://localhost:${PORT}`);
      console.log(`📦  GET  /products              — list products`);
      console.log(`⚡  POST /products/mock-update  — simulate concurrent mutations`);
      console.log(`❤️   GET  /health                — health check`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
