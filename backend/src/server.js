require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');
const { runMigrations } = require('./config/migrate');
const { bootstrapAdmin } = require('./controllers/auth.controller');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await testConnection();
    await runMigrations();
    await bootstrapAdmin();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
