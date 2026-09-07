// One-off helper for local demo/testing only — spins up an ephemeral
// in-memory MongoDB and prints its URI. Not used in production; Render
// deployment uses a real MASTER_MONGO_URI env var. Safe to delete.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
  console.log('MONGO_READY_URI=' + mongod.getUri());
  process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
})();
