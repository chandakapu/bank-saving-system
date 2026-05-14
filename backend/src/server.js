require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await testConnection();

    // Express 5: app.listen() returns a Promise<http.Server>
    const server = await app.listen(PORT);
    const addr = server.address();
    console.log(`🚀 Server running on http://localhost:${addr.port}`);
    console.log(`📡 API base: http://localhost:${addr.port}/api/v1`);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();
