require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await testConnection();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API base: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();
