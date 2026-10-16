// Always use a disposable database. Never read the project's .env or an external MongoDB URI.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
let instance;
async function open() {
  instance = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: '/tmp/food-mongo-binaries' }, instance: { dbName: 'foodshare_test' } });
  await mongoose.connect(instance.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}
async function close() {
  await mongoose.disconnect();
  if (instance) await instance.stop();
}
module.exports = { open, close };
