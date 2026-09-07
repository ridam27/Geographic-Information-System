// Standalone shared in-memory MongoDB for local dev across ALL GIS sub-apps.
// Runs on the standard default port (27017) so every sub-app's default
// MONGO_URI ("mongodb://localhost:27017/<its-own-db>") just works without
// each of them needing their own local mongod.
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017 },
  });
  console.log(`[shared-mongo] ready at ${mongod.getUri()}`);

  process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
}

main().catch((err) => {
  console.error('[shared-mongo] failed to start:', err);
  process.exit(1);
});
