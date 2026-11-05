require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`[server] WhereIsTheBin running on http://localhost:${PORT}`));
})();
