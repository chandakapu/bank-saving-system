const express = require('express');
const cors = require('cors');

// Route imports
const customerRoutes = require('./routes/customer.routes');
const depositoTypeRoutes = require('./routes/depositoType.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

// Middleware imports
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/deposito-types', depositoTypeRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/accounts', transactionRoutes); // nested under /accounts/:id/transactions

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
