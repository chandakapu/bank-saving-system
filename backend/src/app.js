const express = require('express');
const cors = require('cors');

// Route imports
const customerRoutes = require('./routes/customer.routes');
const depositoTypeRoutes = require('./routes/depositoType.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');
const authRoutes = require('./routes/auth.routes');
const { requireAuth } = require('./middleware/auth');

// Middleware imports
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean));
app.disable('x-powered-by');
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 2) {
  throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 2');
}
app.set('trust proxy', trustProxyHops);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(origin && !allowedOrigins.has(origin) ? new Error('Origin not allowed') : null, true);
  },
}));
app.use((req, res, next) => {
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if ((unsafe && !req.headers.origin) || (req.headers.origin && !allowedOrigins.has(req.headers.origin))) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  next();
});
app.use(express.json({ limit: '32kb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', requireAuth);

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
